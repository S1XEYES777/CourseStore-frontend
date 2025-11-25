// ==========================
//  API URL
// ==========================
const API = "https://coursestore-backend.onrender.com";


// ==========================
//  USER STORAGE
// ==========================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// ==========================
//  TOAST
// ==========================
function showMessage(text, type = "info") {
    if (!text) return;

    let el = document.querySelector(".toast-container");
    if (!el) {
        el = document.createElement("div");
        el.className = "toast-container";
        document.body.appendChild(el);
    }

    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;

    if (type === "success") t.classList.add("toast-success");
    if (type === "error") t.classList.add("toast-error");
    if (type === "warning") t.classList.add("toast-warning");

    el.appendChild(t);

    requestAnimationFrame(() => t.classList.add("toast-show"));

    setTimeout(() => {
        t.classList.remove("toast-show");
        setTimeout(() => t.remove(), 200);
    }, 3500);
}


// ==========================
//  API HELPERS
// ==========================
async function apiGet(path) {
    const res = await fetch(API + path);
    const data = await res.json().catch(() => ({}));

    if (data.status === "error") {
        throw new Error(data.message || "Ошибка запроса");
    }
    return data;
}

async function apiPost(path, body) {
    const res = await fetch(API + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {})
    });

    const data = await res.json().catch(() => ({}));
    if (data.status === "error") {
        throw new Error(data.message || "Ошибка запроса");
    }
    return data;
}


// ==========================
//  LOAD COURSES (GENERAL)
// ==========================
async function loadCoursesTo(containerId) {
    try {
        const data = await apiGet("/api/courses");
        const grid = document.getElementById(containerId);

        if (!grid) return;
        grid.innerHTML = "";

        if (!data.courses || data.courses.length === 0) {
            grid.innerHTML = "<p class='section-subtitle'>Курсы отсутствуют</p>";
            return;
        }

        data.courses.forEach(c => {
            const img = c.image_url || "assets/default.jpg";

            const card = document.createElement("div");
            card.className = "course-card";

            card.innerHTML = `
                <div class="course-thumb">
                    <img src="${img}" alt="${c.title}">
                </div>

                <div class="course-body">
                    <h3 class="course-title">${c.title}</h3>

                    <div class="course-meta">
                        <span>${c.author}</span>
                        <span class="course-price">${c.price} ₸</span>
                    </div>
                </div>

                <div class="course-footer">
                    <a href="course.html?id=${c.id}" class="btn btn-primary btn-small">
                        Подробнее
                    </a>
                    <button class="btn btn-ghost btn-small buy-btn">Купить</button>
                </div>
            `;

            card.querySelector(".buy-btn").onclick = () => {
                addToCart(c);
                showMessage("Добавлено в корзину!", "success");
            };

            grid.appendChild(card);
        });

    } catch (e) {
        document.getElementById(containerId).innerHTML =
            "<p class='section-subtitle'>Ошибка загрузки.</p>";
        console.error(e);
    }
}


// ==========================
//  CART
// ==========================
function addToCart(course) {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push(course);
    localStorage.setItem("cart", JSON.stringify(cart));
}
