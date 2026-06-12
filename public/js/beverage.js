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
});