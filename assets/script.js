// ================================
// CONFIG
// ================================
const API = "https://coursestore-backend.onrender.com"; // твой backend

// ================================
// USER LOCAL STORAGE
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
    setTimeout(() => t.remove(), 3000);
}

// ================================
// FETCH HELPER
// ================================
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("Не JSON ответ:", text);
        throw new Error("Ошибка сервера");
    }
    if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Ошибка запроса");
    }
    return data;
}

// ================================
// ОБЩИЙ ХЕДЕР
// ================================
function initNavbar() {
    const user = getUser();
    const userInfo = document.querySelector(".nav-user-info");
    if (userInfo) {
        if (user) {
            userInfo.innerHTML = `
                <span>Баланс: ${user.balance} ₸</span>
                <button class="btn-outline" onclick="logout()">Выйти</button>
            `;
        } else {
            userInfo.innerHTML = `<a href="login.html" class="btn-primary">Вход</a>`;
        }
    }
}

// ================================
// INDEX (главная)
// ================================
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

            const imgUrl = c.image ? `${API}/uploads/course_images/${c.image}` : "assets/placeholder.png";

            card.innerHTML = `
                <img src="${imgUrl}" alt="${c.title}">
                <div class="course-body">
                    <h3>${c.title}</h3>
                    <p>${c.description}</p>
                    <div class="course-meta">
                        <span class="price">${c.price} ₸</span>
                        <button class="btn-primary view-btn">Открыть</button>
                    </div>
                </div>
            `;

            card.querySelector(".view-btn").addEventListener("click", () => {
                window.location.href = `course.html?id=${c.id}`;
            });

            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        showMessage(e.message, "error");
    }
}

// ================================
// COURSE PAGE
// ================================
function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

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

        if (titleEl) titleEl.textContent = course.title;
        if (descEl) descEl.textContent = course.description;
        if (priceEl) priceEl.textContent = course.price + " ₸";
        if (imgEl) {
            imgEl.src = course.image
                ? `${API}/uploads/course_images/${course.image}`
                : "assets/placeholder.png";
        }

        lessonsEl.innerHTML = "";

        if (user && my.includes(course.id)) {
            // курс куплен — показываем уроки
            if (course.lessons && course.lessons.length) {
                course.lessons.forEach(l => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <strong>${l.title}</strong>
                        ${l.video_url ? `<br><a href="${l.video_url}" target="_blank">Смотреть видео</a>` : ""}
                    `;
                    lessonsEl.appendChild(li);
                });
            } else {
                lessonsEl.innerHTML = "<li>Уроки пока не добавлены</li>";
            }
            if (actionEl) actionEl.innerHTML = `<span class="badge badge-success">Курс куплен ✔</span>`;
        } else {
            // курс не куплен — уроки скрываем
            lessonsEl.innerHTML = "<li>Купите курс, чтобы открыть уроки</li>";
            if (actionEl) {
                const btn = document.createElement("button");
                btn.className = "btn-primary";
                btn.textContent = "Добавить в корзину";
                btn.addEventListener("click", async () => {
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
                        showMessage("Курс добавлен в корзину", "success");
                    } catch (e) {
                        showMessage(e.message, "error");
                    }
                });
                actionEl.innerHTML = "";
                actionEl.appendChild(btn);
            }
        }
    } catch (e) {
        console.error(e);
        showMessage(e.message, "error");
    }
}

// ================================
// CART PAGE
// ================================
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

            const imgUrl = c.image ? `${API}/uploads/course_images/${c.image}` : "assets/placeholder.png";

            row.innerHTML = `
                <img src="${imgUrl}" alt="${c.title}">
                <div class="cart-info">
                    <h3>${c.title}</h3>
                    <p>${c.description}</p>
                    <span class="price">${c.price} ₸</span>
                </div>
                <button class="btn-outline remove-btn">Удалить</button>
            `;

            row.querySelector(".remove-btn").addEventListener("click", async () => {
                try {
                    await apiFetch(`${API}/api/cart/remove`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ user_id: user.id, course_id: c.id })
                    });
                    showMessage("Курс удалён из корзины", "success");
                    initCartPage();
                } catch (e) {
                    showMessage(e.message, "error");
                }
            });

            list.appendChild(row);
        });

        if (totalEl) totalEl.textContent = total + " ₸";

        if (buyBtn) {
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
        }
    } catch (e) {
        console.error(e);
        showMessage(e.message, "error");
    }
}

// ================================
// PROFILE PAGE
// ================================
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

    if (nameEl) nameEl.textContent = user.name;
    if (phoneEl) phoneEl.textContent = user.phone;
    if (balanceEl) balanceEl.textContent = user.balance + " ₸";
    if (avatarEl) {
        avatarEl.src = user.avatar
            ? `${API}/uploads/avatars/${user.avatar}`
            : "assets/avatar-placeholder.png";
    }

    // мои курсы
    try {
        const { courses } = await apiFetch(`${API}/api/my-courses/${user.id}`);
        myCoursesEl.innerHTML = "";
        if (!courses.length) {
            myCoursesEl.innerHTML = "<p>Пока нет купленных курсов</p>";
        } else {
            courses.forEach(c => {
                const div = document.createElement("div");
                div.className = "course-card mini";

                const imgUrl = c.image ? `${API}/uploads/course_images/${c.image}` : "assets/placeholder.png";

                div.innerHTML = `
                    <img src="${imgUrl}" alt="${c.title}">
                    <div class="course-body">
                        <h4>${c.title}</h4>
                        <button class="btn-outline">Открыть</button>
                    </div>
                `;
                div.querySelector("button").addEventListener("click", () => {
                    window.location.href = `course.html?id=${c.id}`;
                });
                myCoursesEl.appendChild(div);
            });
        }
    } catch (e) {
        console.error(e);
        showMessage(e.message, "error");
    }

    // пополнение
    const topupInput = document.querySelector("#topupAmount");
    const topupBtn = document.querySelector("#topupBtn");
    if (topupBtn) {
        topupBtn.onclick = async () => {
            const amount = parseInt(topupInput.value || "0");
            if (!amount || amount <= 0) {
                showMessage("Введите сумму", "error");
                return;
            }
            try {
                const data = await apiFetch(`${API}/api/balance/topup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id, amount })
                });
                saveUser(data.user);
                balanceEl.textContent = data.user.balance + " ₸";
                showMessage("Баланс пополнен", "success");
                topupInput.value = "";
            } catch (e) {
                showMessage(e.message, "error");
            }
        };
    }

    // загрузка аватарки
    const avatarInput = document.querySelector("#avatarInput");
    const avatarBtn = document.querySelector("#avatarBtn");
    if (avatarBtn && avatarInput) {
        avatarBtn.onclick = async () => {
            const file = avatarInput.files[0];
            if (!file) {
                showMessage("Выберите файл", "error");
                return;
            }
            const formData = new FormData();
            formData.append("avatar", file);
            try {
                const data = await apiFetch(`${API}/api/upload_avatar/${user.id}`, {
                    method: "POST",
                    body: formData
                });
                saveUser(data.user);
                avatarEl.src = `${API}/uploads/avatars/${data.user.avatar}`;
                showMessage("Аватар обновлен", "success");
            } catch (e) {
                showMessage(e.message, "error");
            }
        };
    }
}

// ================================
// LOGIN / REGISTER
// ================================
function initLoginPage() {
    initNavbar();
    const form = document.querySelector("#loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
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
    });
}

function initRegisterPage() {
    initNavbar();
    const form = document.querySelector("#registerForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const phone = form.phone.value.trim();
        const password = form.password.value.trim();
        const name = form.name.value.trim();

        try {
            const data = await apiFetch(`${API}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, password, name })
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
    });
}

// ================================
// ADMIN PAGE
// ================================
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

    async function refreshCourses() {
        try {
            const data = await apiFetch(`${API}/api/courses`);
            courseSelect.innerHTML = "";
            adminCoursesList.innerHTML = "";

            data.courses.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.textContent = `${c.id} — ${c.title}`;
                courseSelect.appendChild(opt);

                const div = document.createElement("div");
                div.className = "course-card mini";
                const imgUrl = c.image ? `${API}/uploads/course_images/${c.image}` : "assets/placeholder.png";

                div.innerHTML = `
                    <img src="${imgUrl}" alt="${c.title}">
                    <div class="course-body">
                        <h4>${c.title}</h4>
                        <p>${c.description}</p>
                        <span>${c.price} ₸</span>
                    </div>
                `;
                adminCoursesList.appendChild(div);
            });
        } catch (e) {
            console.error(e);
            showMessage(e.message, "error");
        }
    }

    if (courseForm) {
        courseForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(courseForm);
            formData.append("admin_id", user.id);
            try {
                await apiFetch(`${API}/api/admin/add_course`, {
                    method: "POST",
                    body: formData
                });
                showMessage("Курс добавлен", "success");
                courseForm.reset();
                refreshCourses();
            } catch (e) {
                showMessage(e.message, "error");
            }
        });
    }

    if (lessonForm) {
        lessonForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(lessonForm);
            formData.append("admin_id", user.id);
            try {
                await apiFetch(`${API}/api/admin/add_lesson`, {
                    method: "POST",
                    body: formData
                });
                showMessage("Урок добавлен", "success");
                lessonForm.reset();
            } catch (e) {
                showMessage(e.message, "error");
            }
        });
    }

    refreshCourses();
}

// ================================
// ИНИЦИАЛИЗАЦИЯ СТРАНИЦ
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    switch (page) {
        case "index":   initIndexPage(); break;
        case "course":  initCoursePage(); break;
        case "cart":    initCartPage(); break;
        case "profile": initProfilePage(); break;
        case "login":   initLoginPage(); break;
        case "register":initRegisterPage(); break;
        case "admin":   initAdminPage(); break;
        default:        initNavbar(); break;
    }
});
