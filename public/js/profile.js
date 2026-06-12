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
            prefsList.innerHTML = '<li class="empty-state">No drinks rated yet.</li>';
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
            groupsList.innerHTML = '<li class="empty-state">Not in any groups.</li>';
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
            listsEl.innerHTML = '<li class="empty-state">No active shopping lists.</li>';
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
    
    // MANAGING PREFERENCES LOGIC
    const bevSelect = document.getElementById('bevSelect');
    const addPreferenceForm = document.getElementById('addPreferenceForm');

    fetch('/api/beverages')
        .then(res => res.json())
        .then(data => {
            if(data.success && data.data.beverages) {
                bevSelect.innerHTML = '<option value="">-- Choose a Drink --</option>';
                data.data.beverages.forEach(b => {
                    // Punem numele și categoria pentru a fi ușor de recunoscut
                    bevSelect.innerHTML += `<option value="${b.id}">${b.name} (${b.category})</option>`;
                });
            }
        })
        .catch(err => console.error('Error fetching beverages:', err));

    if (addPreferenceForm) {
        addPreferenceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const payload = {
                beverage_id: bevSelect.value,
                rating: document.getElementById('bevRating').value,
                notes: document.getElementById('bevNotes').value
            };

            fetch('/api/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Preference saved successfully!');
                    // Dăm refresh paginii pentru a vedea rating-ul apărând în lista de sus
                    window.location.reload(); 
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => {
                console.error(err);
                alert('A network error occurred.');
            });
        });
    }

    // --- DIETARY RESTRICTIONS LOGIC ---
    let currentUserRestrictions = []; // Store current IDs to pre-check boxes

    // Patch into existing populateProfile function (add this temporarily inside your local scope or adjust as needed)
    // To ensure the edit logic knows what is already selected, capture the current restrictions during the profile fetch:
    fetch('/api/users/profile', { headers: {'Authorization': 'Bearer ' + token} })
        .then(res => res.json())
        .then(data => {
            if(data.success && data.data.profile.restrictions) {
                currentUserRestrictions = data.data.profile.restrictions.map(r => r.id);
            }
            // Once data is loaded, show the Edit button
            document.getElementById('editRestrictionsBtn').classList.remove('hidden');
        });

    const editRestrictionsBtn = document.getElementById('editRestrictionsBtn');
    const editRestrictionsForm = document.getElementById('editRestrictionsForm');
    const availableRestrictionsContainer = document.getElementById('availableRestrictions');
    const cancelRestrictionsBtn = document.getElementById('cancelRestrictionsBtn');
    const restrictionsListDisplay = document.getElementById('restrictionsList');

    editRestrictionsBtn.addEventListener('click', () => {
        // Toggle UI
        editRestrictionsBtn.classList.add('hidden');
        restrictionsListDisplay.classList.add('hidden');
        editRestrictionsForm.classList.remove('hidden');
        availableRestrictionsContainer.innerHTML = '<p class="empty-state">Loading options...</p>';

        // Fetch master list of restrictions
        fetch('/api/restrictions', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data.restrictions) {
                    availableRestrictionsContainer.innerHTML = '';

                    if(data.data.restrictions.length === 0) {
                        availableRestrictionsContainer.innerHTML = '<p class="empty-state">No restrictions configured in database.</p>';
                        return;
                    }

                    data.data.restrictions.forEach(r => {
                        const isChecked = currentUserRestrictions.includes(r.id) ? 'checked' : '';
                        availableRestrictionsContainer.innerHTML += `
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 10px; font-family: 'DM Sans', sans-serif;">
                            <input type="checkbox" name="restrictions[]" value="${r.id}" ${isChecked} style="width: 20px; height: 20px; accent-color: var(--washed-red); cursor: pointer;">
                            <span style="font-size: 1.1rem;">${r.name} <span class="badge" style="font-size: 0.7rem; background: var(--butter-yellow);">${r.type}</span></span>
                        </label>
                    `;
                    });
                }
            })
            .catch(() => {
                availableRestrictionsContainer.innerHTML = '<p class="empty-state" style="color: red;">Failed to load options.</p>';
            });
    });

    cancelRestrictionsBtn.addEventListener('click', () => {
        // Revert UI
        editRestrictionsForm.classList.add('hidden');
        restrictionsListDisplay.classList.remove('hidden');
        editRestrictionsBtn.classList.remove('hidden');
    });

    editRestrictionsForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Gather all checked boxes
        const checkedBoxes = Array.from(editRestrictionsForm.querySelectorAll('input[type="checkbox"]:checked'));
        const selectedIds = checkedBoxes.map(box => parseInt(box.value));

        // Submit to API
        fetch('/api/users/restrictions', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ restrictions: selectedIds })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Dietary profile updated successfully!');
                    window.location.reload(); // Refresh to show new tags
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => {
                console.error(err);
                alert('A network error occurred.');
            });
    });
});