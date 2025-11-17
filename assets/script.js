// assets/script.js

// ==========================
//  БАЗОВЫЕ НАСТРОЙКИ API
// ==========================
const API = "https://coursestore-backend.onrender.com";

// ==========================
//  ХРАНЕНИЕ ПОЛЬЗОВАТЕЛЯ
// ==========================
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

// ==========================
//  ТОСТ-УВЕДОМЛЕНИЯ (БЕЗ alert)
// ==========================
function showMessage(text, type = "info") {
    if (!text) return;

    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";

    if (type === "error") {
        toast.classList.add("toast-error");
    } else if (type === "success") {
        toast.classList.add("toast-success");
    } else if (type === "warning") {
        toast.classList.add("toast-warning");
    }

    toast.textContent = text;
    container.appendChild(toast);

    // анимация появления
    requestAnimationFrame(() => {
        toast.classList.add("toast-show");
    });

    // убрать через 3.5 секунды
    setTimeout(() => {
        toast.classList.remove("toast-show");
        setTimeout(() => toast.remove(), 200);
    }, 3500);
}

// ==========================
//  ОБЁРТКИ ДЛЯ FETCH
// ==========================
async function apiGet(path) {
    const res = await fetch(API + path, {
        credentials: "include",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Ошибка запроса");
    }
    return data;
}

async function apiPost(path, body) {
    const res = await fetch(API + path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body || {}),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Ошибка запроса");
    }
    return data;
}
