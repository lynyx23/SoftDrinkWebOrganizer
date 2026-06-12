document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');
    
    const guestNavs = document.querySelectorAll('.nav-guest-only');
    const authNavs = document.querySelectorAll('.nav-auth-only');
    const navAdminBtn = document.getElementById('navAdminBtn');
    const navLogoutBtn = document.getElementById('navLogoutBtn');

    if (token) {
        // Hide Login/Register, Show Profile/Logout
        guestNavs.forEach(el => el.classList.add('hidden'));
        authNavs.forEach(el => el.classList.remove('hidden'));

        // Check if user is an admin to display the Admin link
        fetch('/api/users/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success || data.data.user.role !== 'admin') {
                if (navAdminBtn) navAdminBtn.classList.add('hidden');
            }
        }).catch(() => {
            // Ignore minor errors here; page-specific scripts handle full lockouts
        });
    }

    // Global Logout Handler
    if (navLogoutBtn) {
        navLogoutBtn.addEventListener('click', () => {
            fetch('/api/users/logout', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            }).finally(() => {
                localStorage.removeItem('auth_token');
                window.location.href = '../../index.html'; // Go back to landing page
            });
        });
    }
});