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

    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

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
        toast(data.message, "error");
    }
}

// ================================
// LOGIN
// ================================
async function loginUser(e) {
    e.preventDefault();

    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/api/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({phone, password})
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
        toast(data.message, "error");
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

        const btn = document.createElement("button");
        btn.className = "btn small";
        btn.innerText = "Открыть";

        btn.onclick = () => openCourse(c.id);

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(author);
        card.appendChild(price);
        card.appendChild(btn);

        list.appendChild(card);
    });
}

// ================================
// CART
// ================================
async function addToCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id, course_id})
    });

    const data = await res.json();

    if (data.status === "ok") toast("Добавлено в корзину!", "success");
    else toast(data.message, "error");
}

async function loadCart() {
    const user = getUser();
    if (!user) return;

    const box = document.getElementById("cart-items");
    if (!box) return;

    const res = await fetch(API + "/api/cart/" + user.id);
    const items = await res.json();

    if (!items.length) {
        box.innerHTML = "<p>Корзина пуста.</p>";
        return;
    }

    box.innerHTML = "";
    items.forEach(c => {
        const card = document.createElement("div");
        card.className = "cart-item";

        const img = document.createElement("div");
        img.className = "cart-image";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const title = document.createElement("div");
        title.className = "cart-title";
        title.innerText = c.title;

        card.appendChild(img);
        card.appendChild(title);

        box.appendChild(card);
    });
}

async function checkout() {
    const user = getUser();
    if (!user) return toast("Сначала войдите!", "error");

    const res = await fetch(API + "/api/cart/checkout/" + user.id, { method: "POST" });
    const data = await res.json();

    if (data.status === "ok") {
        toast("Покупка успешна!", "success");
        setTimeout(() => window.location.href = "profile.html", 800);
    } else toast(data.message, "error");
}

// ================================
// COURSE VIEWER
// ================================
function closeCourse() {
    document.getElementById("course-viewer").style.display = "none";
}

async function openCourse(id) {
    const viewer = document.getElementById("course-viewer");
    const box = document.getElementById("course-content");
    viewer.style.display = "flex";

    box.innerHTML = "<h3>Загрузка курса...</h3>";

    let res = await fetch(API + "/api/courses");
    let all = await res.json();
    let c = all.find(x => x.id == id);

    const user = getUser();
    let bought = false;

    if (user) {
        let r = await fetch(API + "/api/purchases/" + user.id);
        let my = await r.json();
        bought = my.some(x => x.id == id);
    }

    box.innerHTML = `
        <h2>${c.title}</h2>
        <img src="${API}/uploads/${c.image}" style="width:300px;border-radius:10px;">
        <p>${c.description}</p>
        <div id="lessons-area">
            ${bought 
                ? "<p>Загрузка уроков...</p>" 
                : "<p style='color:red;font-weight:bold;'>Чтобы увидеть уроки — купите курс.</p>"}
        </div>
    `;

    if (bought) loadLessons(id, user.id);
}

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
// PROFILE + AVATAR
// ================================
async function loadProfile() {
    const user = getUser();
    if (!user) return;

    const avatarImg = document.getElementById("profile-avatar");
    const nameEl = document.getElementById("profile-name");
    const phoneEl = document.getElementById("profile-phone");

    if (nameEl) nameEl.innerText = user.name;
    if (phoneEl) phoneEl.innerText = user.phone;

    if (user.avatar) {
        avatarImg.src = `${API}/uploads/${user.avatar}`;
    } else {
        avatarImg.src =
        "data:image/svg+xml;base64," +
        btoa(`
        <svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
            <circle cx='100' cy='100' r='100' fill='#d9d9d9'/>
        </svg>
        `);
    }
}

async function uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return toast("Выберите фото!", "error");

    const user = getUser();
    const form = new FormData();
    form.append("avatar", file);

    const res = await fetch(`${API}/api/upload_avatar/${user.id}`, {
        method: "POST",
        body: form
    });

    const data = await res.json();

    if (data.status === "ok") {
        user.avatar = data.avatar;
        saveUser(user);
        toast("Аватар обновлён!", "success");
        loadProfile();
    }
}

// ================================
// PURCHASES
// ================================
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

        card.appendChild(img);
        card.appendChild(title);

        box.appendChild(card);
    });
}

// ================================
// AUTOLOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("courses-list")) loadCourses();
    if (document.getElementById("cart-items")) loadCart();

    if (document.body.classList.contains("profile-page")) {
        loadProfile();
        loadPurchases();
    }
});
