/**
 * DerejFact Admin — Suscripciones Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Suscripciones');

    const tableBody = document.getElementById('dataTableBody');
    const tableCount = document.getElementById('tableCount');
    const searchInput = document.getElementById('searchInput');
    
    // Form elements
    const modalForm = document.getElementById('modalForm');
    const btnNew = document.getElementById('btnNew');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnSaveModal = document.getElementById('btnSaveModal');
    const modalTitle = document.getElementById('modalTitle');
    const dataForm = document.getElementById('dataForm');
    
    const empresaSelect = document.getElementById('empresa');
    const planSelect = document.getElementById('plan');

    let allData = [];
    let empresasList = [];
    let planesList = [];

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            const [subsRes, empRes, planesRes] = await Promise.all([
                API.get('/suscripciones/'),
                API.get('/empresas/'),
                API.get('/planes/')
            ]);
            
            allData = subsRes;
            empresasList = empRes;
            planesList = planesRes;
            
            // Llenar selects
            empresaSelect.innerHTML = `<option value="">Seleccione una empresa...</option>` + 
                empresasList.map(e => `<option value="${e.id}">${e.razon_social}</option>`).join('');
                
            planSelect.innerHTML = `<option value="">Seleccione un plan...</option>` + 
                planesList.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

            renderTable(allData);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', 'No se pudieron cargar las suscripciones', 'error');
        }
    }

    // --- RENDERIZADO ---
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No hay suscripciones registradas</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const emp = empresasList.find(e => e.id === item.empresa);
            const plan = planesList.find(p => p.id === item.plan);
            const empName = emp ? emp.razon_social : 'Desconocida';
            const planName = plan ? plan.nombre : 'Desconocido';

            let estadoColor = 'gray';
            if (item.estado === 'ACTIVA') estadoColor = 'green';
            else if (item.estado === 'VENCIDA' || item.estado === 'CANCELADA') estadoColor = 'red';
            else if (item.estado === 'SUSPENDIDA') estadoColor = 'yellow';

            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td><span class="badge badge-blue">${planName}</span></td>
                <td>${item.ciclo}</td>
                <td>${fmtDate(item.fecha_inicio)}</td>
                <td>${fmtDate(item.fecha_renovacion)}</td>
                <td><span class="badge badge-${estadoColor}">${item.estado}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-icon btn-ghost btn-edit" data-id="${item.id}" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');

        // Bind Edit buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const entity = allData.find(x => x.id == id);
                if (entity) openModal(entity);
            });
        });
    }

    // --- BUSCADOR SEMÁNTICO (Local) ---
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase();
        if (!query) return renderTable(allData);

        const filtered = allData.filter(item => {
            const emp = empresasList.find(emp => emp.id === item.empresa);
            return emp && emp.razon_social.toLowerCase().includes(query);
        });
        renderTable(filtered);
    }, 300));

    // --- MODAL LOGIC ---
    function openModal(entity = null) {
        dataForm.reset();
        document.getElementById('entityId').value = '';
        const groupPrecio = document.getElementById('group_precio_pagado');
        
        if (entity) {
            modalTitle.textContent = 'Editar Suscripción';
            document.getElementById('entityId').value = entity.id;
            document.getElementById('empresa').value = entity.empresa || '';
            document.getElementById('plan').value = entity.plan || '';
            document.getElementById('ciclo').value = entity.ciclo || 'MENSUAL';
            document.getElementById('estado').value = entity.estado || 'ACTIVA';
            document.getElementById('precio_pagado').value = entity.precio_pagado || 0;
            
            // Format dates for input type date (YYYY-MM-DD)
            const formatDateForInput = (iso) => iso ? new Date(iso).toISOString().split('T')[0] : '';
            document.getElementById('fecha_inicio').value = formatDateForInput(entity.fecha_inicio);
            document.getElementById('fecha_renovacion').value = formatDateForInput(entity.fecha_renovacion);
            
            // Empresa is usually readonly on edit
            document.getElementById('empresa').disabled = true;
            if (groupPrecio) groupPrecio.style.display = 'block';
        } else {
            modalTitle.textContent = 'Nueva Suscripción';
            document.getElementById('empresa').disabled = false;
            if (groupPrecio) groupPrecio.style.display = 'none';
            document.getElementById('precio_pagado').value = 0;
            
            // Default dates
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setMonth(today.getMonth() + 1);
            
            document.getElementById('fecha_inicio').value = today.toISOString().split('T')[0];
            document.getElementById('fecha_renovacion').value = nextMonth.toISOString().split('T')[0];
        }
        
        modalForm.classList.add('open');
    }

    function closeModal() {
        modalForm.classList.remove('open');
    }

    // --- GUARDAR (Crear / Editar) ---
    btnSaveModal.addEventListener('click', async () => {
        if (!dataForm.checkValidity()) {
            dataForm.reportValidity();
            return;
        }

        const id = document.getElementById('entityId').value;
        const payload = {
            plan: document.getElementById('plan').value,
            ciclo: document.getElementById('ciclo').value,
            estado: document.getElementById('estado').value,
            fecha_inicio: document.getElementById('fecha_inicio').value,
            fecha_renovacion: document.getElementById('fecha_renovacion').value,
            precio_pagado: document.getElementById('precio_pagado').value
        };

        if (!id) {
            payload.empresa = document.getElementById('empresa').value;
        }

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Guardando...';

        try {
            if (id) {
                await API.patch(`/suscripciones/${id}/`, payload);
                showToast('Éxito', 'Suscripción actualizada', 'success');
            } else {
                await API.post('/suscripciones/', payload);
                showToast('Éxito', 'Suscripción creada', 'success');
            }
            closeModal();
            loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnSaveModal.disabled = false;
            btnSaveModal.textContent = 'Guardar';
        }
    });

    // Eventos UI
    btnNew.addEventListener('click', () => openModal());
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);

    // Escuchar selección de empresa para precarga inteligente
    if (empresaSelect) {
        empresaSelect.addEventListener('change', (e) => {
            const empId = e.target.value;
            const isNew = !document.getElementById('entityId').value;
            
            if (isNew && empId) {
                // Buscar si ya tiene una suscripción existente
                const existingSub = allData.find(s => s.empresa == empId);
                if (existingSub) {
                    showToast('Información', 'Se precargaron los datos de la última suscripción de la empresa', 'info');
                    
                    document.getElementById('plan').value = existingSub.plan || '';
                    document.getElementById('ciclo').value = existingSub.ciclo || 'MENSUAL';
                    document.getElementById('estado').value = existingSub.estado || 'ACTIVA';
                    
                    // Nueva fecha inicio = anterior fecha renovación
                    const oldRenovacion = existingSub.fecha_renovacion;
                    if (oldRenovacion) {
                        const startDate = new Date(oldRenovacion);
                        // Asegurar el string YYYY-MM-DD sin problemas de zona horaria
                        const startStr = startDate.toISOString().split('T')[0];
                        document.getElementById('fecha_inicio').value = startStr;
                        
                        // Recalcular renovación
                        recalculateRenewalDate();
                    }
                }
            }
        });
    }

    // Función auxiliar para recalcular fecha de renovación basada en ciclo (mes/año)
    function recalculateRenewalDate() {
        const startVal = document.getElementById('fecha_inicio').value;
        const cycle = document.getElementById('ciclo').value;
        const renewInput = document.getElementById('fecha_renovacion');
        
        if (startVal && renewInput) {
            // Usar formato ISO local añadiendo T00:00:00 para evitar que desfase por zona horaria
            const startDate = new Date(startVal + 'T00:00:00');
            const endDate = new Date(startDate);
            
            if (cycle === 'ANUAL') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
                endDate.setMonth(endDate.getMonth() + 1);
            }
            
            renewInput.value = endDate.toISOString().split('T')[0];
        }
    }

    // Escuchar cambios de ciclo y fecha de inicio para recalcular renovación
    const cicloSelect = document.getElementById('ciclo');
    if (cicloSelect) {
        cicloSelect.addEventListener('change', recalculateRenewalDate);
    }
    
    const fechaInicioInput = document.getElementById('fecha_inicio');
    if (fechaInicioInput) {
        fechaInicioInput.addEventListener('change', recalculateRenewalDate);
    }
    
    // Iniciar
    loadData();
});
