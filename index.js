/**
 * DerejFact Admin — Login Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // Si ya está autenticado, redirigir al dashboard
    if (AUTH.isAuthenticated()) {
        window.location.href = CONFIG.ROUTES.DASHBOARD;
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnTogglePassword = document.getElementById('btnTogglePassword');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loginSpinner = document.getElementById('loginSpinner');

    // Toggle Password Visibility
    btnTogglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        
        // Update SVG icon based on state
        if (isPassword) {
            btnTogglePassword.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="eye-off-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
            `;
        } else {
            btnTogglePassword.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="eye-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            `;
        }
    });

    // Handle Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showToast('Error', 'Por favor, completa todos los campos', 'warning');
            return;
        }

        // Mostrar estado de carga
        btnText.classList.add('hidden');
        loginSpinner.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            const user = await AUTH.login(email, password);
            
            // Validar que sea superadmin (opcional, por seguridad)
            // if (user.rol !== 'SUPERADMIN') {
            //     AUTH.logout();
            //     showToast('Acceso denegado', 'Solo administradores pueden acceder a este panel', 'error');
            //     return;
            // }

            showToast('Bienvenido', 'Iniciando sesión...', 'success');
            
            setTimeout(() => {
                window.location.href = CONFIG.ROUTES.DASHBOARD;
            }, 600);
            
        } catch (err) {
            showToast('Error de autenticación', err.message, 'error');
            // Restaurar botón
            btnText.classList.remove('hidden');
            loginSpinner.classList.add('hidden');
            submitBtn.disabled = false;
            passwordInput.value = '';
            passwordInput.focus();
        }
    });
});
