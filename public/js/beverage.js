document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        alert("No beverage ID provided.");
        window.location.href = "sodalist.html";
        return;
    }

    try {
        const response = await fetch(`/api/beverages/single?id=${id}`);
        const data = await response.json();

        if (!data.success || !data.data.beverage) {
            document.getElementById("bevName").textContent = "Beverage Not Found";
            return;
        }

        const bev = data.data.beverage;

        // Header
        document.title = bev.name + " - SOr";
        document.getElementById("bevName").textContent = bev.name;
        document.getElementById("bevPrice").textContent = bev.price ? `${parseFloat(bev.price).toFixed(2)} RON` : "N/A RON";

        // Image
        const imgEl = document.getElementById("bevImage");
        const placeholder = document.getElementById("bevImagePlaceholder");
        if (bev.image_url) {
            imgEl.src = bev.image_url;
            imgEl.classList.remove("hidden");
            placeholder.classList.add("hidden");
        }

        // Nutri-score Badge
        const nsBadge = document.getElementById("bevNutriscore");
        if (bev.nutriscore) {
            const score = bev.nutriscore.toLowerCase();
            nsBadge.textContent = score.toUpperCase();
            nsBadge.className = `badge badge-${score}`;
        }

        // Basic Info
        document.getElementById("bevCategory").textContent = bev.category || "Uncategorized";
        document.getElementById("bevVolume").textContent = bev.volume_ml ? `${bev.volume_ml} ml` : "--";
        document.getElementById("bevPackaging").textContent = bev.packaging || "--";
        document.getElementById("bevBarcode").textContent = bev.barcode || "--";
        document.getElementById("bevDescription").textContent = bev.description || "No description provided.";
        document.getElementById("bevIngredients").textContent = bev.ingredients || "Ingredients not listed.";

        // Availability
        document.getElementById("bevCountries").textContent = bev.countries || "--";
        document.getElementById("bevRegion").textContent = bev.region || "--";
        document.getElementById("bevSeason").textContent = bev.season || "--";
        document.getElementById("bevVenue").textContent = bev.venue || "--";

        let perishableText = bev.perishable === 1 ? "Yes" : "No";
        if (bev.perishable === 1 && bev.validity_days) {
            perishableText += ` (Valid for ${bev.validity_days} days)`;
        }
        document.getElementById("bevPerishable").textContent = perishableText;

        // Nutritional Info Grid
        const nutritionGrid = document.getElementById("nutritionGrid");
        if (bev.nutritional_info) {
            try {
                // Parse the JSON string saved in the database
                const n = JSON.parse(bev.nutritional_info);

                const formatValue = (val) => val !== null && val !== undefined && val !== "" ? `${val}` : "--";

                nutritionGrid.innerHTML = `
                    <div class="data-item"><span class="data-label">Energy</span><span class="data-value">${formatValue(n.kcal)} kcal</span></div>
                    <div class="data-item"><span class="data-label">Fat</span><span class="data-value">${formatValue(n.fat)} g</span></div>
                    <div class="data-item"><span class="data-label">Saturated Fat</span><span class="data-value">${formatValue(n.saturated_fat)} g</span></div>
                    <div class="data-item"><span class="data-label">Carbs</span><span class="data-value">${formatValue(n.carbs)} g</span></div>
                    <div class="data-item"><span class="data-label">Sugars</span><span class="data-value">${formatValue(n.sugars)} g</span></div>
                    <div class="data-item"><span class="data-label">Protein</span><span class="data-value">${formatValue(n.protein)} g</span></div>
                    <div class="data-item"><span class="data-label">Salt</span><span class="data-value">${formatValue(n.salt)} g</span></div>
                `;
            } catch (e) {
                console.error("Error parsing nutritional info", e);
                nutritionGrid.innerHTML = `<p class="text-block">Nutritional data is malformed.</p>`;
            }
        } else {
            nutritionGrid.innerHTML = `<p class="text-block">No nutritional data available.</p>`;
        }

    } catch (error) {
        console.error("Failed to load beverage details:", error);
        document.getElementById("bevName").textContent = "Error loading data.";
    }

    const token = localStorage.getItem("auth_token");

    if (token) {

        document.querySelector('.rating-section.auth-only').classList.remove('hidden');
        document.querySelector('.rating-section.guest-only').classList.add('hidden');
        document.querySelector('.add-to-list-section.auth-only').classList.remove('hidden');
        document.querySelector('.add-to-list-section.guest-only').classList.add('hidden');

        // Load user's shopping lists
        try {
            const listsRes = await fetch('/api/lists', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const listsData = await listsRes.json();

            if (listsData.success && listsData.data.lists) {
                const listSelect = document.getElementById('listSelect');
                listSelect.innerHTML = '';

                if (listsData.data.lists.length === 0) {
                    listSelect.innerHTML = '<option value="">No lists yet. Create one first!</option>';
                } else {
                    listSelect.innerHTML = '<option value="">Select a list...</option>';
                    listsData.data.lists.forEach(list => {
                        const option = document.createElement('option');
                        option.value = list.id;
                        option.textContent = list.name;
                        listSelect.appendChild(option);
                    });
                }
            }
        } catch (e) {
            console.error("Failed to load shopping lists", e);
        }

        // Handle "Add to List" button
        const addToListBtn = document.getElementById('addToListBtn');
        if (addToListBtn) {
            addToListBtn.addEventListener('click', async () => {
                const listSelect = document.getElementById('listSelect');
                const listId = listSelect.value;

                if (!listId) {
                    alert("Please select a list first!");
                    return;
                }

                try {
                    const res = await fetch('/api/lists/items', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            list_id: listId,
                            beverage_id: id
                        })
                    });
                    const data = await res.json();

                    if (data.success) {
                        const msg = document.getElementById('addToListMessage');
                        msg.classList.remove('hidden');
                        document.getElementById('addToListError').classList.add('hidden');
                        setTimeout(() => msg.classList.add('hidden'), 3000);
                    } else {
                        const errMsg = document.getElementById('addToListError');
                        errMsg.textContent = data.message || 'Error adding to list';
                        errMsg.classList.remove('hidden');
                    }
                } catch (err) {
                    console.error("Network error:", err);
                    const errMsg = document.getElementById('addToListError');
                    errMsg.textContent = 'Network error. Please try again.';
                    errMsg.classList.remove('hidden');
                }
            });
        }

        // Dacă utilizatorul e logat, verificăm dacă a dat deja un rating în trecut
        try {
            const prefRes = await fetch('/api/preferences', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const prefData = await prefRes.json();

            if (prefData.success) {
                // Căutăm acest ID de băutură în lista de preferințe a userului
                const existingPref = prefData.data.preferences.find(p => p.beverage_id == id);
                if (existingPref) {
                    if(existingPref.rating) document.getElementById('ratingValue').value = existingPref.rating;
                    if(existingPref.notes) document.getElementById('ratingNotes').value = existingPref.notes;
                }
            }
        } catch (e) {
            console.error("Nu am putut încărca preferințele anterioare", e);
        }
    }


    // Funcția care se declanșează când dai click pe "Save My Rating"
    const rateForm = document.getElementById('rateForm');
    if (rateForm) {
        rateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!token) return;

            const payload = {
                beverage_id: id,
                rating: document.getElementById('ratingValue').value,
                notes: document.getElementById('ratingNotes').value
            };

            try {
                const res = await fetch('/api/preferences', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (data.success) {
                    const msg = document.getElementById('ratingMessage');
                    msg.style.display = 'block';
                    setTimeout(() => msg.style.display = 'none', 3000);
                } else {
                    alert("Error: " + data.message);
                }
            } catch (err) {
                alert("Network error while saving rating.");
            }
        });
    }

});