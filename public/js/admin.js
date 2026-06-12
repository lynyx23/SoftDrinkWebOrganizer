document.addEventListener("DOMContentLoaded", () => {
    // Get token from localStorage
    const token = localStorage.getItem("auth_token");

    // Elements
    const adminContent = document.getElementById("admin-content");
    const refreshUsersBtn = document.getElementById("refreshUsersBtn");
    const refreshSubmissionsBtn = document.getElementById("refreshSubmissionsBtn");
    const usersContainer = document.getElementById("users-container");

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
                // Use CSS class removal instead of inline .style.display
                adminContent.classList.remove("admin-content-hidden");
                loadUsers(token);
                loadSubmissions(token);
            }
        })
        .catch(() => {
            window.location.href = "../../index.html";
        });

    // Attach Event Listeners
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener("click", () => loadUsers(token));
    }

    if (refreshSubmissionsBtn) {
        refreshSubmissionsBtn.addEventListener("click", () => loadSubmissions(token));
    }

    // Event Delegation: Listen for clicks on the container instead of inline onclicks
    if (usersContainer) {
        usersContainer.addEventListener("click", (e) => {
            if (e.target.tagName === "BUTTON" && e.target.classList.contains("delete-user-btn")) {
                const userId = e.target.getAttribute("data-id");
                const username = e.target.getAttribute("data-username");
                deleteUser(userId, username, token);
            }
        });
    }
});

// --- Helper Functions ---

function loadSubmissions(token) {
    const container = document.getElementById("submissions-container");
    container.innerHTML = '<p class="empty-state">Loading submissions...</p>';

    fetch("/api/beverages/submissions", {
        headers: {Authorization: "Bearer " + token},
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
                    // Changed from inline onclick to semantic HTML data attributes
                    const deleteButtonHtml = u.role !== "admin" ? `<button class="delete-user-btn" data-id="${u.id}" data-username="${u.username}">Delete</button>` : "";

                    container.innerHTML += `
                    <div class="user-item">
                        <span><strong>${u.username}</strong> (${u.email}) - Role: <span class="badge">${u.role}</span></span>
                        ${deleteButtonHtml}
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

function deleteUser(userId, username, token) {
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
}