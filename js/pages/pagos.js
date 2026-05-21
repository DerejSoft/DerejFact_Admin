/**
 * DerejFact Admin — Pagos Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Pagos');

    const tableBody = document.getElementById('dataTableBody');
    const tableCount = document.getElementById('tableCount');
    const searchInput = document.getElementById('searchInput');
    const empresaFilter = document.getElementById('empresaFilter');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Modal Acciones (Confirmar / Rechazar)
    const modalAccion = document.getElementById('modalAccionPago');
    const accionIcon = document.getElementById('accionIcon');
    const accionTitle = document.getElementById('accionTitle');
    const accionText = document.getElementById('accionText');
    const btnCancelAccion = document.getElementById('btnCancelAccion');
    const btnConfirmAccion = document.getElementById('btnConfirmAccion');

    // Modal Crear Pago
    const modalForm = document.getElementById('modalForm');
    const btnNew = document.getElementById('btnNew');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnSaveModal = document.getElementById('btnSaveModal');
    const dataForm = document.getElementById('dataForm');
    const empresaSelectForm = document.getElementById('empresa');
    const suscripcionSelectForm = document.getElementById('suscripcion');
    const planSelectForm = document.getElementById('plan');

    let allData = [];
    let empresasList = [];
    let suscripcionesList = [];
    let planesList = [];
    let currentTab = 'todos';
    
    // Variables de estado para modal
    let currentPagoId = null;
    let currentAccion = null; // 'confirmar' o 'rechazar'
    let suggestedPayments = [];

    // --- CÁLCULO DE PAGOS SUGERIDOS PENDIENTES ---
    function calculateSuggestedPayments() {
        const suggested = [];
        const now = new Date();

        // Parser local de fecha para evitar desfases de zona horaria
        const parseLocalDate = (dateStr) => {
            if (!dateStr) return new Date();
            if (dateStr.includes('T')) return new Date(dateStr);
            return new Date(dateStr + 'T00:00:00');
        };

        suscripcionesList.forEach(sub => {
            if (sub.estado !== 'ACTIVA') return;

            const plan = planesList.find(p => p.id === sub.plan);
            if (!plan) return;

            // Si es plan gratuito o de costo cero, no genera cobros
            const price = sub.ciclo === 'ANUAL' ? plan.precio_anual : plan.precio_mensual;
            if (!price || parseFloat(price) === 0) return;

            const startDate = parseLocalDate(sub.fecha_inicio);
            const renDate = sub.fecha_renovacion ? parseLocalDate(sub.fecha_renovacion) : now;
            
            // Generar sugeridos hasta la fecha de renovación o el día de hoy, lo que sea menor
            const endDate = renDate < now ? renDate : now;

            let currentCycleDate = new Date(startDate);
            while (currentCycleDate <= endDate) {
                const month = currentCycleDate.getMonth();
                const year = currentCycleDate.getFullYear();

                // Verificar si ya existe un pago real para este ciclo (mismo mes y año para mensual, o mismo año para anual)
                const hasPayment = allData.some(p => {
                    if (p.empresa != sub.empresa) return false;
                    if (p.suscripcion != sub.id) return false;
                    
                    const pDate = new Date(p.fecha_pago);
                    if (sub.ciclo === 'ANUAL') {
                        return pDate.getFullYear() === year;
                    } else {
                        return pDate.getFullYear() === year && pDate.getMonth() === month;
                    }
                });

                if (!hasPayment) {
                    suggested.push({
                        id: `suggested_${sub.id}_${year}_${month}`,
                        empresa: sub.empresa,
                        suscripcion: sub.id,
                        plan: sub.plan,
                        monto: price,
                        moneda: 'DOP',
                        metodo_pago: 'TRANSFERENCIA',
                        referencia: `Auto-generado ${month + 1}/${year}`,
                        fecha_pago: new Date(currentCycleDate),
                        estado: 'SUGERIDO',
                        ciclo_label: sub.ciclo === 'ANUAL' ? `Año ${year}` : `${month + 1}/${year}`
                    });
                }

                // Avanzar ciclo
                if (sub.ciclo === 'ANUAL') {
                    currentCycleDate.setFullYear(currentCycleDate.getFullYear() + 1);
                } else {
                    currentCycleDate.setMonth(currentCycleDate.getMonth() + 1);
                }
            }
        });

        return suggested;
    }

    // --- ACCIÓN EN CASCADA (Confirmar pagos anteriores) ---
    async function processPaymentAndCascade(targetPayment, confirmCascade = false) {
        try {
            showToast('Procesando', 'Registrando pago principal...', 'info');

            let paymentId = targetPayment.id;
            
            // 1. Si es un pago sugerido, primero crearlo en la API
            if (targetPayment.estado === 'SUGERIDO') {
                const payload = {
                    empresa: targetPayment.empresa,
                    suscripcion: targetPayment.suscripcion,
                    plan: targetPayment.plan,
                    monto: parseFloat(targetPayment.monto).toFixed(2),
                    moneda: targetPayment.moneda,
                    metodo_pago: targetPayment.metodo_pago,
                    referencia: targetPayment.referencia,
                    fecha_pago: targetPayment.fecha_pago.toISOString(),
                    fecha_corte: new Date(targetPayment.fecha_pago).getDate(),
                    observaciones: 'Pago estándar autogenerado por ciclo de suscripción'
                };
                const res = await API.post('/pagos/', payload);
                paymentId = res.id;
            }

            // 2. Confirmar el pago principal
            await API.post(`/pagos/${paymentId}/confirmar/`);

            // 3. Procesar pagos anteriores si el usuario aceptó la cascada
            if (confirmCascade) {
                showToast('Procesando', 'Confirmando pagos pendientes históricos...', 'info');
                
                const olderSug = suggestedPayments.filter(p => 
                    p.empresa == targetPayment.empresa && 
                    p.suscripcion == targetPayment.suscripcion && 
                    new Date(p.fecha_pago) < new Date(targetPayment.fecha_pago)
                );

                const olderPend = allData.filter(p => 
                    p.empresa == targetPayment.empresa && 
                    p.suscripcion == targetPayment.suscripcion && 
                    p.estado === 'PENDIENTE' && 
                    new Date(p.fecha_pago) < new Date(targetPayment.fecha_pago) &&
                    p.id != paymentId
                );

                // A. Confirmar pagos reales pendientes anteriores
                for (const pend of olderPend) {
                    await API.post(`/pagos/${pend.id}/confirmar/`);
                }

                // B. Crear y confirmar pagos sugeridos anteriores
                for (const sug of olderSug) {
                    const payload = {
                        empresa: sug.empresa,
                        suscripcion: sug.suscripcion,
                        plan: sug.plan,
                        monto: parseFloat(sug.monto).toFixed(2),
                        moneda: sug.moneda,
                        metodo_pago: sug.metodo_pago,
                        referencia: sug.referencia,
                        fecha_pago: sug.fecha_pago.toISOString(),
                        fecha_corte: new Date(sug.fecha_pago).getDate(),
                        observaciones: 'Pago estándar autogenerado (actualización en cascada)'
                    };
                    const res = await API.post('/pagos/', payload);
                    await API.post(`/pagos/${res.id}/confirmar/`);
                }
            }

            showToast('Éxito', 'Pago(s) procesado(s) y confirmado(s) correctamente', 'success');
            loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
            loadData();
        }
    }

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            const [pagosRes, empRes, subsRes, planesRes] = await Promise.all([
                API.get('/pagos/').catch(err => {
                    if(err.message.includes("404")) return API.get('/pagos/historial/');
                    throw err;
                }),
                API.get('/empresas/'),
                API.get('/suscripciones/'),
                API.get('/planes/')
            ]);
            
            allData = pagosRes;
            empresasList = empRes;
            suscripcionesList = subsRes;
            planesList = planesRes;

            // Calcular cobros sugeridos / esperados en base a las suscripciones activas
            suggestedPayments = calculateSuggestedPayments();
            
            empresaFilter.innerHTML = `<option value="">Todas las empresas</option>` + 
                empresasList.map(e => `<option value="${e.id}">${e.razon_social}</option>`).join('');

            empresaSelectForm.innerHTML = `<option value="">Seleccione una empresa...</option>` + 
                empresasList.map(e => `<option value="${e.id}">${e.razon_social}</option>`).join('');

            applyFiltersAndRender();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', 'No se pudieron cargar los pagos', 'error');
        }
    }

    // --- FILTRADO COMBINADO ---
    function applyFiltersAndRender() {
        const query = searchInput.value.toLowerCase();
        const empresaId = empresaFilter.value;

        // Mezclar pagos reales con los sugeridos si estamos en la pestaña 'todos' o 'pendientes'
        let combined = [...allData];
        if (currentTab === 'todos' || currentTab === 'pendientes') {
            combined = [...combined, ...suggestedPayments];
        }

        let filtered = combined;

        // 1. Filtro por tab
        if (currentTab === 'pendientes') {
            filtered = filtered.filter(p => p.estado === 'PENDIENTE' || p.estado === 'SUGERIDO');
        } else if (currentTab === 'historial') {
            filtered = filtered.filter(p => p.estado !== 'PENDIENTE' && p.estado !== 'SUGERIDO');
        }

        // 2. Filtro por dropdown empresa
        if (empresaId) {
            filtered = filtered.filter(p => p.empresa == empresaId);
        }

        // 3. Filtro semántico (Buscador)
        if (query) {
            filtered = filtered.filter(item => {
                const emp = empresasList.find(emp => emp.id === item.empresa);
                const refMatch = item.referencia && item.referencia.toLowerCase().includes(query);
                const empMatch = emp && (emp.razon_social.toLowerCase().includes(query) || (emp.rnc && emp.rnc.toLowerCase().includes(query)));
                return refMatch || empMatch;
            });
        }

        renderTable(filtered);
    }

    // --- RENDERIZADO ---
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No se encontraron pagos</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const emp = empresasList.find(e => e.id === item.empresa);
            const empName = emp ? emp.razon_social : 'Desconocida';
            
            let estadoColor = 'gray';
            if (item.estado === 'CONFIRMADO') estadoColor = 'green';
            else if (item.estado === 'RECHAZADO') estadoColor = 'red';
            else if (item.estado === 'PENDIENTE') estadoColor = 'yellow';
            else if (item.estado === 'SUGERIDO') estadoColor = 'blue';

            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td><strong>${fmtMoney(item.monto, item.moneda)}</strong></td>
                <td><span class="badge badge-gray">${item.metodo_pago}</span></td>
                <td>${item.referencia || 'N/A'}</td>
                <td>${fmtDate(item.fecha_pago)}</td>
                <td><span class="badge badge-${estadoColor}">${item.estado}</span></td>
                <td>
                    ${item.estado === 'PENDIENTE' ? `
                    <div class="action-btns">
                        <button class="btn btn-sm btn-outline btn-confirmar" data-id="${item.id}" style="color:var(--accent); border-color:var(--accent);">Confirmar</button>
                        <button class="btn btn-sm btn-outline btn-rechazar" data-id="${item.id}" style="color:var(--danger); border-color:var(--danger);">Rechazar</button>
                    </div>
                    ` : item.estado === 'SUGERIDO' ? `
                    <div class="action-btns">
                        <button class="btn btn-sm btn-outline btn-generar" data-id="${item.id}" style="color:var(--accent); border-color:var(--accent);">Generar y Confirmar</button>
                    </div>
                    ` : '<span class="text-muted" style="font-size:0.75rem">Sin acciones</span>'}
                </td>
            </tr>
        `}).join('');

        // Binds
        document.querySelectorAll('.btn-confirmar, .btn-generar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentPagoId = e.currentTarget.dataset.id;
                const isSuggested = e.currentTarget.classList.contains('btn-generar');
                currentAccion = 'confirmar';
                
                const targetPayment = allData.find(p => p.id == currentPagoId) || suggestedPayments.find(p => p.id == currentPagoId);
                if (!targetPayment) return;

                // Contar cobros y pagos anteriores pendientes
                const targetDate = new Date(targetPayment.fecha_pago);
                
                const olderSug = suggestedPayments.filter(p => 
                    p.empresa == targetPayment.empresa && 
                    p.suscripcion == targetPayment.suscripcion && 
                    new Date(p.fecha_pago) < targetDate
                );

                const olderPend = allData.filter(p => 
                    p.empresa == targetPayment.empresa && 
                    p.suscripcion == targetPayment.suscripcion && 
                    p.estado === 'PENDIENTE' && 
                    new Date(p.fecha_pago) < targetDate &&
                    p.id != targetPayment.id
                );

                const totalOlder = olderSug.length + olderPend.length;

                const cascadeOptionContainer = document.getElementById('cascadeOptionContainer');
                const cascadeLabel = document.getElementById('cascadeLabel');
                const chkCascade = document.getElementById('chkCascade');

                if (totalOlder > 0) {
                    cascadeOptionContainer.style.display = 'block';
                    cascadeLabel.textContent = `Registrar y confirmar también los ${totalOlder} pagos anteriores pendientes`;
                    chkCascade.checked = true;
                } else {
                    cascadeOptionContainer.style.display = 'none';
                    chkCascade.checked = false;
                }

                accionIcon.className = 'confirm-icon green';
                accionIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
                
                if (isSuggested) {
                    accionTitle.textContent = 'Generar y Confirmar Pago';
                    accionText.textContent = `¿Está seguro que desea generar y confirmar el pago sugerido para el ciclo ${targetPayment.ciclo_label}?`;
                    btnConfirmAccion.className = 'btn btn-accent';
                    btnConfirmAccion.textContent = 'Generar y Confirmar';
                } else {
                    accionTitle.textContent = 'Confirmar Pago';
                    accionText.textContent = '¿Está seguro que ha recibido y verificado este pago?';
                    btnConfirmAccion.className = 'btn btn-accent';
                    btnConfirmAccion.textContent = 'Confirmar Pago';
                }
                
                modalAccion.classList.add('open');
            });
        });

        document.querySelectorAll('.btn-rechazar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentPagoId = e.currentTarget.dataset.id;
                currentAccion = 'rechazar';

                // Ocultar opción cascada en rechazos
                document.getElementById('cascadeOptionContainer').style.display = 'none';
                
                accionIcon.className = 'confirm-icon danger';
                accionIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`;
                accionTitle.textContent = 'Rechazar Pago';
                accionText.textContent = '¿Está seguro que desea rechazar este pago?';
                btnConfirmAccion.className = 'btn btn-danger';
                btnConfirmAccion.textContent = 'Rechazar Pago';
                
                modalAccion.classList.add('open');
            });
        });
    }

    // --- EVENTOS DE FILTRADO ---
    searchInput.addEventListener('input', debounce(applyFiltersAndRender, 300));
    empresaFilter.addEventListener('change', applyFiltersAndRender);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentTab = e.currentTarget.dataset.tab;
            applyFiltersAndRender();
        });
    });

    // --- ACCIONES MODAL CREAR PAGO ---
    function openModal() {
        dataForm.reset();
        
        // Fecha actual por defecto
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('fecha_pago').value = now.toISOString().slice(0, 16);
        
        suscripcionSelectForm.innerHTML = '<option value="">Seleccione la empresa primero...</option>';
        planSelectForm.innerHTML = '<option value="">Seleccione la empresa primero...</option>';
        suscripcionSelectForm.disabled = true;
        planSelectForm.disabled = true;

        modalForm.classList.add('open');
    }

    empresaSelectForm.addEventListener('change', (e) => {
        const empresaId = e.target.value;
        suscripcionSelectForm.innerHTML = '<option value="">Ninguna / Pago Manual</option>';
        planSelectForm.innerHTML = '<option value="">Ninguno / Pago Manual</option>';
        
        if (!empresaId) {
            suscripcionSelectForm.disabled = true;
            planSelectForm.disabled = true;
            return;
        }
        
        suscripcionSelectForm.disabled = false;
        planSelectForm.disabled = false;

        // Cargar todos los planes
        planSelectForm.innerHTML += planesList.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
        
        // Cargar suscripciones de la empresa
        const subsEmpresa = suscripcionesList.filter(s => s.empresa == empresaId);
        subsEmpresa.forEach(sub => {
            const plan = planesList.find(p => p.id === sub.plan);
            const planName = plan ? plan.nombre : 'Plan desconocido';
            suscripcionSelectForm.innerHTML += `<option value="${sub.id}" data-plan-id="${sub.plan}">${planName} (${sub.ciclo}) - ${fmtDate(sub.fecha_inicio)}</option>`;
        });
    });

    suscripcionSelectForm.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const subId = e.target.value;
        if (!subId) return;

        const sub = suscripcionesList.find(s => s.id == subId);
        if (sub) {
            planSelectForm.value = sub.plan;
            
            // Auto-llenar el monto correspondiente según el ciclo (mensual o anual) del plan
            const plan = planesList.find(p => p.id === sub.plan);
            if (plan) {
                const price = sub.ciclo === 'ANUAL' ? plan.precio_anual : plan.precio_mensual;
                if (price) {
                    document.getElementById('monto').value = parseFloat(price).toFixed(2);
                }
            }

            // Auto-llenar fecha_corte con el día de inicio de la suscripción
            if (sub.fecha_inicio) {
                const subStartDate = new Date(sub.fecha_inicio + 'T00:00:00');
                if (!isNaN(subStartDate.getTime())) {
                    document.getElementById('fecha_corte').value = subStartDate.getDate();
                }
            }
        }
    });

    function closeModal() {
        modalForm.classList.remove('open');
    }

    btnSaveModal.addEventListener('click', async () => {
        if (!dataForm.checkValidity()) {
            dataForm.reportValidity();
            return;
        }

        const dateVal = document.getElementById('fecha_pago').value;
        const defaultFechaCorte = dateVal ? new Date(dateVal).getDate() : new Date().getDate();

        const payload = {
            empresa: document.getElementById('empresa').value,
            suscripcion: document.getElementById('suscripcion').value || null,
            plan: document.getElementById('plan').value || null,
            monto: parseFloat(document.getElementById('monto').value).toFixed(2),
            moneda: document.getElementById('moneda').value,
            metodo_pago: document.getElementById('metodo_pago').value,
            referencia: document.getElementById('referencia').value || null,
            fecha_pago: new Date(dateVal).toISOString(),
            fecha_corte: document.getElementById('fecha_corte').value ? parseInt(document.getElementById('fecha_corte').value) : defaultFechaCorte,
            observaciones: document.getElementById('observaciones').value || null
        };

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Registrando...';

        try {
            const res = await API.post('/pagos/', payload);
            showToast('Éxito', 'Pago registrado correctamente', 'success');
            closeModal();

            const newPago = res;
            const targetDate = new Date(newPago.fecha_pago);

            // Contar anteriores pendientes o sugeridos
            const olderSug = suggestedPayments.filter(p => 
                p.empresa == newPago.empresa && 
                p.suscripcion == newPago.suscripcion && 
                new Date(p.fecha_pago) < targetDate
            );

            const olderPend = allData.filter(p => 
                p.empresa == newPago.empresa && 
                p.suscripcion == newPago.suscripcion && 
                p.estado === 'PENDIENTE' && 
                new Date(p.fecha_pago) < targetDate &&
                p.id != newPago.id
            );

            const totalOlder = olderSug.length + olderPend.length;

            if (totalOlder > 0) {
                // Hay cobros anteriores pendientes. Abrir diálogo de confirmación en cascada.
                currentPagoId = newPago.id;
                currentAccion = 'confirmar';

                const cascadeOptionContainer = document.getElementById('cascadeOptionContainer');
                const cascadeLabel = document.getElementById('cascadeLabel');
                const chkCascade = document.getElementById('chkCascade');

                cascadeOptionContainer.style.display = 'block';
                cascadeLabel.textContent = `Registrar y confirmar también los ${totalOlder} pagos anteriores pendientes`;
                chkCascade.checked = true;

                accionIcon.className = 'confirm-icon green';
                accionIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
                accionTitle.textContent = 'Confirmar Pago Creado';
                accionText.textContent = `El pago manual ha sido registrado como PENDIENTE. ¿Desea confirmarlo ahora y procesar en cascada los ciclos anteriores atrasados?`;
                btnConfirmAccion.className = 'btn btn-accent';
                btnConfirmAccion.textContent = 'Confirmar y Cascada';

                modalAccion.classList.add('open');
            } else {
                loadData();
            }
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnSaveModal.disabled = false;
            btnSaveModal.textContent = 'Registrar Pago';
        }
    });

    btnNew.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);

    // --- ACCIONES MODAL CONFIRMAR / RECHAZAR ---
    btnCancelAccion.addEventListener('click', () => {
        modalAccion.classList.remove('open');
        currentPagoId = null;
        currentAccion = null;
    });

    btnConfirmAccion.addEventListener('click', async () => {
        if (!currentPagoId || !currentAccion) return;

        btnConfirmAccion.disabled = true;
        btnConfirmAccion.textContent = 'Procesando...';

        try {
            if (currentAccion === 'confirmar') {
                const targetPayment = allData.find(p => p.id == currentPagoId) || suggestedPayments.find(p => p.id == currentPagoId);
                if (targetPayment) {
                    const confirmCascade = document.getElementById('chkCascade').checked;
                    modalAccion.classList.remove('open');
                    await processPaymentAndCascade(targetPayment, confirmCascade);
                }
            } else {
                // Rechazar
                await API.post(`/pagos/${currentPagoId}/${currentAccion}/`);
                showToast('Éxito', `Pago ${currentAccion}do correctamente`, 'success');
                modalAccion.classList.remove('open');
                loadData();
            }
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnConfirmAccion.disabled = false;
        }
    });

    // Iniciar
    loadData();
});
