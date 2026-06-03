/**
 * DerejFact Admin — Layout & Shared UI
 * Inyecta sidebar, topbar, toasts y utilidades globales
 */
const LAYOUT = {
  /** Puntos de navegación */
  NAV_ITEMS: [
    { href: 'dashboard.html',     label: 'Dashboard',       icon: 'chart', section: null },
    { href: 'empresas.html',      label: 'Empresas',        icon: 'building', section: 'Gestión' },
    { href: 'onboarding.html',    label: 'Nuevo Cliente',   icon: 'plus-circle', section: null },
    { href: 'usuarios.html',      label: 'Usuarios',        icon: 'users', section: null },
    { href: 'planes.html',        label: 'Planes',          icon: 'clipboard', section: 'Suscripciones' },
    { href: 'suscripciones.html', label: 'Suscripciones',   icon: 'doc', section: null },
    { href: 'paquetes.html',      label: 'Paquetes',        icon: 'package', section: null },
    { href: 'api-keys.html',      label: 'API Keys',        icon: 'key', section: 'Acceso POS' },
    { href: 'clientes.html',      label: 'Clientes',        icon: 'user-group', section: null },
    { href: 'secuenciales.html',  label: 'Secuenciales',    icon: 'hash', section: null },
    { href: 'pagos.html',         label: 'Pagos',           icon: 'credit', section: 'Finanzas' },
    { href: 'catalogos-dgii.html', label: 'Catálogos DGII',  icon: 'book', section: 'Finanzas' },
  ],

  ICONS: {
    chart:        `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="3" y="13" width="4" height="8" rx="1"/><rect x="9" y="9" width="4" height="12" rx="1"/><rect x="15" y="5" width="4" height="16" rx="1"/></svg>`,
    building:     `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/></svg>`,
    'plus-circle':`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    users:        `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    clipboard:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
    doc:          `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    package:      `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    key:          `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>`,
    'user-group': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    hash:         `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
    credit:       `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    logout:       `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    sun:          `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon:         `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    menu:         `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    book:         `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  },

  /** Inicializa el layout completo en una página protegida */
  init(pageTitle = '') {
    if (!AUTH.requireAuth()) return;
    this._injectSidebar();
    this._injectTopbar(pageTitle);
    this._injectToastContainer();
    this._setActiveNav();
    this._bindEvents();
    this._applyTheme();
  },

  _injectSidebar() {
    const el = document.getElementById('sidebar');
    if (!el) return;
    let currentSection = null;
    let navHTML = '';

    this.NAV_ITEMS.forEach(item => {
      if (item.section && item.section !== currentSection) {
        navHTML += `<span class="nav-section-label">${item.section}</span>`;
        currentSection = item.section;
      }
      navHTML += `
        <a href="${item.href}" class="sidebar-nav-item" data-page="${item.href}">
          <span class="nav-icon">${this.ICONS[item.icon]}</span>
          <span class="nav-label">${item.label}</span>
        </a>`;
    });

    const user = AUTH.getCurrentUser();
    const initials = user ? `${(user.nombre||'A')[0]}${(user.apellido||'D')[0]}`.toUpperCase() : 'AD';
    const userName = user ? `${user.nombre||''} ${user.apellido||''}`.trim() || user.email : 'Admin';

    el.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo-icon">
          <img src="/public/img/logo-p.ico" alt="DerejFact" />
        </div>
        <div class="sidebar-brand">
          <span class="sidebar-brand-name">DerejFact</span>
          <span class="sidebar-brand-badge">Admin</span>
        </div>
      </div>
      <nav class="sidebar-nav">${navHTML}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${userName}</div>
            <div class="sidebar-user-role">SuperAdmin</div>
          </div>
        </div>
      </div>`;
  },

  _injectTopbar(pageTitle) {
    const el = document.getElementById('topbar');
    if (!el) return;
    const isDark = (localStorage.getItem('df_theme') || 'dark') === 'dark';
    el.innerHTML = `
      <div class="topbar-left">
        <button class="btn-sidebar-toggle" id="sidebarToggle" aria-label="Toggle sidebar">
          ${this.ICONS.menu}
        </button>
        <span class="topbar-breadcrumb">${pageTitle}</span>
      </div>
      <div class="topbar-right">
        <button class="btn-theme-toggle" id="themeToggle">
          ${isDark ? this.ICONS.sun : this.ICONS.moon}
          ${isDark ? 'Claro' : 'Oscuro'}
        </button>
        <button class="btn-logout" id="btnLogout">
          ${this.ICONS.logout}
          Cerrar sesión
        </button>
      </div>`;
  },

  _injectToastContainer() {
    if (document.getElementById('toastContainer')) return;
    const el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container';
    document.body.appendChild(el);
  },

  _setActiveNav() {
    const current = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar-nav-item').forEach(link => {
      if (link.dataset.page === current) link.classList.add('active');
    });
  },

  _bindEvents() {
    // Sidebar toggle
    document.addEventListener('click', e => {
      const toggle = e.target.closest('#sidebarToggle');
      if (toggle) {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
        else sidebar.classList.toggle('collapsed');
      }
      // Logout
      const btnLogout = e.target.closest('#btnLogout');
      if (btnLogout) {
        e.preventDefault();
        if (btnLogout.disabled) return;
        btnLogout.disabled = true;
        btnLogout.style.opacity = '0.6';
        AUTH.logout();
        return;
      }
      
      // Theme toggle
      if (e.target.closest('#themeToggle')) {
        this._toggleTheme();
        return;
      }
    });
  },

  _applyTheme() {
    const theme = localStorage.getItem('df_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  },

  _toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('df_theme', next);
    // Re-renderizar botón
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.innerHTML = `${next === 'dark' ? this.ICONS.sun : this.ICONS.moon} ${next === 'dark' ? 'Claro' : 'Oscuro'}`;
    }
  },
};

/* ── Toast API global ─────────────────────────────────────── */
function showToast(title, message = '', type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`,
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

/* ── Utilidades globales ──────────────────────────────────── */
function debounce(fn, ms = 300) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(val, currency = 'DOP') {
  if (val == null) return '—';
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(val);
}
