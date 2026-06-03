# Integracion POS ↔ API

Esta guia refleja el estado real del proyecto para que las pruebas en Postman cuadren con lo que hoy existe en el codigo.

## 1. Lo que si existe hoy

Rutas disponibles bajo `/api/v1/`:

- `auth/login/`
- `auth/token/refresh/`
- `auth/recover-password/`
- `usuarios/`
- `usuarios/me/`
- `usuarios/me/change-password/`
- `empresas/`
- `empresas/{id}/suscripcion/`
- `empresas/{id}/comprobantes/`
- `planes/`
- `suscripciones/`
- `paquetes/`
- `api-keys/`
- `api-keys/{id}/revocar/`
- `api-keys/{id}/rotar/`
- `clientes/`
- `clientes/{rnc_cedula}/`
- `secuenciales/`
- `secuenciales/{id}/preview/`
- `secuenciales/{id}/bloquear/`
- `secuenciales/{id}/desbloquear/`
- `secuencias/` (onboarding)
- `pagos/`
- `pagos/{id}/actualizar_confirmacion/`
- `pagos/{id}/confirmar/` (deprecated, usar actualizar_confirmacion)
- `pagos/{id}/rechazar/`
- `pagos/{id}/pdf/a4/`
- `pagos/{id}/pdf/80mm/`
- `pagos/historial/`
- `provincias/`
- `municipios/`
- `unidades-medida/`
- `monedas/`
- `impuestos-adicionales/`
- `formas-pago/`
- `webhooks/`
- `webhooks/{id}/entregas/`

Rutas que hoy estan vacias o no implementadas:

- `comprobantes/` (modelos listos, vistas pendientes)

Si quieres probar en Postman, concentrate en las rutas de arriba.

## 2. Autenticacion

### 2.1 JWT para panel o admin

Login:

```http
POST /api/v1/auth/login/
Content-Type: application/json
```

Body:

```json
{
  "email": "admin@ejemplo.com",
  "password": "Test123456"
}
```

Respuesta esperada:

```json
{
  "access": "<jwt_access>",
  "refresh": "<jwt_refresh>"
}
```

Refrescar token:

```http
POST /api/v1/auth/token/refresh/
Content-Type: application/json
```

```json
{
  "refresh": "<jwt_refresh>"
}
```

Usa el access token asi:

```http
Authorization: Bearer <jwt_access>
```

### 2.2 API Key para POS

Header obligatorio:

```http
Authorization: Api-Key <token_completo>
```

Formato real de la key generada por el sistema:

```text
<rnc_sin_guiones>_<token_aleatorio>
```

Ejemplo:

```text
131793916_x8f9k3abcdef...
```

La respuesta de creacion de API Key devuelve el `token` una sola vez. Luego no vuelve a mostrarse.

## 3. Variables recomendadas en Postman

Define estas variables en el environment:

```json
{
  "baseUrl": "http://127.0.0.1:8000/api/v1",
  "jwtAccess": "",
  "jwtRefresh": "",
  "apiKey": ""
}
```

Si pruebas en sandbox, cambia `baseUrl` por tu dominio real.

## 4. JSON correctos para probar

### 4.1 Crear usuario

```http
POST /api/v1/usuarios/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "email": "admin@empresa.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "rol": "ADMIN_EMPRESA",
  "empresa": "<empresa_uuid>",
  "password": "Test123456",
  "is_active": true
}
```

Si el usuario es `SUPERADMIN`, no le asignes empresa.

### 4.2 Perfil propio

```http
GET /api/v1/usuarios/me/
Authorization: Bearer <jwt_access>
```

Actualizar perfil propio:

```http
PATCH /api/v1/usuarios/me/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "nombre": "Juan",
  "apellido": "Pérez"
}
```

Cambiar password:

```http
POST /api/v1/usuarios/me/change-password/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "password_actual": "Test123456",
  "password_nueva": "NuevaClave123"
}
```

### 4.3 Crear empresa

```http
POST /api/v1/empresas/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "rnc": "131793916",
  "razon_social": "Empresa Demo SRL",
  "nombre_comercial": "Demo POS",
  "ambiente": "testecf",
  "estado": "PENDIENTE_CERTIFICADO",
  "activa": true
}
```

### 4.4 Crear plan

```http
POST /api/v1/planes/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "nombre": "Plan Inicial",
  "descripcion": "Plan de prueba para Postman",
  "limite_comprobantes": 1000,
  "precio_mensual": "1500.00",
  "precio_anual": "15000.00",
  "ciclo_disponible": "AMBOS",
  "dias_gracia": 5,
  "tipos_ecf_permitidos": [31, 32, 41],
  "activo": true,
  "orden": 1
}
```

### 4.5 Crear suscripcion

```http
POST /api/v1/suscripciones/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "empresa": "<empresa_uuid>",
  "plan": "<plan_uuid>",
  "ciclo": "MENSUAL",
  "estado": "ACTIVA",
  "fecha_inicio": "2026-05-15",
  "fecha_renovacion": "2026-06-15",
  "precio_pagado": "1500.00"
}
```

### 4.6 Crear paquete de comprobantes

```http
POST /api/v1/paquetes/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "empresa": "<empresa_uuid>",
  "suscripcion": "<suscripcion_uuid>",
  "plan": "<plan_uuid>",
  "total_comprobantes": 1000,
  "comprobantes_usados": 0,
  "estado": "ACTIVO",
  "origen": "SUSCRIPCION",
  "fecha_vencimiento": "2026-06-15T23:59:59Z"
}
```

### 4.7 Crear API Key

```http
POST /api/v1/api-keys/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "empresa": "<empresa_uuid>",
  "nombre": "POS Sucursal Norte",
  "scopes": [
    "comprobantes:crear",
    "comprobantes:consultar",
    "secuenciales:consultar"
  ],
  "allowed_ips": ["190.0.2.10", "190.0.2.0/24"],
  "rate_limit_cantidad": 100,
  "rate_limit_ventana": "HOUR",
  "expira_at": "2026-12-31T23:59:59Z",
  "activa": true
}
```

Respuesta importante:

```json
{
  "id": "<uuid>",
  "empresa": "<empresa_uuid>",
  "nombre": "POS Sucursal Norte",
  "prefix": "131793916",
  "scopes": ["comprobantes:crear", "comprobantes:consultar"],
  "allowed_ips": ["190.0.2.10"],
  "activa": true,
  "token": "131793916_xxxxxxxxxxxxxxxxx"
}
```

Ese `token` se guarda en el POS y se usa como `Authorization: Api-Key ...`.

### 4.8 Rotar o revocar API Key

Revocar:

```http
POST /api/v1/api-keys/{id}/revocar/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "motivo": "Key comprometida"
}
```

Rotar:

```http
POST /api/v1/api-keys/{id}/rotar/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "nombre": "POS Norte 2",
  "expira_at": "2027-01-01T00:00:00Z"
}
```

### 4.9 Clientes

Cliente se autentica vía API-Key o JWT. El `rnc_cedula` debe ser único por empresa. Si el cliente ya existe, el POST devuelve 409.

```http
GET /api/v1/clientes/
Authorization: Api-Key <token_completo>
```

```http
POST /api/v1/clientes/
Authorization: Api-Key <token_completo>
Content-Type: application/json
```

```json
{
  "rnc_cedula": "00123456789",
  "nombre": "Juan Pérez",
  "correo": "juan@ejemplo.com",
  "telefono": "8095551234",
  "direccion": "Calle Principal 123"
}
```

Respuesta exitosa:

```json
{
  "id": "<uuid>",
  "empresa": "<empresa_uuid>",
  "rnc_cedula": "00123456789",
  "nombre": "Juan Pérez",
  "correo": "juan@ejemplo.com",
  "telefono": "8095551234",
  "direccion": "Calle Principal 123",
  "activo": true,
  "creado_at": "2026-05-31T00:00:00Z",
  "actualizado_at": "2026-05-31T00:00:00Z"
}
```

```http
GET /api/v1/clientes/{rnc_cedula}/
Authorization: Api-Key <token_completo>
```

```http
PATCH /api/v1/clientes/{rnc_cedula}/
Authorization: Api-Key <token_completo>
Content-Type: application/json
```

```json
{
  "nombre": "Juan Pérez Actualizado",
  "telefono": "8095555678"
}
```

```http
DELETE /api/v1/clientes/{rnc_cedula}/
Authorization: Api-Key <token_completo>
```

El DELETE es lógico (marca `activo=false`). Respuesta 204 sin body.

### 4.10 Crear secuencial

```http
POST /api/v1/secuenciales/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "empresa": "<empresa_uuid>",
  "tipo_ecf": 31,
  "ultimo_numero": 0,
  "minimo_asignado": 1,
  "maximo_asignado": 9999999999,
  "bloqueado": false,
  "motivo_bloqueo": ""
}
```

Ver preview:

```http
GET /api/v1/secuenciales/{id}/preview/
Authorization: Bearer <jwt_access>
```

Bloquear:

```http
POST /api/v1/secuenciales/{id}/bloquear/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "motivo": "Mantenimiento"
}
```

Desbloquear:

```http
POST /api/v1/secuenciales/{id}/desbloquear/
Authorization: Bearer <jwt_access>
```

### 4.11 Pagos

#### Crear pago manual

Los pagos se pueden crear **manualmente** por un SuperAdmin o se generan **automáticamente** 15 días antes del vencimiento de la suscripción.

```http
POST /api/v1/pagos/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

```json
{
  "empresa": "<empresa_uuid>",
  "suscripcion": "<suscripcion_uuid>",
  "plan": "<plan_uuid>",
  "monto": "1500.00",
  "moneda": "DOP",
  "tipo_pago": "RENOVACION",
  "metodo_pago": "TRANSFERENCIA",
  "referencia": "TRF-12345",
  "observaciones": ""
}
```

Campos del body:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `empresa` | UUID | ✅ | ID de la empresa |
| `suscripcion` | UUID | ✅ | ID de la suscripción |
| `plan` | UUID | ✅ | ID del plan |
| `monto` | Decimal | ❌ | Si se omite, se calcula automáticamente (prorrateo del primer período) |
| `moneda` | String | ❌ | `DOP` (default) o `USD` |
| `tipo_pago` | String | ❌ | `RENOVACION` (default) o `ADICIONAL` |
| `metodo_pago` | String | ❌ | `EFECTIVO`, `TRANSFERENCIA`, `DEPOSITO`, `CHEQUE`, `OTRO` |
| `referencia` | String | ❌ | Nº de comprobante (obligatorio si método ≠ EFECTIVO) |
| `observaciones` | String | ❌ | Notas adicionales |

**Prorrateo automático:** Si se omite `monto` y es el primer pago confirmado de la suscripción, el sistema calcula el monto proporcional desde `fecha_inicio` hasta el primer `fecha_corte`.

**Pagos ADICIONALES:** Usar `tipo_pago: "ADICIONAL"`. Estos no modifican las fechas de la suscripción, solo crean un paquete de comprobantes.

**Ver pagos pendientes:**

```http
GET /api/v1/pagos/
Authorization: Bearer <jwt_access>
```

Por defecto retorna solo pagos en estado `PENDIENTE`. Ejemplo de respuesta:

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "<pago_uuid>",
      "empresa": "<empresa_uuid>",
      "empresa_nombre": "Empresa Demo SRL",
      "suscripcion": "<suscripcion_uuid>",
      "plan": "<plan_uuid>",
      "plan_nombre": "Plan Inicial",
      "monto": "1500.00",
      "moneda": "DOP",
      "metodo_pago": "",
      "referencia": "",
      "fecha_pago": "2026-05-21T00:00:00Z",
      "observaciones": "",
      "estado": "PENDIENTE",
      "confirmado_por": null,
      "fecha_confirmacion": null,
      "creado_at": "2026-05-06T00:00:00Z",
      "actualizado_at": "2026-05-06T00:00:00Z"
    }
  ]
}
```

**Confirmar pago:**

```http
PATCH /api/v1/pagos/{id}/actualizar_confirmacion/
Authorization: Bearer <jwt_access>
Content-Type: application/json
```

Body (SOLO estos campos son editables):

```json
{
  "metodo_pago": "TRANSFERENCIA",
  "referencia": "TRF-12345"
}
```

✅ Campos editables:
- `metodo_pago` (EFECTIVO, TRANSFERENCIA, DEPOSITO, CHEQUE, OTRO)
- `referencia` (Nº de comprobante/boleta)
- `observaciones` (opcional)

🔒 Campos NO editables (siempre read-only):
- `monto`
- `moneda`
- `plan`
- `empresa`
- `suscripcion`
- `tipo_pago`
- `fecha_pago`

⚠️ **Validación importante:**
Si `metodo_pago` ≠ `EFECTIVO`, el campo `referencia` es **OBLIGATORIO**.

Ejemplo:
```json
{
  "metodo_pago": "TRANSFERENCIA",
  "referencia": "TRF-20260521-001"
}
```

Respuesta exitosa (201):

```json
{
  "pago": {
    "id": "<pago_uuid>",
    "estado": "CONFIRMADO",
    "confirmado_por": "<user_uuid>",
    "fecha_confirmacion": "2026-05-21T10:30:00Z",
    ...
  },
  "suscripcion": {
    "id": "<suscripcion_uuid>",
    "estado": "ACTIVA",
    "fecha_inicio": "2026-05-21",
    "fecha_renovacion": "2026-06-20"
  },
  "paquete": {
    "id": "<paquete_uuid>",
    "total_comprobantes": 1000,
    "estado": "ACTIVO"
  },
  "historial": {
    "id": "<historial_uuid>",
    "periodo_mes": 5,
    "periodo_ano": 2026,
    "monto_pagado": "1500.00",
    "comprobantes_asignados": 1000
  }
}
```

**Descargar comprobante PDF:**

```http
GET /api/v1/pagos/{id}/pdf/a4/
Authorization: Bearer <jwt_access>
```

Formato carta (A4) con Helvetica. Devuelve el PDF como attachment.

```http
GET /api/v1/pagos/{id}/pdf/80mm/
Authorization: Bearer <jwt_access>
```

Formato ticket (80mm) con Courier. Devuelve el PDF como attachment.

**Filtrar por estado:**

```http
GET /api/v1/pagos/?estado=CONFIRMADO
Authorization: Bearer <jwt_access>
```

Estados disponibles: `PENDIENTE`, `CONFIRMADO`, `RECHAZADO`

**Ver historial completo:**

```http
GET /api/v1/pagos/historial/?empresa=<empresa_uuid>
Authorization: Bearer <jwt_access>
```

**Rechazar pago** (si aplica):

```http
POST /api/v1/pagos/{id}/rechazar/
Authorization: Bearer <jwt_access>
```

**Endpoint deprecated (mantener compatibilidad):**

```http
POST /api/v1/pagos/{id}/confirmar/
Authorization: Bearer <jwt_access>
```

⚠️ Este endpoint aún funciona pero está **DEPRECATED**. Usar `PATCH actualizar_confirmacion` en su lugar.

## 5. Consultas utiles para Postman

### Empresa activa de una key

```http
GET /api/v1/empresas/
Authorization: Api-Key <token_completo>
```

### Suscripcion activa de una empresa

```http
GET /api/v1/empresas/{id}/suscripcion/
Authorization: Bearer <jwt_access>
```

### Paquetes activos de una empresa

```http
GET /api/v1/empresas/{id}/comprobantes/
Authorization: Bearer <jwt_access>
```

### Clientes por empresa

```http
GET /api/v1/clientes/
Authorization: Api-Key <token_completo>
```

```http
GET /api/v1/clientes/{rnc_cedula}/
Authorization: Api-Key <token_completo>
```

### Listados generales

```http
GET /api/v1/planes/
GET /api/v1/suscripciones/
GET /api/v1/paquetes/
GET /api/v1/api-keys/
GET /api/v1/clientes/
GET /api/v1/secuenciales/
GET /api/v1/pagos/
```

## 6. Lo que no debes probar todavia

No pierdas tiempo en estos endpoints porque el codigo actual no tiene vistas reales:

- `POST /api/v1/comprobantes/emitir/`
- `POST /api/v1/comprobantes/nota-credito/`
- `POST /api/v1/comprobantes/nota-debito/`
- `GET /api/v1/comprobantes/{id}/`
- `GET/POST /api/v1/comprobantes/`

Las rutas de `dgii/` y `webhooks/` **ya existen** (ver secciones 11.11 y 11.12). `comprobantes/` sigue pendiente de implementacion.

## 7. Flujo recomendado de prueba en Postman

1. Hacer login con un usuario `SUPERADMIN`.
2. Guardar `access` en `jwtAccess`.
3. Crear empresa.
4. Crear plan.
5. Crear suscripcion con fecha de renovación a 5 días de hoy (para simular vencimiento en 15 días).
6. Crear paquete.
7. Crear API Key.
8. Probar lectura con `Authorization: Api-Key <token>`.
9. Crear secuencial y probar `preview`.
10. Crear pago **manual** via `POST /api/v1/pagos/` con tipo RENOVACION o ADICIONAL.
11. **O** esperar a que la tarea de Celery cree el pago automático:
    ```bash
    python manage.py shell
    from apps.pagos.tasks import generar_pagos_automaticos
    generar_pagos_automaticos()
    ```
12. `GET /api/v1/pagos/` - verás los pagos pendientes.
13. `PATCH /api/v1/pagos/{id}/actualizar_confirmacion/` - confirmar con método de pago + referencia.
14. Verificar respuesta: suscripción actualizada, paquete e historial creados.
15. `GET /api/v1/pagos/{id}/pdf/a4/` - descargar comprobante PDF tamaño carta.
16. `GET /api/v1/pagos/{id}/pdf/80mm/` - descargar comprobante PDF tamaño ticket.

## 8. [NUEVO] Flujo de Pagos (31 mayo 2026)

### Resumen

El sistema de pagos soporta dos orígenes:

| Origen | Cómo se crea | Descripción |
|--------|-------------|-------------|
| `RENOVACION` | Automático (Celery) o manual (POST) | Renovación de suscripción, actualiza fechas y crea paquete |
| `ADICIONAL` | Solo manual (POST por SuperAdmin) | Compra adicional de comprobantes, no toca fechas de suscripción |

### Generación Automática (Renovaciones)

**Tarea Celery Beat:**
- Se ejecuta: **Diariamente a las 00:00**
- Busca: Suscripciones activas/vencidas/suspendidas que vencen en los próximos 15 días
- Crea: `Pago(estado=PENDIENTE, tipo_pago=RENOVACION, monto=plan.precio)`
- Guardias:
  - Salta si ya existe un pago PENDIENTE de RENOVACION para la empresa
  - Salta si no hay ningún pago CONFIRMADO previo (evita primer pago automático)
  - No genera HistorialPago (eso ocurre al confirmar)

**Para probar manualmente:**
```bash
python manage.py shell
from apps.pagos.tasks import generar_pagos_automaticos
resultado = generar_pagos_automaticos()
print(resultado)
# {"status": "success", "pagos_creados": 2, "errores": 0, "total_procesadas": 5}
```

### Creación Manual

Un SuperAdmin puede crear pagos manualmente via `POST /api/v1/pagos/`:

- **RENOVACION**: Para registrar pagos fuera del ciclo automático (ej. pago anticipado). Al confirmar, actualiza fechas de suscripción.
- **ADICIONAL**: Para compras de paquetes extra. Al confirmar, crea paquete con `fecha_vencimiento=None` y registra HistorialPago con mes/año actual. No modifica Suscripcion.

### Prorrateo Automático

Si el `monto` se omite en el POST y es el primer pago confirmado de la suscripción, el sistema calcula el monto proporcional:

- **Mensual**: `(precio_mensual * días_usados) / días_del_período`
- **Anual**: `(precio_anual * días_usados) / 365`

### Estados de Pago

| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | Creado (manual o automático), esperando confirmación de método de pago |
| `CONFIRMADO` | Método de pago confirmado, suscripción activada, paquete e historial generados |
| `RECHAZADO` | Rechazado manualmente por admin |

### Validaciones

1. **Referencia obligatoria para no-EFECTIVO**
   - Si `metodo_pago` = TRANSFERENCIA/DEPOSITO/CHEQUE → `referencia` es OBLIGATORIO
   - Error 400 si no se proporciona

2. **No adelantos simultáneos**
   - No puede haber 2+ pagos PENDIENTES de RENOVACION para la misma empresa
   - Previene confusión de múltiples deudas

3. **Monto opcional en POST**
   - Si se omite y hay pagos previos, se usa el monto del plan
   - Si se omite y es el primer pago, se prorratea automáticamente
   - Si se provee, se usa tal cual

### Campos de Pago

| Campo | POST | PATCH | Read-Only |
|-------|------|-------|-----------|
| `id` | - | - | ✅ |
| `empresa` | ✅ requerido | - | ✅ |
| `suscripcion` | ✅ requerido | - | ✅ |
| `plan` | ✅ requerido | - | ✅ |
| `monto` | ✅ opcional | - | ✅ |
| `moneda` | ✅ opcional | - | ✅ |
| `tipo_pago` | ✅ opcional | - | ✅ |
| `metodo_pago` | ✅ opcional | ✅ editable | - |
| `referencia` | ✅ opcional | ✅ editable | - |
| `observaciones` | ✅ opcional | ✅ editable | - |
| `fecha_pago` | - | - | ✅ |
| `estado` | - | - | ✅ |
| `confirmado_por` | - | - | ✅ |
| `fecha_confirmacion` | - | - | ✅ |
| `creado_at` | - | - | ✅ |
| `actualizado_at` | - | - | ✅ |

### Descarga de PDF

Cada pago confirmado tiene dos formatos de comprobante:

- `GET /api/v1/pagos/{id}/pdf/a4/` — Formato carta, fuente Helvetica
- `GET /api/v1/pagos/{id}/pdf/80mm/` — Formato ticket 80mm, fuente Courier

### Impacto en Integración

**Para POS / Integraciones:**
- ✅ Puede crear pagos manualmente via POST (solo con API Key con scope adecuado)
- ✅ Puede listar pagos pendientes via GET
- ✅ Puede confirmar pagos via PATCH
- ✅ Puede descargar comprobantes en PDF

**Para Admin Dashboard:**
- ✅ Filtrar por estado: `?estado=PENDIENTE|CONFIRMADO|RECHAZADO`
- ✅ Ver historial completo: `/pagos/historial/?empresa=<uuid>`
- ✅ Opción de rechazar pago (solo PENDIENTE)
- ✅ Crear pagos ADICIONALES manualmente

## 9. Resumen de JSON que realmente necesitas

- Login JWT: `email` + `password`
- Cambio de clave: `password_actual` + `password_nueva`
- Empresa: `rnc`, `razon_social`, `nombre_comercial`, `ambiente`, `estado`, `activa`
- Plan: `nombre`, `descripcion`, `limite_comprobantes`, `precio_mensual`, `precio_anual`, `ciclo_disponible`, `dias_gracia`, `tipos_ecf_permitidos`, `activo`, `orden`
- Suscripcion: `empresa`, `plan`, `ciclo`, `estado`, `fecha_inicio`, `fecha_renovacion`, `precio_pagado`
- Paquete: `empresa`, `suscripcion`, `plan`, `total_comprobantes`, `comprobantes_usados`, `estado`, `origen`, `fecha_vencimiento`
- API Key: `empresa`, `nombre`, `scopes`, `allowed_ips`, `rate_limit_cantidad`, `rate_limit_ventana`, `expira_at`, `activa`
- Secuencial: `empresa`, `tipo_ecf`, `ultimo_numero`, `minimo_asignado`, `maximo_asignado`, `bloqueado`, `motivo_bloqueo`
- Cliente: `rnc_cedula`, `nombre`, `correo` (opcional), `telefono` (opcional), `direccion` (opcional)
- **[POST] Pago**: `empresa`, `suscripcion`, `plan`, `monto` (opcional), `moneda`, `tipo_pago`, `metodo_pago`, `referencia`, `observaciones`
- **[PATCH] Confirmar Pago**: `metodo_pago`, `referencia` (si no es EFECTIVO), `observaciones` (opcional)
- Pago (respuesta): `empresa`, `suscripcion`, `plan`, `monto`, `moneda`, `tipo_pago`, `metodo_pago`, `referencia`, `fecha_pago`, `observaciones`

## 10. Nota importante

La API Key no usa `Bearer`. Para POS siempre es:

```http
Authorization: Api-Key <token_completo>
```

Y para el panel humano siempre es:

```http
Authorization: Bearer <jwt_access>
```

---

## 11. Tabla unificada de endpoints existentes

Todas las rutas bajo `/api/v1/` que **sí existen hoy** en el código. La columna **Permiso** indica:
- `JWT` → header `Authorization: Bearer <jwt_access>` (panel admin)
- `API-Key` → header `Authorization: Api-Key <token>` (POS/terceros)
- `API-Key / JWT` → ambos métodos son aceptados
- `Público` → sin autenticación

### 11.1 Autenticación

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/auth/login/` | 200 | Público | Login con email + password. Devuelve `access` + `refresh`. |
| `POST` | `/api/v1/auth/token/refresh/` | 200 | Público | Refresca `access` usando `refresh`. |
| `POST` | `/api/v1/auth/recover-password/` | 200 | Público | Inicia recuperación de contraseña. |

### 11.2 Usuarios

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/usuarios/` | 201 | JWT | Crear usuario. `SUPERADMIN` no lleva empresa. |
| `GET` | `/api/v1/usuarios/` | 200 | JWT | Listar usuarios (filtrado por rol/empresa). |
| `GET` | `/api/v1/usuarios/me/` | 200 | JWT | Perfil del usuario autenticado. |
| `PATCH` | `/api/v1/usuarios/me/` | 200 | JWT | Actualizar `nombre` y `apellido` propios. |
| `POST` | `/api/v1/usuarios/me/change-password/` | 200 | JWT | Cambiar password (`password_actual` + `password_nueva`). |

### 11.3 Empresas

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/empresas/` | 201 | JWT | Crear empresa. |
| `GET` | `/api/v1/empresas/` | 200 | API-Key / JWT | Listar empresas (API-Key retorna la propia; JWT todas). |
| `GET` | `/api/v1/empresas/{id}/` | 200 | API-Key / JWT | Detalle de empresa. |
| `GET` | `/api/v1/empresas/{id}/suscripcion/` | 200 | JWT | Suscripción activa de la empresa. |
| `GET` | `/api/v1/empresas/{id}/comprobantes/` | 200 | JWT | Paquetes activos de comprobantes. |

### 11.4 Planes

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/planes/` | 201 | JWT | Crear plan. |
| `GET` | `/api/v1/planes/` | 200 | JWT | Listar planes. |

### 11.5 Suscripciones

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/suscripciones/` | 201 | JWT | Crear suscripción. |
| `GET` | `/api/v1/suscripciones/` | 200 | JWT | Listar suscripciones. |

### 11.6 Paquetes

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/paquetes/` | 201 | JWT | Crear paquete de comprobantes. |
| `GET` | `/api/v1/paquetes/` | 200 | JWT | Listar paquetes. |

### 11.7 API Keys

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/api-keys/` | 201 | JWT | Crear API Key. Devuelve `token` una sola vez. |
| `GET` | `/api/v1/api-keys/` | 200 | JWT | Listar API Keys. |
| `POST` | `/api/v1/api-keys/{id}/revocar/` | 200 | JWT | Revocar key (body: `motivo`). |
| `POST` | `/api/v1/api-keys/{id}/rotar/` | 200 | JWT | Rotar key (`nombre`, `expira_at` opcionales). |

### 11.8 Clientes

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/clientes/` | 201 / 409 | API-Key / JWT | Crear cliente. 409 si `rnc_cedula` ya existe en la empresa. |
| `GET` | `/api/v1/clientes/` | 200 | API-Key / JWT | Listar clientes de la empresa. |
| `GET` | `/api/v1/clientes/{rnc_cedula}/` | 200 / 404 | API-Key / JWT | Detalle por RNC/Cédula. |
| `PATCH` | `/api/v1/clientes/{rnc_cedula}/` | 200 | API-Key / JWT | Actualizar nombre, correo, teléfono, dirección. |
| `DELETE` | `/api/v1/clientes/{rnc_cedula}/` | 204 | API-Key / JWT | Borrado lógico (`activo=false`). |

### 11.9 Secuenciales

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/secuenciales/` | 201 | JWT | Crear secuencial (reservar rango e-NCF). |
| `GET` | `/api/v1/secuenciales/` | 200 | JWT | Listar secuenciales. |
| `GET` | `/api/v1/secuenciales/{id}/preview/` | 200 | JWT | Preview del próximo e-NCF disponible. |
| `POST` | `/api/v1/secuenciales/{id}/bloquear/` | 200 | JWT | Bloquear secuencial (body: `motivo`). |
| `POST` | `/api/v1/secuenciales/{id}/desbloquear/` | 200 | JWT | Desbloquear secuencial. |

### 11.10 Pagos

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/pagos/` | 201 | JWT | Crear pago manual (`RENOVACION` o `ADICIONAL`). |
| `GET` | `/api/v1/pagos/` | 200 | JWT | Listar pagos. Por defecto solo `PENDIENTE`. Filtro `?estado=`. |
| `PATCH` | `/api/v1/pagos/{id}/actualizar_confirmacion/` | 201 | JWT | Confirmar pago (`metodo_pago`, `referencia`, `observaciones`). |
| `POST` | `/api/v1/pagos/{id}/confirmar/` | 201 | JWT | **DEPRECATED.** Usar `actualizar_confirmacion`. |
| `POST` | `/api/v1/pagos/{id}/rechazar/` | 200 | JWT | Rechazar pago (solo `PENDIENTE`). |
| `GET` | `/api/v1/pagos/{id}/pdf/a4/` | 200 | JWT | Descargar comprobante PDF tamaño carta. |
| `GET` | `/api/v1/pagos/{id}/pdf/80mm/` | 200 | JWT | Descargar comprobante PDF tamaño ticket. |
| `GET` | `/api/v1/pagos/historial/` | 200 | JWT | Historial completo. Filtro `?empresa=<uuid>`. |

### 11.11 Catálogos DGII

La app `dgii` expone los catálogos oficiales de la DGII (Tablas I–IV del e-CF v1.0).  
**Autenticación:** JWT (`Authorization: Bearer <jwt_access>`).  
**Escritura** (POST, PATCH, DELETE) solo para SUPERADMIN. **Lectura** (GET) cualquier usuario autenticado.  
Todos los lookups son por código (string), no UUID.

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `GET` | `/api/v1/provincias/` | 200 | JWT | Listar provincias (Tabla III DGII, 32 provincias). |
| `POST` | `/api/v1/provincias/` | 201 | JWT + SUPERADMIN | Crear provincia. |
| `GET` | `/api/v1/provincias/{codigo}/` | 200 | JWT | Detalle de provincia. |
| `PATCH` | `/api/v1/provincias/{codigo}/` | 200 | JWT + SUPERADMIN | Actualizar nombre de provincia. |
| `DELETE` | `/api/v1/provincias/{codigo}/` | 204 | JWT + SUPERADMIN | Eliminar provincia. |
| `GET` | `/api/v1/municipios/` | 200 | JWT | Listar municipios. Filtro `?provincia={codigo}`. |
| `POST` | `/api/v1/municipios/` | 201 | JWT + SUPERADMIN | Crear municipio. |
| `GET` | `/api/v1/municipios/{codigo}/` | 200 | JWT | Detalle de municipio. |
| `PATCH` | `/api/v1/municipios/{codigo}/` | 200 | JWT + SUPERADMIN | Actualizar municipio. |
| `DELETE` | `/api/v1/municipios/{codigo}/` | 204 | JWT + SUPERADMIN | Eliminar municipio. |
| `GET` | `/api/v1/unidades-medida/` | 200 | JWT | Listar unidades de medida (Tabla IV, 62 unidades). |
| `POST` | `/api/v1/unidades-medida/` | 201 | JWT + SUPERADMIN | Crear unidad de medida. |
| `GET` | `/api/v1/unidades-medida/{codigo}/` | 200 | JWT | Detalle de unidad. |
| `PATCH` | `/api/v1/unidades-medida/{codigo}/` | 200 | JWT + SUPERADMIN | Actualizar unidad. |
| `DELETE` | `/api/v1/unidades-medida/{codigo}/` | 204 | JWT + SUPERADMIN | Eliminar unidad. |
| `GET` | `/api/v1/monedas/` | 200 | JWT | Listar monedas ISO 4217 (Tabla II, 17 monedas). |
| `POST` | `/api/v1/monedas/` | 201 | JWT + SUPERADMIN | Crear moneda. |
| `GET` | `/api/v1/monedas/{codigo_iso}/` | 200 | JWT | Detalle de moneda. |
| `PATCH` | `/api/v1/monedas/{codigo_iso}/` | 200 | JWT + SUPERADMIN | Actualizar moneda. |
| `DELETE` | `/api/v1/monedas/{codigo_iso}/` | 204 | JWT + SUPERADMIN | Eliminar moneda. |
| `GET` | `/api/v1/impuestos-adicionales/` | 200 | JWT | Listar impuestos adicionales (Tabla I, 39 códigos). |
| `POST` | `/api/v1/impuestos-adicionales/` | 201 | JWT + SUPERADMIN | Crear impuesto adicional. |
| `GET` | `/api/v1/impuestos-adicionales/{codigo}/` | 200 | JWT | Detalle de impuesto. |
| `PATCH` | `/api/v1/impuestos-adicionales/{codigo}/` | 200 | JWT + SUPERADMIN | Actualizar impuesto. |
| `DELETE` | `/api/v1/impuestos-adicionales/{codigo}/` | 204 | JWT + SUPERADMIN | Eliminar impuesto. |
| `GET` | `/api/v1/formas-pago/` | 200 | JWT | Listar formas de pago (11 tipos). |
| `POST` | `/api/v1/formas-pago/` | 201 | JWT + SUPERADMIN | Crear forma de pago. |
| `GET` | `/api/v1/formas-pago/{codigo}/` | 200 | JWT | Detalle de forma de pago. |
| `PATCH` | `/api/v1/formas-pago/{codigo}/` | 200 | JWT + SUPERADMIN | Actualizar forma de pago. |
| `DELETE` | `/api/v1/formas-pago/{codigo}/` | 204 | JWT + SUPERADMIN | Eliminar forma de pago. |

### 11.12 Webhooks

**Autenticación:** API-Key (`Authorization: Api-Key <token>`).  
El webhook usa HMAC (firma del payload) para garantizar integridad. El `secret` se devuelve solo en la creación.  
Ver detalles de implementación en `docs/plan_webhook_snapshot.md`.

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/webhooks/` | 201 | API-Key | Crear webhook. Body: `nombre`, `url`, `eventos[]`. Devuelve `secret` una sola vez. |
| `GET` | `/api/v1/webhooks/` | 200 | API-Key | Listar webhooks de la empresa. |
| `GET` | `/api/v1/webhooks/{id}/` | 200 | API-Key | Detalle de webhook. |
| `PATCH` | `/api/v1/webhooks/{id}/` | 200 | API-Key | Actualizar nombre, url, eventos, activo. |
| `DELETE` | `/api/v1/webhooks/{id}/` | 204 | API-Key | Eliminar webhook. |
| `GET` | `/api/v1/webhooks/{id}/entregas/` | 200 | API-Key | Listar entregas (historial de intentos), paginado. |

### 11.13 Secuencias (Onboarding)

**Autenticación:** API-Key con scope `empresa:onboarding`.  
Registra los rangos de e-NCF asignados por la DGII para la empresa. Se usa al activar una empresa por primera vez.

| Método | URL | Status | Permiso | Descripción |
|--------|-----|--------|---------|-------------|
| `POST` | `/api/v1/secuencias/` | 201 / 403 | API-Key (scope `empresa:onboarding`) | Registrar rangos de e-NCF. Body: `secuencias[]` con `tipo_ecf`, `desde`, `hasta`, `volumen`. Valida que el volumen total no exceda `plan.limite_comprobantes`. Bloquea si la empresa tiene deuda pendiente (`onboarding_bloqueado`). |

Ejemplo de body:
```json
{
  "secuencias": [
    {"tipo_ecf": 31, "desde": "E310000000001", "hasta": "E310000010000", "volumen": 10000},
    {"tipo_ecf": 32, "desde": "E320000000001", "hasta": "E320000005000", "volumen": 5000}
  ]
}
```

### 11.14 Códigos de error comunes (endpoints actuales)

| Status | Cuándo | Ejemplo |
|--------|--------|---------|
| 400 | Validación de campos fallida | `{"rnc_cedula": ["RNC/Cédula debe ser 9 (RNC) u 11 (Cédula) dígitos."]}` |
| 400 | `referencia` faltante en pago no-EFECTIVO | `{"referencia": ["Referencia obligatoria si el método no es EFECTIVO."]}` |
| 400 | Password actual incorrecta | `{"password_actual": ["Contraseña actual incorrecta."]}` |
| 401 | Sin API-Key o JWT | `{"detail": "Authentication credentials were not provided."}` |
| 403 | API-Key inválida, revocada o sin scope | `{"detail": "Invalid API key."}` |
| 403 | API-Key sin IP permitida | `{"detail": "IP not allowed for this API key."}` |
| 404 | Recurso no existe (otra empresa o ID inválido) | `{"detail": "Not found."}` |
| 409 | Conflicto: cliente duplicado en la empresa | `{"rnc_cedula": ["Ya existe un cliente con este RNC/Cédula."]}` |
| 500 | Error interno del servidor | `{"detail": "Internal server error."}` |