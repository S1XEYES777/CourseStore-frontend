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
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}
function logout() {
    localStorage.removeItem("user");
    showMessage("Вы вышли из аккаунта", "info");
    window.location.href = "index.html";
}

// ================================
// TOAST
// ================================
function showMessage(text, type = "info") {
    if (!text) return;

    let box = document.querySelector(".toast-container");
    if (!box) {
        box = document.createElement("div");
        box.className = "toast-container";
        document.body.appendChild(box);
    }

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
            const msg = data.message || `Ошибка (${res.status})`;
            throw new Error(msg);
        }

        return data;
    } catch (err) {
        showMessage(err.message, "error");
        throw err;
    }
}

// ================================
// USER PILL (RIGHT CORNER)
// ================================
function initUserPill() {
    const pill = document.getElementById("user-pill");
    if (!pill) return;

    const nameEl = document.getElementById("user-pill-name");
    const u = getUser();

    if (u && u.name) {
        nameEl.textContent = u.name;
        pill.style.display = "flex";
    } else {
        pill.style.display = "none";
    }
}

// ================================
// HELPERS
// ================================
function formatPrice(p) {
    return `${Number(p || 0).toLocaleString("ru-RU")} ₸`;
}

async function requireUser() {
    const u = getUser();
    if (!u) {
        showMessage("Нужно войти", "error");
        setTimeout(() => window.location.href = "login.html", 700);
        throw new Error("NO_USER");
    }
    return u;
}

async function addToCart(courseId) {
    const user = await requireUser();
    await apiRequest("/api/cart/add", {
        method: "POST",
        body: JSON.stringify({
            user_id: user.id,
            course_id: courseId
        })
    });
    showMessage("Добавлено в корзину", "success");
}

// ================================
// CREATE COURSE CARD
// ================================
function createCourseCard(course, purchased = new Set()) {
    const card = document.createElement("div");
    card.className = "course-card";

    const top = document.createElement("img");
    top.className = "course-thumb";
    top.src = course.thumbnail || "https://via.placeholder.com/640x360?text=Course";

    const title = document.createElement("div");
    title.className = "course-title";
    title.textContent = course.title;

    const desc = document.createElement("div");
    desc.className = "course-desc";
    desc.textContent = course.description || "Без описания";

    const rating = document.createElement("div");
    rating.className = "course-rating";
    rating.textContent = `★ ${course.avg_rating || 0} • ${course.ratings_count || 0} отзывов`;

    const price = document.createElement("div");
    price.className = "course-price";
    price.textContent = formatPrice(course.price);

    const btn = document.createElement("button");
    btn.className = "btn btn-primary";

    const isBought = purchased.has(course.id) || course.is_purchased;

    if (isBought) {
        btn.disabled = true;
        btn.textContent = "Куплено";
    } else {
        btn.textContent = "В корзину";
        btn.onclick = (e) => {
            e.stopPropagation();
            addToCart(course.id);
        };
    }

    card.append(top, title, desc, rating, price, btn);
    card.onclick = () => window.location.href = `course.html?id=${course.id}`;

    return card;
}

// ================================
// INDEX PAGE
// ================================
async function initIndex() {
    initUserPill();
    const user = getUser();

    let purchased = new Set();
    if (user) {
        try {
            const my = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
            purchased = new Set(my.courses.map(c => c.id));
        } catch {}
    }

    let courses = [];
    try {
        const r = await apiRequest(
            user ? `/api/courses?user_id=${user.id}` : "/api/courses"
        );
        courses = r.courses;
    } catch {}

    const grid = document.getElementById("home-all-courses");
    if (grid) {
        grid.innerHTML = "";
        courses.forEach(c => grid.append(createCourseCard(c, purchased)));
    }
}

// ================================
// CATALOG PAGE
// ================================
async function initCatalog() {
    initUserPill();
    const user = getUser();

    let purchased = new Set();
    if (user) {
        try {
            const my = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
            purchased = new Set(my.courses.map(c => c.id));
        } catch {}
    }

    let courses = [];
    try {
        const r = await apiRequest(
            user ? `/api/courses?user_id=${user.id}` : "/api/courses"
        );
        courses = r.courses;
    } catch {}

    const grid = document.getElementById("catalog-grid");
    const empty = document.getElementById("catalog-empty");

    if (!courses.length) {
        empty.style.display = "block";
        return;
    }

    grid.innerHTML = "";
    courses.forEach(c => grid.append(createCourseCard(c, purchased)));
}

// ================================
// COURSE PAGE
// ================================
async function initCoursePage() {
    initUserPill();

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const user = getUser();
    const part = user ? `?user_id=${user.id}` : "";

    let res;
    try {
        res = await apiRequest(`/api/courses/${id}${part}`);
    } catch {
        document.getElementById("course-empty").textContent = "Ошибка загрузки";
        return;
    }

    const course = res.course;
    const lessons = res.lessons || [];

    document.getElementById("course-thumb").src =
        course.thumbnail || "https://via.placeholder.com/640x360?text=Course";

    document.getElementById("course-title").textContent = course.title;
    document.getElementById("course-short").textContent = course.description || "";

    document.getElementById("course-price").textContent =
        formatPrice(course.price);

    const isBought = course.is_purchased;

    const list = document.getElementById("lesson-list-body");
    const lock = document.getElementById("course-lock-warning");
    list.innerHTML = "";

    if (isBought) {
        lock.style.display = "none";
        lessons.forEach((ls, i) => {
            const row = document.createElement("div");
            row.className = "lesson-item";
            row.innerHTML = `
                <span>${i + 1}. ${ls.title}</span>
                <a href="${ls.video_url}" target="_blank" class="btn btn-ghost" style="padding:4px 8px;font-size:12px;">Видео</a>
            `;
            list.append(row);
        });
    } else {
        lock.style.display = "block";
    }

    const addBtn = document.getElementById("course-add-cart-btn");
    const goBtn = document.getElementById("course-go-cart-btn");

    if (isBought) {
        addBtn.disabled = true;
        addBtn.textContent = "Уже куплено";
    } else {
        addBtn.onclick = () => addToCart(course.id);
    }

    goBtn.onclick = () => window.location.href = "cart.html";
}

// ================================
// CART PAGE
// ================================
async function initCart() {
    initUserPill();
    const user = await requireUser();

    const itemsEl = document.getElementById("cart-items");
    const empty = document.getElementById("cart-empty");

    let res;
    try {
        res = await apiRequest(`/api/cart?user_id=${user.id}`);
    } catch {
        empty.style.display = "block";
        return;
    }

    const items = res.items;
    if (!items.length) {
        empty.style.display = "block";
        return;
    }

    itemsEl.innerHTML = "";

    let total = 0;

    items.forEach(it => {
        total += it.price;

        const row = document.createElement("div");
        row.className = "cart-item";

        row.innerHTML = `
            <img src="${it.thumbnail}" class="cart-item-thumb">
            <div class="cart-item-title">${it.title}</div>
            <div class="cart-item-price">
                ${formatPrice(it.price)}<br>
                <button class="btn btn-ghost" style="margin-top:6px;" onclick="removeFromCart(${it.course_id})">Удалить</button>
            </div>`;
        itemsEl.append(row);
    });

    document.getElementById("cart-total").textContent = formatPrice(total);
}

async function removeFromCart(courseId) {
    const user = await requireUser();
    await apiRequest("/api/cart/remove", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, course_id: courseId })
    });
    showMessage("Удалено", "info");
    initCart();
}

async function checkoutCart() {
    const user = await requireUser();

    let res;
    try {
        res = await apiRequest(`/api/cart?user_id=${user.id}`);
    } catch { return; }

    const items = res.items;
    if (!items.length) {
        showMessage("Корзина пустая", "error");
        return;
    }

    for (const it of items) {
        try {
            await apiRequest("/api/purchase", {
                method: "POST",
                body: JSON.stringify({
                    user_id: user.id,
                    course_id: it.course_id
                })
            });
        } catch {}
    }

    showMessage("Покупка успешна", "success");
    setTimeout(() => window.location.href = "profile.html", 800);
}

// ================================
// PROFILE PAGE
// ================================
async function initProfile() {
    initUserPill();
    const user = await requireUser();

    document.getElementById("profile-name").textContent = user.name;
    document.getElementById("profile-phone").textContent = user.phone;
    document.getElementById("profile-balance").textContent =
        formatPrice(user.balance);

    const avatar = document.getElementById("profile-avatar");
    const placeholder = document.getElementById("profile-avatar-placeholder");

    if (user.avatar) {
        avatar.src = user.avatar;
        avatar.style.display = "block";
        placeholder.style.display = "none";
    }

    // Мои курсы
    let res;
    try {
        res = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
    } catch {}

    const grid = document.getElementById("profile-courses-grid");
    const empty = document.getElementById("profile-courses-empty");

    if (!res || !res.courses.length) {
        empty.style.display = "block";
        return;
    }

    grid.innerHTML = "";
    const set_ = new Set(res.courses.map(c => c.id));
    res.courses.forEach(c => grid.append(createCourseCard(c, set_)));

    // Пополнение баланса
    const topupForm = document.getElementById("topup-form");
    topupForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(topupForm);
        const amount = Number(fd.get("amount"));

        const r = await apiRequest("/api/balance/topup", {
            method: "POST",
            body: JSON.stringify({ user_id: user.id, amount })
        });

        user.balance = r.balance;
        saveUser(user);

        document.getElementById("profile-balance").textContent =
            formatPrice(user.balance);

        showMessage("Баланс пополнен", "success");
    };

    // Аватар
    const avatarForm = document.getElementById("avatar-form");
    avatarForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(avatarForm);
        const avatar_url = fd.get("avatar_url");

        const r = await apiRequest("/api/profile/avatar", {
            method: "POST",
            body: JSON.stringify({ user_id: user.id, avatar_url })
        });

        user.avatar = r.avatar;
        saveUser(user);

        avatar.src = r.avatar;
        avatar.style.display = "block";
        placeholder.style.display = "none";

        showMessage("Аватар обновлён", "success");
    };
}

// ================================
// LOGIN PAGE
// ================================
function initLogin() {
    initUserPill();

    const form = document.getElementById("login-form");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const phone = fd.get("phone");
        const password = fd.get("password");

        try {
            const r = await apiRequest("/api/login", {
                method: "POST",
                body: JSON.stringify({ phone, password })
            });
            saveUser(r.user);
            showMessage("Вход успешен", "success");
            window.location.href = "profile.html";
        } catch {}
    };
}

// ================================
// REGISTER PAGE
// ================================
function initRegister() {
    initUserPill();

    const form = document.getElementById("register-form");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
            name: fd.get("name"),
            phone: fd.get("phone"),
            password: fd.get("password")
        };

        try {
            const r = await apiRequest("/api/register", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            saveUser(r.user);
            showMessage("Регистрация успешна", "success");
            window.location.href = "profile.html";
        } catch {}
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

    // COURSE CRUD
    const courseForm = document.getElementById("admin-course-form");
    courseForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(courseForm);

        const payload = {
            user_id: user.id,
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
    };

    document.getElementById("admin-course-reset").onclick = () => {
        courseForm.reset();
        courseForm.querySelector("[name=id]").value = "";
    };

    // LESSONS
    const lessonForm = document.getElementById("admin-lesson-form");
    lessonForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(lessonForm);

        const course_id = Number(document.getElementById("admin-lessons-course-id").value);
        if (!course_id) {
            showMessage("Введите ID курса", "error");
            return;
        }

        await apiRequest("/api/admin/lessons/create", {
            method: "POST",
            body: JSON.stringify({
                user_id: user.id,
                course_id: course_id,
                title: fd.get("title"),
                video_url: fd.get("video_url"),
                order_index: Number(fd.get("order_index"))
            })
        });

        showMessage("Урок добавлен", "success");
        adminLoadLessons();
    };
}

// ================================
// ADMIN TABS
// ================================
function initAdminTabs() {
    const buttons = document.querySelectorAll("[data-admin-tab-btn]");
    const tabs = document.querySelectorAll("[data-admin-tab]");

    buttons.forEach(btn => {
        btn.onclick = () => {
            const name = btn.getAttribute("data-admin-tab-btn");

            tabs.forEach(t => {
                if (t.getAttribute("data-admin-tab") === name) t.style.display = "block";
                else t.style.display = "none";
            });
        };
    });
}

// ================================
// ADMIN LOADERS
// ================================
async function loadAdminCourses() {
    const user = getUser();
    const list = document.getElementById("admin-courses-list");
    list.innerHTML = "Загрузка...";

    let r;
    try {
        r = await apiRequest(`/api/admin/courses?user_id=${user.id}`);
    } catch {
        list.innerHTML = "Ошибка";
        return;
    }

    list.innerHTML = "";

    r.courses.forEach(c => {
        const div = document.createElement("div");
        div.className = "admin-item";

        div.innerHTML = `
            <strong>${c.title}</strong><br>
            ${formatPrice(c.price)}<br>
            <button class="btn btn-ghost" onclick="adminEditCourse(${c.id}, '${c.title}', '${c.description}', ${c.price}, '${c.thumbnail}')">Редактировать</button>
            <button class="btn btn-ghost" onclick="adminDeleteCourse(${c.id})">Удалить</button>
        `;

        list.append(div);
    });
}

function adminEditCourse(id, title, description, price, thumb) {
    const form = document.getElementById("admin-course-form");
    form.querySelector("[name=id]").value = id;
    form.querySelector("[name=title]").value = title;
    form.querySelector("[name=description]").value = description;
    form.querySelector("[name=price]").value = price;
    form.querySelector("[name=thumbnail]").value = thumb;
}

async function adminDeleteCourse(id) {
    const user = getUser();
    await apiRequest(`/api/admin/courses/${id}?user_id=${user.id}`, {
        method: "DELETE"
    });
    showMessage("Курс удалён", "info");
    loadAdminCourses();
}

// ================================
// ADMIN: LESSONS
// ================================
async function adminLoadLessons() {
    const user = getUser();
    const courseId = Number(document.getElementById("admin-lessons-course-id").value);
    const list = document.getElementById("admin-lessons-list");

    if (!courseId) {
        showMessage("Введите ID курса", "error");
        return;
    }

    list.innerHTML = "Загрузка...";

    let r;
    try {
        r = await apiRequest(`/api/admin/courses/${courseId}/lessons?user_id=${user.id}`);
    } catch {
        list.innerHTML = "Ошибка";
        return;
    }

    list.innerHTML = "";

    r.lessons.forEach(ls => {
        const div = document.createElement("div");
        div.className = "admin-item";

        div.innerHTML = `
            <strong>${ls.order_index}. ${ls.title}</strong><br>
            <a href="${ls.video_url}" target="_blank">${ls.video_url}</a><br>
            <button class="btn btn-ghost" onclick="adminDeleteLesson(${ls.id})">Удалить</button>
        `;

        list.append(div);
    });
}

async function adminDeleteLesson(id) {
    const user = getUser();
    await apiRequest(`/api/admin/lessons/${id}?user_id=${user.id}`, {
        method: "DELETE"
    });
    showMessage("Урок удалён", "info");
    adminLoadLessons();
}

// ================================
// ADMIN: USERS
// ================================
async function loadAdminUsers() {
    const user = getUser();
    const list = document.getElementById("admin-users-list");
    list.innerHTML = "Загрузка...";

    let r;
    try {
        r = await apiRequest(`/api/admin/users?user_id=${user.id}`);
    } catch {
        list.innerHTML = "Ошибка";
        return;
    }

    list.innerHTML = "";

    r.users.forEach(u => {
        const div = document.createElement("div");
        div.className = "admin-item";

        div.innerHTML = `
            <strong>${u.name}</strong> (${u.phone})<br>
            Баланс: ${formatPrice(u.balance)}<br>
            <button class="btn btn-ghost" onclick="adminSetBalance(${u.id})">Изменить баланс</button>
        `;

        list.append(div);
    });
}

async function adminSetBalance(targetId) {
    const admin = getUser();
    const newBalance = prompt("Новый баланс:");

    if (!newBalance) return;

    await apiRequest("/api/admin/users/update-balance", {
        method: "POST",
        body: JSON.stringify({
            admin_id: admin.id,
            user_id: targetId,
            balance: Number(newBalance)
        })
    });

    showMessage("Баланс обновлён", "success");
    loadAdminUsers();
}

// ================================
// ADMIN: REVIEWS
// ================================
async function loadAdminReviews() {
    const user = getUser();
    const list = document.getElementById("admin-reviews-list");
    list.innerHTML = "Загрузка...";

    let r;
    try {
        r = await apiRequest(`/api/admin/reviews?user_id=${user.id}`);
    } catch {
        list.innerHTML = "Ошибка";
        return;
    }

    list.innerHTML = "";

    r.reviews.forEach(rv => {
        const div = document.createElement("div");
        div.className = "admin-item";

        div.innerHTML = `
            <strong>${rv.user_name}</strong> оставил отзыв<br>
            Курс: ${rv.course_title}<br>
            ★ ${rv.rating}<br>
            "${rv.text}"<br>
            <button class="btn btn-ghost" onclick="adminDeleteReview(${rv.id})">Удалить</button>
        `;

        list.append(div);
    });
}

async function adminDeleteReview(id) {
    const user = getUser();
    await apiRequest(`/api/admin/reviews/${id}?user_id=${user.id}`, {
        method: "DELETE"
    });
    showMessage("Отзыв удалён", "info");
    loadAdminReviews();
}

// ================================
// ROUTER
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.getAttribute("data-page");

    if (page === "index") return initIndex();
    if (page === "catalog") return initCatalog();
    if (page === "course") return initCoursePage();
    if (page === "cart") return initCart();
    if (page === "profile") return initProfile();
    if (page === "login") return initLogin();
    if (page === "register") return initRegister();
    if (page === "admin") return initAdmin();

    initUserPill();
});
