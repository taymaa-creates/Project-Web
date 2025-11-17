let hamburger = document.getElementById('hamburger');   // burger icon
let navDesc = document.getElementById('nav');    // links container

// Toggle the mobile menu on burger click
hamburger.onclick = function () {
    navDesc.classList.toggle('open');                     // add/remove .open to show/hide
};// ===== COMMON HEADER & FOOTER FUNCTIONALITY =====

// ===== HEADER FUNCTIONALITY =====
function initHeader() {
    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('nav');

    if (hamburger && nav) {
        hamburger.onclick = function () {
            nav.classList.toggle('open');
        };
    }

    // Header search functionality
    const searchInput = document.getElementById("header-search-input");
    const searchBtn = document.getElementById("header-search-btn");

    if (searchInput && searchBtn) {
        function goToSearch() {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `recipes.html?search=${encodeURIComponent(query)}`;
            }
        }

        searchBtn.addEventListener("click", goToSearch);
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                goToSearch();
            }
        });
    }

    // Logo click to home
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
}

// ===== FOOTER FUNCTIONALITY =====
function initFooter() {
    // Dynamic year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initFooter();
});