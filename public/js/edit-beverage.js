document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'add';
    const targetId = urlParams.get('id');

    const pageTitle = document.getElementById("pageTitle");
    const actionButtons = document.getElementById("actionButtons");
    const form = document.getElementById("beverageForm");
    const restrictionsContainer = document.getElementById('restrictionsContainer');

    // Fetch and render restrictions globally
    await fetch('/api/restrictions', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data.restrictions) {
                restrictionsContainer.innerHTML = '';
                data.data.restrictions.forEach(r => {
                    restrictionsContainer.innerHTML += `
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" name="beverage_restrictions[]" value="${r.id}" data-name="${r.name.toLowerCase()}" style="width: 18px; height: 18px; accent-color: var(--washed-red);">
                            ${r.name}
                        </label>
                    `;
                });
            }
        });

    // Image Preview Logic
    const bevImageInput = document.getElementById("bevImage");
    const imagePreview = document.getElementById("image-preview");
    const imagePlaceholder = document.getElementById("imagePlaceholder");

    function updateImagePreview() {
        const url = bevImageInput.value.trim();
        if (url) {
            imagePreview.src = url;
            imagePreview.classList.add('hidden');
            imagePlaceholder.classList.remove('hidden');
            imagePlaceholder.innerHTML = '<span class="placeholder-text">⏳ Fetching image...</span>';
        } else {
            imagePreview.removeAttribute('src');
            imagePreview.classList.add('hidden');
            imagePlaceholder.classList.remove('hidden');
            imagePlaceholder.innerHTML = '<span class="placeholder-text">🫙 No images left in stock!</span>';
        }
    }

    imagePreview.addEventListener('load', () => {
        imagePreview.classList.remove('hidden');
        imagePlaceholder.classList.add('hidden');
    });

    imagePreview.addEventListener('error', () => {
        if (bevImageInput.value.trim() !== "") {
            imagePreview.classList.add('hidden');
            imagePlaceholder.classList.remove('hidden');
            imagePlaceholder.innerHTML = '<span class="placeholder-text">🪣 Cleanup on aisle 4! Image link broken!</span>';
        }
    });

    bevImageInput.addEventListener('input', updateImagePreview);

    // Configure UI based on mode
    if (mode === 'add') {
        pageTitle.textContent = "Suggest New Beverage";
        actionButtons.innerHTML = `<button class="retro-btn" type="submit" id="saveBtn">Submit for Approval</button>`;
    } else if (mode === 'edit') {
        pageTitle.textContent = "Edit Beverage Details";
        actionButtons.innerHTML = `<button class="retro-btn" type="submit" id="saveBtn">Submit Changes for Approval</button>`;
        await loadExistingBeverage(targetId);
    } else if (mode === 'review') {
        pageTitle.textContent = "Review Submission";
        actionButtons.innerHTML = `
            <button class="retro-btn btn-approve" type="button" id="approveBtn">Approve</button>
            <button class="retro-btn" type="button" id="rejectBtn">Reject</button>
        `;
        await loadSubmission(targetId);
    }

    // Handle User Submit (Add/Edit)
    if (mode === 'add' || mode === 'edit') {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const formatNutri = (val) => {
                if (val === "" || val === null) return null;
                const num = parseFloat(val);
                if (isNaN(num) || num < 0) return null;
                if (num === 0) return 0;
                return Math.round(num * 100) / 100; // Rounds to 2 decimal places
            };

            const payload = {
                original_beverage_id: document.getElementById('originalBeverageId').value || null,
                name: document.getElementById("bevName").value,
                barcode: document.getElementById("bevBarcode").value || null,
                category: document.getElementById("bevCategory").value || null,
                price: parseFloat(document.getElementById("bevPrice").value),
                volume_ml: parseInt(document.getElementById("bevVolume").value) || null,
                packaging: document.getElementById("bevPackaging").value || null,
                image_url: document.getElementById("bevImage").value || null,

                description: document.getElementById("bevDescription").value || null,
                ingredients: document.getElementById("bevIngredients").value || null,

                // Replace the nutritional_info object with the formatted calls:
                nutritional_info: {
                    kcal: formatNutri(document.getElementById("nutriKcal").value),
                    fat: formatNutri(document.getElementById("nutriFat").value),
                    saturated_fat: formatNutri(document.getElementById("nutriSatFat").value),
                    carbs: formatNutri(document.getElementById("nutriCarbs").value),
                    sugars: formatNutri(document.getElementById("nutriSugars").value),
                    protein: formatNutri(document.getElementById("nutriProtein").value),
                    salt: formatNutri(document.getElementById("nutriSalt").value)
                },

                nutriscore: document.getElementById("bevNutriscore").value || null,
                restrictions: Array.from(document.querySelectorAll('input[name="beverage_restrictions[]"]:checked')).map(cb => parseInt(cb.value)),
                countries: document.getElementById("bevCountries").value || null,
                perishable: document.getElementById("bevPerishable").checked ? 1 : 0,
                validity_days: parseInt(document.getElementById("bevValidityDays").value) || null,
                season: document.getElementById("bevSeason").value || null,
                region: document.getElementById("bevRegion").value || null,
                venue: document.getElementById("bevVenue").value || null
            };

            fetch('/api/beverages/submit', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
                body: JSON.stringify(payload)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message);
                        window.location.href = 'sodalist.html';
                    } else alert(data.message);
                });
        });
    }

    // Handle Admin Review
    if (mode === 'review') {
        document.getElementById('approveBtn').addEventListener('click', () => processReview(targetId, 'approve'));
        document.getElementById('rejectBtn').addEventListener('click', () => processReview(targetId, 'reject'));
    }

    // Helper functions
    async function loadExistingBeverage(id) {
        const res = await fetch(`/api/beverages/single?id=${id}`);
        /** @type {{ success: boolean, data: { beverage: Object } }} */
        const data = await res.json();
        if (data.success) populateForm(data.data.beverage, id);
    }

    async function loadSubmission(id) {
        const res = await fetch(`/api/beverages/submission?id=${id}`, {headers: {'Authorization': 'Bearer ' + token}});
        /** @type {{ success: boolean, data: { submission: { original_beverage_id: string|number|null, [key: string]: any } } }} */
        const data = await res.json();
        if (data.success) {
            document.getElementById('submissionId').value = id;
            populateForm(data.data.submission, data.data.submission.original_beverage_id);
        }
    }

    function populateForm(data, originalId) {
        if (originalId) document.getElementById('originalBeverageId').value = originalId;

        document.getElementById("bevName").value = data.name || '';
        document.getElementById("bevBarcode").value = data.barcode || '';
        document.getElementById("bevCategory").value = data.category || '';
        document.getElementById("bevPrice").value = data.price || '';
        document.getElementById("bevVolume").value = data.volume_ml || '';
        document.getElementById("bevPackaging").value = data.packaging || '';
        document.getElementById("bevImage").value = data.image_url || '';

        document.getElementById("bevDescription").value = data.description || '';
        document.getElementById("bevIngredients").value = data.ingredients || '';
        if (data.nutritional_info) {
            try {
                const n = JSON.parse(data.nutritional_info);
                document.getElementById("nutriKcal").value = n.kcal !== null ? n.kcal : '';
                document.getElementById("nutriFat").value = n.fat !== null ? n.fat : '';
                document.getElementById("nutriSatFat").value = n.saturated_fat !== null ? n.saturated_fat : '';
                document.getElementById("nutriCarbs").value = n.carbs !== null ? n.carbs : '';
                document.getElementById("nutriSugars").value = n.sugars !== null ? n.sugars : '';
                document.getElementById("nutriProtein").value = n.protein !== null ? n.protein : '';
                document.getElementById("nutriSalt").value = n.salt !== null ? n.salt : '';
            } catch (e) {
                console.error("Could not parse nutritional info");
            }
        }
        document.getElementById("bevNutriscore").value = data.nutriscore ? data.nutriscore.toLowerCase() : '';
        document.getElementById("bevCountries").value = data.countries || '';
        document.getElementById("bevPerishable").checked = data.perishable === 1;
        document.getElementById("bevValidityDays").value = data.validity_days || '';
        document.getElementById("bevSeason").value = data.season || '';
        document.getElementById("bevRegion").value = data.region || '';
        document.getElementById("bevVenue").value = data.venue || '';

        // Clear checkboxes first
        document.querySelectorAll('input[name="beverage_restrictions[]"]').forEach(cb => cb.checked = false);

        // Check existing
        if (data.restrictions && Array.isArray(data.restrictions)) {
            data.restrictions.forEach(rId => {
                const cb = document.querySelector(`input[name="beverage_restrictions[]"][value="${rId}"]`);
                if (cb) cb.checked = true;
            });
        }
        updateImagePreview();
    }

    function processReview(submissionId, action) {
        fetch('/api/beverages/review', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
            body: JSON.stringify({submission_id: submissionId, action: action})
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(`Submission ${action}d!`);
                    window.location.href = 'admin.html';
                } else alert(data.message);
            });
    }

    // --- Open Food Facts Fetcher Logic ---
    const fetchOffBtn = document.getElementById("fetchOffBtn");

    if (fetchOffBtn) {
        fetchOffBtn.addEventListener("click", async () => {
            const barcode = document.getElementById("bevBarcode").value.trim();
            const statusText = document.getElementById("offStatus");

            if (!barcode) {
                statusText.textContent = "Please enter a barcode.";
                statusText.className = "off-status-text text-error";
                return;
            }

            statusText.textContent = "Fetching safely via Server...";
            statusText.className = "off-status-text text-default";

            try {
                const response = await fetch(`/api/beverages/off-lookup?barcode=${barcode}`, {
                    headers: {'Authorization': 'Bearer ' + token}
                });

                /** @type {{ success: boolean, message: string, data: { product: OffProduct } }} */
                const data = await response.json();

                if (!response.ok || !data.success || !data.data.product) {
                    statusText.textContent = data.message || "Product not found.";
                    statusText.className = "off-status-text text-error";
                    return;
                }

                /**
                 * @typedef {Object} OffProduct
                 * @property {string} [product_name]
                 * @property {string} [image_front_url]
                 * @property {string[]} [packaging_tags]
                 * @property {string} [packaging]
                 * @property {string} [generic_name]
                 * @property {string} [ingredients_text]
                 * @property {string} [nutriscore_grade]
                 * @property {string} [countries]
                 * @property {string} [quantity]
                 * @property {string[]} [categories_tags]
                 * @property {string[]} [allergens_tags]
                 * @property {string[]} [ingredients_analysis_tags]
                 * @property {string[]} [labels_tags]
                 * @property {Object} [nutriments]
                 * @property {number} [nutriments.energy-kcal_100g]
                 * @property {number} [nutriments.fat_100g]
                 * @property {number} [nutriments.saturated-fat_100g]
                 * @property {number} [nutriments.carbohydrates_100g]
                 * @property {number} [nutriments.sugars_100g]
                 * @property {number} [nutriments.proteins_100g]
                 * @property {number} [nutriments.salt_100g]
                 * @property {number} [nutriments.sodium_100g]
                 */

                /** @type {OffProduct} */
                const fetchedProduct = data.data.product;

                if (fetchedProduct.product_name) document.getElementById("bevName").value = fetchedProduct.product_name;
                if (fetchedProduct.image_front_url) document.getElementById("bevImage").value = fetchedProduct.image_front_url;
                if (fetchedProduct.packaging_tags && fetchedProduct.packaging_tags.length > 0) {
                    document.getElementById("bevPackaging").value = fetchedProduct.packaging_tags
                        .filter(tag => tag.startsWith('en:'))
                        .map(tag => tag.replace('en:', '').replace(/-/g, ' '))
                        .join(', ');
                } else if (fetchedProduct.packaging) {
                    document.getElementById("bevPackaging").value = fetchedProduct.packaging;
                }
                if (fetchedProduct.generic_name) document.getElementById("bevDescription").value = fetchedProduct.generic_name;
                if (fetchedProduct.ingredients_text) document.getElementById("bevIngredients").value = fetchedProduct.ingredients_text;
                if (fetchedProduct.nutriscore_grade) document.getElementById("bevNutriscore").value = fetchedProduct.nutriscore_grade.toLowerCase();
                if (fetchedProduct.countries) document.getElementById("bevCountries").value = fetchedProduct.countries;

                // Format Nutritional Info cleanly into specific inputs
                if (fetchedProduct.nutriments) {
                    const n = fetchedProduct.nutriments;
                    document.getElementById("nutriKcal").value = n['energy-kcal_100g'] !== undefined ? n['energy-kcal_100g'] : '';
                    document.getElementById("nutriFat").value = n.fat_100g !== undefined ? n.fat_100g : '';
                    document.getElementById("nutriSatFat").value = n['saturated-fat_100g'] !== undefined ? n['saturated-fat_100g'] : '';
                    document.getElementById("nutriCarbs").value = n.carbohydrates_100g !== undefined ? n.carbohydrates_100g : '';
                    document.getElementById("nutriSugars").value = n.sugars_100g !== undefined ? n.sugars_100g : '';
                    document.getElementById("nutriProtein").value = n.proteins_100g !== undefined ? n.proteins_100g : '';
                    document.getElementById("nutriSalt").value = n.salt_100g !== undefined ? n.salt_100g : '';
                }

                if (fetchedProduct.quantity) {
                    const volMatch = fetchedProduct.quantity.match(/([\d.,]+)/);
                    if (volMatch) {
                        let parsedVolume = parseFloat(volMatch[1].replace(',', '.'));
                        if (fetchedProduct.quantity.toLowerCase().includes('l') && !fetchedProduct.quantity.toLowerCase().includes('ml')) {
                            parsedVolume *= 1000;
                        }
                        document.getElementById("bevVolume").value = Math.round(parsedVolume);
                    }
                }

                // GUESS CATEGORY
                if (fetchedProduct.categories_tags) {
                    const tags = fetchedProduct.categories_tags.join(" ").toLowerCase();
                    let category = "other";

                    if (tags.includes("juice") || tags.includes("fruit-juice") || tags.includes("nectar") || tags.includes("squeezed") || tags.includes("smoothie")) {
                        category = "juice";
                    } else if (tags.includes("soda") || tags.includes("cola") || tags.includes("lemonade") || tags.includes("sparkling") || tags.includes("carbonated") || tags.includes("tonic") || tags.includes("ginger-ale") || tags.includes("root-beer") || tags.includes("pop")) {
                        category = "soda";
                    } else if (tags.includes("energy-drink") || tags.includes("sports-drink") || tags.includes("isotonic")) {
                        category = "energy";
                    } else if (tags.includes("tea") || tags.includes("iced-tea") || tags.includes("green-tea") || tags.includes("herbal") || tags.includes("infusion") || tags.includes("kombucha")) {
                        category = "tea";
                    } else if (tags.includes("coffee") || tags.includes("cold-brew") || tags.includes("iced-coffee") || tags.includes("espresso")) {
                        category = "coffee";
                    } else if (tags.includes("water") || tags.includes("mineral-water") || tags.includes("spring-water") || tags.includes("flavored-water") || tags.includes("infused-water")) {
                        category = "water";
                    } else if (tags.match(/\b(oat-milk|almond-milk|soy-milk|coconut-milk|rice-milk|plant-based-milk)\b/)) {
                        // INTERCEPT: Plant milks caught BEFORE generic "milk" check
                        category = "plant-milk";
                    } else if (tags.match(/\b(milk|dairy|yogurt|kefir|lassi|milkshake)\b/)) {
                        category = "dairy";
                    } else if (tags.includes("syrup") || tags.includes("squash") || tags.includes("concentrate") || tags.includes("cordial")) {
                        category = "syrup";
                    } else if (tags.includes("alcohol-free") || tags.includes("non-alcoholic") || tags.includes("mocktail")) {
                        category = "mocktail";
                    }

                    document.getElementById("bevCategory").value = category;
                }

                // AUTO-CHECKER FOR DIETARY RESTRICTIONS

                // Separate tags into exact arrays (stripping 'en:' prefixes) to avoid substring false-positives
                const allergens = (fetchedProduct.allergens_tags || []).map(t => t.replace('en:', '').toLowerCase());
                const analysis = (fetchedProduct.ingredients_analysis_tags || []).map(t => t.replace('en:', '').toLowerCase());
                const labelsStr = (fetchedProduct.labels_tags || []).join(' ').toLowerCase();
                const categoriesStr = (fetchedProduct.categories_tags || []).join(' ').toLowerCase();

                document.querySelectorAll('input[name="beverage_restrictions[]"]').forEach(cb => {
                    const rName = cb.dataset.name;

                    // Allergens (Strict check against OFF allergen arrays)
                    // (Irrelevant food allergens like fish, celery, mustard, etc. have been removed)
                    if (allergens.includes('milk') && rName.includes('lactose')) cb.checked = true;
                    if (allergens.includes('gluten') && rName.includes('gluten')) cb.checked = true;
                    if (allergens.includes('peanuts') && rName.includes('peanut')) cb.checked = true;
                    if ((allergens.includes('nuts') || allergens.includes('tree-nuts') || allergens.includes('almonds') || allergens.includes('hazelnuts') || allergens.includes('walnuts')) && rName.includes('tree nut')) cb.checked = true;
                    if (allergens.includes('soybeans') && rName.includes('soy')) cb.checked = true;
                    if (allergens.includes('sulphur-dioxide-and-sulphites') && rName.includes('sulphite')) cb.checked = true;

                    // Diets (from ingredients analysis & labels)
                    if (analysis.includes('vegan') && rName.includes('vegan')) cb.checked = true;
                    if (analysis.includes('vegetarian') && rName.includes('vegetarian')) cb.checked = true;
                    if (labelsStr.includes('halal') && rName.includes('halal')) cb.checked = true;
                    if (labelsStr.includes('kosher') && rName.includes('kosher')) cb.checked = true;
                    if (labelsStr.includes('organic') && rName.includes('organic')) cb.checked = true;
                    if (labelsStr.includes('fair-trade') && rName.includes('fair trade')) cb.checked = true;
                    if (labelsStr.includes('non-gmo') && rName.includes('non-gmo')) cb.checked = true;
                    if (labelsStr.includes('raw') && rName.includes('raw food')) cb.checked = true;
                    if (labelsStr.includes('low-fodmap') && rName.includes('fodmap')) cb.checked = true;

                    // Nutritional flags (from nutriments object)
                    const n = fetchedProduct.nutriments || {};
                    // Sugar-free usually means <= 0.5g per 100ml
                    if (n.sugars_100g !== undefined && n.sugars_100g <= 0.5 && rName.includes('sugar-free')) cb.checked = true;
                    if (labelsStr.includes('no-added-sugar') && rName.includes('no added sugar')) cb.checked = true;
                    if (n['sodium_100g'] !== undefined && n['sodium_100g'] < 0.12 && rName.includes('low-sodium')) cb.checked = true;
                    if (n.carbohydrates_100g !== undefined && n.carbohydrates_100g < 5 && rName.includes('low-carb')) cb.checked = true;
                    if (n.carbohydrates_100g !== undefined && n.carbohydrates_100g < 5 && rName.includes('keto')) cb.checked = true;

                    // Other label-based & beverage-specific flags
                    if (labelsStr.includes('no-artificial-colors') && rName.includes('no artificial colors')) cb.checked = true;
                    if (labelsStr.includes('no-artificial-sweeteners') && rName.includes('no artificial sweeteners')) cb.checked = true;
                    if (labelsStr.includes('no-artificial-preservatives') && rName.includes('no artificial preservatives')) cb.checked = true;
                    if ((labelsStr.includes('caffeine-free') || analysis.includes('caffeine-free')) && rName.includes('caffeine-free')) cb.checked = true;
                    if ((labelsStr.includes('high-caffeine') || categoriesStr.includes('energy-drink')) && rName.includes('high caffeine')) cb.checked = true;
                    if (categoriesStr.includes('carbonated') && rName.includes('carbonated')) cb.checked = true;
                });

                statusText.textContent = "Data fetched successfully! Please fill in the local price.";
                statusText.className = "off-status-text text-success";
                updateImagePreview();

            } catch (error) {
                console.error("Proxy Fetch Error:", error);
                statusText.textContent = "A network error occurred connecting to your server.";
                statusText.className = "off-status-text text-error";
            }
        });
    }
});