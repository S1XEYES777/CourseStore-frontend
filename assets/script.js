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



