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
    const headers = options.headers || {};
    // backend не использует токены, но заголовок не мешает
    if (!options.method || options.method === "GET") {
        // GET
    } else {
        headers["Content-Type"] = "application/json";
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
    return `${Number(p).toLocaleString("ru-RU")} ₸`;
}

// общая функция карточки курса
function createCourseCard(course, purchasedIds = new Set()) {
    const card = document.createElement("div");
    card.className = "course-card";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "course-thumb-wrapper";

    const img = document.createElement("img");
    img.className = "course-thumb";
    img.src = course.thumbnail || course.image_url || "https://via.placeholder.com/640x360?text=Course";
    img.alt = course.title || "Курс";
    thumbWrap.appendChild(img);

    const isBought = course.is_purchased || purchasedIds.has(course.id);

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
    desc.textContent = course.description || course.short_desc || "Описание курса скоро появится.";

    const metaRow = document.createElement("div");
    metaRow.className = "course-meta-row";

    const rating = document.createElement("span");
    if (course.avg_rating && course.ratings_count != null) {
        rating.textContent = `★ ${course.avg_rating} • ${course.ratings_count} отзыв(ов)`;
    } else {
        rating.textContent = "Рейтинг пока нет";
    }

    const price = document.createElement("span");
    price.className = "course-price";
    price.textContent = formatPrice(course.price || 0);

    metaRow.appendChild(rating);
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
    if (isBought) {
        cartBtn.textContent = "Курс куплен";
        cartBtn.disabled = true;
    } else {
        cartBtn.textContent = "В корзину";
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

async function requireUser() {
    const u = getUser();
    if (!u) {
        showMessage("Нужно войти в аккаунт", "error");
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
    showMessage("Курс добавлен в корзину", "success");
}

// ================================
// INDEX PAGE
// ================================
async function initIndex() {
    initUserPill();

    const user = getUser();
    let purchasedIds = new Set();

    // Мои курсы
    if (user) {
        try {
            const my = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
            const courses = my.courses || [];
            purchasedIds = new Set(courses.map(c => c.id));

            const myGrid = document.getElementById("home-my-courses");
            const myEmpty = document.getElementById("home-my-empty");
            if (myGrid && myEmpty) {
                myGrid.innerHTML = "";
                if (courses.length === 0) {
                    myEmpty.style.display = "block";
                } else {
                    myEmpty.style.display = "none";
                    courses.forEach(c => {
                        const card = createCourseCard(c, purchasedIds);
                        myGrid.appendChild(card);
                    });
                }
            }
        } catch (e) {
            // уже показали тост, просто считаем как гость
        }
    } else {
        const myEmpty = document.getElementById("home-my-empty");
        if (myEmpty) myEmpty.style.display = "block";
    }

    // Все курсы
    let courses = [];
    try {
        const res = await apiRequest(user ? `/api/courses?user_id=${user.id}` : "/api/courses");
        courses = res.courses || [];
    } catch (e) {
        // ошибка уже показана
    }

    // метрики
    const metricCourses = document.getElementById("metric-courses");
    const metricHours = document.getElementById("metric-hours");
    if (metricCourses) metricCourses.textContent = (courses.length || 0) + "+";
    if (metricHours) metricHours.textContent = (courses.length * 5 || 0) + "+";

    // топ-3 справа
    const heroList = document.getElementById("hero-courses");
    if (heroList) {
        heroList.innerHTML = "";
        courses.slice(0, 3).forEach(course => {
            const item = document.createElement("div");
            item.className = "hero-course-item";
            item.onclick = () => window.location.href = `course.html?id=${course.id}`;

            const img = document.createElement("img");
            img.className = "hero-course-thumb";
            img.src = course.thumbnail || "https://via.placeholder.com/320x180?text=Course";

            const main = document.createElement("div");
            main.className = "hero-course-main";

            const t = document.createElement("div");
            t.className = "hero-course-title";
            t.textContent = course.title || "Курс";

            const meta = document.createElement("div");
            meta.className = "hero-course-meta";
            meta.innerHTML = `<span>${formatPrice(course.price || 0)}</span><span>★ ${course.avg_rating || 0}</span>`;

            main.appendChild(t);
            main.appendChild(meta);

            item.appendChild(img);
            item.appendChild(main);

            heroList.appendChild(item);
        });
    }

    // сетка всех курсов
    const allGrid = document.getElementById("home-all-courses");
    if (allGrid) {
        allGrid.innerHTML = "";
        courses.forEach(c => {
            const card = createCourseCard(c, purchasedIds);
            allGrid.appendChild(card);
        });
    }
}

// ================================
// CATALOG PAGE
// ================================
async function initCatalog() {
    initUserPill();
    const user = getUser();

    let purchasedIds = new Set();
    if (user) {
        try {
            const my = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
            const courses = my.courses || [];
            purchasedIds = new Set(courses.map(c => c.id));
        } catch (e) {}
    }

    const grid = document.getElementById("catalog-grid");
    const empty = document.getElementById("catalog-empty");
    if (!grid || !empty) return;

    grid.innerHTML = "";
    empty.style.display = "none";

    try {
        const res = await apiRequest(user ? `/api/courses?user_id=${user.id}` : "/api/courses");
        const courses = res.courses || [];
        if (courses.length === 0) {
            empty.style.display = "block";
            return;
        }
        courses.forEach(c => {
            const card = createCourseCard(c, purchasedIds);
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

    const user = getUser();
    const userIdPart = user ? `?user_id=${user.id}` : "";

    try {
        const res = await apiRequest(`/api/courses/${id}${userIdPart}`);
        const course = res.course;
        const lessons = res.lessons || [];

        if (!course) throw new Error("Курс не найден");

        if (empty && layout) {
            empty.style.display = "none";
            layout.style.display = "grid";
        }

        document.getElementById("course-thumb").src =
            course.thumbnail || "https://via.placeholder.com/640x360?text=Course";
        document.getElementById("course-title").textContent = course.title || "Курс";
        document.getElementById("course-short").textContent =
            course.description || "Описание курса появится позже.";
        document.getElementById("course-price").textContent = formatPrice(course.price || 0);

        const lessonsMeta = document.getElementById("course-lessons-meta");
        if (lessonsMeta) lessonsMeta.textContent = `${lessons.length} урок(ов)`;

        const levelEl = document.getElementById("course-level");
        const tagEl = document.getElementById("course-tag");
        if (levelEl) levelEl.textContent = "Уровень: любой";
        if (tagEl) tagEl.textContent = "Онлайн-курс";

        const accessLabel = document.getElementById("lesson-access-label");
        const lockWarning = document.getElementById("course-lock-warning");
        const lessonsBody = document.getElementById("lesson-list-body");
        lessonsBody.innerHTML = "";

        const isBought = course.is_purchased === true;

        if (lessons.length > 0 && isBought) {
            if (accessLabel) accessLabel.textContent = "Доступ открыт ✅";
            if (lockWarning) lockWarning.style.display = "none";
            lessons.forEach((lsn, i) => {
                const item = document.createElement("div");
                item.className = "lesson-item";

                const left = document.createElement("span");
                left.textContent = `${i + 1}. ${lsn.title || "Урок"}`;

                const right = document.createElement("span");
                right.textContent = lsn.video_url ? "видео" : "";

                item.appendChild(left);
                item.appendChild(right);
                lessonsBody.appendChild(item);
            });
        } else {
            if (accessLabel) accessLabel.textContent = "Уроки скрыты до покупки";
            if (lockWarning) lockWarning.style.display = "block";
        }

        const addBtn = document.getElementById("course-add-cart-btn");
        const goCartBtn = document.getElementById("course-go-cart-btn");

        if (isBought) {
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
    const user = await requireUser();

    const itemsEl = document.getElementById("cart-items");
    const empty = document.getElementById("cart-empty");
    const totalEl = document.getElementById("cart-total");
    const countEl = document.getElementById("cart-count");

    if (!itemsEl || !empty) return;

    itemsEl.innerHTML = "";
    empty.style.display = "none";

    try {
        const res = await apiRequest(`/api/cart?user_id=${user.id}`);
        const items = res.items || [];

        if (items.length === 0) {
            empty.style.display = "block";
        } else {
            let total = 0;
            items.forEach(it => {
                const row = document.createElement("div");
                row.className = "cart-item";

                const img = document.createElement("img");
                img.className = "cart-item-thumb";
                img.src = it.thumbnail || "https://via.placeholder.com/320x180?text=Course";

                const center = document.createElement("div");
                const title = document.createElement("div");
                title.className = "cart-item-title";
                title.textContent = it.title || "Курс";

                const meta = document.createElement("div");
                meta.className = "cart-item-meta";
                meta.textContent = "";

                center.appendChild(title);
                center.appendChild(meta);

                const right = document.createElement("div");
                right.className = "cart-item-price";
                total += Number(it.price || 0);
                right.innerHTML = `
                    ${formatPrice(it.price || 0)}<br>
                    <button class="btn btn-ghost" style="margin-top:6px;font-size:11px;padding:5px 9px;"
                        onclick="removeFromCart(${it.course_id})">Удалить</button>
                `;

                row.appendChild(img);
                row.appendChild(center);
                row.appendChild(right);

                itemsEl.appendChild(row);
            });

            if (countEl) countEl.textContent = items.length;
            if (totalEl) totalEl.textContent = formatPrice(total);
        }
    } catch (e) {
        empty.style.display = "block";
    }
}

async function removeFromCart(courseId) {
    const user = await requireUser();
    await apiRequest("/api/cart/remove", {
        method: "POST",
        body: JSON.stringify({
            user_id: user.id,
            course_id: courseId
        })
    });
    showMessage("Курс удалён из корзины", "info");
    initCart();
}

async function checkoutCart() {
    const user = await requireUser();

    // получаем все элементы корзины
    let items = [];
    try {
        const res = await apiRequest(`/api/cart?user_id=${user.id}`);
        items = res.items || [];
    } catch (e) {
        return;
    }

    if (items.length === 0) {
        showMessage("Корзина пуста", "error");
        return;
    }

    // покупаем каждый курс по /api/purchase
    for (const it of items) {
        try {
            await apiRequest("/api/purchase", {
                method: "POST",
                body: JSON.stringify({
                    user_id: user.id,
                    course_id: it.course_id
                })
            });
        } catch (e) {
            // если ошибка по одному курсу — продолжаем остальные
            console.error("purchase error", e);
        }
    }

    showMessage("Покупка завершена", "success");
    setTimeout(() => {
        window.location.href = "profile.html";
    }, 1000);
}

// ================================
// PROFILE PAGE
// ================================
async function initProfile() {
    initUserPill();
    const user = await requireUser();

    const nameEl = document.getElementById("profile-name");
    const phoneEl = document.getElementById("profile-phone");
    const balanceEl = document.getElementById("profile-balance");
    const grid = document.getElementById("profile-courses-grid");
    const empty = document.getElementById("profile-courses-empty");

    if (nameEl) nameEl.textContent = user.name || "";
    if (phoneEl) phoneEl.textContent = user.phone || "";
    if (balanceEl) balanceEl.textContent = formatPrice(user.balance || 0);

    try {
        const res = await apiRequest(`/api/profile/my-courses?user_id=${user.id}`);
        const courses = res.courses || [];

        if (grid && empty) {
            grid.innerHTML = "";
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
        // ошибка уже показана
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
        } catch (e2) {}
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
        } catch (e2) {}
    });
}

// ================================
// ADMIN PAGE
// ================================
async function initAdmin() {
    initUserPill();
    // тут только просмотр рейтингов курсов — под твой /api/admin/courses/ratings
    const list = document.getElementById("admin-courses");
    if (!list) return;

    list.innerHTML = "Загрузка...";

    try {
        const res = await apiRequest("/api/admin/courses/ratings");
        const courses = res.courses || [];
        list.innerHTML = "";
        if (courses.length === 0) {
            list.textContent = "Курсов нет.";
            return;
        }
        courses.forEach(c => {
            const item = document.createElement("div");
            item.className = "admin-item";
            item.innerHTML = `
                <strong>${c.id}. ${c.title}</strong><br>
                ★ ${c.avg_rating || 0} • ${c.ratings_count} отзыв(ов)
            `;
            list.appendChild(item);
        });
    } catch (e) {
        list.textContent = "Ошибка загрузки курсов.";
    }
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
