/* ============================================
   CONFIG
============================================ */

const API = "https://coursestore-backend.onrender.com";

/* ADMIN LOGIN (по номеру телефона) */
const ADMIN_PHONE = "77750476284";
const ADMIN_PASS = "123admin";

/* ============================================
   USER STORAGE
============================================ */

function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

/* ============================================
   TOASTS
============================================ */

function showMessage(text, type = "info") {
    const box = document.querySelector(".toast-container") || (() => {
        const c = document.createElement("div");
        c.className = "toast-container";
        document.body.appendChild(c);
        return c;
    })();

    const el = document.createElement("div");
    el.className = "toast " + (type === "error" ? "error" : type === "success" ? "success" : "");
    el.innerText = text;

    box.appendChild(el);

    setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 300);
    }, 2000);
}

/* ============================================
   LOGIN
============================================ */

async function loginUser(phone, pass) {
    if (!phone || !pass) {
        return showMessage("Введите телефон и пароль", "error");
    }

    // ADMIN LOGIN
    if (phone === ADMIN_PHONE && pass === ADMIN_PASS) {
        saveUser({
            user_id: 0,
            name: "Admin",
            phone: ADMIN_PHONE,
            balance: 0,
            avatar: null,
            isAdmin: true,
        });

        showMessage("Добро пожаловать, Админ!", "success");
        return (window.location.href = "admin.html");
    }

    // USER LOGIN
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
    showMessage("Вход выполнен", "success");
    window.location.href = "index.html";
}

/* ============================================
   REGISTER
============================================ */

async function registerUser(name, phone, pass) {
    if (!name || !phone || !pass)
        return showMessage("Заполните все поля", "error");

    let r = await fetch(API + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password: pass })
    });

    let data = await r.json();
    if (data.status !== "ok") return showMessage(data.message, "error");

    saveUser(data.user);
    showMessage("Регистрация успешна", "success");
    window.location.href = "index.html";
}

/* ============================================
   CATALOG
============================================ */

async function loadCatalog() {
    let r = await fetch(API + "/api/courses");
    let data = await r.json();

    const list = document.getElementById("catalogList");
    if (!list) return;

    list.innerHTML = "";

    data.courses.forEach(c => {
        let card = document.createElement("div");
        card.className = "course-card";
        card.innerHTML = `
            <img src="${c.image || ''}">
            <h3>${c.title}</h3>
            <p class="author">${c.author}</p>
            <div class="course-price">${c.price} ₸</div>
            <button class="btn-primary" onclick="openCourse(${c.id})">Открыть</button>
        `;
        list.appendChild(card);
    });
}

function openCourse(cid) {
    localStorage.setItem("currentCourse", cid);
    window.location.href = "course.html";
}

/* ============================================
   COURSE PAGE
============================================ */

async function loadCoursePage() {
    const cid = localStorage.getItem("currentCourse");
    if (!cid) return;

    const r = await fetch(API + `/api/course?course_id=${cid}`);
    const data = await r.json();

    if (data.status !== "ok") {
        return showMessage("Курс не найден", "error");
    }

    const course = data.course;
    const lessons = data.lessons;
    const reviews = data.reviews;

    // загружаем инфо
    document.getElementById("courseTitle").innerText = course.title;
    document.getElementById("courseImg").src = course.image;
    document.getElementById("courseAuthor").innerText = course.author;
    document.getElementById("courseDescription").innerText = course.description;
    document.getElementById("coursePrice").innerText = course.price + " ₸";

    // уроки
    const lessonList = document.getElementById("lessonList");
    lessonList.innerHTML = "";

    lessons.forEach(l => {
        let url = l.video_url || "";
        if (url.includes("/view")) url = url.replace("/view", "/preview");
        const openUrl = url.replace("/preview", "/view");

        const el = document.createElement("div");
        el.className = "lesson-item";

        el.innerHTML = `
            <span>${l.position}. ${l.title}</span>
            <div class="lesson-actions">
                <button class="btn-small" onclick="playLesson('${url}')">Смотреть</button>
                <a href="${openUrl}" target="_blank" class="btn-link">Drive</a>
            </div>
        `;

        lessonList.appendChild(el);
    });

    // отзывы
    const revList = document.getElementById("reviewList");
    revList.innerHTML = "";

    reviews.forEach(r => {
        const el = document.createElement("div");
        el.className = "review-card";

        el.innerHTML = `
            <div class="stars">⭐ ${r.stars}</div>
            <div>${r.text}</div>
            <div class="review-author">— ${r.user_name}</div>
        `;

        revList.appendChild(el);
    });
}

// видео
function playLesson(url) {
    const player = document.getElementById("videoPlayer");
    player.innerHTML = `
        <iframe width="100%" height="420" 
                src="${url}" 
                allow="autoplay; encrypted-media" 
                frameborder="0"
                allowfullscreen>
        </iframe>
    `;
}

/* ============================================
   CART
============================================ */

async function addToCart(cid) {
    const user = getUser();
    if (!user) return showMessage("Войдите в аккаунт", "error");

    let r = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, course_id: cid })
    });

    const data = await r.json();
    if (data.status !== "ok") return showMessage(data.message, "error");

    showMessage("Добавлено в корзину", "success");
}

async function loadCart() {
    const user = getUser();
    if (!user) return;

    let r = await fetch(API + `/api/cart?user_id=${user.user_id}`);
    let data = await r.json();

    const list = document.getElementById("cartList");
    const totalEl = document.getElementById("cartTotal");

    list.innerHTML = "";
    let total = 0;

    data.items.forEach(it => {
        total += it.price;

        const el = document.createElement("div");
        el.className = "cart-item";

        el.innerHTML = `
            <img src="${it.image}" class="cart-img">
            <div class="cart-info">
                <h4>${it.title}</h4>
                <div>${it.price} ₸</div>
            </div>
            <button class="btn-danger" onclick="removeFromCart(${it.cart_id})">Удалить</button>
        `;

        list.appendChild(el);
    });

    totalEl.innerText = total + " ₸";
}

async function removeFromCart(id) {
    await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: id })
    });

    loadCart();
}

async function buyCart() {
    const user = getUser();
    if (!user) return;

    const r = await fetch(API + "/api/cart/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id })
    });

    const data = await r.json();
    if (data.status !== "ok") return showMessage(data.message, "error");

    showMessage("Покупка успешна", "success");
    loadCart();
}

/* ============================================
   PROFILE PAGE
============================================ */

async function loadProfile() {
    const user = getUser();
    if (!user) return window.location.href = "login.html";

    const r = await fetch(API + `/api/user?user_id=${user.user_id}`);
    const data = await r.json();

    const u = data.user;

    document.getElementById("name").innerText = u.name;
    document.getElementById("phone").innerText = u.phone;
    document.getElementById("balance").innerText = u.balance + " ₸";

    if (u.avatar) {
        document.getElementById("avatar").src = u.avatar;
    }

    loadMyCourses();
}

async function loadMyCourses() {
    const user = getUser();
    let r = await fetch(API + `/api/my-courses?user_id=${user.user_id}`);
    let data = await r.json();

    const block = document.getElementById("myCourses");
    block.innerHTML = "";

    data.courses.forEach(c => {
        const el = document.createElement("div");
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

/* ============================================
   ADMIN PAGE
============================================ */

function checkAdmin() {
    const user = getUser();
    if (!user || !user.isAdmin) {
        return window.location.href = "login.html";
    }
}

/* курс добавить */
async function adminAddCourse() {
    const title = document.getElementById("adm_title").value;
    const price = document.getElementById("adm_price").value;
    const author = document.getElementById("adm_author").value;
    const descr = document.getElementById("adm_descr").value;
    const image = document.getElementById("adm_image").value;

    let r = await fetch(API + "/api/courses/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, price, author, description: descr, image })
    });

    let data = await r.json();
    if (data.status !== "ok") return showMessage("Ошибка при добавлении", "error");

    showMessage("Курс добавлен", "success");
}

/* урок добавить */
async function adminAddLesson() {
    const course_id = document.getElementById("lesson_course").value;
    const title = document.getElementById("lesson_title").value;
    const video = document.getElementById("lesson_video").value;
    const pos = document.getElementById("lesson_pos").value || 1;

    let r = await fetch(API + "/api/lessons/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            course_id,
            title,
            youtube_url: video,
            position: pos
        })
    });

    let data = await r.json();
    if (data.status !== "ok") return showMessage("Ошибка", "error");

    showMessage("Урок добавлен", "success");
}

/* урок удалить */
async function adminDeleteLesson() {
    const id = document.getElementById("lesson_delete").value;

    let r = await fetch(API + "/api/lessons/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });

    let data = await r.json();
    if (data.status !== "ok") return showMessage("Ошибка", "error");

    showMessage("Урок удалён", "success");
}
