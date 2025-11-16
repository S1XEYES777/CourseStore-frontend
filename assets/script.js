// assets/script.js

// адрес твоего backend-а на Render
const API = "https://coursestore-backend.onrender.com";

// ----- Авторизация / пользователь -----
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch (e) {
        return null;
    }
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// Небольшой helper для красивых алертов (если захочешь – заменишь на кастомное окно)
function showMessage(text) {
    alert(text);
}
