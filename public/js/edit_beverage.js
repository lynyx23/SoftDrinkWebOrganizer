document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'add'; // 'add', 'edit', 'review'
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
            imagePreview.style.display = 'none';

            imagePlaceholder.style.display = 'block';
            imagePlaceholder.innerHTML = '<span class="placeholder-text">⏳ Fetching image...</span>';
        } else {
            imagePreview.removeAttribute('src');
            imagePreview.style.display = 'none';
            imagePlaceholder.style.display = 'block';
            imagePlaceholder.innerHTML = '<span class="placeholder-text">🫙 No images left in stock!</span>';
        }
    }

    // Only reveal the image once it has completely finished loading
    imagePreview.addEventListener('load', () => {
        imagePreview.style.display = 'block';
        imagePlaceholder.style.display = 'none';
    });

    // Fallback if the URL is broken/invalid
    imagePreview.addEventListener('error', () => {
        // Make sure it only says 'broken' if there is actually text in the box!
        if (bevImageInput.value.trim() !== "") {
            imagePreview.style.display = 'none';
            imagePlaceholder.style.display = 'block';
            imagePlaceholder.innerHTML = '<span class="placeholder-text">🪣 Cleanup on isle 4! Image link broken!</span>';
        }
    });

    // Update preview when the user types or pastes a URL
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
            <button class="retro-btn" style="background: var(--mint); color: var(--dark-text);" type="button" id="approveBtn">Approve</button>
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
                barcode: document.getElementById("bevBarcode").value,
                category: document.getElementById("bevCategory").value,
                price: parseFloat(document.getElementById("bevPrice").value),
                volume_ml: parseInt(document.getElementById("bevVolume").value) || null,
                packaging: document.getElementById("bevPackaging").value || null,
                image_url: document.getElementById("bevImage").value || null,
            };

            fetch('/api/beverages/submit', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
                body: JSON.stringify(payload)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message); // "Submitted for admin approval"
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
                statusText.style.color = "var(--washed-red)";
                return;
            }

            statusText.textContent = "Fetching safely via Server...";
            statusText.style.color = "var(--dark-text)";

            try {
                // Now fetching from OUR backend, which handles the User-Agent safely
                const response = await fetch(`/api/beverages/off-lookup?barcode=${barcode}`, {
                    headers: {'Authorization': 'Bearer ' + token}
                });

                const data = await response.json();

                if (!response.ok || !data.success || !data.data.product) {
                    statusText.textContent = data.message || "Product not found.";
                    statusText.style.color = "var(--washed-red)";
                    return;
                }

                const product = data.data.product;

                // Fill Name
                if (product.product_name) document.getElementById("bevName").value = product.product_name;

                // Fill Image URL
                if (product.image_front_url) document.getElementById("bevImage").value = product.image_front_url;

                // Fill Packaging
                if (product.packaging) document.getElementById("bevPackaging").value = product.packaging;

                // Parse Volume
                if (product.quantity) {
                    const volMatch = product.quantity.match(/([\d.,]+)/);
                    if (volMatch) {
                        let parsedVolume = parseFloat(volMatch[1].replace(',', '.'));
                        if (product.quantity.toLowerCase().includes('l') && !product.quantity.toLowerCase().includes('ml')) {
                            parsedVolume *= 1000;
                        }
                        document.getElementById("bevVolume").value = Math.round(parsedVolume);
                    }
                }

                // Guess category based on tags
                if (product.categories_tags) {
                    const tags = product.categories_tags.join(" ").toLowerCase();
                    let category = "other";
                    if (tags.includes("soda") || tags.includes("cola")) category = "soda"; else if (tags.includes("tea")) category = "tea"; else if (tags.includes("water")) category = "water"; else if (tags.includes("milk") || tags.includes("dairy")) category = "dairy";

                    document.getElementById("bevCategory").value = category;
                }

                statusText.textContent = "Data fetched successfully! Please fill in the local price.";
                statusText.style.color = "green";
                updateImagePreview();

            } catch (error) {
                console.error("Proxy Fetch Error:", error);
                statusText.textContent = "A network error occurred connecting to your server.";
                statusText.style.color = "var(--washed-red)";
            }
        });
    }
});