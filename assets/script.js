// ============================================================
//  CONFIG
// ============================================================

const API = "https://coursestore-backend.onrender.com";

// ============================================================
// LOCAL STORAGE USER
// ============================================================

function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    const u = localStorage.getItem("user");
    if (!u) return null;
    try { return JSON.parse(u); } catch { return null; }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ============================================================
// TOAST
// ============================================================

function showMessage(text, type = "info") {
    const box = document.querySelector(".toast-container") || (() => {
        const t = document.createElement("div");
        t.className = "toast-container";
        document.body.appendChild(t);
        return t;
    })();

    const div = document.createElement("div");
    div.className = `toast ${type}`;
    div.innerText = text;

    box.appendChild(div);

    setTimeout(() => {
        div.style.opacity = "0";
        setTimeout(() => div.remove(), 400);
    }, 2000);
}

// ============================================================
// STAR RENDERING
// ============================================================

function renderStars(rating) {
    rating = Number(rating || 0);
    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star ${i <= rating ? "filled" : ""}">★</span>`;
    }
    return html;
}

// ============================================================
// LOAD COURSES (HOME + CATALOG)
// ============================================================

async function loadCourses(targetSelector) {
    const user = getUser();
    const user_id = user ? user.id : "";

    const res = await fetch(`${API}/api/courses?user_id=${user_id}`);
    const data = await res.json();

    if (data.status !== "ok") return;

    const box = document.querySelector(targetSelector);
    if (!box) return;

    box.innerHTML = "";

    data.courses.forEach(c => {
        box.innerHTML += `
            <div class="course-card ${c.is_purchased ? "owned" : ""}" onclick="openCourse(${c.id})">
                <img class="thumb" src="${c.thumbnail}" />
                <h3>${c.title}</h3>
                <div class="rating">${renderStars(c.avg_rating)} (${c.ratings_count})</div>
                <p class="price">${c.price} ₸</p>
            </div>
        `;
    });
}

function openCourse(id) {
    window.location.href = `course.html?id=${id}`;
}

// ============================================================
// COURSE PAGE
// ============================================================

async function loadCoursePage() {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    const user = getUser();
    const user_id = user ? user.id : "";

    const res = await fetch(`${API}/api/courses/${id}?user_id=${user_id}`);
    const data = await res.json();

    if (data.status !== "ok") {
        showMessage("Ошибка загрузки курса", "error");
        return;
    }

    const c = data.course;
    const lessons = data.lessons;

    document.querySelector("#course-title").innerText = c.title;
    document.querySelector("#course-desc").innerText = c.description;
    document.querySelector("#course-price").innerText = c.price + " ₸";
    document.querySelector("#course-thumb").src = c.thumbnail;

    document.querySelector("#course-rating").innerHTML = `
        ${renderStars(c.avg_rating)} (${c.ratings_count})
    `;

    const lessonsBox = document.querySelector("#lessons");

    if (!c.is_purchased) {
        lessonsBox.innerHTML = `<p class="locked">Купите курс, чтобы получить доступ к урокам</p>`;
        document.querySelector("#buy-btn").style.display = "block";
    } else {
        document.querySelector("#buy-btn").style.display = "none";
        lessonsBox.innerHTML = "";

        lessons.forEach(l => {
            lessonsBox.innerHTML += `
            <div class="lesson" onclick="openVideo('${l.video_url}', '${l.title}')">
                <h4>${l.order_index}. ${l.title}</h4>
            </div>`;
        });
    }
}

function openVideo(url, title) {
    localStorage.setItem("video_title", title);
    localStorage.setItem("video_url", url);
    window.location.href = "video.html";
}

async function buyCourse() {
    const user = getUser();
    if (!user) return showMessage("Войдите в аккаунт", "error");

    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    const res = await fetch(`${API}/api/purchase`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ user_id: user.id, course_id: id })
    });

    const data = await res.json();
    if (data.status === "ok") {
        showMessage("Курс куплен!", "success");
        setTimeout(() => location.reload(), 800);
    } else {
        showMessage(data.message, "error");
    }
}

// ============================================================
// CART
// ============================================================

async function loadCart() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(`${API}/api/cart?user_id=${user.id}`);
    const data = await res.json();

    const box = document.querySelector("#cart-list");
    const totalBox = document.querySelector("#cart-total");
    
    box.innerHTML = "";
    let total = 0;

    data.items.forEach(item => {
        total += item.price;
        box.innerHTML += `
            <div class="cart-item">
                <img class="cart-thumb" src="${item.thumbnail}">
                <div class="cart-info">
                    <h3>${item.title}</h3>
                    <p>${item.price} ₸</p>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.course_id})">Удалить</button>
            </div>
        `;
    });

    totalBox.innerText = total + " ₸";
}

async function removeFromCart(course_id) {
    const user = getUser();
    if (!user) return;

    await fetch(`${API}/api/cart/remove`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ user_id: user.id, course_id })
    });

    loadCart();
}

async function purchaseAll() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(`${API}/api/cart?user_id=${user.id}`);
    const data = await res.json();

    for (let item of data.items) {
        await fetch(`${API}/api/purchase`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ user_id: user.id, course_id: item.course_id })
        });
    }

    showMessage("Покупка успешна!", "success");
    loadCart();
}

// ============================================================
// PROFILE PAGE
// ============================================================

async function loadProfile() {
    const user = getUser();
    if (!user) return;

    document.querySelector("#profile-name").innerText = user.name;
    document.querySelector("#profile-phone").innerText = user.phone;
    document.querySelector("#profile-balance").innerText = user.balance + " ₸";

    const res = await fetch(`${API}/api/profile/my-courses?user_id=${user.id}`);
    const data = await res.json();

    const box = document.querySelector("#my-courses");
    box.innerHTML = "";

    data.courses.forEach(c => {
        box.innerHTML += `
            <div class="course-card owned" onclick="openCourse(${c.id})">
                <img class="thumb" src="${c.thumbnail}">
                <h3>${c.title}</h3>
                <div class="rating">${renderStars(c.avg_rating)} (${c.ratings_count})</div>
            </div>
        `;
    });
}

// ============================================================
// LOGIN / REGISTER
// ============================================================

async function doLogin() {
    const phone = document.querySelector("#phone").value;
    const password = document.querySelector("#password").value;

    const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ phone, password })
    });

    const data = await res.json();
    if (data.status === "ok") {
        saveUser(data.user);
        window.location.href = "index.html";
    } else {
        showMessage(data.message, "error");
    }
}

async function doRegister() {
    const name = document.querySelector("#name").value;
    const phone = document.querySelector("#phone").value;
    const password = document.querySelector("#password").value;

    const res = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name, phone, password })
    });

    const data = await res.json();
    if (data.status === "ok") {
        saveUser(data.user);
        window.location.href = "index.html";
    } else {
        showMessage(data.message, "error");
    }
}

// ============================================================
// ADMIN
// ============================================================

async function loadAdminReviews() {
    const res = await fetch(`${API}/api/admin/reviews`);
    const data = await res.json();

    const box = document.querySelector("#admin-reviews");
    box.innerHTML = "";

    data.reviews.forEach(r => {
        box.innerHTML += `
            <div class="review-admin">
                <b>${r.course_title}</b>
                <div>${renderStars(r.rating)} (${r.rating})</div>
                <p>${r.text}</p>
                <span>${r.user_name}</span>
                <button onclick="deleteReview(${r.id})">Удалить</button>
            </div>
        `;
    });
}

async function deleteReview(id) {
    await fetch(`${API}/api/admin/reviews/${id}`, {
        method: "DELETE"
    });
    loadAdminReviews();
}

async function loadAdminRatings() {
    const res = await fetch(`${API}/api/admin/courses/ratings`);
    const data = await res.json();

    const box = document.querySelector("#admin-ratings");
    box.innerHTML = "";

    data.courses.forEach(c => {
        box.innerHTML += `
            <div class="rating-row">
                <b>${c.title}</b>
                <div>${renderStars(c.avg_rating)} (${c.ratings_count})</div>
            </div>
        `;
    });
}
