document.addEventListener("DOMContentLoaded", () => {
    // Get token from localStorage
    const token = localStorage.getItem("auth_token");

    // Elements
    const adminContent = document.getElementById("admin-content");
    const addBeverageForm = document.getElementById("addBeverageForm");
    const refreshUsersBtn = document.getElementById("refreshUsersBtn");

    // Verify Admin Status on Load
    if (!token) {
        alert("You must be logged in as an admin!");
        window.location.href = "../../index.html";
        return;
    }

    fetch("/api/users/me", {
        headers: {Authorization: "Bearer " + token},
    })
        .then((res) => res.json())
        .then((data) => {
            if (!data.success || data.data.user.role !== "admin") {
                alert("Access denied. Admins only.");
                window.location.href = "../../index.html";
            } else {
                // Un-hide the dashboard
                adminContent.style.display = "block";
                loadUsers(token);
            }
        })
        .catch(() => {
            window.location.href = "../../index.html";
        });

    // Attach Event Listeners
    if (addBeverageForm) {
        addBeverageForm.addEventListener("submit", (e) => addBeverage(e, token));
    }

    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener("click", () => loadUsers(token));
    }

    // Attach deleteUser to window so the dynamically generated HTML buttons can find it
    window.deleteUser = function (userId, username) {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

        fetch(`/api/users?id=${userId}`, {
            method: "DELETE", headers: {Authorization: "Bearer " + token},
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    alert(`User "${username}" has successfully been deleted.`);
                    loadUsers(token); // Refresh list
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch((err) => {
                console.error(err);
                alert("A network error occurred.");
            });
    };

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

            statusText.textContent = "Fetching...";
            statusText.style.color = "var(--dark-text)";

            try {
                // Fetch from Open Food Facts API v3
                const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${barcode}.json`);
                const data = await response.json();

                if (data.status === "failure" || !data.product) {
                    statusText.textContent = "Product not found on Open Food Facts.";
                    statusText.style.color = "var(--washed-red)";
                    return;
                }

                const product = data.product;

                // Fill Name
                if (product.product_name) {
                    document.getElementById("bevName").value = product.product_name;
                }

                // Fill Image URL (OFF provides high-res images)
                if (product.image_front_url) {
                    document.getElementById("bevImage").value = product.image_front_url;
                }

                // Try to parse Volume (OFF returns strings like "330 ml" or "0.5 L")
                if (product.quantity) {
                    // Extract the first number found in the quantity string
                    const volMatch = product.quantity.match(/([\d.,]+)/);
                    if (volMatch) {
                        let parsedVolume = parseFloat(volMatch[1].replace(',', '.'));
                        // If it says "L" instead of "ml", convert it
                        if (product.quantity.toLowerCase().includes('l') && !product.quantity.toLowerCase().includes('ml')) {
                            parsedVolume *= 1000;
                        }
                        document.getElementById("bevVolume").value = Math.round(parsedVolume);
                    }
                }

                // Try to guess category based on OFF tags
                if (product.categories_tags) {
                    const tags = product.categories_tags.join(" ").toLowerCase();
                    let category = "other";
                    if (tags.includes("soda") || tags.includes("cola")) category = "soda"; else if (tags.includes("tea")) category = "tea"; else if (tags.includes("water")) category = "water"; else if (tags.includes("milk") || tags.includes("dairy")) category = "dairy";

                    document.getElementById("bevCategory").value = category;
                }

                statusText.textContent = "Data fetched successfully! Please fill in the local price.";
                statusText.style.color = "green";

            } catch (error) {
                console.error("Open Food Facts Error:", error);
                statusText.textContent = "Network error. Could not connect to Open Food Facts.";
                statusText.style.color = "var(--washed-red)";
            }
        });
    }

    const refreshSubmissionsBtn = document.getElementById("refreshSubmissionsBtn");
    if (refreshSubmissionsBtn) {
        refreshSubmissionsBtn.addEventListener("click", () => loadSubmissions(token));
        loadSubmissions(token); // Load on init
    }
});

// Helper Functions
function loadSubmissions(token) {
    const container = document.getElementById("submissions-container");
    container.innerHTML = '<p class="empty-state">Loading submissions...</p>';

    fetch("/api/beverages/submissions", {
        headers: { Authorization: "Bearer " + token },
    })
        .then((res) => res.json())
        .then((data) => {
            container.innerHTML = "";
            if (data.success && data.data.submissions.length > 0) {
                data.data.submissions.forEach((s) => {
                    const type = s.original_beverage_id ? "Edit" : "New";
                    container.innerHTML += `
                <div class="user-item">
                    <span><strong>[${type}] ${s.name}</strong> (by ${s.username})</span>
                    <a href="edit_beverage.html?mode=review&id=${s.id}" class="retro-btn small-btn">Review</a>
                </div>
                `;
                });
            } else {
                container.innerHTML = '<p class="empty-state">No pending approvals.</p>';
            }
        });
}

function loadUsers(token) {
    const container = document.getElementById("users-container");
    container.innerHTML = '<p class="empty-state">Loading users...</p>';

    fetch("/api/users", {
        headers: {Authorization: "Bearer " + token},
    })
        .then((res) => res.json())
        .then((data) => {
            container.innerHTML = ""; // Clear loader
            if (data.success && data.data.users.length > 0) {
                data.data.users.forEach((u) => {
                    container.innerHTML += `
                    <div class="user-item">
                        <span><strong>${u.username}</strong> (${u.email}) - Role: <span class="badge">${u.role}</span></span>
                        ${u.role !== "admin" ? `<button onclick="deleteUser(${u.id}, '${u.username}')">Delete</button>` : ""}
                    </div>
                `;
                });
            } else {
                container.innerHTML = '<p class="empty-state">No users found.</p>';
            }
        })
        .catch((err) => {
            console.error(err);
            container.innerHTML = '<p class="empty-state">Failed to load users.</p>';
        });
}

function addBeverage(e, token) {
    e.preventDefault(); // Stop form from reloading page

    const bevData = {
        name: document.getElementById("bevName").value,
        category: document.getElementById("bevCategory").value,
        price: parseFloat(document.getElementById("bevPrice").value),
        volume_ml: parseInt(document.getElementById("bevVolume").value) || null,
        image_url: document.getElementById("bevImage").value || null,
    };

    fetch("/api/beverages", {
        method: "POST", headers: {
            "Content-Type": "application/json", Authorization: "Bearer " + token,
        }, body: JSON.stringify(bevData),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                alert("Beverage added successfully!");
                document.getElementById("addBeverageForm").reset();
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch((err) => {
            console.error(err);
            alert("A network error occurred while adding the beverage.");
        });
}