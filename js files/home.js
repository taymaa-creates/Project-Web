let recipes = [];
let currentIndex = 0;
const STORAGE_KEY = "favorites";

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

function initHeroSection() {
  const FALLBACK_IMAGE = "/mnt/data/0340e681-c707-4be8-8732-02e33e09cb78.png";
  const HERO_HISTORY_KEY = "hero_shown_stack_v1";
  const HISTORY_LIMIT = 3;
  const ROTATE_INTERVAL = 7000;

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
  if (heroVideo) {
     heroVideo.poster = FALLBACK_IMAGE;
  }
  if (imgEl && (!imgEl.src || imgEl.src.trim() === "")) {
    imgEl.src = FALLBACK_IMAGE;
  }
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HERO_HISTORY_KEY)) || []; } catch (e) { return []; }
  }
  function pushHistory(id) {
    const h = getHistory();
    h.unshift(String(id));
    while (h.length > HISTORY_LIMIT) h.pop();
    localStorage.setItem(HERO_HISTORY_KEY, JSON.stringify(h));
  }
  function ensureRecipesLoadedForHero() {
    return new Promise((resolve, reject) => {
      if (recipes && recipes.length > 0) return resolve(recipes);
      fetch("recipes.json")
        .then(r => r.json())
        .then(data => {
          recipes = data.sort(() => Math.random() - 0.5);
          resolve(recipes);
        })
        .catch(err => reject(err));
    });
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
    if (heartBtn) {
      const favs = loadFavorites();
      if (favs.includes(String(recipe.id))) heartBtn.classList.add("filled"); else heartBtn.classList.remove("filled");

      const newHeart = heartBtn.cloneNode(true);
      heartBtn.parentNode.replaceChild(newHeart, heartBtn);

      newHeart.addEventListener("click", (e) => {
        e.stopPropagation();
        let current = loadFavorites();
        const idStr = String(recipe.id);
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
  }

  function pickUnique() {
    const history = getHistory();
    const poolCandidates = (recipes || []).filter(r => !history.includes(String(r.id)));
    const pool = poolCandidates.length ? poolCandidates : (recipes || []).slice();
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  let rotationTimer = null;
  function resetTimer() {
    if (rotationTimer) clearTimeout(rotationTimer);
    rotationTimer = setTimeout(() => autoRotate(), ROTATE_INTERVAL);
  }
  function autoRotate() {
    const r = pickUnique();
    if (!r) return;
    const idx = recipes.findIndex(rr => rr.id === r.id);
    if (idx >= 0) currentIndex = idx; 
    renderHero(r);
    pushHistory(r.id);
    resetTimer();
  }
  function showIndex(idx) {
    if (!recipes || recipes.length === 0) return;
    currentIndex = ((idx % recipes.length) + recipes.length) % recipes.length;
    renderHero(recipes[currentIndex]);
    pushHistory(recipes[currentIndex].id);
    resetTimer();
  }

  if (prevBtn) prevBtn.addEventListener("click", (e) => { e.preventDefault(); showIndex(currentIndex - 1); });
  if (nextBtn) nextBtn.addEventListener("click", (e) => { e.preventDefault(); showIndex(currentIndex + 1); });

  cardEl.addEventListener("mouseenter", () => { if (rotationTimer) clearTimeout(rotationTimer); });
  cardEl.addEventListener("mouseleave", () => { resetTimer(); });

  ensureRecipesLoadedForHero()
    .then(list => {
      if (!list || !list.length) {
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
      if (recipes[currentIndex]) {
        renderHero(recipes[currentIndex]);
        pushHistory(recipes[currentIndex].id);
        resetTimer();
      } else {
        autoRotate();
      }
    })
    .catch(err => {
      console.error("Hero: error loading recipes.json", err);
      renderHero({
        id: "fallback-hero",
        name: "Welcome, hungry friend!",
        instructions: ["Discover refined, simple recipes — curated for taste."],
        image: FALLBACK_IMAGE,
        time: { total: "N/A" },
        cuisine: ""
      });
    });
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
  const cardEl = document.getElementById("recipe-card1");
  const heroVideo = document.getElementById("hero-video");

  if (!imgEl || !cardEl) return;

  const FALLBACK_IMAGE = "/mnt/data/0340e681-c707-4be8-8732-02e33e09cb78.png";

  const HERO_HISTORY_KEY = "hero_shown_stack_v1";
  const HISTORY_LIMIT = 3;
  const ROTATE_INTERVAL = 7000; 

  if (heroVideo) {
    try { heroVideo.poster = FALLBACK_IMAGE; } catch (e) { }
  }

  function ensureRecipesLoaded() {
    return new Promise((resolve, reject) => {
      if (recipes && recipes.length > 0) {
        recipes = recipes.sort(() => Math.random() - 0.5);
        return resolve(recipes);
      }
      fetch("recipes.json")
        .then(res => res.json())
        .then(data => {
          recipes = data.sort(() => Math.random() - 0.5);
          resolve(recipes);
        })
        .catch(err => reject(err));
    });
  }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HERO_HISTORY_KEY)) || []; }
    catch (e) { return []; }
  }
  function pushHistory(id) {
    const h = getHistory();
    h.unshift(id);
    while (h.length > HISTORY_LIMIT) h.pop();
    localStorage.setItem(HERO_HISTORY_KEY, JSON.stringify(h));
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

    const favoriteIds = loadFavorites();
    const heartBtn = cardEl.querySelector(".heart-btn");
    if (heartBtn) {
      if (favoriteIds.includes(String(recipe.id))) heartBtn.classList.add("filled");
      else heartBtn.classList.remove("filled");

      const newHeart = heartBtn.cloneNode(true);
      heartBtn.parentNode.replaceChild(newHeart, heartBtn);

      newHeart.addEventListener("click", (e) => {
        e.stopPropagation();
        let favs = loadFavorites();
        const idStr = String(recipe.id);
        if (favs.includes(idStr)) {
          favs = favs.filter(f => f !== idStr);
          newHeart.classList.remove("filled");
        } else {
          favs.push(idStr);
          newHeart.classList.add("filled");
        }
        saveFavorites(favs);
      });
    }
  }
  function pickUniqueRecipe() {
    const history = getHistory();
    const candidates = (recipes || []).filter(r => !history.includes(String(r.id)));
    const pool = candidates.length ? candidates : (recipes || []).slice();
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  let rotationTimer = null;

  function resetTimer() {
    if (rotationTimer) clearTimeout(rotationTimer);
    rotationTimer = setTimeout(() => rotateAuto(), ROTATE_INTERVAL);
  }

  function rotateAuto() {
    const recipe = pickUniqueRecipe();
    if (!recipe) return;
    const idx = recipes.findIndex(r => r.id === recipe.id);
    if (idx >= 0) currentIndex = idx;
    displayRecipe(recipe);
    pushHistory(String(recipe.id));
    resetTimer();
  }

  function showIndex(idx) {
    if (!recipes || recipes.length === 0) return;
    currentIndex = ((idx % recipes.length) + recipes.length) % recipes.length;
    displayRecipe(recipes[currentIndex]);
    pushHistory(String(recipes[currentIndex].id));
    resetTimer();
  }

  if (nextBtn) nextBtn.addEventListener("click", () => { showIndex(currentIndex + 1); });
  if (prevBtn) prevBtn.addEventListener("click", () => { showIndex(currentIndex - 1); });

  cardEl.addEventListener("mouseenter", () => { if (rotationTimer) clearTimeout(rotationTimer); });
  cardEl.addEventListener("mouseleave", () => { resetTimer(); });
  ensureRecipesLoaded()
    .then(list => {
      if (!list || !list.length) return;
      if (recipes[currentIndex]) {
        displayRecipe(recipes[currentIndex]);
        pushHistory(String(recipes[currentIndex].id));
      } else {
        rotateAuto();
      }
    })
    .catch(err => {
      console.error("Error loading JSON for hero slider:", err);
      displayRecipe({
        id: "fallback",
        name: "Welcome",
        instructions: ["Discover refined, simple recipes — curated for taste."],
        image: FALLBACK_IMAGE,
        time: { total: "N/A" },
        difficulty: "N/A",
        cuisine: ""
      });
    });
}

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

document.addEventListener("DOMContentLoaded", () => {
    initRecipeSlider();
    initCategoriesSlider();
    initBestRecipes();
    initSearchSection();
    initNewsletter();
    initSurpriseMe();
    setupHeartButtons();
    initHeroSection()
});

function initSurpriseMe() {
    const surpriseMeBtn = document.getElementById('surprise-me-btn');
    
    if (!surpriseMeBtn) return;

    surpriseMeBtn.addEventListener('click', () => {
        if (recipes && recipes.length > 0) {
            const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
            window.location.href = `recipe.html?id=${encodeURIComponent(randomRecipe.id)}`;
        } else {
            fetch("recipes.json")
                .then(res => res.json())
                .then(data => {
                    const randomRecipe = data[Math.floor(Math.random() * data.length)];
                    window.location.href = `recipe.html?id=${encodeURIComponent(randomRecipe.id)}`;
                })
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("contact").addEventListener("click", () => {
        window.location.href = "contact.html";
    });
    document.getElementById("about").addEventListener("click", () => {
        window.location.href = "about.html";
    });
});
