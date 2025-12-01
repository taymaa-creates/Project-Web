
(function () {
    let RECIPES_JSON = '../data/recipes.json';
    let fallbackImage = 'https://via.placeholder.com/300?text=Recipe';
    let CATEGORY_TYPES = [
        { key: 'diet', title: 'Diet' },
        { key: 'mealType', title: 'Meal Type' },
        { key: 'cuisine', title: 'Cuisine' }
    ];

    function makeSection(title) {
        let tpl = document.getElementById('section-template');
        let clone = tpl.content.cloneNode(true);
        clone.querySelector('.section-name').textContent = title;
        return clone;
    }

    function makeCard(label, count, imgSrc) {
        let tpl = document.getElementById('card-template');
        let clone = tpl.content.cloneNode(true);
        let btn = clone.querySelector('.cat-card');
        clone.querySelector('.cat-label').textContent = label;
        clone.querySelector('.cat-count').textContent = `${count} recipe${count !== 1 ? 's' : ''}`;
        clone.querySelector('img').src = imgSrc || fallbackImage;
        clone.querySelector('img').alt = `${label} category`;
        btn.dataset.value = label;
        return { node: clone, button: btn };
    }

    async function init() {
        let data;
        try {
            let res = await fetch(RECIPES_JSON);
            if (!res.ok) throw new Error('Failed to fetch recipes.json');
            data = await res.json();
        } catch (err) {
            console.error(err);
            document.getElementById('categoriesWrap').innerHTML =
                '<p style="text-align:center;color:gray;">Failed to load recipes.</p>';
            return;
        }

        let recipes = Array.isArray(data) ? data : data.recipes || [];
        if (!recipes.length) return;

        let wrap = document.getElementById('categoriesWrap');

        CATEGORY_TYPES.forEach(ct => {
            let map = new Map();
            recipes.forEach(r => {
                let val = r[ct.key];
                if (!val) return;
                let values = String(val).split(',').map(v => v.trim());
                values.forEach(v => {
                    if (!map.has(v)) map.set(v, []);
                    map.get(v).push(r);
                });
            });

            if (map.size === 0) return;

            let section = makeSection(ct.title);
            let grid = section.querySelector('.cards-grid');
            let footer = section.querySelector('.section-footer');

            let entries = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);

            entries.forEach(([val, list]) => {
                let images = list.map(r => r.image).filter(Boolean);
                let img = images.length ? images[Math.floor(Math.random() * images.length)] : fallbackImage;
                let label = val.charAt(0).toUpperCase() + val.slice(1);
                let { node, button } = makeCard(label, list.length, img);
                button.addEventListener('click', () => {
                    let type = encodeURIComponent(ct.key);
                    let value = encodeURIComponent(val);
                    window.location.href = `recipes.html?categoryType=${type}&categoryValue=${value}`;
                });
                grid.appendChild(node);
            });

            footer.textContent = `Showing ${entries.length} ${ct.title.toLowerCase()} categories.`;
            wrap.appendChild(section);
        });
    }

    init();
})();


