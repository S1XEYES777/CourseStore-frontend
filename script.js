// ===== CONFIG =====
const API = "https://coursestore-backend.onrender.com";


// ===== USER STORAGE =====
function saveUser(u) {
    localStorage.setItem("user", JSON.stringify(u));
}
function getUser() {
    let u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
}
function logout() {
    localStorage.removeItem("user");
    location.href = "login.html";
}


// ===== TOAST =====
function toast(msg, type="info") {
    let box = document.querySelector(".toast-box");
    if (!box) {
        box = document.createElement("div");
        box.className = "toast-box";
        document.body.appendChild(box);
    }

    const t = document.createElement("div");
    t.className = "toast " + type;
    t.innerText = msg;

    box.appendChild(t);

    setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 300);
    }, 3000);
}


// ===== LOGIN =====
async function loginUser(e) {
    e.preventDefault();

    const phone = phoneInput.value;
    const password = passwordInput.value;

    const res = await fetch(API + "/api/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({phone, password})
    });

    const data = await res.json();

    if (data.status === "ok") {
        data.user.password = password;
        saveUser(data.user);
        toast("Вход выполнен!", "success");
        setTimeout(() => location.href = "profile.html", 500);
    } else toast(data.message, "error");
}


// ===== REGISTER =====
async function registerUser(e) {
    e.preventDefault();

    const name = nameInput.value;
    const phone = phoneInput.value;
    const password = passwordInput.value;

    const res = await fetch(API + "/api/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, phone, password})
    });

    const data = await res.json();

    if (data.status === "ok") {
        data.user.password = password;
        saveUser(data.user);
        toast("Регистрация успешна!", "success");

        setTimeout(() => location.href = "profile.html", 500);
    } else toast(data.message, "error");
}


// ===== ADMIN BUTTON SHOW =====
document.addEventListener("DOMContentLoaded", () => {
    const user = getUser();
    const adminBtn = document.getElementById("adminLink");

    if (adminBtn && user) {
        if (user.name === "Admin" || user.phone === "77750476284") {
            adminBtn.style.display = "inline-block";
        }
    }
});


// ===== LOAD COURSES =====
async function loadCourses() {
    const list = document.getElementById("courses-list");
    if (!list) return;

    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

    list.innerHTML = "";

    if (!courses.length) {
        list.innerText = "Курсов пока нет.";
        return;
    }

    const user = getUser();

    courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";

        const img = document.createElement("div");
        img.className = "course-image";
        img.style.backgroundImage = `url(${API}/uploads/${c.image})`;

        const title = document.createElement("div");
        title.className = "course-title";
        title.innerText = c.title;

        const price = document.createElement("div");
        price.className = "course-price";
        price.innerText = c.price + " ₸";

        const btn = document.createElement("button");
        btn.className = "btn small";
        btn.innerText = "В корзину";

        btn.onclick = () => {
            if (!user) return location.href = "login.html";
            addToCart(user.id, c.id);
        };

        card.append(img, title, price, btn);
        list.appendChild(card);
    });
}


// ===== CART FUNCTIONS =====
async function addToCart(uid, cid) {
    const res = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id: uid, course_id: cid})
    });

    const data = await res.json();
    data.status === "ok"
        ? toast("Добавлено!", "success")
        : toast(data.message, "error");
}

async function loadCart(uid) {
    const list = document.getElementById("cart-list");
    const totalSpan = document.getElementById("cart-total");
    if (!list) return;

    const res = await fetch(API + "/api/cart/" + uid);
    const items = await res.json();

    list.innerHTML = "";
    let total = 0;

    items.forEach(i => {
        total += i.price;

        list.innerHTML += `
            <div class="cart-item">
                <div>${i.title}</div>
                <div>${i.price} ₸</div>
                <button class="btn small red" onclick="removeFromCart(${uid}, ${i.id})">Удалить</button>
            </div>
        `;
    });

    totalSpan.innerText = total;
}

async function removeFromCart(uid, cid) {
    const res = await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id: uid, course_id: cid})
    });

    loadCart(uid);
}


// ===== CHECKOUT =====
async function checkout() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(API + "/api/cart/checkout/" + user.id, {method:"POST"});
    const data = await res.json();

    data.status === "ok"
        ? (toast("Покупка успешна!", "success"), setTimeout(() => location.href = "profile.html", 700))
        : toast(data.message, "error");
}


// ===== PURCHASES =====
async function loadPurchases(uid) {
    const list = document.getElementById("purchased-list");
    if (!list) return;

    const res = await fetch(API + "/api/purchases/" + uid);
    const items = await res.json();

    list.innerHTML = "";

    items.forEach(c => {
        list.innerHTML += `
            <div class="course-card small-card">
                <div>${c.title}</div>
                <div>${c.price} ₸</div>
            </div>
        `;
    });
}


// ===== ADMIN FUNCTIONS =====
async function loadAdminCourses() {
    const list = document.getElementById("courseList");
    if (!list) return;

    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

    list.innerHTML = "";

    courses.forEach(c => {
        list.innerHTML += `
            <div class="cart-item">
                <div>${c.title} — ${c.price} ₸</div>
                <button class="btn small red" onclick="deleteCourse(${c.id})">Удалить</button>
            </div>
        `;
    });
}

async function deleteCourse(id) {
    await fetch(API + "/api/admin/delete_course/" + id, {
        method: "DELETE"
    });
    loadAdminCourses();
}
