const API = "https://coursestore-backend.onrender.com";
  // поменяешь на свой URL

// Сохранение пользователя
function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

// Получить пользователя
function getUser() {
    let u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
}

// Выход
function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// =======================
//   РЕГИСТРАЦИЯ
// =======================
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
    alert(data.message);

    if (data.status === "ok") {
        window.location.href = "login.html";
    }
}


// =======================
//   ВХОД
// =======================
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
        saveUser(data.user);
        window.location.href = "profile.html";
    } else {
        alert(data.message);
    }
}
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
