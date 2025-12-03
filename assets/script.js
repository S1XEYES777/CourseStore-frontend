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
    let raw = localStorage.getItem("user");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
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
    setTimeout(() => t.remove(), 3000);
}

// ================================
// API WRAPPER
// ================================
async function apiRequest(path, options = {}) {
    const headers = options.headers || {};
    if (options.method && options.method !== "GET") {
        headers["Content-Type"] = "application/json";
    }
    options.headers = headers;

    try {
        const res = await fetch(API + path, options);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.status === "error") {
            const msg = data.message || "Ошибка запроса";
            throw new Error(msg);
        }
        return data;
    } catch (err) {
        showMessage(err.message, "error");
        throw err;
    }
}

// ================================
// HELPERS
// ================================
function formatPrice(p) {
    return `${Number(p).toLocaleString("ru-RU")} ₸`;
}

async function requireUser() {
    const user = getUser();
    if (!user) {
        showMessage("Авторизуйтесь", "error");
        window.location.href = "login.html";
        throw new Error("NO_USER");
    }
    return user;
}

function initUserPill() {
    const pill = document.getElementById("user-pill");
    if (!pill) return;

    const user = getUser();
    if (user) {
        document.getElementById("user-pill-name").textContent = user.name;
        pill.style.display = "flex";
    } else {
        pill.style.display = "none";
    }
}

// ================================
// MAIN PAGE
// ================================
async function initIndex() {
    initUserPill();

    const user = getUser();
    let purchased = new Set();

    if (user) {
        const my = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
        purchased = new Set(my.courses.map(c => c.id));
    }

    const res = await apiRequest(user ? `/api/courses?user_id=${user.id}` : "/api/courses");
    const courses = res.courses;

    const grid = document.getElementById("home-all-courses");
    grid.innerHTML = "";

    courses.forEach(c => grid.append(createCourseCard(c, purchased)));
}

// ================================
// COURSE CARD CREATION
// ================================
function createCourseCard(course, purchasedSet) {
    const card = document.createElement("div");
    card.className = "course-card";

    card.innerHTML = `
        <img src="${course.thumbnail}" class="course-thumb">
        <div class="course-title">${course.title}</div>
        <div class="course-desc">${course.description}</div>
        <div class="course-rating">★ ${course.avg_rating} • ${course.ratings_count} отзывов</div>
        <div class="course-price">${formatPrice(course.price)}</div>
        <button class="btn btn-primary course-buy-btn"></button>
    `;

    const btn = card.querySelector(".course-buy-btn");

    if (course.is_purchased) {
        btn.textContent = "Куплено";
        btn.disabled = true;
    } else {
        btn.textContent = "В корзину";
        btn.onclick = (e) => {
            e.stopPropagation();
            addToCart(course.id);
        };
    }

    card.onclick = () => {
        window.location.href = `course.html?id=${course.id}`;
    };

    return card;
}

// ================================
// ADD TO CART
// ================================
async function addToCart(id) {
    const user = await requireUser();

    await apiRequest("/api/cart/add", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, course_id: id })
    });

    showMessage("Добавлено в корзину", "success");
}

// ================================
// CATALOG
// ================================
async function initCatalog() {
    initUserPill();

    const user = getUser();
    let purchased = new Set();

    if (user) {
        const my = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
        purchased = new Set(my.courses.map(c => c.id));
    }

    const res = await apiRequest(user ? `/api/courses?user_id=${user.id}` : "/api/courses");
    const courses = res.courses;

    const grid = document.getElementById("catalog-grid");
    grid.innerHTML = "";

    courses.forEach(c => grid.append(createCourseCard(c, purchased)));
}

// ================================
// COURSE PAGE
// ================================
async function initCoursePage() {
    initUserPill();

    const id = new URLSearchParams(window.location.search).get("id");
    const user = getUser();

    const res = await apiRequest(
        user ? `/api/courses/${id}?user_id=${user.id}` : `/api/courses/${id}`
    );

    const course = res.course;
    const lessons = res.lessons || [];

    document.getElementById("course-thumb").src = course.thumbnail;
    document.getElementById("course-title").textContent = course.title;
    document.getElementById("course-short").textContent = course.description;
    document.getElementById("course-price").textContent = formatPrice(course.price);

    const list = document.getElementById("lesson-list-body");
    const lock = document.getElementById("course-lock-warning");

    if (!course.is_purchased) {
        lock.style.display = "block";
        return;
    }

    lock.style.display = "none";
    lessons.forEach((ls, i) => {
        const row = document.createElement("div");
        row.className = "lesson-item";
        row.innerHTML = `
            <span>${i + 1}. ${ls.title}</span>
            <a class="btn btn-ghost" href="${ls.video_url}" target="_blank">Видео</a>
        `;
        list.append(row);
    });

    document.getElementById("course-add-cart-btn").onclick = () => addToCart(course.id);
}

// ================================
// CART PAGE
// ================================
async function initCart() {
    initUserPill();

    const user = await requireUser();
    const res = await apiRequest(`/api/cart?user_id=${user.id}`);

    const items = res.items;
    const list = document.getElementById("cart-items");

    if (!items.length) {
        document.getElementById("cart-empty").style.display = "block";
        return;
    }

    let total = 0;
    list.innerHTML = "";

    items.forEach(i => {
        total += i.price;

        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <img src="${i.thumbnail}" class="cart-item-thumb">
            <div class="cart-item-title">${i.title}</div>
            <div class="cart-item-price">${formatPrice(i.price)}
            <br><button class="btn btn-ghost" onclick="removeFromCart(${i.course_id})">Удалить</button></div>
        `;
        list.append(row);
    });

    document.getElementById("cart-total").textContent = formatPrice(total);
}

async function removeFromCart(id) {
    const user = await requireUser();

    await apiRequest("/api/cart/remove", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, course_id: id })
    });

    initCart();
}

async function checkoutCart() {
    const user = await requireUser();

    const res = await apiRequest(`/api/cart?user_id=${user.id}`);
    const items = res.items;

    for (const it of items) {
        await apiRequest("/api/purchase", {
            method: "POST",
            body: JSON.stringify({ user_id: user.id, course_id: it.course_id })
        });
    }

    showMessage("Покупка прошла успешно!", "success");
    window.location.href = "profile.html";
}

// ================================
// PROFILE PAGE
// ================================
async function initProfile() {
    initUserPill();

    const user = await requireUser();

    document.getElementById("profile-name").textContent = user.name;
    document.getElementById("profile-phone").textContent = user.phone;
    document.getElementById("profile-balance").textContent = formatPrice(user.balance);

    if (user.avatar) {
        document.getElementById("profile-avatar").src = user.avatar;
        document.getElementById("profile-avatar").style.display = "block";
    }

    const res = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
    const courses = res.courses;

    const grid = document.getElementById("profile-courses-grid");
    if (!courses.length) {
        document.getElementById("profile-courses-empty").style.display = "block";
        return;
    }

    grid.innerHTML = "";
    const set = new Set(courses.map(c => c.id));

    courses.forEach(c => grid.append(createCourseCard(c, set)));

    // Пополнение
    document.getElementById("topup-form").onsubmit = async (e) => {
        e.preventDefault();
        const amount = Number(new FormData(e.target).get("amount"));

        const r = await apiRequest("/api/balance/topup", {
            method: "POST",
            body: JSON.stringify({ user_id: user.id, amount })
        });

        user.balance = r.balance;
        saveUser(user);

        document.getElementById("profile-balance").textContent = formatPrice(user.balance);
        showMessage("Баланс пополнен!", "success");
    };

    // Аватарка
    document.getElementById("avatar-form").onsubmit = async (e) => {
        e.preventDefault();
        const avatar_url = new FormData(e.target).get("avatar_url");

        const r = await apiRequest("/api/profile/avatar", {
            method: "POST",
            body: JSON.stringify({ user_id: user.id, avatar_url })
        });

        user.avatar = r.avatar;
        saveUser(user);

        document.getElementById("profile-avatar").src = r.avatar;
        showMessage("Аватар обновлён!", "success");
    };
}

// ================================
// LOGIN
// ================================
function initLogin() {
    initUserPill();

    document.getElementById("login-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);

        const phone = fd.get("phone");
        const password = fd.get("password");

        const r = await apiRequest("/api/login", {
            method: "POST",
            body: JSON.stringify({ phone, password })
        });

        saveUser(r.user);
        showMessage("Вход успешен!", "success");

        if (r.user.is_admin) {
            window.location.href = "admin.html";
        } else {
            window.location.href = "profile.html";
        }
    };
}

// ================================
// REGISTER
// ================================
function initRegister() {
    initUserPill();

    document.getElementById("register-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);

        const payload = {
            name: fd.get("name"),
            phone: fd.get("phone"),
            password: fd.get("password")
        };

        const r = await apiRequest("/api/register", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        saveUser(r.user);
        showMessage("Регистрация успешна!", "success");
        window.location.href = "profile.html";
    };
}

// ================================
// ADMIN PANEL
// ================================
async function initAdmin() {
    initUserPill();

    const user = await requireUser();
    if (!user.is_admin) {
        showMessage("Нет доступа", "error");
        window.location.href = "index.html";
        return;
    }

    initAdminTabs();
    loadAdminCourses();
    loadAdminUsers();
    loadAdminReviews();

    const form = document.getElementById("admin-course-form");

    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);

        const payload = {
            id: fd.get("id"),
            title: fd.get("title"),
            description: fd.get("description"),
            price: Number(fd.get("price")),
            thumbnail: fd.get("thumbnail")
        };

        if (payload.id) {
            await apiRequest("/api/admin/courses/update", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            showMessage("Курс обновлён", "success");
        } else {
            await apiRequest("/api/admin/courses/create", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            showMessage("Курс создан", "success");
        }

        loadAdminCourses();
        form.reset();
        form.querySelector("[name=id]").value = "";
    };

    document.getElementById("admin-course-reset").onclick = () => {
        form.reset();
        form.querySelector("[name=id]").value = "";
    };

    // LESSONS
    document.getElementById("admin-lesson-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);

        const course_id = Number(document.getElementById("admin-lessons-course-id").value);
        if (!course_id) {
            showMessage("Введите ID курса", "error");
            return;
        }

        await apiRequest("/api/admin/lessons/create", {
            method: "POST",
            body: JSON.stringify({
                course_id,
                title: fd.get("title"),
                video_url: fd.get("video_url"),
                order_index: Number(fd.get("order_index"))
            })
        });

        showMessage("Урок добавлен!", "success");
        adminLoadLessons();
    };
}

// ================================
// ADMIN TABS
// ================================
function initAdminTabs() {
    const btns = document.querySelectorAll("[data-admin-tab-btn]");
    const tabs = document.querySelectorAll("[data-admin-tab]");

    btns.forEach(btn => {
        btn.onclick = () => {
            const name = btn.getAttribute("data-admin-tab-btn");

            tabs.forEach(sec => {
                sec.style.display =
                    sec.getAttribute("data-admin-tab") === name ? "block" : "none";
            });
        };
    });
}

// ================================
// ADMIN COURSES
// ================================
async function loadAdminCourses() {
    const list = document.getElementById("admin-courses-list");
    const res = await apiRequest("/api/admin/courses");

    list.innerHTML = "";

    res.courses.forEach(c => {
        const div = document.createElement("div");
        div.className = "admin-item";

        div.innerHTML = `
            <strong>${c.title}</strong><br>
            ${formatPrice(c.price)}<br><br>
            <button class="btn" onclick="adminEditCourse(${c.id}, '${c.title}', '${c.description}', ${c.price}, '${c.thumbnail}')">Редактировать</button>
            <button class="btn btn-danger" onclick="adminDeleteCourse(${c.id})">Удалить</button>
        `;

        list.append(div);
    });
}

function adminEditCourse(id, title, description, price, thumbnail) {
    const f = document.getElementById("admin-course-form");
    f.querySelector("[name=id]").value = id;
    f.querySelector("[name=title]").value = title;
    f.querySelector("[name=description]").value = description;
    f.querySelector("[name=price]").value = price;
    f.querySelector("[name=thumbnail]").value = thumbnail;
}

async function adminDeleteCourse(id) {
    await apiRequest(`/api/admin/courses/${id}`, { method: "DELETE" });
    showMessage("Курс удалён", "info");
    loadAdminCourses();
}

// ================================
// ADMIN LESSONS
// ================================
async function adminLoadLessons() {
    const cid = document.getElementById("admin-lessons-course-id").value;
    if (!cid) {
        showMessage("Введите ID курса", "error");
        return;
    }

    const res = await apiRequest(`/api/admin/courses/${cid}/lessons`);
    const list = document.getElementById("admin-lessons-list");

    list.innerHTML = "";

    res.lessons.forEach(ls => {
        const div = document.createElement("div");
        div.className = "admin-item";
        div.innerHTML = `
            <strong>${ls.order_index}. ${ls.title}</strong><br>
            <a href="${ls.video_url}" target="_blank">${ls.video_url}</a><br><br>
            <button class="btn btn-danger" onclick="adminDeleteLesson(${ls.id})">Удалить</button>
        `;
        list.append(div);
    });
}

async function adminDeleteLesson(id) {
    await apiRequest(`/api/admin/lessons/${id}`, { method: "DELETE" });
    showMessage("Урок удалён", "info");
    adminLoadLessons();
}

// ================================
// ADMIN USERS
// ================================
async function loadAdminUsers() {
    const res = await apiRequest("/api/admin/users");
    const list = document.getElementById("admin-users-list");

    list.innerHTML = "";

    res.users.forEach(u => {
        const div = document.createElement("div");
        div.className = "admin-item";

        div.innerHTML = `
            <strong>${u.name}</strong> (${u.phone})<br>
            Баланс: ${formatPrice(u.balance)}<br><br>
            <button class="btn" onclick="adminSetBalance(${u.id})">Изменить баланс</button>
        `;

        list.append(div);
    });
}

async function adminSetBalance(targetId) {
    const value = prompt("Введите новый баланс:");
    if (!value) return;

    await apiRequest("/api/admin/users/update-balance", {
        method: "POST",
        body: JSON.stringify({
            user_id: targetId,
            balance: Number(value)
        })
    });

    showMessage("Баланс обновлён!", "success");
    loadAdminUsers();
}

// ================================
// ADMIN REVIEWS
// ================================
async function loadAdminReviews() {
    const res = await apiRequest("/api/admin/reviews");
    const list = document.getElementById("admin-reviews-list");

    list.innerHTML = "";

    res.reviews.forEach(rv => {
        const div = document.createElement("div");
        div.className = "admin-item";

        div.innerHTML = `
            <strong>${rv.user_name}</strong><br>
            Курс: ${rv.course_title}<br>
            ★ ${rv.rating}<br>
            "${rv.text}"<br><br>
            <button class="btn btn-danger" onclick="adminDeleteReview(${rv.id})">Удалить</button>
        `;

        list.append(div);
    });
}

async function adminDeleteReview(id) {
    await apiRequest(`/api/admin/reviews/${id}`, { method: "DELETE" });
    showMessage("Отзыв удалён", "info");
    loadAdminReviews();
}

// ================================
// ROUTER
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.getAttribute("data-page");

    if (page === "index") initIndex();
    if (page === "catalog") initCatalog();
    if (page === "course") initCoursePage();
    if (page === "cart") initCart();
    if (page === "profile") initProfile();
    if (page === "login") initLogin();
    if (page === "register") initRegister();
    if (page === "admin") initAdmin();

    initUserPill();
});
