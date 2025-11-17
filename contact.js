document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".form");
  const button = document.getElementById("button");

  form.addEventListener("submit", function (e) {
    e.preventDefault(); 

    const name = form.querySelector('input[type="text"]').value.trim();
    const email = form.querySelector('input[type="email"]').value.trim();
    const message = form.querySelector('textarea').value.trim();

    if (!name || !email || !message) {
      alert("Please fill out all fields.");
      return;
    }
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    if (!email.match(emailPattern)) {
      alert("Please enter a valid email address.");
      return;
    }
    alert("Thank you! Your message has been sent.");
    form.reset(); 
  });
});

const messages = [
  "Your thoughts matter to us.",
  "Got a recipe idea? Share it!",
  "We love hearing from fellow foodies.",
  "Questions, feedback, or just saying hi?",
  "Let’s cook up something great together!"
];

let index = 0;
const infoBox = document.getElementById("changing-info");

setInterval(() => {
  infoBox.style.opacity = 0;
  setTimeout(() => {
    index = (index + 1) % messages.length;
    infoBox.textContent = messages[index];
    infoBox.style.opacity = 1;
  }, 300);
}, 3000);

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