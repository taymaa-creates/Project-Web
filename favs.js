let hamburger = document.getElementById('hamburger');   // burger icon
let navDesc = document.getElementById('nav');    // links container

// Toggle the mobile menu on burger click
hamburger.onclick = function () {
    navDesc.classList.toggle('open');                     // add/remove .open to show/hide
};

// FAVORITES PAGE LOGIC
const favoritesGrid = document.getElementById("favoritesGrid");
const emptyState = document.getElementById("emptyState");
const mealFilters = document.getElementById("mealFilters");
const cuisineFilters = document.getElementById("cuisineFilters");
const clearFilters = document.getElementById("clearFilters");
const surpriseBtn = document.getElementById("surpriseBtn");

let allRecipes = [];
let favoriteIds = [];
let selectedMeal = null;
let selectedCuisine = null;

const STORAGE_KEY = "favorites";
const JSON_PATH = "recipes.json";

/* -------------------------- INITIALIZATION -------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  favoriteIds = loadFavorites();
  await loadRecipes();
  renderFilters();
  renderFavorites();
});

/* -------------------------- DATA -------------------------- */
function loadFavorites() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveFavorites(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/* -------------------------- RENDERING -------------------------- */
async function loadRecipes() {
  const res = await fetch(JSON_PATH);
  allRecipes = await res.json();
}

function renderFilters() {
  const meals = [...new Set(allRecipes.map(r => r.mealType))];
  const cuisines = [...new Set(allRecipes.map(r => r.cuisine))];

  mealFilters.innerHTML = meals.map(m => 
    `<button class="pill ${selectedMeal === m ? "active" : ""}" data-meal="${m}">${m}</button>`
  ).join("");

  cuisineFilters.innerHTML = cuisines.map(c => 
    `<button class="pill ${selectedCuisine === c ? "active" : ""}" data-cuisine="${c}">${c}</button>`
  ).join("");
}

function renderFavorites() {
  const favRecipes = allRecipes.filter(r => favoriteIds.includes(r.id));

  const filtered = favRecipes.filter(r => {
    return (!selectedMeal || r.mealType === selectedMeal) &&
           (!selectedCuisine || r.cuisine === selectedCuisine);
  });

  favoritesGrid.innerHTML = filtered.map(recipe => `
    <div class="recipe-card" data-id="${recipe.id}">
      <button class="heart-btn" title="Remove from favorites">
        <svg viewBox="0 0 24 24"><path d="M12 21s-7.4-4.35-10-7.12C-0.1 11.64 2.5 6.5 6.5 7.5 8.6 8 9.6 10.5 12 12.5c2.4-2 3.4-4.5 5.5-5 4-1 6.6 4.15 4.5 6.38C19.4 16.65 12 21 12 21z"/></svg>
      </button>
      <img src="${recipe.image}" alt="${recipe.name}">
      <div class="recipe-info">
        <h3 class="recipe-title">${recipe.name}</h3>
        <p class="recipe-sub">${recipe.cuisine} · ${recipe.mealType}</p>
      </div>
    </div>
  `).join("");

  favoritesGrid.style.display = filtered.length ? "grid" : "none";
  emptyState.style.display = filtered.length ? "none" : "block";

  attachListeners();
}

/* -------------------------- EVENTS -------------------------- */
function attachListeners() {
  document.querySelectorAll(".heart-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".recipe-card");
      const id = card.dataset.id;
      favoriteIds = favoriteIds.filter(f => f !== id);
      saveFavorites(favoriteIds);
      card.remove();

      if (!favoriteIds.length) renderFavorites();
    });
  });

  // Filter pills
  document.querySelectorAll("[data-meal]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedMeal = selectedMeal === btn.dataset.meal ? null : btn.dataset.meal;
      renderFilters();
      renderFavorites();
    });
  });

  document.querySelectorAll("[data-cuisine]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedCuisine = selectedCuisine === btn.dataset.cuisine ? null : btn.dataset.cuisine;
      renderFilters();
      renderFavorites();
    });
  });

  clearFilters.onclick = () => {
    selectedMeal = null;
    selectedCuisine = null;
    renderFilters();
    renderFavorites();
  };

  surpriseBtn.onclick = () => {
    if (!allRecipes.length) return;
    const random = allRecipes[Math.floor(Math.random() * allRecipes.length)];
    window.location.href = `recipe.html?id=${random.id}`;
  };
}

/* -------------------------- STORAGE SYNC -------------------------- */
// React to favorite changes from other pages/tabs
window.addEventListener("storage", event => {
  if (event.key === STORAGE_KEY) {
    favoriteIds = loadFavorites();
    renderFavorites();
  }
});
