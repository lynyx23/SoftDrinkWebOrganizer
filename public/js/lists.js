document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const myListsContainer = document.getElementById('myListsContainer');
    const listItemsContainer = document.getElementById('listItemsContainer');
    const currentListTitle = document.getElementById('currentListTitle');
    const createListForm = document.getElementById('createListForm');
    let selectedListId = null;

    loadLists();

    createListForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('newListName').value.trim();
        fetch('/api/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ name: name })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                document.getElementById('newListName').value = '';
                loadLists();
            } else alert(data.message);
        });
    });

    function loadLists() {
        fetch('/api/lists', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(res => res.json())
            .then(data => {
                myListsContainer.innerHTML = '';
                if (data.success && data.data.lists.length > 0) {
                    data.data.lists.forEach(list => {
                        const li = document.createElement('li');
                        li.style.cursor = 'pointer';
                        li.innerHTML = `<strong>🛒 ${list.name}</strong>`;
                        li.addEventListener('click', () => loadListItems(list.id, list.name));
                        myListsContainer.appendChild(li);
                    });
                } else {
                    myListsContainer.innerHTML = '<li class="empty-state">No lists found.</li>';
                }
            });
    }

    function loadListItems(listId, listName) {
        selectedListId = listId;
        currentListTitle.textContent = "Items in: " + listName;
        document.getElementById('deleteListBtn').style.display = 'block';
        listItemsContainer.innerHTML = '<li class="empty-state">Loading items...</li>';

        fetch(`/api/lists/items?list_id=${listId}`, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(res => res.json())
            .then(data => {
                listItemsContainer.innerHTML = '';
                if (data.success && data.data.items.length > 0) {
                    data.data.items.forEach(item => {
                        const isChecked = item.purchased ? 'checked' : '';
                        const textStyle = item.purchased ? 'text-decoration: line-through; color: #888;' : '';
                        
                        const li = document.createElement('li');
                        li.style.display = 'flex';
                        li.style.alignItems = 'center';
                        li.style.gap = '10px';
                        
                        li.innerHTML = `
                            <input type="checkbox" style="width: 20px; height: 20px; cursor: pointer;" ${isChecked} data-id="${item.id}">
                            <img src="${item.image_url || '../images/icon1.png'}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;">
                            <div style="flex: 1; ${textStyle}">
                                <strong>${item.quantity}x ${item.beverage_name}</strong>
                                <br><small>${item.price} RON</small>
                            </div>
                        `;

                        // Event listener pentru Checkbox (Cumpărat/Necumpărat)
                        const checkbox = li.querySelector('input');
                        checkbox.addEventListener('change', (e) => {
                            toggleItem(item.id, e.target.checked ? 1 : 0, listId, listName);
                        });

                        listItemsContainer.appendChild(li);
                    });
                } else {
                    listItemsContainer.innerHTML = '<li class="empty-state">This cart is empty!</li>';
                }
            });
    }

    function toggleItem(itemId, status, listId, listName) {
        fetch('/api/lists/items', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ item_id: itemId, purchased: status })
        }).then(() => loadListItems(listId, listName));
    }

    document.getElementById('deleteListBtn').addEventListener('click', () => {
        if (!confirm('Delete this list and all its items?')) return;

        fetch('/api/lists', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ list_id: selectedListId })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('List deleted!');
                    document.getElementById('deleteListBtn').style.display = 'none';
                    listItemsContainer.innerHTML = '<li class="empty-state">👈 Pick a list from the left</li>';
                    currentListTitle.textContent = 'Select a list to view items';
                    loadLists();
                } else {
                    alert('Error: ' + data.message);
                }
            });
    });
});