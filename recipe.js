$(function () {
    let recipes = [];
    let currentIndex = 0;
    let DEFAULT_PORTIONS = 4;
    let STORAGE_KEY = "favorites";

    let currentStepIndex = 0;
    let cookingSteps = [];
    let stepTimerInterval = null;
    let stepTimerRemaining = 0;
    let currentStepHasTimer = false;

    let QA_TIMER_KEY = 'qa_timer_screen_awake';
    let QA_RATING_KEY = 'qa_recipe_ratings_';
    let QA_COMMENTS_KEY = 'qa_recipe_comments_';

    let qaTimerInterval = null;
    let qaTimerRemaining = 0;

    function initApp() {
        loadRecipes();
        initEventListeners();
        initCookingMode();
    }

    function loadRecipes() {
        $.getJSON("recipes.json")
            .done(function (data) {
                recipes = data || [];
                if (!recipes.length) {
                    console.error("No recipes.json data");
                    return;
                }
                currentIndex = openRecipeFromQuery();
                renderRecipe(currentIndex);
                updateFavUI();
                setTimeout(restoreChecks, 50);
            })
            .fail(function () {
                console.error("Failed to load recipes.json (serve over HTTP).");
            });
    }

    function initEventListeners() {
        $('#prevBtn').on('click', navigateToPreviousRecipe);
        $('#nextBtn').on('click', navigateToNextRecipe);
        $('#favBtn').on('click', toggleFavorite);

        $('.section-bar').on('click', handleSectionBarClick);

        $('#portionsInput').on('input', handlePortionsChange);

        $('#ingredientsList').on('change', 'input[type=checkbox]', handleIngredientCheck);
        $('#qaTimerDec').on('click', decrementTimer);
        $('#qaTimerInc').on('click', incrementTimer);
        $('#qaTimerStart').on('click', startQATimer);
        $('#keepScreenOn').on('click', keepScreenAwake);
        $('#qaStars').on('click', '.qa-star', handleStarClick)
            .on('mouseenter', '.qa-star', handleStarHover)
            .on('mouseleave', handleStarLeave);

        $('#qaSubmitComment').on('click', submitComment);
        $('#qaClearComment').on('click', clearComment);

        $('#playVideoBtn').on('click', playVideo);
        $('#closeVideoModal').on('click', closeVideoModal);
        $('#videoModal').on('click', function (e) {
            if (e.target === this) closeVideoModal();
        });
        $(window).on('scroll', handleScroll);
        $(window).on('popstate', handlePopState);
        window.addEventListener('storage', handleStorageChange);
    }

    function openRecipeFromQuery() {
        let params = new URLSearchParams(window.location.search);
        let id = params.get('id');
        if (!id) return 0;
        let idx = recipes.findIndex(r => r.id === id);
        return idx >= 0 ? idx : 0;
    }

    function navigateToPreviousRecipe() {
        if (!recipes.length) return;
        currentIndex = Math.max(0, currentIndex - 1);
        updateRecipeDisplay();
    }

    function navigateToNextRecipe() {
        if (!recipes.length) return;
        currentIndex = Math.min(recipes.length - 1, currentIndex + 1);
        updateRecipeDisplay();
    }

    function navigateToRecipe(recipeId) {
        let newUrl = `${window.location.pathname}?id=${recipeId}`;
        window.history.pushState({}, '', newUrl);

        let newIndex = recipes.findIndex(recipe => recipe.id === recipeId);
        if (newIndex !== -1) {
            currentIndex = newIndex;
            updateRecipeDisplay();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function updateRecipeDisplay() {
        renderRecipe(currentIndex);
        updateFavUI();
        restoreChecks();
        refreshQASections();
        renderSuggestions();
    }

    function handlePopState() {
        let params = new URLSearchParams(window.location.search);
        let id = params.get('id');
        if (id) {
            let newIndex = recipes.findIndex(recipe => recipe.id === id);
            if (newIndex !== -1 && newIndex !== currentIndex) {
                currentIndex = newIndex;
                updateRecipeDisplay();
            }
        }
    }

    function renderRecipe(index) {
        let r = recipes[index];
        if (!r) return;

         document.title = `${r.name} - RecipeApp`;

        $('#recipeTitle').text(r.name);
        $('#recipeCuisine').text(`${capitalize(r.cuisine)} • ${capitalize(r.mealType)}`);
        $('#recipeImage').attr('src', r.image);

        r.basePortions = r.basePortions || DEFAULT_PORTIONS;
        $('#portionsInput').val(r.basePortions);

        renderIngredients(r, r.basePortions);
        renderInstructions(r);
        renderNutrition(r);
        renderAboutSection(r);
        renderMealInfo(r);
        renderVideoTutorial(r);

        $('.section-bar').removeClass('active');
        $('.section-bar[data-target="#ingredientsMainBox"]').addClass('active');
        updateFavUI();
        refreshQASections();
        renderSuggestions();
    }

    function renderIngredients(recipe, portions) {
        let ratio = portions / (recipe.basePortions || DEFAULT_PORTIONS);
        let html = (recipe.ingredients || []).map((it, i) => {
            let parsed = parseQuantity(it);
            let display = it;

            if (parsed.number !== null) {
                let scaled = parsed.number * ratio;
                if (parsed.isIntegerUnit) scaled = Math.round(scaled);
                else scaled = Math.round(scaled * 10) / 10;
                display = `${scaled} ${parsed.rest}`.trim();
            } else {
                display = it.toLowerCase().includes('(as desired)') ? it : `${it} (as desired)`;
            }

            return `<label class="ing-item">
                <input type="checkbox" data-idx="${i}">
                <span class="ing-text">
                    <span class="ing-name">${escapeHtml(display)}</span>
                </span>
            </label>`;
        }).join('');

        $('#ingredientsList').html(html);
        restoreChecks();
    }

    function renderInstructions(r) {
        $('#instructionsList').html(
            (r.instructions || []).map((step, idx) =>
                `<li class="step-row">
                    <span class="step-label">Step:</span>
                    <span class="step-num-circle">${idx + 1}</span>
                    <span class="step-text">${escapeHtml(step)}</span>
                </li>`
            ).join('')
        );
    }

    function renderNutrition(r) {
        let nut = r.nutrition || {};
        let entryList = Object.entries(nut);

        let labelMap = {
            calories_kcal: { label: "Calories", color: "energy" },
            energy_kj: { label: "Energy", color: "energy" },
            fat_g: { label: "Fat", color: "fat" },
            protein_g: { label: "Protein", color: "protein" },
            carbs_g: { label: "Carbs", color: "carbs" },
            sugar_g: { label: "Sugar", color: "sugar" },
            salt_g: { label: "Salt", color: "salt" },
            fatsat_g: { label: "Sat. Fat", color: "sat" },
            sat_g: { label: "Sat. Fat", color: "sat" }
        };

        $('#nutritionPills').html(entryList.map(([key, val]) => {
            let { label, color } = labelMap[key] || getLabelAndUnit(key);
            let rounded = (typeof val === "number" && !Number.isInteger(val)) ? val.toFixed(1) : val;
            let unit = guessUnit(key, val);

            return `<div class="np-pill ${color}">
                <div class="np-label-top">${label}</div>
                <div class="np-data">${rounded} ${unit}</div>
            </div>`;
        }).join(''));
    }

    function renderAboutSection(r) {
        let aboutHtml = [
            { svg: svgClock(), label: 'Prep', value: `${r.time?.prep ?? '-'} min` },
            { svg: svgFire(), label: 'Cook', value: `${r.time?.cook ?? '-'} min` },
            { svg: svgUser(), label: 'Portions', value: `${r.basePortions}` },
            { svg: svgGraph(), label: 'Difficulty', value: capitalize(r.difficulty) }
        ].map(a => `<li class="about-item">
            <div class="ai-icon">${a.svg}</div>
            <div>
                <div class="ab-label">${a.label}</div>
                <div class="ab-val">${a.value}</div>
            </div>
        </li>`).join('');

        $('#aboutList').html(aboutHtml);
        $('#portionsNote').text(`Diet: ${capitalize(r.diet)} • Video available`);
    }

    function renderMealInfo(recipe) {
        let info = [
            { label: "Meal Type", value: capitalize(recipe.mealType || "-") },
            { label: "Diet", value: capitalize(recipe.diet || "-") },
            { label: "Cuisine", value: capitalize(recipe.cuisine || "-") }
        ];

        $('#mealInfoList').html(info.map(i => `
            <li class="meal-info-item">
                <span class="meal-info-label">${i.label}:</span>
                <span class="meal-info-value">${i.value}</span>
            </li>
        `).join(''));
    }

    function renderVideoTutorial(recipe) {
        let imageSrc = recipe.image || "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg";
        $("#videoPreviewImg").attr("src", imageSrc);

        let videoEmbedSrc = "";
        if (recipe.videoUrl) {
            let match = recipe.videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (match && match[1]) {
                videoEmbedSrc = `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
            } else {
                videoEmbedSrc = recipe.videoUrl;
            }
        }

        $("#playVideoBtn").off("click").on("click", function () {
            if (videoEmbedSrc) {
                $("#videoIframe").attr("src", videoEmbedSrc);
                $("#videoModal").addClass("active");
                $("body").css("overflow", "hidden");
            } else {
                alert("No video available for this recipe.");
            }
        });
    }

    function loadFavoritesFromStorage() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }

    function saveFavoritesToStorage(ids) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }

    function toggleFavorite() {
        if (!recipes[currentIndex]) return;
        let id = recipes[currentIndex].id;
        let favoriteIds = loadFavoritesFromStorage();
        let pos = favoriteIds.indexOf(id);

        if (pos === -1) {
            favoriteIds.push(id);
            $('#favBtn .heart').text('♥');
            $('#favBtn .fav-label').text('Remove from favorites');
            $('#favBtn').attr('aria-pressed', 'true');
        } else {
            favoriteIds.splice(pos, 1);
            $('#favBtn .heart').text('♡');
            $('#favBtn .fav-label').text('Add to favorites');
            $('#favBtn').attr('aria-pressed', 'false');
        }
        saveFavoritesToStorage(favoriteIds);
    }

    function updateFavUI() {
        if (!recipes[currentIndex]) return;
        let id = recipes[currentIndex].id;
        let favoriteIds = loadFavoritesFromStorage();

        if (favoriteIds.includes(id)) {
            $('#favBtn .heart').text('♥');
            $('#favBtn .fav-label').text('Remove from favorites');
            $('#favBtn').attr('aria-pressed', 'true');
        } else {
            $('#favBtn .heart').text('♡');
            $('#favBtn .fav-label').text('Add to favorites');
            $('#favBtn').attr('aria-pressed', 'false');
        }
    }

    function handleStorageChange(e) {
        if (e.key === STORAGE_KEY) updateFavUI();
    }
    function handleSectionBarClick() {
        let target = $(this).data('target');
        let y = $(target).offset().top - 18;
        $('html,body').animate({ scrollTop: y }, 500);
        $('.section-bar').removeClass('active');
        $(this).addClass('active');
    }

    function handlePortionsChange() {
        let v = parseInt($(this).val(), 10);
        if (isNaN(v) || v < 1) {
            v = 1;
            $(this).val(v);
        }
        renderIngredients(recipes[currentIndex], v);
        $('#aboutList .ab-val').each(function () {
            if ($(this).closest('div').find('.ab-label').text().trim() === 'Portions') {
                $(this).text(v);
            }
        });
    }
    function handleIngredientCheck() {
        let idx = $(this).data('idx');
        let key = 'checked_' + recipes[currentIndex].id;
        let stored = JSON.parse(sessionStorage.getItem(key) || '[]');

        if (this.checked) {
            stored.push(idx);
        } else {
            let pos = stored.indexOf(idx);
            if (pos !== -1) stored.splice(pos, 1);
        }
        sessionStorage.setItem(key, JSON.stringify(stored));
    }

    function restoreChecks() {
        if (!recipes[currentIndex]) return;
        let key = 'checked_' + recipes[currentIndex].id;
        let stored = JSON.parse(sessionStorage.getItem(key) || '[]');
        $('#ingredientsList input[type=checkbox]').each(function () {
            let idx = $(this).data('idx');
            $(this).prop('checked', stored.includes(idx));
        });
    }

    function refreshQASections() {
        renderRatingForCurrent();
        renderCommentsForCurrent();
        $('#qaCommentUser').val('');
        $('#qaCommentInput').val('');
        $('#qaTimerCountdown').hide();
        if (qaTimerInterval) {
            clearInterval(qaTimerInterval);
            qaTimerInterval = null;
        }
    }

    function decrementTimer() {
        let v = parseInt($('#qaTimerInput').val(), 10) || 1;
        v = Math.max(1, v - 1);
        $('#qaTimerInput').val(v);
    }

    function incrementTimer() {
        let v = parseInt($('#qaTimerInput').val(), 10) || 1;
        v = Math.min(999, v + 1);
        $('#qaTimerInput').val(v);
    }

    function startQATimer() {
        if (qaTimerInterval) {
            clearInterval(qaTimerInterval);
        }

        let v = parseInt($('#qaTimerInput').val(), 10) || 1;
        qaTimerRemaining = v * 60;
        $('#qaTimerCountdown').show();
        updateQATimerCountdown();

        qaTimerInterval = setInterval(function () {
            qaTimerRemaining--;
            updateQATimerCountdown();

            if (qaTimerRemaining <= 0) {
                clearInterval(qaTimerInterval);
                $('#qaTimerCountdown').text('Time\'s up!').addClass('expire');
                if (window.navigator.vibrate) {
                    window.navigator.vibrate([400, 150, 400]);
                }
                let audio = document.getElementById('qaTimerSound');
                if (audio) {
                    audio.currentTime = 0;
                    audio.play();
                }
            }
        }, 1000);
    }

    function updateQATimerCountdown() {
        let m = Math.floor(qaTimerRemaining / 60);
        let s = qaTimerRemaining % 60;
        let str = m + ':' + (s < 10 ? '0' : '') + s + ' left';
        $('#qaTimerCountdown').text(str).removeClass('expire');
        if (qaTimerRemaining <= 0) {
            $('#qaTimerCountdown').text('Time\'s up!').addClass('expire');
        }
    }

    function keepScreenAwake() {
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen');
            $(this).text('Screen will stay awake').prop('disabled', true);
            localStorage.setItem(QA_TIMER_KEY, '1');
        } else {
            alert('Keep awake is not supported in this browser.');
        }
    }

    function renderRatingForCurrent() {
        let rId = recipes?.[currentIndex]?.id;
        if (!rId) return;

        let ratingKey = QA_RATING_KEY + rId;
        let rate = JSON.parse(localStorage.getItem(ratingKey) || 'null');
        $('#qaStars').html('');

        for (let i = 1; i <= 5; i++) {
            let star = $(`<span class="qa-star" data-val="${i}">&#9733;</span>`);
            if (rate?.rating >= i) star.addClass('selected');
            $('#qaStars').append(star);
        }

        $("#qaRatingSummary").text(rate ? `You: ${rate.rating} / 5` : "No ratings yet");
    }

    function handleStarClick() {
        let v = parseInt($(this).attr('data-val'));
        let rId = recipes?.[currentIndex]?.id;
        if (!rId) return;

        localStorage.setItem(QA_RATING_KEY + rId,
            JSON.stringify({ rating: v, user: 'You', ts: Date.now() }));
        renderRatingForCurrent();
    }

    function handleStarHover() {
        let v = parseInt($(this).attr('data-val'));
        $('.qa-star').each(function (i) {
            $(this).toggleClass('selected', i < v);
        });
    }

    function handleStarLeave() {
        renderRatingForCurrent();
    }

    function renderCommentsForCurrent() {
        let rId = recipes?.[currentIndex]?.id;
        if (!rId) return;

        let commentsKey = QA_COMMENTS_KEY + rId;
        let arr = JSON.parse(localStorage.getItem(commentsKey) || '[]');

        $('#qaCommentsList').html(
            !arr.length
                ? `<div class="qa-comments-none">No comments yet — be the first.</div>`
                : arr.map(c => `
                    <div class="qa-comment-entry">
                        <div class="qa-comment-meta">
                            <span class="qa-comment-user">${escapeHtml(c.name)}</span>
                            <span>${(new Date(c.ts)).toLocaleString()}</span>
                        </div>
                        <div>${escapeHtml(c.text)}</div>
                    </div>
                `).join('')
        );
    }

    function submitComment() {
        let name = $('#qaCommentUser').val().trim() || "You";
        let text = $('#qaCommentInput').val().trim();

        if (!text) {
            alert('Enter your comment!');
            return;
        }

        let rId = recipes?.[currentIndex]?.id;
        if (!rId) return;

        let commentsKey = QA_COMMENTS_KEY + rId;
        let arr = JSON.parse(localStorage.getItem(commentsKey) || '[]');
        arr.push({ name, text, ts: Date.now() });

        localStorage.setItem(commentsKey, JSON.stringify(arr));
        $('#qaCommentInput').val('');
        renderCommentsForCurrent();
    }

    function clearComment() {
        $('#qaCommentInput').val('');
    }

    function initCookingMode() {
        $('#startCookingMode').on('click', startCookingMode);
        $('#prevStepBtn').on('click', goToPreviousStep);
        $('#nextStepBtn').on('click', goToNextStep);
        $('#finishCookingBtn').on('click', finishCookingMode);
        $('#closeCookingMode').on('click', finishCookingMode);
        $('#stepTimerControl').on('click', toggleStepTimer);

        $(document).on('keyup', function (e) {
            if (e.key === 'Escape' && $('#cookingModeOverlay').hasClass('active')) {
                finishCookingMode();
            }
        });
    }

    function startCookingMode() {
        let recipe = recipes[currentIndex];
        if (!recipe || !recipe.instructions || recipe.instructions.length === 0) {
            alert('No instructions available for this recipe.');
            return;
        }

        cookingSteps = recipe.instructions;
        currentStepIndex = 0;

        $('#cookingModeRecipeTitle').text(`Cooking: ${recipe.name}`);
        updateCookingStepDisplay();

        $('#cookingModeOverlay').addClass('active');
        $('body').css('overflow', 'hidden');
        resetStepTimer();
    }

    function updateCookingStepDisplay() {
        if (cookingSteps.length === 0) return;

        let currentStep = cookingSteps[currentStepIndex];
        let totalSteps = cookingSteps.length;

        let progress = ((currentStepIndex + 1) / totalSteps) * 100;
        $('#cookingProgressFill').css('width', `${progress}%`);
        $('#cookingProgressText').text(`Step ${currentStepIndex + 1} of ${totalSteps}`);

        $('#cookingStepNumber').text(`Step ${currentStepIndex + 1}`);
        $('#cookingStepInstruction').text(currentStep);

        checkStepForTimer(currentStep);

        $('#prevStepBtn').prop('disabled', currentStepIndex === 0);

        if (currentStepIndex === totalSteps - 1) {
            $('#nextStepBtn').hide();
            $('#finishCookingBtn').show();
        } else {
            $('#nextStepBtn').show();
            $('#finishCookingBtn').hide();
        }
    }

    function checkStepForTimer(stepText) {
        currentStepHasTimer = false;
        $('#cookingStepTimer').hide();

        let timePatterns = [
            /(\d+)\s*min(?:ute)?s?/gi,
            /(\d+)\s*hr(?:s)?/gi,
            /(\d+)\s*second?s?/gi,
            /for\s*(\d+)\s*min/gi,
            /(\d+)-(\d+)\s*min/gi
        ];

        let foundTime = null;
        for (let pattern of timePatterns) {
            let matches = stepText.match(pattern);
            if (matches) {
                let numberMatch = matches[0].match(/\d+/);
                if (numberMatch) {
                    foundTime = parseInt(numberMatch[0]);
                    break;
                }
            }
        }

        if (foundTime) {
            currentStepHasTimer = true;
            stepTimerRemaining = foundTime * 60;
            $('#cookingStepTimer').show();
            updateStepTimerDisplay();
            $('#stepTimerControl').text('Start Timer');
        }
    }

    function toggleStepTimer() {
        if (stepTimerInterval) {
            pauseStepTimer();
        } else {
            startStepTimer();
        }
    }

    function startStepTimer() {
        if (stepTimerInterval) clearInterval(stepTimerInterval);

        stepTimerInterval = setInterval(function () {
            stepTimerRemaining--;
            updateStepTimerDisplay();

            if (stepTimerRemaining <= 0) {
                clearInterval(stepTimerInterval);
                stepTimerInterval = null;
                $('#stepTimerControl').text('Time\'s Up!');

                let audio = document.getElementById('qaTimerSound');
                if (audio) {
                    audio.currentTime = 0;
                    audio.play().catch(e => console.log('Audio play failed:', e));
                }

                $('#stepTimerDisplay').addClass('timer-expired');
                setTimeout(() => {
                    $('#stepTimerDisplay').removeClass('timer-expired');
                }, 500);
            }
        }, 1000);

        $('#stepTimerControl').text('Pause Timer');
    }

    function pauseStepTimer() {
        if (stepTimerInterval) {
            clearInterval(stepTimerInterval);
            stepTimerInterval = null;
            $('#stepTimerControl').text('Resume Timer');
        }
    }

    function resetStepTimer() {
        if (stepTimerInterval) {
            clearInterval(stepTimerInterval);
            stepTimerInterval = null;
        }
        stepTimerRemaining = 0;
        $('#stepTimerControl').text('Start Timer');
        $('#cookingStepTimer').hide();
    }

    function updateStepTimerDisplay() {
        let minutes = Math.floor(stepTimerRemaining / 60);
        let seconds = stepTimerRemaining % 60;
        $('#stepTimerDisplay').text(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }

    function goToPreviousStep() {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            updateCookingStepDisplay();
            resetStepTimer();
        }
    }

    function goToNextStep() {
        if (currentStepIndex < cookingSteps.length - 1) {
            currentStepIndex++;
            updateCookingStepDisplay();
            resetStepTimer();
        }
    }

    function finishCookingMode() {
        $('#cookingModeOverlay').removeClass('active');
        $('body').css('overflow', '');
        resetStepTimer();
        currentStepIndex = 0;
    }

    function renderSuggestions() {
        if (!recipes.length) return;

        let currentRecipe = recipes[currentIndex];
        let suggestions = getRelatedRecipes(currentRecipe);

        if (suggestions.length === 0) return;

        let suggestionsHTML = suggestions.map(recipe => createSuggestionCard(recipe)).join('');
        $('#suggestionsList').html(suggestionsHTML);

        $('.suggestion-card').off('click').on('click', function () {
            let recipeId = $(this).data('id');
            navigateToRecipe(recipeId);
        });
    }

    function getRelatedRecipes(currentRecipe) {
        let otherRecipes = recipes.filter(recipe => recipe.id !== currentRecipe.id);
        if (otherRecipes.length === 0) return [];

        let sameCuisine = otherRecipes.filter(recipe => recipe.cuisine === currentRecipe.cuisine);
        let sameMealType = otherRecipes.filter(recipe =>
            recipe.mealType === currentRecipe.mealType && !sameCuisine.includes(recipe)
        );
        let sameDifficulty = otherRecipes.filter(recipe =>
            recipe.difficulty === currentRecipe.difficulty &&
            !sameCuisine.includes(recipe) &&
            !sameMealType.includes(recipe)
        );

        let relatedRecipes = [...sameCuisine, ...sameMealType, ...sameDifficulty];
        let uniqueRecipes = [];
        let seenIds = new Set();

        for (let recipe of relatedRecipes) {
            if (!seenIds.has(recipe.id)) {
                seenIds.add(recipe.id);
                uniqueRecipes.push(recipe);
            }
        }

        if (uniqueRecipes.length < 3) {
            let remainingRecipes = otherRecipes.filter(recipe => !seenIds.has(recipe.id));
            let randomRecipes = getRandomRecipes(remainingRecipes, 3 - uniqueRecipes.length);
            uniqueRecipes.push(...randomRecipes);
        }

        return uniqueRecipes.slice(0, 3);
    }

    function getRandomRecipes(recipesArray, count) {
        let shuffled = [...recipesArray].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function createSuggestionCard(recipe) {
        let totalTime = (recipe.time?.prep || 0) + (recipe.time?.cook || 0);
        let difficultyClass = `difficulty-${recipe.difficulty || 'easy'}`;

        return `<div class="suggestion-card" data-id="${recipe.id}">
            <div class="suggestion-card-image">
                <img src="${recipe.image}" alt="${recipe.name}" loading="lazy">
            </div>
            <div class="suggestion-card-content">
                <h3 class="suggestion-card-title">${recipe.name}</h3>
                <div class="suggestion-card-meta">
                    <span class="suggestion-card-difficulty ${difficultyClass}">${recipe.difficulty || 'Easy'}</span>
                    <span>•</span>
                    <span>${capitalize(recipe.mealType || '')}</span>
                </div>
                <p class="suggestion-card-time">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${totalTime} min
                </p>
                <div class="suggestion-card-footer">
                    <span class="suggestion-card-cuisine">${capitalize(recipe.cuisine || '')}</span>
                    <button class="suggestion-card-button">View Recipe</button>
                </div>
            </div>
        </div>`;
    }
    function parseQuantity(str) {
        let m = str.trim().match(/^(\d+(?:\.\d+)?)(?:\s*)(.*)$/);
        if (!m) return { number: null, rest: str, isIntegerUnit: false };

        let num = parseFloat(m[1]);
        let rest = (m[2] || '').trim();
        let intUnits = ['egg', 'eggs', 'clove', 'cloves', 'slice', 'slices'];
        let firstWord = rest.split(/\s+/)[0]?.toLowerCase() || '';
        let isIntegerUnit = intUnits.includes(firstWord) || (Number.isInteger(num) && num <= 20);

        return { number: num, rest: rest, isIntegerUnit: isIntegerUnit };
    }

    function getLabelAndUnit(key) {
        let label = key.replace(/_/g, " ").replace(/\bg\b/i, "g").replace(/\bkcal\b/i, "kcal");
        label = label.replace(/\b([a-z])([A-Z])/g, (_, a, b) => a + ' ' + b).replace(/\b\w/g, t => t.toUpperCase());
        let defaultColors = ["energy", "protein", "fat", "carbs", "sugar", "salt", "sat"];
        let color = defaultColors.find(c => key.toLowerCase().includes(c)) || "";
        return { label: label.charAt(0).toUpperCase() + label.slice(1), color };
    }

    function guessUnit(key, val) {
        if (/_g$|g$/.test(key)) return "g";
        if (/kcal$|cal$/.test(key)) return "kcal";
        if (/kj$/.test(key)) return "kj";
        if (typeof val === "string" && /\d+\s*(g|kcal|kj)/.test(val)) return val.match(/(g|kcal|kj)/)[1];
        return "";
    }

    function capitalize(s) {
        return (s || '').toString().charAt(0).toUpperCase() + (s || '').toString().slice(1);
    }

    function escapeHtml(s) {
        return $('<div>').text(s).html();
    }

    function svgClock() {
        return `<img src="https://cdn-icons-png.flaticon.com/128/2838/2838794.png" alt="Preparation time" width="28" height="28" style="vertical-align:middle;">`;
    }

    function svgFire() {
        return `<img src="https://cdn-icons-png.flaticon.com/128/3448/3448167.png" alt="Cooking time" width="28" height="28" style="vertical-align:middle;">`;
    }

    function svgUser() {
        return `<img src="https://cdn-icons-png.flaticon.com/128/9003/9003216.png" alt="Portions" width="28" height="28" style="vertical-align:middle;">`;
    }

    function svgGraph() {
        return `<img src="https://cdn-icons-png.flaticon.com/128/1256/1256936.png" alt="Difficulty" width="28" height="28" style="vertical-align:middle;">`;
    }

    function handleScroll() {
        let sc = $(this).scrollTop();
        let t = Math.min(80, sc * 0.18);
        $('.circle-frame').css('transform', `translateY(${-t}px)`);
        $('.circle-bg').css('transform', `translateY(${-t / 1.6}px)`);
        $('.hero-inner').css('opacity', Math.max(0.48, 1 - sc / 900));
    }

    function playVideo() {

    }

    function closeVideoModal() {
        $("#videoModal").removeClass("active");
        $("#videoIframe").attr("src", "");
        $("body").css("overflow", "");
    }

    initApp();
});