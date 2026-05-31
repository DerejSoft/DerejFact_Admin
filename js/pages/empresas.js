/**
 * DerejFact Admin — Empresas Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Empresas');

    const tableBody = document.getElementById('dataTableBody');
    const tableCount = document.getElementById('tableCount');
    const searchInput = document.getElementById('searchInput');
    
    // Modal elements
    const modalForm = document.getElementById('modalForm');
    const btnNew = document.getElementById('btnNew');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnSaveModal = document.getElementById('btnSaveModal');
    const modalTitle = document.getElementById('modalTitle');
    const dataForm = document.getElementById('dataForm');

    let allData = [];
    let suscripcionesList = [];
    let planesList = [];
    let paquetesList = [];

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            const [empRes, subsRes, planesRes, paquetesRes] = await Promise.all([
                API.get('/empresas/'),
                API.get('/suscripciones/'),
                API.get('/planes/'),
                API.get('/paquetes/')
            ]);
            allData = empRes;
            suscripcionesList = subsRes;
            planesList = planesRes;
            paquetesList = paquetesRes;
            renderTable(allData);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', error.message || 'No se pudieron cargar las empresas', 'error');
        }
    }

    // --- RENDERIZADO ---
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No hay empresas registradas</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const subsEmpresa = suscripcionesList.filter(s => s.empresa == item.id);
            const activeSub = subsEmpresa.find(s => s.estado === 'ACTIVA') || subsEmpresa[0];
            const plan = activeSub ? planesList.find(p => p.id === activeSub.plan) : null;
            const planName = plan ? plan.nombre : 'Sin plan';

            const paquetesEmpresa = paquetesList.filter(p => p.empresa == item.id);
            const cantidadAdquirida = paquetesEmpresa.reduce((acc, p) => {
                const total = Number(p.total_comprobantes) || 0;
                return acc + total;
            }, 0);

            return `
            <tr>
                <td><strong>${item.rnc}</strong></td>
                <td>
                    <div>${item.razon_social}</div>
                    ${item.nombre_comercial ? `<div class="kpi-sub">${item.nombre_comercial}</div>` : ''}
                </td>
                <td><span class="badge badge-gray">${planName}</span></td>
                <td><strong>${cantidadAdquirida}</strong></td>
                <td><span class="badge badge-${item.ambiente === 'produccion' ? 'green' : 'gray'}">${item.ambiente}</span></td>
                <td><span class="badge badge-${item.activa ? 'blue' : 'red'}">${item.activa ? 'ACTIVA' : 'INACTIVA'}</span></td>
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

        const filtered = allData.filter(item => 
            (item.rnc && item.rnc.toLowerCase().includes(query)) ||
            (item.razon_social && item.razon_social.toLowerCase().includes(query)) ||
            (item.nombre_comercial && item.nombre_comercial.toLowerCase().includes(query))
        );
        renderTable(filtered);
    }, 300));

    // --- MODAL LOGIC ---
    function openModal(entity = null) {
        dataForm.reset();
        document.getElementById('entityId').value = '';
        
        if (entity) {
            modalTitle.textContent = 'Editar Empresa';
            document.getElementById('entityId').value = entity.id;
            document.getElementById('rnc').value = entity.rnc || '';
            document.getElementById('razon_social').value = entity.razon_social || '';
            document.getElementById('nombre_comercial').value = entity.nombre_comercial || '';
            document.getElementById('ambiente').value = entity.ambiente || 'testecf';
            document.getElementById('estado').value = entity.estado || 'PENDIENTE_CERTIFICADO';
            document.getElementById('activa').checked = entity.activa;
        } else {
            modalTitle.textContent = 'Nueva Empresa';
        }
        
        modalForm.classList.add('open');
    }

    function closeModal() {
        modalForm.classList.remove('open');
    }

    // --- GUARDAR (Crear / Editar) ---
    btnSaveModal.addEventListener('click', async () => {
        const rncInput = document.getElementById('rnc');
        rncInput.value = rncInput.value.replace(/\D/g, ''); // Limpiar en caso de copy-paste
        const rncValue = rncInput.value.trim();

        if (rncValue.length < 9 || rncValue.length > 11) {
            showToast('Validación RNC', 'El RNC debe tener entre 9 y 11 dígitos (Persona Jurídica 9 o Persona Física 11).', 'warning');
            rncInput.focus();
            return;
        }

        if (!dataForm.checkValidity()) {
            dataForm.reportValidity();
            return;
        }

        const id = document.getElementById('entityId').value;
        const payload = {
            rnc: document.getElementById('rnc').value,
            razon_social: document.getElementById('razon_social').value,
            nombre_comercial: document.getElementById('nombre_comercial').value,
            ambiente: document.getElementById('ambiente').value,
            estado: document.getElementById('estado').value,
            activa: document.getElementById('activa').checked
        };

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Guardando...';

        try {
            if (id) {
                await API.patch(`/empresas/${id}/`, payload);
                showToast('Éxito', 'Empresa actualizada', 'success');
            } else {
                await API.post('/empresas/', payload);
                showToast('Éxito', 'Empresa creada', 'success');
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

    // Limpieza y límite de RNC en tiempo real (solo dígitos, máximo 11)
    const rncInput = document.getElementById('rnc');
    if (rncInput) {
        rncInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
        });
    }
    
    // Iniciar
    loadData();
});
