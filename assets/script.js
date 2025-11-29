// ================================
//   API базовый URL (Render)
// ================================
const API = "https://coursestore-backend.onrender.com";


// ================================
//   Работа с пользователем
// ================================
function saveUser(user) {
    try {
        localStorage.setItem("user", JSON.stringify(user));
    } catch (e) {
        console.error("Не удалось сохранить пользователя:", e);
    }
}

function getUser() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.error("Не удалось прочитать пользователя:", e);
        return null;
    }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// ================================
//   Toast-уведомления
// ================================
function showMessage(text, type = "info") {
    if (!text) return;

    let box = document.querySelector(".toast-container");
    if (!box) {
        box = document.createElement("div");
        box.className = "toast-container";
        document.body.appendChild(box);
    }

    const el = document.createElement("div");
    el.className = "toast";

    if (type === "error") el.classList.add("toast-error");
    else if (type === "success") el.classList.add("toast-success");
    else if (type === "warning") el.classList.add("toast-warning");

    el.innerText = text;
    box.appendChild(el);

    // плавное появление
    requestAnimationFrame(() => el.classList.add("toast-show"));

    setTimeout(() => {
        el.classList.remove("toast-show");
        setTimeout(() => el.remove(), 200);
    }, 3500);
}


// ================================
//   Безопасный fetch с JSON
// ================================
async function safeFetchJSON(url, options = {}, fallbackError = "Ошибка запроса") {
    try {
        const res = await fetch(url, options);

        // Сервер ответил, но статус не 2xx
        if (!res.ok) {
            console.warn("Ответ сервера не OK:", res.status, res.statusText);
            showMessage(fallbackError, "error");
            return null;
        }

        return await res.json();
    } catch (e) {
        console.error("Ошибка сети или сервера:", e);
        showMessage("Сервер просыпается или недоступен. Попробуйте ещё раз через несколько секунд.", "warning");
        return null;
    }
}


// ================================
//   Утилита для Google Drive
// ================================
function toDrivePreview(url) {
    if (!url) return "";

    // Если уже preview — оставляем
    if (url.includes("/preview")) return url;

    // Берём ID файла из любой ссылки Google Drive
    if (url.includes("drive.google.com")) {
        const match = url.match(/[-\w]{25,}/);
        if (match) {
            const id = match[0];
            return `https://drive.google.com/file/d/${id}/preview`;
        }
    }

    return url;
}

function toDriveView(url) {
    if (!url) return "";
    // Если это preview, меняем на view
    if (url.includes("/preview")) {
        return url.replace("/preview", "/view");
    }

    if (url.includes("drive.google.com")) {
        const match = url.match(/[-\w]{25,}/);
        if (match) {
            const id = match[0];
            return `https://drive.google.com/file/d/${id}/view`;
        }
    }

    return url;
}


// ================================
//            REGISTER
// ================================
async function registerUser(name, phone, pass) {
    if (!name || !phone || !pass) {
        showMessage("Заполните все поля", "error");
        return;
    }

    const data = await safeFetchJSON(API + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password: pass })
    }, "Не удалось зарегистрироваться");

    if (!data) return;

    if (data.status !== "ok") {
        return showMessage(data.message || "Ошибка регистрации", "error");
    }

    saveUser(data.user);
    showMessage("Регистрация прошла успешно", "success");
    window.location.href = "index.html";
}


// ================================
//            LOGIN
// ================================
async function loginUser(phone, pass) {
    if (!phone || !pass) {
        showMessage("Введите телефон и пароль", "error");
        return;
    }

    const data = await safeFetchJSON(API + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password: pass })
    }, "Не удалось войти");

    if (!data) return;

    if (data.status !== "ok") {
        return showMessage(data.message || "Неверный телефон или пароль", "error");
    }

    saveUser(data.user);
    showMessage("Вход выполнен", "success");
    window.location.href = "index.html";
}


// ================================
//         LOAD CATALOG
// ================================
async function loadCatalog() {
    const container = document.getElementById("catalogList");
    if (!container) return;

    container.innerHTML = "Загрузка...";
    const data = await safeFetchJSON(API + "/api/courses", {}, "Не удалось загрузить каталог");

    if (!data || data.status !== "ok") {
        container.innerHTML = "<p>Не удалось загрузить курсы.</p>";
        return;
    }

    container.innerHTML = "";

    if (!data.courses || data.courses.length === 0) {
        container.innerHTML = "<p>Курсов пока нет.</p>";
        return;
    }

    data.courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";

        const img = c.image || "";
        const author = c.author || "Автор не указан";

        card.innerHTML = `
            <div class="course-thumb">
                <img src="${img}" alt="">
            </div>
            <div class="course-info">
                <h3>${c.title}</h3>
                <p class="author">${author}</p>
                <div class="price">${c.price} ₸</div>
                <button onclick="openCourse(${c.id})" class="btn btn-primary btn-block">
                    Открыть курс
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

function openCourse(cid) {
    localStorage.setItem("currentCourse", String(cid));
    window.location.href = "course.html";
}


// ================================
//         LOAD COURSE PAGE
// ================================
async function loadCoursePage() {
    const cid = localStorage.getItem("currentCourse");
    if (!cid) return;

    const data = await safeFetchJSON(API + "/api/course?course_id=" + cid, {}, "Не удалось загрузить курс");
    if (!data || data.status !== "ok") {
        showMessage(data?.message || "Курс не найден", "error");
        return;
    }

    const course = data.course;
    const lessons = data.lessons || [];
    const reviews = data.reviews || [];

    // Заголовок и инфо
    const titleEl = document.getElementById("courseTitle");
    const imgEl = document.getElementById("courseImg");
    const authorEl = document.getElementById("courseAuthor");
    const priceEl = document.getElementById("coursePrice");
    const descEl = document.getElementById("courseDescription");

    if (titleEl) titleEl.innerText = course.title || "";
    if (imgEl) imgEl.src = course.image || "";
    if (authorEl) authorEl.innerText = course.author || "";
    if (priceEl) priceEl.innerText = (course.price || 0) + " ₸";
    if (descEl) descEl.innerText = course.description || "";

    // Уроки
    const list = document.getElementById("lessonList");
    if (list) {
        list.innerHTML = "";

        if (lessons.length === 0) {
            list.innerHTML = "<p>Уроки пока не добавлены.</p>";
        } else {
            lessons.forEach(l => {
                let previewUrl = toDrivePreview(l.video_url || "");
                let viewUrl = toDriveView(l.video_url || "");

                const item = document.createElement("div");
                item.className = "lesson-item";
                item.innerHTML = `
                    <span>${l.position}. ${l.title}</span>
                    <div class="lesson-actions">
                        <button onclick="playLesson('${previewUrl}')" class="btn btn-primary btn-small">
                            Смотреть
                        </button>
                        <a href="${viewUrl}" target="_blank" class="btn-link">
                            В Google Drive
                        </a>
                    </div>
                `;
                list.appendChild(item);
            });
        }
    }

    // Отзывы
    const revBlock = document.getElementById("reviewList");
    if (revBlock) {
        revBlock.innerHTML = "";
        if (reviews.length === 0) {
            revBlock.innerHTML = "<p>Отзывов пока нет.</p>";
        } else {
            reviews.forEach(r => {
                const el = document.createElement("div");
                el.className = "review-card";
                el.innerHTML = `
                    <div class="stars">⭐ ${r.stars}</div>
                    <div class="review-text">${r.text || ""}</div>
                    <div class="review-author">— ${r.user_name || "Аноним"}</div>
                `;
                revBlock.appendChild(el);
            });
        }
    }
}


// ================================
//         VIDEO PLAYER
// ================================
function playLesson(url) {
    const player = document.getElementById("videoPlayer");
    if (!player) return;

    const safeUrl = toDrivePreview(url);

    player.innerHTML = `
        <iframe width="100%" height="420"
            src="${safeUrl}"
            frameborder="0"
            allow="autoplay; encrypted-media"
            allowfullscreen>
        </iframe>
    `;
}


// ================================
//             CART
// ================================
async function addToCart(cid) {
    const user = getUser();
    if (!user) {
        showMessage("Войдите в аккаунт", "error");
        return;
    }

    const data = await safeFetchJSON(API + "/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, course_id: cid })
    }, "Не удалось добавить в корзину");

    if (!data) return;

    if (data.status !== "ok") {
        return showMessage(data.message || "Не удалось добавить в корзину", "error");
    }

    showMessage("Добавлено в корзину", "success");
}

async function loadCart() {
    const user = getUser();
    if (!user) return;

    const container = document.getElementById("cartList");
    const totalEl = document.getElementById("cartTotal");
    if (!container || !totalEl) return;

    container.innerHTML = "Загрузка...";
    totalEl.innerText = "0 ₸";

    const data = await safeFetchJSON(API + "/api/cart?user_id=" + user.user_id, {}, "Не удалось загрузить корзину");
    if (!data || data.status !== "ok") {
        container.innerHTML = "<p>Не удалось загрузить корзину.</p>";
        return;
    }

    container.innerHTML = "";
    let total = 0;

    if (!data.items || data.items.length === 0) {
        container.innerHTML = "<p>Корзина пуста.</p>";
    } else {
        data.items.forEach(it => {
            total += it.price || 0;

            const el = document.createElement("div");
            el.className = "cart-item";
            el.innerHTML = `
                <img src="${it.image || ""}" class="cart-img">
                <div class="cart-info">
                    <h4>${it.title}</h4>
                    <div>${it.price} ₸</div>
                </div>
                <button class="btn btn-danger" onclick="removeFromCart(${it.cart_id})">
                    Удалить
                </button>
            `;
            container.appendChild(el);
        });
    }

    totalEl.innerText = total + " ₸";
}

async function removeFromCart(id) {
    const data = await safeFetchJSON(API + "/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: id })
    }, "Не удалось удалить из корзины");

    if (!data) return;
    loadCart();
}

async function buyCart() {
    const user = getUser();
    if (!user) return;

    const data = await safeFetchJSON(API + "/api/cart/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id })
    }, "Не удалось провести оплату");

    if (!data) return;

    if (data.status !== "ok") {
        return showMessage(data.message || "Недостаточно средств", "error");
    }

    showMessage("Покупка успешна", "success");
    loadCart();
    loadProfile(); // обновить баланс
}


// ================================
//            PROFILE
// ================================
async function loadProfile() {
    const user = getUser();
    if (!user) return;

    const data = await safeFetchJSON(API + "/api/user?user_id=" + user.user_id, {}, "Не удалось загрузить профиль");
    if (!data || data.status !== "ok") {
        showMessage(data?.message || "Ошибка профиля", "error");
        return;
    }

    const u = data.user;

    const nameEl = document.getElementById("name");
    const phoneEl = document.getElementById("phone");
    const balanceEl = document.getElementById("balance");
    const avatarEl = document.getElementById("avatar");

    if (nameEl) nameEl.innerText = u.name || "";
    if (phoneEl) phoneEl.innerText = u.phone || "";
    if (balanceEl) balanceEl.innerText = (u.balance || 0) + " ₸";
    if (avatarEl && u.avatar) avatarEl.src = u.avatar;

    loadMyCourses();
}

async function loadMyCourses() {
    const user = getUser();
    if (!user) return;

    const container = document.getElementById("myCourses");
    if (!container) return;

    container.innerHTML = "Загрузка...";

    const data = await safeFetchJSON(API + "/api/my-courses?user_id=" + user.user_id, {}, "Не удалось загрузить ваши курсы");
    if (!data || data.status !== "ok") {
        container.innerHTML = "<p>Не удалось загрузить курсы.</p>";
        return;
    }

    container.innerHTML = "";

    if (!data.courses || data.courses.length === 0) {
        container.innerHTML = "<p>Вы ещё не купили ни одного курса.</p>";
        return;
    }

    data.courses.forEach(c => {
        const el = document.createElement("div");
        el.className = "course-card";
        el.innerHTML = `
            <div class="course-thumb">
                <img src="${c.image || ""}" alt="">
            </div>
            <div class="course-info">
                <h3>${c.title}</h3>
                <p>${c.author || ""}</p>
                <button onclick="openCourse(${c.id})" class="btn btn-primary btn-block">
                    Открыть
                </button>
            </div>
        `;
        container.appendChild(el);
    });
}
