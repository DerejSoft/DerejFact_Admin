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

        let filtered = allData;

        // 1. Filtro por tab
        if (currentTab === 'pendientes') {
            filtered = filtered.filter(p => p.estado === 'PENDIENTE');
        } else if (currentTab === 'historial') {
            filtered = filtered.filter(p => p.estado !== 'PENDIENTE');
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
                    ` : '<span class="text-muted" style="font-size:0.75rem">Sin acciones</span>'}
                </td>
            </tr>
        `}).join('');

        // Binds
        document.querySelectorAll('.btn-confirmar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentPagoId = e.currentTarget.dataset.id;
                currentAccion = 'confirmar';
                
                accionIcon.className = 'confirm-icon green';
                accionIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
                accionTitle.textContent = 'Confirmar Pago';
                accionText.textContent = '¿Está seguro que ha recibido y verificado este pago?';
                btnConfirmAccion.className = 'btn btn-accent';
                btnConfirmAccion.textContent = 'Confirmar Pago';
                
                modalAccion.classList.add('open');
            });
        });

        document.querySelectorAll('.btn-rechazar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentPagoId = e.currentTarget.dataset.id;
                currentAccion = 'rechazar';
                
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
        const planId = selectedOption.getAttribute('data-plan-id');
        if (planId) {
            planSelectForm.value = planId;
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

        const payload = {
            empresa: document.getElementById('empresa').value,
            suscripcion: document.getElementById('suscripcion').value || null,
            plan: document.getElementById('plan').value || null,
            monto: parseFloat(document.getElementById('monto').value).toFixed(2),
            moneda: document.getElementById('moneda').value,
            metodo_pago: document.getElementById('metodo_pago').value,
            referencia: document.getElementById('referencia').value || null,
            fecha_pago: new Date(document.getElementById('fecha_pago').value).toISOString(),
            fecha_corte: document.getElementById('fecha_corte').value ? parseInt(document.getElementById('fecha_corte').value) : null,
            observaciones: document.getElementById('observaciones').value || null
        };

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Registrando...';

        try {
            await API.post('/pagos/', payload);
            showToast('Éxito', 'Pago registrado correctamente', 'success');
            closeModal();
            loadData();
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
            await API.post(`/pagos/${currentPagoId}/${currentAccion}/`);
            showToast('Éxito', `Pago ${currentAccion}do correctamente`, 'success');
            modalAccion.classList.remove('open');
            loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnConfirmAccion.disabled = false;
        }
    });

    // Iniciar
    loadData();
});
