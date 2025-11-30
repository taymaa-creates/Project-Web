$(document).ready(function() {
  let selectedIngredients = [];
  let allRecipes = [];

  $.getJSON("recipes.json", function(data) {
    allRecipes = data;
  });

  $(".ingredient").click(function() {
    let ingredient = $(this).data("ingredient");

    if (!selectedIngredients.includes(ingredient)) {
      selectedIngredients.push(ingredient);
      $(this).addClass("active"); 
    } else {
      selectedIngredients = selectedIngredients.filter(i => i !== ingredient);
      $(this).removeClass("active");
    }

    $(".selected-ingredients").text(
      selectedIngredients.length > 0 ? "Ingredients: " + selectedIngredients.join(", ") : ""
    );

    showRecipes(); 
  });

  function showRecipes() {
    let container = $(".recipes-container");
    container.empty();

    if (selectedIngredients.length === 0) {
      container.append("<p>Please select ingredients!</p>");
      return;
    }

    let ingredientSynonyms = {
      beef: ["beef", "veal", "steak", "shank", "beef broth"],
      chicken: ["chicken", "drumstick", "breast", "thigh"],
      garlic: ["garlic", "clove"],
      tomatoes: ["tomato", "tomatoes", "cherry tomatoes"],
      basil: ["basil"],
      vegetables: ["vegetable", "zucchini", "pepper", "bell pepper", "cabbage", "carrot", "onion"]
    };

    let filtered = allRecipes.filter(recipe => {
      return selectedIngredients.every(sel => {
        if (sel === "sweets") {
          return recipe.mealType.toLowerCase() === "dessert";  
        }
        let synonyms = ingredientSynonyms[sel] || [sel];
        return recipe.ingredients.some(ing =>
          synonyms.some(syn => ing.toLowerCase().includes(syn.toLowerCase()))
        );
      });
    });

    if (filtered.length === 0) {
      container.append("<p>No recipes match your selection.</p>");
      return;
    }

    filtered.forEach(recipe => {
      let card = `
        <div class="recipe-card">
          <img src="${recipe.image}" alt="${recipe.name}">
          <div class="recipe-info">
            <h3>${recipe.name}</h3>
            <p><strong>Cuisine:</strong> ${recipe.cuisine}</p>
            <p><strong>Meal Type:</strong> ${recipe.mealType}</p>
            <p><strong>Difficulty:</strong> ${recipe.difficulty}</p>
            <p><strong>Total Time:</strong> ${recipe.time.total} mins</p>
            <a href="${recipe.videoUrl}" target="_blank">🎥 Watch Video</a>
          </div>
        </div>
      `;
      container.append(card);
    });
  }

  $("#reset-btn").click(function() {
    selectedIngredients = [];
    $(".selected-ingredients").text("");
    $(".recipes-container").empty();
    $(".ingredient").removeClass("active"); 
  });
});