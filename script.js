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

    if (!name || !phone || !password) {
        toast("Заполните все поля", "error");
        return;
    }

    const res = await fetch(API + "/api/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, phone, password})
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Регистрация успешна", "success");
        // на всякий случай добавим баланс по умолчанию
        if (data.user && data.user.balance == null) {
            data.user.balance = 0;
        }
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

    if (!phone || !password) {
        toast("Введите номер и пароль", "error");
        return;
    }

    const res = await fetch(API + "/api/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({phone, password})
    });

    const data = await res.json();

    if (data.status === "ok") {
        if (data.user && data.user.balance == null) {
            data.user.balance = 0;
        }
        saveUser(data.user);
        toast("Вход выполнен!", "success");

        if (data.user.phone === "77750476284") {
            setTimeout(() => window.location.href = "admin.html", 800);
        } else {
            setTimeout(() => window.location.href = "profile.html", 800);
        }
    } else {
        toast(data.message || "Неверный логин или пароль", "error");
    }
}


// ================================
// MAIN PAGE: LOAD COURSES
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
        try {
            const r = await fetch(`${API}/api/purchases/${user.id}`);
            const my = await r.json();
            purchasedIds = my.map(c => c.id);
        } catch (err) {
            console.error(err);
        }
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

        const btnOpen = document.createElement("button");
        btnOpen.className = "btn small";
        btnOpen.innerText = "Открыть";
        btnOpen.onclick = () => openCourse(c.id);

        const btnBuy = document.createElement("button");
        btnBuy.className = "btn small";
        btnBuy.style.marginLeft = "8px";

        if (user && purchasedIds.includes(c.id)) {
            btnBuy.innerText = "Курс куплен";
            btnBuy.disabled = true;
        } else {
            btnBuy.innerText = "В корзину";
            btnBuy.onclick = () => {
                if (!user) {
                    toast("Сначала войдите в аккаунт", "error");
                    return;
                }
                addToCart(user.id, c.id);
            };
        }

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(author);
        card.appendChild(price);
        card.appendChild(btnOpen);
        card.appendChild(btnBuy);

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

    if (data.status === "ok") {
        toast("Добавлено в корзину!", "success");
    } else {
        toast(data.message || "Ошибка добавления в корзину", "error");
    }
}

async function removeFromCart(user_id, course_id) {
    const res = await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id, course_id})
    });

    const data = await res.json();

    if (data.status === "ok") {
        toast("Удалено из корзины", "success");
        loadCart(); // пересчитаем корзину
    } else {
        toast(data.message || "Ошибка", "error");
    }
}

async function loadCart() {
    const user = getUser();
    if (!user) {
        toast("Сначала войдите в аккаунт", "error");
        window.location.href = "login.html";
        return;
    }

    const box = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");
    if (!box) return;

    const res = await fetch(`${API}/api/cart/${user.id}`);
    const items = await res.json();

    box.innerHTML = "";

    if (!items.length) {
        box.innerHTML = "<p>Ваша корзина пуста.</p>";
        if (totalEl) totalEl.innerText = "0 ₸";
        return;
    }

    let total = 0;

    items.forEach(c => {
        total += c.price;

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

        const btnRemove = document.createElement("button");
        btnRemove.className = "btn small";
        btnRemove.innerText = "Удалить";
        btnRemove.onclick = () => removeFromCart(user.id, c.id);

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(price);
        card.appendChild(btnRemove);

        box.appendChild(card);
    });

    if (totalEl) totalEl.innerText = total + " ₸";
}


// ================================
// CHECKOUT (ПОКУПКА КУРСОВ ИЗ КОРЗИНЫ)
// ================================
async function checkout() {
    const user = getUser();
    if (!user) return toast("Сначала войдите!", "error");

    const res = await fetch(API + "/api/cart/checkout/" + user.id, { method: "POST" });
    const data = await res.json();

    if (data.status === "ok") {
        // если бэкенд вернул обновлённого пользователя с балансом
        if (data.user) {
            if (data.user.balance == null) data.user.balance = 0;
            saveUser(data.user);
        }
        toast("Покупка успешна!", "success");
        setTimeout(() => {
            loadCart();
            loadPurchases && loadPurchases();
            loadProfile && loadProfile();
        }, 500);
    } else {
        toast(data.message || "Ошибка при покупке", "error");
    }
}


// ================================
// COURSE MODAL LOGIC
// ================================
function closeCourse() {
    const viewer = document.getElementById("course-viewer");
    if (viewer) viewer.style.display = "none";
}

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
        box.innerHTML = "<p>Курс не найден</p>";
        return;
    }

    const user = getUser();
    let bought = false;

    if (user) {
        try {
            let r = await fetch(API + "/api/purchases/" + user.id);
            let my = await r.json();
            bought = my.some(x => x.id == id);
        } catch (err) {
            console.error(err);
        }
    }

    let buyBtnHtml = "";
    if (user && !bought) {
        buyBtnHtml = `
            <button id="buy-course-btn" class="btn small">
                Купить за ${c.price} ₸
            </button>
        `;
    } else if (!user) {
        buyBtnHtml = `<p style="color:#555;">Чтобы купить курс, войдите в аккаунт.</p>`;
    } else if (bought) {
        buyBtnHtml = `<p style="color:green;font-weight:bold;">Курс уже куплен</p>`;
    }

    box.innerHTML = `
        <h2>${c.title}</h2>
        <img src="${API}/uploads/${c.image}" style="width:300px;border-radius:10px;">
        <p>${c.description}</p>

        ${buyBtnHtml}

        <div id="lessons-area" style="margin-top:20px;">
            ${bought 
                ? "<p>Загрузка уроков...</p>" 
                : "<p style='color:red;font-weight:bold;'>Чтобы увидеть уроки — купите курс.</p>"}
        </div>
    `;

    if (user && !bought) {
        const btn = document.getElementById("buy-course-btn");
        if (btn) {
            btn.onclick = async () => {
                await addToCart(user.id, c.id);
                toast("Курс добавлен в корзину. Перейдите в корзину для оплаты.", "success");
            };
        }
    }

    if (bought && user) {
        loadLessons(id, user.id);
    }
}

async function loadLessons(course_id, user_id) {
    let res = await fetch(`${API}/api/get_lessons?course_id=${course_id}&user_id=${user_id}`);
    let data = await res.json();

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
                <video src="${API}${l.url}" controls style="width:100%;border-radius:10px;"></video>
            </div>
        `;
    });

    area.innerHTML = html;
}


// ================================
// PROFILE: AVATAR + INFO + PURCHASES + BALANCE
// ================================
async function loadProfile() {
    const user = getUser();
    if (!user) {
        if (document.body.classList.contains("profile-page")) {
            window.location.href = "login.html";
        }
        return;
    }

    if (user.balance == null) user.balance = 0;

    const nameEl = document.getElementById("profile-name");
    const phoneEl = document.getElementById("profile-phone");
    const avatarImg = document.getElementById("profile-avatar");
    const balanceEl = document.getElementById("profile-balance");

    if (nameEl) nameEl.innerText = user.name;
    if (phoneEl) phoneEl.innerText = user.phone;
    if (balanceEl) balanceEl.innerText = user.balance + " ₸";

    if (avatarImg) {
        if (user.avatar) {
            avatarImg.src = `${API}/uploads/${user.avatar}`;
        } else {
            // чтобы не класть default-avatar в папку, используем онлайн-заглушку
            avatarImg.src = "https://via.placeholder.com/150?text=Avatar";
        }
    }
}

async function uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;

    const user = getUser();
    if (!user) {
        toast("Сначала войдите в аккаунт", "error");
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

        if (data.user) {
            if (data.user.balance == null) data.user.balance = user.balance || 0;
            saveUser(data.user);
        } else if (data.avatar) {
            user.avatar = data.avatar;
            saveUser(user);
        }

        loadProfile();
    } else {
        toast(data.message || "Ошибка загрузки аватара", "error");
    }
}

// загрузка купленных курсов в профиле
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

// пополнение баланса
async function topUpBalance(e) {
    e.preventDefault();
    const user = getUser();
    if (!user) {
        toast("Сначала войдите", "error");
        return;
    }

    const input = document.getElementById("topup-amount");
    if (!input) return;
    const amount = Number(input.value);
    if (!amount || amount <= 0) {
        toast("Введите сумму пополнения", "error");
        return;
    }

    const res = await fetch(`${API}/api/topup`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user_id: user.id, amount})
    });

    const data = await res.json();

    if (data.status === "ok" && data.user) {
        if (data.user.balance == null) data.user.balance = 0;
        saveUser(data.user);
        toast("Баланс пополнен", "success");
        input.value = "";
        loadProfile();
    } else {
        toast(data.message || "Ошибка пополнения", "error");
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

    // Страница корзины
    if (document.getElementById("cart-items")) {
        loadCart();
    }

    // Профиль
    if (document.body.classList.contains("profile-page")) {
        loadProfile();
        loadPurchases();
        const avatarInput = document.getElementById("avatar-input");
        if (avatarInput) {
            avatarInput.addEventListener("change", uploadAvatar);
        }

        const topupForm = document.getElementById("topup-form");
        if (topupForm) {
            topupForm.addEventListener("submit", topUpBalance);
        }
    }

    // Регистрация
    const regForm = document.getElementById("register-form");
    if (regForm) {
        regForm.addEventListener("submit", registerUser);
    }

    // Логин
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", loginUser);
    }
});
