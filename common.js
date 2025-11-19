

function initHeader() {

    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('nav');

    if (hamburger && nav) {
        hamburger.onclick = function () {
            nav.classList.toggle('open');
        };
    }

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
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
}

function initFooter() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initFooter();
});

function darkmode() {
    'use strict';
    const darkModeToggle = document.getElementById('darkModeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme');
    function setInitialTheme() {
        if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
            document.body.classList.add('dark-mode');
        }
    }
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    }
    setInitialTheme();
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    window.toggleDarkMode = toggleDarkMode;
    window.setInitialTheme = setInitialTheme;
}
darkmode();
