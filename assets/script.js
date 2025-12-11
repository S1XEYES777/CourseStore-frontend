// ============================================================
//  CONFIG
// ============================================================
const API = "https://coursestore-backend.onrender.com"; // <-- Поставь свой backend URL

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
//  SAFE FETCH (avoids non-JSON crash)
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
//  NAVBAR INIT
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
//  GET URL PARAM
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

        // === COURSE BOUGHT ===
        if (user && my.includes(course.id)) {
            if (course.lessons.length > 0) {
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

        // === NOT BOUGHT (HIDE LESSONS) ===
        lessonsEl.innerHTML = "<li>Купите курс, чтобы открыть уроки</li>";

        const btn = document.createElement("button");
        btn.className = "btn-primary";
        btn.textContent = "Добавить в корзину";

        btn.onclick = async () => {
            if (!user) {
                window.location.href = "login.html";
                return;
            }

            try {
                await apiFetch(`${API}/api/cart/add`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id, course_id: course.id })
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
    if (!user) return (window.location.href = "login.html");

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
                await apiFetch(`${API}/api/cart/remove`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id, course_id: c.id })
                });
                initCartPage();
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

    // LOAD MY COURSES
    const { courses } = await apiFetch(`${API}/api/my-courses/${user.id}`);

    myCoursesEl.innerHTML = "";
    if (courses.length === 0) {
        myCoursesEl.innerHTML = "<p>Нет купленных курсов</p>";
    }

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

    // TOPUP BALANCE
    document.querySelector("#topupBtn").onclick = async () => {
        const amount = parseInt(document.querySelector("#topupAmount").value);
        if (!amount) return showMessage("Введите сумму", "error");

        const res = await apiFetch(`${API}/api/balance/topup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, amount })
        });

        saveUser(res.user);
        balanceEl.textContent = res.user.balance + " ₸";
        showMessage("Баланс пополнен!", "success");
    };

    // UPLOAD AVATAR
    document.querySelector("#avatarBtn").onclick = async () => {
        const file = document.querySelector("#avatarInput").files[0];
        if (!file) return showMessage("Выберите файл", "error");

        const formData = new FormData();
        formData.append("avatar", file);

        const res = await apiFetch(`${API}/api/upload_avatar/${user.id}`, {
            method: "POST",
            body: formData
        });

        saveUser(res.user);
        avatarEl.src = `${API}/uploads/avatars/${res.user.avatar}`;
        showMessage("Аватар обновлён", "success");
    };
}

// ============================================================
//  LOGIN PAGE
// ============================================================
function initLoginPage() {
    initNavbar();

    const form = document.querySelector("#loginForm");

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

            if (data.user.is_admin) window.location.href = "admin.html";
            else window.location.href = "index.html";

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

    form.onsubmit = async (e) => {
        e.preventDefault();

        const phone = form.phone.value.trim();
        const name = form.name.value.trim();
        const password = form.password.value.trim();

        try {
            const data = await apiFetch(`${API}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, password, name })
            });

            saveUser(data.user);

            if (data.user.is_admin) window.location.href = "admin.html";
            else window.location.href = "index.html";

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

    async function refreshCourses() {
        const { courses } = await apiFetch(`${API}/api/courses`);

        courseSelect.innerHTML = "";
        adminCoursesList.innerHTML = "";

        courses.forEach(c => {
            let opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = `${c.id} — ${c.title}`;
            courseSelect.appendChild(opt);

            let card = document.createElement("div");
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
    }

    // ADD COURSE
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

    // ADD LESSON (VIDEO)
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

    // LOAD INITIAL DATA
    refreshCourses();
}

// ============================================================
//  PAGE ROUTER
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
        default: initNavbar(); break;
    }
});
