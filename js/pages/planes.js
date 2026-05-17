/**
 * DerejFact Admin — Planes Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Planes');

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

    let allData = [];

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            allData = await API.get('/planes/');
            // Ordenar por campo 'orden' si existe, si no por id
            allData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
            renderTable(allData);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', 'No se pudieron cargar los planes', 'error');
        }
    }

    // --- RENDERIZADO ---
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No hay planes registrados</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => `
            <tr>
                <td><span class="badge badge-gray">${item.orden || '-'}</span></td>
                <td>
                    <strong>${item.nombre}</strong>
                    <div class="kpi-sub">${item.descripcion || ''}</div>
                </td>
                <td><strong>${item.limite_comprobantes}</strong> e-CF</td>
                <td>
                    <div style="font-size: 0.8rem">Mensual: <strong>${fmtMoney(item.precio_mensual)}</strong></div>
                    <div style="font-size: 0.8rem">Anual: <strong>${fmtMoney(item.precio_anual)}</strong></div>
                </td>
                <td><span class="badge badge-${item.activo ? 'green' : 'red'}">${item.activo ? 'ACTIVO' : 'INACTIVO'}</span></td>
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
        `).join('');

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

        const filtered = allData.filter(item => 
            (item.nombre && item.nombre.toLowerCase().includes(query)) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(query))
        );
        renderTable(filtered);
    }, 300));

    // --- MODAL LOGIC ---
    function openModal(entity = null) {
        dataForm.reset();
        document.getElementById('entityId').value = '';
        
        if (entity) {
            modalTitle.textContent = 'Editar Plan';
            document.getElementById('entityId').value = entity.id;
            document.getElementById('nombre').value = entity.nombre || '';
            document.getElementById('orden').value = entity.orden || 1;
            document.getElementById('descripcion').value = entity.descripcion || '';
            document.getElementById('limite_comprobantes').value = entity.limite_comprobantes || 0;
            document.getElementById('ciclo_disponible').value = entity.ciclo_disponible || 'AMBOS';
            document.getElementById('precio_mensual').value = entity.precio_mensual || 0;
            document.getElementById('precio_anual').value = entity.precio_anual || 0;
            document.getElementById('dias_gracia').value = entity.dias_gracia || 5;
            
            // Array a string separado por comas
            const ecfs = Array.isArray(entity.tipos_ecf_permitidos) ? entity.tipos_ecf_permitidos.join(', ') : '';
            document.getElementById('tipos_ecf_input').value = ecfs;
            
            document.getElementById('activo').checked = entity.activo;
        } else {
            modalTitle.textContent = 'Nuevo Plan';
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
        
        // Parsear tipos ECF
        const tiposInput = document.getElementById('tipos_ecf_input').value;
        const tipos_ecf_permitidos = tiposInput.split(',')
            .map(t => parseInt(t.trim()))
            .filter(t => !isNaN(t));

        const payload = {
            nombre: document.getElementById('nombre').value,
            orden: parseInt(document.getElementById('orden').value),
            descripcion: document.getElementById('descripcion').value,
            limite_comprobantes: parseInt(document.getElementById('limite_comprobantes').value),
            ciclo_disponible: document.getElementById('ciclo_disponible').value,
            precio_mensual: document.getElementById('precio_mensual').value,
            precio_anual: document.getElementById('precio_anual').value,
            dias_gracia: parseInt(document.getElementById('dias_gracia').value),
            tipos_ecf_permitidos: tipos_ecf_permitidos,
            activo: document.getElementById('activo').checked
        };

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Guardando...';

        try {
            if (id) {
                await API.patch(`/planes/${id}/`, payload);
                showToast('Éxito', 'Plan actualizado', 'success');
            } else {
                await API.post('/planes/', payload);
                showToast('Éxito', 'Plan creado', 'success');
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
