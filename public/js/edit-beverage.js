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

    // Image Preview Logic
    const bevImageInput = document.getElementById("bevImage");
    const imagePreview = document.getElementById("imagePreview");
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
                nutritional_info: {
                    kcal: document.getElementById("nutriKcal").value !== "" ? parseFloat(document.getElementById("nutriKcal").value) : null,
                    fat: document.getElementById("nutriFat").value !== "" ? parseFloat(document.getElementById("nutriFat").value) : null,
                    saturated_fat: document.getElementById("nutriSatFat").value !== "" ? parseFloat(document.getElementById("nutriSatFat").value) : null,
                    carbs: document.getElementById("nutriCarbs").value !== "" ? parseFloat(document.getElementById("nutriCarbs").value) : null,
                    sugars: document.getElementById("nutriSugars").value !== "" ? parseFloat(document.getElementById("nutriSugars").value) : null,
                    protein: document.getElementById("nutriProtein").value !== "" ? parseFloat(document.getElementById("nutriProtein").value) : null,
                    salt: document.getElementById("nutriSalt").value !== "" ? parseFloat(document.getElementById("nutriSalt").value) : null
                },
                nutriscore: document.getElementById("bevNutriscore").value || null,
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
        const data = await res.json();
        if (data.success) populateForm(data.data.beverage, id);
    }

    async function loadSubmission(id) {
        const res = await fetch(`/api/beverages/submission?id=${id}`, {headers: {'Authorization': 'Bearer ' + token}});
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

                const data = await response.json();

                if (!response.ok || !data.success || !data.data.product) {
                    statusText.textContent = data.message || "Product not found.";
                    statusText.className = "off-status-text text-error";
                    return;
                }

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

                // Guess category
                if (fetchedProduct.categories_tags) {
                    const tags = fetchedProduct.categories_tags.join(" ").toLowerCase();
                    let category = "other";

                    if (tags.includes("juice") || tags.includes("fruit") || tags.includes("nectar") || tags.includes("squeezed")) {
                        category = "juice";
                    } else if (tags.includes("soda") || tags.includes("cola") || tags.includes("energy")) {
                        category = "soda";
                    } else if (tags.includes("tea")) {
                        category = "tea";
                    } else if (tags.includes("water")) {
                        category = "water";
                    } else if (tags.includes("milk") || tags.includes("dairy")) {
                        category = "dairy";
                    }

                    document.getElementById("bevCategory").value = category;
                }

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