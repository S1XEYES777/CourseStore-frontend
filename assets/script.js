// ================================
// CONFIG
// ================================
const API = "https://coursestore-backend.onrender.com";

// ================================
// LOCAL STORAGE USER
// ================================
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

// ================================
// TOAST
// ================================
function showMessage(text, type = "info") {
    if (!text) return;

    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const t = document.createElement("div");
    t.className = "toast " + (type === "success" ? "success" : type === "error" ? "error" : "");
    t.innerText = text;

    container.appendChild(t);

    setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 200);
    }, 2500);
}

// ================================
// API helper
// ================================
async function api(path, method = "GET", data = null) {
    const opts = { method, headers: {} };
    if (data) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(data);
    }

    let res;
    try {
        res = await fetch(API + path, opts);
    } catch (e) {
        console.error(e);
        throw new Error("Не удалось подключиться к серверу");
    }

    let json;
    try {
        json = await res.json();
    } catch (e) {
        console.error(e);
        throw new Error("Сервер вернул неправильный ответ");
    }

    if (!res.ok || json.status !== "ok") {
        throw new Error(json.message || "Ошибка сервера");
    }

    return json;
}

// ================================
// AUTH UI
// ================================
function setupAuthUI() {
    const user = getUser();
    const loginLink = document.getElementById("login-link");
    const logoutBtn = document.getElementById("logout-btn");
    const userNameSpan = document.getElementById("user-name");

    if (!loginLink && !logoutBtn && !userNameSpan) return;

    if (user) {
        if (loginLink) loginLink.style.display = "none";
        if (logoutBtn) {
            logoutBtn.style.display = "inline-flex";
            logoutBtn.onclick = () => logout();
        }
        if (userNameSpan) {
            userNameSpan.textContent = user.name || "";
        }
    } else {
        if (loginLink) loginLink.style.display = "inline-flex";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (userNameSpan) userNameSpan.textContent = "";
    }
}

// ================================
// HELPERS
// ================================
function createCourseCard(course, purchasedIds = new Set()) {
    const card = document.createElement("div");
    card.className = "course-card";
    const isPurchased = purchasedIds.has(course.id);
    if (isPurchased) {
        card.classList.add("purchased");
    }

    const img = document.createElement("img");
    img.className = "course-image";
    img.src = course.image || "https://dummyimage.com/640x360/020617/94a3b8&text=Course";
    img.alt = course.title || "Курс";

    const body = document.createElement("div");
    body.className = "course-body";

    const title = document.createElement("div");
    title.className = "course-title";
    title.textContent = course.title;

    const desc = document.createElement("div");
    desc.className = "course-description";
    desc.textContent = course.description || "";

    const bottom = document.createElement("div");
    bottom.className = "course-bottom";

    const price = document.createElement("span");
    price.className = "course-price";
    price.textContent = course.price ? `${course.price} ₸` : "Бесплатно";

    bottom.appendChild(price);

    if (isPurchased) {
        const badge = document.createElement("span");
        badge.className = "course-badge";
        badge.textContent = "Курс куплен";
        bottom.appendChild(badge);
    }

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(bottom);

    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener("click", () => {
        window.location.href = `course.html?id=${course.id}`;
    });

    return card;
}

async function loadCoursesWithPurchased() {
    const user = getUser();
    const [coursesRes, purchasesRes] = await Promise.all([
        api("/api/courses"),
        user ? api(`/api/purchases/${user.id}`) : Promise.resolve({ courses: [] })
    ]);

    const purchasedIds = new Set((purchasesRes.courses || []).map(c => c.id));
    return { courses: coursesRes.courses || [], purchasedIds };
}

// ================================
// INDEX PAGE
// ================================
async function initIndexPage() {
    const grid = document.getElementById("courses-grid");
    if (!grid) return;

    try {
        const { courses, purchasedIds } = await loadCoursesWithPurchased();
        grid.innerHTML = "";
        courses.forEach(course => {
            grid.appendChild(createCourseCard(course, purchasedIds));
        });
    } catch (e) {
        console.error(e);
        showMessage(e.message, "error");
    }
}

// ================================
// CATALOG PAGE
// ================================
async function initCatalogPage() {
    const grid = document.getElementById("courses-grid");
    if (!grid) return;

    try {
        const { courses, purchasedIds } = await loadCoursesWithPurchased();
        grid.innerHTML = "";
        courses.forEach(course => {
            grid.appendChild(createCourseCard(course, purchasedIds));
        });
    } catch (e) {
        console.error(e);
        showMessage(e.message, "error");
    }
}

// ================================
// COURSE PAGE
// ================================
async function initCoursePage() {
    const container = document.getElementById("course-container");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
        container.innerHTML = "<p>Курс не найден</p>";
        return;
    }

    const user = getUser();

    try {
        const [courseRes, purchasesRes] = await Promise.all([
            api(`/api/courses/${id}`),
            user ? api(`/api/purchases/${user.id}`) : Promise.resolve({ courses: [] })
        ]);

        const course = courseRes.course;
        const purchasedIds = new Set((purchasesRes.courses || []).map(c => c.id));
        const isPurchased = purchasedIds.has(course.id);

        container.innerHTML = "";

        const wrapper = document.createElement("div");
        wrapper.className = "course-page";

        const main = document.createElement("div");
        main.className = "course-page-main";

        const title = document.createElement("h1");
        title.textContent = course.title;

        const img = document.createElement("img");
        img.className = "course-image";
        img.src = course.image || "https://dummyimage.com/640x360/020617/94a3b8&text=Course";
        img.alt = course.title;

        const desc = document.createElement("p");
        desc.textContent = course.description || "";

        main.appendChild(title);
        main.appendChild(img);
        main.appendChild(desc);

        const side = document.createElement("div");
        side.className = "course-page-side";

        const price = document.createElement("p");
        price.innerHTML = `<strong>Цена:</strong> ${course.price ? course.price + " ₸" : "Бесплатно"}`;
        side.appendChild(price);

        const btn = document.createElement("button");
        btn.className = "btn-primary";

        if (isPurchased) {
            btn.textContent = "Курс куплен";
            btn.disabled = true;
        } else {
            btn.textContent = "Добавить в корзину";
            btn.onclick = async () => {
                const currentUser = getUser();
                if (!currentUser) {
                    showMessage("Сначала войдите в аккаунт", "error");
                    window.location.href = "login.html";
                    return;
                }
                try {
                    await api("/api/cart/add", "POST", {
                        user_id: currentUser.id,
                        course_id: course.id
                    });
                    showMessage("Курс добавлен в корзину", "success");
                } catch (e) {
                    showMessage(e.message, "error");
                }
            };
        }

        side.appendChild(btn);

        const info = document.createElement("p");
        info.style.fontSize = "13px";
        info.style.marginTop = "10px";
        info.style.color = "#9ca3af";
        info.textContent = isPurchased
            ? "Ниже пример списка уроков. Вы можете настроить реальные уроки в будущем."
            : "Уроки будут доступны только после покупки курса.";

        side.appendChild(info);

        if (isPurchased) {
            const lessonsTitle = document.createElement("h3");
            lessonsTitle.textContent = "Уроки курса (пример):";
            lessonsTitle.style.marginTop = "12px";
            side.appendChild(lessonsTitle);

            const ul = document.createElement("ul");
            ul.className = "lesson-list";
            ["Введение", "Основы темы", "Практические задания", "Финальный тест"]
                .forEach(l => {
                    const li = document.createElement("li");
                    li.textContent = l;
                    ul.appendChild(li);
                });
            side.appendChild(ul);
        }

        wrapper.appendChild(main);
        wrapper.appendChild(side);
        container.appendChild(wrapper);

    } catch (e) {
        console.error(e);
        showMessage(e.message, "error");
        container.innerHTML = "<p>Ошибка загрузки курса</p>";
    }
}

// ================================
// CART PAGE
// ================================
async function initCartPage() {
    const list = document.getElementById("cart-list");
    const totalSpan = document.getElementById("cart-total");
    const checkoutBtn = document.getElementById("checkout-btn");
    if (!list || !totalSpan || !checkoutBtn) return;

    const user = getUser();
    if (!user) {
        showMessage("Сначала войдите в аккаунт", "error");
        window.location.href = "login.html";
        return;
    }

    async function loadCart() {
        try {
            const res = await api(`/api/cart/${user.id}`);
            const courses = res.courses || [];
            list.innerHTML = "";

            if (!courses.length) {
                list.innerHTML = "<p>Корзина пуста</p>";
                totalSpan.textContent = "";
                return;
            }

            let total = 0;

            courses.forEach(course => {
                total += course.price || 0;

                const item = document.createElement("div");
                item.className = "cart-item";

                const img = document.createElement("img");
                img.src = course.image || "https://dummyimage.com/320x180/020617/94a3b8&text=Course";
                img.alt = course.title;

                const body = document.createElement("div");
                body.className = "cart-item-body";

                const title = document.createElement("div");
                title.textContent = course.title;

                const price = document.createElement("div");
                price.style.color = "#38bdf8";
                price.textContent = course.price ? `${course.price} ₸` : "Бесплатно";

                const actions = document.createElement("div");
                actions.style.display = "flex";
                actions.style.justifyContent = "flex-end";

                const removeBtn = document.createElement("button");
                removeBtn.className = "btn-ghost";
                removeBtn.textContent = "Удалить";
                removeBtn.onclick = async () => {
                    try {
                        await api("/api/cart/remove", "POST", {
                            user_id: user.id,
                            course_id: course.id
                        });
                        showMessage("Курс удалён из корзины", "success");
                        await loadCart();
                    } catch (e) {
                        showMessage(e.message, "error");
                    }
                };

                actions.appendChild(removeBtn);

                body.appendChild(title);
                body.appendChild(price);
                body.appendChild(actions);

                item.appendChild(img);
                item.appendChild(body);

                list.appendChild(item);
            });

            totalSpan.textContent = `Сумма: ${total} ₸`;
        } catch (e) {
            console.error(e);
            showMessage(e.message, "error");
        }
    }

    checkoutBtn.onclick = async () => {
        try {
            await api("/api/cart/checkout", "POST", { user_id: user.id });
            showMessage("Оплата успешна, курсы добавлены в профиль", "success");
            await loadCart();
        } catch (e) {
            showMessage(e.message, "error");
        }
    };

    await loadCart();
}

// ================================
// PROFILE PAGE
// ================================
async function initProfilePage() {
    const nameSpan = document.getElementById("profile-name");
    const phoneSpan = document.getElementById("profile-phone");
    const myCoursesGrid = document.getElementById("my-courses");

    const user = getUser();
    if (!user) {
        showMessage("Сначала войдите в аккаунт", "error");
        window.location.href = "login.html";
        return;
    }

    if (nameSpan) nameSpan.textContent = user.name || "";
    if (phoneSpan) phoneSpan.textContent = user.phone || "";

    if (!myCoursesGrid) return;

    try {
        const res = await api(`/api/purchases/${user.id}`);
        const courses = res.courses || [];
        myCoursesGrid.innerHTML = "";

        if (!courses.length) {
            myCoursesGrid.innerHTML = "<p>У вас пока нет купленных курсов</p>";
            return;
        }

        const purchasedIds = new Set(courses.map(c => c.id));
        courses.forEach(course => {
            myCoursesGrid.appendChild(createCourseCard(course, purchasedIds));
        });
    } catch (e) {
        console.error(e);
        showMessage(e.message, "error");
    }
}

// ================================
// LOGIN PAGE
// ================================
function initLoginPage() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const phone = data.get("phone");
        const password = data.get("password");

        try {
            const res = await api("/api/login", "POST", { phone, password });
            const user = res.user;
            saveUser(user);
            showMessage("Успешный вход", "success");

            if (user.is_admin) {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }
        } catch (err) {
            showMessage(err.message, "error");
        }
    });
}

// ================================
// REGISTER PAGE
// ================================
function initRegisterPage() {
    const form = document.getElementById("register-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const name = data.get("name");
        const phone = data.get("phone");
        const password = data.get("password");

        try {
            const res = await api("/api/register", "POST", {
                name,
                phone,
                password
            });
            const user = res.user;
            saveUser(user);
            showMessage("Аккаунт создан", "success");
            window.location.href = "index.html";
        } catch (err) {
            showMessage(err.message, "error");
        }
    });
}

// ================================
// ADMIN PAGE
// ================================
function initAdminPage() {
    const form = document.getElementById("admin-course-form");
    const list = document.getElementById("admin-courses");
    const imgInput = document.getElementById("course-image");

    const user = getUser();
    if (!user || !user.is_admin) {
        showMessage("Нет доступа к админ-панели", "error");
        window.location.href = "index.html";
        return;
    }

    let imageDataURL = null;

    if (imgInput) {
        imgInput.addEventListener("change", () => {
            const file = imgInput.files[0];
            if (!file) {
                imageDataURL = null;
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                imageDataURL = ev.target.result; // data:image/...;base64,...
            };
            reader.readAsDataURL(file);
        });
    }

    async function loadAdminCourses() {
        if (!list) return;
        try {
            const res = await api(`/api/admin/courses?user_id=${user.id}`);
            const courses = res.courses || [];
            list.innerHTML = "";
            const purchasedIds = new Set(); // админ только смотрит

            courses.forEach(course => {
                const card = createCourseCard(course, purchasedIds);
                list.appendChild(card);
            });
        } catch (e) {
            console.error(e);
            showMessage(e.message, "error");
        }
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const titleInput = document.getElementById("course-title");
            const descInput = document.getElementById("course-description");
            const priceInput = document.getElementById("course-price");

            const title = titleInput.value.trim();
            const description = descInput.value.trim();
            const price = priceInput.value || 0;

            if (!title) {
                showMessage("Введите название курса", "error");
                return;
            }

            try {
                await api("/api/admin/courses", "POST", {
                    user_id: user.id,
                    title,
                    description,
                    price,
                    image: imageDataURL
                });

                showMessage("Курс создан", "success");
                titleInput.value = "";
                descInput.value = "";
                priceInput.value = "";
                if (imgInput) imgInput.value = "";
                imageDataURL = null;

                await loadAdminCourses();
            } catch (err) {
                showMessage(err.message, "error");
            }
        });
    }

    loadAdminCourses();
}

// ================================
// ENTRY POINT
// ================================
document.addEventListener("DOMContentLoaded", () => {
    setupAuthUI();

    const page = document.body.dataset.page || "";

    if (page === "index") {
        initIndexPage();
    } else if (page === "catalog") {
        initCatalogPage();
    } else if (page === "course") {
        initCoursePage();
    } else if (page === "cart") {
        initCartPage();
    } else if (page === "profile") {
        initProfilePage();
    } else if (page === "login") {
        initLoginPage();
    } else if (page === "register") {
        initRegisterPage();
    } else if (page === "admin") {
        initAdminPage();
    }
});
