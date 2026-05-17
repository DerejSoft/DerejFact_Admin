# DerejFact Admin — Plan de Implementación Frontend

## Descripción General

Panel administrativo web para el SaaS de facturación electrónica **DerejFact**. Proyecto separado en HTML + CSS + JavaScript puro que consume la API REST en Django. Autenticación JWT con `sessionStorage`. Solo acceso **SUPERADMIN** en esta fase.

---

## Decisiones de Diseño

> [!IMPORTANT]
> El proyecto ya tiene un `index.html` (login) con diseño inicial. El plan lo **reemplaza completamente** con el sistema de diseño unificado nuevo.

> [!NOTE]
> **Un solo lugar para cambiar la URL base:** `js/config.js` — al pasar a producción solo se edita ese archivo.

---

## Paleta de Colores y Marca

| Token | Color | Uso |
|---|---|---|
| `--color-primary` | `#004e98` | Azul DerejSoft principal |
| `--color-primary-dark` | `#003a72` | Hover, bordes activos |
| `--color-primary-light` | `#e8f0fb` | Fondos suaves, badges |
| `--color-accent` | `#00a651` | Verde fiscal (e-CF DGII) |
| `--color-accent-dark` | `#008040` | Hover verde |
| `--color-danger` | `#e53935` | Errores, revocar, rechazar |
| `--color-warning` | `#f59e0b` | Alertas, pendientes |
| `--color-bg` | `#f4f6fa` | Fondo general (light) |
| `--color-sidebar` | `#002d5a` | Sidebar oscuro azul profundo |
| `--color-white` | `#ffffff` | Cards, inputs |
| `--color-text` | `#1a2332` | Texto principal |
| `--color-text-muted` | `#64748b` | Texto secundario |
| `--color-dark-bg` | `#0d1117` | Fondo dark mode |
| `--color-dark-surface` | `#161b22` | Cards en dark mode |
| `--color-dark-border` | `#30363d` | Bordes en dark mode |
| `--color-dark-text` | `#e6edf3` | Texto en dark mode |
| `--color-dark-muted` | `#8b949e` | Texto muted en dark mode |

> [!NOTE]
> El panel arranca en **dark mode** por defecto (admin dashboard). Se aplica con clase `data-theme="dark"` en `<html>`. Todos los tokens tienen su contraparte dark en `variables.css`.

**Tipografía:** Inter (Google Fonts) — 400, 500, 600, 700

---

## Estructura de Archivos del Proyecto

```
derejPanAdmin/
├── index.html                  ← REEMPLAZAR (nueva página de login)
├── index.css                   ← REEMPLAZAR (variables globales + login styles)
├── index.js                    ← REEMPLAZAR (lógica de login)
│
├── pages/
│   ├── dashboard.html          ← [NEW] Home con métricas rápidas
│   ├── empresas.html           ← [NEW] CRUD de empresas
│   ├── usuarios.html           ← [NEW] CRUD de usuarios
│   ├── planes.html             ← [NEW] CRUD de planes
│   ├── suscripciones.html      ← [NEW] CRUD de suscripciones
│   ├── paquetes.html           ← [NEW] Paquetes de comprobantes
│   ├── api-keys.html           ← [NEW] API Keys + modal de copia
│   ├── secuenciales.html       ← [NEW] Ver + bloquear/desbloquear
│   └── pagos.html              ← [NEW] Pagos + confirmar/rechazar
│
├── css/
│   ├── variables.css           ← [NEW] Design tokens (colores, tipografía, shadows)
│   ├── layout.css              ← [NEW] Sidebar, header, main layout
│   └── components.css          ← [NEW] Tablas, modales, forms, cards, badges, toasts
│
├── js/
│   ├── config.js               ← [NEW] ⚡ Solo aquí se cambia la URL base
│   ├── auth.js                 ← [NEW] Login, logout, guard, token refresh
│   ├── api.js                  ← [NEW] Fetch wrapper con Bearer JWT
│   └── pages/
│       ├── dashboard.js        ← [NEW]
│       ├── empresas.js         ← [NEW]
│       ├── usuarios.js         ← [NEW]
│       ├── planes.js           ← [NEW]
│       ├── suscripciones.js    ← [NEW]
│       ├── paquetes.js         ← [NEW]
│       ├── api-keys.js         ← [NEW]
│       ├── secuenciales.js     ← [NEW]
│       └── pagos.js            ← [NEW]
│
├── public/
│   └── background.jpg          ← (existente, se puede reusar en login)
│
└── docs/
    ├── contexto.md             ← (existente)
    └── contexto_API.md         ← (existente)
```

---

## Endpoints Cubiertos por Módulo

### 🔐 Auth
| Acción | Endpoint |
|---|---|
| Login | `POST /auth/login/` |
| Refresh token | `POST /auth/token/refresh/` |
| Recuperar contraseña | `POST /auth/recover-password/` |
| Ver perfil propio | `GET /usuarios/me/` |
| Cambiar contraseña | `POST /usuarios/me/change-password/` |

### 🏢 Empresas
| Acción | Endpoint |
|---|---|
| Listar | `GET /empresas/` |
| Crear | `POST /empresas/` |
| Ver suscripción | `GET /empresas/{id}/suscripcion/` |
| Ver paquetes | `GET /empresas/{id}/comprobantes/` |

### 👤 Usuarios
| Acción | Endpoint |
|---|---|
| Listar | `GET /usuarios/` |
| Crear | `POST /usuarios/` |
| Editar | `PATCH /usuarios/{id}/` |

### 📋 Planes
| Acción | Endpoint |
|---|---|
| Listar | `GET /planes/` |
| Crear | `POST /planes/` |
| Editar | `PATCH /planes/{id}/` |

### 📄 Suscripciones
| Acción | Endpoint |
|---|---|
| Listar | `GET /suscripciones/` |
| Crear | `POST /suscripciones/` |
| Editar | `PATCH /suscripciones/{id}/` |

### 📦 Paquetes
| Acción | Endpoint |
|---|---|
| Listar | `GET /paquetes/` |
| Crear | `POST /paquetes/` |
| Editar | `PATCH /paquetes/{id}/` |

### 🔑 API Keys
| Acción | Endpoint |
|---|---|
| Listar | `GET /api-keys/` |
| Crear (+ modal token) | `POST /api-keys/` |
| Revocar | `POST /api-keys/{id}/revocar/` |
| Rotar | `POST /api-keys/{id}/rotar/` |

### 🔢 Secuenciales
| Acción | Endpoint |
|---|---|
| Listar | `GET /secuenciales/` |
| Ver preview | `GET /secuenciales/{id}/preview/` |
| Bloquear | `POST /secuenciales/{id}/bloquear/` |
| Desbloquear | `POST /secuenciales/{id}/desbloquear/` |

### 💰 Pagos
| Acción | Endpoint |
|---|---|
| Listar | `GET /pagos/` |
| Crear | `POST /pagos/` |
| Confirmar | `POST /pagos/{id}/confirmar/` |
| Rechazar | `POST /pagos/{id}/rechazar/` |
| Historial | `GET /pagos/historial/` |

---

## Propuesta de Páginas y Secciones

### `index.html` — Login
- Fondo con imagen `background.jpg` + overlay degradado azul
- Card centrada glassmorphism con logo DerejFact
- Email + password con toggle show/hide
- Toast de error de autenticación
- Redirect automático si ya tiene sesión activa

### `pages/dashboard.html` — Dashboard *(Chart.js)*

**Fila 1 — KPI Cards (8 tarjetas):**
| Card | Dato | Fuente |
|---|---|---|
| 🏢 Empresas activas | Conteo `activa=true` | `GET /empresas/` |
| 👤 Total usuarios | Conteo total | `GET /usuarios/` |
| 📋 Planes activos | Conteo `activo=true` | `GET /planes/` |
| 📄 Suscripciones activas | Conteo `estado=ACTIVA` | `GET /suscripciones/` |
| 📦 Paquetes activos | Conteo `estado=ACTIVO` | `GET /paquetes/` |
| 🔑 API Keys activas | Conteo `activa=true` | `GET /api-keys/` |
| 💰 Pagos pendientes | Conteo | `GET /pagos/` |
| 🔢 Secuenciales bloqueados | Conteo `bloqueado=true` | `GET /secuenciales/` |

**Fila 2 — Gráficos (Chart.js):**
- **Donut** → Empresas por estado (ACTIVA / PENDIENTE_CERTIFICADO / INACTIVA)
- **Bar Chart** → Suscripciones por plan (nombre del plan vs cantidad)
- **Bar Chart** → Pagos por método de pago (TRANSFERENCIA / EFECTIVO / etc.)
- **Donut** → API Keys: Activas vs Revocadas vs Expiradas

**Fila 3 — Tablas de actividad reciente:**
- Últimas 5 empresas registradas (nombre, estado, fecha)
- Últimos 5 pagos (empresa, monto, estado)
- Paquetes por agotarse (< 10% disponible) → highlight rojo

### `pages/empresas.html` — Empresas
- Tabla paginada con: RNC, Razón Social, Ambiente, Estado, Activa
- Botón "Nueva Empresa" → modal con formulario
- Click en fila → ver suscripción activa y paquetes

### `pages/usuarios.html` — Usuarios
- **Buscador semántico** → filtra por email o nombre en tiempo real
- Tabla: Email, Nombre, Rol, Empresa, Activo
- Botón "Nuevo Usuario" → modal con formulario (rol, empresa, password)
- Botón "Editar" por fila → mismo modal pre-relleno → `PATCH /usuarios/{id}/`

### `pages/planes.html` — Planes
- **Buscador semántico** → filtra por nombre de plan
- Tabla: Nombre, Límite comprobantes, Precio mensual, Precio anual, Estado
- Botón "Nuevo Plan" → modal con formulario completo incluyendo tipos_ecf_permitidos
- Botón "Editar" por fila → mismo modal pre-relleno → `PATCH /planes/{id}/`

### `pages/suscripciones.html` — Suscripciones
- **Buscador semántico** → filtra por nombre de empresa
- Tabla: Empresa, Plan, Ciclo, Estado, Fecha inicio, Renovación
- Botón "Nueva Suscripción" → modal
- Botón "Editar" por fila → modal pre-relleno → `PATCH /suscripciones/{id}/`

### `pages/paquetes.html` — Paquetes de Comprobantes
- **Buscador semántico** → filtra por nombre de empresa
- Tabla: Empresa, Plan, Total, Usados, Disponibles (calculado), Estado, Vencimiento
- Barra de progreso de uso visual (roja si > 90% consumido)
- Botón "Editar" por fila → modal pre-relleno → `PATCH /paquetes/{id}/`

### `pages/api-keys.html` — API Keys ⭐
- **Buscador semántico** → filtra por nombre de empresa o nombre de key
- Tabla: Empresa, Nombre, Prefix, Scopes, IPs, Estado, Expiración
- Botón "Nueva API Key" → modal formulario
- **Al crear → Modal especial:**
  - ⚠️ Banner amarillo: "Este token solo se muestra UNA VEZ. Guárdalo ahora."
  - Campo de texto con el token completo (monospace)
  - Botón "📋 Copiar Token" → feedback visual "¡Copiado!"
  - Botón "Entendido" (desactiva hasta que el usuario haga clic en copiar)
- Botones por fila: Rotar | Revocar

### `pages/secuenciales.html` — Secuenciales
- Tabla: Empresa, Tipo e-CF, Último número, Mínimo, Máximo, Estado (bloqueado/activo)
- Botón "Preview" → muestra el siguiente NCF que se generaría
- Botón "Bloquear" → modal con campo motivo
- Botón "Desbloquear" → confirmación directa

### `pages/pagos.html` — Pagos
- Tabs: **Todos** | **Pendientes** | **Historial**
- Tabla: Empresa, Monto, Método, Referencia, Fecha, Estado
- Botones: Confirmar (verde) | Rechazar (rojo) — solo visibles si estado es PENDIENTE
- **Filtro por empresa** (select dropdown)
- **Buscador semántico** → busca por nombre de empresa o RNC en tiempo real (debounce 300ms, filtra localmente sobre los datos cargados)

---

## js/config.js — Configuración Central

```javascript
// ⚡ ÚNICO LUGAR DONDE SE CAMBIA LA URL AL PASAR A PRODUCCIÓN
const CONFIG = {
  API_BASE_URL: 'http://127.0.0.1:8000/api/v1',
  // Producción: 'https://api.derejfact.com/api/v1'
};
```

---

## Flujo de Autenticación JWT (sessionStorage)

```
1. Usuario ingresa email + password en login.html
2. POST /auth/login/ → recibe { access, refresh }
3. Guardar ambos en sessionStorage (se borran al cerrar tab)
4. Cada página protegida carga auth.js que:
   a. Verifica que existe el token en sessionStorage
   b. Si no existe → redirige a index.html
   c. Si existe → inyecta "Authorization: Bearer <access>" en cada request
5. Si API responde 401 → intentar refresh automático con /auth/token/refresh/
6. Si refresh también falla → logout y redirect a login
```

---

## Componentes Reutilizables (en components.css + api.js)

| Componente | Descripción |
|---|---|
| Sidebar | Nav fija con iconos + texto, collapse en mobile |
| Header | Topbar con nombre del usuario logueado + logout |
| DataTable | Tabla con cabecera, filas, estado vacío ("No hay registros") |
| Modal | Overlay + card centrada + header + body + footer con acciones |
| Toast | Notificación deslizante (success, error, warning) |
| Badge | Pill con color según estado (ACTIVA, PENDIENTE, BLOQUEADO…) |
| LoadingSpinner | Spinner durante fetch |
| ConfirmDialog | Modal de confirmación antes de acciones destructivas |

---

## Orden de Construcción

1. `js/config.js` — configuración base (URL + constantes)
2. `css/variables.css` — design tokens light + **dark mode**
3. `css/layout.css` — sidebar + header + grid
4. `css/components.css` — todos los componentes visuales
5. `index.html` + `index.css` + `index.js` — login refactorizado
6. `js/auth.js` — sistema JWT completo
7. `js/api.js` — fetch wrapper con Bearer + refresh automático
8. `pages/dashboard.html` + `js/pages/dashboard.js` ← **Chart.js CDN aquí**
9. Módulos en orden: empresas → usuarios → planes → suscripciones → paquetes → api-keys → secuenciales → pagos

**Dependencias externas (CDN, sin bundler):**
- [Chart.js](https://cdn.jsdelivr.net/npm/chart.js) — gráficos del dashboard
- Google Fonts Inter — tipografía

---

## Plan de Verificación

### Pruebas manuales en el navegador (con API corriendo en :8000)
1. Login con credenciales SUPERADMIN → debe redirigir a dashboard
2. Login fallido → debe mostrar toast de error
3. Cerrar tab → al abrir nueva tab, debe redirigir a login (sessionStorage limpio)
4. CRUD de empresa: crear → aparece en lista
5. Crear API Key → modal especial muestra token → botón copiar funciona
6. Bloquear secuencial → estado cambia en tabla
7. Confirmar/rechazar pago → estado cambia visualmente

### Compatibilidad
- Chrome/Edge últimas versiones (target principal)
- Firefox como secundario
