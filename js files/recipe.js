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

    let QA_RATING_KEY = 'qa_recipe_ratings_';
    let QA_COMMENTS_KEY = 'qa_recipe_comments_';

    let qaTimerInterval = null;
    let qaTimerRemaining = 0;

    function showToast(message, type = 'info', duration = 3000) {
        $('.toast-notification').remove();

        let icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: '💡'
        };

        let toast = $(`
        <div class="toast-notification toast-${type}">
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        </div>
    `);

        $('body').append(toast);

        setTimeout(() => {
            toast.addClass('show');
        }, 10);

        let removeToast = () => {
            toast.removeClass('show');
            setTimeout(() => toast.remove(), 400);
        };

        toast.find('.toast-close').on('click', removeToast);

        if (duration > 0) {
            setTimeout(removeToast, duration);
        }
    }

    let toastCSS = `
.toast-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 0;
    max-width: 350px;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    border-left: 4px solid #6c757d;
}
.toast-notification.show {
    transform: translateX(0);
}
.toast-success {
    border-left-color: #28a745;
}
.toast-error {
    border-left-color: #dc3545;
}
.toast-warning {
    border-left-color: #ffc107;
}
.toast-info {
    border-left-color: #17a2b8;
}
.toast-content {
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.toast-message {
    flex: 1;
    margin-right: 12px;
    font-weight: 500;
    color: #333;
}
.toast-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #6c757d;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.toast-close:hover {
    color: #333;
    background: #f8f9fa;
    border-radius: 50%;
}
`;

    $('head').append(`<style>${toastCSS}</style>`);

    function playTimerSound() {
        try {
            let audioContext = new (window.AudioContext || window.webkitAudioContext)();
            let oscillator = audioContext.createOscillator();
            let gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
            oscillator.stop(audioContext.currentTime + 1);
        } catch (error) {
            console.log('Web Audio not supported');
        }
    }

    function initApp() {
        loadRecipes();
        initEventListeners();
        initCookingMode();
        initExportFunctionality();
    }

    function loadRecipes() {
        $.getJSON("../data/recipes.json")
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
                console.error("Failed to load recipes.json");
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
        $('#keepScreenOn').on('click', toggleScreenWake);
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

        $('#exportPDF, #exportJSON').on('click', showExportModal);
        $('#closeExportModal, #cancelExport').on('click', closeExportModal);
        $('#confirmExport').on('click', performExport);

        $('.export-option').on('click', function () {
            $('.export-option').removeClass('selected');
            $(this).addClass('selected');
            $(this).find('input[type="radio"]').prop('checked', true);
        });

        $(document).on('keyup', function (e) {
            if (e.key === 'Escape' && $('#exportModal').hasClass('active')) {
                closeExportModal();
            }
        });
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
        addIngredientSearch();
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
                showToast('⏰ Timer finished!', 'success', 5000);
                playTimerSound();
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

    let wakeLock = null;

    function toggleScreenWake() {
        if (wakeLock) {
            releaseWakeLock();
        } else {
            requestWakeLock();
        }
    }

    async function requestWakeLock() {
        if (!('wakeLock' in navigator)) {
            showToast('❌ Screen wake lock not supported in this browser', 'warning', 4000);
            return;
        }

        try {
            wakeLock = await navigator.wakeLock.request('screen');

            $('#keepScreenOn')
                .html('<i class="fas fa-eye-slash" style="margin-right: 8px;"></i>Disable screen wake')
                .removeClass('inactive')
                .addClass('active');

            showToast('🔆 Screen will stay awake', 'success', 3000);

            wakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock was released');
                resetWakeLockButton();
            });

        } catch (err) {
            console.error(`Failed to acquire wake lock: ${err.message}`);
            showToast('❌ Could not keep screen awake', 'error', 4000);
            resetWakeLockButton();
        }
    }

    function releaseWakeLock() {
        if (wakeLock !== null) {
            wakeLock.release()
                .then(() => {
                    wakeLock = null;
                    console.log('Screen Wake Lock released');
                    showToast('💤 Screen sleep enabled', 'info', 3000);
                })
                .catch(err => {
                    console.error('Error releasing wake lock:', err);
                });
        }

        resetWakeLockButton();
    }

    function resetWakeLockButton() {
        $('#keepScreenOn')
            .html('<i class="fas fa-eye" style="margin-right: 8px;"></i>Keep screen awake')
            .removeClass('active')
            .addClass('inactive');
    }

    document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });

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
        showToast('⭐ Thank you for your rating!', 'success', 3000);
    }

    function handleStarHover() {
        let v = parseInt($(this).attr('data-val'));
        $('.qa-star').each(function (i) {
            let starVal = parseInt($(this).attr('data-val'));
            $(this).toggleClass('hover', starVal <= v);
        });
    }

    function handleStarLeave() {
        $('.qa-star').removeClass('hover');
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
        let name = $('#qaCommentUser').val().trim() || "Anonymous";
        let text = $('#qaCommentInput').val().trim();

        if (!text) {
            showToast('✏️ Please enter your comment!', 'warning', 3000);
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
        showToast('💬 Thank you for your comment!', 'success', 3000);
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

                showToast('⏰ Step timer finished!', 'success', 5000);
                playTimerSound();

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
        releaseWakeLock();
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

    function addIngredientSearch() {
        $('#ingredientSearch').remove();

        $('#ingredientsMainBox').prepend(`
        <input type="text" id="ingredientSearch" placeholder="🔍 Search ingredients..." 
               style="width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
    `);
        $('#ingredientSearch').on('input', function () {
            let searchTerm = $(this).val().toLowerCase().trim();

            if (searchTerm === '') {
                $('.ing-item').show();
            } else {
                $('.ing-item').each(function () {
                    let text = $(this).text().toLowerCase();
                    $(this).toggle(text.includes(searchTerm));
                });
            }
        });
    }
    function initExportFunctionality() {
        $('#exportPDF, #exportJSON').on('click', showExportModal);
        $('#closeExportModal, #cancelExport').on('click', closeExportModal);
        $('#confirmExport').on('click', performExport);

        $('.export-option').on('click', function () {
            $('.export-option').removeClass('selected');
            $(this).addClass('selected');
            $(this).find('input[type="radio"]').prop('checked', true);
        });
    }

    function showExportModal() {
        $('#exportModal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function closeExportModal() {
        $('#exportModal').removeClass('active');
        $('body').css('overflow', '');
    }

    function performExport() {
        let format = $('input[name="exportFormat"]:checked').val();
        let recipe = recipes[currentIndex];

        if (!recipe) {
            showToast('❌ No recipe data available', 'error', 3000);
            return;
        }

        if (format === 'pdf') {
            exportToPDF(recipe);
        } else {
            exportToJSON(recipe);
        }

        closeExportModal();
        showToast(`✅ Recipe exported as ${format.toUpperCase()}`, 'success', 3000);
    }

    function exportToPDF(recipe) {
        let printWindow = window.open('', '_blank');
        let portions = parseInt($('#portionsInput').val()) || recipe.basePortions || 4;
        let ratio = portions / (recipe.basePortions || 4);
        let scaledIngredients = (recipe.ingredients || []).map(it => {
            let parsed = parseQuantity(it);
            if (parsed.number !== null) {
                let scaled = parsed.number * ratio;
                if (parsed.isIntegerUnit) scaled = Math.round(scaled);
                else scaled = Math.round(scaled * 10) / 10;
                return `${scaled} ${parsed.rest}`.trim();
            }
            return it;
        });

        let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${recipe.name} - Recipe</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 40px 20px; 
                    color: #333;
                    line-height: 1.6;
                }
                .recipe-header { 
                    text-align: center; 
                    margin-bottom: 40px;
                    border-bottom: 2px solid #6f8f74;
                    padding-bottom: 20px;
                }
                .recipe-title { 
                    color: #6f8f74; 
                    font-size: 2.5em; 
                    margin: 0 0 10px 0;
                    font-family: 'Playfair Display', serif;
                }
                .recipe-meta { 
                    color: #666; 
                    font-size: 1.1em;
                    margin-bottom: 20px;
                }
                .recipe-image {
                    max-width: 150px;
                    height: 150px;
                    border-radius: 50%;
                    margin: 20px auto;
                    display: block;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                }
                .section { 
                    margin: 30px 0; 
                    page-break-inside: avoid;
                }
                .section-title { 
                    color: #6f8f74; 
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 8px;
                    font-family: 'Playfair Display', serif;
                    font-size: 1.5em;
                }
                .ingredients-list, .instructions-list { 
                    margin: 15px 0; 
                    padding-left: 20px;
                }
                .ingredient-item, .instruction-item { 
                    margin: 8px 0; 
                }
                .nutrition-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    margin: 15px 0;
                }
                .nutrition-item {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                }
                .nutrition-value {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #6f8f74;
                }
                .nutrition-label {
                    font-size: 0.9em;
                    color: #666;
                    margin-top: 5px;
                }
                .recipe-footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    text-align: center;
                    color: #666;
                    font-size: 0.9em;
                }
                @media print {
                    body { padding: 20px; }
                    .recipe-header { margin-bottom: 30px; }
                    .section { margin: 25px 0; }
                }
            </style>
        </head>
        <body>
            <div class="recipe-header">
                <h1 class="recipe-title">${recipe.name}</h1>
                <div class="recipe-meta">
                    ${recipe.cuisine} • ${recipe.mealType} • ${recipe.difficulty} • Serves ${portions}
                </div>
                ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" class="recipe-image" onerror="this.style.display='none'">` : ''}
            </div>
            
            <div class="section">
                <h2 class="section-title">Ingredients</h2>
                <ul class="ingredients-list">
                    ${scaledIngredients.map(ing => `<li class="ingredient-item">${ing}</li>`).join('')}
                </ul>
            </div>
            
            <div class="section">
                <h2 class="section-title">Instructions</h2>
                <ol class="instructions-list">
                    ${(recipe.instructions || []).map((step, index) =>
            `<li class="instruction-item">${step}</li>`
        ).join('')}
                </ol>
            </div>
            
            ${recipe.nutrition ? `
            <div class="section">
                <h2 class="section-title">Nutritional Information</h2>
                <div class="nutrition-grid">
                    ${Object.entries(recipe.nutrition).map(([key, value]) => {
            let labelMap = {
                calories_kcal: "Calories",
                energy_kj: "Energy",
                fat_g: "Fat",
                protein_g: "Protein",
                carbs_g: "Carbs",
                sugar_g: "Sugar",
                salt_g: "Salt",
                fatsat_g: "Sat. Fat",
                sat_g: "Sat. Fat"
            };
            let label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let unit = key.includes('_g') ? 'g' : key.includes('kcal') ? 'kcal' : key.includes('kj') ? 'kJ' : '';
            return `
                            <div class="nutrition-item">
                                <div class="nutrition-value">${value}${unit}</div>
                                <div class="nutrition-label">${label}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="recipe-footer">
                <p>Exported from ctrl+alt+eat on ${new Date().toLocaleDateString()}</p>
                <p>Visit our website for more delicious recipes!</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    }

    function exportToJSON(recipe) {
        let exportData = {
            exportedAt: new Date().toISOString(),
            source: "ctrl+alt+eat",
            recipe: {
                ...recipe,
                currentPortions: parseInt($('#portionsInput').val()) || recipe.basePortions || 4
            }
        };

        let blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `${recipe.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_recipe.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    initApp();
});