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
    try {
        const data = localStorage.getItem("user");
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ================================
// HTTP REQUEST WRAPPER
// ================================
async function api(path, method = "GET", body = null, isForm = false) {
    const headers = {};

    // JSON по умолчанию
    if (!isForm) headers["Content-Type"] = "application/json";

    // токен
    const user = getUser();
    if (user?.token) headers["X-Token"] = user.token;

    try {
        const res = await fetch(API + path, {
            method,
            headers,
            body: isForm ? body : body ? JSON.stringify(body) : null,
        });

        return await res.json();
    } catch (err) {
        console.log("Ошибка запроса:", err);
        return { error: "Ошибка соединения с сервером" };
    }
}

// ================================
// AUTH
// ================================
async function registerUser(phone, password, name, email) {
    const res = await api("/api/register", "POST", {
        phone,
        password,
        name,
        email,
    });

    if (res.error) {
        alert("Ошибка регистрации: " + res.error);
        return;
    }

    saveUser(res.user);
    window.location.href = "index.html";
}

async function loginUser(phone, password) {
    const res = await api("/api/login", "POST", {
        phone,
        password,
    });

    if (res.error) {
        alert("Ошибка входа: " + res.error);
        return;
    }

    saveUser(res.user);
    window.location.href = "index.html";
}

// ================================
// LOAD COURSES
// ================================
async function loadCourses() {
    const res = await api("/api/courses");

    if (res.error) {
        alert(res.error);
        return;
    }

    const container = document.getElementById("courses");
    if (!container) return;

    container.innerHTML = "";

    res.courses.forEach((c) => {
        const div = document.createElement("div");
        div.className = "course-card";
        div.innerHTML = `
            <img src="${API + c.image_url}" class="course-img">
            <h3>${c.title}</h3>
            <p>${c.price}₸</p>
            <button onclick="openCourse(${c.id})">Открыть</button>
        `;
        container.appendChild(div);
    });
}

function openCourse(id) {
    window.location.href = `course.html?id=${id}`;
}

// ================================
// LOAD ONE COURSE
// ================================
async function loadCoursePage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;

    const res = await api(`/api/courses/${id}`);

    if (res.error) {
        alert(res.error);
        return;
    }

    const c = res.course;

    document.getElementById("title").innerText = c.title;
    document.getElementById("desc").innerText = c.description;
    document.getElementById("img").src = API + c.image_url;
    document.getElementById("price").innerText = c.price + "₸";

    const lessonsEl = document.getElementById("lessons");
    lessonsEl.innerHTML = "";

    if (!c.is_purchased) {
        lessonsEl.innerHTML = "<p>Купите курс, чтобы смотреть уроки.</p>";
        return;
    }

    c.lessons.forEach((l) => {
        const item = document.createElement("div");
        item.className = "lesson-item";
        item.innerHTML = `
            <h4>${l.title}</h4>
            <video controls src="${API + l.video_url}"></video>
        `;
        lessonsEl.appendChild(item);
    });
}

// ================================
// CART
// ================================
async function addToCart(courseId) {
    const res = await api("/api/cart/add", "POST", { course_id: courseId });

    if (res.error) {
        alert(res.error);
        return;
    }

    alert("Добавлено в корзину");
}

async function loadCart() {
    const res = await api("/api/cart");

    if (res.error) {
        alert(res.error);
        return;
    }

    const container = document.getElementById("cart");
    const total = document.getElementById("total");

    container.innerHTML = "";

    res.items.forEach((i) => {
        const div = document.createElement("div");
        div.className = "cart-item";

        div.innerHTML = `
            <img src="${API + i.image_url}" class="cart-img">
            <div>
                <h3>${i.title}</h3>
                <p>${i.price}₸</p>
                <button onclick="removeFromCart(${i.course_id})">Удалить</button>
            </div>
        `;

        container.appendChild(div);
    });

    total.innerText = res.total + "₸";
}

async function removeFromCart(courseId) {
    const res = await api("/api/cart/remove", "POST", { course_id: courseId });

    if (res.error) {
        alert(res.error);
        return;
    }

    loadCart();
}

async function checkout() {
    const res = await api("/api/cart/checkout", "POST");

    if (res.error) {
        alert(res.error);
        return;
    }

    alert("Покупка успешна!");
    loadCart();
}

// ================================
// PROFILE
// ================================
async function loadProfile() {
    const res = await api("/api/me");

    if (res.error) {
        alert(res.error);
        return;
    }

    const u = res.user;

    document.getElementById("phone").innerText = u.phone;
    document.getElementById("name").innerText = u.name || "Без имени";
    document.getElementById("email").innerText = u.email || "—";

    if (u.avatar_url) {
        document.getElementById("avatar").src = API + u.avatar_url;
    }
}

// ================================
// ADMIN CHECK
// ================================
async function loadAdminCourses() {
    const res = await api("/api/courses");

    if (res.error) {
        alert(res.error);
        return;
    }

    const list = document.getElementById("admin-list");
    list.innerHTML = "";

    res.courses.forEach((c) => {
        const div = document.createElement("div");
        div.className = "admin-card";

        div.innerHTML = `
            <img src="${API + c.image_url}">
            <h3>${c.title}</h3>
            <p>${c.price}₸</p>
            <button onclick="deleteCourse(${c.id})">Удалить</button>
        `;

        list.appendChild(div);
    });
}

async function deleteCourse(id) {
    const res = await api(`/api/admin/courses/${id}`, "DELETE");

    if (res.error) {
        alert(res.error);
        return;
    }

    alert("Курс удалён");
    loadAdminCourses();
}
