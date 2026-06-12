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
        headers: { Authorization: "Bearer " + token },
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
    window.deleteUser = function(userId, username) {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

        fetch(`/api/users?id=${userId}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token },
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
});

// Helper Functions
function loadUsers(token) {
    const container = document.getElementById("users-container");
    container.innerHTML = '<p class="empty-state">Loading users...</p>';

    fetch("/api/users", {
        headers: { Authorization: "Bearer " + token },
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
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify(bevData),
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