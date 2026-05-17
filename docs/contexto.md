# DerejFact API — Contexto de Proyecto
> Documento de referencia para desarrollo. Versión 1.0

---

## 1. Qué es el sistema

SaaS de facturación electrónica (e-CF) para la República Dominicana.
Permite que empresas emitan comprobantes fiscales electrónicos ante la DGII
a través de una API REST que consumen sus sistemas POS.

**Dos productos en uno:**
- `DerejFact_API` → el servidor SaaS (este proyecto)
- POS de ventas → cliente externo, proyecto Django separado, consume la API
- Portal admin → proyecto Django separado (gestion de empresas, usuarios y metricas)

---

## 2. Stack tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Django 5.x + Django REST Framework |
| Base de datos | PostgreSQL |
| Cola de tareas | Celery + Redis |
| Frontend portal | Proyecto separado (no en esta API) |
| Firma XML | lxml + xmlsec |
| Cifrado interno | cryptography (Fernet / AES-256) |
| Almacenamiento .p12 | Disco local del VPS (ruta segura fuera del webroot) |
| Servidor web | Nginx + Gunicorn |
| Hosting | VPS A2 Hosting (control total del servidor) |

---

## 3. Estructura del proyecto

```
DerejFact_API/
├── manage.py
├── .env
├── requirements.txt
├── core/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── wsgi.py
│   └── celery.py
└── apps/
    ├── users/
    ├── empresas/
    ├── subscriptions/
    ├── api_keys/
    ├── sequences/
    ├── comprobantes/
    ├── dgii/
    ├── webhooks/
    └── audit/
```

---

## 4. Función de cada app

| App | Responsabilidad |
|---|---|
| `users` | Registro, autenticación, roles, bloqueo por intentos fallidos |
| `empresas` | Tenants, certificado .p12, token DGII cacheado y cifrado |
| `subscriptions` | Planes, suscripciones, paquetes de comprobantes con consumo atómico |
| `api_keys` | Generación, verificación y revocación de llaves de acceso |
| `sequences` | Generación de e-NCF sin duplicados (SELECT FOR UPDATE) |
| `comprobantes` | Ciclo de vida del e-CF, inmutabilidad, detalles, eventos |
| `dgii` | Autenticación DGII, firma XML, envío, logs de comunicación |
| `webhooks` | Notificaciones a POS cuando cambia el estado de un comprobante |
| `audit` | Log inmutable de todas las acciones del sistema |

---

## 5. DGII — Especificación técnica

### Esquema XML
- Formato: **e-CF Versión 1.0 (Octubre 2025)** — última versión publicada por la DGII
- Librería: `lxml + xmlsec` para construcción y firma digital

### Ambientes
| Nombre | URL base | Uso |
|---|---|---|
| TesteCF | `https://ecf.dgii.gov.do/testecf/` | Desarrollo |
| CerteCF | `https://ecf.dgii.gov.do/certecf/` | Certificación ante DGII |
| Producción | `https://ecf.dgii.gov.do/ecf/` | Producción real |

### Endpoints DGII que se consumen

| # | Operación | Método | Endpoint |
|---|---|---|---|
| 1 | Obtener semilla | GET | `/{ambiente}/Autenticacion/api/Autenticacion/Semilla` |
| 2 | Validar semilla firmada | POST | `/{ambiente}/Autenticacion/api/Autenticacion/ValidarSemilla` |
| 3 | Enviar e-CF | POST | `/{ambiente}/Recepcion/api/FacturasElectronicas` |
| 4 | Consultar estado | GET | `/{ambiente}/Consultas/api/Consultas/Estado/{trackId}` |
| 5 | Anular e-CF | POST | `/{ambiente}/Anulacion/api/Anulacion` |
| 6 | Consultar directorio RNC | GET | `/{ambiente}/Consultas/api/Consultas/Directorio/{rnc}` |

### Flujo de autenticación DGII (por empresa)
```
1. GET  /Semilla              → recibir XML semilla
2. Firmar semilla con .p12 de la empresa (lxml + xmlsec)
3. POST /ValidarSemilla       → recibir token JWT
4. Guardar token CIFRADO en tabla TokenDGII
5. Usar token en header: Authorization: Bearer {token}
6. Repetir cuando token expire (verificar expira_at antes de cada llamada)
```

### Flujo de emisión de e-CF
```
1. POS  → POST /api/v1/comprobantes/emitir/   (con Api-Key)
2. API  → valida Api-Key, scope, IP, paquete activo
3. API  → reserva secuencial (SELECT FOR UPDATE)
4. API  → construye XML (xml_builder.py)
5. API  → firma XML (xml_signer.py)
6. API  → envía a DGII → recibe trackId
7. API  → polling hasta estado final (Aceptado/Rechazado)
           promedio DGII: ~200ms
8. API  → actualiza comprobante con estado final
9. API  → dispara webhook al POS
10. API → retorna respuesta al POS (síncrona)

**Estrategia de emision:**
- Síncrona con fallback asíncrono
- Timeout DGII: 10 segundos
- Si DGII no responde: estado `CONTINGENCIA`, se reintenta con Celery y se notifica por webhook
```

### Modo contingencia
Si la DGII no responde o retorna error técnico (5xx / timeout):
```
1. Comprobante queda en estado CONTINGENCIA (pendiente de reintento)
2. Se guarda el XML firmado localmente
3. Celery reintenta con backoff exponencial: 30s, 2m, 10m, 1h, 4h
4. Webhook notifica al POS cada cambio de estado
5. POS puede consultar estado en cualquier momento
6. Si DGII rechaza definitivamente → estado RECHAZADO, e-NCF quemado
```
**Nota:** El estado `CONTINGENCIA` ya fue agregado al modelo de comprobantes.

---

## 6. Certificados .p12

- **Dónde se guardan:** disco local del VPS en ruta fuera del webroot
  - Ruta: `/var/derejfact/certificados/{empresa_uuid}.p12`
  - Permisos: `640`, propietario: usuario del proceso Gunicorn
  - El directorio NO es accesible por Nginx
- **PIN del certificado:** NUNCA se persiste en DB
  - Se recibe desde el POS con TLS, se usa en memoria y se descarta
  - No se guarda en variables de entorno ni en base de datos
- **Hash de integridad:** SHA-256 del archivo guardado en `Empresa.certificado_hash`
  - Se verifica antes de cada uso para detectar corrupción o sustitución

---

## 7. Autenticación de la API (POS → DerejFact)

- Mecanismo: **API Key** (sistema a sistema, sin login de usuario)
- Header: `Authorization: Api-Key <token>`
- Formato de la key: `DRJ_{prefix8chars}_{token_aleatorio}`
- Solo el SHA-256 de la key completa se guarda en DB
- La key completa se muestra **una sola vez** al generarla
- Cada key tiene:
  - `scopes`: lista de permisos (`emitir`, `consultar`, `anular`, `webhooks`)
  - `allowed_ips`: lista de IPs/CIDRs permitidos (vacío = sin restricción)
  - `rate_limit_cantidad` + `rate_limit_ventana`: throttling por empresa

---

## 8. Multi-tenant — Reglas de aislamiento

- Cada empresa es un tenant independiente
- El `TenantMiddleware` inyecta `request.empresa` en cada request autenticado
- **Regla absoluta:** ninguna vista hace queries sin filtrar por empresa
- Un usuario solo puede ver datos de su propia empresa
- SUPERADMIN puede operar sobre cualquier empresa desde el portal/admin externo

---

## 9. Modelo de suscripciones y paquetes

**Reglas de negocio:**
- Los comprobantes NO se acumulan entre períodos
- Si el paquete vence sin consumirse, el saldo se pierde
- Si el paquete se agota, el siguiente PENDIENTE se activa automáticamente
- Solo puede haber UN paquete ACTIVO por empresa a la vez
- Si no hay paquete activo, la empresa no puede emitir
- El consumo usa `SELECT FOR UPDATE` para evitar race conditions

**Flujo de consumo:**
```
emitir e-CF
  → PaqueteComprobantes.consumir_para_empresa(empresa)   [atómico]
    → si agotado → activar siguiente PENDIENTE
    → si sin paquete → lanzar error 402
```

---

## 10. Endpoints externos (consumidos por el POS)

Base URL: `https://api.derejfact.com/api/v1/`

| Método | Endpoint | Scope requerido | Descripción |
|---|---|---|---|
| POST | `/comprobantes/emitir/` | `emitir` | Emitir un e-CF *(pendiente de implementar)* |
| POST | `/comprobantes/nota-credito/` | `emitir` | Emitir nota de credito *(pendiente de implementar)* |
| POST | `/comprobantes/nota-debito/` | `emitir` | Emitir nota de debito *(pendiente de implementar)* |
| GET | `/comprobantes/{uuid}/` | `consultar` | Consultar estado *(pendiente de implementar)* |
| POST | `/comprobantes/{uuid}/anular/` | `anular` | Anular e-CF aceptado *(pendiente de implementar)* |
| GET | `/comprobantes/` | `consultar` | Listar historial *(pendiente de implementar)* |
| GET | `/sequences/` | `consultar` | Secuencias (router existente) |
| POST | `/sequences/` | `emitir` | Cargar secuencia (inicio/fin) *(pendiente de reglas por plan)* |
| GET | `/api-keys/` | `consultar` | Gestion de API keys (superadmin) |
| GET | `/subscriptions/planes/` | `consultar` | Planes disponibles |
| GET | `/subscriptions/paquetes/` | `consultar` | Paquetes de comprobantes |
| POST | `/users/login/` | `consultar` | Login JWT (portal admin, no POS) |
| POST | `/users/token/refresh/` | `consultar` | Refresh JWT (portal admin) |
| GET | `/cuenta/saldo/` | `consultar` | Paquete activo y saldo *(pendiente de implementar)* |
| GET | `/dashboard/metricas/` | `consultar` | Metricas para POS *(pendiente de implementar)* |
| GET | `/notificaciones/` | `consultar` | Notificaciones del sistema *(pendiente de implementar)* |

---

## 11. Webhooks

- El POS registra una URL HTTPS en el portal del cliente
- DerejFact notifica cuando un comprobante cambia de estado
- Payload firmado con HMAC-SHA256 del secret del webhook
- Reintentos: hasta 5 intentos con backoff exponencial
- Eventos disponibles:
  - `comprobante.aceptado`
  - `comprobante.rechazado`
  - `comprobante.anulado`
  - `comprobante.error`
  - `paquete.agotado`
  - `paquete.por_agotarse`
  - `suscripcion.vencida`
- `certificado.por_vencer`

---

## 12. Metricas y criterios de optimo

**Criterios clave (POS y sistema):**
- Velocidad: P95 < 3s
- Calidad XML: >= 97% de aceptacion DGII
- Estabilidad: < 0.1% errores 5xx

**Metricas para dashboard POS:**
- Aceptados / Rechazados / Contingencia / Pendientes
- Tiempo promedio DGII y P95
- Facturas por dia y semana
- Errores 4xx / 5xx
- Saldo restante del plan
- Certificados por vencer
- Tokens DGII expirados
- Webhooks fallidos

---

## 13. Seguridad — Decisiones clave

| Decisión | Implementación |
|---|---|
| Token DGII | Cifrado con Fernet (AES-128-CBC + HMAC) antes de persistir |
| PIN certificado | TLS + uso en memoria, no se persiste |
| API Keys | Solo SHA-256 en DB, valor completo visible una sola vez |
| Secret webhooks | Solo SHA-256 en DB |
| Inmutabilidad comprobantes | Protección en `save()` Python + trigger de DB |
| Inmutabilidad audit logs | `save()` y `delete()` lanzan excepción si registro existe |
| Aislamiento tenant | TenantMiddleware obligatorio |
| Bloqueo de cuenta | 5 intentos fallidos → bloqueo 30 minutos |
| Sesiones web | Manejo en portal admin externo |
| HTTPS | Obligatorio. Nginx con SSL. HTTP redirige a HTTPS |
| IPs permitidas | Validación con módulo `ipaddress` de Python en ApiKey |

---

## 14. Variables de entorno requeridas (.env)

```env
# Django
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=

# Base de datos
DB_ENGINE=django.db.backends.postgresql
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=5432

# Cifrado (generar con: from cryptography.fernet import Fernet; Fernet.generate_key())
FERNET_KEY=

# Redis / Celery
REDIS_URL=redis://:password@localhost:6379/0
CELERY_BROKER_URL=redis://:password@localhost:6379/0

# Rutas
CERT_BASE_PATH=/var/derejfact/certificados/
XML_BASE_PATH=/var/derejfact/xmls/
```

---

## 15. Plan de trabajo — Secuencia de fases

```
Fase 1 (paralelo)    → empresas, subscriptions, sequences
Fase 2 (paralelo)    → dgii, comprobantes
Fase 3 (paralelo)    → api_keys, audit
Fase 4 (paralelo)    → webhooks, dashboard metricas
Fase 5 (paralelo)    → portal cliente, panel admin (proyecto separado)
Fase 6 (paralelo)    → Celery+Redis, Nginx+SSL
```

---

## 16. Tipos de e-CF soportados

| Código | Nombre |
|---|---|
| 31 | Factura de Crédito Fiscal Electrónica |
| 32 | Factura de Consumo Electrónica |
| 33 | Nota de Débito Electrónica |
| 34 | Nota de Crédito Electrónica |
| 41 | Comprobante de Compras Electrónico |
| 43 | Comprobante para Gastos Menores Electrónico |
| 44 | Comprobante para Regímenes Especiales Electrónico |
| 45 | Comprobante Gubernamental Electrónico |
| 46 | Comprobante para Exportaciones Electrónico |
| 47 | Comprobante para Pagos al Exterior Electrónico |

---

*Última actualización: Mayo 2026*

---

## 17. Secuencia de entrega (POS)

1. Emision de comprobantes
2. Nota de credito
3. Nota de debito
4. Consulta de estado
5. Secuencias (cargar + consultar)
6. Certificados .p12 (cargar + consultar)
7. Dashboard de metricas
8. Saldo / plan restante
9. Notificaciones

---

## 18. Reglas de negocio clave

- La secuencia cargada debe ser igual o menor al plan contratado
  - Ejemplo: rango 1 a 10 = 10 comprobantes -> plan debe ser de 10
