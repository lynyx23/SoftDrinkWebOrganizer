document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorContainer = document.getElementById('errorMessage');

    // Centralized function to handle API calls
    async function handleAuth(url, payload, successCallback) {
        errorContainer.textContent = ''; // Clear previous errors

        try {
            const response = await fetch(url, {
                method: 'POST', headers: {
                    'Content-Type': 'application/json', 'Accept': 'application/json'
                }, body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                errorContainer.textContent = data.message || 'An error occurred processing your request.';
                return;
            }

            successCallback(data);

        } catch (error) {
            console.error("Auth fetch error:", error);
            errorContainer.textContent = "A network or server error occurred. Please try again later.";
        }
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            const payload = {
                username: loginForm.username.value.trim(), password: loginForm.password.value
            };

            // Await the handleAuth promise
            await handleAuth('/api/users/login', payload, (data) => {
                localStorage.setItem('auth_token', data.data.token);
                window.location.href = '../../index.html';
            });

            if (submitBtn) submitBtn.disabled = false;
        });
    }

    // Handle Registration
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                username: registerForm.username.value.trim(),
                email: registerForm.email.value.trim(),
                password: registerForm.password.value
            };

            await handleAuth('/api/users/register', payload, () => {
                // Automatically redirect to login upon successful registration
                window.location.href = 'login.html';
            });
        });
    }
});