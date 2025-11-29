let favoritesGrid = document.getElementById("favoritesGrid");
let emptyState = document.getElementById("emptyState");
let mealFilters = document.getElementById("mealFilters");
let cuisineFilters = document.getElementById("cuisineFilters");
let clearFilters = document.getElementById("clearFilters");
let surpriseBtn = document.getElementById("surpriseBtn");
let snackbarEl = document.getElementById("snackbar");
let bulkActions = document.getElementById("bulkActions");
let selectedCount = document.getElementById("selectedCount");
let bulkClear = document.getElementById("bulkClear");
let bulkRemove = document.getElementById("bulkRemove");
let bulkExport = document.getElementById("bulkExport");
let bulkAddToMealPlan = document.getElementById("bulkAddToMealPlan");
let bulkMoveToCollection = document.getElementById("bulkMoveToCollection");
let collectionsList = document.getElementById("collectionsList");
let createCollection = document.getElementById("createCollection");
let quickViewModal = document.getElementById("quickViewModal");
let quickViewContent = document.getElementById("quickViewContent");
let collectionModal = document.getElementById("collectionModal");
let collectionName = document.getElementById("collectionName");
let confirmCollection = document.getElementById("confirmCollection");
let cancelCollection = document.getElementById("cancelCollection");
let exportModal = document.getElementById("exportModal");
let confirmExport = document.getElementById("confirmExport");
let cancelExport = document.getElementById("cancelExport");

let STORAGE_KEY = "favorites";
let COLLECTIONS_KEY = "recipeCollections";
let JSON_PATH = "recipes.json";
let PENDING_TTL = 5000;

let allRecipes = [];
let favoriteIds = [];
let selectedMeal = null;
let selectedCuisine = null;
let pendingRemovals = new Map();
let selectedRecipes = new Set();
let collections = [];

document.addEventListener("DOMContentLoaded", async () => {
  favoriteIds = loadFavorites();
  collections = loadCollections();
  await loadRecipes();
  renderFilters();
  renderFavorites();
  renderCollections();
  setupModalEvents();
});

function loadFavorites() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveFavorites(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function loadCollections() {
  return JSON.parse(localStorage.getItem(COLLECTIONS_KEY)) || [];
}

function saveCollections(cols) {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(cols));
}

async function loadRecipes() {
  let res = await fetch(JSON_PATH);
  allRecipes = await res.json();
}

function renderFilters() {
  let favRecipes = allRecipes.filter(r => favoriteIds.includes(r.id));
  let meals = [...new Set(favRecipes.map(r => r.mealType))];
  let cuisines = [...new Set(favRecipes.map(r => r.cuisine))];

  mealFilters.innerHTML = meals.map(m =>
    `<button class="pill ${selectedMeal === m ? "active" : ""}" data-meal="${m}">${m}</button>`
  ).join("");

  cuisineFilters.innerHTML = cuisines.map(c =>
    `<button class="pill ${selectedCuisine === c ? "active" : ""}" data-cuisine="${c}">${c}</button>`
  ).join("");

  attachFilterListeners();
}

function renderCollections() {
  if (collections.length === 0) {
    collectionsList.innerHTML = '<p style="color: #666; font-style: italic;">No collections yet</p>';
    return;
  }

  collectionsList.innerHTML = collections.map(collection => `
        <div class="collection-card" data-id="${collection.id}">
            <div class="collection-name">${collection.name}</div>
            <div class="collection-count">${collection.recipes.length} recipes</div>
        </div>
    `).join("");

  attachCollectionListeners();
}

function renderFavorites() {
  let favRecipes = allRecipes.filter(r => favoriteIds.includes(r.id));
  let filtered = favRecipes.filter(r => {
    return (!selectedMeal || r.mealType === selectedMeal) &&
      (!selectedCuisine || r.cuisine === selectedCuisine);
  });

  favoritesGrid.innerHTML = filtered.map(recipe => `
        <div class="recipe-card ${selectedRecipes.has(recipe.id) ? 'selected' : ''}" data-id="${recipe.id}">
            <input type="checkbox" class="bulk-select" ${selectedRecipes.has(recipe.id) ? 'checked' : ''}>
            <button class="heart-btn" title="Remove from favorites">
                <i class="fas fa-heart"></i>
            </button>
            <img src="${recipe.image}" alt="${recipe.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
            <div class="recipe-info">
                <h3 class="recipe-title">${recipe.name}</h3>
                <p class="recipe-sub">${recipe.cuisine} · ${recipe.mealType}</p>
            </div>
        </div>
    `).join("");

  favoritesGrid.style.display = filtered.length ? "grid" : "none";
  emptyState.style.display = filtered.length ? "none" : "block";

  updateBulkActions();
  attachListeners();
}

function showSnackbar(message, actionText = 'Undo', onAction = null, duration = PENDING_TTL) {
  snackbarEl.innerHTML = '';
  let text = document.createElement('span');
  text.textContent = message;
  snackbarEl.appendChild(text);

  if (actionText && onAction) {
    let btn = document.createElement('button');
    btn.className = 'action';
    btn.textContent = actionText;
    btn.onclick = () => {
      onAction();
      hideSnackbar();
    };
    snackbarEl.appendChild(btn);
  }

  snackbarEl.classList.add('show');
  let closeAfter = setTimeout(hideSnackbar, duration);

  function hideSnackbar() {
    snackbarEl.classList.remove('show');
    snackbarEl.innerHTML = '';
    clearTimeout(closeAfter);
  }

  return hideSnackbar;
}

function removeWithUndo(id, card) {
  id = String(id);

  if (pendingRemovals.has(id)) {
    clearTimeout(pendingRemovals.get(id).timeoutId);
    pendingRemovals.delete(id);
  }

  let backupFavs = favoriteIds.slice();

  if (card) {
    card.classList.add('removing');
    setTimeout(() => {
      if (card.parentNode) card.remove();
    }, 300);
  }

  favoriteIds = favoriteIds.filter(f => String(f) !== id);
  selectedRecipes.delete(id);

  let visibleFavs = allRecipes.filter(r =>
    favoriteIds.includes(r.id) &&
    (!selectedMeal || r.mealType === selectedMeal) &&
    (!selectedCuisine || r.cuisine === selectedCuisine)
  );

  if (visibleFavs.length === 0) {
    favoritesGrid.style.display = 'none';
    emptyState.style.display = 'block';
  }

  let finalize = () => {
    saveFavorites(favoriteIds);
    pendingRemovals.delete(id);
    if (favoriteIds.length === 0) renderFavorites();
  };

  let timeoutId = setTimeout(finalize, PENDING_TTL);
  pendingRemovals.set(id, { timeoutId, backupFavs });

  showSnackbar('Removed from favorites', 'Undo', () => {
    let pending = pendingRemovals.get(id);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingRemovals.delete(id);
    }
    favoriteIds = backupFavs.slice();
    saveFavorites(favoriteIds);
    renderFavorites();
  }, PENDING_TTL);
}

function setupModalEvents() {
  let modals = [quickViewModal, collectionModal, exportModal];

  modals.forEach(modal => {
    let closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
  });

  window.onclick = (event) => {
    modals.forEach(modal => {
      if (event.target === modal) modal.style.display = 'none';
    });
  };

  createCollection.onclick = () => {
    collectionName.value = '';
    collectionModal.style.display = 'block';
  };

  confirmCollection.onclick = createNewCollection;
  cancelCollection.onclick = () => collectionModal.style.display = 'none';
  confirmExport.onclick = performExport;
  cancelExport.onclick = () => exportModal.style.display = 'none';

  collectionName.onkeypress = (e) => {
    if (e.key === 'Enter') createNewCollection();
  };
}

function createNewCollection() {
  let name = collectionName.value.trim();
  if (!name) return;

  let newCollection = {
    id: Date.now().toString(),
    name: name,
    recipes: []
  };

  collections.push(newCollection);
  saveCollections(collections);
  renderCollections();
  collectionModal.style.display = 'none';
  showSnackbar(`Collection "${name}" created`);
}

function showQuickView(recipeId) {
  let recipe = allRecipes.find(r => r.id === recipeId);
  if (!recipe) return;

  quickViewContent.innerHTML = `
        <div class="quick-view-header">
            <img src="${recipe.image}" alt="${recipe.name}" class="quick-view-image" onerror="this.style.display='none'">
            <div class="quick-view-info">
                <h4>${recipe.name}</h4>
                <div class="quick-view-meta">${recipe.cuisine} · ${recipe.mealType}</div>
                ${recipe.cookingTime ? `<div class="quick-view-meta">⏱️ ${recipe.cookingTime} minutes</div>` : ''}
                ${recipe.difficulty ? `<div class="quick-view-meta">📊 ${recipe.difficulty}</div>` : ''}
            </div>
        </div>
        ${recipe.ingredients ? `
        <div class="quick-view-ingredients">
            <h5>Ingredients</h5>
            <ul>
                ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        <div class="modal-actions">
            <button onclick="addToMealPlan('${recipe.id}')" class="btn btn-primary">Add to Meal Plan</button>
            <button onclick="addToCollectionFromQuickView('${recipe.id}')" class="btn btn-secondary">Add to Collection</button>
            <button onclick="window.location.href='recipe.html?id=${recipe.id}'" class="btn btn-outline">Full Recipe</button>
        </div>
    `;

  quickViewModal.style.display = 'block';
}

function addToMealPlan(recipeId) {
  let mealPlan = JSON.parse(localStorage.getItem('mealPlan')) || {};
  let days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let meals = ['dinner', 'lunch', 'breakfast', 'snacks'];

  let slotFound = false;
  let targetDay = '';
  let targetMeal = '';

  for (let day of days) {
    for (let mealType of meals) {
      if (!mealPlan[day] || mealPlan[day][mealType].length === 0) {
        targetDay = day;
        targetMeal = mealType;
        slotFound = true;
        break;
      }
    }
    if (slotFound) break;
  }

  if (!slotFound) {
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    targetDay = days[tomorrow.getDay()] || 'monday';
    targetMeal = 'dinner';
  }

  if (!mealPlan[targetDay]) {
    mealPlan[targetDay] = { breakfast: [], lunch: [], dinner: [], snacks: [] };
  }

  let recipe = allRecipes.find(r => r.id === recipeId);
  if (recipe && !mealPlan[targetDay][targetMeal].some(r => r.id === recipeId)) {
    mealPlan[targetDay][targetMeal].push({
      id: recipeId,
      name: recipe.name,
      image: recipe.image,
      cuisine: recipe.cuisine,
      mealType: recipe.mealType
    });

    localStorage.setItem('mealPlan', JSON.stringify(mealPlan));
    let formattedDay = targetDay.charAt(0).toUpperCase() + targetDay.slice(1);
    showSnackbar(`Added to ${targetMeal} on ${formattedDay}`, 'View Plan', () => {
      window.location.href = 'meal-planner.html';
    });
  } else {
    showSnackbar('Recipe already in meal plan');
  }

  quickViewModal.style.display = 'none';
}

function toggleRecipeSelection(recipeId) {
  if (selectedRecipes.has(recipeId)) {
    selectedRecipes.delete(recipeId);
  } else {
    selectedRecipes.add(recipeId);
  }
  updateBulkActions();
  renderFavorites();
}

function updateBulkActions() {
  let count = selectedRecipes.size;
  selectedCount.textContent = `${count} recipe${count !== 1 ? 's' : ''} selected`;
  bulkActions.classList.toggle('hidden', count === 0);
}

function clearSelection() {
  selectedRecipes.clear();
  updateBulkActions();
  renderFavorites();
}

function bulkRemoveRecipes() {
  if (selectedRecipes.size === 0) return;

  let backupFavs = favoriteIds.slice();
  let removedCount = selectedRecipes.size;

  selectedRecipes.forEach(id => {
    favoriteIds = favoriteIds.filter(f => f !== id);
  });

  saveFavorites(favoriteIds);
  selectedRecipes.clear();
  renderFavorites();
  showSnackbar(`Removed ${removedCount} recipes`);

  pendingRemovals.forEach(({ timeoutId }) => clearTimeout(timeoutId));
  pendingRemovals.clear();
}

function showExportModal() {
  if (selectedRecipes.size === 0) return;
  exportModal.style.display = 'block';
}

function performExport() {
  let format = document.querySelector('input[name="exportFormat"]:checked').value;
  let recipesToExport = allRecipes.filter(r => selectedRecipes.has(r.id));

  if (format === 'json') {
    exportToJSON(recipesToExport);
  } else {
    exportToPDF(recipesToExport);
  }

  exportModal.style.display = 'none';
  showSnackbar(`Exported ${recipesToExport.length} recipes as ${format.toUpperCase()}`);
}

function exportToJSON(recipes) {
  let data = {
    exportedAt: new Date().toISOString(),
    recipeCount: recipes.length,
    recipes: recipes
  };

  let blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = `recipes-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToPDF(recipes) {
  let printWindow = window.open('', '_blank');
  let recipeContent = recipes.map(recipe => `
        <div style="margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px;">
            <h2 style="color: #6f8f74; margin-bottom: 10px;">${recipe.name}</h2>
            <p style="color: #666; margin-bottom: 15px;"><strong>Cuisine:</strong> ${recipe.cuisine} | <strong>Meal Type:</strong> ${recipe.mealType}</p>
            ${recipe.ingredients ? `
            <h3 style="color: #555; margin-bottom: 10px;">Ingredients:</h3>
            <ul style="color: #333;">
                ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
            </ul>
            ` : ''}
            ${recipe.instructions ? `
            <h3 style="color: #555; margin-top: 15px; margin-bottom: 10px;">Instructions:</h3>
            <ol style="color: #333;">
                ${recipe.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
            </ol>
            ` : ''}
        </div>
    `).join('');

  printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recipe Collection</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                h1 { color: #6f8f74; text-align: center; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <h1>My Recipe Collection</h1>
            <p><strong>Exported:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Recipes:</strong> ${recipes.length}</p>
            ${recipeContent}
            <script>window.print(); setTimeout(() => window.close(), 1000);</script>
        </body>
        </html>
    `);
  printWindow.document.close();
}

function attachListeners() {
  document.querySelectorAll(".heart-btn").forEach(btn => {
    let newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      let card = newBtn.closest(".recipe-card");
      if (!card) return;
      let id = card.dataset.id;
      removeWithUndo(id, card);
    });
  });

  document.querySelectorAll(".bulk-select").forEach(checkbox => {
    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      let card = checkbox.closest(".recipe-card");
      let id = card.dataset.id;
      toggleRecipeSelection(id);
    });
  });

  document.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.heart-btn') && !e.target.closest('.bulk-select')) {
        let id = card.dataset.id;
        showQuickView(id);
      }
    });
  });
}

function attachFilterListeners() {
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

  clearFilters.addEventListener("click", () => {
    selectedMeal = null;
    selectedCuisine = null;
    renderFilters();
    renderFavorites();
  });

  surpriseBtn.addEventListener("click", () => {
    if (favoriteIds.length > 0) {
      let favRecipes = allRecipes.filter(r => favoriteIds.includes(r.id));
      if (favRecipes.length > 0) {
        let random = favRecipes[Math.floor(Math.random() * favRecipes.length)];
        window.location.href = `recipe.html?id=${random.id}`;
        return;
      }
    }

    if (allRecipes.length > 0) {
      let random = allRecipes[Math.floor(Math.random() * allRecipes.length)];
      window.location.href = `recipe.html?id=${random.id}`;
    }
  });

  bulkClear.addEventListener("click", clearSelection);
  bulkRemove.addEventListener("click", bulkRemoveRecipes);
  bulkExport.addEventListener("click", showExportModal);
  bulkAddToMealPlan.addEventListener("click", () => {
    if (selectedRecipes.size === 0) return;
    selectedRecipes.forEach(recipeId => addToMealPlan(recipeId));
    clearSelection();
  });
}

function attachCollectionListeners() {
  document.querySelectorAll(".collection-card").forEach(card => {
    card.addEventListener("click", () => {
      let collectionId = card.dataset.id;
      let collection = collections.find(c => c.id === collectionId);
      if (collection) {
        if (selectedRecipes.size > 0) {
          addRecipesToCollection(collectionId, Array.from(selectedRecipes));
        } else {
          showSnackbar(`Viewing ${collection.name} collection (${collection.recipes.length} recipes)`);
        }
      }
    });
  });
}

function addRecipesToCollection(collectionId, recipeIds) {
  let collection = collections.find(c => c.id === collectionId);
  if (!collection) return;

  let addedCount = 0;
  recipeIds.forEach(recipeId => {
    if (!collection.recipes.includes(recipeId)) {
      collection.recipes.push(recipeId);
      addedCount++;
    }
  });

  saveCollections(collections);
  renderCollections();
  clearSelection();

  if (addedCount > 0) {
    showSnackbar(`Added ${addedCount} recipes to ${collection.name}`);
  } else {
    showSnackbar(`All selected recipes are already in ${collection.name}`);
  }
}

function addToCollectionFromQuickView(recipeId) {
  if (collections.length === 0) {
    showSnackbar('Please create a collection first');
    return;
  }

  let collectionList = collections.map(collection =>
    `<div class="collection-option" onclick="addRecipesToCollection('${collection.id}', ['${recipeId}']); quickViewModal.style.display='none'">
            <span>${collection.name}</span>
            <small>${collection.recipes.length} recipes</small>
        </div>`
  ).join('');

  quickViewContent.innerHTML += `
        <div class="collection-selection">
            <h5>Add to Collection:</h5>
            <div class="collection-options">${collectionList}</div>
        </div>
    `;
}

window.addEventListener("storage", event => {
  if (event.key === STORAGE_KEY) {
    pendingRemovals.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    pendingRemovals.clear();
    favoriteIds = loadFavorites();
    renderFavorites();
  }

  if (event.key === COLLECTIONS_KEY) {
    collections = loadCollections();
    renderCollections();
  }
});