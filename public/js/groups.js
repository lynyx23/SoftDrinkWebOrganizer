document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let currentUser = {};
    let selectedGroup = null;

    // Get current user info
    fetch('/api/users/me', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentUser = data.data.user;
            }
        });

    // Load groups
    function loadGroups() {
        fetch('/api/groups', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const list = document.getElementById('groupsList');
                    list.innerHTML = '';
                    if (data.data.groups.length === 0) {
                        list.innerHTML = '<li class="empty-state">No groups yet. Create one!</li>';
                        return;
                    }
                    data.data.groups.forEach(group => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span style="cursor: pointer; flex: 1;">${group.name}</span><span style="font-size: 0.9rem; color: var(--washed-red);">${group.member_count} members</span>`;
                        li.style.cursor = 'pointer';
                        li.addEventListener('click', () => showGroupDetails(group.id));
                        list.appendChild(li);
                    });
                }
            });
    }

    // Show group details
    function showGroupDetails(groupId) {
        fetch('/api/groups/show?id=' + groupId, {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    selectedGroup = data.data.group;
                    document.getElementById('groupTitle').textContent = selectedGroup.name;
                    document.getElementById('groupDesc').textContent = selectedGroup.description || 'No description';

                    const membersList = document.getElementById('membersList');
                    membersList.innerHTML = '';
                    selectedGroup.members.forEach(m => {
                        const li = document.createElement('li');
                        li.textContent = m.username;
                        membersList.appendChild(li);
                    });

                    // Show invite form only for creator
                    const inviteForm = document.getElementById('inviteForm');
                    if (selectedGroup.created_by === currentUser.id) {
                        inviteForm.style.display = 'block';
                        document.getElementById('deleteGroupBtn').style.display = 'block';
                    } else {
                        inviteForm.style.display = 'none';
                        document.getElementById('deleteGroupBtn').style.display = 'none';
                    }

                    document.getElementById('groupDetailsCard').style.display = 'block';
                }
            });
    }

    // Create group
    document.getElementById('createGroupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('groupName').value;
        const description = document.getElementById('groupDesc').value;

        fetch('/api/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ name, description })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Group created!');
                    document.getElementById('groupName').value = '';
                    document.getElementById('groupDesc').value = '';
                    loadGroups();
                } else {
                    alert('Error: ' + data.message);
                }
            });
    });

    // Invite member
    document.getElementById('inviteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('inviteUsername').value;

        fetch('/api/groups/invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ group_id: selectedGroup.id, username })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Member invited!');
                    document.getElementById('inviteUsername').value = '';
                    showGroupDetails(selectedGroup.id);
                } else {
                    alert('Error: ' + data.message);
                }
            });
    });

    document.getElementById('closeDetailsBtn').addEventListener('click', () => {
        document.getElementById('groupDetailsCard').style.display = 'none';
        selectedGroup = null;
    });

    document.getElementById('deleteGroupBtn').addEventListener('click', () => {
        if (!confirm('Delete this group? This cannot be undone.')) return;

        fetch('/api/groups', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ group_id: selectedGroup.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Group deleted!');
                    document.getElementById('groupDetailsCard').style.display = 'none';
                    loadGroups();
                } else {
                    alert('Error: ' + data.message);
                }
            });
    });

    loadGroups();
});
