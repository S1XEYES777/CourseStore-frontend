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
// REGISTRATION
// ================================
async function registerUser(e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();

    const res = await fetch(API + "/api/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, phone, password})
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
// LOGIN
// ================================
async function loginUser(e) {
    e.preventDefault();

    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();

    const res = await fetch(API + "/api/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({phone, password})
    });

    const data = await res.json();

    if (data.status === "ok") {
        saveUser(data.user);
        toast("Вход выполнен!", "success");

        // админ
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
// LOAD COURSES ON MAIN PAGE
// ================================
async function loadCourses() {
    const list = document.getElementById("courses-list");
    if (!list) return;

    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

    list.innerHTML = "";

    if (!courses.length) {
        list.innerHTML = "<p>Курсы пока не добавлены.</p>";
        return;
    }

    const user = getUser();
    let purchasedIds = [];

    if (user) {
        const r = await fetch(`${API}/api/purchases/${user.id}`);
        const my = await r.json();
        purchasedIds = my.map(c => c.id);
    }

    courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";

        const img = document.createElement("div");
        img.className = "course-image";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const title = document.createElement("div");
        title.className = "course-title";
        title.innerText = c.title;

        const author = document.createElement("div");
        author.className = "course-author";
        author.innerText = "Автор: " + c.author;

        const price = document.createElement("div");
        price.className = "course-price";
        price.innerText = c.price + " ₸";

        const btnRow = document.createElement("div");
        btnRow.style.display = "flex";
        btnRow.style.gap = "8px";

        const openBtn = document.createElement("button");
        openBtn.className = "btn small";
        openBtn.innerText = "Открыть";
        openBtn.onclick = () => openCourse(c.id);

        btnRow.appendChild(openBtn);

        if (user && !purchasedIds.includes(c.id)) {
            const cartBtn = document.createElement("button");
            cartBtn.className = "btn small";
            cartBtn.innerText = "В корзину";
            cartBtn.onclick = () => addToCart(user.id, c.id);
            btnRow.appendChild(cartBtn);
        } else if (user && purchasedIds.includes(c.id)) {
            card.classList.add("owned-course");
        }

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(author);
        card.appendChild(price);
        card.appendChild(btnRow);

        list.appendChild(card);
    });
}

// ================================
// ADD TO CART
// ================================
async function addToCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id, course_id})
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Добавлено в корзину!", "success");
    } else {
        toast(data.message || "Ошибка добавления в корзину", "error");
    }
}

// ================================
// LOAD CART (как ютуб-карточки)
// ================================
async function loadCart() {
    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const list = document.getElementById("cart-list");
    if (!list) return;

    const res = await fetch(`${API}/api/cart/${user.id}`);
    const courses = await res.json();

    if (!courses.length) {
        list.innerHTML = "<p>Ваша корзина пуста.</p>";
        return;
    }

    list.innerHTML = "";

    courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";

        const img = document.createElement("div");
        img.className = "course-image";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const title = document.createElement("div");
        title.className = "course-title";
        title.innerText = c.title;

        const price = document.createElement("div");
        price.className = "course-price";
        price.innerText = c.price + " ₸";

        const btnRow = document.createElement("div");
        btnRow.style.display = "flex";
        btnRow.style.justifyContent = "space-between";
        btnRow.style.marginTop = "10px";

        const openBtn = document.createElement("button");
        openBtn.className = "btn small";
        openBtn.innerText = "Открыть";
        openBtn.onclick = () => openCourse(c.id);

        const delBtn = document.createElement("button");
        delBtn.className = "btn small";
        delBtn.innerText = "Удалить";
        delBtn.onclick = () => removeFromCart(user.id, c.id);

        btnRow.appendChild(openBtn);
        btnRow.appendChild(delBtn);

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(price);
        card.appendChild(btnRow);

        list.appendChild(card);
    });
}

// ================================
// REMOVE FROM CART
// ================================
async function removeFromCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id, course_id})
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Удалено из корзины", "success");
        loadCart();
    } else {
        toast(data.message || "Ошибка удаления", "error");
    }
}

// ================================
// CHECKOUT (покупка за баланс)
// ================================
async function checkout() {
    const user = getUser();
    if (!user) return toast("Сначала войдите!", "error");

    const res = await fetch(API + "/api/cart/checkout/" + user.id, { method: "POST" });
    const data = await res.json();

    if (data.status === "ok") {
        toast("Покупка успешна!", "success");
        // обновим баланс в localStorage, если пришел
        if (typeof data.balance !== "undefined") {
            user.balance = data.balance;
            saveUser(user);
        }
        setTimeout(() => {
            window.location.href = "profile.html";
        }, 800);
    } else {
        toast(data.message || "Ошибка покупки", "error");
    }
}

// ================================
// COURSE MODAL LOGIC
// ================================
function closeCourse() {
    const viewer = document.getElementById("course-viewer");
    if (viewer) viewer.style.display = "none";
}

// открыть курс
async function openCourse(id) {
    const viewer = document.getElementById("course-viewer");
    const box = document.getElementById("course-content");
    if (!viewer || !box) return;

    viewer.style.display = "flex";
    box.innerHTML = "<h3>Загрузка курса...</h3>";

    let res = await fetch(API + "/api/courses");
    let all = await res.json();
    let c = all.find(x => x.id == id);

    if (!c) {
        box.innerHTML = "<p>Курс не найден.</p>";
        return;
    }

    const user = getUser();
    let bought = false;

    if (user) {
        let r = await fetch(API + "/api/purchases/" + user.id);
        let my = await r.json();
        bought = my.some(x => x.id == id);
    }

    box.innerHTML = `
        <h2>${c.title}</h2>
        <img src="${API}/uploads/${c.image}" style="width:300px;border-radius:10px;max-width:100%;display:block;margin-bottom:15px;">
        <p>${c.description}</p>

        <div id="lessons-area">
            ${
                bought 
                ? "<p>Загрузка уроков...</p>" 
                : "<p style='color:red;font-weight:bold;'>Чтобы увидеть уроки — купите курс.</p>"
            }
        </div>
    `;

    if (bought && user) {
        loadLessons(id, user.id);
    }
}

// Загрузить уроки
async function loadLessons(course_id, user_id) {
    let res = await fetch(`${API}/api/get_lessons?course_id=${course_id}&user_id=${user_id}`);
    let data = await res.json();

    if (data.status === "error") {
        document.getElementById("lessons-area").innerHTML = "<p>Нет доступа</p>";
        return;
    }

    let html = "<h3>Уроки:</h3>";

    data.lessons.forEach(l => {
        html += `
            <div style="margin-bottom:20px;">
                <b>${l.title}</b><br>
                <video src="${API}${l.url}" controls style="width:100%;border-radius:10px;"></video>
            </div>
        `;
    });

    document.getElementById("lessons-area").innerHTML = html;
}

// ================================
// PROFILE: загрузка профиля, аватар, покупки, баланс
// ================================
async function loadProfile() {
    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const nameEl = document.getElementById("profile-name");
    const phoneEl = document.getElementById("profile-phone");
    const avatarImg = document.getElementById("profile-avatar");

    if (nameEl) nameEl.innerText = user.name;
    if (phoneEl) phoneEl.innerText = user.phone;

    if (avatarImg) {
        // если аватар уже загружен
        if (user.avatar) {
            avatarImg.src = `${API}/uploads/${user.avatar}`;
        }
        // если нет — просто оставляем то, что стоит в HTML (не даём 404)
    }
}

async function uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;

    const user = getUser();
    if (!user) {
        toast("Сначала войдите", "error");
        return;
    }

    const form = new FormData();
    form.append("avatar", file);

    const res = await fetch(`${API}/api/upload_avatar/${user.id}`, {
        method: "POST",
        body: form
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Аватар обновлён!", "success");
        // data.url = "/uploads/filename"
        const filename = data.url.replace("/uploads/", "");
        user.avatar = filename;
        saveUser(user);
        loadProfile();
    } else {
        toast(data.message || "Ошибка загрузки аватара", "error");
    }
}

// покупки пользователя (как ютуб-карточки)
async function loadPurchases() {
    const user = getUser();
    if (!user) return;

    const box = document.getElementById("my-courses");
    if (!box) return;

    const res = await fetch(`${API}/api/purchases/${user.id}`);
    const courses = await res.json();

    if (!courses.length) {
        box.innerHTML = "<p>У вас пока нет купленных курсов.</p>";
        return;
    }

    box.innerHTML = "";

    courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";

        const img = document.createElement("div");
        img.className = "course-image";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const title = document.createElement("div");
        title.className = "course-title";
        title.innerText = c.title;

        const price = document.createElement("div");
        price.className = "course-price";
        price.innerText = c.price + " ₸";

        const btn = document.createElement("button");
        btn.className = "btn small";
        btn.innerText = "Смотреть";
        btn.onclick = () => openCourse(c.id);

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(price);
        card.appendChild(btn);

        box.appendChild(card);
    });
}

// баланс
async function loadBalance() {
    const user = getUser();
    if (!user) return;

    const balanceEl = document.getElementById("profile-balance");
    if (!balanceEl) return;

    const res = await fetch(`${API}/api/balance/${user.id}`);
    const data = await res.json();

    if (data.status === "ok") {
        balanceEl.innerText = data.balance + " ₸";
        // обновим в localStorage
        user.balance = data.balance;
        saveUser(user);
    }
}

async function addBalance(e) {
    if (e) e.preventDefault();

    const user = getUser();
    if (!user) {
        toast("Сначала войдите!", "error");
        return;
    }

    const input = document.getElementById("balance-input");
    if (!input) return;

    const amount = parseInt(input.value);
    if (!amount || amount <= 0) {
        toast("Введите сумму пополнения", "error");
        return;
    }

    const res = await fetch(`${API}/api/add_balance/${user.id}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({amount})
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Баланс пополнен!", "success");
        input.value = "";
        loadBalance();
    } else {
        toast(data.message || "Ошибка пополнения", "error");
    }
}

// ================================
// AUTOLOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
    // главная
    if (document.getElementById("courses-list")) {
        loadCourses();
    }

    // профиль
    if (document.body.classList.contains("profile-page")) {
        loadProfile();
        loadPurchases();
        loadBalance();
    }

    // корзина
    if (document.body.classList.contains("cart-page")) {
        loadCart();
    }

    // показать ссылку "Админка" для админа (на главной и др. страницах)
    const u = getUser();
    const adminLink = document.getElementById("adminLink");
    if (adminLink && u && u.phone === "77750476284") {
        adminLink.style.display = "inline-block";
    }
});
