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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password })
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Регистрация успешна!", "success");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
    });

    const data = await res.json();

    if (data.status === "ok") {
        saveUser(data.user);
        toast("Вы успешно вошли!", "success");

        // Админ — вход в админку
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
// LOAD COURSES
// ================================
async function loadCourses() {
    const list = document.getElementById("courses-list");
    if (!list) return;

    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

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
// OPEN COURSE (MODAL)
// ================================
async function openCourse(id) {
    const viewer = document.getElementById("course-viewer");
    const box = document.getElementById("course-content");

    viewer.style.display = "flex";
    box.innerHTML = "<h3>Загрузка...</h3>";

    const res = await fetch(API + "/api/courses");
    const all = await res.json();
    const course = all.find(x => x.id === id);

    const user = getUser();
    let bought = false;

    if (user) {
        const r = await fetch(API + "/api/purchases/" + user.id);
        const my = await r.json();
        bought = my.some(x => x.id == id);
    }

    box.innerHTML = `
        <h2>${course.title}</h2>
        <img src="${API}/uploads/${course.image}" style="width:300px;border-radius:10px;">
        <p>${course.description}</p>

        <div id="lessons-area">
            ${bought
                ? "<p>Загрузка уроков...</p>"
                : "<p style='color:red;font-weight:bold;'>Купите курс, чтобы смотреть уроки.</p>"}
        </div>
    `;

    if (bought) loadLessons(id, user.id);
}

function closeCourse() {
    document.getElementById("course-viewer").style.display = "none";
}



// ================================
// LOAD LESSONS
// ================================
async function loadLessons(course_id, user_id) {
    const res = await fetch(`${API}/api/get_lessons?course_id=${course_id}&user_id=${user_id}`);
    const data = await res.json();

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
// CART — ADD
// ================================
async function addToCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, course_id })
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Добавлено в корзину!", "success");
    }
}



// ================================
// CART — LOAD LIST
// ================================
async function loadCart() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(API + "/api/cart/" + user.id);
    const courses = await res.json();

    const list = document.getElementById("cart-list");
    const totalEl = document.getElementById("cart-total");

    if (!list) return;

    list.innerHTML = "";
    let total = 0;

    courses.forEach(c => {
        total += c.price;

        const card = document.createElement("div");
        card.className = "cart-card";

        const img = document.createElement("div");
        img.className = "cart-img";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const title = document.createElement("div");
        title.className = "cart-title";
        title.innerText = c.title;

        const price = document.createElement("div");
        price.className = "cart-price";
        price.innerText = c.price + " ₸";

        const btn = document.createElement("button");
        btn.className = "btn-red";
        btn.innerText = "Удалить";
        btn.onclick = () => removeFromCart(user.id, c.id);

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(price);
        card.appendChild(btn);

        list.appendChild(card);
    });

    totalEl.innerText = total;
}



// ================================
// CART — REMOVE ITEM
// ================================
async function removeFromCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, course_id })
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Удалено!", "success");
        loadCart();
    }
}



// ================================
// CHECKOUT WITH BALANCE
// ================================
async function checkout() {
    const user = getUser();
    if (!user) return toast("Сначала войдите!", "error");

    const res = await fetch(API + "/api/cart/checkout/" + user.id, {
        method: "POST"
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Покупка успешна!", "success");
        user.balance = data.balance;
        saveUser(user);
        setTimeout(() => window.location.href = "profile.html", 600);
    } else {
        toast(data.message, "error");
    }
}



// ================================
// PROFILE — LOAD DATA
// ================================
async function loadProfile() {
    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById("profile-name").innerText = user.name;
    document.getElementById("profile-phone").innerText = user.phone;
    document.getElementById("profile-balance").innerText = user.balance + " ₸";

    const avatar = document.getElementById("profile-avatar");
    if (user.avatar) {
        avatar.src = `${API}/uploads/${user.avatar}`;
    } else {
        avatar.src = "assets/default-avatar.png";
    }
}


// ================================
// PROFILE — UPLOAD AVATAR
// ================================
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
        user.avatar = data.url.replace("/uploads/", "");
        saveUser(user);
        loadProfile();
        toast("Аватар обновлён!", "success");
    }
}



// ================================
// PROFILE — PURCHASED COURSES
// ================================
async function loadPurchases() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(`${API}/api/purchases/${user.id}`);
    const courses = await res.json();

    const box = document.getElementById("my-courses");

    if (!courses.length) {
        box.innerHTML = "<p>Пока нет купленных курсов.</p>";
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



// ================================
// PROFILE — ADD BALANCE
// ================================
async function addBalance(e) {
    e.preventDefault();

    const user = getUser();
    const amount = Number(document.getElementById("balance-input").value);

    if (!amount || amount <= 0) return toast("Введите сумму!", "error");

    const res = await fetch(`${API}/api/balance/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
    });

    const data = await res.json();

    if (data.status === "ok") {
        user.balance = data.balance;
        saveUser(user);
        loadProfile();
        toast("Баланс пополнен!", "success");
    }
}



// ================================
// ADMIN — LOAD COURSES
// ================================
async function loadAdminCourses() {
    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

    const list = document.getElementById("admin-courses");
    if (!list) return;

    list.innerHTML = "";

    courses.forEach(c => {
        const row = document.createElement("div");
        row.className = "course-item";

        const img = document.createElement("div");
        img.className = "course-img";
        img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

        const info = document.createElement("div");
        info.innerHTML = `
            <b>${c.title}</b><br>
            Автор: ${c.author}<br>
            Цена: ${c.price} ₸
        `;

        const btn = document.createElement("button");
        btn.className = "btn-red";
        btn.innerText = "Удалить";
        btn.onclick = () => deleteCourse(c.id);

        row.appendChild(img);
        row.appendChild(info);
        row.appendChild(btn);

        list.appendChild(row);
    });
}



// ================================
// ADMIN — DELETE COURSE
// ================================
async function deleteCourse(id) {
    const res = await fetch(API + "/api/delete_course/" + id, {
        method: "DELETE"
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Курс удалён!", "success");
        loadAdminCourses();
        loadCoursesIntoSelect();
    }
}



// ================================
// ADMIN — ADD COURSE
// ================================
async function addCourse() {
    const form = new FormData();

    form.append("title", document.getElementById("title").value);
    form.append("price", document.getElementById("price").value);
    form.append("author", document.getElementById("author").value);
    form.append("description", document.getElementById("description").value);
    form.append("image", document.getElementById("image").files[0]);

    const res = await fetch(API + "/api/add_course", {
        method: "POST",
        body: form
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Курс добавлен!", "success");
        loadAdminCourses();
        loadCoursesIntoSelect();
    }
}



// ================================
// ADMIN — LOAD COURSES INTO SELECT
// ================================
async function loadCoursesIntoSelect() {
    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

    const sel = document.getElementById("lesson-course-select");
    if (!sel) return;

    sel.innerHTML = "";

    courses.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.id} — ${c.title}`;
        sel.appendChild(opt);
    });
}



// ================================
// ADMIN — UPLOAD LESSON
// ================================
async function uploadLesson() {
    const course_id = document.getElementById("lesson-course-select").value;
    const title = document.getElementById("lesson-title").value;
    const file = document.getElementById("lesson-file").files[0];

    if (!file) return toast("Выберите видео!", "error");

    const fd = new FormData();
    fd.append("course_id", course_id);
    fd.append("title", title);
    fd.append("file", file);

    const res = await fetch(API + "/api/upload_lesson", {
        method: "POST",
        body: fd
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Урок загружен!", "success");
        document.getElementById("lesson-title").value = "";
        document.getElementById("lesson-file").value = "";
    }
}



// ================================
// AUTOLOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("courses-list")) loadCourses();
    if (document.getElementById("cart-list")) loadCart();
    if (document.body.classList.contains("profile-page")) {
        loadProfile();
        loadPurchases();
    }
    if (document.getElementById("admin-courses")) {
        loadAdminCourses();
        loadCoursesIntoSelect();
    }

});
