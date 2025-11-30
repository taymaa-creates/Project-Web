document.addEventListener("DOMContentLoaded", () => {
  let loginPage = document.getElementById("login-page");
  let addRecipePage = document.getElementById("add-recipe-page");
  let loginBtn = document.getElementById("login-btn");
  let loginError = document.getElementById("login-error");

  let recipeTitle = document.getElementById("recipe-title");
  let cuisineSelect = document.getElementById("cuisine");
  let categorySelect = document.getElementById("category");
  let imageInput = document.getElementById("image-url");
  let avgTimeInput = document.getElementById("avg-time");
  let dietSelect = document.getElementById("diet");
  let videoInput = document.getElementById("video-url");
  let addVideoBtn = document.getElementById("add-video-btn");

  let ingredientsList = document.getElementById("ingredients-list");
  let suggestionButtons = document.querySelectorAll(".ingredient-btn");
  let customIngredientInput = document.getElementById("custom-ingredient-input");
  let addCustomIngredientBtn = document.getElementById("add-custom-ingredient-btn");

  let stepsList = document.getElementById("steps-list");
  let addStepBtn = document.getElementById("add-step-btn");

  let difficultyButtons = document.querySelectorAll(".difficulty-buttons button");
  let difficultyHiddenInput = document.getElementById("difficulty");

  let previewTitle = document.getElementById("preview-title");
  let previewDetails = document.getElementById("preview-details");
  let previewImage = document.getElementById("preview-image");
  let previewIngredients = document.getElementById("preview-ingredients");
  let previewSteps = document.getElementById("preview-steps");
  let previewVideosUl = document.querySelector("#preview-videos ul");
  let previewNutrition = document.getElementById("preview-nutrition");

  let calculateBtn = document.getElementById("calculate-nutrition-btn");

  let saveDraftBtn = document.getElementById("save-draft-btn");
  let saveCloseBtn = document.getElementById("save-close-btn");
  let publishBtn = document.getElementById("publish-btn");
  let deleteDraftBtn = document.getElementById("delete-draft-btn");

  let userRecipesContainer = document.getElementById("user-recipes-container");

  let users = [
    { username: "may", password: "may123" },
    { username: "jan", password: "jan123" },
    { username: "feb", password: "feb123" },
    { username: "mar", password: "mar123" },
    { username: "april", password: "april123" },
    { username: "june", password: "june123" },
    { username: "july", password: "july123" },
    { username: "august", password: "aug123" },
    { username: "september", password: "sep123" },
    { username: "october", password: "oct123" },
    { username: "november", password: "nov123" },
    { username: "december", password: "dec123" }
  ];

  // Recipe object
  let recipe = {
    id: null,
    name: "",
    ingredients: [],
    instructions: [],
    difficulty: "",
    cuisine: "",
    mealType: "",
    image: "",
    videos: [],
    username: "",
    time: { prep: 0, cook: 0, total: 0 },
    diet: "",
    nutrition: { calories_kcal: 0, fat_g: 0, protein_g: 0, carbs_g: 0 }
  };

  let saveRecipesToLocalStorage = list =>
  localStorage.setItem("recipes", JSON.stringify(list));

let loadRecipesFromLocalStorage = () =>
  JSON.parse(localStorage.getItem("recipes") || "[]");

async function initRecipes() {
  try {
    const res = await fetch("../recipes.json"); 
    if (!res.ok) throw new Error("recipes.json not found");
    const data = await res.json();

    const formattedData = data.map(r => ({
      ...r,
      videos: r.videoUrl ? [r.videoUrl] : []
    }));

    if (!localStorage.getItem("recipes")) {
      saveRecipesToLocalStorage(formattedData);
    }

    if (localStorage.getItem("currentUser")) {
      displayUserRecipes();
    }

  } catch (err) {
    console.error("Error loading recipes.json:", err);
  }
}


initRecipes().then(()=>{
  if(localStorage.getItem("currentUser")){
    displayUserRecipes();
  }
});



  loginBtn.addEventListener("click", async() => {
    let u = document.getElementById("username").value.trim();
    let p = document.getElementById("password").value.trim();
    let found = users.find(x => x.username === u && x.password === p);

    if (found) {
      localStorage.setItem("currentUser", found.username);
      loginPage.classList.add("hidden");
      addRecipePage.classList.remove("hidden");
      await initRecipes();
      loadDraft();
      displayUserRecipes();
    } else {
      loginError.textContent = "Invalid credentials!";
    }
  });

  // Display user recipes
  function displayUserRecipes() {
    if (!userRecipesContainer){
      console.error("not found");
    return;}
    let currentUser = localStorage.getItem("currentUser");
    let allRecipes = loadRecipesFromLocalStorage();
    let userRecipes = allRecipes.filter(r => r.username === currentUser);
    console.log("user recipes", userRecipes);

    userRecipesContainer.innerHTML = "";
    userRecipes.forEach(r => {
      let card = document.createElement("div");
      card.className = "recipe-card";
      card.innerHTML = `
        <img src="${r.image}" alt="${r.name}">
        <div class="card-content">
          <h3>${r.name}</h3>
          <div class="card-details">
            Cuisine: ${r.cuisine || "N/A"} • Meal: ${r.mealType || "N/A"} • Difficulty: ${r.difficulty || "N/A"}
          </div>
          <ul class="card-ingredients">
            ${r.ingredients.map(ing => `<li>${ing}</li>`).join("")}
          </ul>
          <div class="card-footer">
            <span>Total: ${r.time.total || 0} min</span>
            <div class="card-actions">
            <button class="edit-btn" data-id="${r.id}">Edit</button>
            <button class="delete-btn" data-id="${r.id}">Delete</button>
          </div>
          </div>
        </div>
      `;
      userRecipesContainer.appendChild(card);
    });
    attachCardEventListeners();
  }
  function attachCardEventListeners() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const recipeId = e.target.dataset.id;
      editRecipe(recipeId);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const recipeId = e.target.dataset.id;
      deleteRecipe(recipeId);
    });
  });
}
function editRecipe(recipeId) {
  let allRecipes = loadRecipesFromLocalStorage();
  let recipeToEdit = allRecipes.find(r => r.id === recipeId);
  
  if (!recipeToEdit) {
    alert("Recipe not found!");
    return;
  }

  // Load the recipe data into the form
  recipe = { ...recipeToEdit };
  
  // Update form fields
  recipeTitle.value = recipe.name;
  cuisineSelect.value = recipe.cuisine;
  categorySelect.value = recipe.mealType;
  imageInput.value = recipe.image;
  avgTimeInput.value = recipe.time.total;
  dietSelect.value = recipe.diet;
  
  // Update difficulty buttons
  difficultyButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === recipe.difficulty);
  });

  // Update preview
  renderIngredients();
  renderSteps();
  renderVideos();
  updatePreview();
  
  alert("Recipe loaded for editing! Make your changes and click 'Publish' to update.");
}

function deleteRecipe(recipeId) {
  if (!confirm("Are you sure you want to delete this recipe?")) {
    return;
  }

  let allRecipes = loadRecipesFromLocalStorage();
  let updatedRecipes = allRecipes.filter(r => r.id !== recipeId);
  
  saveRecipesToLocalStorage(updatedRecipes);
  displayUserRecipes(); // Refresh the display
  
  alert("Recipe deleted successfully!");
}

  // Inputs → update recipe
  recipeTitle.addEventListener("input", e => {
    recipe.name = e.target.value;
    updatePreview();
  });
  cuisineSelect.addEventListener("change", e => {
    recipe.cuisine = e.target.value;
    updatePreview();
  });
  categorySelect.addEventListener("change", e => {
    recipe.mealType = e.target.value;
    updatePreview();
  });
  imageInput.addEventListener("input", e => {
    recipe.image = e.target.value;
    updatePreview();
  });
  avgTimeInput.addEventListener("input", e => {
    recipe.time.total = parseInt(e.target.value, 10) || 0;
    updatePreview();
  });
  dietSelect.addEventListener("change", e => {
    recipe.diet = e.target.value;
    updatePreview();
  });

  difficultyButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      difficultyButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      recipe.difficulty = btn.dataset.value;
      difficultyHiddenInput.value = recipe.difficulty;
      updatePreview();
    });
  });

  addCustomIngredientBtn.addEventListener("click", () => {
    let name = customIngredientInput.value.trim();
    if (name && !recipe.ingredients.includes(name)) {
      recipe.ingredients.push(name);
      customIngredientInput.value = "";
      renderIngredients();
      updatePreview();
    }
  });

  suggestionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      let name = btn.dataset.name;
      if (!recipe.ingredients.includes(name)) {
        recipe.ingredients.push(name);
        renderIngredients();
        updatePreview();
      }
    });
  });

  addStepBtn.addEventListener("click", () => {
    recipe.instructions.push("");
    renderSteps();
  });

  addVideoBtn.addEventListener("click", () => {
    let url = videoInput.value.trim();
    if (url) recipe.videos.push(url);
    videoInput.value = "";
    renderVideos();
    updatePreview();
  });

  calculateBtn.addEventListener("click", () => {
  let count = recipe.ingredients.length;
  recipe.nutrition = {
    calories_kcal: count * 50,
    protein_g: count * 2,
    fat_g: count * 1,
    carbs_g: count * 8
  };
  
  let nutritionResult = document.getElementById("nutrition-result");
  let paragraphs = nutritionResult.querySelectorAll("p");
  paragraphs[0].textContent = `Calories: ${recipe.nutrition.calories_kcal} kcal`;
  paragraphs[1].textContent = `Protein: ${recipe.nutrition.protein_g} g`;
  paragraphs[2].textContent = `Fat: ${recipe.nutrition.fat_g} g`;
  paragraphs[3].textContent = `Carbs: ${recipe.nutrition.carbs_g} g`;
  
  updatePreview();
});
  
  

  saveDraftBtn.addEventListener("click", () => {
    localStorage.setItem(`${localStorage.getItem("currentUser")}-draft`, JSON.stringify(recipe));
    alert("Draft saved!");
  });

  saveCloseBtn.addEventListener("click", () => {
    localStorage.setItem(`${localStorage.getItem("currentUser")}-draft`, JSON.stringify(recipe));
    alert("Draft saved! You can continue later.");
    addRecipePage.classList.add("hidden");
    loginPage.classList.remove("hidden");
  });

  publishBtn.addEventListener("click", () => {
    if (!recipe.name.trim()) {
    alert("Please enter a recipe title!");
    return;
  }
  if (recipe.ingredients.length === 0) {
    alert("Please add at least one ingredient!");
    return;
  }
    let all = loadRecipesFromLocalStorage();
    let newRecipe = {
      ...recipe,
      id: Date.now().toString(),
      username: localStorage.getItem("currentUser")
    };
    all.push(newRecipe);
    saveRecipesToLocalStorage(all);
    alert("Recipe published!");
    resetRecipe();
    displayUserRecipes();
  });

  deleteDraftBtn.addEventListener("click", () => {
    localStorage.removeItem(`${localStorage.getItem("currentUser")}-draft`);
    resetRecipe();
    alert("Draft deleted!");
  });
  function clearForm() {
  recipeTitle.value = "";
  cuisineSelect.value = "";
  categorySelect.value = "";
  imageInput.value = "";
  avgTimeInput.value = "";
  dietSelect.value = "";
  videoInput.value = "";
  customIngredientInput.value = "";
  
  difficultyButtons.forEach(btn => btn.classList.remove("active"));
  difficultyHiddenInput.value = "";
  }

  function renderIngredients() {
    ingredientsList.innerHTML = "";
    if (recipe.ingredients.length === 0) {
      ingredientsList.innerHTML = '<p class="muted">No ingredients yet.</p>';
      return;
    }
    recipe.ingredients.forEach((ing, i) => {
      let div = document.createElement("div");
      div.className = "ingredient-item";
      div.textContent = ing;

      let delBtn = document.createElement("button");
      delBtn.textContent = "X";
      delBtn.addEventListener("click", () => {
        recipe.ingredients.splice(i, 1);
        renderIngredients();
        updatePreview();
      });

      div.appendChild(delBtn);
      ingredientsList.appendChild(div);
    });
  }

  function renderSteps() {
    stepsList.innerHTML = "";
    recipe.instructions.forEach((s, i) => {
      let ta = document.createElement("textarea");
      ta.placeholder = `Step ${i + 1}`;
      ta.value = s;
      ta.addEventListener("input", e => {
        recipe.instructions[i] = e.target.value;
        updatePreview();
      });
      stepsList.appendChild(ta);
    });
  }

  function renderVideos() {
    previewVideosUl.innerHTML = "";
    recipe.videos.forEach(url => {
      let li = document.createElement("li");
      let a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.textContent = url;
      li.appendChild(a);
      previewVideosUl.appendChild(li);
    });
  }

  function updatePreview() {
    previewTitle.textContent = recipe.name || "Recipe Title";
    previewDetails.textContent =
      `${recipe.cuisine || "Cuisine"} • ${recipe.mealType || "Meal Type"} • ${recipe.difficulty || "Difficulty"} • ${recipe.diet || "Diet"} • ${recipe.time.total || 0} min`;

    if (recipe.image) previewImage.src = recipe.image;

    previewIngredients.innerHTML = "";
    recipe.ingredients.forEach(ing => {
      let li = document.createElement("li");
      li.textContent = ing;
      previewIngredients.appendChild(li);
    });

    previewSteps.innerHTML = "";
    recipe.instructions.forEach(s => {
      let li = document.createElement("li");
      li.textContent = s;
      previewSteps.appendChild(li);
    });

    previewNutrition.innerHTML = `
      <h5>Nutrition:</h5>
      <p>Calories: ${recipe.nutrition.calories_kcal} kcal</p>
      <p>Protein: ${recipe.nutrition.protein_g} g</p>
      <p>Fat: ${recipe.nutrition.fat_g} g</p>
      <p>Carbs: ${recipe.nutrition.carbs_g} g</p>
    `;
  }

  function loadDraft() {
    let raw = localStorage.getItem(`${localStorage.getItem("currentUser")}-draft`);
    if (!raw) return;
    try {
      recipe = JSON.parse(raw);
    } catch {
      return;
    }
    renderIngredients();
    renderSteps();
    renderVideos();
    updatePreview();
  }

  function resetRecipe() {
    recipe = {
      id: null,
      name: "",
      ingredients: [],
      instructions: [],
      difficulty: "",
      cuisine: "",
      mealType: "",
      image: "",
      videos: [],
      username: "",
      time: { prep: 0, cook: 0, total: 0 },
      diet: "",
      nutrition: { calories_kcal: 0, fat_g: 0, protein_g: 0, carbs_g: 0 }
    };
    clearForm();
    renderIngredients();
    renderSteps();
    renderVideos();
    updatePreview();
  }

  renderIngredients();
  renderSteps();
  renderVideos();
  updatePreview();
});