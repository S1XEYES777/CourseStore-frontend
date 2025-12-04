// ============================================================
// CONFIG
// ============================================================

const API = "https://coursestore-backend.onrender.com";

// ============================================================
// LOCAL STORAGE USER
// ============================================================

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

// ============================================================
// TOAST
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
    setTimeout(() => t.remove(), 4000);
}

// ============================================================
// UNIVERSAL FETCH
// ============================================================

async function api(path, method = "GET", body = null, isForm = false) {
    let opts = { method, headers: {} };

    const user = getUser();
    if (user) opts.headers["X-Token"] = user.token;

    if (body && !isForm) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
    } else if (isForm) {
        opts.body = body;
    }

    try {
        const res = await fetch(API + path, opts);
        return await res.json();
    } catch (e) {
        console.error(e);
        showMessage("Ошибка соединения с сервером", "error");
        return null;
    }
}

// ============================================================
// NAVBAR USER
// ============================================================

function renderNavbarUser() {
    const el = document.querySelector("#navUserBlock");
    if (!el) return;

    const user = getUser();
    if (!user) {
        el.innerHTML = `
            <button class="btn btn-primary" onclick="location.href='login.html'">Войти</button>
            <button class="btn btn-outline" onclick="location.href='register.html'">Регистрация</button>
        `;
        return;
    }

    el.innerHTML = `
        <div class="nav-user">
            <div class="avatar">
                ${user.avatar_url ? `<img src="${API + user.avatar_url}">` : (user.name?.[0] || "U")}
            </div>
            <span class="nav-user-name">${user.name || user.phone}</span>
        </div>
        <button class="btn btn-outline" onclick="logout()">Выход</button>
    `;
}

// ============================================================
// LOGIN
// ============================================================

async function handleLogin() {
    const phone = document.querySelector("#loginPhone")?.value.trim();
    const pass = document.querySelector("#loginPass")?.value.trim();

    if (!phone || !pass) {
        showMessage("Введите телефон и пароль", "error");
        return;
    }

    const res = await api("/api/login", "POST", { phone, password: pass });
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка входа", "error");
        return;
    }

    saveUser(res.user);
    showMessage("Добро пожаловать!", "success");
    setTimeout(() => location.href = "index.html", 700);
}

// ============================================================
// REGISTER
// ============================================================

async function handleRegister() {
    const name = document.querySelector("#regName")?.value.trim();
    const email = document.querySelector("#regEmail")?.value.trim();
    const phone = document.querySelector("#regPhone")?.value.trim();
    const pass = document.querySelector("#regPass")?.value.trim();

    if (!phone || !pass) {
        showMessage("Телефон и пароль обязательны", "error");
        return;
    }

    const res = await api("/api/register", "POST", {
        name, email, phone, password: pass
    });

    if (!res || res.error) {
        showMessage(res?.error || "Ошибка регистрации", "error");
        return;
    }

    saveUser(res.user);
    showMessage("Регистрация успешна!", "success");
    setTimeout(() => location.href = "index.html", 700);
}

// ============================================================
// COURSE CARD HELPERS (цены + студенты)
// ============================================================

function buildCoursePriceBlock(c) {
    const priceFull = c.price_full ?? c.price ?? 0;
    const priceDiscount = c.price_discount ?? null;
    const hasDiscount = priceDiscount && priceDiscount > 0 && priceDiscount < priceFull;

    if (hasDiscount) {
        return `
            <div class="course-price">
                ${priceDiscount} ₸
                <span class="course-price-old">${priceFull} ₸</span>
            </div>
        `;
    }
    return `<div class="course-price">${priceFull} ₸</div>`;
}

function getDiscountPercent(c) {
    const priceFull = c.price_full ?? c.price ?? 0;
    const priceDiscount = c.price_discount ?? null;
    if (!priceFull || !priceDiscount) return null;
    const p = Math.round((1 - priceDiscount / priceFull) * 100);
    if (!isFinite(p) || p <= 0) return null;
    return p;
}

// ============================================================
// LOAD COURSES (Главная / Каталог)
// ============================================================

async function loadCourses() {
    const container = document.querySelector("#coursesGrid");
    if (!container) return;

    const res = await api("/api/courses");
    if (!res || !res.courses) {
        container.innerHTML = "<div>Ошибка загрузки курсов</div>";
        return;
    }

    container.innerHTML = "";

    res.courses.forEach((c, index) => {
        const card = document.createElement("div");
        card.className = "course-card fade";
        if (c.is_purchased) card.classList.add("purchased");
        card.style.animationDelay = (index * 0.07) + "s";

        card.onclick = () => location.href = `course.html?id=${c.id}`;

        const discountPercent = getDiscountPercent(c);
        const priceBlock = buildCoursePriceBlock(c);

        card.innerHTML = `
            <div class="course-thumb-wrapper">
                <img class="course-thumb" src="${API + c.image_url}">
                <div class="course-thumb-overlay"></div>

                <div class="course-thumb-badge">
                    <span class="dot"></span>Курс
                </div>

                ${c.is_purchased ? `
                    <div class="course-badge-purchased">
                        <span class="icon">✓</span> Куплено
                    </div>
                ` : ""}

            </div>

            <div class="course-card-body">
                <div class="course-title">${c.title}</div>
                <div class="course-desc">${c.description || ""}</div>

                <div class="course-meta-row">
                    ${priceBlock}
                    <div class="course-meta-tags">
                        ${c.students_count ? `<span class="course-tag">👤 ${c.students_count}</span>` : ""}
                        ${discountPercent ? `<span class="course-tag">-${discountPercent}%</span>` : ""}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// ============================================================
// COURSE PAGE
// ============================================================

async function loadCoursePage() {
    const page = document.querySelector("#coursePage");
    if (!page) return;

    const id = new URLSearchParams(location.search).get("id");
    if (!id) {
        page.innerHTML = "Курс не найден";
        return;
    }

    const res = await api(`/api/courses/${id}`);
    if (!res || !res.course) {
        page.innerHTML = "Ошибка загрузки курса";
        return;
    }

    const c = res.course;
    const priceFull = c.price_full ?? c.price ?? 0;
    const priceDiscount = c.price_discount ?? null;
    const hasDiscount = priceDiscount && priceDiscount > 0 && priceDiscount < priceFull;

    document.querySelector("#courseTitle").innerText = c.title;
    document.querySelector("#courseDesc").innerText = c.description || "";
    const priceEl = document.querySelector("#coursePrice");
    if (priceEl) {
        priceEl.innerHTML = hasDiscount
            ? `${priceDiscount} ₸ <span class="course-price-old">${priceFull} ₸</span>`
            : `${priceFull} ₸`;
    }

    const thumb = document.querySelector("#courseThumb");
    if (thumb) thumb.src = API + c.image_url;

    const videoBlock = document.querySelector("#videoBlock");
    const lessonsList = document.querySelector("#lessonsList");
    const btnBuy = document.querySelector("#btnBuy");
    const btnAddCart = document.querySelector("#btnAddCart");

    if (!c.is_purchased) {
        if (videoBlock) {
            videoBlock.innerHTML = `
                <div style="text-align:center;padding:20px;color:#9ca3af;">
                    Чтобы смотреть уроки — купите курс
                </div>
            `;
        }
        if (lessonsList) {
            lessonsList.innerHTML = `
                <div style="padding:16px;text-align:center;color:#6b7280;">
                    Уроки доступны только после покупки
                </div>
            `;
        }
        if (btnBuy) btnBuy.style.display = "block";
        if (btnAddCart) btnAddCart.style.display = "block";
        return;
    }

    if (btnBuy) btnBuy.style.display = "none";
    if (btnAddCart) btnAddCart.style.display = "none";

    if (!c.lessons || c.lessons.length === 0) {
        if (lessonsList) lessonsList.innerHTML = "У этого курса пока нет уроков";
        if (videoBlock) videoBlock.innerHTML = "";
        return;
    }

    if (videoBlock) {
        videoBlock.innerHTML = `
            <video controls src="${API + c.lessons[0].video_url}"></video>
        `;
    }

    if (lessonsList) {
        lessonsList.innerHTML = "";
        c.lessons.forEach((l, i) => {
            const item = document.createElement("div");
            item.className = "lesson-item";
            if (i === 0) item.classList.add("active");

            item.innerHTML = `
                <div class="lesson-index">${i + 1}</div>
                <div class="lesson-title">${l.title}</div>
            `;

            item.onclick = () => {
                document.querySelectorAll(".lesson-item").forEach(e => e.classList.remove("active"));
                item.classList.add("active");
                if (videoBlock) {
                    videoBlock.innerHTML = `<video controls src="${API + l.video_url}"></video>`;
                }
            };

            lessonsList.appendChild(item);
        });
    }
}

async function buyCourse(courseId) {
    if (!courseId) return;
    const res = await api("/api/cart/add", "POST", { course_id: courseId });
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка добавления в корзину", "error");
        return;
    }
    const pay = await api("/api/cart/checkout", "POST");
    if (!pay || pay.error) {
        showMessage(pay?.error || "Ошибка оплаты", "error");
        return;
    }
    showMessage("Курс успешно куплен!", "success");
    setTimeout(() => location.reload(), 700);
}

async function addToCart(courseId) {
    if (!courseId) return;
    const res = await api("/api/cart/add", "POST", { course_id: courseId });
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка добавления в корзину", "error");
        return;
    }
    showMessage("Курс добавлен в корзину", "success");
}

// ============================================================
// CART
// ============================================================

async function loadCart() {
    const block = document.querySelector("#cartItems");
    const totalEl = document.querySelector("#cartTotal");
    if (!block || !totalEl) return;

    const res = await api("/api/cart");
    if (!res) return;

    if (!res.items || res.items.length === 0) {
        block.innerHTML = `<div class="cart-empty">Корзина пуста</div>`;
        totalEl.innerText = "0 ₸";
        return;
    }

    block.innerHTML = "";
    res.items.forEach(item => {
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <div class="cart-item-thumb">
                <img src="${API + item.image_url}">
            </div>
            <div class="cart-item-body">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-meta">Курс</div>
            </div>
            <div class="cart-item-actions">
                <div class="cart-item-price">${item.price} ₸</div>
                <button class="btn btn-outline" onclick="removeFromCart(${item.course_id})">Удалить</button>
            </div>
        `;
        block.appendChild(row);
    });

    totalEl.innerText = res.total + " ₸";
}

async function removeFromCart(id) {
    const res = await api("/api/cart/remove", "POST", { course_id: id });
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка удаления", "error");
        return;
    }
    showMessage("Удалено из корзины", "success");
    loadCart();
}

async function checkoutCart() {
    const res = await api("/api/cart/checkout", "POST");
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка покупки", "error");
        return;
    }
    showMessage("Покупка успешна!", "success");
    setTimeout(() => location.href = "profile.html", 800);
}

// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {
    const userBlock = document.querySelector("#profileUser");
    if (!userBlock) return;

    const res = await api("/api/me");
    if (!res || !res.user) {
        showMessage("Ошибка загрузки профиля", "error");
        return;
    }

    const u = res.user;
    userBlock.innerHTML = `
        <div class="profile-top">
            <div class="avatar avatar-lg">
                ${u.avatar_url ? `<img src="${API + u.avatar_url}">` : (u.name?.[0] || "U")}
            </div>
            <div class="profile-info">
                <div class="profile-name">${u.name || u.phone}</div>
                <div class="profile-meta">${u.email || "Нет email"}</div>
                <div class="profile-meta">${u.phone}</div>
            </div>
        </div>
    `;

    loadMyCourses();
}

async function loadMyCourses() {
    const block = document.querySelector("#myCourses");
    if (!block) return;

    const res = await api("/api/my-courses");
    if (!res || !res.courses || res.courses.length === 0) {
        block.innerHTML = `<div class="cart-empty">Нет купленных курсов</div>`;
        return;
    }

    block.innerHTML = "";
    res.courses.forEach((c, i) => {
        const card = document.createElement("div");
        card.className = "course-card fade";
        card.style.animationDelay = (i * 0.07) + "s";

        const priceBlock = buildCoursePriceBlock(c);
        const discountPercent = getDiscountPercent(c);

        card.onclick = () => location.href = `course.html?id=${c.id}`;

        card.innerHTML = `
            <div class="course-thumb-wrapper">
                <img class="course-thumb" src="${API + c.image_url}">
                <div class="course-thumb-overlay"></div>
                <div class="course-badge-purchased"><span class="icon">✓</span> Куплено</div>
            </div>
            <div class="course-card-body">
                <div class="course-title">${c.title}</div>
                <div class="course-desc">${c.description || ""}</div>
                <div class="course-meta-row">
                    ${priceBlock}
                    <div class="course-meta-tags">
                        ${discountPercent ? `<span class="course-tag">-${discountPercent}%</span>` : ""}
                    </div>
                </div>
            </div>
        `;
        block.appendChild(card);
    });
}

async function uploadAvatar() {
    const file = document.querySelector("#avatarFile")?.files?.[0];
    if (!file) {
        showMessage("Выберите файл", "error");
        return;
    }

    const form = new FormData();
    form.append("file", file);

    const res = await api("/api/user/avatar", "POST", form, true);
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка загрузки аватара", "error");
        return;
    }

    showMessage("Аватар обновлён!", "success");
    setTimeout(() => location.reload(), 600);
}

// ============================================================
// ADMIN PANEL
// ============================================================

let cachedCourses = [];
let cachedLessons = [];

// --- Upload course image ---
async function adminUploadImage() {
    const file = document.querySelector("#adminCourseImage")?.files?.[0];
    if (!file) {
        showMessage("Выберите изображение", "error");
        return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("type", "course");

    const res = await api("/api/upload/image", "POST", form, true);
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка загрузки изображения", "error");
        return;
    }

    window._newCourseImage = res.url;
    const prev = document.querySelector("#adminImagePreview");
    if (prev) {
        prev.innerHTML = `<img src="${API + res.url}" style="border-radius:14px;">`;
    }
    showMessage("Фото загружено", "success");
}

// --- Create / Edit course (with discount) ---
async function adminCreateOrEditCourse() {
    const id = document.querySelector("#adminEditId")?.value.trim();

    const title = document.querySelector("#adminTitle")?.value.trim() || "";
    const description = document.querySelector("#adminDesc")?.value.trim() || "";

    const priceFullInput = document.querySelector("#adminPriceFull");
    const priceDiscountInput = document.querySelector("#adminPriceDiscount");
    const legacyPriceInput = document.querySelector("#adminPrice");

    let price_full = priceFullInput ? priceFullInput.value.trim() : (legacyPriceInput ? legacyPriceInput.value.trim() : "");
    let price_discount = priceDiscountInput ? priceDiscountInput.value.trim() : "";

    if (!price_full) {
        showMessage("Введите цену курса", "error");
        return;
    }

    const image_url = window._newCourseImage;

    const payload = {
        title,
        description,
        price_full: Number(price_full),
        price_discount: price_discount ? Number(price_discount) : null,
        image_url
    };

    // Для совместимости, можно ещё дублировать реальную цену:
    payload.price = payload.price_discount || payload.price_full;

    let res;
    if (id) {
        res = await api(`/api/admin/courses/${id}`, "PUT", payload);
    } else {
        res = await api("/api/admin/courses", "POST", payload);
    }

    if (!res || res.error) {
        showMessage(res?.error || "Ошибка сохранения курса", "error");
        return;
    }

    showMessage(id ? "Курс обновлён" : "Курс создан", "success");
    loadAdminCourses();
}

// --- Delete course ---
async function adminDeleteCourse(id) {
    const res = await api(`/api/admin/courses/${id}`, "DELETE");
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка удаления курса", "error");
        return;
    }
    showMessage("Курс удалён", "success");
    loadAdminCourses();
}

// --- Load courses for admin ---
async function loadAdminCourses() {
    const block = document.querySelector("#adminCoursesList");
    if (!block) return;

    const res = await api("/api/courses");
    if (!res || !res.courses) {
        block.innerHTML = "Не удалось загрузить курсы";
        return;
    }

    cachedCourses = res.courses;
    block.innerHTML = "";

    res.courses.forEach((c, i) => {
        const card = document.createElement("div");
        card.className = "course-card fade";
        card.style.animationDelay = (i * 0.07) + "s";

        const discountPercent = getDiscountPercent(c);
        const priceBlock = buildCoursePriceBlock(c);

        card.innerHTML = `
            <div class="course-thumb-wrapper">
                <img class="course-thumb" src="${API + c.image_url}">
                <div class="course-thumb-overlay"></div>
            </div>
            <div class="course-card-body">
                <div class="course-title">${c.title}</div>
                <div class="course-desc">${c.description || ""}</div>
                <div class="course-meta-row">
                    ${priceBlock}
                    <div class="course-meta-tags">
                        ${c.students_count ? `<span class="course-tag">👤 ${c.students_count}</span>` : ""}
                        ${discountPercent ? `<span class="course-tag">-${discountPercent}%</span>` : ""}
                    </div>
                </div>
            </div>
            <div class="course-card-footer">
                <button class="btn secondary" onclick="adminLoadForEdit(${c.id})">✏ Редактировать</button>
                <button class="btn btn-danger" onclick="adminDeleteCourse(${c.id})">Удалить</button>
            </div>
        `;

        block.appendChild(card);
    });
}

// --- Load course into form (edit) + stats ---
function adminLoadForEdit(id) {
    const c = cachedCourses.find(x => x.id === id);
    if (!c) return;

    const idEl = document.querySelector("#adminEditId");
    const tEl = document.querySelector("#adminTitle");
    const dEl = document.querySelector("#adminDesc");
    const pfEl = document.querySelector("#adminPriceFull");
    const pdEl = document.querySelector("#adminPriceDiscount");
    const legacyPrice = document.querySelector("#adminPrice");

    if (idEl) idEl.value = c.id;
    if (tEl) tEl.value = c.title || "";
    if (dEl) dEl.value = c.description || "";

    if (pfEl) pfEl.value = c.price_full ?? c.price ?? "";
    if (pdEl) pdEl.value = c.price_discount ?? "";
    if (!pfEl && legacyPrice) legacyPrice.value = c.price ?? "";

    window._newCourseImage = c.image_url;
    const prev = document.querySelector("#adminImagePreview");
    if (prev && c.image_url) {
        prev.innerHTML = `<img src="${API + c.image_url}" style="border-radius:14px;">`;
    }

    loadCourseStats(id);
    showMessage("Курс загружен в форму", "success");
}

// --- Load course stats for admin ---
async function loadCourseStats(id) {
    const statsCard = document.querySelector("#adminStatsCard");
    if (!statsCard) return; // если в HTML нет блока статистики — просто выходим

    const res = await api(`/api/admin/courses/${id}/stats`);
    if (!res || res.error) return;

    statsCard.style.display = "block";

    const sStudents = document.querySelector("#statStudents");
    const sSales = document.querySelector("#statSales");
    const sRevenue = document.querySelector("#statRevenue");

    if (sStudents) sStudents.innerText = res.students_count ?? 0;
    if (sSales) sSales.innerText = res.sales_count ?? 0;
    if (sRevenue) sRevenue.innerText = (res.revenue ?? 0) + " ₸";
}

// --- Upload lesson video ---
async function adminUploadVideo() {
    const cid = document.querySelector("#adminLessonCourseId")?.value.trim();
    const file = document.querySelector("#adminLessonVideo")?.files?.[0];

    if (!cid || !file) {
        showMessage("Укажите ID курса и выберите видео", "error");
        return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("course_id", cid);

    const res = await api("/api/upload/video", "POST", form, true);
    if (!res || res.error) {
        showMessage(res?.error || "Ошибка загрузки видео", "error");
        return;
    }

    window._newLessonVideo = res.url;

    const prev = document.querySelector("#adminVideoPreview");
    if (prev) {
        prev.innerHTML = `<video controls src="${API + res.url}" style="width:100%;border-radius:14px;"></video>`;
    }

    showMessage("Видео загружено", "success");
}

// --- Create lesson ---
async function adminCreateLesson() {
    const cid = document.querySelector("#adminLessonCourseId")?.value.trim();
    const title = document.querySelector("#adminLessonTitle")?.value.trim();
    const order = document.querySelector("#adminLessonOrder")?.value.trim() || "0";
    const video_url = window._newLessonVideo;

    if (!cid || !title || !video_url) {
        showMessage("Заполните все поля и загрузите видео", "error");
        return;
    }

    const res = await api("/api/admin/lessons", "POST", {
        course_id: cid,
        title,
        order_index: Number(order),
        video_url
    });

    if (!res || res.error) {
        showMessage(res?.error || "Ошибка создания урока", "error");
        return;
    }

    showMessage("Урок добавлен!", "success");
    loadLessonsAdmin(cid);
}

// --- Load lessons in admin ---
async function loadLessonsAdmin(courseId) {
    const block = document.querySelector("#lessonsListAdmin");
    if (!block) return;

    const res = await api(`/api/courses/${courseId}`);
    if (!res || !res.course) {
        block.innerHTML = "Курс не найден";
        return;
    }

    cachedLessons = res.course.lessons || [];
    block.innerHTML = "";

    cachedLessons.forEach((l, index) => {
        const row = document.createElement("div");
        row.className = "lesson-item fade";
        row.style.animationDelay = (index * 0.05) + "s";

        row.innerHTML = `
            <div class="lesson-index">${l.order_index ?? index + 1}</div>
            <div class="lesson-title">${l.title}</div>
            <div style="display:flex;gap:6px;">
                <button class="btn btn-outline btn-icon" onclick="moveLessonUp(${index})">▲</button>
                <button class="btn btn-outline btn-icon" onclick="moveLessonDown(${index})">▼</button>
                <button class="btn btn-danger btn-icon" onclick="deleteLesson(${l.id}, ${l.course_id})">✕</button>
            </div>
        `;
        block.appendChild(row);
    });
}

// --- Move lesson up ---
async function moveLessonUp(index) {
    if (index <= 0) return;
    const l = cachedLessons[index];
    const prev = cachedLessons[index - 1];
    if (!l || !prev) return;

    await api("/api/admin/lessons/reorder", "POST", {
        lesson_id: l.id,
        swap_with_id: prev.id
    });

    showMessage("Порядок уроков изменён", "success");
    loadLessonsAdmin(l.course_id);
}

// --- Move lesson down ---
async function moveLessonDown(index) {
    if (index >= cachedLessons.length - 1) return;
    const l = cachedLessons[index];
    const next = cachedLessons[index + 1];
    if (!l || !next) return;

    await api("/api/admin/lessons/reorder", "POST", {
        lesson_id: l.id,
        swap_with_id: next.id
    });

    showMessage("Порядок уроков изменён", "success");
    loadLessonsAdmin(l.course_id);
}

// --- Delete lesson ---
async function deleteLesson(lessonId, courseId) {
    await api(`/api/admin/lessons/${lessonId}`, "DELETE");
    showMessage("Урок удалён", "success");
    loadLessonsAdmin(courseId);
}

// ============================================================
// AUTO INIT
// ============================================================

renderNavbarUser();
loadCourses();
loadCoursePage();
loadCart();
loadProfile();
loadAdminCourses();
