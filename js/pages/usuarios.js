/**
 * DerejFact Admin — Usuarios Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Usuarios');

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
    
    const rolSelect = document.getElementById('rol');
    const empresaSelect = document.getElementById('empresa');
    const passwordInput = document.getElementById('password');

    let allData = [];
    let empresasList = [];

    // Dependencia: Rol vs Empresa
    rolSelect.addEventListener('change', (e) => {
        if (e.target.value === 'SUPERADMIN') {
            empresaSelect.value = '';
            empresaSelect.disabled = true;
        } else {
            empresaSelect.disabled = false;
        }
    });

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            // Cargar usuarios y empresas en paralelo para los selects
            const [usersRes, empRes] = await Promise.all([
                API.get('/usuarios/'),
                API.get('/empresas/')
            ]);
            allData = usersRes;
            empresasList = empRes;
            
            // Llenar select de empresas
            empresaSelect.innerHTML = `<option value="">Seleccione una empresa...</option>` + 
                empresasList.map(e => `<option value="${e.id}">${e.razon_social} (${e.rnc})</option>`).join('');

            renderTable(allData);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', 'No se pudieron cargar los usuarios', 'error');
        }
    }

    // --- RENDERIZADO ---
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No hay usuarios registrados</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            // Buscar nombre de empresa (la API podría devolver UUID o string)
            let empName = 'N/A';
            if (item.empresa) {
                const emp = empresasList.find(e => e.id === item.empresa);
                empName = emp ? emp.razon_social : 'ID: ' + String(item.empresa).substring(0,8);
            }
            if (item.rol === 'SUPERADMIN') empName = 'Todas (Global)';

            return `
            <tr>
                <td><strong>${item.email}</strong></td>
                <td>${item.nombre} ${item.apellido}</td>
                <td><span class="badge badge-${item.rol === 'SUPERADMIN' ? 'red' : 'gray'}">${item.rol}</span></td>
                <td><span class="kpi-sub">${empName}</span></td>
                <td><span class="badge badge-${item.is_active ? 'blue' : 'red'}">${item.is_active ? 'ACTIVO' : 'INACTIVO'}</span></td>
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
            (item.email && item.email.toLowerCase().includes(query)) ||
            (item.nombre && item.nombre.toLowerCase().includes(query)) ||
            (item.apellido && item.apellido.toLowerCase().includes(query))
        );
        renderTable(filtered);
    }, 300));

    // --- MODAL LOGIC ---
    function openModal(entity = null) {
        dataForm.reset();
        document.getElementById('entityId').value = '';
        
        const passReq = document.getElementById('passRequired');
        const passHint = document.getElementById('passHint');
        
        if (entity) {
            modalTitle.textContent = 'Editar Usuario';
            document.getElementById('entityId').value = entity.id;
            document.getElementById('email').value = entity.email || '';
            document.getElementById('nombre').value = entity.nombre || '';
            document.getElementById('apellido').value = entity.apellido || '';
            document.getElementById('rol').value = entity.rol || 'ADMIN_EMPRESA';
            document.getElementById('empresa').value = entity.empresa || '';
            document.getElementById('is_active').checked = entity.is_active;
            
            // Password opcional en edición
            passwordInput.required = false;
            passReq.style.display = 'none';
            passHint.style.display = 'block';
        } else {
            modalTitle.textContent = 'Nuevo Usuario';
            passwordInput.required = true;
            passReq.style.display = 'inline';
            passHint.style.display = 'none';
        }
        
        // Disparar evento change manual para habilitar/deshabilitar empresa
        rolSelect.dispatchEvent(new Event('change'));
        
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
        const rol = document.getElementById('rol').value;
        const empresa = document.getElementById('empresa').value;

        if (rol === 'ADMIN_EMPRESA' && !empresa) {
            showToast('Aviso', 'Debe seleccionar una empresa para este rol.', 'warning');
            return;
        }

        const payload = {
            email: document.getElementById('email').value,
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            rol: rol,
            empresa: rol === 'SUPERADMIN' ? null : empresa,
            is_active: document.getElementById('is_active').checked
        };

        const pass = passwordInput.value;
        if (pass) {
            payload.password = pass; // Solo enviarlo si lo escribió
        }

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Guardando...';

        try {
            if (id) {
                await API.patch(`/usuarios/${id}/`, payload);
                showToast('Éxito', 'Usuario actualizado', 'success');
            } else {
                await API.post('/usuarios/', payload);
                showToast('Éxito', 'Usuario creado', 'success');
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
