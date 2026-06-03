/**
 * DerejFact Admin — Configuración Central
 * ⚡ ÚNICO LUGAR donde se cambia la URL al pasar a producción
 */
const CONFIG = {
  // ─── URL BASE DE LA API ────────────────────────────────────────────────────
  // API_BASE_URL: 'http://127.0.0.1:8000/api/v1',
  // Producción → descomentar la línea de abajo y comentar la de arriba:
  API_BASE_URL: 'https://samboxderejfact.derejsoft.com/api/v1',

  APP_NAME: 'DerejFact Admin',
  APP_VERSION: '1.0.0',

  // ─── CLAVES SESSIONSTORAGE (se borran al cerrar el tab) ───────────────────
  STORAGE: {
    ACCESS:  'df_access',
    REFRESH: 'df_refresh',
    USER:    'df_user',
  },

  // ─── RUTAS INTERNAS DE LA APP ─────────────────────────────────────────────
  ROUTES: {
    LOGIN:         './index.html',
    RECOVER:       './pages/recover.html',
    DASHBOARD:     './pages/dashboard.html',
    EMPRESAS:      './pages/empresas.html',
    ONBOARDING:    './pages/onboarding.html',
    USUARIOS:      './pages/usuarios.html',
    PLANES:        './pages/planes.html',
    SUSCRIPCIONES: './pages/suscripciones.html',
    PAQUETES:      './pages/paquetes.html',
    API_KEYS:      './pages/api-keys.html',
    CLIENTES:      './pages/clientes.html',
    SECUENCIALES:  './pages/secuenciales.html',
    PAGOS:         './pages/pagos.html',
    CATALOGOS_DGII: './pages/catalogos-dgii.html',
  },
};
