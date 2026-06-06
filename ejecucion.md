# Plan de Ejecución — Pagos: PDF Modal + Método en columna

## Objetivo
1. Reemplazar los dos botones individuales (PDF A4 / PDF 80mm) por un **botón único "Descargar PDF"** que abre un modal con ambas opciones.
2. Mostrar el `metodo_pago` también en los registros de **historial** (columna Método).
3. El botón PDF debe aparecer tanto en estado **CONFIRMADO** como en **historial**.

## Archivos a modificar

### 1. `pages/pagos.html` — Agregar modal PDF options
- Insertar nuevo modal `#modalPdfOptions` después del `#modalRechazar`.
- Modal contiene:
  - Título: "Descargar Comprobante"
  - Texto descriptivo
  - Hidden `#pdfPagoId`
  - Dos botones: "📄 PDF A4" y "🧾 PDF 80mm"

### 2. `js/pages/pagos.js` — Lógica actualizada
- **Nuevas referencias DOM**: `modalPdfOptions`, `pdfPagoId`, `btnClosePdfModal`
- **`metodoBadge`**: Simplificar para que no discrimine por `isHistorial`, mostrando `item.metodo_pago` si existe, o `—` si no.
- **`acciones`**:
  - PENDIENTE → Confirmar / Rechazar (sin cambios)
  - CONFIRMADO o `isHistorial` → botón único "📄 Descargar PDF" con `data-id`
  - Otros → "Sin acciones"
- **Event listeners**:
  - `.btn-pdf-options` (click) → asigna `pdfPagoId.value` y abre modal
  - `.btn-pdf-option` (click) → toma `pdfPagoId.value` + `data-format` → llama `downloadPagoPdf()` → cierra modal
  - `btnClosePdfModal` / overlay click → cierra modal
- **Eliminar**: bind viejo de `.btn-pdf` (ya no existe en el DOM)
