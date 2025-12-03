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
    window.location.href = "login.html";
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
            throw new Error(data.message || "Ошибка запроса");
        }
        return data;
    } catch (e) {
        showMessage(e.message, "error");
        throw e;
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
        showMessage("Войдите в аккаунт", "error");
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
        const nameEl = document.getElementById("user-pill-name");
        if (nameEl) nameEl.textContent = user.name;
        pill.style.display = "flex";
    } else {
        pill.style.display = "none";
    }
}

// ================================
// COURSE CARD
// ================================
function createCourseCard(course, purchasedSet = new Set()) {
    const card = document.createElement("div");
    card.className = "course-card";

    card.innerHTML = `
        <div class="course-thumb-wrap">
            <img src="${course.thumbnail || "https://via.placeholder.com/400x225?text=Course"}" class="course-thumb">
        </div>
        <div class="course-body">
            <div class="course-title">${course.title}</div>
            <div class="course-desc">${course.description || ""}</div>
            <div class="course-meta">
                <span>★ ${course.avg_rating || 0} • ${course.ratings_count || 0} отзывов</span>
                <span class="course-price">${formatPrice(course.price)}</span>
            </div>
            <button class="btn course-buy-btn"></button>
        </div>
    `;

    const btn = card.querySelector(".course-buy-btn");

    if (course.is_purchased || purchasedSet.has(course.id)) {
        btn.textContent = "Куплено";
        btn.disabled = true;
        card.classList.add("course-owned");
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
// INDEX
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
    const grid = document.getElementById("home-all-courses");
    if (!grid) return;

    grid.innerHTML = "";
    res.courses.forEach(c => grid.append(createCourseCard(c, purchased)));
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
    const grid = document.getElementById("catalog-grid");
    if (!grid) return;

    grid.innerHTML = "";
    res.courses.forEach(c => grid.append(createCourseCard(c, purchased)));
}

// ================================
// COURSE PAGE
// ================================
async function initCoursePage() {
    initUserPill();

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;

    const user = getUser();
    const res = await apiRequest(
        user ? `/api/courses/${id}?user_id=${user.id}` : `/api/courses/${id}`
    );

    const course = res.course;
    const lessons = res.lessons || [];

    document.getElementById("course-thumb").src =
        course.thumbnail || "https://via.placeholder.com/400x225?text=Course";

    document.getElementById("course-title").textContent = course.title;
    document.getElementById("course-short").textContent = course.description || "";
    document.getElementById("course-price").textContent = formatPrice(course.price);

    const lock = document.getElementById("course-lock-warning");
    const lessonList = document.getElementById("lesson-list-body");
    lessonList.innerHTML = "";

    if (!course.is_purchased) {
        if (lock) lock.style.display = "block";
    } else {
        if (lock) lock.style.display = "none";
        lessons.forEach((ls, idx) => {
            const row = document.createElement("div");
            row.className = "lesson-item";
            row.innerHTML = `
                <span>${idx + 1}. ${ls.title}</span>
                <a class="btn btn-ghost" href="${ls.video_url}" target="_blank">Смотреть</a>
            `;
            lessonList.append(row);
        });
    }

    const btnAddCart = document.getElementById("course-add-cart-btn");
    if (btnAddCart) {
        btnAddCart.onclick = () => addToCart(course.id);
    }
}

// ================================
// CART
// ================================
async function addToCart(courseId) {
    const user = await requireUser();
    await apiRequest("/api/cart/add", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, course_id: courseId })
    });
    showMessage("Добавлено в корзину", "success");
}

async function initCart() {
    initUserPill();

    const user = await requireUser();
    const res = await apiRequest(`/api/cart?user_id=${user.id}`);

    const items = res.items;
    const list = document.getElementById("cart-items");
    const empty = document.getElementById("cart-empty");
    const totalEl = document.getElementById("cart-total");

    if (!items.length) {
        if (empty) empty.style.display = "block";
        if (list) list.innerHTML = "";
        if (totalEl) totalEl.textContent = formatPrice(0);
        return;
    }

    if (empty) empty.style.display = "none";
    list.innerHTML = "";

    let total = 0;
    items.forEach(i => {
        total += i.price;
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <img src="${i.thumbnail || "https://via.placeholder.com/200x112"}" class="cart-item-thumb">
            <div class="cart-item-title">${i.title}</div>
            <div class="cart-item-price">
                ${formatPrice(i.price)}<br>
                <button class="btn btn-ghost" onclick="removeFromCart(${i.course_id})">Удалить</button>
            </div>
        `;
        list.append(row);
    });

    if (totalEl) totalEl.textContent = formatPrice(total);
}

async function removeFromCart(courseId) {
    const user = await requireUser();
    await apiRequest("/api/cart/remove", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, course_id: courseId })
    });
    initCart();
}

async function checkoutCart() {
    const user = await requireUser();
    const res = await apiRequest(`/api/cart?user_id=${user.id}`);
    for (const it of res.items) {
        await apiRequest("/api/purchase", {
            method: "POST",
            body: JSON.stringify({ user_id: user.id, course_id: it.course_id })
        });
    }
    showMessage("Покупка успешно завершена!", "success");
    window.location.href = "profile.html";
}

// ================================
// PROFILE
// ================================
async function initProfile() {
    initUserPill();

    const user = await requireUser();

    const nameEl = document.getElementById("profile-name");
    const phoneEl = document.getElementById("profile-phone");
    const balanceEl = document.getElementById("profile-balance");
    const avatarEl = document.getElementById("profile-avatar");

    if (nameEl) nameEl.textContent = user.name;
    if (phoneEl) phoneEl.textContent = user.phone;
    if (balanceEl) balanceEl.textContent = formatPrice(user.balance);

    if (avatarEl) {
        if (user.avatar) {
            avatarEl.src = user.avatar;
            avatarEl.style.display = "block";
        } else {
            avatarEl.style.display = "none";
        }
    }

    // Мои курсы
    const res = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
    const courses = res.courses;
    const grid = document.getElementById("profile-courses-grid");
    const empty = document.getElementById("profile-courses-empty");

    if (grid) {
        grid.innerHTML = "";
        if (!courses.length) {
            if (empty) empty.style.display = "block";
        } else {
            if (empty) empty.style.display = "none";
            const set = new Set(courses.map(c => c.id));
            courses.forEach(c => grid.append(createCourseCard(c, set)));
        }
    }

    // Пополнение баланса (без реальной оплаты)
    const topupForm = document.getElementById("topup-form");
    if (topupForm) {
        topupForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(topupForm);
            const amount = Number(fd.get("amount") || "0");
            if (!amount || amount <= 0) {
                return showMessage("Введите сумму", "error");
            }
            const r = await apiRequest("/api/balance/topup", {
                method: "POST",
                body: JSON.stringify({ user_id: user.id, amount })
            });
            user.balance = r.balance;
            saveUser(user);
            if (balanceEl) balanceEl.textContent = formatPrice(user.balance);
            showMessage("Баланс пополнен", "success");
            topupForm.reset();
        };
    }

    // Аватарка: загрузка файла
    const avatarForm = document.getElementById("avatar-form");
    if (avatarForm) {
        avatarForm.onsubmit = async (e) => {
            e.preventDefault();
            const fileInput = avatarForm.querySelector("input[name=file]");
            if (!fileInput || !fileInput.files.length) {
                return showMessage("Выберите файл", "error");
            }
            const fd = new FormData();
            fd.append("file", fileInput.files[0]);

            // отдельный запрос без apiRequest (multipart/form-data)
            const resUpload = await fetch(API + "/api/upload", {
                method: "POST",
                body: fd
            });
            const data = await resUpload.json().catch(() => ({}));
            if (!resUpload.ok || data.status !== "ok") {
                return showMessage("Ошибка загрузки файла", "error");
            }

            const r = await apiRequest("/api/profile/avatar", {
                method: "POST",
                body: JSON.stringify({
                    user_id: user.id,
                    avatar_url: data.url
                })
            });

            user.avatar = r.avatar;
            saveUser(user);

            if (avatarEl) {
                avatarEl.src = r.avatar;
                avatarEl.style.display = "block";
            }

            showMessage("Аватар обновлён", "success");
            avatarForm.reset();
        };
    }
}

// ================================
// LOGIN
// ================================
function initLogin() {
    initUserPill();

    const form = document.getElementById("login-form");
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        let phone = fd.get("phone") || "";
        const password = fd.get("password") || "";

        // убираем '+' если пользователь вводит с ним
        phone = String(phone).replace("+", "").trim();

        const r = await apiRequest("/api/login", {
            method: "POST",
            body: JSON.stringify({ phone, password })
        });

        saveUser(r.user);
        showMessage("Вход успешен!", "success");

        // если это админ (номер 77750476284 с паролем 777) — в админку
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

    const form = document.getElementById("register-form");
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);

        const payload = {
            name: fd.get("name"),
            phone: String(fd.get("phone") || "").replace("+", "").trim(),
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
// ADMIN
// ================================
async function initAdmin() {
    initUserPill();

    const user = await requireUser();

    // только is_admin = true (наш 77750476284/777)
    if (!user.is_admin) {
        showMessage("Доступ в админ-панель запрещён", "error");
        window.location.href = "index.html";
        return;
    }

    initAdminTabs();
    loadAdminCourses();
    loadAdminUsers();
    loadAdminReviews();

    const courseForm = document.getElementById("admin-course-form");
    const resetBtn = document.getElementById("admin-course-reset");

    if (courseForm) {
        courseForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(courseForm);

            const payload = {
                id: fd.get("id") || null,
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

            courseForm.reset();
            courseForm.querySelector("[name=id]").value = "";
            loadAdminCourses();
        };
    }

    if (resetBtn && courseForm) {
        resetBtn.onclick = () => {
            courseForm.reset();
            courseForm.querySelector("[name=id]").value = "";
        };
    }

    // Уроки
    const lessonForm = document.getElementById("admin-lesson-form");
    if (lessonForm) {
        lessonForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(lessonForm);
            const courseIdInput = document.getElementById("admin-lessons-course-id");
            const course_id = Number(courseIdInput.value || "0");
            if (!course_id) {
                return showMessage("Введите ID курса", "error");
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

            showMessage("Урок добавлен", "success");
            adminLoadLessons();
            lessonForm.reset();
        };
    }
}

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

// ---- ADMIN: COURSES ----
async function loadAdminCourses() {
    const res = await apiRequest("/api/admin/courses");
    const list = document.getElementById("admin-courses-list");
    if (!list) return;

    list.innerHTML = "";
    res.courses.forEach(c => {
        const div = document.createElement("div");
        div.className = "admin-item";
        div.innerHTML = `
            <strong>${c.title}</strong><br>
            ${formatPrice(c.price)}<br><br>
            <button class="btn" onclick="adminEditCourse(${c.id}, '${escapeQuotes(c.title)}', '${escapeQuotes(c.description || "")}', ${c.price}, '${escapeQuotes(c.thumbnail || "")}')">Редактировать</button>
            <button class="btn btn-danger" onclick="adminDeleteCourse(${c.id})">Удалить</button>
        `;
        list.append(div);
    });
}

function escapeQuotes(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function adminEditCourse(id, title, description, price, thumbnail) {
    const f = document.getElementById("admin-course-form");
    if (!f) return;
    f.querySelector("[name=id]").value = id;
    f.querySelector("[name=title]").value = title;
    f.querySelector("[name=description]").value = description;
    f.querySelector("[name=price]").value = price;
    f.querySelector("[name=thumbnail]").value = thumbnail;
}

async function adminDeleteCourse(id) {
    if (!confirm("Удалить курс?")) return;
    await apiRequest(`/api/admin/courses/${id}`, { method: "DELETE" });
    showMessage("Курс удалён", "info");
    loadAdminCourses();
}

// ---- ADMIN: LESSONS ----
async function adminLoadLessons() {
    const cid = document.getElementById("admin-lessons-course-id").value;
    if (!cid) {
        return showMessage("Введите ID курса", "error");
    }
    const res = await apiRequest(`/api/admin/courses/${cid}/lessons`);
    const list = document.getElementById("admin-lessons-list");
    if (!list) return;

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
    if (!confirm("Удалить урок?")) return;
    await apiRequest(`/api/admin/lessons/${id}`, { method: "DELETE" });
    showMessage("Урок удалён", "info");
    adminLoadLessons();
}

// ---- ADMIN: USERS ----
async function loadAdminUsers() {
    const res = await apiRequest("/api/admin/users");
    const list = document.getElementById("admin-users-list");
    if (!list) return;

    list.innerHTML = "";
    res.users.forEach(u => {
        const div = document.createElement("div");
        div.className = "admin-item";
        div.innerHTML = `
            <strong>${u.name}</strong> (${u.phone})<br>
            Баланс: ${formatPrice(u.balance)}<br>
            Админ: ${u.is_admin ? "да" : "нет"}<br><br>
            <button class="btn" onclick="adminSetBalance(${u.id})">Изменить баланс</button>
        `;
        list.append(div);
    });
}

async function adminSetBalance(userId) {
    const value = prompt("Введите новый баланс:");
    if (!value) return;
    await apiRequest("/api/admin/users/update-balance", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, balance: Number(value) })
    });
    showMessage("Баланс обновлён", "success");
    loadAdminUsers();
}

// ---- ADMIN: REVIEWS ----
async function loadAdminReviews() {
    const res = await apiRequest("/api/admin/reviews");
    const list = document.getElementById("admin-reviews-list");
    if (!list) return;

    list.innerHTML = "";
    res.reviews.forEach(rv => {
        const div = document.createElement("div");
        div.className = "admin-item";
        div.innerHTML = `
            <strong>${rv.user_name}</strong> • Курс: ${rv.course_title}<br>
            ★ ${rv.rating}<br>
            "${rv.text}"<br><br>
            <button class="btn btn-danger" onclick="adminDeleteReview(${rv.id})">Удалить</button>
        `;
        list.append(div);
    });
}

async function adminDeleteReview(id) {
    if (!confirm("Удалить отзыв?")) return;
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
