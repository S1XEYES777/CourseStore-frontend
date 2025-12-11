// ============================================================
//  CONFIG
// ============================================================
const API = "https://coursestore-backend.onrender.com"; // <-- сюда твой backend URL

// ============================================================
//  LOCAL STORAGE USER
// ============================================================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    let u = localStorage.getItem("user");
    if (!u) return null;
    try { return JSON.parse(u); }
    catch { return null; }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ============================================================
//  TOAST MESSAGES
// ============================================================
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

// ============================================================
//  SAFE FETCH
// ============================================================
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};

    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("NOT JSON:", text);
        throw new Error("Ошибка сервера");
    }

    if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Ошибка запроса");
    }

    return data;
}

// ============================================================
//  NAVBAR
// ============================================================
function initNavbar() {
    const user = getUser();
    const userInfo = document.querySelector(".nav-user-info");
    if (!userInfo) return;

    if (user) {
        userInfo.innerHTML = `
            <span>Баланс: ${user.balance} ₸</span>
            <button class="btn-outline" onclick="logout()">Выйти</button>
        `;
    } else {
        userInfo.innerHTML = `<a href="login.html" class="btn-primary">Войти</a>`;
    }
}

// ============================================================
//  INDEX PAGE
// ============================================================
async function initIndexPage() {
    initNavbar();
    const container = document.querySelector(".course-grid");
    if (!container) return;

    try {
        const data = await apiFetch(`${API}/api/courses`);
        const user = getUser();
        const my = user?.my_courses || [];

        container.innerHTML = "";

        data.courses.forEach(c => {
            const bought = my.includes(c.id);
            const card = document.createElement("div");
            card.className = "course-card" + (bought ? " bought" : "");

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

            card.querySelector("button").onclick = () => {
                window.location.href = `course.html?id=${c.id}`;
            };

            container.appendChild(card);
        });
    } catch (e) {
        showMessage(e.message, "error");
    }
}

// ============================================================
//  URL PARAM
// ============================================================
function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
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

        // --- если курс куплен ---
        if (user && my.includes(course.id)) {
            if (course.lessons && course.lessons.length) {
                course.lessons.forEach(l => {
                    const li = document.createElement("li");
                    li.style.marginBottom = "24px";
                    li.style.padding = "12px";
                    li.style.background = "white";
                    li.style.borderRadius = "14px";
                    li.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";

                    let video = "";
                    if (l.video) {
                        video = `
                            <video 
                                controls 
                                width="100%" 
                                style="margin-top:12px; border-radius:12px; background:#000;">
                                <source src="${API}/videos/${l.video}" type="video/mp4">
                            </video>
                        `;
                    }

                    li.innerHTML = `
                        <h3 style="margin:0 0 8px;">${l.title}</h3>
                        ${video}
                    `;
                    lessonsEl.appendChild(li);
                });
            } else {
                lessonsEl.innerHTML = "<li>Уроки пока отсутствуют</li>";
            }

            actionEl.innerHTML = `<span class="badge badge-success">Курс куплен ✔</span>`;
            return;
        }

        // --- если курс не куплен ---
        lessonsEl.innerHTML = "<li>Купите курс, чтобы открыть уроки</li>";

        const btn = document.createElement("button");
        btn.className = "btn-primary";
        btn.textContent = "Добавить в корзину";

        btn.onclick = async () => {
            const u = getUser();
            if (!u) {
                window.location.href = "login.html";
                return;
            }
            try {
                await apiFetch(`${API}/api/cart/add`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: u.id, course_id: course.id })
                });
                showMessage("Добавлено в корзину", "success");
            } catch (e) {
                showMessage(e.message, "error");
            }
        };

        actionEl.innerHTML = "";
        actionEl.appendChild(btn);

    } catch (e) {
        showMessage(e.message, "error");
    }
}

// ============================================================
//  CART PAGE
// ============================================================
async function initCartPage() {
    initNavbar();

    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const list = document.querySelector(".cart-list");
    const totalEl = document.querySelector(".cart-total-amount");
    const buyBtn = document.querySelector(".cart-buy-btn");

    try {
        const { cart } = await apiFetch(`${API}/api/cart/${user.id}`);
        list.innerHTML = "";
        let total = 0;

        cart.forEach(c => {
            total += c.price;

            const row = document.createElement("div");
            row.className = "cart-item";

            const img = c.image
                ? `${API}/uploads/course_images/${c.image}`
                : "assets/placeholder.png";

            row.innerHTML = `
                <img src="${img}">
                <div class="cart-info">
                    <h3>${c.title}</h3>
                    <p>${c.description}</p>
                    <span class="price">${c.price} ₸</span>
                </div>
                <button class="btn-outline remove-btn">Удалить</button>
            `;

            row.querySelector(".remove-btn").onclick = async () => {
                try {
                    await apiFetch(`${API}/api/cart/remove`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ user_id: user.id, course_id: c.id })
                    });
                    initCartPage();
                } catch (e) {
                    showMessage(e.message, "error");
                }
            };

            list.appendChild(row);
        });

        totalEl.textContent = total;

        buyBtn.onclick = async () => {
            try {
                const res = await apiFetch(`${API}/api/purchase`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id })
                });
                saveUser(res.user);
                showMessage("Покупка успешна!", "success");
                initCartPage();
            } catch (e) {
                showMessage(e.message, "error");
            }
        };
    } catch (e) {
        showMessage(e.message, "error");
    }
}

// ============================================================
//  PROFILE PAGE
// ============================================================
async function initProfilePage() {
    initNavbar();

    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

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

    // Мои курсы
    try {
        const { courses } = await apiFetch(`${API}/api/my-courses/${user.id}`);
        myCoursesEl.innerHTML = "";

        if (!courses.length) {
            myCoursesEl.innerHTML = "<p>Нет купленных курсов</p>";
        } else {
            courses.forEach(c => {
                const div = document.createElement("div");
                div.className = "course-card mini";

                const img = c.image
                    ? `${API}/uploads/course_images/${c.image}`
                    : "assets/placeholder.png";

                div.innerHTML = `
                    <img src="${img}">
                    <div class="course-body">
                        <h4>${c.title}</h4>
                        <button class="btn-outline">Открыть</button>
                    </div>
                `;
                div.querySelector("button").onclick = () => {
                    window.location.href = `course.html?id=${c.id}`;
                };
                myCoursesEl.appendChild(div);
            });
        }
    } catch (e) {
        showMessage(e.message, "error");
    }

    // Пополнение баланса
    const topupBtn = document.querySelector("#topupBtn");
    const topupInput = document.querySelector("#topupAmount");
    topupBtn.onclick = async () => {
        const amount = parseInt(topupInput.value);
        if (!amount || amount <= 0) {
            showMessage("Введите сумму", "error");
            return;
        }
        try {
            const res = await apiFetch(`${API}/api/balance/topup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.id, amount })
            });
            saveUser(res.user);
            balanceEl.textContent = res.user.balance + " ₸";
            topupInput.value = "";
            showMessage("Баланс пополнен!", "success");
        } catch (e) {
            showMessage(e.message, "error");
        }
    };

    // Загрузка аватара
    const avatarBtn = document.querySelector("#avatarBtn");
    const avatarInput = document.querySelector("#avatarInput");
    avatarBtn.onclick = async () => {
        const file = avatarInput.files[0];
        if (!file) {
            showMessage("Выберите файл", "error");
            return;
        }
        const formData = new FormData();
        formData.append("avatar", file);

        try {
            const res = await apiFetch(`${API}/api/upload_avatar/${user.id}`, {
                method: "POST",
                body: formData
            });
            saveUser(res.user);
            avatarEl.src = `${API}/uploads/avatars/${res.user.avatar}`;
            showMessage("Аватар обновлён", "success");
        } catch (e) {
            showMessage(e.message, "error");
        }
    };
}

// ============================================================
//  LOGIN PAGE
// ============================================================
function initLoginPage() {
    initNavbar();

    const form = document.querySelector("#loginForm");
    if (!form) return;

    form.onsubmit = async (e) => {
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
        } catch (e) {
            showMessage(e.message, "error");
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

    form.onsubmit = async (e) => {
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
        } catch (e) {
            showMessage(e.message, "error");
        }
    };
}

// ============================================================
//  ADMIN PAGE
// ============================================================
function initAdminPage() {
    initNavbar();

    const user = getUser();
    if (!user || !user.is_admin) {
        window.location.href = "login.html";
        return;
    }

    const courseForm = document.querySelector("#courseForm");
    const lessonForm = document.querySelector("#lessonForm");
    const courseSelect = document.querySelector("#lessonCourseSelect");
    const adminCoursesList = document.querySelector(".admin-courses");

    const statUsersEl = document.querySelector("#statUsers");
    const statRevenueEl = document.querySelector("#statRevenue");

    const deleteCourseIdInput = document.querySelector("#deleteCourseId");
    const deleteCourseBtn = document.querySelector("#deleteCourseBtn");

    const deleteLessonCourseIdInput = document.querySelector("#deleteLessonCourseId");
    const deleteLessonIdInput = document.querySelector("#deleteLessonId");
    const deleteLessonBtn = document.querySelector("#deleteLessonBtn");

    const loadUsersBtn = document.querySelector("#loadUsersBtn");
    const usersList = document.querySelector("#usersList");
    const deleteUserIdInput = document.querySelector("#deleteUserId");
    const deleteUserBtn = document.querySelector("#deleteUserBtn");

    // --- Загрузка аналитики ---
    async function loadStats() {
        try {
            const data = await apiFetch(`${API}/api/admin/stats?admin_id=${user.id}`);
            statUsersEl.textContent = data.users;
            statRevenueEl.textContent = data.revenue + " ₸";
        } catch (e) {
            showMessage(e.message, "error");
        }
    }

    // --- Загрузка курсов в админке ---
    async function refreshCourses() {
        try {
            const data = await apiFetch(`${API}/api/courses`);
            courseSelect.innerHTML = "";
            adminCoursesList.innerHTML = "";

            data.courses.forEach(c => {
                // select для уроков
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.textContent = `${c.id} — ${c.title}`;
                courseSelect.appendChild(opt);

                // карточка
                const card = document.createElement("div");
                card.className = "course-card mini";

                const img = c.image
                    ? `${API}/uploads/course_images/${c.image}`
                    : "assets/placeholder.png";

                card.innerHTML = `
                    <img src="${img}">
                    <div class="course-body">
                        <h4>${c.title}</h4>
                        <p>${c.description}</p>
                        <span>${c.price} ₸</span>
                    </div>
                `;

                adminCoursesList.appendChild(card);
            });
        } catch (e) {
            showMessage(e.message, "error");
        }
    }

    // --- Добавление курса ---
    courseForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(courseForm);
        formData.append("admin_id", user.id);

        try {
            await apiFetch(`${API}/api/admin/add_course`, {
                method: "POST",
                body: formData
            });
            showMessage("Курс добавлен!", "success");
            courseForm.reset();
            refreshCourses();
        } catch (e) {
            showMessage(e.message, "error");
        }
    };

    // --- Добавление урока ---
    lessonForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(lessonForm);
        formData.append("admin_id", user.id);

        try {
            await apiFetch(`${API}/api/admin/add_lesson`, {
                method: "POST",
                body: formData
            });
            showMessage("Урок добавлен!", "success");
            lessonForm.reset();
        } catch (e) {
            showMessage(e.message, "error");
        }
    };

    // --- Удаление курса ---
    deleteCourseBtn.onclick = async () => {
        const id = deleteCourseIdInput.value;
        if (!id) {
            showMessage("Введите ID курса", "error");
            return;
        }
        const form = new FormData();
        form.append("admin_id", user.id);
        form.append("course_id", id);

        try {
            await apiFetch(`${API}/api/admin/delete_course`, {
                method: "POST",
                body: form
            });
            showMessage("Курс удалён", "success");
            deleteCourseIdInput.value = "";
            refreshCourses();
        } catch (e) {
            showMessage(e.message, "error");
        }
    };

    // --- Удаление урока ---
    deleteLessonBtn.onclick = async () => {
        const courseId = deleteLessonCourseIdInput.value;
        const lessonId = deleteLessonIdInput.value;
        if (!courseId || !lessonId) {
            showMessage("Введите ID курса и ID урока", "error");
            return;
        }
        const form = new FormData();
        form.append("admin_id", user.id);
        form.append("course_id", courseId);
        form.append("lesson_id", lessonId);

        try {
            await apiFetch(`${API}/api/admin/delete_lesson`, {
                method: "POST",
                body: form
            });
            showMessage("Урок удалён", "success");
            deleteLessonCourseIdInput.value = "";
            deleteLessonIdInput.value = "";
        } catch (e) {
            showMessage(e.message, "error");
        }
    };

    // --- Загрузка пользователей ---
    loadUsersBtn.onclick = async () => {
        try {
            const data = await apiFetch(`${API}/api/admin/users?admin_id=${user.id}`);
            usersList.innerHTML = "";

            data.users.forEach(u => {
                const div = document.createElement("div");
                div.className = "course-card mini";
                div.innerHTML = `
                    <div class="course-body">
                        <h4>${u.name || "Без имени"} (ID: ${u.id})</h4>
                        <p>Телефон: ${u.phone}</p>
                        <p>Баланс: ${u.balance} ₸</p>
                        <p>Куплено курсов: ${u.courses}</p>
                    </div>
                `;
                usersList.appendChild(div);
            });
        } catch (e) {
            showMessage(e.message, "error");
        }
    };

    // --- Удаление пользователя ---
    deleteUserBtn.onclick = async () => {
        const uid = deleteUserIdInput.value;
        if (!uid) {
            showMessage("Введите ID пользователя", "error");
            return;
        }

        const form = new FormData();
        form.append("admin_id", user.id);
        form.append("user_id", uid);

        try {
            await apiFetch(`${API}/api/admin/delete_user`, {
                method: "POST",
                body: form
            });
            showMessage("Пользователь удалён", "success");
            deleteUserIdInput.value = "";
        } catch (e) {
            showMessage(e.message, "error");
        }
    };

    // Запускаем начальные загрузки
    refreshCourses();
    loadStats();
}

// ============================================================
//  ROUTER
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    switch (page) {
        case "index":    initIndexPage();    break;
        case "course":   initCoursePage();   break;
        case "cart":     initCartPage();     break;
        case "profile":  initProfilePage();  break;
        case "login":    initLoginPage();    break;
        case "register": initRegisterPage(); break;
        case "admin":    initAdminPage();    break;
        default:         initNavbar();       break;
    }
});
