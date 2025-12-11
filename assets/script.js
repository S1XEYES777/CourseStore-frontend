// ============================================================
//  CONFIG
// ============================================================
const API = "https://coursestore-backend.onrender.com";

// ============================================================
//  LOCAL STORAGE USER
// ============================================================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ============================================================
//  TOAST
// ============================================================
function showMessage(text, type = "info") {
    let box = document.querySelector(".toast-container");

    if (!box) {
        box = document.createElement("div");
        box.className = "toast-container";
        document.body.appendChild(box);
    }

    const msg = document.createElement("div");
    msg.className = `toast ${type}`;
    msg.innerText = text;

    box.appendChild(msg);

    setTimeout(() => msg.remove(), 3000);
}

// ============================================================
//  SAFE FETCH
// ============================================================
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        console.error("NOT JSON:", text);
        throw new Error("Ошибка сервера");
    }

    if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Ошибка запроса");
    }

    return data;
}

// ============================================================
//  NAVBAR INIT
// ============================================================
function initNavbar() {
    const user = getUser();
    const block = document.querySelector(".nav-user-info");
    if (!block) return;

    if (!user) {
        block.innerHTML = `<a href="login.html" class="btn-primary">Войти</a>`;
    } else {
        block.innerHTML = `
            <span>Баланс: ${user.balance} ₸</span>
            <button class="btn-outline" onclick="logout()">Выйти</button>
        `;
    }
}

// ============================================================
//  INDEX PAGE
// ============================================================
async function initIndexPage() {
    initNavbar();

    const grid = document.querySelector(".course-grid");
    if (!grid) return;

    try {
        const { courses } = await apiFetch(`${API}/api/courses`);
        const user = getUser();
        const my = user?.my_courses || [];

        grid.innerHTML = "";

        courses.forEach(c => {
            const card = document.createElement("div");
            card.className = "course-card" + (my.includes(c.id) ? " bought" : "");

            const img = c.image
                ? `${API}/uploads/course_images/${c.image}`
                : "assets/placeholder.png";

            card.innerHTML = `
                <img src="${img}">
                <div class="course-body">
                    <h3>${c.title}</h3>
                    <p>${c.description}</p>
                    <div class="course-meta">
                        <span class="price">${c.price} ₸</span>
                        <button class="btn-primary">Открыть</button>
                    </div>
                </div>
            `;

            card.querySelector("button").onclick = () =>
                (window.location.href = `course.html?id=${c.id}`);

            grid.appendChild(card);
        });
    } catch (e) {
        showMessage(e.message, "error");
    }
}

// ============================================================
//  PARAM
// ============================================================
function getParam(name) {
    return new URL(window.location.href).searchParams.get(name);
}

// ============================================================
//  COURSE PAGE
// ============================================================
async function initCoursePage() {
    initNavbar();

    const id = parseInt(getParam("id") || "0");
    if (!id) return;

    const titleEl = document.querySelector(".course-title");
    const imgEl = document.querySelector(".course-image");
    const descEl = document.querySelector(".course-description");
    const priceEl = document.querySelector(".course-price");
    const lessonsEl = document.querySelector(".lessons-list");
    const actionEl = document.querySelector(".course-action");

    try {
        const { course } = await apiFetch(`${API}/api/course/${id}`);
        const user = getUser();
        const my = user?.my_courses || [];

        titleEl.textContent = course.title;
        descEl.textContent = course.description;
        priceEl.textContent = course.price + " ₸";

        imgEl.src = course.image
            ? `${API}/uploads/course_images/${course.image}`
            : "assets/placeholder.png";

        lessonsEl.innerHTML = "";

        // Куплен — показываем уроки
        if (user && my.includes(course.id)) {
            if (course.lessons.length === 0) {
                lessonsEl.innerHTML = "<p>Уроков нет</p>";
            } else {
                course.lessons.forEach(l => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <h3>${l.title}</h3>
                        <video controls width="100%" style="margin-top:12px; border-radius:12px;">
                            <source src="${API}/videos/${l.video}" type="video/mp4">
                        </video>
                    `;
                    lessonsEl.appendChild(li);
                });
            }

            actionEl.innerHTML = `<span class="badge badge-success">Курс куплен ✔</span>`;
            return;
        }

        // Не куплен — прячем уроки
        lessonsEl.innerHTML = "<p>Купите курс, чтобы открыть уроки</p>";

        const btn = document.createElement("button");
        btn.className = "btn-primary";
        btn.textContent = "Добавить в корзину";

        btn.onclick = async () => {
            if (!user) return (window.location.href = "login.html");

            try {
                await apiFetch(`${API}/api/cart/add`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id, course_id: id }),
                });

                showMessage("Добавлено в корзину", "success");
            } catch (e) {
                showMessage(e.message, "error");
            }
        };

        actionEl.innerHTML = "";
        actionEl.appendChild(btn);
    } catch {
        showMessage("Ошибка загрузки курса", "error");
    }
}

// ============================================================
//  CART PAGE
// ============================================================
async function initCartPage() {
    initNavbar();

    const user = getUser();
    if (!user) return (window.location.href = "login.html");

    const list = document.querySelector(".cart-list");
    const totalEl = document.querySelector(".cart-total-amount");
    const buyBtn = document.querySelector(".cart-buy-btn");

    try {
        const { cart } = await apiFetch(`${API}/api/cart/${user.id}`);

        let total = 0;
        list.innerHTML = "";

        cart.forEach(c => {
            total += c.price;

            const item = document.createElement("div");
            item.className = "cart-item";
            const img = c.image
                ? `${API}/uploads/course_images/${c.image}`
                : "assets/placeholder.png";

            item.innerHTML = `
                <img src="${img}">
                <div class="cart-info">
                    <h3>${c.title}</h3>
                    <p>${c.description}</p>
                    <span class="price">${c.price} ₸</span>
                </div>
                <button class="btn-outline remove-btn">Удалить</button>
            `;

            item.querySelector(".remove-btn").onclick = async () => {
                await apiFetch(`${API}/api/cart/remove`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id, course_id: c.id }),
                });
                initCartPage();
            };

            list.appendChild(item);
        });

        totalEl.textContent = total;

        buyBtn.onclick = async () => {
            try {
                const data = await apiFetch(`${API}/api/purchase`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id }),
                });

                saveUser(data.user);
                showMessage("Покупка завершена!", "success");
                initCartPage();
            } catch (e) {
                showMessage(e.message, "error");
            }
        };
    } catch {
        showMessage("Ошибка корзины", "error");
    }
}

// ============================================================
//  PROFILE PAGE
// ============================================================
async function initProfilePage() {
    initNavbar();

    const user = getUser();
    if (!user) return (window.location.href = "login.html");

    const nameEl = document.querySelector(".profile-name");
    const phoneEl = document.querySelector(".profile-phone");
    const balanceEl = document.querySelector(".profile-balance");
    const avatarEl = document.querySelector(".profile-avatar");
    const myCoursesEl = document.querySelector(".my-courses");

    nameEl.textContent = user.name;
    phoneEl.textContent = user.phone;
    balanceEl.textContent = user.balance + " ₸";

    avatarEl.src = user.avatar
        ? `${API}/uploads/avatars/${user.avatar}`
        : "assets/avatar-placeholder.png";

    // Курсы
    const { courses } = await apiFetch(`${API}/api/my-courses/${user.id}`);
    myCoursesEl.innerHTML = "";

    courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card mini";

        const img = c.image
            ? `${API}/uploads/course_images/${c.image}`
            : "assets/placeholder.png";

        card.innerHTML = `
            <img src="${img}">
            <div class="course-body">
                <h4>${c.title}</h4>
                <button class="btn-outline">Открыть</button>
            </div>
        `;

        card.querySelector("button").onclick = () =>
            (window.location.href = `course.html?id=${c.id}`);

        myCoursesEl.appendChild(card);
    });

    // Пополнение
    const amountInput = document.querySelector("#topupAmount");
    const btn = document.querySelector("#topupBtn");

    btn.onclick = async () => {
        const amount = parseInt(amountInput.value);
        if (!amount || amount <= 0) {
            showMessage("Введите корректную сумму", "error");
            return;
        }

        const data = await apiFetch(`${API}/api/balance/topup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, amount }),
        });

        saveUser(data.user);
        balanceEl.textContent = data.user.balance + " ₸";

        amountInput.value = "";
        showMessage("Баланс пополнен!", "success");
    };

    // Аватар
    const fileInput = document.querySelector("#avatarInput");
    const uploadBtn = document.querySelector("#avatarBtn");

    uploadBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) return showMessage("Выберите файл", "error");

        const fd = new FormData();
        fd.append("avatar", file);

        const res = await apiFetch(`${API}/api/upload_avatar/${user.id}`, {
            method: "POST",
            body: fd,
        });

        saveUser(res.user);

        avatarEl.src = `${API}/uploads/avatars/${res.user.avatar}`;
        showMessage("Аватар обновлён!", "success");
    };
}

// ============================================================
//  ADMIN PAGE (обновлённый с кнопками удаления)
// ============================================================
function initAdminPage() {
    initNavbar();

    const user = getUser();
    if (!user || !user.is_admin) return (window.location.href = "login.html");

    const courseForm = document.querySelector("#courseForm");
    const lessonForm = document.querySelector("#lessonForm");
    const lessonCourseSelect = document.querySelector("#lessonCourseSelect");
    const coursesList = document.querySelector("#coursesList");

    const statUsersEl = document.querySelector("#statUsers");
    const statRevenueEl = document.querySelector("#statRevenue");

    const loadUsersBtn = document.querySelector("#loadUsersBtn");
    const usersList = document.querySelector("#usersList");

    // === Загрузить курсы ===
    async function loadCourses() {
        const { courses } = await apiFetch(`${API}/api/courses`);

        lessonCourseSelect.innerHTML = "";
        coursesList.innerHTML = "";

        courses.forEach(c => {
            // ----- SELECT -----
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = `${c.id} — ${c.title}`;
            lessonCourseSelect.appendChild(opt);

            // ----- CARD -----
            const block = document.createElement("div");
            block.className = "course-item";

            const img = c.image
                ? `${API}/uploads/course_images/${c.image}`
                : "assets/placeholder.png";

            block.innerHTML = `
                <div class="course-header">
                    <h3>${c.title}</h3>
                    <button class="btn-danger btn-del-course" data-id="${c.id}">Удалить курс</button>
                </div>

                <p>${c.description}</p>
                <img src="${img}" style="width:100%; border-radius:12px; margin: 12px 0;">

                <h4>Уроки:</h4>
                <div class="lessons"></div>
            `;

            const lessonsBlock = block.querySelector(".lessons");

            // Уроки
            c.lessons.forEach(l => {
                const row = document.createElement("div");
                row.className = "lesson-item";

                row.innerHTML = `
                    <span>${l.id}. ${l.title}</span>
                    <button class="btn-danger btn-del-lesson"
                        data-course="${c.id}"
                        data-lesson="${l.id}">
                        Удалить
                    </button>
                `;

                lessonsBlock.appendChild(row);
            });

            coursesList.appendChild(block);
        });

        initDeleteButtons();
    }

    // === Кнопки удаления курсов и уроков ===
    function initDeleteButtons() {
        document.querySelectorAll(".btn-del-course").forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;

                const fd = new FormData();
                fd.append("admin_id", user.id);
                fd.append("course_id", id);

                await apiFetch(`${API}/api/admin/delete_course`, {
                    method: "POST",
                    body: fd,
                });

                showMessage("Курс удалён!", "success");
                loadCourses();
            };
        });

        document.querySelectorAll(".btn-del-lesson").forEach(btn => {
            btn.onclick = async () => {
                const courseId = btn.dataset.course;
                const lessonId = btn.dataset.lesson;

                const fd = new FormData();
                fd.append("admin_id", user.id);
                fd.append("course_id", courseId);
                fd.append("lesson_id", lessonId);

                await apiFetch(`${API}/api/admin/delete_lesson`, {
                    method: "POST",
                    body: fd,
                });

                showMessage("Урок удалён!", "success");
                loadCourses();
            };
        });
    }

    // === Добавление курса ===
    courseForm.onsubmit = async e => {
        e.preventDefault();

        const fd = new FormData(courseForm);
        fd.append("admin_id", user.id);

        await apiFetch(`${API}/api/admin/add_course`, {
            method: "POST",
            body: fd,
        });

        showMessage("Курс добавлен!", "success");
        courseForm.reset();
        loadCourses();
    };

    // === Добавление урока ===
    lessonForm.onsubmit = async e => {
        e.preventDefault();

        const fd = new FormData(lessonForm);
        fd.append("admin_id", user.id);

        await apiFetch(`${API}/api/admin/add_lesson`, {
            method: "POST",
            body: fd,
        });

        showMessage("Урок добавлен!", "success");
        lessonForm.reset();
        loadCourses();
    };

    // === Аналитика ===
    async function loadStats() {
        const stats = await apiFetch(`${API}/api/admin/stats?admin_id=${user.id}`);
        statUsersEl.textContent = stats.users;
        statRevenueEl.textContent = stats.revenue + " ₸";
    }

    // === Пользователи ===
    loadUsersBtn.onclick = async () => {
        const data = await apiFetch(`${API}/api/admin/users?admin_id=${user.id}`);

        usersList.innerHTML = "";

        data.users.forEach(u => {
            const div = document.createElement("div");
            div.className = "course-card mini";

            div.innerHTML = `
                <div class="course-body">
                    <h4>${u.name} (ID: ${u.id})</h4>
                    <p>Телефон: ${u.phone}</p>
                    <p>Баланс: ${u.balance}</p>
                    <p>Курсов куплено: ${u.courses}</p>
                </div>
            `;

            usersList.appendChild(div);
        });
    };

    // Первичная загрузка
    loadCourses();
    loadStats();
}

// ============================================================
//  ROUTER
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    switch (page) {
        case "index": initIndexPage(); break;
        case "course": initCoursePage(); break;
        case "cart": initCartPage(); break;
        case "profile": initProfilePage(); break;
        case "login": initLoginPage(); break;
        case "register": initRegisterPage(); break;
        case "admin": initAdminPage(); break;
        default: initNavbar();
    }
});
// ============================================================
//  LOGIN PAGE
// ============================================================
function initLoginPage() {
    initNavbar();

    const form = document.querySelector("#loginForm");
    if (!form) return;

    form.onsubmit = async e => {
        e.preventDefault();

        const phone = form.phone.value.trim();
        const password = form.password.value.trim();

        try {
            const data = await apiFetch(`${API}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, password })
            });

            saveUser(data.user);

            if (data.user.is_admin) {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }

        } catch (err) {
            showMessage(err.message, "error");
        }
    };
}

// ============================================================
//  REGISTER PAGE
// ============================================================
function initRegisterPage() {
    initNavbar();

    const form = document.querySelector("#registerForm");
    if (!form) return;

    form.onsubmit = async e => {
        e.preventDefault();

        const name = form.name.value.trim();
        const phone = form.phone.value.trim();
        const password = form.password.value.trim();

        try {
            const data = await apiFetch(`${API}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone, password })
            });

            saveUser(data.user);

            if (data.user.is_admin) {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }

        } catch (err) {
            showMessage(err.message, "error");
        }
    };
}
