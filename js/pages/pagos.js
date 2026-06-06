/**
 * DerejFact Admin — Pagos Logic
 * Flujo actualizado 21-mayo-2026:
 *   - Los pagos se generan AUTOMÁTICAMENTE desde Celery (15 días antes del vencimiento)
 *   - Confirmación: PATCH /pagos/{id}/actualizar_confirmacion/ con metodo_pago + referencia
 *   - Endpoint deprecated /pagos/{id}/confirmar/ ya NO se usa
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Pagos');

    // ── Referencias DOM ──────────────────────────────────────────────────────
    const tableBody     = document.getElementById('dataTableBody');
    const tableCount    = document.getElementById('tableCount');
    const searchInput   = document.getElementById('searchInput');
    const empresaFilter = document.getElementById('empresaFilter');
    const estadoFilter  = document.getElementById('estadoFilter');
    const tabBtns       = document.querySelectorAll('.tab-btn');

    // Modal Confirmar
    const modalConfirmar        = document.getElementById('modalConfirmar');
    const confirmarPagoId       = document.getElementById('confirmarPagoId');
    const ciEmpresa             = document.getElementById('ci_empresa');
    const ciPlan                = document.getElementById('ci_plan');
    const ciMonto               = document.getElementById('ci_monto');
    const ciFecha               = document.getElementById('ci_fecha');
    const confirmarMetodoPago   = document.getElementById('confirmar_metodo_pago');
    const confirmarReferencia   = document.getElementById('confirmar_referencia');
    const confirmarObservaciones= document.getElementById('confirmar_observaciones');
    const referenciaHelp        = document.getElementById('referenciaHelp');
    const referenciaIndicator   = document.getElementById('referenciaRequeridaIndicator');
    const btnCloseConfirmar     = document.getElementById('btnCloseConfirmar');
    const btnCancelConfirmar    = document.getElementById('btnCancelConfirmar');
    const btnSubmitConfirmar    = document.getElementById('btnSubmitConfirmar');

    // Modal Rechazar
    const modalRechazar     = document.getElementById('modalRechazar');
    const rechazarPagoId    = document.getElementById('rechazarPagoId');
    const btnCancelRechazar = document.getElementById('btnCancelRechazar');
    const btnSubmitRechazar = document.getElementById('btnSubmitRechazar');

    // Modal PDF Options
    const modalPdfOptions   = document.getElementById('modalPdfOptions');
    const pdfPagoId         = document.getElementById('pdfPagoId');
    const btnClosePdfModal  = document.getElementById('btnClosePdfModal');

    // Modal Crear (registro manual)
    const modalForm             = document.getElementById('modalForm');
    const btnNew                = document.getElementById('btnNew');
    const btnCloseModal         = document.getElementById('btnCloseModal');
    const btnCancelModal        = document.getElementById('btnCancelModal');
    const btnSaveModal          = document.getElementById('btnSaveModal');
    const dataForm              = document.getElementById('dataForm');
    const empresaSelectForm     = document.getElementById('empresa');
    const suscripcionSelectForm = document.getElementById('suscripcion');
    const planSelectForm        = document.getElementById('plan');
    const tipoPagoSelectForm    = document.getElementById('tipo_pago');
    const metodoPagoForm        = document.getElementById('metodo_pago');
    const referenciaForm        = document.getElementById('referencia');
    const referenciaHelpCreate  = document.getElementById('referenciaHelpCreate');

    // ── Estado local ─────────────────────────────────────────────────────────
    let allData        = [];
    let empresasList   = [];
    let suscripcionesList = [];
    let planesList     = [];
    let currentTab     = 'todos';

    // ── Constantes de estado ─────────────────────────────────────────────────
    const ESTADO_CONFIG = {
        PENDIENTE:  { badge: 'yellow', label: 'Pendiente'  },
        CONFIRMADO: { badge: 'green',  label: 'Confirmado' },
        RECHAZADO:  { badge: 'red',    label: 'Rechazado'  },
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    function fmtMoney(monto, moneda = 'DOP') {
        const n = parseFloat(monto);
        if (isNaN(n)) return '—';
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: moneda }).format(n);
    }

    function fmtDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function debounce(fn, ms) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
    }

    // ── Carga de datos ───────────────────────────────────────────────────────
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            let pagosPromise;
            const estadoValue = estadoFilter ? estadoFilter.value : '';
            
            // Cargar pagos según el tab activo para optimizar la request
            if (estadoValue) {
                pagosPromise = API.get(`/pagos/?estado=${estadoValue}`);
            } else if (currentTab === 'pendientes') {
                pagosPromise = API.get('/pagos/?estado=PENDIENTE');
            } else if (currentTab === 'historial') {
                pagosPromise = API.get('/pagos/historial/').catch(() => API.get('/pagos/?estado=CONFIRMADO'));
            } else {
                // Tab "todos": fetch PENDIENTES y el historial, y combinarlos
                pagosPromise = Promise.all([
                    API.get('/pagos/?estado=PENDIENTE').catch(() => []),
                    API.get('/pagos/historial/').catch(() => API.get('/pagos/?estado=CONFIRMADO').catch(() => []))
                ]).then(([pendientes, historial]) => {
                    const pendArr = Array.isArray(pendientes) ? pendientes : [];
                    const histArr = Array.isArray(historial) ? historial : [];
                    // Combinar y eliminar duplicados por ID (por si acaso)
                    const map = new Map();
                    pendArr.forEach(p => map.set(p.id, p));
                    histArr.forEach(p => map.set(p.id, p));
                    return Array.from(map.values());
                });
            }

            const [pagosRes, empRes, subsRes, planesRes] = await Promise.all([
                pagosPromise,
                API.get('/empresas/'),
                API.get('/suscripciones/'),
                API.get('/planes/')
            ]);

            allData       = Array.isArray(pagosRes) ? pagosRes : [];
            empresasList  = Array.isArray(empRes) ? empRes : [];
            suscripcionesList = Array.isArray(subsRes) ? subsRes : [];
            planesList    = Array.isArray(planesRes) ? planesRes : [];

            // Poblar filtro de empresa
            empresaFilter.innerHTML = `<option value="">Todas las empresas</option>` +
                empresasList.map(e => `<option value="${e.id}">${e.razon_social}</option>`).join('');

            // Poblar select empresa del modal de creación
            empresaSelectForm.innerHTML = `<option value="">Seleccione una empresa...</option>` +
                empresasList.map(e => `<option value="${e.id}">${e.razon_social}</option>`).join('');

            applyFiltersAndRender();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="9"><div class="empty-state">Error al cargar datos: ${error.message}</div></td></tr>`;
            showToast('Error', error.message || 'No se pudieron cargar los pagos', 'error');
        }
    }

    // ── Filtrado ─────────────────────────────────────────────────────────────
    function applyFiltersAndRender() {
        const query     = searchInput.value.toLowerCase().trim();
        const empresaId = empresaFilter.value;
        const estadoId  = estadoFilter ? estadoFilter.value : '';

        let filtered = [...allData];

        // Filtro por tab (la API ya hizo el filtro inicial por estado/endpoint)
        if (currentTab === 'pendientes') {
            filtered = filtered.filter(p => p.estado === 'PENDIENTE');
        } else if (currentTab === 'historial') {
            // No filtramos por estado aquí porque /pagos/historial/ puede tener otra estructura de datos,
            // o simplemente ya viene filtrado desde el backend.
            // Opcional: si sabemos que son Pagos en estado CONFIRMADO/RECHAZADO, podríamos dejar el filtro,
            // pero es más seguro no filtrarlos si confiamos en el endpoint.
            // De hecho, si /pagos/historial/ retorna Pagos confirmados/rechazados, el backend ya los filtró.
        }

        // Filtro por empresa (dropdown)
        if (empresaId) {
            filtered = filtered.filter(p => p.empresa == empresaId);
        }

        if (estadoId) {
            filtered = filtered.filter(p => p.estado === estadoId);
        }

        // Buscador semántico (debounce 300ms, filtra localmente)
        if (query) {
            filtered = filtered.filter(item => {
                const emp       = empresasList.find(e => e.id === item.empresa);
                const empName   = (emp?.razon_social || item.empresa_nombre || '').toLowerCase();
                const empRnc    = (emp?.rnc || '').toLowerCase();
                const refMatch  = (item.referencia || '').toLowerCase().includes(query);
                const planMatch = (item.plan_nombre || '').toLowerCase().includes(query);
                return empName.includes(query) || empRnc.includes(query) || refMatch || planMatch;
            });
        }

        renderTable(filtered);
    }

    // ── Renderizado de tabla ─────────────────────────────────────────────────
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9"><div class="empty-state">No se encontraron datos</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const isHistorial = item.periodo_mes !== undefined || item.monto_pagado !== undefined;
            const emp        = empresasList.find(e => e.id === item.empresa);
            const empName    = item.empresa_nombre || emp?.razon_social || 'Desconocida';
            const planName   = item.plan_nombre    || planesList.find(p => p.id === item.plan)?.nombre || '—';
            const tipoPago   = item.tipo_pago || (isHistorial ? 'HISTORIAL' : '—');
            
            // Campos dependiendo si es un Pago o un Historial
            const monto      = isHistorial ? item.monto_pagado : item.monto;
            const moneda     = item.moneda || 'DOP'; // Historial might not have moneda
            const fechaStr   = isHistorial ? `${item.periodo_mes}/${item.periodo_ano}` : fmtDate(item.fecha_pago);
            const refStr     = isHistorial ? `Comp: ${item.comprobantes_asignados}` : (item.referencia || '<span class="text-muted">—</span>');
            
            const estadoObj  = isHistorial 
                ? { badge: 'blue', label: 'Historial' }
                : (ESTADO_CONFIG[item.estado] || { badge: 'gray', label: item.estado });
                
            const metodoBadge = item.metodo_pago
                ? `<span class="badge badge-gray">${item.metodo_pago}</span>`
                : '<span class="text-muted" style="font-size:0.75rem">—</span>';

            const showPdf = item.estado === 'CONFIRMADO' || isHistorial;
            const acciones = (item.estado === 'PENDIENTE')
                ? `<div class="action-btns">
                       <button class="btn btn-sm btn-outline btn-confirmar"
                               data-id="${item.id}"
                               style="color:var(--accent);border-color:var(--accent);">
                           ✓ Confirmar
                       </button>
                       <button class="btn btn-sm btn-outline btn-rechazar"
                               data-id="${item.id}"
                               style="color:var(--danger);border-color:var(--danger);">
                           ✕ Rechazar
                       </button>
                   </div>`
                : showPdf
                    ? `<button class="btn btn-sm btn-outline btn-pdf-options" data-id="${item.id}">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px;height:14px;">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                           </svg>
                           Descargar PDF
                       </button>`
                    : `<span class="text-muted" style="font-size:0.75rem">Sin acciones</span>`;

            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td><span style="font-size:0.82rem;">${planName}</span></td>
                <td><span class="badge badge-gray">${tipoPago}</span></td>
                <td><strong>${fmtMoney(monto, moneda)}</strong></td>
                <td>${metodoBadge}</td>
                <td>${refStr}</td>
                <td>${fechaStr}</td>
                <td><span class="badge badge-${estadoObj.badge}">${estadoObj.label}</span></td>
                <td>${acciones}</td>
            </tr>`;
        }).join('');

        // Bind: botones Confirmar
        document.querySelectorAll('.btn-confirmar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.id;
                const pago   = allData.find(p => String(p.id) === String(pagoId));
                if (pago) openConfirmarModal(pago);
            });
        });

        // Bind: botones Rechazar
        document.querySelectorAll('.btn-rechazar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                rechazarPagoId.value = e.currentTarget.dataset.id;
                modalRechazar.classList.add('open');
            });
        });

        document.querySelectorAll('.btn-pdf-options').forEach(btn => {
            btn.addEventListener('click', (e) => {
                pdfPagoId.value = e.currentTarget.dataset.id;
                modalPdfOptions.classList.add('open');
            });
        });
    }

    // ── Modal: Confirmar Pago ────────────────────────────────────────────────

    /**
     * Abre el modal de confirmación y pre-rellena los datos read-only del pago.
     * @param {Object} pago - Objeto pago desde la API
     */
    function openConfirmarModal(pago) {
        const emp      = empresasList.find(e => e.id === pago.empresa);
        const empName  = pago.empresa_nombre || emp?.razon_social || '—';
        const planName = pago.plan_nombre    || planesList.find(p => p.id === pago.plan)?.nombre || '—';

        // Datos informativos (read-only)
        ciEmpresa.textContent = empName;
        ciPlan.textContent    = planName;
        ciMonto.textContent   = fmtMoney(pago.monto, pago.moneda);
        ciFecha.textContent   = fmtDate(pago.fecha_pago);

        // Resetear campos del formulario
        confirmarPagoId.value         = pago.id;
        confirmarMetodoPago.value     = 'TRANSFERENCIA';
        confirmarReferencia.value     = '';
        confirmarObservaciones.value  = '';
        referenciaHelp.style.display  = 'none';
        referenciaIndicator.style.display = 'inline';
        confirmarReferencia.removeAttribute('required');

        // Activar validación dinámica de referencia
        actualizarReferenciaRequerida();

        modalConfirmar.classList.add('open');
        confirmarReferencia.focus();
    }

    /**
     * Actualiza el indicador de "referencia requerida" según el metodo_pago seleccionado.
     * Si el metodo_pago ≠ EFECTIVO → referencia es OBLIGATORIA (según la API).
     */
    function actualizarReferenciaRequerida() {
        const esEfectivo = confirmarMetodoPago.value === 'EFECTIVO';
        if (esEfectivo) {
            referenciaHelp.style.display       = 'none';
            referenciaIndicator.style.display  = 'none';
            confirmarReferencia.removeAttribute('required');
            confirmarReferencia.placeholder    = 'Opcional para efectivo';
        } else {
            referenciaHelp.style.display       = 'none'; // solo se muestra al intentar enviar
            referenciaIndicator.style.display  = 'inline';
            confirmarReferencia.setAttribute('required', '');
            confirmarReferencia.placeholder    = 'Nro. de transferencia, depósito o comprobante';
        }
    }

    confirmarMetodoPago.addEventListener('change', actualizarReferenciaRequerida);

    function closeConfirmarModal() {
        modalConfirmar.classList.remove('open');
        confirmarPagoId.value = '';
    }

    btnCloseConfirmar.addEventListener('click', closeConfirmarModal);
    btnCancelConfirmar.addEventListener('click', closeConfirmarModal);

    /**
     * Envía PATCH /pagos/{id}/actualizar_confirmacion/ con metodo_pago + referencia
     */
    btnSubmitConfirmar.addEventListener('click', async () => {
        const id       = confirmarPagoId.value;
        const metodo   = confirmarMetodoPago.value;
        const ref      = confirmarReferencia.value.trim();
        const obs      = confirmarObservaciones.value.trim();

        // Validación: referencia obligatoria para no-EFECTIVO
        if (metodo !== 'EFECTIVO' && !ref) {
            referenciaHelp.style.display = 'block';
            confirmarReferencia.focus();
            return;
        }
        referenciaHelp.style.display = 'none';

        const payload = {
            metodo_pago: metodo,
            ...(ref ? { referencia: ref } : {}),
            ...(obs ? { observaciones: obs } : {}),
        };

        btnSubmitConfirmar.disabled    = true;
        btnSubmitConfirmar.textContent = 'Confirmando...';

        try {
            const result = await API.patch(`/pagos/${id}/actualizar_confirmacion/`, payload);
            const pagoId = result?.pago?.id || id;

            // La API retorna: { pago, suscripcion, paquete, historial }
            const suscripcionInfo = result?.suscripcion
                ? ` | Suscripción renovada hasta ${fmtDate(result.suscripcion.fecha_renovacion)}`
                : '';

            showToast('Éxito', `Pago confirmado correctamente.${suscripcionInfo}`, 'success');
            closeConfirmarModal();
            downloadPagoPdf(pagoId, '80mm', true);
            await loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnSubmitConfirmar.disabled    = false;
            btnSubmitConfirmar.innerHTML   = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px;height:16px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Confirmar Pago`;
        }
    });

    // ── Modal: Rechazar Pago ─────────────────────────────────────────────────
    btnCancelRechazar.addEventListener('click', () => {
        modalRechazar.classList.remove('open');
        rechazarPagoId.value = '';
    });

    btnSubmitRechazar.addEventListener('click', async () => {
        const id = rechazarPagoId.value;
        if (!id) return;

        btnSubmitRechazar.disabled    = true;
        btnSubmitRechazar.textContent = 'Rechazando...';

        try {
            await API.post(`/pagos/${id}/rechazar/`);
            showToast('Éxito', 'Pago rechazado correctamente', 'success');
            modalRechazar.classList.remove('open');
            rechazarPagoId.value = '';
            await loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnSubmitRechazar.disabled    = false;
            btnSubmitRechazar.textContent = 'Rechazar Pago';
        }
    });

    // ── Modal: Registrar Pago Manual ─────────────────────────────────────────
    function openModal() {
        dataForm.reset();

        suscripcionSelectForm.innerHTML = '<option value="">Seleccione la empresa primero...</option>';
        planSelectForm.innerHTML        = '<option value="">Seleccione la empresa primero...</option>';
        suscripcionSelectForm.disabled  = true;
        planSelectForm.disabled         = true;
        if (referenciaHelpCreate) referenciaHelpCreate.style.display = 'none';

        modalForm.classList.add('open');
    }

    function closeModal() {
        modalForm.classList.remove('open');
    }

    // Al cambiar empresa: cargar suscripciones y planes disponibles
    empresaSelectForm.addEventListener('change', (e) => {
        const empresaId = e.target.value;
        suscripcionSelectForm.innerHTML = '<option value="">Ninguna / Pago Manual</option>';
        planSelectForm.innerHTML        = '<option value="">Ninguno / Pago Manual</option>';

        if (!empresaId) {
            suscripcionSelectForm.disabled = true;
            planSelectForm.disabled        = true;
            return;
        }

        suscripcionSelectForm.disabled = false;
        planSelectForm.disabled        = false;

        planSelectForm.innerHTML += planesList
            .map(p => `<option value="${p.id}">${p.nombre}</option>`)
            .join('');

        suscripcionesList
            .filter(s => s.empresa == empresaId)
            .forEach(sub => {
                const plan     = planesList.find(p => p.id === sub.plan);
                const planName = plan ? plan.nombre : 'Plan desconocido';
                suscripcionSelectForm.innerHTML +=
                    `<option value="${sub.id}" data-plan-id="${sub.plan}">
                        ${planName} (${sub.ciclo}) - ${fmtDate(sub.fecha_inicio)}
                     </option>`;
            });
    });

    // Al cambiar suscripción: auto-rellenar plan y monto
    suscripcionSelectForm.addEventListener('change', (e) => {
        const subId = e.target.value;
        if (!subId) return;

        const sub = suscripcionesList.find(s => s.id == subId);
        if (!sub) return;

        planSelectForm.value = sub.plan;

        const plan = planesList.find(p => p.id === sub.plan);
        if (plan) {
            const price = sub.ciclo === 'ANUAL' ? plan.precio_anual : plan.precio_mensual;
            if (price) document.getElementById('monto').value = parseFloat(price).toFixed(2);
        }
    });

    btnNew.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);

    btnSaveModal.addEventListener('click', async () => {
        if (!dataForm.checkValidity()) {
            dataForm.reportValidity();
            return;
        }
        const empresaValue = document.getElementById('empresa').value;
        const suscripcionValue = document.getElementById('suscripcion').value || null;
        const planValue = document.getElementById('plan').value || null;
        const montoValue = document.getElementById('monto').value;
        const metodoValue = metodoPagoForm.value;
        const referenciaValue = referenciaForm.value.trim();

        if (!empresaValue) {
            showToast('Validación', 'Seleccione una empresa.', 'warning');
            return;
        }
        if (!suscripcionValue) {
            showToast('Validación', 'Seleccione una suscripción.', 'warning');
            return;
        }
        if (!planValue) {
            showToast('Validación', 'Seleccione un plan.', 'warning');
            return;
        }

        if (metodoValue && metodoValue !== 'EFECTIVO' && !referenciaValue) {
            if (referenciaHelpCreate) referenciaHelpCreate.style.display = 'block';
            referenciaForm.focus();
            return;
        }
        if (referenciaHelpCreate) referenciaHelpCreate.style.display = 'none';

        const payload = {
            empresa:      empresaValue,
            suscripcion:  suscripcionValue,
            plan:         planValue,
            moneda:       document.getElementById('moneda').value,
            tipo_pago:    tipoPagoSelectForm.value,
            metodo_pago:  metodoValue || undefined,
            referencia:   referenciaValue || undefined,
            observaciones: document.getElementById('observaciones').value || undefined,
        };

        if (montoValue) {
            payload.monto = parseFloat(montoValue).toFixed(2);
        }

        btnSaveModal.disabled    = true;
        btnSaveModal.textContent = 'Registrando...';

        try {
            await API.post('/pagos/', payload);
            showToast('Éxito', 'Pago registrado correctamente', 'success');
            closeModal();
            await loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnSaveModal.disabled    = false;
            btnSaveModal.textContent = 'Registrar Pago';
        }
    });

    async function downloadPagoPdf(pagoId, format, printOnOpen) {
        if (!pagoId || !format) return;
        const token = AUTH.getAccessToken();
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/pagos/${pagoId}/pdf/${format}/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (!win) {
                showToast('Aviso', 'Habilite los popups para abrir el PDF.', 'warning');
                return;
            }
            if (printOnOpen) {
                win.addEventListener('load', () => {
                    win.focus();
                    win.print();
                });
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            showToast('Error', err.message || 'No se pudo abrir el PDF', 'error');
        }
    }

    // ── Modal: Opciones PDF ───────────────────────────────────────────────────
    function closePdfModal() {
        modalPdfOptions.classList.remove('open');
        pdfPagoId.value = '';
    }

    btnClosePdfModal.addEventListener('click', closePdfModal);
    modalPdfOptions.addEventListener('click', (e) => {
        if (e.target === modalPdfOptions) closePdfModal();
    });

    document.querySelectorAll('.btn-pdf-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pagoId = pdfPagoId.value;
            const format = e.currentTarget.dataset.format;
            if (!pagoId) return;
            downloadPagoPdf(pagoId, format, true);
            closePdfModal();
        });
    });

    // ── Eventos de filtrado ──────────────────────────────────────────────────
    searchInput.addEventListener('input', debounce(applyFiltersAndRender, 300));
    empresaFilter.addEventListener('change', applyFiltersAndRender);
    if (estadoFilter) estadoFilter.addEventListener('change', loadData);
    if (metodoPagoForm) {
        metodoPagoForm.addEventListener('change', () => {
            if (referenciaHelpCreate) referenciaHelpCreate.style.display = 'none';
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentTab = e.currentTarget.dataset.tab;
            if (estadoFilter) estadoFilter.value = '';
            loadData(); // Recarga con el filtro de estado correcto
        });
    });

    // ── Iniciar ──────────────────────────────────────────────────────────────
    loadData();
});
