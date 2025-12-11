// ================================
// CONFIG
// ================================
const API = "https://coursestore-backend.onrender.com";

// ================================
// USER LOCAL STORAGE
// ================================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    let u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ================================
// TOAST
// ================================
function toast(message, type = "info") {
    let box = document.querySelector(".toast-box");
    if (!box) {
        box = document.createElement("div");
        box.className = "toast-box";
        document.body.appendChild(box);
    }

    const t = document.createElement("div");
    t.className = "toast " + type;
    t.innerText = message;

    box.appendChild(t);

    setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// ================================
// AUTH: REGISTRATION
// ================================
async function registerUser(e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password })
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Регистрация успешна", "success");
        saveUser(data.user);
        setTimeout(() => window.location.href = "profile.html", 600);
    } else {
        toast(data.message || "Ошибка регистрации", "error");
    }
}

// ================================
// AUTH: LOGIN
// ================================
async function loginUser(e) {
    e.preventDefault();

    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
    });

    const data = await res.json();

    if (data.status === "ok") {
        saveUser(data.user);
        toast("Вход выполнен!", "success");

        if (data.user.phone === "77750476284") {
            setTimeout(() => window.location.href = "admin.html", 800);
        } else {
            setTimeout(() => window.location.href = "profile.html", 800);
        }
    } else {
        toast(data.message || "Ошибка входа", "error");
    }
}

// ================================
// API HELPERS
// ================================
async function apiGetCourses() {
    const res = await fetch(API + "/api/courses");
    return await res.json();
}

async function apiGetPurchases(userId) {
    const res = await fetch(`${API}/api/purchases/${userId}`);
    return await res.json();
}

async function apiGetCart(userId) {
    const res = await fetch(`${API}/api/cart/${userId}`);
    return await res.json();
}

function isCourseBought(courseId, purchases) {
    return purchases.some(c => c.id === courseId);
}

function isCourseInCart(courseId, cartCourses) {
    return cartCourses.some(c => c.id === courseId);
}

// ================================
// INDEX: ЗАГРУЗКА КУРСОВ
// ================================
async function loadCourses() {
    const list = document.getElementById("courses-list");
    if (!list) return;

    const user = getUser();
    let purchases = [];
    let cartCourses = [];

    if (user) {
        try { purchases = await apiGetPurchases(user.id); } catch (e) {}
        try { cartCourses = await apiGetCart(user.id); } catch (e) {}
    }

    const courses = await apiGetCourses();

    list.innerHTML = "";

    if (!courses.length) {
        list.innerHTML = "<p>Курсы пока не добавлены.</p>";
        return;
    }

    courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";

        const img = document.createElement("div");
        img.className = "course-image";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const info = document.createElement("div");
        info.className = "course-info";

        const title = document.createElement("div");
        title.className = "course-title";
        title.innerText = c.title;

        const author = document.createElement("div");
        author.className = "course-author";
        author.innerText = "Автор: " + c.author;

        const price = document.createElement("div");
        price.className = "course-price";
        price.innerText = c.price + " ₸";

        const btn = document.createElement("button");
        btn.className = "btn btn-blue";

        let bought = false;
        let inCart = false;

        if (user) {
            bought = isCourseBought(c.id, purchases);
            inCart = isCourseInCart(c.id, cartCourses);
        }

        if (bought) {
            btn.innerText = "Открыть";
            btn.onclick = () => openCourse(c.id);
        } else if (user) {
            if (inCart) {
                btn.innerText = "В корзине";
                btn.disabled = true;
            } else {
                btn.innerText = "Добавить в корзину";
                btn.onclick = () => addToCart(user.id, c.id);
            }
        } else {
            btn.innerText = "Войти";
            btn.onclick = () => window.location.href = "login.html";
        }

        info.appendChild(title);
        info.appendChild(author);
        info.appendChild(price);
        info.appendChild(btn);

        card.appendChild(img);
        card.appendChild(info);
        list.appendChild(card);
    });
}

// ================================
// CART
// ================================
async function addToCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, course_id })
    });

    const data = await res.json();

    if (data.status === "ok") toast("Добавлено в корзину!", "success");
    else toast(data.message || "Ошибка", "error");
}

async function removeFromCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, course_id })
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Удалено", "success");
        loadCart();
    } else toast("Ошибка", "error");
}

async function loadCart() {
    const user = getUser();
    if (!user) return window.location.href = "login.html";

    const box = document.getElementById("cart-list");
    const totalEl = document.getElementById("cart-total");
    if (!box) return;

    const courses = await apiGetCart(user.id);
    box.innerHTML = "";

    if (!courses.length) {
        box.innerHTML = "<p>Корзина пуста.</p>";
        if (totalEl) totalEl.innerText = "0 ₸";
        return;
    }

    let total = 0;

    courses.forEach(c => {
        total += c.price;

        const card = document.createElement("div");
        card.className = "course-card";

        const img = document.createElement("div");
        img.className = "course-image";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const info = document.createElement("div");
        info.className = "course-info";

        const title = document.createElement("div");
        title.className = "course-title";
        title.innerText = c.title;

        const price = document.createElement("div");
        price.className = "course-price";
        price.innerText = c.price + " ₸";

        const btns = document.createElement("div");
        btns.style.display = "flex";
        btns.style.gap = "10px";

        const openBtn = document.createElement("button");
        openBtn.className = "btn btn-blue";
        openBtn.innerText = "Подробнее";
        openBtn.onclick = () => openCourse(c.id);

        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-red";
        delBtn.innerText = "Удалить";
        delBtn.onclick = () => removeFromCart(user.id, c.id);

        btns.appendChild(openBtn);
        btns.appendChild(delBtn);

        info.appendChild(title);
        info.appendChild(price);
        info.appendChild(btns);

        card.appendChild(img);
        card.appendChild(info);
        box.appendChild(card);
    });

    if (totalEl) totalEl.innerText = total + " ₸";
}

async function checkout() {
    const user = getUser();
    if (!user) return toast("Войдите!", "error");

    const res = await fetch(`${API}/api/cart/checkout/${user.id}`, {
        method: "POST"
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Покупка успешна!", "success");

        // обновляем баланс у пользователя
        user.balance = data.balance;
        saveUser(user);

        loadCart();
    } else {
        toast(data.message || "Ошибка", "error");
    }
}

// ================================
// COURSE MODAL + LESSONS
// ================================
function closeCourse() {
    const v = document.getElementById("course-viewer");
    if (v) v.style.display = "none";
}

async function openCourse(id) {
    const viewer = document.getElementById("course-viewer");
    const box = document.getElementById("course-content");
    if (!viewer || !box) return;

    viewer.style.display = "flex";
    box.innerHTML = "Загрузка...";

    const all = await apiGetCourses();
    const c = all.find(x => x.id == id);
    if (!c) {
        box.innerHTML = "<p>Курс не найден</p>";
        return;
    }

    const user = getUser();
    let bought = false;

    if (user) {
        const my = await apiGetPurchases(user.id);
        bought = isCourseBought(id, my);
    }

    box.innerHTML = `
        <h2>${c.title}</h2>
        <img src="${API}/uploads/${c.image}" style="width:300px;border-radius:12px;margin-bottom:15px;">
        <p>${c.description}</p>

        <div id="lessons-area">
            ${bought ? "<p>Загрузка уроков...</p>" :
                "<p style='color:red;font-weight:bold;'>Купите курс, чтобы увидеть уроки</p>"}
        </div>
    `;

    if (bought && user) {
        loadLessons(id, user.id);
    }
}

async function loadLessons(course_id, user_id) {
    const res = await fetch(`${API}/api/get_lessons?course_id=${course_id}&user_id=${user_id}`);
    const data = await res.json();

    const area = document.getElementById("lessons-area");
    if (!area) return;

    if (data.status === "error") {
        area.innerHTML = "<p>Нет доступа</p>";
        return;
    }

    let html = "<h3>Уроки:</h3>";
    data.lessons.forEach(l => {
        html += `
            <div style="margin-bottom:20px;">
                <b>${l.title}</b><br>
                <video src="${API}${l.url}" controls style="width:100%;max-width:500px;border-radius:10px;"></video>
            </div>
        `;
    });

    area.innerHTML = html;
}

// ================================
// PROFILE: данные + аватар + баланс + мои курсы
// ================================
async function loadProfile() {
    const user = getUser();
    if (!user) return window.location.href = "login.html";

    const nameEl = document.getElementById("profile-name");
    const phoneEl = document.getElementById("profile-phone");
    const balanceEl = document.getElementById("profile-balance");
    const avatarImg = document.getElementById("profile-avatar");

    if (nameEl) nameEl.innerText = user.name;
    if (phoneEl) phoneEl.innerText = user.phone;
    if (balanceEl) balanceEl.innerText = (user.balance || 0) + " ₸";

    if (avatarImg) {
        if (user.avatar) {
            avatarImg.src = `${API}/uploads/${user.avatar}`;
            avatarImg.style.display = "block";
        } else {
            // если нет авы — можно скрыть
            // avatarImg.style.display = "none";
            // или оставить дефолтную картинку, как у тебя в HTML
        }
    }
}

async function loadPurchases() {
    const user = getUser();
    if (!user) return;

    const box = document.getElementById("my-courses");
    if (!box) return;

    const courses = await apiGetPurchases(user.id);

    box.innerHTML = "";
    if (!courses.length) {
        box.innerHTML = "<p>Нет купленных курсов</p>";
        return;
    }

    courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";

        const img = document.createElement("div");
        img.className = "course-image";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const info = document.createElement("div");
        info.className = "course-info";

        const title = document.createElement("div");
        title.className = "course-title";
        title.innerText = c.title;

        const price = document.createElement("div");
        price.className = "course-price";
        price.innerText = c.price + " ₸";

        const btn = document.createElement("button");
        btn.className = "btn btn-blue";
        btn.innerText = "Открыть курс";
        btn.onclick = () => openCourse(c.id);

        info.appendChild(title);
        info.appendChild(price);
        info.appendChild(btn);

        card.appendChild(img);
        card.appendChild(info);
        box.appendChild(card);
    });
}

async function uploadAvatar(e) {
    const user = getUser();
    if (!user) {
        toast("Сначала войдите", "error");
        return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("avatar", file);

    const res = await fetch(`${API}/api/upload_avatar/${user.id}`, {
        method: "POST",
        body: form
    });

    const data = await res.json();

    if (data.status === "ok") {
        user.avatar = data.url.replace("/uploads/", "");
        saveUser(user);
        loadProfile();
        toast("Аватар обновлён!", "success");
    } else {
        toast(data.message || "Ошибка аватара", "error");
    }
}

async function addBalance(e) {
    e.preventDefault?.(); // если вызывается из form

    const user = getUser();
    if (!user) {
        toast("Сначала войдите", "error");
        return;
    }

    const input = document.getElementById("balance-input");
    if (!input) {
        toast("Поле суммы не найдено", "error");
        return;
    }

    const amount = parseInt(input.value);
    if (!amount || amount <= 0) {
        toast("Введите сумму", "error");
        return;
    }

    const res = await fetch(`${API}/api/balance/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
    });

    const data = await res.json();

    if (data.status === "ok") {
        user.balance = data.balance;
        saveUser(user);

        const balanceEl = document.getElementById("profile-balance");
        if (balanceEl) balanceEl.innerText = user.balance + " ₸";

        toast("Баланс пополнен!", "success");
        input.value = "";
    } else {
        toast("Ошибка пополнения баланса", "error");
    }
}

// ================================
// ADMIN (если захочешь вынести сюда)
// ================================
async function uploadCourse(e) {
    e.preventDefault();

    const form = new FormData();
    form.append("title", document.getElementById("course-title").value);
    form.append("price", document.getElementById("course-price").value);
    form.append("author", document.getElementById("course-author").value);
    form.append("description", document.getElementById("course-description").value);
    form.append("image", document.getElementById("course-image").files[0]);

    const res = await fetch(API + "/api/add_course", {
        method: "POST",
        body: form
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Курс добавлен!", "success");
    } else {
        toast(data.message || "Ошибка", "error");
    }
}

// ================================
// AUTOLOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
    // Главная
    if (document.getElementById("courses-list")) {
        loadCourses();
    }

    // Профиль
    if (document.body.classList.contains("profile-page")) {
        loadProfile();
        loadPurchases();

        const avatarInput = document.getElementById("avatar-input");
        if (avatarInput) {
            avatarInput.addEventListener("change", uploadAvatar);
        }
        // Баланс пополняется через кнопку onclick="addBalance(event)" в profile.html
    }

    // Корзина
    if (document.body.classList.contains("cart-page")) {
        loadCart();
    }
});
