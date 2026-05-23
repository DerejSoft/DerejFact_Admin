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
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            let pagosPromise;
            
            // Cargar pagos según el tab activo para optimizar la request
            if (currentTab === 'pendientes') {
                pagosPromise = API.get('/pagos/?estado=PENDIENTE');
            } else if (currentTab === 'historial') {
                pagosPromise = API.get('/pagos/historial/');
            } else {
                // Tab "todos": fetch PENDIENTES y el historial, y combinarlos
                pagosPromise = Promise.all([
                    API.get('/pagos/?estado=PENDIENTE').catch(() => []),
                    API.get('/pagos/historial/').catch(() => [])
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
            tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state">Error al cargar datos: ${error.message}</div></td></tr>`;
            showToast('Error', 'No se pudieron cargar los pagos', 'error');
        }
    }

    // ── Filtrado ─────────────────────────────────────────────────────────────
    function applyFiltersAndRender() {
        const query     = searchInput.value.toLowerCase().trim();
        const empresaId = empresaFilter.value;

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
            tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state">No se encontraron datos</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const isHistorial = item.periodo_mes !== undefined || item.monto_pagado !== undefined;
            const emp        = empresasList.find(e => e.id === item.empresa);
            const empName    = item.empresa_nombre || emp?.razon_social || 'Desconocida';
            const planName   = item.plan_nombre    || planesList.find(p => p.id === item.plan)?.nombre || '—';
            
            // Campos dependiendo si es un Pago o un Historial
            const monto      = isHistorial ? item.monto_pagado : item.monto;
            const moneda     = item.moneda || 'DOP'; // Historial might not have moneda
            const fechaStr   = isHistorial ? `${item.periodo_mes}/${item.periodo_ano}` : fmtDate(item.fecha_pago);
            const refStr     = isHistorial ? `Comp: ${item.comprobantes_asignados}` : (item.referencia || '<span class="text-muted">—</span>');
            
            const estadoObj  = isHistorial 
                ? { badge: 'blue', label: 'Historial' }
                : (ESTADO_CONFIG[item.estado] || { badge: 'gray', label: item.estado });
                
            const metodoBadge = isHistorial 
                ? '<span class="text-muted" style="font-size:0.75rem">—</span>'
                : (item.metodo_pago
                    ? `<span class="badge badge-gray">${item.metodo_pago}</span>`
                    : '<span class="text-muted" style="font-size:0.75rem">—</span>');

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
                : `<span class="text-muted" style="font-size:0.75rem">Sin acciones</span>`;

            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td><span style="font-size:0.82rem;">${planName}</span></td>
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

            // La API retorna: { pago, suscripcion, paquete, historial }
            const suscripcionInfo = result?.suscripcion
                ? ` | Suscripción renovada hasta ${fmtDate(result.suscripcion.fecha_renovacion)}`
                : '';

            showToast('Éxito', `Pago confirmado correctamente.${suscripcionInfo}`, 'success');
            closeConfirmarModal();
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
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('fecha_pago').value = now.toISOString().slice(0, 16);

        suscripcionSelectForm.innerHTML = '<option value="">Seleccione la empresa primero...</option>';
        planSelectForm.innerHTML        = '<option value="">Seleccione la empresa primero...</option>';
        suscripcionSelectForm.disabled  = true;
        planSelectForm.disabled         = true;

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

        if (sub.fecha_inicio) {
            const d = new Date(sub.fecha_inicio + 'T00:00:00');
            if (!isNaN(d.getTime())) {
                document.getElementById('fecha_corte').value = d.getDate();
            }
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

        const dateVal    = document.getElementById('fecha_pago').value;
        const fechaCorte = document.getElementById('fecha_corte').value;

        const payload = {
            empresa:      document.getElementById('empresa').value,
            suscripcion:  document.getElementById('suscripcion').value || null,
            plan:         document.getElementById('plan').value || null,
            monto:        parseFloat(document.getElementById('monto').value).toFixed(2),
            moneda:       document.getElementById('moneda').value,
            metodo_pago:  document.getElementById('metodo_pago').value,
            referencia:   document.getElementById('referencia').value || null,
            fecha_pago:   new Date(dateVal).toISOString(),
            fecha_corte:  fechaCorte ? parseInt(fechaCorte) : new Date(dateVal).getDate(),
            observaciones: document.getElementById('observaciones').value || null,
        };

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

    // ── Eventos de filtrado ──────────────────────────────────────────────────
    searchInput.addEventListener('input', debounce(applyFiltersAndRender, 300));
    empresaFilter.addEventListener('change', applyFiltersAndRender);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentTab = e.currentTarget.dataset.tab;
            loadData(); // Recarga con el filtro de estado correcto
        });
    });

    // ── Iniciar ──────────────────────────────────────────────────────────────
    loadData();
});
