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

function goToAuthOrProfile() {
    const u = getUser();
    if (u) window.location.href = "profile.html";
    else window.location.href = "login.html";
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
    const user = getUser();
    const headers = options.headers || {};
    headers["Content-Type"] = "application/json";
    if (user && user.token) {
        headers["Authorization"] = "Bearer " + user.token;
    }
    options.headers = headers;

    try {
        const res = await fetch(API + path, options);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.status === "error") {
            const msg = data.message || `Ошибка запроса (${res.status})`;
            throw new Error(msg);
        }
        return data;
    } catch (e) {
        console.error("API error:", e);
        showMessage(e.message || "Ошибка соединения с сервером", "error");
        throw e;
    }
}

// ================================
// HEADER USER PILL
// ================================
function initUserPill() {
    const pill = document.getElementById("user-pill");
    const nameEl = document.getElementById("user-pill-name");
    const u = getUser();
    if (!pill || !nameEl) return;
    if (u && u.name) {
        nameEl.textContent = u.name;
        pill.style.display = "flex";
    } else {
        pill.style.display = "none";
    }
}

// ================================
// COMMON HELPERS
// ================================
function formatPrice(p) {
    if (p == null) return "0 ₸";
    return `${p.toLocaleString("ru-RU")} ₸`;
}

// рендер карточки курса (общая функция)
function createCourseCard(course, boughtCoursesIds = new Set()) {
    const card = document.createElement("div");
    card.className = "course-card";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "course-thumb-wrapper";

    const img = document.createElement("img");
    img.className = "course-thumb";
    img.src = course.image_url || "https://via.placeholder.com/640x360?text=Course";
    img.alt = course.title || "Курс";
    thumbWrap.appendChild(img);

    const isBought = boughtCoursesIds.has(course.id) || course.bought;

    const status = document.createElement("div");
    status.className = "course-status-pill " + (isBought ? "status-bought" : "status-locked");
    status.textContent = isBought ? "Курс куплен" : "Нужно купить";
    thumbWrap.appendChild(status);

    const body = document.createElement("div");
    body.className = "course-body";

    const title = document.createElement("div");
    title.className = "course-title";
    title.textContent = course.title || "Без названия";

    const desc = document.createElement("div");
    desc.className = "course-desc";
    desc.textContent = course.short_desc || "Описание курса скоро появится.";

    const metaRow = document.createElement("div");
    metaRow.className = "course-meta-row";

    const lessons = document.createElement("span");
    lessons.textContent = (course.lessons_count || 0) + " урок(ов)";

    const price = document.createElement("span");
    price.className = "course-price";
    price.textContent = formatPrice(course.price || 0);

    metaRow.appendChild(lessons);
    metaRow.appendChild(price);

    const actions = document.createElement("div");
    actions.className = "course-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "btn btn-ghost";
    openBtn.textContent = "Открыть";
    openBtn.onclick = (ev) => {
        ev.stopPropagation();
        window.location.href = `course.html?id=${course.id}`;
    };

    const cartBtn = document.createElement("button");
    cartBtn.className = "btn btn-primary";
    cartBtn.textContent = isBought ? "В корзине не нужен" : "В корзину";
    cartBtn.disabled = isBought;
    if (!isBought) {
        cartBtn.onclick = async (ev) => {
            ev.stopPropagation();
            await addToCart(course.id);
        };
    }

    actions.appendChild(openBtn);
    actions.appendChild(cartBtn);

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(metaRow);
    body.appendChild(actions);

    card.appendChild(thumbWrap);
    card.appendChild(body);

    card.onclick = () => {
        window.location.href = `course.html?id=${course.id}`;
    };

    return card;
}

async function addToCart(courseId) {
    await apiRequest("/api/cart/add", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId })
    });
    showMessage("Курс добавлен в корзину", "success");
}

// ================================
// INDEX PAGE
// ================================
async function initIndex() {
    initUserPill();

    let userCoursesIds = new Set();
    try {
        const me = await apiRequest("/api/me");
        if (me.user && me.user.courses) {
            userCoursesIds = new Set(me.user.courses.map(c => c.id));
        }
        const metricCourses = document.getElementById("metric-courses");
        const metricHours = document.getElementById("metric-hours");
        if (metricCourses && me.stats) {
            metricCourses.textContent = (me.stats.courses_total || 0) + "+";
            metricHours.textContent = (me.stats.hours_total || 0) + "+";
        }
    } catch (e) {
        // гость — просто продолжаем
    }

    let courses = [];
    try {
        const res = await apiRequest("/api/courses");
        courses = res.courses || [];
    } catch (e) {
        // ошибка уже показана тостом
    }

    // топ 3 в правом блоке
    const heroList = document.getElementById("hero-courses");
    if (heroList) {
        heroList.innerHTML = "";
        courses.slice(0, 3).forEach(course => {
            const item = document.createElement("div");
            item.className = "hero-course-item";
            item.onclick = () => window.location.href = `course.html?id=${course.id}`;

            const img = document.createElement("img");
            img.className = "hero-course-thumb";
            img.src = course.image_url || "https://via.placeholder.com/320x180?text=Course";

            const main = document.createElement("div");
            main.className = "hero-course-main";

            const t = document.createElement("div");
            t.className = "hero-course-title";
            t.textContent = course.title || "Курс";

            const meta = document.createElement("div");
            meta.className = "hero-course-meta";
            meta.innerHTML = `<span>${(course.lessons_count || 0)} урок(ов)</span><span>${formatPrice(course.price || 0)}</span>`;

            main.appendChild(t);
            main.appendChild(meta);

            item.appendChild(img);
            item.appendChild(main);

            heroList.appendChild(item);
        });
    }

    // мои курсы
    const myGrid = document.getElementById("home-my-courses");
    const myEmpty = document.getElementById("home-my-empty");
    if (myGrid && myEmpty) {
        myGrid.innerHTML = "";
        const myCourses = courses.filter(c => userCoursesIds.has(c.id));
        if (myCourses.length === 0) {
            myEmpty.style.display = "block";
        } else {
            myEmpty.style.display = "none";
            myCourses.forEach(c => {
                const card = createCourseCard(c, userCoursesIds);
                myGrid.appendChild(card);
            });
        }
    }

    // все курсы
    const allGrid = document.getElementById("home-all-courses");
    if (allGrid) {
        allGrid.innerHTML = "";
        courses.forEach(c => {
            const card = createCourseCard(c, userCoursesIds);
            allGrid.appendChild(card);
        });
    }
}

// ================================
// CATALOG PAGE
// ================================
async function initCatalog() {
    initUserPill();

    let userCoursesIds = new Set();
    try {
        const me = await apiRequest("/api/me");
        if (me.user && me.user.courses) {
            userCoursesIds = new Set(me.user.courses.map(c => c.id));
        }
    } catch (e) {}

    const grid = document.getElementById("catalog-grid");
    const empty = document.getElementById("catalog-empty");
    if (!grid || !empty) return;

    grid.innerHTML = "";
    empty.style.display = "none";

    try {
        const res = await apiRequest("/api/courses");
        const courses = res.courses || [];
        if (courses.length === 0) {
            empty.style.display = "block";
            return;
        }
        courses.forEach(c => {
            const card = createCourseCard(c, userCoursesIds);
            grid.appendChild(card);
        });
    } catch (e) {
        empty.style.display = "block";
    }
}

// ================================
// COURSE PAGE
// ================================
async function initCoursePage() {
    initUserPill();

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const layout = document.getElementById("course-layout");
    const empty = document.getElementById("course-empty");

    if (!id) {
        if (empty) empty.textContent = "ID курса не указан.";
        return;
    }

    let isBought = false;
    let userCoursesIds = new Set();
    try {
        const me = await apiRequest("/api/me");
        if (me.user && me.user.courses) {
            userCoursesIds = new Set(me.user.courses.map(c => c.id));
            isBought = userCoursesIds.has(parseInt(id));
        }
    } catch (e) {}

    try {
        const res = await apiRequest(`/api/courses/${id}`);
        const course = res.course;

        if (!course) throw new Error("Курс не найден");

        if (empty && layout) {
            empty.style.display = "none";
            layout.style.display = "grid";
        }

        document.getElementById("course-thumb").src =
            course.image_url || "https://via.placeholder.com/640x360?text=Course";
        document.getElementById("course-title").textContent = course.title || "Курс";
        document.getElementById("course-short").textContent =
            course.short_desc || "Описание курса появится позже.";
        document.getElementById("course-price").textContent = formatPrice(course.price || 0);
        document.getElementById("course-lessons-meta").textContent =
            (course.lessons_count || (course.lessons ? course.lessons.length : 0)) + " урок(ов)";
        document.getElementById("course-level").textContent = course.level || "Любой уровень";
        document.getElementById("course-tag").textContent = course.tag || "Онлайн-курс";

        const accessLabel = document.getElementById("lesson-access-label");
        const lockWarning = document.getElementById("course-lock-warning");
        const lessonsBody = document.getElementById("lesson-list-body");
        lessonsBody.innerHTML = "";

        const lessons = course.lessons || [];
        lessons.forEach((lsn, i) => {
            const item = document.createElement("div");
            item.className = "lesson-item";

            const left = document.createElement("span");
            left.textContent = `${i + 1}. ${lsn.title || "Урок"}`;

            const right = document.createElement("span");
            if (isBought || course.bought) {
                right.textContent = lsn.duration || "видео";
            } else {
                right.textContent = "закрыто 🔒";
            }

            item.appendChild(left);
            item.appendChild(right);
            lessonsBody.appendChild(item);
        });

        if (isBought || course.bought) {
            if (accessLabel) accessLabel.textContent = "Доступ открыт ✅";
            if (lockWarning) lockWarning.style.display = "none";
        } else {
            if (accessLabel) accessLabel.textContent = "Пока уроки скрыты до покупки";
            if (lockWarning) lockWarning.style.display = "block";
        }

        const addBtn = document.getElementById("course-add-cart-btn");
        const goCartBtn = document.getElementById("course-go-cart-btn");

        if (isBought || course.bought) {
            addBtn.disabled = true;
            addBtn.textContent = "Курс уже куплен";
        } else {
            addBtn.onclick = async () => {
                await addToCart(course.id);
            };
        }
        goCartBtn.onclick = () => window.location.href = "cart.html";
    } catch (e) {
        if (empty) empty.textContent = e.message || "Ошибка загрузки курса";
    }
}

// ================================
// CART PAGE
// ================================
async function initCart() {
    initUserPill();

    const itemsEl = document.getElementById("cart-items");
    const empty = document.getElementById("cart-empty");
    const totalEl = document.getElementById("cart-total");
    const countEl = document.getElementById("cart-count");

    if (!itemsEl || !empty) return;

    itemsEl.innerHTML = "";
    empty.style.display = "none";

    try {
        const res = await apiRequest("/api/cart");
        const items = res.items || [];
        if (items.length === 0) {
            empty.style.display = "block";
        } else {
            items.forEach(it => {
                const c = it.course || {};
                const row = document.createElement("div");
                row.className = "cart-item";

                const img = document.createElement("img");
                img.className = "cart-item-thumb";
                img.src = c.image_url || "https://via.placeholder.com/320x180?text=Course";

                const center = document.createElement("div");
                const title = document.createElement("div");
                title.className = "cart-item-title";
                title.textContent = c.title || "Курс";

                const meta = document.createElement("div");
                meta.className = "cart-item-meta";
                meta.textContent = c.short_desc || "";

                center.appendChild(title);
                center.appendChild(meta);

                const right = document.createElement("div");
                right.className = "cart-item-price";
                right.innerHTML = `
                    ${formatPrice(c.price || 0)}<br>
                    <button class="btn btn-ghost" style="margin-top:6px;font-size:11px;padding:5px 9px;"
                        onclick="removeFromCart(${c.id})">Удалить</button>
                `;

                row.appendChild(img);
                row.appendChild(center);
                row.appendChild(right);

                itemsEl.appendChild(row);
            });
        }

        if (countEl) countEl.textContent = items.length;
        if (totalEl) totalEl.textContent = formatPrice(res.total || 0);
    } catch (e) {
        empty.style.display = "block";
    }
}

async function removeFromCart(courseId) {
    await apiRequest("/api/cart/remove", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId })
    });
    showMessage("Курс удалён из корзины", "info");
    initCart();
}

async function checkoutCart() {
    try {
        await apiRequest("/api/cart/checkout", { method: "POST" });
        showMessage("Покупка успешно завершена", "success");
        setTimeout(() => {
            window.location.href = "profile.html";
        }, 1000);
    } catch (e) {
        // ошибка уже показана
    }
}

// ================================
// PROFILE PAGE
// ================================
async function initProfile() {
    initUserPill();

    const nameEl = document.getElementById("profile-name");
    const phoneEl = document.getElementById("profile-phone");
    const balanceEl = document.getElementById("profile-balance");
    const grid = document.getElementById("profile-courses-grid");
    const empty = document.getElementById("profile-courses-empty");

    try {
        const me = await apiRequest("/api/me");
        const user = me.user;

        if (nameEl) nameEl.textContent = user.name || "";
        if (phoneEl) phoneEl.textContent = user.phone || "";
        if (balanceEl) balanceEl.textContent = formatPrice(user.balance || 0);

        if (grid && empty) {
            grid.innerHTML = "";
            const courses = user.courses || [];
            if (courses.length === 0) {
                empty.style.display = "block";
            } else {
                empty.style.display = "none";
                const ids = new Set(courses.map(c => c.id));
                courses.forEach(c => {
                    const card = createCourseCard(c, ids);
                    grid.appendChild(card);
                });
            }
        }
    } catch (e) {
        showMessage("Нужно войти в аккаунт", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 800);
    }
}

// ================================
// AUTH PAGES
// ================================
function initLogin() {
    initUserPill();
    const form = document.getElementById("login-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const phone = fd.get("phone");
        const password = fd.get("password");
        try {
            const res = await apiRequest("/api/login", {
                method: "POST",
                body: JSON.stringify({ phone, password })
            });
            if (res.user) {
                saveUser(res.user);
            }
            showMessage("Успешный вход", "success");
            window.location.href = "profile.html";
        } catch (e) {}
    });
}

function initRegister() {
    initUserPill();
    const form = document.getElementById("register-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
            name: fd.get("name"),
            phone: fd.get("phone"),
            password: fd.get("password")
        };
        try {
            const res = await apiRequest("/api/register", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (res.user) saveUser(res.user);
            showMessage("Регистрация успешна", "success");
            window.location.href = "profile.html";
        } catch (e) {}
    });
}

// ================================
// ADMIN PAGE
// ================================
async function initAdmin() {
    initUserPill();

    const list = document.getElementById("admin-courses");
    const form = document.getElementById("admin-course-form");
    if (!list || !form) return;

    async function loadCourses() {
        list.innerHTML = "";
        try {
            const res = await apiRequest("/api/admin/courses");
            const courses = res.courses || [];
            courses.forEach(c => {
                const item = document.createElement("div");
                item.className = "admin-item";
                item.innerHTML = `
                    <strong>${c.id}. ${c.title}</strong><br>
                    ${formatPrice(c.price || 0)}
                `;
                list.appendChild(item);
            });
        } catch (e) {
            list.innerHTML = "Ошибка загрузки курсов";
        }
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
            title: fd.get("title"),
            short_desc: fd.get("short_desc"),
            price: Number(fd.get("price")),
            image_url: fd.get("image_url") || null
        };
        try {
            await apiRequest("/api/admin/courses/create", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            showMessage("Курс сохранён", "success");
            form.reset();
            loadCourses();
        } catch (e2) {}
    });

    loadCourses();
}

// ================================
// PAGE ROUTER
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.getAttribute("data-page");
    switch (page) {
        case "index":
            initIndex();
            break;
        case "catalog":
            initCatalog();
            break;
        case "course":
            initCoursePage();
            break;
        case "cart":
            initCart();
            break;
        case "profile":
            initProfile();
            break;
        case "login":
            initLogin();
            break;
        case "register":
            initRegister();
            break;
        case "admin":
            initAdmin();
            break;
        default:
            initUserPill();
    }
});
