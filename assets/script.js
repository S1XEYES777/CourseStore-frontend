// ============================================================
//  CONFIG
// ============================================================

const API = "https://coursestore-backend.onrender.com";

// ================================
// LOCAL STORAGE USER
// ================================
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}
function getUser() {
    let u = localStorage.getItem("user");
    if (!u) return null;
    try { return JSON.parse(u); } catch { return null; }
}
function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ================================
// TOAST
// ================================
function showMessage(text, type = "info") {
    if (!text) return;

    let box = document.querySelector(".toast-container");
    if (!box) {
        box = document.createElement("div");
        box.className = "toast-container";
        document.body.appendChild(box);
    }

    const div = document.createElement("div");
    div.className = `toast ${type}`;
    div.innerText = text;

    box.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// ================================
// LOAD COURSES (MAIN + CATALOG)
// ================================
async function loadCourses(containerId = "courses-list") {
    const user = getUser();
    const user_id = user ? user.id : "";

    try {
        const res = await fetch(`${API}/api/courses?user_id=${user_id}`);
        const data = await res.json();

        if (data.status !== "ok") {
            showMessage("Ошибка загрузки курсов", "error");
            return;
        }

        const list = document.getElementById(containerId);
        if (!list) return;

        list.innerHTML = "";

        data.courses.forEach(c => {
            const div = document.createElement("div");
            div.className = "course-card";

            if (c.is_purchased) div.classList.add("purchased");

            div.innerHTML = `
                <img src="${c.thumbnail}" class="course-thumb">
                <h3>${c.title}</h3>

                <div class="rating">
                    ⭐ ${c.avg_rating} (${c.ratings_count})
                </div>

                <p>${c.description.substring(0, 80)}...</p>

                <div class="card-actions">
                    <a href="course.html?id=${c.id}" class="btn">Подробнее</a>

                    ${c.is_purchased
                        ? `<span class="purchased-label">Куплено</span>`
                        : `<span class="price">${c.price}₸</span>`
                    }
                </div>
            `;

            list.appendChild(div);
        });

    } catch (err) {
        showMessage("Ошибка соединения", "error");
        console.error(err);
    }
}

// ================================
// LOAD ONE COURSE (course.html)
// ================================
async function loadCourseDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const user = getUser();
    const user_id = user ? user.id : "";

    try {
        const res = await fetch(`${API}/api/courses/${id}?user_id=${user_id}`);
        const data = await res.json();

        if (data.status !== "ok") {
            showMessage("Курс не найден", "error");
            return;
        }

        const c = data.course;

        document.getElementById("course-title").innerText = c.title;
        document.getElementById("course-description").innerText = c.description;
        document.getElementById("course-thumb").src = c.thumbnail;
        document.getElementById("course-rating").innerHTML =
            `⭐ ${c.avg_rating} (${c.ratings_count})`;

        const lessonsBlock = document.getElementById("lessons");
        const buyBtn = document.getElementById("buy-btn");

        if (!c.is_purchased) {
            lessonsBlock.innerHTML = "<p class='locked'>Купите курс чтобы увидеть уроки</p>";
            buyBtn.style.display = "block";
            buyBtn.onclick = () => buyCourse(c.id);
        } else {
            buyBtn.style.display = "none";
            lessonsBlock.innerHTML = "";
            data.lessons.forEach(l => {
                const div = document.createElement("div");
                div.className = "lesson";
                div.innerHTML = `
                    <h4>${l.title}</h4>
                    <video controls src="${l.video_url}"></video>
                `;
                lessonsBlock.appendChild(div);
            });
        }

        loadReviews(id);

    } catch (err) {
        showMessage("Ошибка загрузки", "error");
    }
}

// ================================
// CART
// ================================
async function addToCart(course_id) {
    const user = getUser();
    if (!user) return window.location.href = "login.html";

    const res = await fetch(`${API}/api/cart/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, course_id })
    });

    const data = await res.json();
    if (data.status === "ok")
        showMessage("Добавлено в корзину");
    else showMessage(data.message, "error");
}

async function loadCart() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(`${API}/api/cart?user_id=${user.id}`);
    const data = await res.json();

    const list = document.getElementById("cart-list");
    const total = document.getElementById("cart-total");

    list.innerHTML = "";
    let sum = 0;

    data.items.forEach(i => {
        sum += i.price;

        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <img src="${i.thumbnail}">
            <div>
                <h3>${i.title}</h3>
                <p>${i.price}₸</p>
            </div>

            <button onclick="removeFromCart(${i.course_id})" class="btn red">
                Удалить
            </button>
        `;

        list.appendChild(div);
    });

    total.innerText = sum;
}

async function removeFromCart(course_id) {
    const user = getUser();
    const res = await fetch(`${API}/api/cart/remove`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ user_id: user.id, course_id })
    });

    const data = await res.json();
    if (data.status === "ok") {
        showMessage("Удалено");
        loadCart();
    }
}

// ================================
// PURCHASE
// ================================
async function buyCourse(course_id) {
    const user = getUser();
    if (!user) return;

    const res = await fetch(`${API}/api/purchase`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ user_id: user.id, course_id })
    });

    const data = await res.json();

    if (data.status === "ok") {
        showMessage("Курс куплен!", "success");
        setTimeout(() => location.reload(), 800);
    } else {
        showMessage(data.message, "error");
    }
}

// ================================
// REVIEWS
// ================================
async function loadReviews(course_id) {
    const user = getUser();
    const user_id = user ? user.id : 0;

    const res = await fetch(`${API}/api/courses/${course_id}/reviews?user_id=${user_id}`);
    const data = await res.json();

    const block = document.getElementById("reviews");
    block.innerHTML = "";

    data.reviews.forEach(r => {
        const div = document.createElement("div");
        div.className = "review";
        div.innerHTML = `
            <b>${r.user_name}</b> — ⭐${r.rating}
            <p>${r.text}</p>
        `;
        block.appendChild(div);
    });
}

async function sendReview(course_id) {
    const user = getUser();
    if (!user) return showMessage("Войдите", "error");

    const rating = document.getElementById("review-rating").value;
    const text = document.getElementById("review-text").value;

    const res = await fetch(`${API}/api/reviews`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            user_id: user.id,
            course_id,
            rating,
            text
        })
    });

    const data = await res.json();

    if (data.status === "ok") {
        showMessage("Отзыв добавлен");
        loadReviews(course_id);
    }
}

// ================================
// PROFILE — MY COURSES
// ================================
async function loadMyCourses() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(`${API}/api/profile/my-courses?user_id=${user.id}`);
    const data = await res.json();

    const list = document.getElementById("my-courses");
    list.innerHTML = "";

    data.courses.forEach(c => {
        const div = document.createElement("div");
        div.className = "course-card purchased";

        div.innerHTML = `
            <img src="${c.thumbnail}">
            <h3>${c.title}</h3>
            <div class="rating">⭐ ${c.avg_rating} (${c.ratings_count})</div>
            <a href="course.html?id=${c.id}" class="btn">Открыть</a>
        `;

        list.appendChild(div);
    });
}

async function loadCourses() {
    try {
        const user = getUser();
        const user_id = user ? user.id : "";

        const res = await fetch(API + `/api/courses?user_id=${user_id}`);
        const data = await res.json();

        if (data.status !== "ok") {
            showMessage("Ошибка загрузки курсов", "error");
            return;
        }

        const box = document.getElementById("courses");
        box.innerHTML = "";

        data.courses.forEach(c => {
            let stars = "★".repeat(Math.round(c.avg_rating || 0));
            let colorClass = c.is_purchased ? "purchased" : "";

            box.innerHTML += `
                <div class="course-card ${colorClass}" onclick="location.href='course.html?id=${c.id}'">
                    <img class="course-thumb" src="${c.thumbnail}" alt="">
                    <h3>${c.title}</h3>
                    <p>${c.description.substring(0, 80)}...</p>
                    <div class="rating">${stars} (${c.ratings_count || 0})</div>
                </div>
            `;
        });

    } catch (e) {
        document.getElementById("courses").innerHTML =
            "<p style='padding:40px'>Ошибка подключения к серверу</p>";
    }
}
async function loadCatalog() {
    try {
        const user = getUser();
        const user_id = user ? user.id : "";

        const res = await fetch(API + `/api/courses?user_id=${user_id}`);
        const data = await res.json();

        if (data.status !== "ok") {
            showMessage("Ошибка загрузки каталога", "error");
            return;
        }

        const box = document.getElementById("catalog");
        box.innerHTML = "";

        data.courses.forEach(c => {
            let stars = "★".repeat(Math.round(c.avg_rating || 0));
            let className = c.is_purchased ? "purchased" : "";

            box.innerHTML += `
                <div class="course-card ${className}" onclick="location.href='course.html?id=${c.id}'">
                    <img class="course-thumb" src="${c.thumbnail}">
                    <h3>${c.title}</h3>
                    <p>${c.description.substring(0, 80)}...</p>
                    <div class="rating">${stars} (${c.ratings_count})</div>
                </div>
            `;
        });

    } catch (err) {
        document.getElementById("catalog").innerHTML =
            "<p style='padding:40px'>Ошибка подключения к серверу</p>";
    }
}

async function loadCoursePage() {
    const url = new URL(window.location.href);
    const course_id = url.searchParams.get("id");

    const user = getUser();
    const user_id = user ? user.id : "";

    try {
        const res = await fetch(API + `/api/courses/${course_id}?user_id=${user_id}`);
        const data = await res.json();

        if (data.status !== "ok") {
            showMessage("Ошибка загрузки курса", "error");
            return;
        }

        const course = data.course;

        document.getElementById("course-thumb").src = course.thumbnail;
        document.getElementById("course-title").innerText = course.title;
        document.getElementById("course-description").innerText = course.description;
        document.getElementById("rating-block").innerText =
            "★".repeat(Math.round(course.avg_rating || 0)) + ` (${course.ratings_count})`;

        const action = document.getElementById("action-block");

        if (!user) {
            action.innerHTML = `<p>Чтобы купить курс — <a href="login.html" style="color:#4eaaff">войдите</a></p>`;
        } else if (course.is_purchased) {
            action.innerHTML = `<div class="purchased-label">Курс куплен ✔</div>`;
            loadLessons(data.lessons);
            document.getElementById("review-form").style.display = "block";
        } else {
            action.innerHTML = `
                <button class="btn" onclick="addToCart(${course.id})">Добавить в корзину</button>
                <button class="btn green" onclick="buyNow(${course.id})">Купить сейчас</button>
            `;
            document.getElementById("lessons").innerHTML =
                `<div class="locked">Уроки станут доступны после покупки курса</div>`;
        }

        loadReviews(course_id, user_id);

    } catch (e) {
        showMessage("Ошибка соединения с сервером", "error");
    }
}

function loadLessons(lessons) {
    const block = document.getElementById("lessons");
    block.innerHTML = "";

    lessons.forEach(l => {
        block.innerHTML += `
            <div class="lesson">
                <h4>${l.order_index}. ${l.title}</h4>
                <video controls src="${l.video_url}"></video>
            </div>
        `;
    });
}

async function loadReviews(course_id, user_id) {
    const res = await fetch(API + `/api/courses/${course_id}/reviews?user_id=${user_id}`);
    const data = await res.json();

    const box = document.getElementById("reviews-block");
    box.innerHTML = "";

    data.reviews.forEach(r => {
        box.innerHTML += `
            <div class="review">
                <b>${r.user_name}</b> — ★${r.rating} <br>
                <p>${r.text || ""}</p>
            </div>
        `;
    });
}

async function addReview() {
    const url = new URL(window.location.href);
    const course_id = url.searchParams.get("id");

    const user = getUser();
    if (!user) return showMessage("Авторизуйтесь", "error");

    const rating = document.getElementById("review-rating").value;
    const text = document.getElementById("review-text").value;

    const res = await fetch(API + "/api/reviews", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            user_id: user.id,
            course_id,
            rating,
            text
        })
    });

    const data = await res.json();

    if (data.status === "ok") {
        showMessage("Отзыв добавлен", "success");
        loadCoursePage(); // обновить
    } else {
        showMessage("Ошибка", "error");
    }
}


async function loadCart() {
    const user = getUser();
    if (!user) {
        document.getElementById("cart-list").innerHTML =
            "<p style='padding:40px'>Войдите, чтобы увидеть корзину</p>";
        return;
    }

    try {
        const res = await fetch(API + `/api/cart?user_id=${user.id}`);
        const data = await res.json();

        if (data.status !== "ok") {
            showMessage("Ошибка загрузки корзины", "error");
            return;
        }

        const box = document.getElementById("cart-list");
        let total = 0;
        box.innerHTML = "";

        data.items.forEach(item => {
            total += item.price;

            box.innerHTML += `
                <div class="cart-item">
                    <img src="${item.thumbnail}">
                    <div style="flex-grow:1">
                        <h3>${item.title}</h3>
                        <p>Цена: ${item.price} ₸</p>
                    </div>
                    <button class="btn red" onclick="removeFromCart(${item.course_id})">Удалить</button>
                </div>
            `;
        });

        document.getElementById("total").innerText = total;

    } catch (err) {
        document.getElementById("cart-list").innerHTML =
            "<p style='padding:40px'>Ошибка соединения с сервером</p>";
    }
}
async function removeFromCart(course_id) {
    const user = getUser();
    if (!user) return;

    const res = await fetch(API + "/api/cart/remove", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            user_id: user.id,
            course_id
        })
    });

    const data = await res.json();

    if (data.status === "ok") {
        showMessage("Удалено", "success");
        loadCart();
    } else {
        showMessage("Ошибка", "error");
    }
}
async function buyAll() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(API + `/api/cart?user_id=${user.id}`);
    const data = await res.json();

    if (!data.items.length) {
        showMessage("Корзина пустая", "error");
        return;
    }

    for (let item of data.items) {
        await buyNow(item.course_id, false); // silent buy
    }

    showMessage("Покупка успешно завершена!", "success");
    loadCart();
}
async function loadProfile() {
    const user = getUser();
    if (!user) {
        location.href = "login.html";
        return;
    }

    document.getElementById("p-name").innerText = user.name;
    document.getElementById("p-phone").innerText = user.phone;
    document.getElementById("p-balance").innerText = user.balance;
}
async function loadMyCourses() {
    const user = getUser();
    if (!user) return;

    try {
        const res = await fetch(API + `/api/profile/my-courses?user_id=${user.id}`);
        const data = await res.json();

        if (data.status !== "ok") {
            showMessage("Ошибка загрузки курсов", "error");
            return;
        }

        const box = document.getElementById("my-courses");
        box.innerHTML = "";

        data.courses.forEach(c => {
            let stars = "★".repeat(Math.round(c.avg_rating || 0));

            box.innerHTML += `
                <div class="course-card purchased" onclick="location.href='course.html?id=${c.id}'">
                    <img class="course-thumb" src="${c.thumbnail}">
                    <h3>${c.title}</h3>
                    <div class="rating">${stars} (${c.ratings_count})</div>
                </div>
            `;
        });

    } catch (e) {
        document.getElementById("my-courses").innerHTML =
            "<p style='padding:40px'>Ошибка соединения с сервером</p>";
    }
}

async function loginUser() {
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!phone || !password) {
        showMessage("Введите телефон и пароль", "error");
        return;
    }

    const res = await fetch(API + "/api/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ phone, password })
    });

    const data = await res.json();

    if (data.status === "ok") {
        saveUser(data.user);
        showMessage("Успешный вход!", "success");
        setTimeout(() => location.href = "profile.html", 500);
    } else {
        showMessage(data.message || "Ошибка входа", "error");
    }
}

async function registerUser() {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!name || !phone || !password) {
        showMessage("Заполните все поля", "error");
        return;
    }

    const res = await fetch(API + "/api/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name, phone, password })
    });

    const data = await res.json();

    if (data.status === "ok") {
        showMessage("Аккаунт создан!", "success");
        saveUser(data.user);
        setTimeout(() => location.href = "profile.html", 500);
    } else {
        showMessage(data.message || "Ошибка регистрации", "error");
    }
}

async function loadAdminReviews() {
    const box = document.getElementById("reviews-admin");

    try {
        const res = await fetch(API + "/api/admin/reviews");
        const data = await res.json();

        if (data.status !== "ok") {
            box.innerHTML = "Ошибка загрузки отзывов";
            return;
        }

        box.innerHTML = "";

        data.reviews.forEach(r => {
            box.innerHTML += `
                <div class="review">
                    <b>${r.user_name}</b> — ★${r.rating}<br>
                    <b>Курс:</b> ${r.course_title}<br><br>
                    <p>${r.text || ""}</p>
                    <button class="btn red" onclick="deleteReview(${r.id})">Удалить</button>
                </div>
            `;
        });

    } catch (err) {
        box.innerHTML = "Ошибка подключения к серверу";
    }
}
async function deleteReview(id) {
    if (!confirm("Удалить отзыв?")) return;

    const res = await fetch(API + `/api/admin/reviews/${id}`, {
        method: "DELETE"
    });

    const data = await res.json();

    if (data.status === "ok") {
        showMessage("Отзыв удалён", "success");
        loadAdminReviews();
        loadCourseRatings(); // обновить рейтинги
    } else {
        showMessage("Ошибка удаления", "error");
    }
}
async function loadCourseRatings() {
    const box = document.getElementById("courses-ratings");

    try {
        const res = await fetch(API + "/api/admin/courses/ratings");
        const data = await res.json();

        if (data.status !== "ok") {
            box.innerHTML = "Ошибка загрузки рейтингов";
            return;
        }

        box.innerHTML = "";

        data.courses.forEach(c => {
            let stars = "★".repeat(Math.round(c.avg_rating || 0));

            box.innerHTML += `
                <div class="review">
                    <b>${c.title}</b><br>
                    Рейтинг: ${stars} (${c.avg_rating || 0})<br>
                    Отзывов: ${c.ratings_count}
                </div>
            `;
        });

    } catch (err) {
        box.innerHTML = "Ошибка соединения с сервером";
    }
}

