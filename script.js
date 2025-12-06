// ===========================
// CONFIG
// ===========================

// ВСТАВЬ СВОЙ BACKEND URL
const API = "https://coursestore-backend.onrender.com";


// ===========================
//  USER STORAGE
// ===========================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    let data = localStorage.getItem("user");
    return data ? JSON.parse(data) : null;
}

function logout() {
    localStorage.removeItem("user");
    location.href = "login.html";
}


// ===========================
//  TOAST УВЕДОМЛЕНИЯ
// ===========================
function toast(message, type = "info") {
    let box = document.querySelector(".toast-box");

    if (!box) {
        box = document.createElement("div");
        box.className = "toast-box";
        document.body.appendChild(box);
    }

    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = message;

    box.appendChild(t);

    setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 300);
    }, 3000);
}


// ===========================
//  РЕГИСТРАЦИЯ
// ===========================
async function registerUser(e) {
    e.preventDefault();

    const name = document.querySelector("#name").value;
    const phone = document.querySelector("#phone").value;
    const password = document.querySelector("#password").value;

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
    } else {
        toast(data.message, "error");
    }
}


// ===========================
//  ВХОД
// ===========================
async function loginUser(e) {
    e.preventDefault();

    const phone = document.querySelector("#phone").value;
    const password = document.querySelector("#password").value;

    const res = await fetch(API + "/api/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({phone, password})
    });

    const data = await res.json();

    if (data.status === "ok") {
        // сохраняем пароль, чтобы admin.html мог его проверить
        data.user.password = password;

        saveUser(data.user);
        toast("Вход выполнен!", "success");

        setTimeout(() => location.href = "profile.html", 500);
    } else {
        toast(data.message, "error");
    }
}


// ===========================
//  ПОКАЗ КНОПКИ АДМИНКА
// ===========================
document.addEventListener("DOMContentLoaded", () => {
    const user = getUser();
    const adminBtn = document.getElementById("adminLink");

    if (adminBtn && user) {
        if (user.name === "Admin" || user.phone === "77750476284") {
            adminBtn.style.display = "inline-block";
        }
    }
});


// ===========================
//  ЗАГРУЗКА КУРСОВ
// ===========================
async function loadCourses() {
    const list = document.getElementById("courses-list");
    if (!list) return;

    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

    list.innerHTML = "";

    if (!courses.length) {
        list.innerText = "Курсы пока не добавлены.";
        return;
    }

    const user = getUser();

    courses.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card";

        const img = document.createElement("div");
        img.className = "course-image";
        if (c.image) img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;

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


// ===========================
//  ДОБАВИТЬ В КОРЗИНУ
// ===========================
async function addToCart(uid, cid) {
    const res = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id: uid, course_id: cid})
    });

    const data = await res.json();

    if (data.status === "ok") toast("Добавлено!", "success");
    else toast(data.message, "error");
}


// ===========================
//  ЗАГРУЗКА КОРЗИНЫ
// ===========================
async function loadCart(uid) {
    const list = document.getElementById("cart-list");
    const totalSpan = document.getElementById("cart-total");
    if (!list) return;

    const res = await fetch(API + "/api/cart/" + uid);
    const items = await res.json();

    let total = 0;
    list.innerHTML = "";

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


// ===========================
//  УДАЛЕНИЕ КУРСА ИЗ КОРЗИНЫ
// ===========================
async function removeFromCart(uid, cid) {
    await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id: uid, course_id: cid})
    });

    loadCart(uid);
}


// ===========================
//  ОПЛАТА
// ===========================
async function checkout() {
    const user = getUser();
    if (!user) return location.href = "login.html";

    const res = await fetch(API + "/api/cart/checkout/" + user.id, {method: "POST"});
    const data = await res.json();

    if (data.status === "ok") {
        toast("Покупка успешна!", "success");
        setTimeout(() => location.href = "profile.html", 700);
    } else {
        toast(data.message, "error");
    }
}


// ===========================
//  МОИ КУРСЫ
// ===========================
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


// ===========================
//  АДМИН: ЗАГРУЗИТЬ СПИСОК КУРСОВ
// ===========================
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


// ===========================
//  АДМИН: УДАЛИТЬ КУРС
// ===========================
async function deleteCourse(id) {
    await fetch(API + "/api/admin/delete_course/" + id, {
        method: "DELETE"
    });

    loadAdminCourses();
}
// ===========================
//  АДМИН: ДОБАВИТЬ НОВЫЙ КУРС
// ===========================
async function addCourse() {
    const title = document.querySelector("#title").value;
    const price = document.querySelector("#price").value;
    const image = document.querySelector("#image").files[0];

    if (!title || !price || !image) {
        toast("Заполните все поля!", "error");
        return;
    }

    let formData = new FormData();
    formData.append("title", title);
    formData.append("price", price);
    formData.append("image", image);

    const res = await fetch(API + "/api/admin/add_course", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Курс добавлен!", "success");
        document.querySelector("#title").value = "";
        document.querySelector("#price").value = "";
        document.querySelector("#image").value = "";
        loadAdminCourses();
    } else {
        toast(data.message, "error");
    }
}
// ---------------------------
// ДОБАВЛЕНИЕ КУРСА
// ---------------------------

const adminForm = document.getElementById("addCourseForm");
if (adminForm) {
    adminForm.onsubmit = async (e) => {
        e.preventDefault();

        const data = new FormData(adminForm);

        const res = await fetch(API + "/api/admin/add_course", {
            method: "POST",
            body: data
        });

        const d = await res.json();

        if (d.status === "ok") {
            toast("Курс успешно добавлен!", "success");
            adminForm.reset();
        } else {
            toast(d.message, "error");
        }
    };
}
async function loadCourses() {
    const list = document.getElementById("courses-list");
    if (!list) return;

    const res = await fetch(API + "/api/courses");
    const courses = await res.json();

    list.innerHTML = "";

    courses.forEach(c => {
        let card = document.createElement("div");
        card.className = "course-card";

        card.innerHTML = `
            <img src="${API}/uploads/${c.image}" class="course-img">
            <div class="course-title">${c.title}</div>
            <div class="course-author">${c.author}</div>
            <div class="course-price">${c.price} ₸</div>
        `;

        list.appendChild(card);
    });
}
