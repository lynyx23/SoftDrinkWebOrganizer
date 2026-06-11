document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorContainer = document.getElementById('errorMessage');

    // Centralized function to handle API calls
    async function handleAuth(url, payload, successCallback) {
        errorContainer.textContent = ''; // Clear previous errors
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'An error occurred');
            }

            successCallback(data);
            
        } catch (error) {
            errorContainer.textContent = error.message;
        }
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const payload = {
                username: loginForm.username.value.trim(),
                password: loginForm.password.value
            };

            handleAuth('/api/users/login', payload, (data) => {
                // UPDATE THIS LINE to match your colleague's code:
                localStorage.setItem('auth_token', data.data.token);
                
                // Redirect to the landing page (index.html) or sodalist
                window.location.href = '../../index.html'; 
            });
        });
    }

    // Handle Registration
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const payload = {
                username: registerForm.username.value.trim(),
                email: registerForm.email.value.trim(),
                password: registerForm.password.value
            };

            handleAuth('/api/users/register', payload, () => {
                // Automatically redirect to login upon successful registration
                window.location.href = 'login.html';
            });
        });
    }
});