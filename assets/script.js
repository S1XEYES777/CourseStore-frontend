// ================================
// CONFIG
// ================================
const API = "https://coursestore-backend.onrender.com";

// ================================
// LOCAL STORAGE USER
// ================================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}
function getUser() {
    let u = localStorage.getItem("user");
    if (!u) return null;
    try { return JSON.parse(u); } catch { return null; }
}
function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ================================
// TOAST
// ================================
function showMessage(text, type = "info") {
    const box = document.querySelector(".toast-container") || (() => {
        const div = document.createElement("div");
        div.className = "toast-container";
        document.body.appendChild(div);
        return div;
    })();

    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = text;

    box.appendChild(t);

    setTimeout(() => {
        t.classList.add("hide");
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// ================================
// NAVBAR (генерация меню)
// ================================
function renderNavbar() {
    const user = getUser();
    let html = `
        <a href="index.html">Главная</a>
        <a href="catalog.html">Каталог</a>
    `;

    if (!user) {
        html += `
            <a href="login.html" class="btn">Вход</a>
            <a href="register.html" class="btn">Регистрация</a>
        `;
    } else {
        html += `
            <a href="cart.html">Корзина</a>
            <a href="profile.html" class="btn">Профиль</a>
            <button onclick="logout()" class="btn">Выйти</button>
        `;
    }

    const nav = document.querySelector(".navbar");
    if (nav) nav.innerHTML = html;
}
document.addEventListener("DOMContentLoaded", renderNavbar);

// ================================
// LOGIN
// ================================
async function doLogin() {
    const phone = document.getElementById("login-phone").value;
    const password = document.getElementById("login-password").value;

    try {
        const res = await fetch(`${API}/api/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ phone, password })
        });

        const data = await res.json();

        if (data.error) {
            showMessage(data.error, "error");
            return;
        }

        saveUser(data.user);
        window.location.href = "profile.html";

    } catch {
        showMessage("Ошибка соединения с сервером", "error");
    }
}

// ================================
// REGISTER
// ================================
async function doRegister() {
    const phone = document.getElementById("reg-phone").value;
    const password = document.getElementById("reg-password").value;

    try {
        const res = await fetch(`${API}/api/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ phone, password })
        });

        const data = await res.json();

        if (data.error) {
            showMessage(data.error, "error");
            return;
        }

        saveUser(data.user);
        window.location.href = "profile.html";

    } catch {
        showMessage("Ошибка соединения", "error");
    }
}

// ================================
// LOAD COURSES (INDEX + CATALOG)
// ================================
async function loadCourses() {
    const list = document.getElementById("course-list");
    if (!list) return;

    try {
        const user = getUser();
        const res = await fetch(`${API}/api/courses`, {
            headers: user ? {"X-Token": user.token} : {}
        });

        const data = await res.json();
        list.innerHTML = "";

        data.courses.forEach(c => {
            list.innerHTML += `
            <div class="course-card">
                <img src="${c.image_url}" alt="">
                <h3>${c.title}</h3>
                <p>${c.description.substring(0, 80)}...</p>
                <p class="price">${c.price} ₸</p>
                <a href="course.html?id=${c.id}" class="btn">Подробнее</a>
            </div>`;
        });
    } catch {
        showMessage("Ошибка загрузки курсов", "error");
    }
}
document.addEventListener("DOMContentLoaded", loadCourses);

// ================================
// COURSE PAGE
// ================================
async function loadCoursePage() {
    if (!document.getElementById("course-page")) return;

    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const user = getUser();

    const res = await fetch(`${API}/api/courses/${id}`, {
        headers: user ? {"X-Token": user.token} : {}
    });

    const data = await res.json();
    const c = data.course;

    document.getElementById("course-title").innerText = c.title;
    document.getElementById("course-desc").innerText = c.description;
    document.getElementById("course-image").src = c.image_url;
    document.getElementById("course-price").innerText = c.price + " ₸";

    const lessons = document.getElementById("course-lessons");

    if (!c.is_purchased) {
        lessons.innerHTML = "<p>Купите курс, чтобы увидеть уроки.</p>";
        return;
    }

    lessons.innerHTML = "";
    c.lessons.forEach(l => {
        lessons.innerHTML += `
            <div class="lesson-item">
                <h4>${l.title}</h4>
                <video controls src="${l.video_url}"></video>
            </div>
        `;
    });
}
document.addEventListener("DOMContentLoaded", loadCoursePage);

// ================================
// ADD TO CART
// ================================
async function addToCart(id) {
    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch(`${API}/api/cart/add`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "X-Token": user.token 
            },
            body: JSON.stringify({ course_id: id })
        });

        const data = await res.json();

        if (data.error) {
            showMessage(data.error, "error");
        } else {
            showMessage("Добавлено в корзину", "success");
        }

    } catch {
        showMessage("Ошибка соединения", "error");
    }
}

// ================================
// CART PAGE
// ================================
async function loadCart() {
    const container = document.getElementById("cart-items");
    if (!container) return;

    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const res = await fetch(`${API}/api/cart`, {
        headers: { "X-Token": user.token }
    });

    const data = await res.json();
    container.innerHTML = "";

    data.items.forEach(i => {
        container.innerHTML += `
        <div class="cart-item">
            <img src="${i.image_url}">
            <h3>${i.title}</h3>
            <p>${i.price} ₸</p>
            <button onclick="removeFromCart(${i.course_id})">Удалить</button>
        </div>`;
    });

    document.getElementById("cart-total").innerText = data.total + " ₸";
}
document.addEventListener("DOMContentLoaded", loadCart);

// ================================
// REMOVE FROM CART
// ================================
async function removeFromCart(id) {
    const user = getUser();
    const res = await fetch(`${API}/api/cart/remove`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Token": user.token
        },
        body: JSON.stringify({ course_id: id })
    });

    loadCart();
}

// ================================
// CHECKOUT
// ================================
async function checkout() {
    const user = getUser();
    const res = await fetch(`${API}/api/cart/checkout`, {
        method: "POST",
        headers: { "X-Token": user.token }
    });

    const data = await res.json();
    showMessage(data.message || "Успешно", "success");
    loadCart();
}

// ================================
// PROFILE PAGE
// ================================
async function loadProfile() {
    const user = getUser();
    const avatar = document.getElementById("avatar-img");
    const myCourses = document.getElementById("my-courses");

    if (!avatar) return;

    if (user && user.avatar_url) avatar.src = user.avatar_url;

    const res = await fetch(`${API}/api/my-courses`, {
        headers: { "X-Token": user.token }
    });
    const data = await res.json();

    myCourses.innerHTML = "";

    data.courses.forEach(c => {
        myCourses.innerHTML += `
            <div class="course-mini">
                <img src="${c.image_url}">
                <p>${c.title}</p>
            </div>
        `;
    });
}
document.addEventListener("DOMContentLoaded", loadProfile);

// ================================
// UPLOAD AVATAR
// ================================
async function uploadAvatar() {
    const user = getUser();
    const file = document.getElementById("avatar-file").files[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API}/api/user/avatar`, {
        method: "POST",
        headers: { "X-Token": user.token },
        body: form
    });

    const data = await res.json();
    if (data.avatar_url) {
        showMessage("Аватар обновлён", "success");
        document.getElementById("avatar-img").src = data.avatar_url;
    }
}
