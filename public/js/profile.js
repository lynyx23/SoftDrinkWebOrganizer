document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');

    // Redirect if not logged in
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const errorContainer = document.getElementById('errorMessage');

    // Fetch Profile Data
    fetch('/api/users/profile', {
        headers: {'Authorization': 'Bearer ' + token}
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.message);
            populateProfile(data.data.profile);
        })
        .catch(() => {
            errorContainer.textContent = 'Session expired or network error. Please log in again.';
            localStorage.removeItem('auth_token');
            setTimeout(() => window.location.href = 'login.html', 2000);
        });

    // Populate the DOM
    function populateProfile(user) {
        // Basic Info
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('profileRole').textContent = user.role;

        // Format Date
        document.getElementById('profileJoined').textContent = new Date(user.created_at).toLocaleDateString();

        // Avatar
        if (user.avatar_url) {
            document.getElementById('profileImage').src = user.avatar_url;
        } else {
            const safeName = encodeURIComponent(user.username);
            // Default Image
            document.getElementById('profileImage').src = `https://ui-avatars.com/api/?name=${safeName}&background=A8E6CF&color=2D3436&size=150&bold=true`;
        }

        // Restrictions
        const restrictionsContainer = document.getElementById('restrictionsList');
        if (user.restrictions && user.restrictions.length > 0) {
            restrictionsContainer.innerHTML = '';
            user.restrictions.forEach(r => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = r.name;
                restrictionsContainer.appendChild(span);
            });
        } else {
            restrictionsContainer.innerHTML = '<p class="empty-state">No dietary restrictions set.</p>';
        }

        // Top Preferences
        const prefsList = document.getElementById('preferencesList');
        if (user.top_preferences && user.top_preferences.length > 0) {
            prefsList.innerHTML = '';
            user.top_preferences.forEach(p => {
                const li = document.createElement('li');
                // Create star rating string (e.g. 4 -> ★★★★☆)
                const stars = '★'.repeat(p.rating) + '☆'.repeat(5 - p.rating);
                li.innerHTML = `<span><strong>${p.name}</strong></span> <span style="color:var(--washed-red)">${stars}</span>`;
                prefsList.appendChild(li);
            });
        } else {
            prefsList.innerHTML = '<p class="empty-state">No drinks rated yet.</p>';
        }

        // Groups
        const groupsList = document.getElementById('groupsList');
        if (user.groups && user.groups.length > 0) {
            groupsList.innerHTML = '';
            user.groups.forEach(g => {
                const li = document.createElement('li');
                li.innerHTML = `<span>🛍️ ${g.name}</span>`;
                groupsList.appendChild(li);
            });
        } else {
            groupsList.innerHTML = '<p class="empty-state">Not in any groups.</p>';
        }

        // Shopping Lists
        const listsEl = document.getElementById('shoppingLists');
        if (user.shopping_lists && user.shopping_lists.length > 0) {
            listsEl.innerHTML = '';
            user.shopping_lists.forEach(list => {
                const li = document.createElement('li');
                li.innerHTML = `<span>📝 ${list.name}</span>`;
                listsEl.appendChild(li);
            });
        } else {
            listsEl.innerHTML = '<p class="empty-state">No active shopping lists.</p>';
        }
    }

    // Handle Avatar Update
    document.getElementById('updateAvatarBtn').addEventListener('click', () => {
        const newUrl = document.getElementById('avatarInput').value.trim();
        if (!newUrl) return;

        fetch('/api/users/avatar', {
            method: 'PUT', headers: {
                'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token
            }, body: JSON.stringify({avatar_url: newUrl})
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('profileImage').src = newUrl;
                    document.getElementById('avatarInput').value = '';
                    errorContainer.textContent = '';
                    alert('Avatar updated!');
                } else {
                    errorContainer.textContent = data.message;
                }
            })
            .catch(() => {
                errorContainer.textContent = 'Failed to update avatar.';
            });
    });

    // Handle Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        fetch('/api/users/logout', {
            method: 'POST', headers: {'Authorization': 'Bearer ' + token}
        }).finally(() => {
            localStorage.removeItem('auth_token');
            window.location.href = '../../index.html';
        });
    });
});