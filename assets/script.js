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
// CATALOG
// ================================
async function loadCatalog() {
    let r = await fetch(API + "/api/courses");
    let data = await r.json();

    const list = document.getElementById("catalogList");
    list.innerHTML = "";

    data.courses.forEach(course => {
        let div = document.createElement("div");
        div.className = "course-card";

        div.innerHTML = `
            <img src="${course.image}" class="course-thumb">
            <h3>${course.title}</h3>
            <p>${course.author}</p>
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

    const course = data.course;

    document.getElementById("courseImg").src = course.image;
    document.getElementById("courseTitle").innerText = course.title;
    document.getElementById("courseAuthor").innerText = course.author;
    document.getElementById("coursePrice").innerText = course.price + " ₸";
    document.getElementById("courseDescription").innerText = course.description;

    let list = document.getElementById("lessonList");
    list.innerHTML = "";

    data.lessons.forEach(l => {
        let url = l.video_url;
        if (url.includes("/view")) url = url.replace("/view", "/preview");
        let open = url.replace("/preview", "/view");

        let block = document.createElement("div");
        block.className = "lesson-item";
        block.innerHTML = `
            <span>${l.position}. ${l.title}</span>
            <div>
                <button class="btn-small" onclick="playLesson('${url}')">▶ Смотреть</button>
                <a class="btn-link" href="${open}" target="_blank">Drive</a>
            </div>
        `;
        list.appendChild(block);
    });
}

function playLesson(url) {
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
    let r = await fetch(API + "/api/cart?user_id=" + u.user_id);
    let data = await r.json();

    let block = document.getElementById("cartList");
    block.innerHTML = "";

    let total = 0;

    data.items.forEach(it => {
        total += it.price;

        block.innerHTML += `
            <div class="cart-item">
                <img src="${it.image}">
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
    let r = await fetch(API + "/api/user?user_id=" + u.user_id);
    let data = await r.json();

    let user = data.user;

    document.getElementById("p_name").innerText = user.name;
    document.getElementById("p_phone").innerText = user.phone;
    document.getElementById("p_balance").innerText = user.balance;
    if (user.avatar) document.getElementById("p_avatar").src = user.avatar;

    loadMyCourses();
}

// Пополнение баланса
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
        closeTopUp();
    }
}

function openTopUp() {
    document.getElementById("topupModal").style.display = "flex";
}

function closeTopUp() {
    document.getElementById("topupModal").style.display = "none";
}

async function loadMyCourses() {
    let u = getUser();
    let r = await fetch(API + "/api/my-courses?user_id=" + u.user_id);
    let data = await r.json();

    let list = document.getElementById("myCourses");
    list.innerHTML = "";

    data.courses.forEach(c => {
        list.innerHTML += `
            <div class="course-card">
                <img src="${c.image}">
                <h3>${c.title}</h3>
                <button onclick="openCourse(${c.id})" class="btn-primary">Открыть</button>
            </div>
        `;
    });
}
