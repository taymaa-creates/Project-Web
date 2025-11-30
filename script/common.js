function initHeader() {
    let hamburger = document.getElementById('hamburger');
    let nav = document.querySelector('.nav');

    console.log('Hamburger element:', hamburger);
    console.log('Nav element:', nav);

    if (hamburger && nav) {
        hamburger.onclick = function (e) {
            e.stopPropagation();
            nav.classList.toggle('open');
            const isExpanded = nav.classList.contains('open');
            hamburger.setAttribute('aria-expanded', isExpanded);

            if (!isExpanded) {
                closeAllDropdowns();
            }
        };
    }

    document.addEventListener('click', function (event) {
        if (!event.target.closest('.nav') && !event.target.closest('.hamburger')) {
            if (nav && nav.classList.contains('open')) {
                nav.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
                closeAllDropdowns();
            }
        }

        if (!event.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (nav && nav.classList.contains('open')) {
                nav.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
            }
            closeAllDropdowns();
        }
    });

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
   const favHeart = document.getElementById('favheart');
    if (favHeart) {
        favHeart.addEventListener("click", (e) => {
            e.preventDefault();
            openFavoritesModal();
        });
    }
}
function openFavoritesModal() {
    const favoriteIds = loadFavorites();
    
    if (favoriteIds.length === 0) {
        window.location.href = 'favorites.html';
        return;
    }
    createFavoritesModal(favoriteIds);
}

function loadFavorites() {
    return JSON.parse(localStorage.getItem("favorites")) || [];
}

async function createFavoritesModal(favoriteIds) {
    let allRecipes = [];
    try {
        let response = await fetch('recipes.json');
        allRecipes = await response.json();
    } catch (error) {
        console.error('Failed to load recipes:', error);
        return;
    }

    let favoriteRecipes = allRecipes.filter(recipe => favoriteIds.includes(recipe.id));
    let previewRecipes = favoriteRecipes.slice(0, 3); 
    let modalHTML = `
        <div class="favorites-modal" id="favorites-modal">
            <div class="favorites-modal-content">
                <div class="favorites-modal-header">
                    <h2>Your Favorite Recipes</h2>
                    <button class="close-modal" id="close-favorites-modal">&times;</button>
                </div>
                <div class="favorites-preview">
                    ${previewRecipes.length > 0 ? 
                        previewRecipes.map(recipe => `
                            <div class="favorite-preview-item" data-id="${recipe.id}">
                                <img src="${recipe.image}" alt="${recipe.name}" />
                                <div class="favorite-preview-info">
                                    <h4>${recipe.name}</h4>
                                    <p>${recipe.cuisine} · ${recipe.mealType}</p>
                                </div>
                            </div>
                        `).join('') 
                        : 
                        '<p class="no-favorites">No favorite recipes yet</p>'
                    }
                </div>
                <div class="favorites-modal-actions">
                    <button class="btn secondary" id="see-all-favorites">
                        See All Favorites (${favoriteRecipes.length})
                    </button>
                    <button class="btn primary" id="close-modal-btn">Continue Browsing</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    let modal = document.getElementById('favorites-modal');
    let closeModal = document.getElementById('close-favorites-modal');
    let closeModalBtn = document.getElementById('close-modal-btn');
    let seeAllBtn = document.getElementById('see-all-favorites');
    let closeModalHandler = () => {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };

    closeModal.addEventListener('click', closeModalHandler);
    closeModalBtn.addEventListener('click', closeModalHandler);
    
    seeAllBtn.addEventListener('click', () => {
        window.location.href = 'favorites.html';
    });
    document.querySelectorAll('.favorite-preview-item').forEach(item => {
        item.addEventListener('click', () => {
            const recipeId = item.dataset.id;
            window.location.href = `recipe.html?id=${recipeId}`;
        });
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalHandler();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal) {
            closeModalHandler();
        }
    });
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
}

function initDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('.nav-link');
        const menu = dropdown.querySelector('.dropdown-menu');

        if (button && menu) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.getAttribute('data-open') === 'true';

                closeAllDropdowns();

                if (!isOpen) {
                    dropdown.setAttribute('data-open', 'true');
                    button.setAttribute('aria-expanded', 'true');
                    menu.setAttribute('aria-hidden', 'false');
                }
            });

            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                } else if (e.key === 'Escape') {
                    closeAllDropdowns();
                    button.focus();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const firstLink = menu.querySelector('a');
                    if (firstLink) firstLink.focus();
                }
            });

            const links = menu.querySelectorAll('a');
            links.forEach((link, index) => {
                link.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextLink = links[index + 1] || links[0];
                        nextLink.focus();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevLink = links[index - 1] || links[links.length - 1];
                        prevLink.focus();
                    } else if (e.key === 'Escape') {
                        closeAllDropdowns();
                        button.focus();
                    } else if (e.key === 'Tab' && !e.shiftKey && index === links.length - 1) {
                        closeAllDropdowns();
                    }
                });
            });
        }
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('.nav-link');
        const menu = dropdown.querySelector('.dropdown-menu');

        dropdown.setAttribute('data-open', 'false');
        if (button) button.setAttribute('aria-expanded', 'false');
        if (menu) menu.setAttribute('aria-hidden', 'true');
    });
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
        newsletterForm.addEventListener('submit', function (e) {
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
        link.addEventListener('click', function (e) {
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
                <small>Your inbox is about to get a lot more interesting!</small>
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
    initDropdowns();
});