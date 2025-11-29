// =============================
//     РЕАЛЬНЫЙ API ДЛЯ RENDER
// =============================
const API = "https://coursestore-backend.onrender.com";


// =============================
//   LocalStorage USER
// =============================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// =============================
//     TOAST уведомления
// =============================
function showMessage(text, type = "info") {
    let box = document.querySelector(".toast-container");

    if (!box) {
        box = document.createElement("div");
        box.className = "toast-container";
        document.body.appendChild(box);
    }

    const el = document.createElement("div");
    el.className = "toast";

    if (type === "error") el.classList.add("toast-error");
    if (type === "success") el.classList.add("toast-success");

    el.innerText = text;
    box.appendChild(el);

    setTimeout(() => el.remove(), 3500);
}


// =============================
//          REGISTER
// =============================
async function registerUser(name, phone, password) {
    if (!name || !phone || !password)
        return showMessage("Заполните все поля", "error");

    const r = await fetch(API + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password })
    });

    const data = await r.json();

    if (data.status !== "ok")
        return showMessage(data.message, "error");

    saveUser(data.user);
    window.location.href = "index.html";
}


// =============================
//           LOGIN
// =============================
async function loginUser(phone, password) {
    if (!phone || !password)
        return showMessage("Введите телефон и пароль", "error");

    const r = await fetch(API + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
    });

    const data = await r.json();

    if (data.status !== "ok")
        return showMessage(data.message, "error");

    saveUser(data.user);
    window.location.href = "index.html";
}



// =============================
//       ЗАГРУЗКА КАТАЛОГА
// =============================
async function loadCatalog() {
    const r = await fetch(API + "/api/courses");
    const data = await r.json();

    const block = document.getElementById("catalogList");
    if (!block) return;

    block.innerHTML = "";

    data.courses.forEach(course => {
        const card = document.createElement("div");
        card.className = "course-card";

        card.innerHTML = `
            <img src="${course.image}" alt="" />

            <h3>${course.title}</h3>
            <p class="author">${course.author}</p>

            <div class="price">${course.price} ₸</div>

            <button class="btn-primary" onclick="openCourse(${course.id})">
                Открыть
            </button>
        `;

        block.appendChild(card);
    });
}


// открыть курс
function openCourse(id) {
    localStorage.setItem("currentCourse", id);
    window.location.href = "course.html";
}



// =============================
//         ЗАГРУЗКА КУРСА
// =============================
async function loadCoursePage() {
    const cid = localStorage.getItem("currentCourse");
    if (!cid) return;

    const r = await fetch(API + `/api/course?course_id=${cid}`);
    const data = await r.json();

    const course = data.course;
    const lessons = data.lessons;
    const reviews = data.reviews;

    document.getElementById("courseTitle").innerText = course.title;
    document.getElementById("courseAuthor").innerText = course.author;
    document.getElementById("courseDescription").innerText = course.description;
    document.getElementById("courseImg").src = course.image;
    document.getElementById("coursePrice").innerText = course.price + " ₸";

    // УРОКИ
    const lessonBlock = document.getElementById("lessonList");
    lessonBlock.innerHTML = "";

    lessons.forEach(lesson => {
        let url = lesson.video_url;

        if (!url) url = "";

        // Преобразование Google Drive
        if (url.includes("/view"))
            url = url.replace("/view", "/preview");

        const openDrive = url.replace("/preview", "/view");

        const item = document.createElement("div");
        item.className = "lesson-item";

        item.innerHTML = `
            <div class="lesson-info">
                <b>${lesson.position}. ${lesson.title}</b>
            </div>

            <div class="lesson-buttons">
                <button class="btn-primary" onclick="playLesson('${url}')">Смотреть</button>
                <a href="${openDrive}" target="_blank" class="btn-login">Google Drive</a>
            </div>
        `;

        lessonBlock.appendChild(item);
    });

    // ОТЗЫВЫ
    const reviewBlock = document.getElementById("reviewList");
    reviewBlock.innerHTML = "";

    reviews.forEach(r => {
        const el = document.createElement("div");
        el.className = "review-card";

        el.innerHTML = `
            <div class="stars">⭐ ${r.stars}</div>
            <div class="review-text">${r.text}</div>
            <div class="review-author">— ${r.user_name}</div>
        `;

        reviewBlock.appendChild(el);
    });
}


// ► Видео-плеер
function playLesson(url) {
    document.getElementById("videoPlayer").innerHTML = `
        <iframe 
            width="100%" 
            height="420"
            src="${url}"
            frameborder="0"
            allow="autoplay; encrypted-media"
            allowfullscreen>
        </iframe>
    `;
}



// =============================
//             CART
// =============================
async function addToCart(course_id) {
    const user = getUser();
    if (!user) return showMessage("Войдите в аккаунт!", "error");

    const r = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, course_id })
    });

    const data = await r.json();

    if (data.status === "ok")
        showMessage("Добавлено в корзину", "success");
    else
        showMessage(data.message, "error");
}



// Загрузка корзины
async function loadCart() {
    const user = getUser();
    if (!user) return;

    const r = await fetch(API + `/api/cart?user_id=${user.user_id}`);
    const data = await r.json();

    const block = document.getElementById("cartList");
    const totalEl = document.getElementById("cartTotal");

    block.innerHTML = "";
    let total = 0;

    data.items.forEach(item => {
        total += item.price;

        const el = document.createElement("div");
        el.className = "cart-item";

        el.innerHTML = `
            <img src="${item.image}" class="cart-img">

            <div class="cart-info">
                <h4>${item.title}</h4>
                <p>${item.price} ₸</p>
            </div>

            <button class="btn-login" onclick="removeFromCart(${item.cart_id})">
                Удалить
            </button>
        `;

        block.appendChild(el);
    });

    totalEl.innerText = total + " ₸";
}


// Удалить из корзины
async function removeFromCart(cart_id) {
    await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id })
    });

    loadCart();
}


// Покупка
async function buyCart() {
    const user = getUser();
    if (!user) return;

    const r = await fetch(API + "/api/cart/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id })
    });

    const data = await r.json();

    if (data.status !== "ok")
        return showMessage(data.message, "error");

    showMessage("Покупка успешна", "success");
    loadCart();
}



// =============================
//           PROFILE
// =============================
async function loadProfile() {
    const user = getUser();
    if (!user) return;

    const r = await fetch(API + `/api/user?user_id=${user.user_id}`);
    const data = await r.json();

    const u = data.user;

    document.getElementById("name").innerText = u.name;
    document.getElementById("phone").innerText = u.phone;
    document.getElementById("balance").innerText = u.balance + " ₸";

    if (u.avatar)
        document.getElementById("avatar").src = u.avatar;

    loadMyCourses();
}



// =============================
//       МОИ КУРСЫ
// =============================
async function loadMyCourses() {
    const user = getUser();
    const r = await fetch(API + `/api/my-courses?user_id=${user.user_id}`);
    const data = await r.json();

    const block = document.getElementById("myCourses");
    block.innerHTML = "";

    data.courses.forEach(c => {
        const el = document.createElement("div");
        el.className = "course-card";

        el.innerHTML = `
            <img src="${c.image}">
            <h3>${c.title}</h3>
            <p>${c.author}</p>
            <button class="btn-primary" onclick="openCourse(${c.id})">Открыть</button>
        `;

        block.appendChild(el);
    });
}
