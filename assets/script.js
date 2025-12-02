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
// LOGIN
// ================================
async function loginUser(phone, password) {
    if (!phone || !password) {
        showMessage("Введите телефон и пароль", "error");
        return;
    }

    let r = await fetch(API + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
    });

    let data = await r.json();

    if (data.status !== "ok") {
        showMessage(data.message, "error");
        return;
    }

    // ===== ADMIN LOGIN =====
    if (phone === "77750476284" && password === "777") {
        data.user.isAdmin = true;
        saveUser(data.user);
        showMessage("Добро пожаловать, Админ!", "success");
        setTimeout(() => window.location.href = "admin.html", 300);
        return;
    }

    // ===== USER LOGIN =====
    saveUser(data.user);
    window.location.href = "index.html";
}

// ================================
// REGISTER
// ================================
async function registerUser(name, phone, password) {
    if (!name || !phone || !password) {
        showMessage("Заполните все поля", "error");
        return;
    }

    let r = await fetch(API + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password })
    });

    let data = await r.json();

    if (data.status !== "ok") {
        showMessage(data.message, "error");
        return;
    }

    saveUser(data.user);
    window.location.href = "index.html";
}

// ================================
// CATALOG (главная/каталог)
// ================================
async function loadCatalog() {
    let r = await fetch(API + "/api/courses");
    let data = await r.json();

    const list = document.getElementById("catalogList");
    if (!list) return;

    list.innerHTML = "";

    data.courses.forEach(course => {
        let div = document.createElement("div");
        div.className = "course-card";

        const imgSrc = course.image || "assets/no-image.png";

        div.innerHTML = `
            <img src="${imgSrc}" class="course-thumb" alt="${course.title}">
            <h3>${course.title}</h3>
            <p>${course.author || ""}</p>
            <div class="course-price">${course.price} ₸</div>
            <button class="btn-primary" onclick="openCourse(${course.id})">Открыть</button>
        `;
        list.appendChild(div);
    });
}

function openCourse(id) {
    localStorage.setItem("currentCourse", id);
    window.location.href = "course.html";
}

// ================================
// COURSE PAGE
// ================================
async function loadCoursePage() {
    let cid = localStorage.getItem("currentCourse");
    if (!cid) return;

    let r = await fetch(API + "/api/course?course_id=" + cid);
    let data = await r.json();

    if (data.status !== "ok") {
        showMessage(data.message || "Ошибка загрузки курса", "error");
        return;
    }

    const course = data.course;

    document.getElementById("courseImg").src = course.image || "assets/no-image.png";
    document.getElementById("courseTitle").innerText = course.title;
    document.getElementById("courseAuthor").innerText = course.author || "";
    document.getElementById("coursePrice").innerText = course.price + " ₸";
    document.getElementById("courseDescription").innerText = course.description || "";

    let list = document.getElementById("lessonList");
    list.innerHTML = "";

    data.lessons.forEach(l => {
        let url = l.video_url || "";
        if (url.includes("/view")) url = url.replace("/view", "/preview");
        let open = url.replace("/preview", "/view");

        let block = document.createElement("div");
        block.className = "lesson-item";
        block.innerHTML = `
            <span>${l.id}. ${l.title}</span>
            <div>
                <button class="btn-small" onclick="playLesson('${url}')">▶ Смотреть</button>
                <a class="btn-link" href="${open}" target="_blank">Drive</a>
            </div>
        `;
        list.appendChild(block);
    });
}

function playLesson(url) {
    if (!url) return;
    document.getElementById("videoPlayer").innerHTML = `
        <iframe src="${url}" width="100%" height="420" allow="autoplay"></iframe>
    `;
}

// ================================
// CART
// ================================
async function addToCart(id) {
    let u = getUser();
    if (!u) {
        showMessage("Войдите в аккаунт", "error");
        return;
    }

    await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: u.user_id,
            course_id: id
        })
    });

    showMessage("Добавлено в корзину", "success");
}

async function loadCart() {
    let u = getUser();
    if (!u) return;

    let r = await fetch(API + "/api/cart?user_id=" + u.user_id);
    let data = await r.json();

    let block = document.getElementById("cartList");
    if (!block) return;

    block.innerHTML = "";
    let total = 0;

    data.items.forEach(it => {
        total += it.price;

        block.innerHTML += `
            <div class="cart-item">
                <img src="${it.image || 'assets/no-image.png'}">
                <div>
                    <h4>${it.title}</h4>
                    <div>${it.price} ₸</div>
                </div>
                <button class="btn-danger" onclick="removeFromCart(${it.cart_id})">Удалить</button>
            </div>
        `;
    });

    document.getElementById("cartTotal").innerText = total + " ₸";
}

async function removeFromCart(id) {
    await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: id })
    });
    loadCart();
}

async function buyCart() {
    let u = getUser();
    if (!u) return;

    let r = await fetch(API + "/api/cart/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.user_id })
    });

    let data = await r.json();

    if (data.status !== "ok") {
        showMessage(data.message, "error");
        return;
    }

    showMessage("Покупка успешна!", "success");
    loadCart();
}

// ================================
// PROFILE
// ================================
async function loadProfile() {
    let u = getUser();
    if (!u) {
        window.location.href = "login.html";
        return;
    }

    let r = await fetch(API + "/api/user?user_id=" + u.user_id);
    let data = await r.json();

    if (data.status !== "ok") {
        showMessage(data.message || "Ошибка профиля", "error");
        return;
    }

    let user = data.user;

    if (document.getElementById("p_name")) {
        document.getElementById("p_name").innerText = user.name;
        document.getElementById("p_phone").innerText = user.phone;
        document.getElementById("p_balance").innerText = user.balance;
        document.getElementById("p_avatar").src = user.avatar || "https://i.imgur.com/ZKLRtYk.png";
    }

    if (document.getElementById("myCourses")) {
        loadMyCourses();
    }
}

// Пополнение баланса (используется, если нет inline-версии)
async function sendTopUp() {
    let amount = +document.getElementById("topupAmount").value;
    let u = getUser();

    if (!amount || amount < 1) {
        showMessage("Введите сумму", "error");
        return;
    }

    let r = await fetch(API + "/api/add-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.user_id, amount })
    });

    let data = await r.json();

    if (data.status === "ok") {
        showMessage("Баланс пополнен!", "success");
        loadProfile();
        closeTopUp && closeTopUp();
    } else {
        showMessage(data.message || "Ошибка пополнения", "error");
    }
}

function openTopUp() {
    const m = document.getElementById("topupModal");
    if (m) m.style.display = "flex";
}
function closeTopUp() {
    const m = document.getElementById("topupModal");
    if (m) m.style.display = "none";
}

async function loadMyCourses() {
    let u = getUser();
    if (!u) return;

    let r = await fetch(API + "/api/my-courses?user_id=" + u.user_id);
    let data = await r.json();

    let list = document.getElementById("myCourses");
    if (!list) return;

    list.innerHTML = "";

    data.courses.forEach(c => {
        list.innerHTML += `
            <div class="course-card">
                <img src="${c.image || 'assets/no-image.png'}">
                <h3>${c.title}</h3>
                <button onclick="openCourse(${c.id})" class="btn-primary">Открыть</button>
            </div>
        `;
    });
}

// ================================
// ADMIN SECURITY
// ================================
function checkAdmin() {
    const u = getUser();
    if (!u || !u.isAdmin) {
        alert("Доступ запрещён");
        window.location.href = "index.html";
    }
}

// Показ вкладок
function adminShowTab(tab) {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.add("hidden"));
    const el = document.getElementById("tab_" + tab);
    if (el) el.classList.remove("hidden");

    if (tab === "users") loadAdminUsers();
    if (tab === "courses") loadAdminCourses();
    if (tab === "lessons") {
        loadLessonCourses();
        loadAdminLessons();
    }
    if (tab === "purchases") loadAdminPurchases();
    if (tab === "stats") loadAdminStats();
}

function adminInit() {
    adminShowTab("stats");
}

// ================================
// ADMIN STATS
// ================================
async function loadAdminStats() {
    let r = await fetch(API + "/api/admin/stats");
    let d = await r.json();

    document.getElementById("statUsers").innerText = d.users;
    document.getElementById("statCourses").innerText = d.courses;
    document.getElementById("statPurchases").innerText = d.purchases;
    document.getElementById("statRevenue").innerText = d.revenue;
}

// ================================
// ADMIN USERS
// ================================
async function loadAdminUsers() {
    let r = await fetch(API + "/api/admin/users");
    let d = await r.json();

    const block = document.getElementById("adminUsersList");
    block.innerHTML = "";

    d.users.forEach(u => {
        block.innerHTML += `
            <div class="admin-item">
                <img src="${u.avatar || 'https://i.imgur.com/ZKLRtYk.png'}" class="mini-img">
                <div>
                    <b>${u.name}</b><br>
                    ${u.phone}<br>
                    Баланс: ${u.balance} ₸
                </div>
                <button class="btn-danger" onclick="adminDeleteUser(${u.id})">Удалить</button>
            </div>
        `;
    });
}

async function adminDeleteUser(id) {
    await fetch(API + "/api/admin/users/delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ id })
    });

    loadAdminUsers();
}

// ================================
// ADMIN COURSES
// ================================
async function loadAdminCourses() {
    let r = await fetch(API + "/api/admin/courses");
    let d = await r.json();

    const block = document.getElementById("adminCoursesList");
    block.innerHTML = "";

    d.courses.forEach(c => {
        block.innerHTML += `
            <div class="admin-item">
                <img src="${c.image || 'assets/no-image.png'}" class="mini-img">
                <div>
                    <b>${c.title}</b><br>
                    Автор: ${c.author || ""}<br>
                    Цена: ${c.price} ₸
                </div>
                <button class="btn-danger" onclick="adminDeleteCourse(${c.id})">Удалить</button>
            </div>
        `;
    });
}

// добавление курса с загрузкой файла (base64)
async function adminAddCourse() {
    const title = document.getElementById("adm_title").value.trim();
    const author = document.getElementById("adm_author").value.trim();
    const price = document.getElementById("adm_price").value;
    const descr = document.getElementById("adm_descr").value.trim();
    const file = document.getElementById("adm_image_file").files[0];

    if (!title || !price || !file) {
        showMessage("Введите название, цену и выберите картинку", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result;

        let r = await fetch(API + "/api/admin/courses/add", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                title,
                author,
                price,
                description: descr,
                image: base64
            })
        });

        let d = await r.json();

        if (d.status === "ok") {
            showMessage("Курс добавлен!", "success");
            loadAdminCourses();
        } else {
            showMessage(d.message || "Ошибка добавления курса", "error");
        }
    };

    reader.readAsDataURL(file);
}

async function adminDeleteCourse(id) {
    await fetch(API + "/api/admin/courses/delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ id })
    });
    loadAdminCourses();
}

// ================================
// ADMIN LESSONS
// ================================
async function loadLessonCourses() {
    let r = await fetch(API + "/api/admin/courses");
    let d = await r.json();

    let select = document.getElementById("lesson_course");
    if (!select) return;

    select.innerHTML = "";

    d.courses.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.title}</option>`;
    });
}

async function loadAdminLessons() {
    let r = await fetch(API + "/api/admin/lessons");
    let d = await r.json();

    let list = document.getElementById("adminLessonsList");
    if (!list) return;

    list.innerHTML = "";

    d.lessons.forEach(l => {
        list.innerHTML += `
            <div class="admin-item">
                <div>
                    <b>${l.title}</b><br>
                    Курс: ${l.course_title}<br>
                    ID урока: ${l.id}
                </div>
                <button class="btn-danger" onclick="adminDeleteLessonId(${l.id})">Удалить</button>
            </div>
        `;
    });
}

async function adminAddLesson() {
    const course_id = document.getElementById("lesson_course").value;
    const title = document.getElementById("lesson_title").value.trim();
    const video_url = document.getElementById("lesson_video").value.trim();

    if (!course_id || !title || !video_url) {
        showMessage("Заполните все поля урока", "error");
        return;
    }

    let r = await fetch(API + "/api/admin/lessons/add", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ course_id, title, video_url })
    });

    let d = await r.json();

    if (d.status === "ok") {
        showMessage("Урок добавлен!", "success");
        loadAdminLessons();
    } else {
        showMessage(d.message || "Ошибка добавления урока", "error");
    }
}

async function adminDeleteLesson() {
    const id = document.getElementById("lesson_delete").value;

    if (!id) {
        showMessage("Укажите ID урока", "error");
        return;
    }

    await fetch(API + "/api/admin/lessons/delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ id })
    });

    showMessage("Урок удалён!", "success");
    loadAdminLessons();
}

function adminDeleteLessonId(id) {
    document.getElementById("lesson_delete").value = id;
    adminDeleteLesson();
}

// ================================
// ADMIN PURCHASES
// ================================
async function loadAdminPurchases() {
    let r = await fetch(API + "/api/admin/purchases");
    let d = await r.json();

    const block = document.getElementById("adminPurchasesList");
    block.innerHTML = "";

    d.purchases.forEach(p => {
        block.innerHTML += `
            <div class="admin-item">
                <b>${p.user_name}</b> купил <b>${p.course_title}</b> за ${p.price} ₸
            </div>
        `;
    });
}
