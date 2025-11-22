
function initHeader() {

    let hamburger = document.getElementById('hamburger');
    let navsections = document.querySelectorAll('.nav');



    
    console.log('Hamburger element:', hamburger);
    console.log('Nav element:', navsections);

    if (hamburger && navsections.length > 0) {
        hamburger.onclick = function () {
            navsections.forEach(nav => {
                nav.classList.toggle('open');
            });
        };
    }

    let searchInput = document.getElementById("header-search-input");
    let searchBtn = document.getElementById("header-search-btn");

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

function isValidEmail(email) {
    let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNewsletterMessage(message, type) {
    let existingMessage = document.querySelector('.newsletter-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    let messageEl = document.createElement('div');
    messageEl.className = `newsletter-message ${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 6px;
        font-size: 0.9rem;
        text-align: center;
        ${type === 'success' ? 
            'background: rgba(182, 206, 180, 0.2); color: #fff; border: 1px solid rgba(182, 206, 180, 0.5);' : 
            'background: rgba(255, 100, 100, 0.2); color: #fff; border: 1px solid rgba(255, 100, 100, 0.5);'
        }
    `;
    const form = document.querySelector('.newsletter-form');
    form.parentNode.insertBefore(messageEl, form.nextSibling);

    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }
    }, 10000);
}

function initFooter() {
    let yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    const subscribedEmail = localStorage.getItem('newsletterSubscribed');
    if (subscribedEmail) {
        showPersistentNewsletterState(subscribedEmail);
    }

    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('.newsletter-input');
            const email = emailInput.value.trim();

            if (!email) {
                showNewsletterMessage('Please enter your email address.', 'error');
                return;
            }

            if (!isValidEmail(email)) {
                showNewsletterMessage('Please enter a valid email address.', 'error');
                return;
            }
            localStorage.setItem('newsletterSubscribed', email);
            showPersistentNewsletterState(email);
            emailInput.value = '';
            
            showNewsletterMessage('Welcome to our culinary family! You\'ll receive exclusive recipes soon.', 'success');
        });
    }
    const footerLinks = document.querySelectorAll('.footer-links a[href^="#"]');
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function showPersistentNewsletterState(email) {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;
    const inputGroup = form.querySelector('.input-group');
    if (inputGroup) {
        inputGroup.style.display = 'none';
    }
    const existingMessage = document.querySelector('.newsletter-subscribed-message');
    if (!existingMessage) {
        const messageEl = document.createElement('div');
        messageEl.className = 'newsletter-subscribed-message';
        messageEl.innerHTML = `
            <div style="
                background: rgba(182, 206, 180, 0.2);
                border: 1px solid rgba(182, 206, 180, 0.5);
                border-radius: 8px;
                padding: 1rem;
                text-align: center;
                color: #fff;
                font-size: 0.9rem;
            ">
                <i class="fas fa-check-circle" style="color: #B6CEB4; margin-right: 0.5rem;"></i>
                <strong>Subscribed!</strong><br>
                <small>You're receiving updates at ${email}</small>
            </div>
        `;
        form.appendChild(messageEl);
    }
}


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

}

document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initFooter();
    darkmode();
})
