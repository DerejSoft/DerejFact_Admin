/**
 * DerejFact Admin — Recover Password
 * Página pública aislada. No usa LAYOUT, no requireAuth.
 * Llama POST /auth/recover-password/ con { email }.
 */
document.addEventListener('DOMContentLoaded', () => {
  const form           = document.getElementById('recoverForm');
  const emailInput     = document.getElementById('email');
  const submitBtn      = document.getElementById('submitBtn');
  const btnText        = submitBtn.querySelector('.btn-text');
  const submitSpinner  = document.getElementById('submitSpinner');
  const formView       = document.getElementById('recoverFormView');
  const successView    = document.getElementById('recoverSuccessView');
  const btnResend      = document.getElementById('btnResend');
  const resendText     = document.getElementById('resendText');
  const resendCountdown= document.getElementById('resendCountdown');
  const countdownNum   = resendCountdown.querySelector('b');

  let countdownTimer = null;
  const COOLDOWN_SECONDS = 60;

  const setLoading = (loading) => {
    submitBtn.disabled = loading;
    if (loading) {
      btnText.classList.add('hidden');
      submitSpinner.classList.remove('hidden');
    } else {
      btnText.classList.remove('hidden');
      submitSpinner.classList.add('hidden');
    }
  };

  const startCountdown = () => {
    btnResend.disabled = true;
    let remaining = COOLDOWN_SECONDS;
    countdownNum.textContent = remaining;
    resendText.textContent = 'Reenviar';

    countdownTimer = setInterval(() => {
      remaining -= 1;
      countdownNum.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        btnResend.disabled = false;
        resendText.textContent = 'Reenviar instrucciones';
        resendCountdown.innerHTML = '';
      }
    }, 1000);
  };

  const showSuccess = () => {
    formView.classList.add('hidden');
    successView.classList.remove('hidden');
    startCountdown();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    FORMS.clearErrors(form);

    const email = emailInput.value.trim();
    if (!email) {
      FORMS.showFieldErrors(form, { email: ['Ingresa tu correo electrónico.'] });
      emailInput.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      FORMS.showFieldErrors(form, { email: ['El formato del correo no es válido.'] });
      emailInput.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/auth/recover-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Por seguridad, el backend devuelve 200 siempre (no revela si el email existe)
      showSuccess();
    } catch (err) {
      showToast('Error de red', 'No se pudo conectar con el servidor. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  form.addEventListener('submit', handleSubmit);
  btnResend.addEventListener('click', () => {
    successView.classList.add('hidden');
    formView.classList.remove('hidden');
    emailInput.focus();
  });
});
