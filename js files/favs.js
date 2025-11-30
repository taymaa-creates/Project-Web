let favoritesGrid = document.getElementById("favoritesGrid");
let emptyState = document.getElementById("emptyState");
let mealFilters = document.getElementById("mealFilters");
let cuisineFilters = document.getElementById("cuisineFilters");
let clearFilters = document.getElementById("clearFilters");
let surpriseBtn = document.getElementById("surpriseBtn");
let bulkActions = document.getElementById("bulkActions");
let selectedCount = document.getElementById("selectedCount");
let bulkClear = document.getElementById("bulkClear");
let bulkRemove = document.getElementById("bulkRemove");
let bulkExport = document.getElementById("bulkExport");
let bulkMoveToCollection = document.getElementById("bulkMoveToCollection");
let collectionsList = document.getElementById("collectionsList");
let createCollection = document.getElementById("createCollection");
let quickViewModal = document.getElementById("quickViewModal");
let quickViewContent = document.getElementById("quickViewContent");
let collectionModal = document.getElementById("collectionModal");
let collectionName = document.getElementById("collectionName");
let confirmCollection = document.getElementById("confirmCollection");
let cancelCollection = document.getElementById("cancelCollection");
let deleteCollectionModal = document.getElementById("deleteCollectionModal");
let collectionToDeleteName = document.getElementById("collectionToDeleteName");
let confirmDeleteCollection = document.getElementById("confirmDeleteCollection");
let cancelDeleteCollection = document.getElementById("cancelDeleteCollection");
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
let currentCollection = null;
let collectionToDelete = null;

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
  try {
    let res = await fetch(JSON_PATH);
    allRecipes = await res.json();
  } catch (error) {
    console.error("Failed to load recipes:", error);
    // Fallback to sample data if JSON file is not available
    allRecipes = [
      {
        id: "1",
        name: "Vegetable Stir Fry",
        cuisine: "Asian",
        mealType: "Dinner",
        image: "https://via.placeholder.com/300x200",
        cookingTime: "20",
        difficulty: "Easy",
        ingredients: ["Bell peppers", "Broccoli", "Carrots", "Soy sauce", "Ginger", "Garlic"],
        instructions: ["Chop vegetables", "Heat oil in pan", "Stir fry vegetables", "Add sauce"]
      },
      {
        id: "2",
        name: "Pasta Carbonara",
        cuisine: "Italian",
        mealType: "Dinner",
        image: "https://via.placeholder.com/300x200",
        cookingTime: "25",
        difficulty: "Medium",
        ingredients: ["Pasta", "Eggs", "Parmesan cheese", "Bacon", "Black pepper"],
        instructions: ["Cook pasta", "Fry bacon", "Mix eggs and cheese", "Combine all ingredients"]
      },
      {
        id: "3",
        name: "Berry Smoothie",
        cuisine: "American",
        mealType: "Breakfast",
        image: "https://via.placeholder.com/300x200",
        cookingTime: "5",
        difficulty: "Easy",
        ingredients: ["Mixed berries", "Yogurt", "Honey", "Milk"],
        instructions: ["Add all ingredients to blender", "Blend until smooth"]
      }
    ];
  }
}

function renderFilters() {
  let favRecipes = getCurrentRecipes();
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

function getCurrentRecipes() {
  // Start with all favorite recipes
  let favRecipes = allRecipes.filter(r => favoriteIds.includes(r.id));
  
  // If we're viewing a collection, filter by that collection's recipes
  if (currentCollection) {
    const collection = collections.find(c => c.id === currentCollection);
    if (collection) {
      favRecipes = favRecipes.filter(r => collection.recipes.includes(r.id));
    }
  }
  
  return favRecipes;
}

function renderCollections() {
  if (collections.length === 0) {
    collectionsList.innerHTML = '<p style="color: #666; font-style: italic;">No collections yet</p>';
    return;
  }

  collectionsList.innerHTML = collections.map(collection => `
        <div class="collection-card ${currentCollection === collection.id ? 'active' : ''}" data-id="${collection.id}">
            <div class="collection-header">
                <div class="collection-name">${collection.name}</div>
                <div class="collection-actions">
                    <button class="collection-delete" title="Delete collection">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="collection-count">${collection.recipes.length} recipes</div>
        </div>
    `).join("");

  attachCollectionListeners();
}

function renderFavorites() {
  let favRecipes = getCurrentRecipes();
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

function showToast(message, type = "info", duration = 4000, actionText = null, onAction = null) {
  const toast = document.createElement("div");
  toast.className = `toast-notification toast-${type}`;
  
  let actionHtml = '';
  if (actionText && onAction) {
    actionHtml = `
      <div class="toast-actions">
        <button class="toast-action">${actionText}</button>
        <button class="toast-close">&times;</button>
      </div>
    `;
  } else {
    actionHtml = '<button class="toast-close">&times;</button>';
  }
  
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-message">${message}</div>
      ${actionHtml}
    </div>
  `;

  document.getElementById("toastContainer").appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Action button
  if (actionText && onAction) {
    const actionBtn = toast.querySelector(".toast-action");
    actionBtn.addEventListener("click", () => {
      onAction();
      hideToast(toast);
    });
  }

  // Close button
  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => {
    hideToast(toast);
  });

  // Auto hide
  if (duration > 0) {
    setTimeout(() => {
      hideToast(toast);
    }, duration);
  }

  return toast;
}

function hideToast(toast) {
  toast.classList.remove("show");
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 400);
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
  
  // Remove from all collections
  collections.forEach(collection => {
    collection.recipes = collection.recipes.filter(recipeId => recipeId !== id);
  });

  let visibleFavs = getCurrentRecipes().filter(r =>
    (!selectedMeal || r.mealType === selectedMeal) &&
    (!selectedCuisine || r.cuisine === selectedCuisine)
  );

  if (visibleFavs.length === 0) {
    favoritesGrid.style.display = 'none';
    emptyState.style.display = 'block';
  }

  let finalize = () => {
    saveFavorites(favoriteIds);
    saveCollections(collections);
    pendingRemovals.delete(id);
    if (favoriteIds.length === 0) renderFavorites();
  };

  let timeoutId = setTimeout(finalize, PENDING_TTL);
  pendingRemovals.set(id, { timeoutId, backupFavs });

  showToast('Removed from favorites', 'success', PENDING_TTL, 'Undo', () => {
    let pending = pendingRemovals.get(id);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingRemovals.delete(id);
    }
    favoriteIds = backupFavs.slice();
    saveFavorites(favoriteIds);
    renderFavorites();
  });
}

function setupModalEvents() {
  let modals = [quickViewModal, collectionModal, deleteCollectionModal, exportModal];

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
  
  confirmDeleteCollection.onclick = deleteCollection;
  cancelDeleteCollection.onclick = () => {
    deleteCollectionModal.style.display = 'none';
    collectionToDelete = null;
  };
  
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
  showToast(`Collection "${name}" created`, 'success');
}

function deleteCollection() {
  if (!collectionToDelete) return;
  
  const collection = collections.find(c => c.id === collectionToDelete);
  if (!collection) return;
  
  // Remove the collection (doesn't affect favorites)
  collections = collections.filter(c => c.id !== collectionToDelete);
  saveCollections(collections);
  
  // If we were viewing this collection, clear the current collection
  if (currentCollection === collectionToDelete) {
    currentCollection = null;
  }
  
  renderCollections();
  renderFavorites();
  deleteCollectionModal.style.display = 'none';
  showToast(`Collection "${collection.name}" deleted`, 'success');
  
  collectionToDelete = null;
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
            <button onclick="addToCollectionFromQuickView('${recipe.id}')" class="btn btn-secondary">Add to Collection</button>
            <button onclick="window.location.href='recipe.html?id=${recipe.id}'" class="btn btn-outline">Full Recipe</button>
        </div>
    `;

  quickViewModal.style.display = 'block';
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
    // Remove from all collections
    collections.forEach(collection => {
      collection.recipes = collection.recipes.filter(recipeId => recipeId !== id);
    });
  });

  saveFavorites(favoriteIds);
  saveCollections(collections);
  selectedRecipes.clear();
  renderFavorites();
  showToast(`Removed ${removedCount} recipes`, 'success');

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
  showToast(`Exported ${recipesToExport.length} recipes as ${format.toUpperCase()}`, 'success');
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
    currentCollection = null;
    renderFilters();
    renderFavorites();
    renderCollections();
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
}

function attachCollectionListeners() {
  document.querySelectorAll(".collection-card").forEach(card => {
    card.addEventListener("click", (e) => {
      // Don't trigger collection view if clicking the delete button
      if (e.target.closest('.collection-delete')) {
        return;
      }
      
      let collectionId = card.dataset.id;
      
      if (selectedRecipes.size > 0) {
        addRecipesToCollection(collectionId, Array.from(selectedRecipes));
      } else {
        // Show recipes from this collection
        currentCollection = currentCollection === collectionId ? null : collectionId;
        renderFavorites();
        renderCollections();
        
        if (currentCollection) {
          const collection = collections.find(c => c.id === collectionId);
          showToast(`Viewing ${collection.name} collection (${collection.recipes.length} recipes)`, 'info');
        } else {
          showToast('Showing all favorites', 'info');
        }
      }
    });
  });

  // Add delete collection button listeners
  document.querySelectorAll(".collection-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      let card = btn.closest(".collection-card");
      let collectionId = card.dataset.id;
      let collection = collections.find(c => c.id === collectionId);
      
      if (collection) {
        collectionToDelete = collectionId;
        collectionToDeleteName.textContent = collection.name;
        deleteCollectionModal.style.display = 'block';
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
    showToast(`Added ${addedCount} recipes to ${collection.name}`, 'success');
  } else {
    showToast(`All selected recipes are already in ${collection.name}`, 'warning');
  }
}

function addToCollectionFromQuickView(recipeId) {
  if (collections.length === 0) {
    showToast('Please create a collection first', 'warning');
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