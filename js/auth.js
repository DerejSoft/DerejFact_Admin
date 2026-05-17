/**
 * DerejFact Admin — Auth Module
 * Manejo de JWT con sessionStorage (se borra al cerrar el tab)
 */
const AUTH = {
  getAccessToken()  { return sessionStorage.getItem(CONFIG.STORAGE.ACCESS); },
  getRefreshToken() { return sessionStorage.getItem(CONFIG.STORAGE.REFRESH); },
  getCurrentUser()  { try { return JSON.parse(sessionStorage.getItem(CONFIG.STORAGE.USER)); } catch { return null; } },

  setSession(access, refresh, user) {
    sessionStorage.setItem(CONFIG.STORAGE.ACCESS,  access);
    sessionStorage.setItem(CONFIG.STORAGE.REFRESH, refresh);
    sessionStorage.setItem(CONFIG.STORAGE.USER,    JSON.stringify(user));
  },

  clearSession() {
    sessionStorage.removeItem(CONFIG.STORAGE.ACCESS);
    sessionStorage.removeItem(CONFIG.STORAGE.REFRESH);
    sessionStorage.removeItem(CONFIG.STORAGE.USER);
  },

  isAuthenticated() { return !!this.getAccessToken(); },

  /** Redirige al login si no hay sesión */
  requireAuth() {
    if (!this.isAuthenticated()) {
      const base = window.location.pathname.includes('/pages/') ? '../' : './';
      window.location.href = base + 'index.html';
      return false;
    }
    return true;
  },

  /** Intenta renovar el access token usando el refresh token */
  async refreshToken() {
    const refresh = this.getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      sessionStorage.setItem(CONFIG.STORAGE.ACCESS, data.access);
      return true;
    } catch {
      return false;
    }
  },

  /** Login: llama a la API y guarda la sesión */
  async login(email, password) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.non_field_errors?.[0] || 'Credenciales inválidas');

    // Obtener datos del usuario
    let user = { email, nombre: 'Admin', rol: 'SUPERADMIN' };
    try {
      const meRes = await fetch(`${CONFIG.API_BASE_URL}/usuarios/me/`, {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      if (meRes.ok) user = await meRes.json();
    } catch { /* continuar con user básico */ }

    this.setSession(data.access, data.refresh, user);
    return user;
  },

  logout() {
    this.clearSession();
    const base = window.location.pathname.includes('/pages/') ? '../' : './';
    window.location.replace(base + 'index.html');
  },
};
