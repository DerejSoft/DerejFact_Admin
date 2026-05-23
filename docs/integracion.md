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
- `secuenciales/`
- `secuenciales/{id}/preview/`
- `secuenciales/{id}/bloquear/`
- `secuenciales/{id}/desbloquear/`
- `pagos/`
- `pagos/{id}/actualizar_confirmacion/` (NUEVO)
- `pagos/{id}/confirmar/` (deprecated, usar actualizar_confirmacion)
- `pagos/{id}/rechazar/`
- `pagos/historial/`

Rutas que hoy estan vacias o no implementadas:

- `comprobantes/`
- `dgii/`
- `webhooks/`

Si quieres probar en Postman, concentrate en las rutas de arriba. Las otras no te van a responder porque aun no tienen vistas.

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

### 4.9 Crear secuencial

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

### 4.10 Pagos (NUEVO FLUJO)

#### ⚠️ IMPORTANTE: POST deshabilitado

**Ya NO se pueden crear pagos manualmente** via POST. Los pagos se generan automáticamente 15 días antes del vencimiento de la suscripción.

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
      "fecha_corte": 15,
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

**Confirmar pago (NUEVO ENDPOINT):**

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
- `monto` (viene del plan)
- `moneda`
- `plan`
- `empresa`
- `suscripcion`
- `fecha_pago`
- `fecha_corte`

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

### Listados generales

```http
GET /api/v1/planes/
GET /api/v1/suscripciones/
GET /api/v1/paquetes/
GET /api/v1/api-keys/
GET /api/v1/secuenciales/
GET /api/v1/pagos/
```

## 6. Lo que no debes probar todavia

No pierdas tiempo en estos endpoints porque el codigo actual no tiene vistas reales:

- `POST /api/v1/comprobantes/emitir/`
- `POST /api/v1/comprobantes/nota-credito/`
- `POST /api/v1/comprobantes/nota-debito/`
- `GET /api/v1/comprobantes/{id}/`
- cualquier ruta de `dgii/`
- cualquier ruta de `webhooks/`

Esas rutas aparecen en la documentacion vieja, pero aun no existen en el proyecto.

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
10. **[AUTOMÁTICO]** Esperar a que la tarea de Celery cree el pago (00:00 diariamente) O hacer request manual:
    ```bash
    python manage.py shell
    from apps.pagos.tasks import generar_pagos_automaticos
    generar_pagos_automaticos()
    ```
11. `GET /api/v1/pagos/` - verás el pago creado automáticamente.
12. `PATCH /api/v1/pagos/{id}/actualizar_confirmacion/` - confirmar con método de pago + referencia.
13. Verificar que se actualizó suscripción, paquete e historial.

## 8. [NUEVO] Cambios en el Flujo de Pagos (21 mayo 2026)

### ¿Qué cambió?

Se refactorizó completamente el sistema de pagos para alinearse con el modelo real del negocio:

**ANTES:**
- Pagos se creaban manualmente via POST
- Monto era editable
- Flujo confuso (crear → confirmar → pagar)

**AHORA:**
- Pagos se generan **automáticamente** 15 días antes del vencimiento
- Monto es **read-only** (viene del plan)
- Flujo claro: ver pagos pendientes → confirmar método de pago → transacción completada

### Generación Automática

**Tarea Celery Beat:**
- Se ejecuta: **Diariamente a las 00:00**
- Busca: Suscripciones que vencen en los próximos 15 días
- Crea: Pago(estado=PENDIENTE, monto=plan.precio)
- Valida: No hay otros pagos PENDIENTES simultáneamente (no adelantos)

**Para probar manualmente:**
```bash
python manage.py shell
from apps.pagos.tasks import generar_pagos_automaticos
resultado = generar_pagos_automaticos()
print(resultado)
# {"status": "success", "pagos_creados": 2, "errores": 0, "total_procesadas": 5}
```

### Estados de Pago

| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | Creado automáticamente, esperando confirmación de método de pago |
| `CONFIRMADO` | Método de pago confirmado, suscripción activada, paquete generado |
| `RECHAZADO` | Rechazado manualmente por admin |

### Validaciones Nuevas

1. **Referencia obligatoria para no-EFECTIVO**
   - Si `metodo_pago` = TRANSFERENCIA/DEPOSITO/CHEQUE → `referencia` es OBLIGATORIO
   - Error 400 si no se proporciona

2. **No adelantos simultáneos**
   - No puede haber 2+ pagos PENDIENTES del mismo cliente
   - Previene confusión de múltiples deudas

3. **Monto inmutable**
   - No se puede cambiar el monto
   - Viene del plan contratado
   - Garantiza integridad financiera

### Campos Read-Only (No editable)

```
- id
- monto (viene del plan)
- moneda
- plan
- empresa
- suscripcion
- fecha_pago
- fecha_corte
- estado
- confirmado_por
- fecha_confirmacion
- creado_at
- actualizado_at
```

### Campos Editables

Solo al confirmar pago:
```
- metodo_pago (EFECTIVO, TRANSFERENCIA, DEPOSITO, CHEQUE, OTRO)
- referencia (Nº comprobante/transferencia)
- observaciones (opcional)
```

### Impacto en Integración

**Para POS / Integraciones:**
- ✅ No necesita crear pagos (se crean automáticos)
- ✅ Solo hace GET para ver qué debe pagar
- ✅ Hace PATCH para confirmar cómo pagó
- ✅ Monto nunca cambia (fijo del plan)

**Para Admin Dashboard:**
- ✅ Filtrar por estado: `?estado=PENDIENTE|CONFIRMADO|RECHAZADO`
- ✅ Ver historial completo: `/pagos/historial/?empresa=<uuid>`
- ✅ Opción de rechazar pago (solo PENDIENTE)

## 9. Resumen de JSON que realmente necesitas

- Login JWT: `email` + `password`
- Cambio de clave: `password_actual` + `password_nueva`
- Empresa: `rnc`, `razon_social`, `nombre_comercial`, `ambiente`, `estado`, `activa`
- Plan: `nombre`, `descripcion`, `limite_comprobantes`, `precio_mensual`, `precio_anual`, `ciclo_disponible`, `dias_gracia`, `tipos_ecf_permitidos`, `activo`, `orden`
- Suscripcion: `empresa`, `plan`, `ciclo`, `estado`, `fecha_inicio`, `fecha_renovacion`, `precio_pagado`
- Paquete: `empresa`, `suscripcion`, `plan`, `total_comprobantes`, `comprobantes_usados`, `estado`, `origen`, `fecha_vencimiento`
- API Key: `empresa`, `nombre`, `scopes`, `allowed_ips`, `rate_limit_cantidad`, `rate_limit_ventana`, `expira_at`, `activa`
- Secuencial: `empresa`, `tipo_ecf`, `ultimo_numero`, `minimo_asignado`, `maximo_asignado`, `bloqueado`, `motivo_bloqueo`
- **[NUEVO] Confirmar Pago**: `metodo_pago`, `referencia` (si no es EFECTIVO), `observaciones` (opcional)
- Pago: `empresa`, `suscripcion`, `plan`, `monto`, `moneda`, `metodo_pago`, `referencia`, `fecha_pago`, `fecha_corte`, `observaciones`

## 9. Nota importante

La API Key no usa `Bearer`. Para POS siempre es:

```http
Authorization: Api-Key <token_completo>
```

Y para el panel humano siempre es:

```http
Authorization: Bearer <jwt_access>
```