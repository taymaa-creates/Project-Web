let hamburger = document.getElementById('hamburger');   // burger icon
let navDesc = document.getElementById('nav');    // links container

// Toggle the mobile menu on burger click
hamburger.onclick = function () {
    navDesc.classList.toggle('open');                     // add/remove .open to show/hide
};

let recipes = [];
let currentIndex = 0;

// Elements
const imgEl = document.getElementById("recipe-image");
const titleEl = document.getElementById("recipe-title");
const descEl = document.getElementById("recipe-desc");
const tagsEl = document.getElementById("recipe-tags");
const timeEl = document.getElementById("recipe-time");
const difficultyEl = document.getElementById("recipe-difficulty");
const readMoreBtn = document.getElementById("read-more");

const prevBtn = document.querySelector(".prev-btn");
const nextBtn = document.querySelector(".next-btn");

// Fetch JSON data
fetch("recipes.json")
    .then(res => res.json())
    .then(data => {
        // Shuffle the recipes array randomly
        recipes = data.sort(() => Math.random() - 0.5);

        // Display the first recipe
        if (recipes.length > 0) {
            displayRecipe(recipes[currentIndex]);
        }
    })
    .catch(err => console.error("Error loading JSON:", err));

// Display a recipe
function displayRecipe(recipe) {
    // Image
    imgEl.src = recipe.image;
    imgEl.alt = recipe.name;

    // Title & short description
    titleEl.textContent = recipe.name;
    const shortDesc = recipe.instructions[0] || "No description available.";
    descEl.textContent = shortDesc.length > 120 ? shortDesc.slice(0, 120) + "..." : shortDesc; /* : means else */

    // Tags (cuisine, diet, mealType)
    tagsEl.innerHTML = "";
    if (recipe.cuisine)
        tagsEl.innerHTML += `<span class="tag cuisine">${recipe.cuisine}</span>`;
    if (recipe.diet)
        tagsEl.innerHTML += `<span class="tag diet">${recipe.diet}</span>`;
    if (recipe.mealType)
        tagsEl.innerHTML += `<span class="tag mealType">${recipe.mealType}</span>`;

    timeEl.textContent = recipe.time?.total || "N/A";
    difficultyEl.textContent = recipe.difficulty || "N/A";

    readMoreBtn.onclick = () => {
        location.assign(`recipe.html?id=${recipe.id}`);
    };
}


nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % recipes.length;
    displayRecipe(recipes[currentIndex]);
});

prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + recipes.length) % recipes.length;
    displayRecipe(recipes[currentIndex]);
});

// Categories slider
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const categoryContainer = document.getElementById("categories-container");
  const catPrevBtn = document.querySelector(".catg.prev");
  const catNextBtn = document.querySelector(".catg.next");

  // Only run if category section exists
  if (!categoryContainer) return;

  fetch("recipes.json")
    .then(res => res.json())
    .then(data => {
      const cuisines = [...new Set(data.map(r => r.cuisine))];
      const mealTypes = [...new Set(data.map(r => r.mealType))];
      const diets = [...new Set(data.map(r => r.diet))];
      const categories = [...cuisines, ...mealTypes, ...diets].filter(Boolean);

      // Create each category card
      categories.forEach(cat => {
        // Get all recipes belonging to this category
        const relatedRecipes = data.filter(r =>
          r.cuisine === cat || r.mealType === cat || r.diet === cat
        );

        // Pick one random recipe image (but deterministic per page load)
        let randomIndex = 0;
        if (relatedRecipes.length > 0) {
          // hash-like method for consistent pseudo-random image per page load
          const seed = cat.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          randomIndex = seed % relatedRecipes.length;
        }
        const chosenImage = relatedRecipes[randomIndex]?.image || "images/default.jpg";

        // Create the card
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

  // Scroll navigation
  if (catNextBtn && catPrevBtn) {
    catNextBtn.addEventListener("click", () => {
      categoryContainer.scrollBy({ left: 250, behavior: "smooth" });
    });
    catPrevBtn.addEventListener("click", () => {
      categoryContainer.scrollBy({ left: -250, behavior: "smooth" });
    });
  }
});

// section explore
//
document.addEventListener("DOMContentLoaded", () => {
  const filterContainer = document.getElementById("filter-buttons");
  const recipeGrid = document.getElementById("recipe-grid");

  if (!filterContainer || !recipeGrid) return;

  // Fetch recipes independently
  fetch("recipes.json")
    .then(res => res.json())
    .then(data => {
      const allRecipes = data;
      const cuisines = [...new Set(allRecipes.map(r => r.cuisine).filter(Boolean))];

      // Generate cuisine filter buttons
      cuisines.forEach((cuisine, index) => {
        const btn = document.createElement("button");
        btn.className = "filter-btn" + (index === 0 ? " active" : "");
        btn.textContent = cuisine;
        btn.dataset.cuisine = cuisine;
        filterContainer.appendChild(btn);
      });

      // Default: show recipes for first cuisine
      if (cuisines.length > 0) showRecipes(cuisines[0]);

      // Event listeners for cuisine buttons
      filterContainer.addEventListener("click", e => {
        if (!e.target.classList.contains("filter-btn")) return;

        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");

        showRecipes(e.target.dataset.cuisine);
      });

      // Show 4 random recipes for selected cuisine
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
            <img src="${recipe.image}" alt="${recipe.name}">
            <div class="recipe-card-content">
              <h3>${recipe.name}</h3>
              <div class="recipe-info">
                <span><i class="fa-regular fa-clock"></i> ${recipe.time?.total || "N/A"}</span>
                <span><i class="fa-solid fa-signal"></i> ${recipe.difficulty}</span>
              </div>
            </div>
          `;

          // When user clicks a recipe card → open recipe page
          card.addEventListener("click", () => {
            location.assign(`recipe.html?id=${recipe.id}`);
          });

          recipeGrid.appendChild(card);
        });
      }
    })
    .catch(err => console.error("Error loading recipes:", err));
});

// container5 search functionality
// 
document.addEventListener("DOMContentLoaded", () => {
  const section = document.getElementById("search-section");
  if (!section) return; // runs only if section exists

  const input = document.getElementById("recipe-search-input");
  const form = document.getElementById("recipe-search-form");
  const tagsContainer = document.getElementById("suggested-tags");
  const browseLink = document.getElementById("browse-all");

  // Fetch dataset and build suggested tags from cuisine + mealType
  fetch("recipes.json")
    .then(r => {
      if (!r.ok) throw new Error("Failed to load recipes.json");
      return r.json();
    })
    .then(data => {
      // collect unique cuisines and mealTypes
      const cuisines = [...new Set(data.map(x => (x.cuisine || "").trim()).filter(Boolean))];
      const mealTypes = [...new Set(data.map(x => (x.mealType || "").trim()).filter(Boolean))];

      const combined = [...cuisines, ...mealTypes].filter(Boolean);
      const uniquePills = [...new Set(combined)].slice(0, 9); // show up to 9 suggestions

      uniquePills.forEach(value => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tag-pill";
        btn.textContent = value;

        // when clicked: detect if value is a cuisine or a mealType (cuisine has priority)
        btn.addEventListener("click", () => {
          const isCuisine = cuisines.some(c => c.toLowerCase() === value.toLowerCase());
          if (isCuisine) {
            // go to recipes page filtered by cuisine
            location.assign(`recipes.html?cuisine=${encodeURIComponent(value)}`);
          } else {
            // treat as mealType
            location.assign(`recipes.html?mealType=${encodeURIComponent(value)}`);
          }
        });
        tagsContainer.appendChild(btn);
      });

      // if no tags found, hide container
      if (uniquePills.length === 0) {
        tagsContainer.style.display = "none";
      }
    })
    .catch(err => {
      console.error("Error building search tags:", err);
      tagsContainer.style.display = "none";
    });

  // Form submit: redirect to recipes.html?q=searchTerm (on Enter or clicking search)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (input.value || "").trim();
    if (!q) {
      // optionally: focus input
      input.focus();
      return;
    }
    // Redirect to recipes.html and pass the query
    location.assign(`recipes.html?q=${encodeURIComponent(q)}`);
  });

  // Optional: clicking browse link already has href="categories.html" so no JS needed
});

document.getElementById('year').textContent = new Date().getFullYear();