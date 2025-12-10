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
        author.style.fontSize = "14px";
        author.style.color = "#555";
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
        toast(data.message, "error");
    }
}

// ================================
// CHECKOUT
// ================================
async function checkout() {
    const user = getUser();
    if (!user) return toast("Сначала войдите!", "error");

    const res = await fetch(API + "/api/cart/checkout/" + user.id, { method: "POST" });
    const data = await res.json();

    if (data.status === "ok") {
        toast("Покупка успешна!", "success");
        setTimeout(() => window.location.href = "profile.html", 800);
    } else {
        toast(data.message, "error");
    }
}

// ================================
// OPEN COURSE VIEW
// ================================
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

    if (bought) {
        loadLessons(id, user.id);
    }
}

// ================================
// LOAD LESSONS
// ================================
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
// PROFILE: load avatar + upload
// ================================
async function loadProfile() {
    const user = getUser();
    if (!user) return;

    const avatar = document.getElementById("profile-avatar");
    const name = document.getElementById("profile-name");

    if (avatar) {
        avatar.src = user.avatar
            ? `${API}/uploads/${user.avatar}`
            : "default-avatar.png";
    }

    if (name) {
        name.innerText = user.name;
    }
}

async function uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;

    const user = getUser();

    const form = new FormData();
    form.append("avatar", file);

    const res = await fetch(`${API}/api/upload_avatar/${user.id}`, {
        method: "POST",
        body: form
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Аватар обновлён!", "success");
        user.avatar = data.url.replace("/uploads/", "");
        saveUser(user);
        loadProfile();
    }
}


// ================================
// ADMIN: upload course image
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
        document.getElementById("admin-form").reset();
    } else {
        toast("Ошибка при добавлении курса", "error");
    }
}


// ================================
// AUTOLOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("courses-list")) loadCourses();
    if (document.getElementById("profile-avatar")) loadProfile();
});
// ================================
// PROFILE PAGE: загрузка профиля и покупок
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
        if (user.avatar) {
            avatarImg.src = `${API}/uploads/${user.avatar}`;
        } else {
            // дефолтная картинка (файл на фронтенде)
            avatarImg.src = "default-avatar.jpg";
        }
    }
}

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

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(price);

        box.appendChild(card);
    });
}

// автозагрузка на странице профиля
document.addEventListener("DOMContentLoaded", () => {
    if (document.body.classList.contains("profile-page")) {
        loadProfile();
        loadPurchases();
    }
});
