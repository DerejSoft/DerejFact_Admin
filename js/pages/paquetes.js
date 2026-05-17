/**
 * DerejFact Admin — Paquetes Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Paquetes');

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
    
    const empresaSelectForm = document.getElementById('empresa');
    const suscripcionSelectForm = document.getElementById('suscripcion');
    const planSelectForm = document.getElementById('plan');

    let allData = [];
    let empresasList = [];
    let suscripcionesList = [];
    let planesList = [];

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            const [paquetesRes, empRes, subsRes, planesRes] = await Promise.all([
                API.get('/paquetes/'),
                API.get('/empresas/'),
                API.get('/suscripciones/'),
                API.get('/planes/')
            ]);
            
            allData = paquetesRes;
            empresasList = empRes;
            suscripcionesList = subsRes;
            planesList = planesRes;
            
            empresaSelectForm.innerHTML = `<option value="">Seleccione una empresa...</option>` + 
                empresasList.map(e => `<option value="${e.id}">${e.razon_social}</option>`).join('');

            renderTable(allData);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', 'No se pudieron cargar los paquetes', 'error');
        }
    }

    // --- RENDERIZADO ---
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No hay paquetes registrados</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const emp = empresasList.find(e => e.id === item.empresa);
            const empName = emp ? emp.razon_social : 'Desconocida';
            
            const total = item.total_comprobantes || 1;
            const usados = item.comprobantes_usados || 0;
            const disponibles = total - usados;
            const percent = Math.min(100, Math.round((usados / total) * 100));
            
            let barColor = '';
            if (percent >= 90) barColor = 'danger';
            else if (percent >= 75) barColor = 'warning';

            let estadoColor = 'gray';
            if (item.estado === 'ACTIVO') estadoColor = 'green';
            else if (item.estado === 'AGOTADO' || item.estado === 'VENCIDO') estadoColor = 'red';
            else if (item.estado === 'PENDIENTE') estadoColor = 'yellow';

            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td>
                    <span class="badge badge-gray">${item.origen}</span>
                </td>
                <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                        <span>${usados} usados</span>
                        <strong>${disponibles} disp.</strong>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${barColor}" style="width: ${percent}%"></div>
                    </div>
                </td>
                <td>${fmtDate(item.fecha_vencimiento)}</td>
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
        
        suscripcionSelectForm.innerHTML = '<option value="">Seleccione la empresa primero...</option>';
        planSelectForm.innerHTML = '<option value="">Seleccione la empresa primero...</option>';
        suscripcionSelectForm.disabled = true;
        planSelectForm.disabled = true;

        if (entity) {
            modalTitle.textContent = 'Editar Paquete';
            document.getElementById('entityId').value = entity.id;
            document.getElementById('empresa').value = entity.empresa || '';
            document.getElementById('empresa').disabled = true;

            // Trigger change manually to populate selects for this company
            populateSelectsForEmpresa(entity.empresa);
            
            setTimeout(() => {
                document.getElementById('suscripcion').value = entity.suscripcion || '';
                document.getElementById('plan').value = entity.plan || '';
            }, 50);

            document.getElementById('total_comprobantes').value = entity.total_comprobantes || 0;
            document.getElementById('comprobantes_usados').value = entity.comprobantes_usados || 0;
            document.getElementById('origen').value = entity.origen || 'SUSCRIPCION';
            document.getElementById('estado').value = entity.estado || 'ACTIVO';
            
            // Format datetime for input type datetime-local (YYYY-MM-DDThh:mm)
            const formatDateTime = (iso) => iso ? new Date(iso).toISOString().slice(0, 16) : '';
            document.getElementById('fecha_vencimiento').value = formatDateTime(entity.fecha_vencimiento);
            
        } else {
            modalTitle.textContent = 'Nuevo Paquete';
            document.getElementById('empresa').disabled = false;
            
            // Default expiration to next month
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            document.getElementById('fecha_vencimiento').value = nextMonth.toISOString().slice(0, 16);
        }
        
        modalForm.classList.add('open');
    }

    function populateSelectsForEmpresa(empresaId) {
        suscripcionSelectForm.innerHTML = '<option value="">Ninguna (Paquete manual / Cortesía)</option>';
        planSelectForm.innerHTML = '<option value="">Ninguno (Paquete manual / Cortesía)</option>';
        
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
    }

    empresaSelectForm.addEventListener('change', (e) => {
        populateSelectsForEmpresa(e.target.value);
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

    // --- GUARDAR (Crear / Editar) ---
    btnSaveModal.addEventListener('click', async () => {
        if (!dataForm.checkValidity()) {
            dataForm.reportValidity();
            return;
        }

        const id = document.getElementById('entityId').value;
        const payload = {
            suscripcion: document.getElementById('suscripcion').value || null,
            plan: document.getElementById('plan').value || null,
            total_comprobantes: parseInt(document.getElementById('total_comprobantes').value),
            comprobantes_usados: parseInt(document.getElementById('comprobantes_usados').value),
            origen: document.getElementById('origen').value,
            estado: document.getElementById('estado').value,
            // Convertir a formato ISO con Z al final para la API
            fecha_vencimiento: new Date(document.getElementById('fecha_vencimiento').value).toISOString()
        };

        if (!id) {
            payload.empresa = document.getElementById('empresa').value;
        }

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Guardando...';

        try {
            if (id) {
                await API.patch(`/paquetes/${id}/`, payload);
                showToast('Éxito', 'Paquete actualizado', 'success');
            } else {
                await API.post('/paquetes/', payload);
                showToast('Éxito', 'Paquete creado', 'success');
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
    
    // Iniciar
    loadData();
});
