let recipes = [];
let currentIndex = 0;
const STORAGE_KEY = "favorites";
const FALLBACK_IMAGE = "/mnt/data/0340e681-c707-4be8-8732-02e33e09cb78.png";
const HERO_HISTORY_KEY = "hero_shown_stack_v1";
const HISTORY_LIMIT = 3;
const ROTATE_INTERVAL = 7000;

async function loadRecipes() {
    if (recipes && recipes.length > 0) return recipes;
    try {
        const response = await fetch("data/recipes.json");
        recipes = await response.json();
        recipes = recipes.sort(() => Math.random() - 0.5);
        return recipes;
    } catch (error) {
        console.error("Error loading recipes:", error);
        return [];
    }
}

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

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HERO_HISTORY_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function pushHistory(id) {
    const h = getHistory();
    h.unshift(String(id));
    while (h.length > HISTORY_LIMIT) h.pop();
    localStorage.setItem(HERO_HISTORY_KEY, JSON.stringify(h));
}

function pickUniqueRecipe(recipeList, history) {
    const candidates = recipeList.filter(r => !history.includes(String(r.id)));
    const pool = candidates.length ? candidates : recipeList.slice();
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

function setupHeartButton(heartBtn, recipeId) {
    const favs = loadFavorites();
    if (favs.includes(String(recipeId))) {
        heartBtn.classList.add("filled");
    } else {
        heartBtn.classList.remove("filled");
    }

    const newHeart = heartBtn.cloneNode(true);
    heartBtn.parentNode.replaceChild(newHeart, heartBtn);

    newHeart.addEventListener("click", (e) => {
        e.stopPropagation();
        let current = loadFavorites();
        const idStr = String(recipeId);
        if (current.includes(idStr)) {
            current = current.filter(x => x !== idStr);
            newHeart.classList.remove("filled");
        } else {
            current.push(idStr);
            newHeart.classList.add("filled");
        }
        saveFavorites(current);
    });
}

function createTimer(callback) {
    let timer = null;
    return {
        start: () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(callback, ROTATE_INTERVAL);
        },
        stop: () => {
            if (timer) clearTimeout(timer);
            timer = null;
        },
        reset: () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(callback, ROTATE_INTERVAL);
        }
    };
}

async function initHeroSection() {
    const heroVideo = document.getElementById("hero-video");
    const cardEl = document.getElementById("hero-recipe-card");
    const imgEl = document.getElementById("hero-recipe-img");
    const titleEl = document.getElementById("hero-recipe-title");
    const descEl = document.getElementById("hero-recipe-desc");
    const tagsEl = document.getElementById("hero-recipe-tags");
    const timeEl = document.getElementById("hero-recipe-time");
    const readMoreBtn = document.getElementById("hero-read-more");
    const prevBtn = document.getElementById("hero-prev");
    const nextBtn = document.getElementById("hero-next");

    if (!cardEl) return;

    if (heroVideo) heroVideo.poster = FALLBACK_IMAGE;
    if (imgEl && (!imgEl.src || imgEl.src.trim() === "")) {
        imgEl.src = FALLBACK_IMAGE;
    }

    await loadRecipes();

    if (!recipes || recipes.length === 0) {
        renderHero({
            id: "fallback-hero",
            name: "Welcome, hungry friend!",
            instructions: ["Discover refined, simple recipes — curated for taste."],
            image: FALLBACK_IMAGE,
            time: { total: "N/A" },
            cuisine: ""
        });
        return;
    }

    function renderHero(recipe) {
        if (!recipe) return;
        imgEl.src = recipe.image || FALLBACK_IMAGE;
        imgEl.alt = recipe.name || "Recipe image";
        titleEl.textContent = recipe.name || "Untitled";
        const shortDesc = (recipe.instructions && recipe.instructions[0]) ? recipe.instructions[0] : "No description available.";
        descEl.textContent = shortDesc.length > 120 ? shortDesc.slice(0, 120) + "..." : shortDesc;

        tagsEl.innerHTML = "";
        if (recipe.cuisine) tagsEl.innerHTML += `<span class="tag cuisine">${escapeHtml(recipe.cuisine)}</span>`;
        if (recipe.diet) tagsEl.innerHTML += `<span class="tag diet">${escapeHtml(recipe.diet)}</span>`;
        if (recipe.mealType) tagsEl.innerHTML += `<span class="tag mealType">${escapeHtml(recipe.mealType)}</span>`;

        timeEl.textContent = recipe.time?.total || "N/A";
        cardEl.dataset.id = recipe.id;

        readMoreBtn.onclick = () => {
            location.assign(`recipe.html?id=${encodeURIComponent(recipe.id)}`);
        };

        const heartBtn = cardEl.querySelector(".heart-btn");
        if (heartBtn) setupHeartButton(heartBtn, recipe.id);
    }

    const history = getHistory();
    const recipe = pickUniqueRecipe(recipes, history) || recipes[0];
    currentIndex = recipes.findIndex(r => r.id === recipe.id);
    renderHero(recipe);
    pushHistory(recipe.id);

    const timer = createTimer(() => {
        const nextRecipe = pickUniqueRecipe(recipes, getHistory());
        if (nextRecipe) {
            currentIndex = recipes.findIndex(r => r.id === nextRecipe.id);
            renderHero(nextRecipe);
            pushHistory(nextRecipe.id);
        }
        timer.reset();
    });

    timer.start();

    function showIndex(idx) {
        if (!recipes || recipes.length === 0) return;
        currentIndex = ((idx % recipes.length) + recipes.length) % recipes.length;
        renderHero(recipes[currentIndex]);
        pushHistory(recipes[currentIndex].id);
        timer.reset();
    }

    if (prevBtn) prevBtn.addEventListener("click", (e) => { e.preventDefault(); showIndex(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener("click", (e) => { e.preventDefault(); showIndex(currentIndex + 1); });

    cardEl.addEventListener("mouseenter", () => timer.stop());
    cardEl.addEventListener("mouseleave", () => timer.reset());
}

async function initRecipeSlider() {
    const imgEl = document.getElementById("recipe-image");
    const titleEl = document.getElementById("recipe-title");
    const descEl = document.getElementById("recipe-desc");
    const tagsEl = document.getElementById("recipe-tags");
    const timeEl = document.getElementById("recipe-time");
    const difficultyEl = document.getElementById("recipe-difficulty");
    const readMoreBtn = document.getElementById("read-more");
    const prevBtn = document.querySelector(".prev-btn");
    const nextBtn = document.querySelector(".next-btn");
    const cardEl = document.getElementById("recipe-card1");
    const heroVideo = document.getElementById("hero-video");

    if (!imgEl || !cardEl) return;

    if (heroVideo) heroVideo.poster = FALLBACK_IMAGE;

    await loadRecipes();

    if (!recipes || recipes.length === 0) {
        displayRecipe({
            id: "fallback",
            name: "Welcome",
            instructions: ["Discover refined, simple recipes — curated for taste."],
            image: FALLBACK_IMAGE,
            time: { total: "N/A" },
            difficulty: "N/A",
            cuisine: ""
        });
        return;
    }

    function displayRecipe(recipe) {
        if (!recipe) return;
        imgEl.src = recipe.image || FALLBACK_IMAGE;
        imgEl.alt = recipe.name || "Recipe image";
        titleEl.textContent = recipe.name || "Untitled";
        const shortDesc = (recipe.instructions && recipe.instructions[0]) ? recipe.instructions[0] : "No description available.";
        descEl.textContent = shortDesc.length > 120 ? shortDesc.slice(0, 120) + "..." : shortDesc;

        tagsEl.innerHTML = "";
        if (recipe.cuisine) tagsEl.innerHTML += `<span class="tag cuisine">${escapeHtml(recipe.cuisine)}</span>`;
        if (recipe.diet) tagsEl.innerHTML += `<span class="tag diet">${escapeHtml(recipe.diet)}</span>`;
        if (recipe.mealType) tagsEl.innerHTML += `<span class="tag mealType">${escapeHtml(recipe.mealType)}</span>`;

        timeEl.textContent = recipe.time?.total || "N/A";
        difficultyEl.textContent = recipe.difficulty || "N/A";
        cardEl.dataset.id = recipe.id;

        readMoreBtn.onclick = () => {
            location.assign(`recipe.html?id=${encodeURIComponent(recipe.id)}`);
        };

        const heartBtn = cardEl.querySelector(".heart-btn");
        if (heartBtn) setupHeartButton(heartBtn, recipe.id);
    }

    const history = getHistory();
    const recipe = pickUniqueRecipe(recipes, history) || recipes[0];
    currentIndex = recipes.findIndex(r => r.id === recipe.id);
    displayRecipe(recipe);
    pushHistory(String(recipe.id));

    const timer = createTimer(() => {
        const nextRecipe = pickUniqueRecipe(recipes, getHistory());
        if (nextRecipe) {
            currentIndex = recipes.findIndex(r => r.id === nextRecipe.id);
            displayRecipe(nextRecipe);
            pushHistory(String(nextRecipe.id));
        }
        timer.reset();
    });

    timer.start();

    function showIndex(idx) {
        if (!recipes || recipes.length === 0) return;
        currentIndex = ((idx % recipes.length) + recipes.length) % recipes.length;
        displayRecipe(recipes[currentIndex]);
        pushHistory(String(recipes[currentIndex].id));
        timer.reset();
    }

    if (nextBtn) nextBtn.addEventListener("click", () => { showIndex(currentIndex + 1); });
    if (prevBtn) prevBtn.addEventListener("click", () => { showIndex(currentIndex - 1); });

    cardEl.addEventListener("mouseenter", () => timer.stop());
    cardEl.addEventListener("mouseleave", () => timer.reset());
}

async function initCategoriesSlider() {
    const categoryContainer = document.getElementById("categories-container");
    const catPrevBtn = document.querySelector(".catg.prev");
    const catNextBtn = document.querySelector(".catg.next");

    if (!categoryContainer) return;

    try {
        const data = await loadRecipes();
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
                let url = 'recipes.html?';
                
                if (cuisines.includes(cat)) {
                    url += `cuisine=${encodeURIComponent(cat)}`;
                } else if (mealTypes.includes(cat)) {
                    url += `mealType=${encodeURIComponent(cat)}`;
                } else if (diets.includes(cat)) {
                    url += `diet=${encodeURIComponent(cat)}`;
                } else {
                    url += `category=${encodeURIComponent(cat)}`;
                }
                
                location.assign(url);
            });

            categoryContainer.appendChild(card);
        });

        if (catNextBtn && catPrevBtn) {
            catNextBtn.addEventListener("click", () => {
                categoryContainer.scrollBy({ left: 250, behavior: "smooth" });
            });
            catPrevBtn.addEventListener("click", () => {
                categoryContainer.scrollBy({ left: -250, behavior: "smooth" });
            });
        }
    } catch (err) {
        console.error("Error loading categories:", err);
    }
}

async function initBestRecipes() {
    const filterContainer = document.getElementById("filter-buttons");
    const recipeGrid = document.getElementById("recipe-grid");

    if (!filterContainer || !recipeGrid) return;

    try {
        const allRecipes = await loadRecipes();
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
        }
    } catch (err) {
        console.error("Error loading recipes:", err);
    }
}

async function initSearchSection() {
    const section = document.getElementById("search-section");
    if (!section) return;

    const input = document.getElementById("recipe-search-input");
    const form = document.getElementById("recipe-search-form");
    const tagsContainer = document.getElementById("suggested-tags");

    try {
        const data = await loadRecipes();
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
    } catch (err) {
        console.error("Error building search tags:", err);
        tagsContainer.style.display = "none";
    }

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

async function initSurpriseMe() {
    const surpriseMeBtn = document.getElementById('surprise-me-btn');
    
    if (!surpriseMeBtn) return;

    surpriseMeBtn.addEventListener('click', async () => {
        if (recipes && recipes.length > 0) {
            const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
            window.location.href = `recipe.html?id=${encodeURIComponent(randomRecipe.id)}`;
        } else {
            const data = await loadRecipes();
            const randomRecipe = data[Math.floor(Math.random() * data.length)];
            window.location.href = `recipe.html?id=${encodeURIComponent(randomRecipe.id)}`;
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    initNewsletter();
    await Promise.all([
        initHeroSection(),
        initRecipeSlider(),
        initCategoriesSlider(),
        initBestRecipes(),
        initSearchSection(),
        initSurpriseMe()
    ]);
    
    document.getElementById("contact")?.addEventListener("click", () => {
        window.location.href = "contact.html";
    });
    
    document.getElementById("about")?.addEventListener("click", () => {
        window.location.href = "about.html";
    });
});