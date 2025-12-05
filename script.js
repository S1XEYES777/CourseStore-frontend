const API = "https://coursestore-backend.onrender.com";

// ===============================
//         LOCAL STORAGE USER
// ===============================
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


// ===============================
//        TOAST УВЕДОМЛЕНИЯ
// ===============================
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


// ===============================
//         РЕГИСТРАЦИЯ
// ===============================
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
        toast("Регистрация успешна", "success");

        // сохраняем пароль
        data.user.password = password;
        saveUser(data.user);

        setTimeout(() => {
            window.location.href = "profile.html";
        }, 700);
    } else {
        toast(data.message || "Ошибка регистрации", "error");
    }
}


// ===============================
//              ВХОД
// ===============================
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

        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ !!!
        // Добавляем пароль, чтобы admin.html смог проверить
        data.user.password = password;

        saveUser(data.user);
        toast("Вход выполнен", "success");

        setTimeout(() => {
            window.location.href = "profile.html";
        }, 700);

    } else {
        toast(data.message || "Ошибка входа", "error");
    }
}


// ===============================
//          ЗАГРУЗКА КУРСОВ
// ===============================
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
        if (c.image) {
            img.style.backgroundImage = `url('${API}/uploads/${c.image}')`;
        }

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
            if (!user) {
                toast("Сначала войдите в аккаунт", "error");
                setTimeout(() => window.location.href = "login.html", 700);
                return;
            }
            addToCart(user.id, c.id);
        };

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(price);
        card.appendChild(btn);

        list.appendChild(card);
    });
}


// ===============================
//        ДОБАВИТЬ В КОРЗИНУ
// ===============================
async function addToCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/add", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id, course_id})
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Курс добавлен в корзину", "success");
    } else {
        toast(data.message || "Ошибка добавления", "error");
    }
}


// ===============================
//         ЗАГРУЗКА КОРЗИНЫ
// ===============================
async function loadCart(user_id) {
    const list = document.getElementById("cart-list");
    const totalSpan = document.getElementById("cart-total");
    if (!list || !totalSpan) return;

    const res = await fetch(API + "/api/cart/" + user_id);
    const items = await res.json();

    list.innerHTML = "";
    let total = 0;

    items.forEach(i => {
        total += i.price;

        const row = document.createElement("div");
        row.className = "cart-item";

        const title = document.createElement("div");
        title.className = "cart-title";
        title.innerText = i.title;

        const price = document.createElement("div");
        price.className = "cart-price";
        price.innerText = i.price + " ₸";

        const btn = document.createElement("button");
        btn.className = "btn small red";
        btn.innerText = "Удалить";

        btn.onclick = () => removeFromCart(user_id, i.id);

        row.appendChild(title);
        row.appendChild(price);
        row.appendChild(btn);

        list.appendChild(row);
    });

    totalSpan.innerText = total;
}


// ===============================
//         УДАЛЕНИЕ ИЗ КОРЗИНЫ
// ===============================
async function removeFromCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id, course_id})
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Курс удалён", "success");
        loadCart(user_id);
    } else {
        toast("Ошибка удаления", "error");
    }
}


// ===============================
//             ОПЛАТА
// ===============================
async function checkout() {
    const user = getUser();
    if (!user) {
        toast("Войдите в аккаунт", "error");
        return;
    }

    const res = await fetch(API + "/api/cart/checkout/" + user.id, {
        method: "POST"
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Покупка успешна", "success");
        setTimeout(() => {
            window.location.href = "profile.html";
        }, 1000);
    } else {
        toast(data.message || "Ошибка покупки", "error");
    }
}


// ===============================
//         МОИ КУРСЫ
// ===============================
async function loadPurchases(user_id) {
    const list = document.getElementById("purchased-list");
    if (!list) return;

    const res = await fetch(API + "/api/purchases/" + user_id);
    const items = await res.json();

    list.innerHTML = "";

    if (!items.length) {
        list.innerText = "У вас пока нет купленных курсов.";
        return;
    }

    items.forEach(c => {
        const card = document.createElement("div");
        card.className = "course-card small-card";

        const title = document.createElement("div");
        title.className = "course-title";
        title.innerText = c.title;

        const price = document.createElement("div");
        price.className = "course-price";
        price.innerText = c.price + " ₸";

        card.appendChild(title);
        card.appendChild(price);

        list.appendChild(card);
    });
}


// ===============================
//      АВТО ЗАГРУЗКА
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("courses-list")) {
        loadCourses();
    }
});
