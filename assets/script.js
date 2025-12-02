// ============================================================
//  CONFIG
// ============================================================

const API = "https://coursestore-backend.onrender.com";


// ============================================================
//  USER LOCALSTORAGE
// ============================================================

function saveUser(user) {
    try {
        localStorage.setItem("user", JSON.stringify(user));
    } catch (e) {
        console.error("Не удалось сохранить пользователя:", e);
    }
}

function getUser() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.error("Не удалось прочитать пользователя:", e);
        return null;
    }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// ============================================================
//  TOAST / СООБЩЕНИЯ
// ============================================================

function showMessage(text, type = "info", timeout = 2500) {
    if (!text) return;

    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = text;
    container.appendChild(t);

    setTimeout(() => {
        t.classList.add("hide");
        setTimeout(() => {
            t.remove();
        }, 300);
    }, timeout);
}


// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

function renderStars(avgRating, ratingsCount) {
    if (!ratingsCount || ratingsCount === 0 || !avgRating) {
        return "Нет оценок";
    }
    const full = Math.round(avgRating); // 1..5
    let stars = "";
    for (let i = 1; i <= 5; i++) {
        stars += i <= full ? "★" : "☆";
    }
    return `${stars} (${avgRating.toFixed(1)})`;
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}


// ============================================================
//  AUTH (login / register) — минимально
// ============================================================

async function setupLoginPage() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const phone = form.phone.value.trim();
        const password = form.password.value.trim();

        if (!phone || !password) {
            showMessage("Заполните все поля", "error");
            return;
        }

        try {
            const res = await fetch(`${API}/api/login`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({phone, password})
            });
            const data = await res.json();

            if (data.status === "ok" && data.user) {
                saveUser(data.user);
                showMessage("Вы вошли", "success");
                window.location.href = "index.html";
            } else {
                showMessage(data.message || "Неверный логин или пароль", "error");
            }
        } catch (e) {
            console.error(e);
            showMessage("Ошибка подключения к серверу", "error");
        }
    });
}

async function setupRegisterPage() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = form.name.value.trim();
        const phone = form.phone.value.trim();
        const password = form.password.value.trim();

        if (!name || !phone || !password) {
            showMessage("Заполните все поля", "error");
            return;
        }

        try {
            const res = await fetch(`${API}/api/register`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name, phone, password})
            });
            const data = await res.json();

            if (data.status === "ok" && data.user) {
                saveUser(data.user);
                showMessage("Регистрация успешна", "success");
                window.location.href = "index.html";
            } else {
                showMessage(data.message || "Ошибка регистрации", "error");
            }
        } catch (e) {
            console.error(e);
            showMessage("Ошибка подключения к серверу", "error");
        }
    });
}


// ============================================================
//  NAVBAR / HEADER
// ============================================================

function setupNavbar() {
    // кнопка выхода, если есть
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            logout();
        });
    }

    // имя пользователя в навбаре, если есть
    const user = getUser();
    if (user) {
        const navUserName = document.getElementById("navUserName");
        if (navUserName) {
            navUserName.textContent = user.name || user.phone || "Профиль";
        }
    }
}


// ============================================================
//  КУРСЫ (Главная + Каталог)
// ============================================================

async function loadCoursesForGrid(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    const user = getUser();
    const params = user ? `?user_id=${user.id}` : "";

    grid.innerHTML = "<p>Загрузка курсов...</p>";

    try {
        const res = await fetch(`${API}/api/courses${params}`);
        const data = await res.json();

        if (data.status !== "ok") {
            grid.innerHTML = "<p>Не удалось загрузить курсы</p>";
            return;
        }

        grid.innerHTML = "";
        data.courses.forEach(course => {
            const card = document.createElement("div");
            card.className = "course-card";
            if (course.is_purchased) {
                card.classList.add("course-card-purchased");
            }

            const thumb = course.thumbnail || "assets/default_course.png";

            card.innerHTML = `
                <img src="${thumb}" alt="">
                <div class="course-card-body">
                    <div class="course-card-title">${course.title}</div>
                    <div class="course-card-meta">
                        <span>${course.price} ₸</span>
                        <span class="stars">${renderStars(
                            course.avg_rating || 0,
                            course.ratings_count || 0
                        )}</span>
                    </div>
                    ${
                        course.is_purchased
                            ? `<div class="course-card-badge">Курс куплен</div>`
                            : ``
                    }
                </div>
            `;

            card.addEventListener("click", () => {
                window.location.href = `course.html?id=${course.id}`;
            });

            grid.appendChild(card);
        });

        if (data.courses.length === 0) {
            grid.innerHTML = "<p>Курсов пока нет</p>";
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = "<p>Ошибка подключения к серверу</p>";
    }
}


// ============================================================
//  СТРАНИЦА КУРСА (course.html)
// ============================================================

async function loadCoursePage() {
    const thumbEl = document.getElementById("courseThumb");
    const titleEl = document.getElementById("courseTitle");
    const descEl = document.getElementById("courseDesc");
    const metaEl = document.getElementById("courseMeta");
    const lessonsList = document.getElementById("lessonsList");
    const buyBtn = document.getElementById("buyBtn");
    const addCartBtn = document.getElementById("addCartBtn");
    const reviewsList = document.getElementById("reviewsList");
    const sendReviewBtn = document.getElementById("sendReviewBtn");

    if (!thumbEl || !titleEl || !descEl || !metaEl || !lessonsList) {
        return; // это не course.html
    }

    const courseId = getQueryParam("id");
    if (!courseId) {
        showMessage("Курс не найден (нет id)", "error");
        return;
    }

    const user = getUser();
    const userId = user ? user.id : null;

    try {
        const res = await fetch(`${API}/api/courses/${courseId}` + (userId ? `?user_id=${userId}` : ""));
        const data = await res.json();

        if (data.status !== "ok") {
            showMessage(data.message || "Не удалось загрузить курс", "error");
            return;
        }

        const c = data.course;

        thumbEl.src = c.thumbnail || "assets/default_course.png";
        titleEl.textContent = c.title;
        descEl.textContent = c.description;

        if (c.ratings_count && c.ratings_count > 0) {
            metaEl.textContent = `Цена: ${c.price} ₸ · Рейтинг: ${c.avg_rating.toFixed(1)} (${c.ratings_count} оценок)`;
        } else {
            metaEl.textContent = `Цена: ${c.price} ₸ · Рейтинг: нет оценок`;
        }

        lessonsList.innerHTML = "";

        if (c.is_purchased) {
            // Курс куплен — показываем уроки
            if (Array.isArray(data.lessons) && data.lessons.length > 0) {
                data.lessons.forEach(ls => {
                    const div = document.createElement("div");
                    div.className = "lesson-item";
                    div.textContent = ls.title;
                    div.addEventListener("click", () => {
                        if (ls.video_url) {
                            window.open(ls.video_url, "_blank");
                        }
                    });
                    lessonsList.appendChild(div);
                });
            } else {
                lessonsList.innerHTML = "<p>Уроки пока не добавлены</p>";
            }

            if (buyBtn) buyBtn.style.display = "none";
            if (addCartBtn) addCartBtn.style.display = "none";
        } else {
            // НЕ куплен — уроки скрыты
            lessonsList.innerHTML = "<p>Купите курс, чтобы увидеть список уроков.</p>";

            if (buyBtn) buyBtn.style.display = "inline-block";
            if (addCartBtn) addCartBtn.style.display = "inline-block";
        }

        // Кнопка купить
        if (buyBtn) {
            buyBtn.onclick = async () => {
                const u = getUser();
                if (!u) {
                    window.location.href = "login.html";
                    return;
                }
                try {
                    const res = await fetch(`${API}/api/purchase`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({user_id: u.id, course_id: Number(courseId)})
                    });
                    const ans = await res.json();
                    if (ans.status === "ok") {
                        showMessage("Курс куплен!", "success");
                        setTimeout(() => location.reload(), 800);
                    } else {
                        showMessage(ans.message || "Ошибка покупки", "error");
                    }
                } catch (e) {
                    console.error(e);
                    showMessage("Ошибка подключения к серверу", "error");
                }
            };
        }

        // Кнопка добавить в корзину
        if (addCartBtn) {
            addCartBtn.onclick = async () => {
                const u = getUser();
                if (!u) {
                    window.location.href = "login.html";
                    return;
                }
                try {
                    const res = await fetch(`${API}/api/cart/add`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({user_id: u.id, course_id: Number(courseId)})
                    });
                    const ans = await res.json();
                    if (ans.status === "ok") {
                        showMessage("Курс добавлен в корзину", "success");
                    } else {
                        showMessage(ans.message || "Ошибка", "error");
                    }
                } catch (e) {
                    console.error(e);
                    showMessage("Ошибка подключения к серверу", "error");
                }
            };
        }

        // Загрузка отзывов
        if (reviewsList) {
            await loadReviews(courseId, userId);
        }

        // Отправка отзыва
        if (sendReviewBtn) {
            sendReviewBtn.onclick = async () => {
                const u = getUser();
                if (!u) {
                    window.location.href = "login.html";
                    return;
                }
                await sendReview(courseId, u.id);
            };
        }

    } catch (e) {
        console.error(e);
        showMessage("Ошибка подключения к серверу", "error");
    }
}


// ============================================================
//  ОТЗЫВЫ
// ============================================================

async function loadReviews(courseId, userId) {
    const reviewsList = document.getElementById("reviewsList");
    if (!reviewsList) return;

    reviewsList.innerHTML = "<p>Загрузка отзывов...</p>";

    try {
        const res = await fetch(
            `${API}/api/courses/${courseId}/reviews` + (userId ? `?user_id=${userId}` : "")
        );
        const data = await res.json();
        if (data.status !== "ok") {
            reviewsList.innerHTML = "<p>Не удалось загрузить отзывы</p>";
            return;
        }

        reviewsList.innerHTML = "";
        if (!data.reviews || data.reviews.length === 0) {
            reviewsList.innerHTML = "<p>Отзывов пока нет</p>";
            return;
        }

        data.reviews.forEach(r => {
            const div = document.createElement("div");
            div.className = "review-item";

            let stars = "";
            for (let i = 1; i <= 5; i++) {
                stars += i <= r.rating ? "★" : "☆";
            }

            div.innerHTML = `
                <div class="review-header">
                    <span class="review-user"><b>${r.user_name}</b></span>
                    <span class="review-stars">${stars}</span>
                </div>
                <div class="review-text">${r.text || ""}</div>
                <div class="review-date">
                    ${new Date(r.created_at).toLocaleString()}
                </div>
            `;
            reviewsList.appendChild(div);
        });

    } catch (e) {
        console.error(e);
        reviewsList.innerHTML = "<p>Ошибка подключения к серверу</p>";
    }
}

async function sendReview(courseId, userId) {
    const ratingEl = document.getElementById("reviewRating");
    const textEl = document.getElementById("reviewText");
    if (!ratingEl || !textEl) return;

    const rating = Number(ratingEl.value);
    const text = textEl.value.trim();

    if (!rating) {
        showMessage("Выберите оценку", "error");
        return;
    }

    try {
        const res = await fetch(`${API}/api/reviews`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                user_id: userId,
                course_id: Number(courseId),
                rating,
                text
            })
        });

        const data = await res.json();
        if (data.status === "ok") {
            showMessage("Спасибо за отзыв!", "success");
            textEl.value = "";
            await loadReviews(courseId, userId);
        } else {
            showMessage(data.message || "Ошибка при добавлении отзыва", "error");
        }
    } catch (e) {
        console.error(e);
        showMessage("Ошибка подключения к серверу", "error");
    }
}


// ============================================================
//  КОРЗИНА (cart.html)
// ============================================================

async function loadCart() {
    const list = document.getElementById("cartList");
    if (!list) return;

    const user = getUser();
    if (!user) {
        showMessage("Сначала войдите в аккаунт", "error");
        window.location.href = "login.html";
        return;
    }

    list.innerHTML = "<p>Загрузка корзины...</p>";

    try {
        const res = await fetch(`${API}/api/cart?user_id=${user.id}`);
        const data = await res.json();
        if (data.status !== "ok") {
            list.innerHTML = "<p>Не удалось загрузить корзину</p>";
            return;
        }

        list.innerHTML = "";
        let total = 0;

        data.items.forEach(item => {
            total += item.price;

            const div = document.createElement("div");
            div.className = "cart-item";

            const thumb = item.thumbnail || "assets/default_course.png";

            div.innerHTML = `
                <img src="${thumb}" alt="">
                <div class="cart-info">
                    <div class="cart-title">${item.title}</div>
                    <div class="cart-price">${item.price} ₸</div>
                </div>
                <button class="cart-remove-btn">Удалить</button>
            `;

            div.querySelector(".cart-remove-btn").onclick = async () => {
                try {
                    const res = await fetch(`${API}/api/cart/remove`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            user_id: user.id,
                            course_id: item.course_id
                        })
                    });
                    const ans = await res.json();
                    if (ans.status === "ok") {
                        showMessage("Курс удалён из корзины", "success");
                        loadCart();
                    } else {
                        showMessage(ans.message || "Ошибка", "error");
                    }
                } catch (e) {
                    console.error(e);
                    showMessage("Ошибка подключения к серверу", "error");
                }
            };

            list.appendChild(div);
        });

        if (data.items.length === 0) {
            list.innerHTML = "<p>В корзине пусто</p>";
        }

        const totalEl = document.getElementById("cartTotal");
        if (totalEl) {
            totalEl.textContent = `${total} ₸`;
        }

    } catch (e) {
        console.error(e);
        list.innerHTML = "<p>Ошибка подключения к серверу</p>";
    }
}


// ============================================================
//  ПРОФИЛЬ (profile.html) — мои курсы
// ============================================================

async function loadProfile() {
    const grid = document.getElementById("myCoursesGrid");
    if (!grid) return;

    const user = getUser();
    if (!user) {
        showMessage("Сначала войдите в аккаунт", "error");
        window.location.href = "login.html";
        return;
    }

    // имя/тел/баланс если есть в user
    setText("profileName", user.name || "");
    setText("profilePhone", user.phone || "");
    if (user.balance != null) {
        setText("profileBalance", `${user.balance} ₸`);
    }

    grid.innerHTML = "<p>Загрузка купленных курсов...</p>";

    try {
        const res = await fetch(`${API}/api/profile/my-courses?user_id=${user.id}`);
        const data = await res.json();

        if (data.status !== "ok") {
            grid.innerHTML = "<p>Не удалось загрузить курсы</p>";
            return;
        }

        grid.innerHTML = "";
        if (!data.courses || data.courses.length === 0) {
            grid.innerHTML = "<p>Вы ещё не купили ни одного курса</p>";
            return;
        }

        data.courses.forEach(c => {
            const card = document.createElement("div");
            card.className = "course-card course-card-purchased";

            const thumb = c.thumbnail || "assets/default_course.png";

            card.innerHTML = `
                <img src="${thumb}">
                <div class="course-card-body">
                    <div class="course-card-title">${c.title}</div>
                    <div class="course-card-meta">
                        <span>${
                            c.ratings_count && c.avg_rating
                                ? `Рейтинг: ${c.avg_rating.toFixed(1)} (${c.ratings_count})`
                                : "Нет оценок"
                        }</span>
                    </div>
                    <div class="course-card-badge">Курс куплен</div>
                </div>
            `;

            card.addEventListener("click", () => {
                window.location.href = `course.html?id=${c.id}`;
            });

            grid.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        grid.innerHTML = "<p>Ошибка подключения к серверу</p>";
    }
}


// ============================================================
//  АДМИН (admin.html) — рейтинги курсов и отзывы
// ============================================================

async function loadAdminCoursesRatings() {
    const tbody = document.getElementById("tableCoursesRatingsBody");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='4'>Загрузка...</td></tr>";

    try {
        const res = await fetch(`${API}/api/admin/courses/ratings`);
        const data = await res.json();
        if (data.status !== "ok") {
            tbody.innerHTML = "<tr><td colspan='4'>Ошибка загрузки</td></tr>";
            return;
        }

        tbody.innerHTML = "";

        data.courses.forEach(c => {
            const tr = document.createElement("tr");
            const avg = c.avg_rating && c.avg_rating.toFixed
                ? c.avg_rating.toFixed(1)
                : c.avg_rating;

            tr.innerHTML = `
                <td>${c.id}</td>
                <td>${c.title}</td>
                <td>${avg || 0}</td>
                <td>${c.ratings_count || 0}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = "<tr><td colspan='4'>Ошибка подключения</td></tr>";
    }
}

async function loadAdminReviews() {
    const tbody = document.getElementById("tableReviewsBody");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='7'>Загрузка...</td></tr>";

    try {
        const res = await fetch(`${API}/api/admin/reviews`);
        const data = await res.json();
        if (data.status !== "ok") {
            tbody.innerHTML = "<tr><td colspan='7'>Ошибка загрузки</td></tr>";
            return;
        }

        tbody.innerHTML = "";

        data.reviews.forEach(r => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${r.id}</td>
                <td>${r.course_title}</td>
                <td>${r.user_name}</td>
                <td>${r.rating}</td>
                <td>${r.text || ""}</td>
                <td>${new Date(r.created_at).toLocaleString()}</td>
                <td><button class="btn-del-review" data-id="${r.id}">Удалить</button></td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".btn-del-review").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                if (!confirm("Удалить отзыв?")) return;

                try {
                    const res = await fetch(`${API}/api/admin/reviews/${id}`, {
                        method: "DELETE"
                    });
                    const ans = await res.json();
                    if (ans.status === "ok") {
                        showMessage("Отзыв удалён", "success");
                        loadAdminReviews();
                        loadAdminCoursesRatings();
                    } else {
                        showMessage(ans.message || "Ошибка", "error");
                    }
                } catch (e) {
                    console.error(e);
                    showMessage("Ошибка подключения к серверу", "error");
                }
            });
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = "<tr><td colspan='7'>Ошибка подключения</td></tr>";
    }
}


// ============================================================
//  ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    setupNavbar();
    setupLoginPage();
    setupRegisterPage();

    // Главная
    if (document.getElementById("coursesGridHome")) {
        loadCoursesForGrid("coursesGridHome");
    }

    // Каталог
    if (document.getElementById("coursesGridCatalog")) {
        loadCoursesForGrid("coursesGridCatalog");
    }

    // Страница курса
    if (document.getElementById("coursePageRoot")) {
        loadCoursePage();
    } else {
        // или по наличию основных элементов
        const thumbEl = document.getElementById("courseThumb");
        if (thumbEl) loadCoursePage();
    }

    // Корзина
    if (document.getElementById("cartList")) {
        loadCart();
    }

    // Профиль
    if (document.getElementById("myCoursesGrid")) {
        loadProfile();
    }

    // Админ
    if (document.getElementById("tableCoursesRatingsBody")) {
        loadAdminCoursesRatings();
    }
    if (document.getElementById("tableReviewsBody")) {
        loadAdminReviews();
    }
});
