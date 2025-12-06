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

    const user = getUser();

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
        btn.innerText = "В корзину";

        btn.onclick = () => {
            if (!user) {
                toast("Сначала войдите!", "error");
                return setTimeout(() => window.location.href = "login.html", 700);
            }
            addToCart(user.id, c.id);
        };

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
// LOAD CART
// ================================
async function loadCart(user_id) {
    const list = document.getElementById("cart-list");
    const totalSpan = document.getElementById("cart-total");
    if (!list) return;

    const res = await fetch(API + "/api/cart/" + user_id);
    const items = await res.json();

    list.innerHTML = "";
    let total = 0;

    items.forEach(c => {
        total += c.price;

        const row = document.createElement("div");
        row.className = "cart-item";

        row.innerHTML = `
            <div class="cart-title">${c.title}</div>
            <div class="cart-price">${c.price} ₸</div>
            <button class="btn small red" onclick="removeFromCart(${user_id}, ${c.id})">Удалить</button>
        `;

        list.appendChild(row);
    });

    totalSpan.innerText = total;
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
        toast("Удалено!", "success");
        loadCart(user_id);
    } else {
        toast("Ошибка", "error");
    }
}

// ================================
// CHECKOUT (BUY COURSES)
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
// LOAD PURCHASES (PROFILE)
// ================================
async function loadPurchases(user_id) {
    const box = document.getElementById("purchased-list");
    if (!box) return;

    const res = await fetch(API + "/api/purchases/" + user_id);
    const items = await res.json();

    box.innerHTML = "";

    if (!items.length) {
        box.innerHTML = "<p>У вас пока нет курсов.</p>";
        return;
    }

    items.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card-small";
        card.innerHTML = `
            <b>${c.title}</b><br>
            ${c.price} ₸
        `;
        box.appendChild(card);
    });
}

// ================================
// LOAD COURSES IN ADMIN PANEL
// ================================
async function loadAdminCourses() {
    const list = document.getElementById("admin-courses");
    if (!list) return;

    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

    list.innerHTML = "";

    courses.forEach(c => {
        const row = document.createElement("div");
        row.className = "admin-item";

        row.innerHTML = `
            <img src="${API}/uploads/${c.image}" class="admin-img">
            <div class="admin-info">
                <b>${c.title}</b><br>
                Автор: ${c.author}<br>
                Цена: ${c.price} ₸
            </div>
            <button class="btn red" onclick="deleteCourse(${c.id})">Удалить</button>
        `;

        list.appendChild(row);
    });
}

// ================================
// DELETE COURSE (ADMIN)
// ================================
async function deleteCourse(id) {
    const res = await fetch(API + "/api/delete_course/" + id, { method: "DELETE" });
    const data = await res.json();

    if (data.status === "ok") {
        toast("Курс удалён!", "success");
        loadAdminCourses();
    } else {
        toast("Ошибка удаления", "error");
    }
}

// ================================
// AUTOLOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("courses-list")) loadCourses();
});
