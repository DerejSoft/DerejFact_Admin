# Estado del Proyecto — Pagos

## Fase 1: HTML — Modal PDF options
- [x] Agregar `#modalPdfOptions` en `pages/pagos.html`
  - Header con título y botón cerrar
  - Hidden `#pdfPagoId`
  - Dos botones de formato (A4 / 80mm)

## Fase 2: JS — Lógica de pagos (`js/pages/pagos.js`)
- [x] Agregar referencias DOM (`modalPdfOptions`, `pdfPagoId`, `btnClosePdfModal`)
- [x] Arreglar `metodoBadge` para que muestre `metodo_pago` también en historial
- [x] Cambiar `acciones`: reemplazar 2 botones PDF por 1 que abre modal; incluir `isHistorial`
- [x] Agregar event listeners del nuevo modal (abrir, cerrar, seleccionar formato)
- [x] Eliminar bind viejo de `.btn-pdf`

## Fase 3: Verificación
- [ ] Revisar que no haya errores de consola
- [ ] Probar flujo: Confirmado → botón PDF → modal → A4 / 80mm
- [ ] Probar flujo: Historial → botón PDF → modal → A4 / 80mm
- [ ] Verificar que la columna Método muestre el valor correcto en historial
