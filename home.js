// ===== HOME PAGE SPECIFIC FUNCTIONALITY =====

let recipes = [];
let currentIndex = 0;
const STORAGE_KEY = "favorites";

// Utility functions
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function loadFavorites() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveFavorites(favIds) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favIds));
}

function setupHeartButtons() {
    let favoriteIds = loadFavorites();

    document.querySelectorAll(".recipe-card, .recipe-card1").forEach(card => {
        const id = card.dataset.id;
        const heartBtn = card.querySelector(".heart-btn");

        if (!heartBtn) return;

        if (favoriteIds.includes(id)) {
            heartBtn.classList.add("filled");
        }

        heartBtn.addEventListener("click", e => {
            e.stopPropagation();
            if (favoriteIds.includes(id)) {
                favoriteIds = favoriteIds.filter(f => f !== id);
                heartBtn.classList.remove("filled");
            } else {
                favoriteIds.push(id);
                heartBtn.classList.add("filled");
            }
            saveFavorites(favoriteIds);
        });
    });
}

// ===== CONTAINER 1: RECIPE SLIDER =====
function initRecipeSlider() {
    const imgEl = document.getElementById("recipe-image");
    const titleEl = document.getElementById("recipe-title");
    const descEl = document.getElementById("recipe-desc");
    const tagsEl = document.getElementById("recipe-tags");
    const timeEl = document.getElementById("recipe-time");
    const difficultyEl = document.getElementById("recipe-difficulty");
    const readMoreBtn = document.getElementById("read-more");
    const prevBtn = document.querySelector(".prev-btn");
    const nextBtn = document.querySelector(".next-btn");

    if (!imgEl) return;

    fetch("recipes.json")
        .then(res => res.json())
        .then(data => {
            recipes = data.sort(() => Math.random() - 0.5);
            if (recipes.length > 0) {
                displayRecipe(recipes[currentIndex]);
            }
        })
        .catch(err => console.error("Error loading JSON:", err));

    function displayRecipe(recipe) {
        imgEl.src = recipe.image;
        imgEl.alt = recipe.name;

        titleEl.textContent = recipe.name;
        const shortDesc = recipe.instructions[0] || "No description available.";
        descEl.textContent = shortDesc.length > 120 ? shortDesc.slice(0, 120) + "..." : shortDesc;

        tagsEl.innerHTML = "";
        if (recipe.cuisine)
            tagsEl.innerHTML += `<span class="tag cuisine">${recipe.cuisine}</span>`;
        if (recipe.diet)
            tagsEl.innerHTML += `<span class="tag diet">${recipe.diet}</span>`;
        if (recipe.mealType)
            tagsEl.innerHTML += `<span class="tag mealType">${recipe.mealType}</span>`;

        timeEl.textContent = recipe.time?.total || "N/A";
        difficultyEl.textContent = recipe.difficulty || "N/A";

        document.getElementById("recipe-card1").dataset.id = recipe.id;

        readMoreBtn.onclick = () => {
            location.assign(`recipe.html?id=${recipe.id}`);
        };

        const favoriteIds = loadFavorites();
        const heartBtn = document.getElementById("recipe-card1").querySelector(".heart-btn");

        if (favoriteIds.includes(document.getElementById("recipe-card1").dataset.id)) {
            heartBtn.classList.add("filled");
        } else {
            heartBtn.classList.remove("filled");
        }

        heartBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            let favoriteIds = loadFavorites();
            const id = recipe.id.toString();

            if (favoriteIds.includes(id)) {
                favoriteIds = favoriteIds.filter(f => f !== id);
                heartBtn.classList.remove("filled");
            } else {
                favoriteIds.push(id);
                heartBtn.classList.add("filled");
            }

            saveFavorites(favoriteIds);
        });
    }

    nextBtn.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % recipes.length;
        displayRecipe(recipes[currentIndex]);
    });

    prevBtn.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + recipes.length) % recipes.length;
        displayRecipe(recipes[currentIndex]);
    });
}

// ===== CONTAINER 2: CATEGORIES SLIDER =====
function initCategoriesSlider() {
    const categoryContainer = document.getElementById("categories-container");
    const catPrevBtn = document.querySelector(".catg.prev");
    const catNextBtn = document.querySelector(".catg.next");

    if (!categoryContainer) return;

    fetch("recipes.json")
        .then(res => res.json())
        .then(data => {
            const cuisines = [...new Set(data.map(r => r.cuisine))];
            const mealTypes = [...new Set(data.map(r => r.mealType))];
            const diets = [...new Set(data.map(r => r.diet))];
            const categories = [...cuisines, ...mealTypes, ...diets].filter(Boolean);

            categories.forEach(cat => {
                const relatedRecipes = data.filter(r =>
                    r.cuisine === cat || r.mealType === cat || r.diet === cat
                );

                let randomIndex = 0;
                if (relatedRecipes.length > 0) {
                    const seed = cat.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                    randomIndex = seed % relatedRecipes.length;
                }
                const chosenImage = relatedRecipes[randomIndex]?.image || "images/default.jpg";

                const card = document.createElement("div");
                card.classList.add("category-card");
                card.innerHTML = `
                    <img src="${chosenImage}" alt="${cat}">
                    <p>${cat}</p>
                `;

                card.addEventListener("click", () => {
                    location.assign(`recipes.html?category=${encodeURIComponent(cat)}`);
                });

                categoryContainer.appendChild(card);
            });
        })
        .catch(err => console.error("Error loading categories:", err));

    if (catNextBtn && catPrevBtn) {
        catNextBtn.addEventListener("click", () => {
            categoryContainer.scrollBy({ left: 250, behavior: "smooth" });
        });
        catPrevBtn.addEventListener("click", () => {
            categoryContainer.scrollBy({ left: -250, behavior: "smooth" });
        });
    }
}

// ===== CONTAINER 4: BEST RECIPES =====
function initBestRecipes() {
    const filterContainer = document.getElementById("filter-buttons");
    const recipeGrid = document.getElementById("recipe-grid");

    if (!filterContainer || !recipeGrid) return;

    fetch("recipes.json")
        .then(res => res.json())
        .then(data => {
            const allRecipes = data;
            const cuisines = [...new Set(allRecipes.map(r => r.cuisine).filter(Boolean))];

            cuisines.forEach((cuisine, index) => {
                const btn = document.createElement("button");
                btn.className = "filter-btn" + (index === 0 ? " active" : "");
                btn.textContent = cuisine;
                btn.dataset.cuisine = cuisine;
                filterContainer.appendChild(btn);
            });

            if (cuisines.length > 0) showRecipes(cuisines[0]);

            filterContainer.addEventListener("click", e => {
                if (!e.target.classList.contains("filter-btn")) return;

                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");

                showRecipes(e.target.dataset.cuisine);
            });

            function showRecipes(cuisine) {
                recipeGrid.innerHTML = "";

                const filtered = allRecipes.filter(
                    r => r.cuisine?.toLowerCase() === cuisine.toLowerCase()
                );
                const selected = filtered.sort(() => Math.random() - 0.5).slice(0, 4);

                if (selected.length === 0) {
                    recipeGrid.innerHTML = "<p>No recipes found for this cuisine.</p>";
                    return;
                }

                selected.forEach(recipe => {
                    const card = document.createElement("div");
                    card.className = "recipe-card";
                    card.innerHTML = `
                        <div class="recipe-card" data-id="${recipe.id}">
                            <img src="${recipe.image}" alt="${recipe.name}">
                            <div class="recipe-card-content">
                                <button class="heart-btn" title="Add to favorites">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 21s-7.4-4.35-10-7.12C-0.1 11.64 2.5 6.5 6.5 7.5 
                                        8.6 8 9.6 10.5 12 12.5c2.4-2 3.4-4.5 5.5-5 4-1 
                                        6.6 4.15 4.5 6.38C19.4 16.65 12 21 12 21z"/>
                                    </svg>
                                </button>
                                <h3>${recipe.name}</h3>
                                <div class="recipe-info">
                                    <span><i class="fa-regular fa-clock"></i> ${recipe.time?.total || "N/A"}</span>
                                    <span><i class="fa-solid fa-signal"></i> ${recipe.difficulty}</span>
                                </div>
                            </div>
                        </div>
                    `;

                    card.addEventListener("click", () => {
                        location.assign(`recipe.html?id=${recipe.id}`);
                    });

                    recipeGrid.appendChild(card);
                });
                setupHeartButtons();
            }
        })
        .catch(err => console.error("Error loading recipes:", err));
}

// ===== CONTAINER 5: SEARCH FUNCTIONALITY =====
function initSearchSection() {
    const section = document.getElementById("search-section");
    if (!section) return;

    const input = document.getElementById("recipe-search-input");
    const form = document.getElementById("recipe-search-form");
    const tagsContainer = document.getElementById("suggested-tags");

    fetch("recipes.json")
        .then(r => {
            if (!r.ok) throw new Error("Failed to load recipes.json");
            return r.json();
        })
        .then(data => {
            const cuisines = [...new Set(data.map(x => (x.cuisine || "").trim()).filter(Boolean))];
            const mealTypes = [...new Set(data.map(x => (x.mealType || "").trim()).filter(Boolean))];
            const combined = [...cuisines, ...mealTypes].filter(Boolean);
            const uniquePills = [...new Set(combined)].slice(0, 9);

            uniquePills.forEach(value => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "tag-pill";
                btn.textContent = value;

                btn.addEventListener("click", () => {
                    const isCuisine = cuisines.some(c => c.toLowerCase() === value.toLowerCase());
                    if (isCuisine) {
                        location.assign(`recipes.html?cuisine=${encodeURIComponent(value)}`);
                    } else {
                        location.assign(`recipes.html?mealType=${encodeURIComponent(value)}`);
                    }
                });
                tagsContainer.appendChild(btn);
            });

            if (uniquePills.length === 0) {
                tagsContainer.style.display = "none";
            }
        })
        .catch(err => {
            console.error("Error building search tags:", err);
            tagsContainer.style.display = "none";
        });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = (input.value || "").trim();
        if (!q) {
            input.focus();
            return;
        }
        location.assign(`recipes.html?q=${encodeURIComponent(q)}`);
    });
}

// ===== CONTAINER 3: NEWSLETTER =====
function initNewsletter() {
    const form = document.getElementById("newsletter-form");
    const nameInput = document.getElementById("subscriber-name");
    const messageEl = document.getElementById("subscription-message");
    const namesaved = "newsletterName";

    if (form) {
        const savedName = localStorage.getItem(namesaved);
        if (savedName) {
            messageEl.innerHTML = `Welcome <strong>${escapeHtml(savedName)}</strong>, Thanks for your subscription! ❤️`;
        }

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = (nameInput.value || "").trim();

            if (!name) {
                messageEl.textContent = "Please enter your name.";
                return;
            }

            localStorage.setItem(namesaved, name);
            messageEl.innerHTML = `Welcome <strong>${escapeHtml(name)}</strong>, Thanks for your subscription! ❤️`;

            form.reset();
        });
    }
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
    initRecipeSlider();
    initCategoriesSlider();
    initBestRecipes();
    initSearchSection();
    initNewsletter();
    setupHeartButtons();
});

