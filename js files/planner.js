$(document).ready(function () {

  loadRecipes();

  /* ---------------- Tabs ---------------- */
  $("#tabAll").on("click", function () {
    $("#recipesGrid").show();
    $(".tab").removeClass("active");
    $(this).addClass("active");
    loadRecipes();
  });

  /* ---------------- Filter Dropdown ---------------- */
  $("#filterSelect").on("change", function() {
    let selectedCategory = $(this).val();

    if (selectedCategory === "clear") {
      $(".recipe-card").show();
      $(this).val("");
    } else {
      $(".recipe-card").hide();
      $(`.recipe-card[data-category="${selectedCategory}"]`).show();
    }
  });

  /* ---------------- Add to Planner Buttons ---------------- */
  $(document).on("click", ".add-to-planner-btn", function() {
    let $card = $(this).closest('.recipe-card');
    let recipeData = {
      name: $card.data('recipe'),
      nutrition: {
        calories_kcal: $card.data('calories'),
        protein_g: $card.data('protein'),
        carbs_g: $card.data('carbs'),
        fat_g: $card.data('fats')
      },
      ingredients: $card.data('ingredients')
    };
    
    showMealSelectionModal(recipeData);
  });

  /* ---------------- Drag & Drop Meals ---------------- */
  $(".meal-slot").droppable({
    accept: ".recipe-card",
    drop: function (event, ui) {
      let recipeName = ui.draggable.data("recipe");
      let calories = ui.draggable.data("calories");
      let protein = ui.draggable.data("protein");
      let carbs = ui.draggable.data("carbs");
      let fats = ui.draggable.data("fats");

      let ingredientsRaw = ui.draggable.attr("data-ingredients");
      let ingredients = [];
      try {
        ingredients = JSON.parse(ingredientsRaw);
      } catch (err) {
        ingredients = [];
      }

      let item = $("<p>" + recipeName + " <span class='remove-slot'>❌</span></p>");
      item.data({
        calories,
        protein,
        carbs,
        fats,
        ingredients
      });

      $(this).find(".slot-content").append(item.hide().fadeIn(300));
      updateSummary();
      updateNutrition();
    }
  });

  // Remove a meal from slot
  $(".meal-planner").on("click", ".remove-slot", function () {
    $(this).parent().fadeOut(300, function () {
      $(this).remove();
      updateSummary();
      updateNutrition();
    });
  });

  /* ---------------- Planner Actions ---------------- */
  $("#savePlanner").on("click", function () {
    $("#plannerSummary").fadeIn();
    alert("Meal plan saved successfully! 🎉");
  });

  $("#shopPlanner").on("click", function () {
    let ingredients = {};

    $(".slot-content p").each(function () {
      let ingList = $(this).data("ingredients") || [];
      ingList.forEach(function (ing) {
        ing = ing.trim();
        if (!ing) return;
        
        let cleanIngredient = extractIngredientName(ing);
        if (cleanIngredient) {
          ingredients[cleanIngredient] = (ingredients[cleanIngredient] || 0) + 1;
        }
      });
    });

    $("#ingredientsList").empty();

    if (Object.keys(ingredients).length === 0) {
      $("#ingredientsList").append("<li>No ingredients added to your meal plan yet!</li>");
    } else {
      let sortedIngredients = Object.keys(ingredients).sort();
      $.each(sortedIngredients, function (index, ing) {
        let count = ingredients[ing];
        $("#ingredientsList").append("<li>" + ing + (count > 1 ? " (" + count + " recipes)" : "") + "</li>");
      });
    }

    $("html, body").animate({
      scrollTop: $("#shoppingList").offset().top
    }, 600);
  });

  function extractIngredientName(ingredient) {
    // Ultra-safe cleaning - only remove obvious quantities
    let clean = ingredient
      .replace(/^(\d+\/\d+|\d+\.\d+|\d+)\s*/, '') // Remove leading numbers
      .replace(/\s*,.*$/, '') // Remove everything after comma
      .replace(/\s*(to taste|as needed|divided)$/gi, '') // Remove end phrases
      .replace(/\s+/g, ' ')
      .trim();

    // If we have nothing left, use simpler cleanup
    if (!clean || clean.length < 2) {
      clean = ingredient
        .replace(/^\d+\s*/, '')
        .replace(/\s*,.*$/, '')
        .trim();
    }

    // Capitalize and return
    return clean.replace(/\b\w/g, l => l.toUpperCase()) || ingredient;
  }

  $("#printPlanner").on("click", function () {
    window.print();
  });

  /* ---------------- Load Recipes ---------------- */
  function loadRecipes() {
    let recipes = JSON.parse(localStorage.getItem("recipes")) || [];
    $("#recipesGrid").empty();

    if (recipes.length === 0) {
      $("#recipesGrid").html('<div class="no-recipes"><p>Wait recipes are loading 🍳</p></div>');
      return;
    }

    $.each(recipes, function (index, recipe) {
      let card = `
        <div class="recipe-card"
             data-category="${recipe.mealType}"
             data-recipe="${recipe.name}"
             data-calories="${recipe.nutrition.calories_kcal}"
             data-protein="${recipe.nutrition.protein_g}"
             data-carbs="${recipe.nutrition.carbs_g}"
             data-fats="${recipe.nutrition.fat_g}"
             data-ingredients='${JSON.stringify(recipe.ingredients)}'>

          <div class="card-image">
            <img src="${recipe.image || 'placeholder.jpg'}" alt="${recipe.name}" class="card-img">
            <span class="meal-type-badge">${recipe.mealType}</span>
          </div>

          <div class="card-content">
            <h3 class="recipe-title">${recipe.name}</h3>

            <div class="recipe-meta">
              <span class="cuisine">${recipe.cuisine}</span>
              <span class="difficulty ${recipe.difficulty.toLowerCase()}">${recipe.difficulty}</span>
            </div>

            <div class="recipe-details">
              <span class="time">⏱ ${recipe.time.total} min</span>
              <span class="diet">${recipe.diet}</span>
            </div>

            <div class="nutrition-preview">
              <span class="calories">${recipe.nutrition.calories_kcal} kcal</span>
              <span class="protein">P: ${recipe.nutrition.protein_g}g</span>
            </div>

            <div class="card-actions">
              <button class="add-to-planner-btn">➕ Add to Planner</button>
            </div>
          </div>
        </div>
      `;
      $("#recipesGrid").append(card);
    });

    $(".recipe-card").draggable({
      helper: "clone",
      revert: "invalid",
      cursor: "move",
      opacity: 0.7
    });
  }

  /* ---------------- Meal Selection Modal ---------------- */
  function showMealSelectionModal(recipe) {
    let modalHtml = `
      <div id="mealSelectionModal" class="modal-overlay">
        <div class="modal-content">
          <h3>Add "${recipe.name}" to:</h3>
          <div class="day-selection">
            <h4>Select Day:</h4>
            <div class="day-options">
              <label><input type="radio" name="selectedDay" value="Monday" checked> Monday</label>
              <label><input type="radio" name="selectedDay" value="Tuesday"> Tuesday</label>
              <label><input type="radio" name="selectedDay" value="Wednesday"> Wednesday</label>
              <label><input type="radio" name="selectedDay" value="Thursday"> Thursday</label>
              <label><input type="radio" name="selectedDay" value="Friday"> Friday</label>
              <label><input type="radio" name="selectedDay" value="Saturday"> Saturday</label>
              <label><input type="radio" name="selectedDay" value="Sunday"> Sunday</label>
            </div>
          </div>
          <div class="meal-selection">
            <h4>Select Meal:</h4>
            <div class="meal-options">
              <label><input type="radio" name="mealType" value="breakfast" checked> Breakfast</label>
              <label><input type="radio" name="mealType" value="lunch"> Lunch</label>
              <label><input type="radio" name="mealType" value="dinner"> Dinner</label>
            </div>
          </div>
          <div class="modal-actions">
            <button id="confirmAddMeal" class="btn-primary">Add to Planner</button>
            <button id="cancelAddMeal" class="btn-outline">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    $('body').append(modalHtml);
    
    $("#confirmAddMeal").on("click", function() {
      let selectedDay = $("input[name='selectedDay']:checked").val();
      let selectedMeal = $("input[name='mealType']:checked").val();
      addRecipeToPlanner(recipe, selectedDay, selectedMeal);
      $("#mealSelectionModal").remove();
    });
    
    $("#cancelAddMeal").on("click", function() {
      $("#mealSelectionModal").remove();
    });

    $("#mealSelectionModal").on("click", function(e) {
      if ($(e.target).is("#mealSelectionModal")) {
        $("#mealSelectionModal").remove();
      }
    });
  }

  function addRecipeToPlanner(recipe, day, meal) {
    let $slot = $(`.planner-day[data-day="${day}"] .meal-slot[data-meal="${meal}"] .slot-content`);
    
    if ($slot.length === 0) {
      alert("Error: Could not find the selected meal slot!");
      return;
    }
    
    // Check for duplicates
    let existingRecipes = $slot.find('p');
    let alreadyExists = false;
    existingRecipes.each(function() {
      if ($(this).text().replace(' ❌', '') === recipe.name) {
        alreadyExists = true;
        return false;
      }
    });
    
    if (alreadyExists) {
      alert(`"${recipe.name}" is already in ${day} ${meal}!`);
      return;
    }
    
    // Add recipe to planner
    let item = $("<p>" + recipe.name + " <span class='remove-slot'>❌</span></p>");
    item.data({ 
      calories: recipe.nutrition.calories_kcal || 0,
      protein: recipe.nutrition.protein_g || 0,
      carbs: recipe.nutrition.carbs_g || 0,
      fats: recipe.nutrition.fat_g || 0,
      ingredients: recipe.ingredients || []
    });
    
    $slot.append(item.hide().fadeIn(300));
    updateSummary();
    updateNutrition();
  }

  /* ---------------- Planner Summary ---------------- */
  function updateSummary() {
    $("#plannerSummary").empty();
    let hasMeals = false;

    $(".planner-day").each(function () {
      let day = $(this).data("day");
      let meals = [];
      $(this).find(".slot-content p").each(function () {
        meals.push($(this).text().replace(" ❌", ""));
      });

      if (meals.length > 0) {
        $("#plannerSummary").append("<p><strong>" + day + ":</strong> " + meals.join(", ") + "</p>");
        hasMeals = true;
      }
    });

    if (!hasMeals) {
      $("#plannerSummary").html("<p>No meals planned yet. Add recipes to the planner! 🍽️</p>");
    }
  }

  /* ---------------- Nutrition Summary ---------------- */
  function updateNutrition() {
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;

    $(".slot-content p").each(function () {
      totalCalories += parseInt($(this).data("calories")) || 0;
      totalProtein += parseInt($(this).data("protein")) || 0;
      totalCarbs += parseInt($(this).data("carbs")) || 0;
      totalFats += parseInt($(this).data("fats")) || 0;
    });

    $(".nutrition").remove();

    if (totalCalories > 0) {
      $("#plannerSummary").append(`
        <div class='nutrition'>
          <h4>Weekly Nutrition Summary</h4>
          <p><strong>Calories:</strong> ${totalCalories} kcal</p>
          <p><strong>Protein:</strong> ${totalProtein}g</p>
          <p><strong>Carbs:</strong> ${totalCarbs}g</p>
          <p><strong>Fats:</strong> ${totalFats}g</p>
        </div>
      `);
    }
  }

});