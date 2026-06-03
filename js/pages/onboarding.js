/**
 * DerejFact Admin — Onboarding Wizard
 * Paso 1: validar y guardar datos de empresa en memoria
 * Paso 2: POST /empresas/ + POST /usuarios/ con empresa recién creada
 * Paso 3: pantalla de éxito
 */
const ONBOARDING = {
  state: {
    currentStep: 1,
    companyData: null,
    company: null,
    user: null,
  },

  SK: 'df_onboarding',

  init() {
    LAYOUT.init('Nuevo Cliente');
    this._restoreState();
    this._bind();
  },

  _restoreState() {
    const raw = sessionStorage.getItem(this.SK);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.companyData) this.state.companyData = parsed.companyData;
      if (parsed.company) {
        this.state.company = parsed.company;
      }
      if (this.state.companyData) this._goTo(2);
    } catch { sessionStorage.removeItem(this.SK); }
  },

  _saveSession() {
    try {
      sessionStorage.setItem(this.SK, JSON.stringify({
        companyData: this.state.companyData,
        company: this.state.company,
      }));
    } catch {}
  },

  _clearSession() {
    sessionStorage.removeItem(this.SK);
  },

  _bind() {
    document.getElementById('companyForm').addEventListener('submit', e => this._handleCompany(e));
    document.getElementById('userForm').addEventListener('submit',    e => this._handleUser(e));
    document.getElementById('btnBack').addEventListener('click',      () => this._goTo(1));
    document.getElementById('btnCancel').addEventListener('click',    () => {
      if (confirm('¿Cancelar el onboarding?')) {
        window.location.href = 'empresas.html';
      }
    });
    document.getElementById('btnCreateAnother').addEventListener('click', () => this._reset());

    const rncInput = document.getElementById('rnc');
    rncInput.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '');
    });
  },

  _goTo(step) {
    this.state.currentStep = step;
    document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('active'));
    const target = step === 1 ? 'companyForm' : step === 2 ? 'userForm' : 'successPanel';
    document.getElementById(target).classList.add('active');

    const steps = document.querySelectorAll('.wizard-step');
    const lines = document.querySelectorAll('.wizard-line');
    steps.forEach(s => {
      const n = Number(s.dataset.step);
      s.classList.toggle('done', n < step);
      s.classList.toggle('active', n === step);
    });
    lines.forEach((l, i) => l.classList.toggle('done', i + 1 < step));
  },

  _setLoading(panel, loading) {
    const btn    = panel.querySelector('button[type="submit"]');
    const text   = btn.querySelector('.btn-text');
    const spinner= btn.querySelector('.spinner-inline');
    btn.disabled = loading;
    if (loading) { text.classList.add('hidden'); spinner.classList.remove('hidden'); }
    else         { text.classList.remove('hidden'); spinner.classList.add('hidden'); }
  },

  _validateCompanyLocal() {
    const form = document.getElementById('companyForm');
    FORMS.clearErrors(form);
    const errors = {};
    const rnc = form.rnc.value.trim();
    if (!rnc)                              errors.rnc = ['El RNC es obligatorio.'];
    else if (!/^\d{9}$|^\d{11}$/.test(rnc)) errors.rnc = ['Debe tener 9 u 11 dígitos numéricos.'];
    if (!form.razon_social.value.trim())    errors.razon_social = ['La razón social es obligatoria.'];
    if (!form.nombre_comercial.value.trim())errors.nombre_comercial = ['El nombre comercial es obligatorio.'];

    const orphans = FORMS.apply(form, errors);
    if (orphans.length) showToast('Datos incompletos', orphans[0], 'warning');
    return Object.keys(errors).length === 0;
  },

  _handleCompany(e) {
    e.preventDefault();
    if (!this._validateCompanyLocal()) return;

    const form = document.getElementById('companyForm');
    this.state.companyData = {
      rnc:              form.rnc.value.trim(),
      razon_social:     form.razon_social.value.trim(),
      nombre_comercial: form.nombre_comercial.value.trim(),
      ambiente:         form.ambiente.value,
      estado:           form.estado.value,
      activa:           form.activa.checked,
    };
    this._saveSession();
    this._goTo(2);
  },

  _validateUserLocal() {
    const form = document.getElementById('userForm');
    FORMS.clearErrors(form);
    const errors = {};
    if (!form.nombre.value.trim())   errors.nombre   = ['El nombre es obligatorio.'];
    if (!form.apellido.value.trim()) errors.apellido = ['El apellido es obligatorio.'];
    if (!form.email.value.trim())    errors.email    = ['El correo es obligatorio.'];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()))
                                      errors.email    = ['Formato de correo inválido.'];
    if (!form.password.value)        errors.password = ['La contraseña es obligatoria.'];
    else if (form.password.value.length < 8)
                                      errors.password = ['Mínimo 8 caracteres.'];
    if (form.password.value !== form.password_confirm.value)
                                      errors.password_confirm = ['Las contraseñas no coinciden.'];

    const orphans = FORMS.apply(form, errors);
    if (orphans.length) showToast('Datos incompletos', orphans[0], 'warning');
    return Object.keys(errors).length === 0;
  },

  async _handleUser(e) {
    e.preventDefault();
    if (!this._validateUserLocal()) return;

    const userForm = document.getElementById('userForm');
    const userPayload = {
      email:     userForm.email.value.trim(),
      nombre:    userForm.nombre.value.trim(),
      apellido:  userForm.apellido.value.trim(),
      rol:       'ADMIN_EMPRESA',
      password:  userForm.password.value,
      is_active: true,
    };

    this._setLoading(userForm, true);
    try {
      if (this.state.company && !this.state.company.id) {
        this.state.company = null;
      }
      if (!this.state.company) {
        try {
          const created = await API.post('/empresas/', this.state.companyData);
          this.state.company = created;
          if (!this.state.company?.id && this.state.companyData?.rnc) {
            const list = await API.get('/empresas/');
            const found = list.find(e => e.rnc === this.state.companyData.rnc);
            if (found) this.state.company = found;
          }
        } catch (err2) {
          if (err2.status === 409 && this.state.companyData?.rnc) {
            const list = await API.get('/empresas/');
            const found = list.find(e => e.rnc === this.state.companyData.rnc);
            if (found) this.state.company = found;
          }
          if (!this.state.company) throw err2;
        }
        this._saveSession();
      }
      if (!this.state.company?.id) {
        showToast('Error', 'No se pudo obtener el ID de la empresa.', 'error');
        this._goTo(1);
        return;
      }
      userPayload.empresa = this.state.company.id;
      const createdUser = await API.post('/usuarios/', userPayload);
      this.state.user = createdUser;
      this._clearSession();
      this._renderSuccess();
      this._goTo(3);
    } catch (err) {
      if (err.fields) {
        const form = this.state.company ? userForm : document.getElementById('companyForm');
        const orphans = FORMS.apply(form, err.fields);
        if (orphans.length) showToast('Error', orphans[0], 'error');
      } else {
        showToast('Error', err.message || 'Error al guardar', 'error');
      }
      if (this.state.company) {
        this._setLoading(userForm, false);
        return;
      }
      this._goTo(1);
    } finally {
      this._setLoading(userForm, false);
    }
  },

  _renderSuccess() {
    const c = this.state.company;
    const u = this.state.user;
    const block = document.getElementById('summaryBlock');
    block.innerHTML = `
      <div class="summary-row"><span class="label">Empresa</span><span class="value">${c.razon_social}</span></div>
      <div class="summary-row"><span class="label">RNC</span><span class="value">${c.rnc}</span></div>
      <div class="summary-row"><span class="label">UUID Empresa</span><span class="value">${c.id}</span></div>
      <div class="summary-row"><span class="label">Admin</span><span class="value">${u.nombre} ${u.apellido}</span></div>
      <div class="summary-row"><span class="label">Correo admin</span><span class="value">${u.email}</span></div>
      <div class="summary-row"><span class="label">UUID Usuario</span><span class="value">${u.id}</span></div>
    `;
  },

  _reset() {
    this.state = { currentStep: 1, companyData: null, company: null, user: null };
    this._clearSession();
    document.getElementById('companyForm').reset();
    document.getElementById('userForm').reset();
    document.getElementById('companyForm').activa.checked = true;
    FORMS.clearErrors(document.getElementById('companyForm'));
    FORMS.clearErrors(document.getElementById('userForm'));
    this._goTo(1);
  },
};

document.addEventListener('DOMContentLoaded', () => ONBOARDING.init());
