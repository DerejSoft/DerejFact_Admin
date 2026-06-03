/**
 * DerejFact Admin — Forms Helper
 * Responsabilidad única: pintar errores de validación de DRF bajo cada input
 *
 * Contrato esperado del error:
 *   err.fields = { campoBackend: ["msg1", "msg2"], ... }
 *   err.fields = { non_field_errors: ["..."] }   ← error global
 *   err.fields = { detail: "..." }               ← error DRF a nivel raíz
 *
 * Convención HTML:
 *   <div class="form-group">
 *     <label class="form-label" for="rnc">RNC</label>
 *     <input class="form-input" name="rnc" id="rnc" />
 *   </div>
 *
 * Se busca el input por name= y se pinta <small class="field-error"> dentro
 * del .form-group contenedor. Si el campo no existe en el form, los mensajes
 * se devuelven como array (para que el caller los muestre como toast).
 */
const FORMS = {
  /**
   * Limpia errores visuales previos
   * @param {HTMLFormElement|string} formOrSelector
   */
  clearErrors(formOrSelector) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;
    if (!form) return;
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
  },

  /**
   * Pinta errores de campo
   * @param {HTMLFormElement|string} formOrSelector
   * @param {Object} errorsObj  { campo: [mensajes] }
   * @param {Object} fieldMap  mapeo opcional { campoBackend: 'nameHTML' }
   * @returns {string[]} mensajes que NO pudieron asociarse a un input
   */
  showFieldErrors(formOrSelector, errorsObj, fieldMap = {}) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;
    if (!form || !errorsObj || typeof errorsObj !== 'object') return [];

    const orphanMessages = [];

    Object.entries(errorsObj).forEach(([backendField, messages]) => {
      if (!Array.isArray(messages)) messages = [String(messages)];
      const messagesText = messages.join(' ');

      if (backendField === 'non_field_errors' || backendField === 'detail') {
        orphanMessages.push(messagesText);
        return;
      }

      const htmlName = fieldMap[backendField] || backendField;
      const input = form.querySelector(`[name="${htmlName}"]`);
      if (!input) {
        orphanMessages.push(`${backendField}: ${messagesText}`);
        return;
      }

      input.classList.add('has-error');
      const group = input.closest('.form-group') || input.parentElement;
      let errEl = group.querySelector('.field-error');
      if (!errEl) {
        errEl = document.createElement('small');
        errEl.className = 'field-error';
        group.appendChild(errEl);
      }
      errEl.textContent = messagesText;
    });

    return orphanMessages;
  },

  /**
   * Helper combinado: limpia y luego pinta
   */
  apply(formOrSelector, errorsObj, fieldMap = {}) {
    this.clearErrors(formOrSelector);
    return this.showFieldErrors(formOrSelector, errorsObj, fieldMap);
  },

  /**
   * Quita el error visual de un solo campo (al re-tipear)
   */
  clearFieldError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('has-error');
    const group = inputEl.closest('.form-group') || inputEl.parentElement;
    if (group) {
      const errEl = group.querySelector('.field-error');
      if (errEl) errEl.remove();
    }
  },
};

document.addEventListener('input', e => {
  if (e.target.matches('.has-error')) FORMS.clearFieldError(e.target);
});
