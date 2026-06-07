# Plan de Ejecución: DerejFactAPI
> Estrategia: Seguridad → Estabilidad → Construcción limpia
> Fecha base: 2 de junio de 2026
> Referencia: `ARCHITECTURE.md` v1.0.0 + Hallazgos del análisis

---

## Progreso General

| Fase | Avance |
|:-----|:------:|
| Fase 0 — Seguridad y Estabilidad | ✅ 6/6 |
| Fase 1a — Infraestructura (Scopes + Onboarding) | ✅ 2/2 |
| Fase 1b — Comprobantes CRUD | ✅ 4/4 |
| Fase 1c — Parches de Validación + Blindaje | ✅ 4/4 |
| Fase 2 — Webhooks y Notificaciones | ✅ 9/9 |
| Fase 3 — Deuda Técnica | ✅ 6/6 |
| Fase 4 — Correcciones de Integración | 📋 0/3 |
| **Total** | **✅ 31/34** |

---

## Fase 0 — Seguridad y Estabilidad (6/6)
> **Objetivo:** Dejar el sistema existente sin bugs que rompan acceso, expongan datos o bloqueen operaciones. Nada nuevo se construye aquí.

- [x] 0.1 Permisos de Pagos (`is_superuser` → `rol` + fix de import `Usuario` integrado aquí)

  **Problema:** `pagos/permissions.py` usa `request.user.is_superuser` (campo Django base), que siempre es `False` en el modelo custom `Usuario`. Ningún SuperAdmin puede confirmar pagos.

  **Corrección:**
  ```python
  # apps/pagos/permissions.py
  from apps.users.models import Usuario  # ← fix import

  return (
      request.user
      and request.user.is_authenticated
      and request.user.rol == Usuario.ROL_SUPERADMIN
  )
  ```

- [x] 0.2 `ClienteViewSet` con JWT e inyección de `_get_empresa()`

  **Problema:** `get_queryset()` filtra `empresa=request.user`. Con JWT, `request.user` es `Usuario`, no `Empresa`. El panel admin recibe resultados vacíos o errores 500.

  **Corrección:** Detectar el tipo de autenticación y resolver la empresa en ambos casos:
  ```python
  def _get_empresa(self):
      user = self.request.user
      if isinstance(user, Empresa):      # API Key
          return user
      return user.empresa                 # JWT → Usuario.empresa FK

  def get_queryset(self):
      return Cliente.objects.filter(empresa=self._get_empresa())
  ```
  Aplicar el mismo patrón en `perform_create()` y `perform_update()`.

- [x] 0.3 `RecoverPasswordView` (eliminar `temp_password` de la respuesta HTTP)

  **Problema:** La contraseña temporal viaja en texto plano en la respuesta HTTP. Riesgo de exposición en logs de proxy, CDN y navegador.

  **Corrección:** Eliminar `temp_password` de la respuesta. En desarrollo, loggear a consola con nivel `DEBUG` únicamente:
  ```python
  # Solo en entorno DEBUG
  if settings.DEBUG:
      logger.debug("[DEV ONLY] temp_password: %s", temp_password)

  return Response({"mensaje": "Si el correo existe, recibirás instrucciones."})
  ```

- [x] 0.4 `ValueError` → `ValidationError` en modelos append-only de audit/dgii

  **Problema:** `DGIILog.save()` y `AuditLog.save()` lanzan `ValueError` (→ HTTP 500). `Comprobante.save()` lanza `ValidationError` (→ HTTP 400). Ambos deben ser consistentes.

  **Corrección:** Cambiar `ValueError` a `ValidationError` de Django en `DGIILog` y `AuditLog`:
  ```python
  from django.core.exceptions import ValidationError
  raise ValidationError("Los registros de auditoría no pueden modificarse.")
  ```

- [x] 0.5 Activar middleware de auditoría + corregir detección de header `Api-Key`

  **Problema:** `audit/middleware.py` está comentado en `core/settings/base.py` líneas 90-91. Sin él, ninguna acción crítica queda registrada. Además, el `TenantMiddleware` busca `Bearer` para identificar API Keys, pero `ApiKeyAuthentication` usa `Api-Key`.

  **Corrección:**
  1. Descomentar en `MIDDLEWARE`.
  2. Corregir el bug de detección de API Key en `TenantMiddleware`:
  ```python
  auth_header = request.META.get("HTTP_AUTHORIZATION", "")
  if auth_header.startswith("Api-Key "):
      # lógica para API Key
  elif auth_header.startswith("Bearer "):
      # lógica para JWT
  ```

- [x] 0.6 Rotar credenciales expuestas en el `.env` local hacia variables de entorno seguras

  **Problema:** `SECRET_KEY`, `DB_PASSWORD`, `FERNET_KEY`, `SENTRY_DSN` y `DGII_CERT_PASSWORD` están en disco como texto plano. Si bien no están versionados (`.gitignore`), cualquier acceso al servidor los expone.

  **Acciones:**
  1. Generar nuevo `SECRET_KEY` con `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`.
  2. Cambiar `DB_PASSWORD` en PostgreSQL y en `.env`.
  3. Regenerar `FERNET_KEY` (implica re-cifrar todos los PINs almacenados con la clave anterior).
  4. Invalidar y regenerar `SENTRY_DSN`.
  5. En producción, mover todas estas variables a variables de entorno del sistema operativo Ubuntu, no a `.env`.

---

## Fase 1a — Infraestructura (Scopes + Onboarding) (2/2)
> **Objetivo:** Establecer las guardas de seguridad y el onboarding antes de construir comprobantes. Sin scopes, cualquier API Key accessa todo. Sin onboarding, no hay secuencias asignadas.

- [x] 1.1 Validación de Scopes en `ApiKeyAuthentication` (implementación con regex, no rutas fijas)

  **Por qué primero:** Todo lo que se construya en comprobantes y onboarding depende de que los scopes funcionen. Si no se validan, cualquier API Key puede llamar a cualquier endpoint.

  **Problema del plan original:** Usar `SCOPE_MAP` con tuplas `(method, path)` no funciona para rutas con parámetros (ej: `GET /api/v1/comprobantes/{uuid}/`).

  **Implementación corregida en `api_keys/authentication.py`:**
  ```python
  import re

  SCOPE_PATTERNS = [
      (re.compile(r"^POST /api/v1/comprobantes/$"),            "comprobantes:crear"),
      (re.compile(r"^GET  /api/v1/comprobantes/"),             "comprobantes:consultar"),
      (re.compile(r"^GET  /api/v1/secuenciales/"),             "secuenciales:consultar"),
      (re.compile(r"^POST /api/v1/secuencias/$"),              "empresa:onboarding"),
  ]

  def _validar_scope(self, api_key, request):
      ruta = f"{request.method} {request.path}"
      for pattern, scope_requerido in SCOPE_PATTERNS:
          if pattern.match(ruta):
              if scope_requerido not in (api_key.scopes or []):
                  raise AuthenticationFailed(
                      f"Scope '{scope_requerido}' requerido para este endpoint."
                  )
              break
  ```

  **Agregar scope faltante al modelo:**
  ```python
  # api_keys/models.py — SCOPES_DISPONIBLES
  ("empresa:onboarding", "Onboarding y carga de certificados"),
  ```

  **Renombrar scope en datos:**
  - Documentar que `comprobantes:emision` (doc) = `comprobantes:crear` (código). Usar `comprobantes:crear` como nombre canónico.

- [x] 1.2 Endpoint consolidado de Onboarding `POST /api/v1/secuencias/` (SaaS Guard)

  **Scope requerido:** `empresa:onboarding`

  **Serializer `sequences/serializers.py`:**
  ```python
  class SecuenciaItemSerializer(serializers.Serializer):
      desde = serializers.CharField(max_length=13)
      hasta = serializers.CharField(max_length=13)

      def validate(self, attrs):
          # Valida formato E + 2 dígitos tipo + 10 dígitos secuencial
          if not re.match(r"^E\d{12}$", attrs["desde"]):
              raise ValidationError("Formato inválido en 'desde'. Debe ser E + 12 dígitos.")
          if not re.match(r"^E\d{12}$", attrs["hasta"]):
              raise ValidationError("Formato inválido en 'hasta'. Debe ser E + 12 dígitos.")
          # Extrae tipo_ecf de posiciones [1:3]
          if attrs["desde"][1:3] != attrs["hasta"][1:3]:
              raise ValidationError("'desde' y 'hasta' deben ser del mismo tipo e-CF.")
          # Calcula volumen
          desde_num = int(attrs["desde"][3:])
          hasta_num = int(attrs["hasta"][3:])
          if desde_num > hasta_num:
              raise ValidationError("'desde' no puede ser mayor que 'hasta'.")
          attrs["volumen"] = hasta_num - desde_num + 1
          attrs["tipo_ecf"] = int(attrs["desde"][1:3])
          return attrs

  class OnboardingSerializer(serializers.Serializer):
      actualizar_certificado = serializers.BooleanField(default=False)
      archivo_p12 = serializers.FileField(required=False, allow_null=True)
      pin_texto_plano = serializers.CharField(required=False, allow_null=True, write_only=True)
      secuencias = SecuenciaItemSerializer(many=True, min_length=1)

      def validate(self, attrs):
          if attrs.get("actualizar_certificado"):
              if not attrs.get("archivo_p12") or not attrs.get("pin_texto_plano"):
                  raise ValidationError(
                      "archivo_p12 y pin_texto_plano son obligatorios "
                      "para actualizar el certificado."
                  )
          return attrs
  ```

  **Vista `sequences/views.py` — Lógica del SaaS Guard:**
  ```
  1. Deserializar y validar formato de cada secuencia
  2. Calcular volumen_total = Σ(hasta[3:] - desde[3:] + 1) para cada ítem
  3. Obtener suscripción ACTIVA de la empresa → plan.limite_comprobantes
  4. Si volumen_total > limite_comprobantes → 403 Forbidden con mensaje claro
  5. Si actualizar_certificado=True → cifrar PIN con Fernet → guardar .p12 y pin_cifrado en CertificadoDigital
  6. Verificar que la empresa no tenga onboarding_bloqueado=True (deuda pendiente)
  7. Registrar cada rango en tabla Secuencial (tipo_ecf, minimo_asignado, maximo_asignado, ultimo_numero=minimo-1)
  8. Retornar 201 Created con resumen de rangos registrados
  ```

---

## Fase 1b — Comprobantes CRUD (4/4)
> **Objetivo:** Construir la app `comprobantes` completa. Al finalizar, el POS puede emitir su primer e-CF real.

- [x] 1.3 Serializers (motor matemático ROUND_HALF_UP + mapeo `ItemComprobante` → `ComprobanteDetalle`)

  **Archivo:** `apps/comprobantes/serializers.py`

  **Nota:** El modelo real es `ComprobanteDetalle`, no `ItemComprobante`. Corregido aquí.

  ```python
  class ComprobanteDetalleSerializer(serializers.ModelSerializer):
      class Meta:
          model = ComprobanteDetalle
          fields = [
              'numero_linea', 'indicador_facturacion', 'nombre_item',
              'cantidad', 'unidad_medida', 'precio_unitario_item',
              'descuento_monto', 'monto_item'
          ]

      def validate(self, attrs):
          # §6.2 DGII: Indicador 0 no soportado en Fase 1
          if attrs.get('indicador_facturacion') == 0:
              raise ValidationError(
                  "El Indicador de Facturación '0' (No Facturable) "
                  "no está soportado en esta versión corporativa."
              )

          # MontoItem = ROUND_HALF_UP((Cantidad × Precio) - Descuento, 2)
          calculado = (
              (attrs['cantidad'] * attrs['precio_unitario_item'])
              - attrs.get('descuento_monto', 0)
          ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
          if calculado != attrs['monto_item']:
              raise ValidationError(
                  {'monto_item': f"Valor incorrecto. Esperado: {calculado}"}
              )
          return attrs

  class ComprobanteCreateSerializer(serializers.ModelSerializer):
      detalles = ComprobanteDetalleSerializer(many=True, write_only=True)
      emitir_inmediatamente = serializers.BooleanField(default=True, write_only=True)

      class Meta:
          model = Comprobante
          fields = '__all__'
          read_only_fields = [
              'id', 'encf', 'estado', 'creado_at', 'actualizado_at',
              'codigo_seguridad', 'xml_firmado'
          ]

      def validate(self, attrs):
          # §8 DGII — Máximos de repeticiones por sección
          detalles = attrs.get('detalles', [])
          tipo = attrs.get('tipo_ecf')
          monto = attrs.get('monto_total', Decimal('0'))
          max_lineas = self._limite_lineas_por_tipo(tipo, monto)
          if len(detalles) > max_lineas:
              raise ValidationError({
                  'detalles': (
                      f"Tipo e-CF {tipo} permite máximo {max_lineas} líneas. "
                      f"Recibidas: {len(detalles)}."
                  )
              })

          self._validar_tipo(attrs)
          self._validar_comprador(attrs)
          self._validar_nota_modificacion(attrs)
          self._validar_totales(attrs)
          return attrs

      def _limite_lineas_por_tipo(self, tipo, monto):
          """§6.3 DGII — Límite de líneas según tipo e-CF y monto."""
          if tipo == 32:
              if monto >= Decimal('250000.00'):
                  return 1000
              return 10000
          return 100

      def _validar_totales(self, attrs):
          """§7 DGII — Recalcula bases e ITBIS línea por línea y verifica contra encabezado.
          Fórmula: MontoTotal = MontoGravadoTotal + MontoExento + TotalITBIS + MontoImpuestoAdicional
          """
          TASAS = {1: Decimal('0.18'), 2: Decimal('0.16'), 3: Decimal('0.00')}
          monto_gravado = Decimal('0')
          monto_exento  = Decimal('0')
          total_itbis   = Decimal('0')
          monto_impuesto_adicional = attrs.get('monto_impuesto_adicional', Decimal('0'))

          for item in attrs.get('detalles', []):
              monto = item['monto_item']
              indicador = item['indicador_facturacion']
              if indicador in TASAS:
                  tasa = TASAS[indicador]
                  if attrs.get('indicador_monto_gravado') == 1:
                      base = (monto / (1 + tasa)).quantize(
                          Decimal('0.01'), rounding=ROUND_HALF_UP
                      )
                  else:
                      base = monto
                  itbis = (base * tasa).quantize(
                      Decimal('0.01'), rounding=ROUND_HALF_UP
                  )
                  monto_gravado += base
                  total_itbis   += itbis
              elif indicador == 4:
                  monto_exento += monto

          total_calculado = (
              monto_gravado + monto_exento + total_itbis + monto_impuesto_adicional
          ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
          if total_calculado != attrs['monto_total']:
              raise ValidationError({
                  'monto_total': (
                      f"Sumatoria calculada ({total_calculado}) no coincide "
                      f"con monto_total declarado ({attrs['monto_total']})."
                  )
              })

      def _validar_comprador(self, attrs):
          tipo = attrs.get('tipo_ecf')
          if tipo == 31:
              if not attrs.get('rnc_comprador') \
                      or not attrs.get('razon_social_comprador'):
                  raise ValidationError(
                      "Tipo 31 requiere rnc_comprador y razon_social_comprador."
                  )
          if tipo == 32:
              monto = attrs.get('monto_total', Decimal('0'))
              if monto >= Decimal('250000.00'):
                  if not attrs.get('rnc_comprador') \
                          and not attrs.get('cedula_comprador'):
                      raise ValidationError(
                          "Tipo 32 con monto ≥ RD$250,000 requiere "
                          "rnc_comprador o cedula_comprador."
                      )
              else:
                  if not attrs.get('rnc_comprador'):
                      attrs['razon_social_comprador'] = 'CONSUMIDOR FINAL'

      def _validar_nota_modificacion(self, attrs):
          if attrs.get('tipo_ecf') in [33, 34]:
              ncf_mod = attrs.get('ncf_modificado')
              if not ncf_mod:
                  raise ValidationError("Tipos 33/34 requieren ncf_modificado.")
              try:
                  original = Comprobante.objects.get(
                      encf=ncf_mod,
                      empresa=self.context['request'].user,
                      estado='ACEPTADO'
                  )
              except Comprobante.DoesNotExist:
                  raise ValidationError(
                      "El ncf_modificado no existe o no está en estado ACEPTADO."
                  )
              if attrs.get('tipo_ecf') == 34:
                  if attrs.get('monto_total', Decimal('0')) > original.monto_total:
                      raise ValidationError(
                          "Nota de Crédito no puede superar el "
                          "monto del e-CF original."
                      )

      def _validar_tipo(self, attrs):
          TIPOS_PERMITIDOS = [31, 32, 33, 34, 41]
          if attrs.get('tipo_ecf') not in TIPOS_PERMITIDOS:
              raise ValidationError(
                  f"Tipo de e-CF no permitido en esta fase. "
                  f"Permitidos: {TIPOS_PERMITIDOS}"
              )
  ```

- [x] 1.4 Service + ViewSet (flujo POS: guardar → reservar e-NCF → mutar a `PENDIENTE` en el mismo bloque atómico)

  **Archivo:** `apps/comprobantes/services.py`

  **Nota de diseño:** El comprobante se guarda en DB primero (BORRADOR) para tener PK, luego se firma, luego se actualiza a estado PENDIENTE. Esto evita el problema de firmar sin ID.

  **Fórmula ValorPagar (§7 DGII):** `ValorPagar = MontoTotal - MontoAvancePago ± SaldoAnterior`
  Este campo se calcula en el service y se incluye en la respuesta síncrona y en el XML.

  ```
  create_comprobante(data, empresa):
    1. Verificar suscripción ACTIVA y Paquete con balance > 0
       → consumir_comprobante() con select_for_update
       → Si falla → 403 "Cuota agotada"
    2. Obtener próximo e-NCF de sequences.services.obtener_proximo_encf()
       → Si agotado → marcar onboarding_bloqueado=True → 403 "Secuencia agotada"
    3. Calcular ValorPagar = MontoTotal - MontoAvancePago ± SaldoAnterior
    4. Guardar Comprobante en estado BORRADOR con e-NCF asignado (tiene PK ahora)
    5. Guardar ComprobanteDetalle (bulk_create)
    6. Invocar dgii.services.firmar_xml_sincrono(comprobante)
       → Retorna (xml_string, codigo_seguridad)
       → Si ERROR → revertir consumo → borrar comprobante → 503 con mensaje
    7. Actualizar comprobante: xml_firmado, codigo_seguridad, estado → PENDIENTE
    8. Disparar tarea Celery: enviar_a_dgii.delay(comprobante.id)
    9. Retornar respuesta síncrona mínima:
       {uuid, e_ncf, server_timestamp, codigo_seguridad, valor_pagar, sequence_status: "consumed"}
  ```

  **Vista `apps/comprobantes/views.py`:**
  ```python
  class ComprobanteViewSet(viewsets.ModelViewSet):
      authentication_classes = [ApiKeyAuthentication, JWTAuthentication]

      def create(self, request):
          serializer = ComprobanteCreateSerializer(
              data=request.data, context={'request': request}
          )
          serializer.is_valid(raise_exception=True)
          empresa = (
              request.user
              if isinstance(request.user, Empresa)
              else request.user.empresa
          )
          resultado = ComprobantesService.create_comprobante(
              data=serializer.validated_data,
              empresa=empresa,
          )
          return Response(resultado, status=status.HTTP_201_CREATED)

      def partial_update(self, request, pk=None):
          comprobante = self.get_object()
          if comprobante.estado != 'BORRADOR':
              return Response(
                  {"detail": "Solo se puede modificar un comprobante en estado BORRADOR."},
                  status=status.HTTP_400_BAD_REQUEST
              )
          # ... actualización parcial normal
  ```

- [x] 1.5 Conectar consumo de balance del paquete al flujo síncrono (`consumir_comprobante()` + `revertir_consumo()`)

  **Problema del hallazgo 5.6:** `consumir_comprobante()` existe en `PaqueteComprobantes` pero nunca se llama.

  **Corrección:** Llamarlo explícitamente en `ComprobantesService.create_comprobante()` paso 1 (ver 1.4 arriba). Incluir `revertir_consumo()` en el bloque `except` si la firma falla para no quemar un comprobante del paquete del cliente sin haberlo emitido.

- [x] 1.6 Generar y ejecutar migraciones de base de datos para los nuevos esquemas y relaciones

  **Migraciones necesarias:**
  - `api_keys` — Agregar scope `empresa:onboarding` a `SCOPES_DISPONIBLES`
  - `empresas` — Agregar campo `onboarding_bloqueado` a `Empresa`
  - `sequences` — Crear modelo `NumeroViciado`
  - `comprobantes` — Si se decide cambiar `PENDIENTE` por `EN_COLA`, agregar estado

---

## Fase 1c — Parches de Validación + Blindaje (4/4)
> **Objetivo:** Cerrar agujeros de validación y blindar la máquina de estados del e-CF.

- [x] 1.7 Control de e-NCF viciados (creación de modelo e infraestructura `NumeroViciado`)

  **Agregar a `sequences/models.py`:**
  ```python
  class NumeroViciado(models.Model):
      """Registro inmutable de e-NCF que no pueden reutilizarse tras un rechazo DGII."""
      empresa    = models.ForeignKey(Empresa, on_delete=models.PROTECT)
      encf       = models.CharField(max_length=13)
      motivo     = models.TextField()
      viciado_at = models.DateTimeField(auto_now_add=True)

      class Meta:
          unique_together = [('empresa', 'encf')]
  ```

  Invocar `NumeroViciado.objects.create(...)` en el worker de Celery cuando la DGII retorna `RECHAZADO`.

- [x] 1.8 Corregir lógica de umbral de factura de consumo E32 (validar cédula + corregir bloque >= 250k)

  **Problema del hallazgo 5.4:** El código actual:
  1. Solo valida `rnc_comprador`, ignora `cedula_comprador`
  2. Cuando monto ≥ 250K y no hay RNC: asigna "CONSUMIDOR FINAL" Y lanza error a la vez

  **Corrección en `Comprobante.clean()` y serializer:**
  ```python
  if self.tipo_ecf == 32:
      monto_total = self.monto_total or Decimal("0.00")
      if monto_total >= Decimal("250000.00"):
          if not self.rnc_comprador and not self.cedula_comprador:
              errores["rnc_comprador"] = (
                  "E32 ≥ RD$250,000 requiere RNC/Cédula del comprador."
              )
      elif not self.rnc_comprador:
          self.razon_social_comprador = "CONSUMIDOR FINAL"
  ```

- [x] 1.10 Validación de consistencia del `MontoTotal` para Notas de Crédito E34 vs original

  **Problema del hallazgo 5.3:** No existe validación de que `MontoTotal` de la nota de crédito no exceda el monto del e-CF original.

  **Corrección:** Ya incluida en `_validar_nota_modificacion()` del serializer (sección 1.3). Agregar también en `Comprobante.clean()` como segunda línea de defensa.

- [x] 1.11 Implementar `validate_transition()` en el modelo para blindar la máquina de estados del e-CF

  **Problema del hallazgo 4.3:** No existe `validate_transition()`. Los estados se pueden mutar a cualquier valor sin control.

  **Implementación en `comprobantes/models.py`:**
  ```python
  TRANSICIONES_PERMITIDAS = {
      "BORRADOR":    {"PENDIENTE"},
      "PENDIENTE":   {"PROCESANDO"},
      "PROCESANDO":  {"ACEPTADO", "RECHAZADO", "ERROR", "CONTINGENCIA"},
      "ACEPTADO":    {"ANULADO"},       # solo vía nota de crédito
      "RECHAZADO":   {"BORRADOR"},      # corregir y re-emitir
      "ERROR":       {"PENDIENTE"},     # reintentar
      "CONTINGENCIA":{"PENDIENTE"},     # reintentar automático
      "ANULADO":     set(),             # terminal
  }

  def save(self, *args, **kwargs):
      if self.pk:
          try:
              original = Comprobante.objects.values("estado").get(pk=self.pk)
              if self.estado != original["estado"]:
                  if self.estado not in TRANSICIONES_PERMITIDAS.get(
                          original["estado"], set()):
                      raise ValidationError(
                          f"Transición inválida: "
                          f"{original['estado']} → {self.estado}"
                      )
          except Comprobante.DoesNotExist:
              pass
      super().save(*args, **kwargs)
  ```

---

## Fase 2 — Webhooks y Notificaciones (9/9)
> **Objetivo:** Cerrar el ciclo de vida del comprobante. El POS se entera del veredicto fiscal. El humano recibe correos relevantes.

- [x] 2.1 Webhook Serializers (esquema de eventos externos)

  **Archivo:** `webhooks/serializers.py`
  ```python
  class WebhookSerializer(serializers.ModelSerializer):
      class Meta:
          model = Webhook
          fields = ['id', 'url', 'activo', 'creado_at']
          read_only_fields = ['id', 'creado_at']

  class WebhookEntregaSerializer(serializers.ModelSerializer):
      class Meta:
          model = WebhookEntrega  # ← nombre real del modelo
          fields = ['id', 'evento', 'estado', 'intentos',
                    'ultimo_http_status', 'error_mensaje']
  ```

- [x] 2.2 Webhook Views (controladores CRUD + historial de entregas)

  **Archivo:** `webhooks/views.py`
  ```python
  class WebhookViewSet(viewsets.ModelViewSet):
      # CRUD para configurar URL del webhook por empresa
      # GET    /api/v1/webhooks/           → lista webhooks de la empresa
      # POST   /api/v1/webhooks/           → registrar nueva URL
      # GET    /api/v1/webhooks/{id}/      → detalle del webhook
      # PATCH  /api/v1/webhooks/{id}/      → actualizar webhook
      # DELETE /api/v1/webhooks/{id}/      → eliminar webhook
      # GET    /api/v1/webhooks/{id}/entregas/ → historial de entregas
  ```

- [x] 2.3 Webhook Services + Tasks (motor de reintentos asíncronos con firma HMAC-SHA256)

  **Archivo:** `webhooks/services.py`
  ```python
  def disparar_webhook(empresa, evento, payload):
      webhooks = Webhook.objects.filter(empresa=empresa, activo=True)
      for wh in webhooks:
          entregar_webhook.delay(wh.id, evento, payload)

  @shared_task(bind=True, max_retries=5)
  def entregar_webhook(self, webhook_id, evento, payload):
      # HTTP POST con HMAC-SHA256 en header X-DerejSoft-Signature
      # Si no responde 200 → self.retry(countdown=backoff[self.request.retries])
      # Registrar WebhookEntrega con estado y respuesta HTTP
  ```

- [x] 2.4 Disparar eventos de webhooks desde `dgii/tasks.py` al pasar a estados terminales

  **Nota:** Usar solo eventos que existen en `Webhook.EVENTOS_DISPONIBLES`:
  - `comprobante.aceptado`
  - `comprobante.rechazado`
  - `comprobante.anulado`
  - `paquete.agotado`
  - `certificado.por_vencer`

  ```python
  # Tras actualizar estado del comprobante:
  disparar_webhook(empresa, "comprobante.aceptado",  {...})
  disparar_webhook(empresa, "comprobante.rechazado", {...})
  ```

- [x] 2.5 App de notificaciones (configuración base de models + services aislados)

  **Estructura mínima:**
  ```
  apps/notificaciones/
    __init__.py
    apps.py
    models.py        → LogNotificacion (registro de envíos)
    services.py      → enviar_correo(destinatario, plantilla, contexto)
    tasks.py         → tareas Celery para envío asíncrono
    templates/
      notificaciones/
        pago_confirmado.html
        certificado_por_vencer.html
        balance_bajo.html
        suscripcion_por_vencer.html
  ```

- [x] 2.6 Tasks de distribución de notificaciones y renderizado de templates HTML

  | Tarea Celery | Disparada por | Contenido |
  |:---|:---|:---|
  | `enviar_recibo_pago` | `pagos` al confirmar | PDF del e-CF de DerejSoft adjunto |
  | `alertar_balance_bajo` | `suscripciones` Celery Beat diario | "Quedan N comprobantes (X%)" |
  | `alertar_certificado_vencimiento` | `empresas` Celery Beat diario | "Tu .p12 vence en N días" |
  | `alertar_suscripcion_vencimiento` | `suscripciones` Celery Beat diario | "Tu plan vence el DD/MM/YYYY" |

- [x] 2.7 Completar lógica interna de la tarea cron `notificar_pagos_proximos`

  **Problema del hallazgo 10.12:** Actualmente es `pass`.

  **Corrección:** Reemplazar el `pass` actual en `pagos/tasks.py` con la invocación a `notificaciones.tasks.alertar_suscripcion_vencimiento`.

- [x] 2.8 Celery Beat nocturno para rescate automático de comprobantes en `CONTINGENCIA`

  **Agregar a `core/celery.py`:**
  ```python
  "reintentar_contingencia": {
      "task": "dgii.tasks.reintentar_contingencia",
      "schedule": crontab(hour=2, minute=0),   # 2:00 AM diario
  },
  ```

  **Tarea en `dgii/tasks.py`:**
  ```python
  @shared_task(name='dgii.reintentar_contingencia')
  def reintentar_contingencia():
      comprobantes = Comprobante.objects.filter(estado='CONTINGENCIA')
      for c in comprobantes:
          reintentar_envio_ecf.delay(c.id)
  ```

- [x] 2.9 Algoritmo de Backoff exponencial con jitter en la tarea de reintento de envío de e-CF

  **Problema del hallazgo 9.1:** Los valores actuales son fijos sin randomización.

  **Corrección en `dgii/tasks.py`:**
  ```python
  import random

  BACKOFF_BASE = [300, 900, 3600, 14400, 43200]  # segundos: doc original

  def backoff_con_jitter(intento):
      base = BACKOFF_BASE[intento]
      jitter = random.uniform(0, base * 0.1)   # ±10% aleatorio
      return int(base + jitter)
  ```

---

## Fase 3 — Deuda Técnica (6/6)
> **Objetivo:** Pulir la calidad del código antes de abrir a más clientes. No es bloqueante para producción.

- [x] 3.1 Corrección de `CleanModelSerializer` para soportar actualizaciones parciales (`partial=True`)

  **Problema del hallazgo 10.11:** `ModelClass(**attrs)` falla si faltan campos required en PATCH.

  **Corrección en `core/serializers.py`:**
  ```python
  def validate(self, attrs):
      ModelClass = self.Meta.model
      instance = self.instance or ModelClass()
      for field, value in attrs.items():
          setattr(instance, field, value)
      try:
          instance.clean()
      except DjangoValidationError as e:
          if hasattr(e, 'message_dict'):
              raise serializers.ValidationError(e.message_dict)
          raise serializers.ValidationError(e.messages)
      return attrs
  ```

- [x] 3.2 Modificar la firma HMAC de auditoría para incluir estrictamente el `id` y `creado_at`

  **Problema del hallazgo 4.7:** La firma no incluye `id` ni `creado_at`, lo que permite reemplazar un registro completo sin alterar la firma.

  **Corrección en `audit/models.py`:** Agregar ambos campos al payload del HMAC.

- [x] 3.3 Estandarización de Idempotency Key (forzar origen desde el header del POS, no auto-generado por DB)

  **Problema del hallazgo 7:** `default=uuid.uuid4` auto-genera la key, derrotando el propósito.
  - Decisión: cambiar a `null=True, blank=True` (sin default auto) y exigir el valor desde el header `Idempotency-Key` o el body del request.
  - La vista debe validar unicidad antes de procesar.
  - Documentar en el contrato de la API.

- [x] 3.4 Cobertura de pruebas unitarias automatizadas en apps vacías

  Prioridad:
  1. `sequences/tests.py` — SaaS Guard y asignación atómica de e-NCF
  2. `subscriptions/tests.py` — Consumo y reversión de balance
  3. `webhooks/tests.py` — Entrega con reintentos y firma HMAC

- [x] 3.5 Documentación de la arquitectura del entorno `certecf` y los permisos del rol `USUARIO_EMPRESA`

  1. Agregar al `ARCHITECTURE.md` que existe un tercer ambiente `certecf` (certificación DGII) además de `testecf` y `ecf`.
  2. Definir permisos del rol `USUARIO_EMPRESA` (actualmente existe en el modelo pero no está documentado ni tiene controles asociados).

- [x] 3.6 Catálogos DGII como modelos editables vía admin

  **Ubicación:** `dgii/catalogs/models.py`

  **Modelos de referencia (Tablas I, II, III, IV, §10, §22 DGII):**
  ```python
  class Provincia(models.Model):
      codigo = models.CharField(max_length=6, primary_key=True)
      nombre = models.CharField(max_length=100)

  class Municipio(models.Model):
      codigo = models.CharField(max_length=6, primary_key=True)
      provincia = models.ForeignKey(Provincia, on_delete=models.CASCADE)
      nombre = models.CharField(max_length=100)

  class UnidadMedida(models.Model):
      codigo = models.PositiveSmallIntegerField(primary_key=True)
      abreviatura = models.CharField(max_length=10)
      nombre = models.CharField(max_length=100)

  class Moneda(models.Model):
      codigo_iso = models.CharField(max_length=3, primary_key=True)
      nombre = models.CharField(max_length=100)

  class ImpuestoAdicional(models.Model):
      codigo = models.CharField(max_length=3, primary_key=True)
      descripcion = models.CharField(max_length=200)
      tipo = models.CharField(max_length=20)  # PORCENTUAL, ESPECIFICO, ADVALOREM
      tasa = models.DecimalField(max_digits=10, decimal_places=2)

  class FormaPago(models.Model):
      codigo = models.PositiveSmallIntegerField(primary_key=True)
      nombre = models.CharField(max_length=100)
  ```

  **Seed data:** Management command `cargar_catalogos_dgii.py` que inserte todas las tablas desde los documentos DGII.

  **Admin:** Todos los modelos registrados para edición por superadmin cuando DGII actualice códigos o tasas.

---

## Mapa de Dependencias entre Fases

```
Fase 0 (Bugs de seguridad existentes)
  │
  └──> Fase 1a (Scopes → Onboarding)
         │
         └──> Fase 1b (Comprobantes CRUD)
         │         │
         │         └──> Fase 2 (Webhooks → Notificaciones)
         │
         └──> Fase 1c (Parches de validación, paralelo a 1b/2)
         │
         └──> Fase 3 (Deuda técnica, post-MVP)
```

---

---

## Fase 4 — Correcciones de Integración (0/3)
> **Objetivo:** Cerrar gaps de integración entre servicios existentes donde un componente produce un resultado pero otro no lo consume. No se crea lógica nueva, solo se conectan piezas ya escritas.

- [ ] 4.1 Disparar `enviar_recibo_pago` al confirmar un pago

  **Problema:** `_confirmar_pago_internamente` en `apps/pagos/views.py:152` confirma el pago (actualiza suscripción, crea paquete e historial) pero nunca invoca `enviar_recibo_pago.delay(pago.id)`. La tarea y la plantilla HTML existen, pero el recibo nunca se envía.

  **Diagnóstico:**
  - `notificaciones.tasks.enviar_recibo_pago(pago_id)` — definida y funcional
  - `notificaciones/templates/notificaciones/pago_confirmado.html` — plantilla lista
  - Ningún `.delay()` ni `.apply_async()` apunta a esta tarea en todo el código

  **Corrección en `apps/pagos/views.py`:**
  ```python
  from notificaciones.tasks import enviar_recibo_pago

  enviar_recibo_pago.delay(pago.id)
  ```

  **Impacto:** 2 líneas agregadas. Sin breaking changes.

- [ ] 4.2 Endpoint REST `POST /api/v1/tasks/run/` para ejecutar tareas Celery manualmente

  **Problema:** El panel custom no tiene forma de disparar tareas como `generar_pagos_automaticos` sin esperar al cron de Beat o usar el shell manualmente.

  **Especificación:**
  ```
  POST /api/v1/tasks/run/
  Authorization: Bearer <token-superadmin>
  Content-Type: application/json

  {"task": "pagos.generar_pagos_automaticos"}
  ```
  ```json
  {
    "status": "dispatched",
    "task": "pagos.generar_pagos_automaticos",
    "task_id": "a1b2c3d4-..."
  }
  ```

  **Archivos a crear:**

  | Archivo | Contenido |
  |---------|-----------|
  | `apps/tasks/views.py` | `RunTaskView` con `post()` que recibe `task`, valida whitelist, hace `.delay()` |
  | `apps/tasks/serializers.py` | `RunTaskSerializer` con campo `task` + validación contra whitelist |
  | `apps/tasks/urls.py` | Ruta `tasks/run` |
  | `apps/tasks/__init__.py` | Package vacío |

  **Archivos a modificar:**

  | Archivo | Cambio |
  |---------|--------|
  | `core/urls.py` | Incluir `apps/tasks.urls` bajo `api/v1/` |
  | `core/settings/base.py` | Agregar `tasks` a `INSTALLED_APPS` |

  **Whitelist de tareas permitidas:**
  ```python
  TASKS_WHITELIST = {
      "pagos.generar_pagos_automaticos",
      "pagos.notificar_pagos_proximos",
      "dgii.reintentar_contingencia",
      "notificaciones.alertar_balance_bajo",
      "notificaciones.alertar_certificado_vencimiento",
  }
  ```

  **Seguridad:** Solo superadmin (`IsSuperAdmin`). Solo tareas en whitelist.

- [ ] 4.3 Endpoints de descarga de PDF (`pdf/a4/` y `pdf/80mm/`)

  **Descripción:** Endpoints existentes para generar e imprimir comprobantes de pago en PDF desde el panel. No requieren lógica nueva, solo documentación formal en el plan de ejecución.

  **Endpoints:**

  | Método | URL | Descripción |
  |--------|-----|-------------|
  | `GET` | `/api/v1/pagos/{id}/pdf/a4/` | PDF tamaño carta con detalle completo del pago |
  | `GET` | `/api/v1/pagos/{id}/pdf/80mm/` | PDF tamaño ticket 80mm (formato POS) |

  **Implementación actual en `apps/pagos/views.py:320-341`:**
  ```python
  @action(detail=True, methods=['get'], url_path='pdf/a4')
  def pdf_a4(self, request, pk=None):
      pago = self.get_object()
      pdf_buffer = generar_pdf_a4(pago)
      return FileResponse(
          pdf_buffer, content_type='application/pdf',
          as_attachment=True,
          filename=f"comprobante-{pago.id}-a4.pdf",
      )

  @action(detail=True, methods=['get'], url_path='pdf/80mm')
  def pdf_80mm(self, request, pk=None):
      pago = self.get_object()
      pdf_buffer = generar_pdf_80mm(pago)
      return FileResponse(
          pdf_buffer, content_type='application/pdf',
          as_attachment=True,
          filename=f"comprobante-{pago.id}-80mm.pdf",
      )
  ```

  **Dependencia:** `reportlab==4.2.0` (en `requirements.txt`). Si no está instalada, los endpoints retornan error 500.

  **Contenido del PDF A4:**
  - Encabezado: "COMPROBANTE DE PAGO", recibo No., empresa y RNC
  - Detalle: plan, ciclo, tipo, monto, método de pago, referencia, estado, confirmado por, fechas
  - Pie: ID interno + nota legal

  **Contenido del PDF 80mm:**
  - Formato ticket POS con fuente Courier (monoespaciada)
  - Mismos datos que A4 pero en layout compacto vertical

  **Seguridad:** Solo superadmin (`IsSuperAdmin`). El pago debe existir (cualquier estado).

---

*Versión: 2.1.0 — Añadida Fase 4 el 6 de junio de 2026*
*Basado en: Hallazgos del análisis de implementación vs ARCHITECTURE.md*
