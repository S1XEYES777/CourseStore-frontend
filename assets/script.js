
const API = "https://coursestore-backend.onrender.com";


// ================================
//    Сохранение пользователя
// ================================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    let raw = localStorage.getItem("user");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// ================================
//     TOAST уведомления
// ================================
function showMessage(text, type = "info") {
    const box = document.querySelector(".toast-container") || (() => {
        const box = document.createElement("div");
        box.className = "toast-container";
        document.body.appendChild(box);
        return box;
    })();

    const el = document.createElement("div");
    el.className = "toast " + type;
    el.innerText = text;

    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}


// ================================
//      REGISTER
// ================================
async function registerUser(name, phone, pass) {
    if (!name || !phone || !pass) {
        showMessage("Заполните все поля", "error"); return;
    }

    let r = await fetch(API + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password: pass })
    });

    let data = await r.json();
    if (data.status !== "ok") return showMessage(data.message, "error");

    saveUser(data.user);
    window.location.href = "index.html";
}


// ================================
//        LOGIN
// ================================
async function loginUser(phone, pass) {
    if (!phone || !pass) return showMessage("Введите телефон и пароль", "error");

    let r = await fetch(API + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password: pass })
    });

    let data = await r.json();
    if (data.status !== "ok") {
        return showMessage(data.message, "error");
    }

    saveUser(data.user);
    window.location.href = "index.html";
}


// ================================
//         LOAD CATALOG
// ================================
async function loadCatalog() {
    let r = await fetch(API + "/api/courses");
    let data = await r.json();

    const block = document.getElementById("catalogList");
    block.innerHTML = "";

    data.courses.forEach(c => {
        let card = document.createElement("div");
        card.className = "course-card";

        card.innerHTML = `
            <img src="${c.image || ''}" class="course-img">

            <h3>${c.title}</h3>
            <p class="author">${c.author}</p>

            <div class="price">${c.price} ₸</div>

            <button onclick="openCourse(${c.id})" class="btn-primary">
                Открыть
            </button>
        `;

        block.appendChild(card);
    });
}

function openCourse(cid) {
    localStorage.setItem("currentCourse", cid);
    window.location.href = "course.html";
}


// ================================
//        LOAD COURSE PAGE
// ================================
async function loadCoursePage() {
    const cid = localStorage.getItem("currentCourse");
    if (!cid) return;

    let r = await fetch(API + "/api/course?course_id=" + cid);
    let data = await r.json();

    const course = data.course;
    const lessons = data.lessons;
    const reviews = data.reviews;

    document.getElementById("courseTitle").innerText = course.title;
    document.getElementById("courseImg").src = course.image;
    document.getElementById("courseAuthor").innerText = course.author;
    document.getElementById("coursePrice").innerText = course.price + " ₸";
    document.getElementById("courseDescription").innerText = course.description;

    // Уроки
    const list = document.getElementById("lessonList");
    list.innerHTML = "";

    lessons.forEach(l => {
        let url = l.video_url || "";

        // Если это обычная Drive ссылка — преобразуем
        if (url.includes("/view")) url = url.replace("/view", "/preview");
        const openUrl = url.replace("/preview", "/view");

        let item = document.createElement("div");
        item.className = "lesson-item";
        item.innerHTML = `
            <span>${l.position}. ${l.title}</span>
            <div class="lesson-actions">
                <button onclick="playLesson('${url}')" class="btn-small">
                    Смотреть
                </button>
                <a href="${openUrl}" target="_blank" class="btn-link">
                    В Google Drive
                </a>
            </div>
        `;
        list.appendChild(item);
    });

    // Отзывы
    const revBlock = document.getElementById("reviewList");
    revBlock.innerHTML = "";
    reviews.forEach(r => {
        let el = document.createElement("div");
        el.className = "review-card";
        el.innerHTML = `
            <div class="stars">⭐ ${r.stars}</div>
            <div class="review-text">${r.text}</div>
            <div class="review-author">— ${r.user_name}</div>
        `;
        revBlock.appendChild(el);
    });
}


// ================================
//         VIDEO PLAYER
// ================================
function playLesson(url) {
    const player = document.getElementById("videoPlayer");
    player.innerHTML = `
        <iframe width="100%" height="420"
            src="${url}"
            frameborder="0"
            allow="autoplay; encrypted-media"
            allowfullscreen>
        </iframe>`;
}


// ================================
//         CART
// ================================
async function addToCart(cid) {
    let user = getUser();
    if (!user) return showMessage("Войдите в аккаунт", "error");

    let r = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, course_id: cid })
    });

    let data = await r.json();
    if (data.status !== "ok") return showMessage(data.message, "error");

    showMessage("Добавлено в корзину");
}

async function loadCart() {
    const user = getUser();
    if (!user) return;

    let r = await fetch(API + "/api/cart?user_id=" + user.user_id);
    let data = await r.json();

    const block = document.getElementById("cartList");
    block.innerHTML = "";

    let total = 0;

    data.items.forEach(it => {
        total += it.price;

        let el = document.createElement("div");
        el.className = "cart-item";
        el.innerHTML = `
            <img src="${it.image}" class="cart-img">

            <div class="cart-info">
                <h4>${it.title}</h4>
                <div>${it.price} ₸</div>
            </div>

            <button class="btn-danger" onclick="removeFromCart(${it.cart_id})">Удалить</button>
        `;

        block.appendChild(el);
    });

    document.getElementById("cartTotal").innerText = total + " ₸";
}

async function removeFromCart(id) {
    let r = await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: id })
    });

    loadCart();
}

async function buyCart() {
    const user = getUser();
    if (!user) return;

    let r = await fetch(API + "/api/cart/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id })
    });

    let data = await r.json();

    if (data.status !== "ok")
        return showMessage(data.message, "error");

    showMessage("Покупка успешна");
    loadCart();
}


// ================================
//        PROFILE
// ================================
async function loadProfile() {
    const user = getUser();
    if (!user) return;

    let r = await fetch(API + "/api/user?user_id=" + user.user_id);
    let data = await r.json();

    let u = data.user;

    document.getElementById("name").innerText = u.name;
    document.getElementById("phone").innerText = u.phone;
    document.getElementById("balance").innerText = u.balance + " ₸";

    if (u.avatar)
        document.getElementById("avatar").src = u.avatar;

    loadMyCourses();
}


async function loadMyCourses() {
    const user = getUser();
    let r = await fetch(API + "/api/my-courses?user_id=" + user.user_id);
    let data = await r.json();

    const block = document.getElementById("myCourses");
    block.innerHTML = "";

    data.courses.forEach(c => {
        let el = document.createElement("div");
        el.className = "course-card";

        el.innerHTML = `
            <img src="${c.image}">
            <h3>${c.title}</h3>
            <p>${c.author}</p>
            <button onclick="openCourse(${c.id})" class="btn-primary">Открыть</button>
        `;

        block.appendChild(el);
    });
}
