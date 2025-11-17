// ==========================
//  ПОИСК КУРСОВ (GLOBAL)
// ==========================

function searchCourses() {
    const input = document.getElementById("searchInput");
    if (!input) {
        console.warn("searchInput не найден на странице");
        return;
    }

    const text = input.value.trim();

    if (!text) {
        showMessage("Введите название курса", "warning");
        return;
    }

    // Переход в каталог с параметром поиска
    window.location.href = "catalog.html?search=" + encodeURIComponent(text);
}

// ==========================
//  ОБРАБОТКА ENTER В ПОИСКЕ
// ==========================
document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        const active = document.activeElement;
        if (active && active.id === "searchInput") {
            searchCourses();
        }
    }
});

// ==========================
//  АВТОПОДСТАНОВКА ПОИСКА НА catalog.html
// ==========================
function getSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
}

// Если мы на catalog.html — подставляем текст и запускаем фильтрацию
document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.includes("catalog.html")) {
        const search = getSearchQuery();
        const searchField = document.getElementById("catalogSearch");

        if (searchField && search) {
            searchField.value = search;
        }
    }
});
