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
    try { return JSON.parse(u); }
    catch { return null; }
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
    setTimeout(() => t.remove(), 3500);
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
    } catch (err) {
        showMessage("Ошибка соединения с сервером", "error");
        return null;
    }
}

// ============================================================
// NAVBAR USER DISPLAY
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
                ${user.avatar_url ? `<img src="${API + user.avatar_url}">` : user.name.charAt(0)}
            </div>
            <span class="nav-user-name">${user.name || user.phone}</span>
        </div>
        <button class="btn btn-outline" onclick="logout()">Выход</button>
    `;
}

// ============================================================
// LOGIN PAGE
// ============================================================

async function handleLogin() {
    const phone = document.querySelector("#loginPhone").value.trim();
    const pass = document.querySelector("#loginPass").value.trim();

    if (!phone || !pass) {
        showMessage("Заполните все поля", "error");
        return;
    }

    const res = await api("/api/login", "POST", { phone, password: pass });
    if (res.error) {
        showMessage(res.error, "error");
        return;
    }

    saveUser(res.user);
    showMessage("Добро пожаловать!", "success");
    setTimeout(() => location.href = "index.html", 700);
}

// ============================================================
// REGISTER PAGE
// ============================================================

async function handleRegister() {
    const name = document.querySelector("#regName").value.trim();
    const email = document.querySelector("#regEmail").value.trim();
    const phone = document.querySelector("#regPhone").value.trim();
    const pass = document.querySelector("#regPass").value.trim();

    if (!phone || !pass) {
        showMessage("Телефон и пароль обязательны", "error");
        return;
    }

    const res = await api("/api/register", "POST", { name, email, phone, password: pass });
    if (res.error) {
        showMessage(res.error, "error");
        return;
    }

    saveUser(res.user);
    showMessage("Регистрация успешна!", "success");
    setTimeout(() => location.href = "index.html", 700);
}

// ============================================================
// LOAD COURSES FOR index.html & catalog.html
// ============================================================

async function loadCourses() {
    const container = document.querySelector("#coursesGrid");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:20px;">Загрузка...</div>`;

    const res = await api("/api/courses");
    if (!res || !res.courses) {
        container.innerHTML = "Ошибка загрузки курсов";
        return;
    }

    container.innerHTML = "";

    res.courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";
        if (c.is_purchased) card.classList.add("purchased");

        card.onclick = () => {
            location.href = `course.html?id=${c.id}`;
        };

        card.innerHTML = `
            <div class="course-thumb-wrapper">
                <img class="course-thumb" src="${API + c.image_url}">
                <div class="course-thumb-overlay"></div>
                <div class="course-thumb-badge"><span class="dot"></span>Курс</div>

                ${c.is_purchased ? `
                    <div class="course-badge-purchased">
                        <span class="icon">✓</span> Куплено
                    </div>
                ` : ""}
            </div>

            <div class="course-card-body">
                <div class="course-title">${c.title}</div>
                <div class="course-desc">${c.description || "Нет описания"}</div>
                <div class="course-meta-row">
                    <div class="course-price">${c.price} ₸</div>
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
    const cap = document.querySelector("#coursePage");
    if (!cap) return;

    const courseId = new URLSearchParams(location.search).get("id");
    if (!courseId) {
        cap.innerHTML = "Курс не найден";
        return;
    }

    const res = await api(`/api/courses/${courseId}`);
    if (!res || !res.course) {
        cap.innerHTML = "Ошибка загрузки курса";
        return;
    }

    const c = res.course;

    // Показ title, description, price
    document.querySelector("#courseTitle").innerText = c.title;
    document.querySelector("#courseDesc").innerText = c.description;
    document.querySelector("#coursePrice").innerText = c.price + " ₸";

    const thumb = document.querySelector("#courseThumb");
    thumb.src = API + c.image_url;

    // Если куплено — показ видео
    const videoBlock = document.querySelector("#videoBlock");
    const lessonsList = document.querySelector("#lessonsList");
    const btnBuy = document.querySelector("#btnBuy");
    const btnAddCart = document.querySelector("#btnAddCart");

    if (!c.is_purchased) {
        videoBlock.innerHTML = `
            <div style="padding:25px;text-align:center;color:#9ca3af;">
                Чтобы смотреть уроки — купите курс
            </div>
        `;
        lessonsList.innerHTML = `
            <div style="padding:20px;text-align:center;color:#808080;">
                Уроки скрыты
            </div>
        `;
        btnBuy.style.display = "block";
        btnAddCart.style.display = "block";
        return;
    }

    // Курс куплен
    btnBuy.style.display = "none";
    btnAddCart.style.display = "none";

    if (c.lessons.length === 0) {
        lessonsList.innerHTML = `У этого курса пока нет уроков`;
        return;
    }

    // Первое видео
    videoBlock.innerHTML = `
        <video controls src="${API + c.lessons[0].video_url}"></video>
    `;

    // Список уроков
    lessonsList.innerHTML = "";
    c.lessons.forEach((l, index) => {
        const item = document.createElement("div");
        item.className = "lesson-item";
        if (index === 0) item.classList.add("active");

        item.innerHTML = `
            <div class="lesson-index">${index + 1}</div>
            <div class="lesson-title">${l.title}</div>
        `;

        item.onclick = () => {
            document.querySelectorAll(".lesson-item").forEach(e => e.classList.remove("active"));
            item.classList.add("active");

            videoBlock.innerHTML = `
                <video controls src="${API + l.video_url}"></video>
            `;
        };

        lessonsList.appendChild(item);
    });
}

async function buyCourse(courseId) {
    const res = await api("/api/cart/add", "POST", { course_id: courseId });
    if (res.error) { showMessage(res.error, "error"); return; }

    const pay = await api("/api/cart/checkout", "POST");
    if (pay.error) { showMessage(pay.error, "error"); return; }

    showMessage("Курс успешно куплен!", "success");
    setTimeout(() => location.reload(), 700);
}

async function addToCart(courseId) {
    const res = await api("/api/cart/add", "POST", { course_id: courseId });
    if (res.error) showMessage(res.error, "error");
    else showMessage("Добавлено в корзину", "success");
}

// ============================================================
// CART PAGE
// ============================================================

async function loadCart() {
    const block = document.querySelector("#cartItems");
    const summaryTotal = document.querySelector("#cartTotal");
    if (!block) return;

    const res = await api("/api/cart");
    if (!res) return;

    if (res.items.length === 0) {
        block.innerHTML = `<div class="cart-empty">Корзина пуста</div>`;
        summaryTotal.innerText = "0 ₸";
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
                <button class="btn btn-outline" onclick="removeFromCart(${item.course_id})">
                    Удалить
                </button>
            </div>
        `;
        block.appendChild(row);
    });

    summaryTotal.innerText = res.total + " ₸";
}

async function removeFromCart(id) {
    const res = await api("/api/cart/remove", "POST", { course_id: id });
    if (!res.error) {
        showMessage("Удалено", "success");
        loadCart();
    }
}

async function checkoutCart() {
    const res = await api("/api/cart/checkout", "POST");
    if (res.error) showMessage(res.error, "error");
    else {
        showMessage("Покупка успешна!", "success");
        setTimeout(() => location.href = "profile.html", 800);
    }
}

// ============================================================
// PROFILE PAGE
// ============================================================

async function loadProfile() {
    const userBlock = document.querySelector("#profileUser");
    const coursesBlock = document.querySelector("#myCourses");
    if (!userBlock) return;

    const me = await api("/api/me");
    if (!me || !me.user) {
        showMessage("Ошибка профиля", "error");
        return;
    }

    const u = me.user;
    userBlock.innerHTML = `
        <div class="profile-top">
            <div class="avatar avatar-lg">
                ${u.avatar_url ? `<img src="${API + u.avatar_url}">` : u.name.charAt(0)}
            </div>

            <div class="profile-info">
                <div class="profile-name">${u.name || u.phone}</div>
                <div class="profile-meta">${u.email || "Нет email"}</div>
                <div class="profile-meta">${u.phone}</div>
            </div>
        </div>
    `;

    // Мои курсы
    const res = await api("/api/my-courses");
    if (!res || !res.courses) {
        coursesBlock.innerHTML = "Ошибка загрузки";
        return;
    }

    if (res.courses.length === 0) {
        coursesBlock.innerHTML = `<div class="cart-empty">Нет купленных курсов</div>`;
        return;
    }

    coursesBlock.innerHTML = "";
    res.courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";
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
            </div>
        `;
        coursesBlock.appendChild(card);
    });
}

async function uploadAvatar() {
    const file = document.querySelector("#avatarFile").files[0];
    if (!file) {
        showMessage("Выберите файл", "error");
        return;
    }

    const form = new FormData();
    form.append("file", file);

    const res = await api("/api/user/avatar", "POST", form, true);
    if (res.error) {
        showMessage(res.error, "error");
        return;
    }

    showMessage("Аватар обновлён!", "success");
    setTimeout(() => location.reload(), 600);
}

// ============================================================
// ADMIN PAGE
// ============================================================

async function adminUploadImage() {
    const file = document.querySelector("#adminCourseImage").files[0];
    if (!file) {
        showMessage("Выберите изображение", "error");
        return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("type", "course");

    const res = await api("/api/upload/image", "POST", form, true);
    if (res.error) {
        showMessage(res.error, "error");
        return;
    }

    document.querySelector("#adminImagePreview").innerHTML = `
        <img src="${API + res.url}" style="border-radius:14px;">
    `;

    window._newCourseImage = res.url;
    showMessage("Фото загружено!", "success");
}

async function adminUploadVideo() {
    const file = document.querySelector("#adminLessonVideo").files[0];
    const cid = document.querySelector("#adminLessonCourseId").value;
    if (!file || !cid) {
        showMessage("Выберите курс и файл видео", "error");
        return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("course_id", cid);

    const res = await api("/api/upload/video", "POST", form, true);
    if (res.error) {
        showMessage(res.error, "error");
        return;
    }

    window._newLessonVideo = res.url;

    document.querySelector("#adminVideoPreview").innerHTML = `
        <video controls src="${API + res.url}" style="border-radius:14px;"></video>
    `;

    showMessage("Видео загружено!", "success");
}

async function adminCreateCourse() {
    const title = document.querySelector("#adminTitle").value.trim();
    const description = document.querySelector("#adminDesc").value.trim();
    const price = document.querySelector("#adminPrice").value.trim();
    const image_url = window._newCourseImage;

    if (!title || !image_url) {
        showMessage("Заполните все поля и загрузите фото курса", "error");
        return;
    }

    const res = await api("/api/admin/courses", "POST", {
        title, description, price, image_url
    });

    if (res.error) {
        showMessage(res.error, "error");
        return;
    }

    showMessage("Курс создан!", "success");
}

async function adminCreateLesson() {
    const cid = document.querySelector("#adminLessonCourseId").value.trim();
    const title = document.querySelector("#adminLessonTitle").value.trim();
    const video = window._newLessonVideo;
    const order = document.querySelector("#adminLessonOrder").value.trim() || 0;

    if (!cid || !title || !video) {
        showMessage("Все поля обязательны", "error");
        return;
    }

    const res = await api("/api/admin/lessons", "POST", {
        course_id: cid,
        title,
        video_url: video,
        order_index: order
    });

    if (res.error) {
        showMessage(res.error, "error");
        return;
    }

    showMessage("Урок добавлен!", "success");
}

// ============================================================
// AUTO INIT

renderNavbarUser();
loadCourses();
loadCoursePage();
loadCart();
loadProfile();
