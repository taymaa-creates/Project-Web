let RECIPES_JSON = 'recipes.json';
let STORAGE_KEY = 'favorites'
let grid = document.getElementById('recipes-grid');
let searchInput = document.getElementById('live-search');
let mainTitle = document.getElementById('main-title');
let mainSub = document.getElementById('main-sub');
let clearBtn = document.getElementById('clear-filters');
let lastFilteredList = [];

let allRecipes = [];
let selectedFilters = {
    cuisine: new Set(),
    mealType: new Set(),
    difficulty: new Set(),
    diet: new Set(),
    time: '',
    nutrition: '',
};
let ITEMS_PER_PAGE = 10;
let itemsToShow = ITEMS_PER_PAGE;

function loadFavoritesArray() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Failed to parse favorites from localStorage', e);
        return [];
    }
}
function saveFavoritesArray(arr) {
    const unique = Array.from(new Set(arr.map(String)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}
let favoritesSet = new Set(loadFavoritesArray());

let firstSentence = (arr) => {
    if (!arr || arr.length === 0) return '';
    const txt = arr.join(' ').trim();
    const m = txt.match(/(.+?[\.\!\?])\s|(.{0,120})$/);
    return m ? (m[1] || m[2]).slice(0, 120) : txt.slice(0, 120);
};
function totalTime(recipe) {
    if (recipe.time && Number.isFinite(recipe.time.total)) return Number(recipe.time.total);
    const p = Number(recipe.time?.prep || 0);
    const c = Number(recipe.time?.cook || 0);
    return p + c;
}
function debounce(fn, wait = 160) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
function escapeHtml(s = '') { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

const preSelectedQuery = {
    searchText: '',
    filtersFromFilterParam: '',
    cuisine: '',
    mealType: '',
};

function readInitialParams() {
    const url = new URL(location.href);
    const q1 = url.searchParams.get('q');
    const q2 = url.searchParams.get('search');
    preSelectedQuery.searchText = (q1 || q2 || '').trim();

    preSelectedQuery.filtersFromFilterParam = url.searchParams.get('filter') || '';
    preSelectedQuery.cuisine = url.searchParams.get('cuisine') || '';
    preSelectedQuery.mealType = url.searchParams.get('mealType') || '';

    const timeParam = url.searchParams.get('time');
    if (timeParam) preSelectedQuery.time = timeParam;

    const nutritionParam = url.searchParams.get('nutrition');
    if (nutritionParam) {
        preSelectedQuery.nutrition = nutritionParam;
    }
}
function applyPreselection() {
    if (preSelectedQuery.searchText) {
        searchInput.value = decodeURIComponent(preSelectedQuery.searchText);
    }
    if (preSelectedQuery.filtersFromFilterParam) {
        const parts = preSelectedQuery.filtersFromFilterParam.split('|');
        parts.forEach(p => {
            const [k, v] = p.split(':');
            if (!k) return;
            if (k === 'time') selectedFilters.time = v || '';
            else if (selectedFilters[k] && v) selectedFilters[k].add(v);
        });
    }

    if (preSelectedQuery.cuisine) {
        selectedFilters.cuisine.add(preSelectedQuery.cuisine);
        const chip = document.querySelector(`.filter-choices .chip[data-key="cuisine"][data-value="${CSS.escape(preSelectedQuery.cuisine)}"]`);
        if (chip) chip.classList.add('selected');
    }
    if (preSelectedQuery.mealType) {
        selectedFilters.mealType.add(preSelectedQuery.mealType);
        const chip = document.querySelector(`.filter-choices .chip[data-key="mealType"][data-value="${CSS.escape(preSelectedQuery.mealType)}"]`);
        if (chip) chip.classList.add('selected');
    }
    if (preSelectedQuery.time) {
        selectedFilters.time = preSelectedQuery.time;
        const tchip = document.querySelector(`[data-filter="time"] .chip[data-value="${CSS.escape(preSelectedQuery.time)}"]`);
        if (tchip) tchip.classList.add('selected');
    }

    if (preSelectedQuery.nutrition) {
        selectedFilters.nutrition = preSelectedQuery.nutrition;
        const nchip = document.querySelector(`[data-filter="nutrition"] .chip[data-value="${CSS.escape(preSelectedQuery.nutrition)}"]`);
        if (nchip) nchip.classList.add('selected');
    }

    ['cuisine', 'mealType', 'difficulty', 'diet'].forEach(k => {
        selectedFilters[k].forEach(v => {
            const btn = document.querySelector(`.filter-choices .chip[data-key="${k}"][data-value="${CSS.escape(v)}"]`);
            if (btn) btn.classList.add('selected');
        });
    });
    applyFilters();
}

function updateHeader() {
    console.log('Current state:', {
        search: searchInput.value.trim(),
        cuisine: Array.from(selectedFilters.cuisine),
        mealType: Array.from(selectedFilters.mealType),
        difficulty: Array.from(selectedFilters.difficulty),
        diet: Array.from(selectedFilters.diet),
        time: selectedFilters.time,
        nutrition: selectedFilters.nutrition
    });

    const active = [];
    for (const k of ['cuisine', 'mealType', 'difficulty', 'diet']) {
        if (selectedFilters[k] && selectedFilters[k].size > 0) {
            active.push(...Array.from(selectedFilters[k]).map(v => `${k}: ${v}`));
        }
    }
    
    if (selectedFilters.time && selectedFilters.time !== '') {
        active.push(`time: ${selectedFilters.time}`);
    }
    
    if (selectedFilters.nutrition && selectedFilters.nutrition !== '') {
        active.push(`nutrition: ${selectedFilters.nutrition}`);
    }

    const q = searchInput.value.trim();
    if (q && active.length === 0) {
        mainTitle.textContent = `Search: "${q}"`;
        mainSub.textContent = `Results matching "${q}"`;
        return;
    }
    if (active.length > 0) {
        const label = active.join(' | ');
        mainTitle.textContent = label;
        if (q) {
            mainSub.textContent = `Results matching "${q}" with ${label}`;
        } else {
            mainSub.textContent = `Find your ${label} recipes here.`;
        }
        return;
    }
    
    mainTitle.textContent = 'All Recipes';
    mainSub.textContent = 'Find the recipe that matches your mood';
}
function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const res = allRecipes.filter(r => {
        if (q) {
            const hay = `${r.name} ${r.cuisine} ${r.mealType} ${r.diet}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        if (selectedFilters.cuisine.size && !selectedFilters.cuisine.has(r.cuisine)) return false;
        if (selectedFilters.mealType.size && !selectedFilters.mealType.has(r.mealType)) return false;
        if (selectedFilters.difficulty.size && !selectedFilters.difficulty.has(r.difficulty)) return false;
        if (selectedFilters.diet.size && !selectedFilters.diet.has(r.diet)) return false;

        const tt = totalTime(r);
        if (selectedFilters.time === 'fast' && tt >= 30) return false;
        if (selectedFilters.time === 'medium' && (tt < 30 || tt > 60)) return false;
        if (selectedFilters.time === 'long' && tt <= 60) return false;

        if (selectedFilters.nutrition) {
            const nutrition = r.nutrition || {};
            const calories = nutrition.calories_kcal || 0;
            const protein = nutrition.protein_g || 0;
            const carbs = nutrition.carbs_g || 0;

            switch (selectedFilters.nutrition) {
                case 'low-calorie':
                    if (calories >= 500) return false;
                    break;
                case 'high-protein':
                    if (protein < 30) return false;
                    break;
                case 'low-carb':
                    if (carbs >= 20) return false;
                    break;
                case 'balanced':
                    if (calories > 800 || protein < 20 || carbs > 50) return false;
                    break;
            }
        }

        return true;
    });
    lastFilteredList = res.slice();
    itemsToShow = ITEMS_PER_PAGE;

    renderRecipes(res);
    updateHeader();
}
function filledHeartSvg() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#d9534f" d="M12 21s-7.4-4.35-10-7.12C-0.1 11.64 2.5 6.5 6.5 7.5 8.6 8 9.6 10.5 12 12.5c2.4-2 3.4-4.5 5.5-5 4-1 6.6 4.15 4.5 6.38C19.4 16.65 12 21 12 21z"/></svg>`;
}
function outlineHeartSvg() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="#d9534f" stroke-width="1.6" d="M12 21s-7.4-4.35-10-7.12C-0.1 11.64 2.5 6.5 6.5 7.5 8.6 8 9.6 10.5 12 12.5c2.4-2 3.4-4.5 5.5-5 4-1 6.6 4.15 4.5 6.38C19.4 16.65 12 21 12 21z"/></svg>`;
}

function createCard(recipe) {
    const tt = totalTime(recipe);
    const fav = favoritesSet.has(recipe.id);
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.dataset.id = recipe.id;

    card.innerHTML = `
    <button class="heart-btn" type="button" aria-pressed="${fav ? 'true' : 'false'}" title="${fav ? 'Remove from favorites' : 'Save to favorites'}">
      ${fav ? filledHeartSvg() : outlineHeartSvg()}
    </button>

    <div class="recipe-image">
      <img src="${recipe.image || 'https://via.placeholder.com/800x600?text=No+Image'}" alt="${escapeHtml(recipe.name)}" loading="lazy" />
    </div>

    <div class="recipe-content">
      <div>
        <div class="recipe-tags">
          ${renderTag('cuisine', recipe.cuisine)}
          ${renderTag('diet', recipe.diet)}
          ${renderTag('mealType', recipe.mealType)}
        </div>
        <h3 class="recipe-title">${escapeHtml(recipe.name)}</h3>
      </div>

      <div class="recipe-info">
        <button class="read-more" data-id="${recipe.id}">cook now</button>
        <div class="meta">
          <span class="meta-time"><strong>${tt}</strong> min</span>
          <span class="meta-difficulty" style="text-transform:capitalize">${escapeHtml(recipe.difficulty || '')}</span>
        </div>
      </div>
    </div>
  `;
    return card;
}

function renderTag(type, value) {
    if (!value) return '';
    const cls = type === 'cuisine' ? 'tag cuisine' : (type === 'diet' ? 'tag diet' : 'tag mealType');
    return `<span class="${cls}">${escapeHtml(value)}</span>`;
}

function renderRecipes(list) {
    grid.innerHTML = '';
    if (!list.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;padding:30px;border-radius:10px;text-align:center;color:var(--muted-text)">No recipes match your search / filters.</div>`;
        const wrap = document.getElementById('load-more-wrap');
        if (wrap) wrap.style.display = 'none';
        return;
    }

    const slice = list.slice(0, Math.max(0, itemsToShow));
    const frag = document.createDocumentFragment();
    slice.forEach(r => frag.appendChild(createCard(r)));
    grid.appendChild(frag);

    const loadWrap = document.getElementById('load-more-wrap');
    const loadBtn = document.getElementById('load-more');
    if (list.length > slice.length) {
        if (loadWrap) loadWrap.style.display = 'block';
        if (loadBtn) loadBtn.disabled = false;
    } else {
        if (loadWrap) loadWrap.style.display = 'none';
    }
}

function populateFilters(data) {
    let cuisines = new Set();
    let meals = new Set();
    let diffs = new Set();
    let diets = new Set();
    data.forEach(r => {
        if (r.cuisine) cuisines.add(r.cuisine);
        if (r.mealType) meals.add(r.mealType);
        if (r.difficulty) diffs.add(r.difficulty);
        if (r.diet) diets.add(r.diet);
    });

    let makeChips = (containerSelector, values, key) => {
        let container = document.querySelector(containerSelector);
        container.innerHTML = '';
        let sorted = Array.from(values).sort((a, b) => a.localeCompare(b));
        sorted.forEach(v => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.type = 'button';
            btn.dataset.key = key;
            btn.dataset.value = v;
            btn.textContent = v;
            container.appendChild(btn);
        });
    };

    makeChips('[data-filter="cuisine"] .filter-choices', cuisines, 'cuisine');
    makeChips('[data-filter="mealType"] .filter-choices', meals, 'mealType');
    makeChips('[data-filter="difficulty"] .filter-choices', diffs, 'difficulty');
    makeChips('[data-filter="diet"] .filter-choices', diets, 'diet');

    document.querySelectorAll('[data-filter="time"] .chip').forEach(c => c.dataset.key = 'time');
    document.querySelectorAll('[data-filter="nutrition"] .chip').forEach(c => c.dataset.key = 'nutrition');

    document.querySelectorAll('.filter-choices .chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const key = chip.dataset.key;
            const val = chip.dataset.value ?? '';

            if (key === 'time' || key === 'nutrition') {
                selectedFilters[key] = val || '';
                const siblings = chip.parentElement.querySelectorAll('.chip');
                siblings.forEach(s => s.classList.remove('selected'));
                if (val) chip.classList.add('selected');
            } else {
                if (selectedFilters[key].has(val)) {
                    selectedFilters[key].delete(val);
                    chip.classList.remove('selected');
                } else {
                    selectedFilters[key].add(val);
                    chip.classList.add('selected');
                }
            }
            applyFilters();
        });
    });
}

function wireToggles() {
    document.querySelectorAll('.filter-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.filter-block');
            const choices = parent.querySelector('.filter-choices');
            const isShown = choices.classList.toggle('show');
            choices.setAttribute('aria-hidden', String(!isShown));
            btn.querySelector('.caret').textContent = isShown ? '▴' : '▾';
        });
    });
}

clearBtn.addEventListener('click', () => {
    selectedFilters = {
        cuisine: new Set(),
        mealType: new Set(),
        difficulty: new Set(),
        diet: new Set(),
        time: '',
        nutrition: '',
    };
    
    searchInput.value = '';
    document.querySelectorAll('.filter-choices .chip').forEach(c => c.classList.remove('selected'));
    const anyTime = document.querySelector('[data-filter="time"] .chip[data-value=""]');
    if (anyTime) anyTime.classList.add('selected');
    const anyNutrition = document.querySelector('[data-filter="nutrition"] .chip[data-value=""]');
    if (anyNutrition) anyNutrition.classList.add('selected');
    
    applyFilters();
});

searchInput.addEventListener('input', debounce(() => applyFilters(), 180));

grid.addEventListener('click', (e) => {
    const heartBtn = e.target.closest('.heart-btn');
    if (heartBtn && grid.contains(heartBtn)) {
        const card = heartBtn.closest('.recipe-card');
        if (!card) return;
        const id = card.dataset.id;
        if (!id) return;

        if (favoritesSet.has(id)) {
            favoritesSet.delete(id);
        } else {
            favoritesSet.add(id);
        }

        saveFavoritesArray(Array.from(favoritesSet));
        const pressed = favoritesSet.has(id);
        heartBtn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        heartBtn.title = pressed ? 'Remove from favorites' : 'Save to favorites';
        heartBtn.innerHTML = pressed ? filledHeartSvg() : outlineHeartSvg();
        if (pressed) heartBtn.classList.add('favorited'); else heartBtn.classList.remove('favorited');
        document.querySelectorAll(`.recipe-card[data-id="${CSS.escape(id)}"] .heart-btn`).forEach(btn => {
            btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
            btn.title = pressed ? 'Remove from favorites' : 'Save to favorites';
            btn.innerHTML = pressed ? filledHeartSvg() : outlineHeartSvg();
            if (pressed) btn.classList.add('favorited'); else btn.classList.remove('favorited');
        });

        return;
    }

    const rm = e.target.closest('.read-more');
    if (rm) {
        const id = rm.dataset.id;
        window.location.href = `recipe.html?id=${encodeURIComponent(id)}`;
    }
});

window.addEventListener('storage', (ev) => {
    if (ev.key === STORAGE_KEY) {
        favoritesSet = new Set(loadFavoritesArray());
        document.querySelectorAll('.recipe-card').forEach(card => {
            const id = card.dataset.id;
            const btn = card.querySelector('.heart-btn');
            if (!btn) return;
            const pressed = favoritesSet.has(id);
            btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
            btn.title = pressed ? 'Remove from favorites' : 'Save to favorites';
            btn.innerHTML = pressed ? filledHeartSvg() : outlineHeartSvg();
            if (pressed) btn.classList.add('favorited'); else btn.classList.remove('favorited');
        });
    }
});

async function init() {
    readInitialParams();
    try {
        const res = await fetch(RECIPES_JSON, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load recipes.json');
        allRecipes = await res.json();
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div style="grid-column:1/-1;padding:30px;color:var(--muted-text)">Could not load recipes. Check recipes.json in the same folder.</div>`;
        return;
    }

    populateFilters(allRecipes);
    wireToggles();
    applyPreselection();
    if (selectedFilters.time) {
        const tchip = document.querySelector(`[data-filter="time"] .chip[data-value="${CSS.escape(selectedFilters.time)}"]`);
        if (tchip) tchip.classList.add('selected');
    } else {
        const anyt = document.querySelector('[data-filter="time"] .chip[data-value=""]');
        if (anyt) anyt.classList.add('selected');
    }

    if (selectedFilters.nutrition) {
        const nchip = document.querySelector(`[data-filter="nutrition"] .chip[data-value="${CSS.escape(selectedFilters.nutrition)}"]`);
        if (nchip) nchip.classList.add('selected');
    } else {
        const anyn = document.querySelector('[data-filter="nutrition"] .chip[data-value=""]');
        if (anyn) anyn.classList.add('selected');
    }

    ['cuisine', 'mealType', 'difficulty', 'diet'].forEach(k => {
        if (selectedFilters[k]) {
            selectedFilters[k].forEach(val => {
                const btn = document.querySelector(`.filter-choices .chip[data-key="${k}"][data-value="${CSS.escape(val)}"]`);
                if (btn) btn.classList.add('selected');
            });
        }
    });

    applyFilters();
}

if (!window.CSS?.escape) {
    CSS.escape = function (value) {
        return String(value).replace(/[^a-zA-Z0-9\-_]/g, '-');
    };
}

const loadMoreBtn = document.getElementById('load-more');
if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
        itemsToShow += ITEMS_PER_PAGE;
        const pool = lastFilteredList.length ? lastFilteredList : allRecipes;
        renderRecipes(pool);
    });
}

const surpriseBtn = document.getElementById('surprise-btn');
const surpriseModal = document.getElementById('surprise-modal');
const surpriseInner = document.getElementById('surprise-inner');
const surpriseClose = document.getElementById('surprise-close');
const surpriseQuoteEl = document.getElementById('surprise-quote');

const SURPRISE_QUOTES = [
    "Here’s a little culinary adventure — try this one!",
    "Feeling indecisive? This recipe has your name on it.",
    "A tasty surprise! may your next meal be delightful!",
    "Chef’s pick for today: bold, simple, delicious.",
    "Today’s mood: try something new. This one’s a winner."
];

function pickRandomFrom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

function renderSurpriseModal(recipe) {
    if (!recipe) {
        surpriseInner.innerHTML = `<div style="padding:24px;color:var(--muted-text)">No recipe available to surprise you right now.</div>`;
        return;
    }

    const tt = totalTime(recipe);
    const quote = pickRandomFrom(SURPRISE_QUOTES);

    const left = `
      <article class="surprise-card">
        <div class="recipe-image">
          <img src="${recipe.image }" alt="${escapeHtml(recipe.name)}" loading="lazy" />
        </div>
        <div class="recipe-content">
          <div class="recipe-tags">
            ${renderTag('cuisine', recipe.cuisine)}
            ${renderTag('diet', recipe.diet)}
            ${renderTag('mealType', recipe.mealType)}
          </div>
          <h3 class="recipe-title">${escapeHtml(recipe.name)}</h3>
        </div>
      </article>
    `;

    const right = `
      <aside class="surprise-meta" aria-label="Recipe details">
        <div>
          <div class="big-title">${escapeHtml(recipe.name)}</div>
          <div class="meta" style="gap:14px;">
            <div><strong>${tt}</strong> min</div>
            <div class="meta-difficulty" style="display:inline-block">${escapeHtml(recipe.difficulty || '')}</div>
          </div>
        </div>

        <div class="big-desc">${escapeHtml(firstSentence(Array.isArray(recipe.desc) ? recipe.desc : (recipe.desc ? [recipe.desc] : [])))}</div>

        <div style="padding:10px;border-radius:10px;background:rgba(0,0,0,0.03);color:var(--muted-text);font-weight:700;">
          ${escapeHtml(quote)}
        </div>

        <div class="surprise-actions">
          <button class="btn primary" id="surprise-open-full" data-id="${escapeHtml(String(recipe.id))}">Open full recipe</button>
          <button class="btn ghost" id="surprise-try-again">Try another</button>
        </div>
      </aside>
    `;

    surpriseInner.innerHTML = left + right;

    const tryAgain = document.getElementById('surprise-try-again');
    if (tryAgain) {
        tryAgain.addEventListener('click', (e) => {
            const pool = lastFilteredList.length ? lastFilteredList : allRecipes;
            const next = pickRandomFrom(pool);
            renderSurpriseModal(next);
        });
    }

    const openFull = document.getElementById('surprise-open-full');
    if (openFull) {
        openFull.addEventListener('click', (e) => {
            const id = openFull.dataset.id;
            window.location.href = `recipe.html?id=${encodeURIComponent(id)}`;
        });
    }
}

function openSurpriseModalWithRecipe(recipe) {
    renderSurpriseModal(recipe);
    surpriseModal.classList.remove('hidden');
    requestAnimationFrame(() => surpriseModal.classList.add('show'));
    surpriseModal.setAttribute('aria-hidden', 'false');
    if (surpriseQuoteEl) {
        surpriseQuoteEl.textContent = pickRandomFrom(SURPRISE_QUOTES);
        surpriseQuoteEl.style.display = 'block';
        surpriseQuoteEl.setAttribute('aria-hidden', 'false');
    }
    let panel = surpriseModal.querySelector('.surprise-panel');
    if (panel) panel.focus();
}

function closeSurpriseModal() {
    surpriseModal.classList.remove('show');
    surpriseModal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
        surpriseModal.classList.add('hidden');
    }, 300);
}

if (surpriseBtn) {
    surpriseBtn.addEventListener('click', (e) => {
        const pool = lastFilteredList.length ? lastFilteredList : allRecipes;
        if (!pool.length) {
            surpriseQuoteEl.textContent = "No recipes loaded yet. Try loading recipes first.";
            surpriseQuoteEl.style.display = 'block';
            return;
        }
        const chosen = pickRandomFrom(pool);
        openSurpriseModalWithRecipe(chosen);
    });
}

if (surpriseClose) surpriseClose.addEventListener('click', closeSurpriseModal);
if (surpriseModal) {
    surpriseModal.addEventListener('click', (ev) => {
        if (ev.target.classList.contains('surprise-backdrop')) closeSurpriseModal();
    });
    window.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && !surpriseModal.classList.contains('hidden')) closeSurpriseModal();
    });
}

init();