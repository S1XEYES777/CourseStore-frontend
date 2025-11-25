// assets/script.js

const API = "https://coursestore-backend.onrender.com";

// ==========================
//  ПОЛЬЗОВАТЕЛЬ В localStorage
// ==========================
function saveUser(user) {
    try {
        localStorage.setItem("user", JSON.stringify(user));
    } catch (e) {
        console.error("Не удалось сохранить пользователя:", e);
    }
}

function getUser() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.error("Не удалось прочитать пользователя:", e);
        return null;
    }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ==========================
//  ТОСТ-УВЕДОМЛЕНИЯ
// ==========================
function showMessage(text, type = "info") {
    if (!text) return;

    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = text;

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ==========================
//  ВСПОМОГАТЕЛЬНЫЕ
// ==========================
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

// ==========================
//  ЛОГИН / РЕГИСТРАЦИЯ
// ==========================
async function handleLoginForm(e) {
    e.preventDefault();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const resp = await fetch(`${API}/api/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ phone, password })
        });
        const data = await resp.json();
        if (data.status === "ok") {
            saveUser(data.user);
            showMessage("Успешный вход", "success");
            window.location.href = "catalog.html";
        } else {
            showMessage(data.message || "Ошибка входа", "error");
        }
    } catch (e) {
        showMessage("Сеть недоступна", "error");
    }
}

async function handleRegisterForm(e) {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const resp = await fetch(`${API}/api/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ name, phone, password })
        });
        const data = await resp.json();
        if (data.status === "ok") {
            saveUser(data.user);
            showMessage("Регистрация прошла успешно", "success");
            window.location.href = "catalog.html";
        } else {
            showMessage(data.message || "Ошибка регистрации", "error");
        }
    } catch (e) {
        showMessage("Сеть недоступна", "error");
    }
}

// ==========================
//  КАТАЛОГ КУРСОВ
// ==========================
async function loadCatalog() {
    const grid = document.getElementById("courses-grid");
    if (!grid) return;

    grid.innerHTML = "Загрузка...";

    try {
        const resp = await fetch(`${API}/api/courses`);
        const data = await resp.json();
        if (data.status !== "ok") {
            grid.textContent = data.message || "Ошибка загрузки курсов";
            return;
        }

        grid.innerHTML = "";
        if (!data.courses.length) {
            grid.textContent = "Пока нет курсов";
            return;
        }

        data.courses.forEach(c => {
            const card = document.createElement("div");
            card.className = "course-card";

            const img = document.createElement("img");
            img.className = "course-image";
            img.src = c.image_url || "https://via.placeholder.com/300x180?text=Course";
            img.alt = c.title;

            const title = document.createElement("h3");
            title.textContent = c.title;

            const author = document.createElement("p");
            author.className = "course-author";
            author.textContent = "Автор: " + c.author;

            const price = document.createElement("p");
            price.className = "course-price";
            price.textContent = c.price + " ₸";

            const btn = document.createElement("a");
            btn.href = `course.html?id=${c.id}`;
            btn.className = "btn";
            btn.textContent = "Открыть курс";

            card.appendChild(img);
            card.appendChild(title);
            card.appendChild(author);
            card.appendChild(price);
            card.appendChild(btn);

            grid.appendChild(card);
        });
    } catch (e) {
        grid.textContent = "Ошибка сети";
    }
}

// ==========================
//  СТРАНИЦА КУРСА
// ==========================
async function loadCoursePage() {
    const courseContainer = document.getElementById("course-container");
    if (!courseContainer) return;

    const id = getQueryParam("id");
    if (!id) {
        courseContainer.textContent = "Нет id курса";
        return;
    }

    try {
        const resp = await fetch(`${API}/api/course?course_id=${id}`);
        const data = await resp.json();
        if (data.status !== "ok") {
            courseContainer.textContent = data.message || "Курс не найден";
            return;
        }

        const c = data.course;

        courseContainer.innerHTML = `
            <div class="course-header">
                <img src="${c.image_url || "https://via.placeholder.com/400x220?text=Course"}" class="course-page-image">
                <div class="course-info">
                    <h1>${c.title}</h1>
                    <p class="course-author">Автор: ${c.author}</p>
                    <p class="course-price">${c.price} ₸</p>
                    <p class="course-description">${c.description}</p>
                    <button id="add-to-cart" class="btn primary">Добавить в корзину</button>
                </div>
            </div>
            <h2>Уроки</h2>
            <ul id="lessons-list" class="lessons-list"></ul>
        `;

        const lessonsList = document.getElementById("lessons-list");
        if (c.lessons && c.lessons.length) {
            c.lessons.forEach(l => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <span>${l.position}. ${l.title}</span>
                    <a href="${l.youtube_url}" target="_blank">Смотреть</a>
                `;
                lessonsList.appendChild(li);
            });
        } else {
            lessonsList.innerHTML = "<li>Уроков пока нет</li>";
        }

        const btn = document.getElementById("add-to-cart");
        btn.addEventListener("click", () => addCourseToCart(c.id));
    } catch (e) {
        courseContainer.textContent = "Ошибка сети";
    }
}

// ==========================
//  КОРЗИНА
// ==========================
async function addCourseToCart(courseId) {
    const user = getUser();
    if (!user) {
        showMessage("Сначала войди в аккаунт", "error");
        window.location.href = "login.html";
        return;
    }

    try:
        const resp = await fetch(`${API}/api/cart/add`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                user_id: user.id,
                course_id: courseId
            })
        });
        const data = await resp.json();
        if (data.status === "ok") {
            showMessage("Курс добавлен в корзину", "success");
        } else {
            showMessage(data.message || "Ошибка добавления", "error");
        }
    } catch (e) {
        showMessage("Ошибка сети", "error");
    }
}

async function loadCartPage() {
    const list = document.getElementById("cart-list");
    const totalEl = document.getElementById("cart-total");
    if (!list || !totalEl) return;

    const user = getUser();
    if (!user) {
        list.innerHTML = "<li>Вы не авторизованы</li>";
        return;
    }

    try:
        const resp = await fetch(`${API}/api/cart?user_id=${user.id}`);
        const data = await resp.json();
        if (data.status !== "ok") {
            list.innerHTML = `<li>${data.message || "Ошибка загрузки корзины"}</li>`;
            return;
        }

        list.innerHTML = "";
        let total = 0;

        if (!data.items.length) {
            list.innerHTML = "<li>Корзина пустая</li>";
            totalEl.textContent = "0 ₸";
            return;
        }

        for (const item of data.items) {
            const c = item.course;
            total += c.price;

            const li = document.createElement("li");
            li.className = "cart-item";
            li.innerHTML = `
                <span>${c.title} — ${c.price} ₸</span>
                <button class="btn small" data-course-id="${c.id}">Удалить</button>
            `;
            list.appendChild(li);
        }

        totalEl.textContent = total + " ₸";

        list.addEventListener("click", async (e) => {
            if (e.target.matches("button[data-course-id]")) {
                const courseId = e.target.getAttribute("data-course-id");
                await removeFromCart(courseId);
                loadCartPage();
            }
        });
    } catch (e) {
        list.innerHTML = "<li>Ошибка сети</li>";
    }
}

async function removeFromCart(courseId) {
    const user = getUser();
    if (!user) return;

    try:
        const resp = await fetch(`${API}/api/cart/remove`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                user_id: user.id,
                course_id: courseId
            })
        });
        const data = await resp.json();
        if (data.status !== "ok") {
            showMessage(data.message || "Ошибка удаления", "error");
        }
    } catch (e) {
        showMessage("Ошибка сети", "error");
    }
}

// ==========================
//  ПРОФИЛЬ
// ==========================
function loadProfilePage() {
    const user = getUser();
    const nameEl = document.getElementById("profile-name");
    const phoneEl = document.getElementById("profile-phone");
    const balanceEl = document.getElementById("profile-balance");

    if (!nameEl || !phoneEl || !balanceEl) return;

    if (!user) {
        nameEl.textContent = "Гость";
        phoneEl.textContent = "-";
        balanceEl.textContent = "0 ₸";
        return;
    }

    nameEl.textContent = user.name;
    phoneEl.textContent = user.phone;
    balanceEl.textContent = (user.balance || 0) + " ₸";
}

// ==========================
//  АВТО-ИНИЦИАЛИЗАЦИЯ ПО СТРАНИЦЕ
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    if (page === "login") {
        document.getElementById("login-form").addEventListener("submit", handleLoginForm);
    }

    if (page === "register") {
        document.getElementById("register-form").addEventListener("submit", handleRegisterForm);
    }

    if (page === "catalog") {
        loadCatalog();
    }

    if (page === "course") {
        loadCoursePage();
    }

    if (page === "profile") {
        loadProfilePage();
    }

    if (page === "cart") {
        loadCartPage();
    }
});
