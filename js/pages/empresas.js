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
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnSaveModal = document.getElementById('btnSaveModal');
    const modalTitle = document.getElementById('modalTitle');
    const dataForm = document.getElementById('dataForm');

    let allData = [];
    let suscripcionesList = [];
    let planesList = [];
    let paquetesList = [];
    let usersList = [];

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            const [empRes, subsRes, planesRes, paquetesRes, usersRes] = await Promise.all([
                API.get('/empresas/'),
                API.get('/suscripciones/'),
                API.get('/planes/'),
                API.get('/paquetes/'),
                API.get('/usuarios/')
            ]);
            allData = empRes;
            suscripcionesList = subsRes;
            planesList = planesRes;
            paquetesList = paquetesRes;
            usersList = usersRes;
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
            <tr data-id="${item.id}" class="empresa-row" style="cursor: pointer;">
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

        // Bind Edit buttons (no se propagan al click de la fila)
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                const entity = allData.find(x => x.id == id);
                if (entity) openModal(entity);
            });
        });

        // Click en fila → drawer detalle
        document.querySelectorAll('.empresa-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.dataset.id;
                const entity = allData.find(x => x.id == id);
                if (entity) openDrawer(entity);
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
    function openModal(entity) {
        dataForm.reset();
        FORMS.clearErrors(dataForm);
        document.getElementById('entityId').value = entity.id;
        modalTitle.textContent = 'Editar Empresa';
        document.getElementById('rnc').value = entity.rnc || '';
        document.getElementById('razon_social').value = entity.razon_social || '';
        document.getElementById('nombre_comercial').value = entity.nombre_comercial || '';
        document.getElementById('ambiente').value = entity.ambiente || 'testecf';
        document.getElementById('estado').value = entity.estado || 'PENDIENTE_CERTIFICADO';
        document.getElementById('activa').checked = entity.activa;

        modalForm.classList.add('open');
    }

    function closeModal() {
        modalForm.classList.remove('open');
    }

    // --- GUARDAR (Editar) ---
    btnSaveModal.addEventListener('click', async () => {
        FORMS.clearErrors(dataForm);
        const rncInput = document.getElementById('rnc');
        rncInput.value = rncInput.value.replace(/\D/g, ''); // Limpiar en caso de copy-paste
        const rncValue = rncInput.value.trim();

        if (rncValue.length < 9 || rncValue.length > 11) {
            FORMS.showFieldErrors(dataForm, { rnc: ['El RNC debe tener entre 9 y 11 dígitos (Persona Jurídica 9 o Persona Física 11).'] });
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
            await API.patch(`/empresas/${id}/`, payload);
            showToast('Éxito', 'Empresa actualizada', 'success');
            closeModal();
            loadData();
        } catch (err) {
            if (err.fields) {
                const orphans = FORMS.apply(dataForm, err.fields);
                if (orphans.length) showToast('Error', orphans[0], 'error');
            } else {
                showToast('Error', err.message, 'error');
            }
        } finally {
            btnSaveModal.disabled = false;
            btnSaveModal.textContent = 'Guardar';
        }
    });

    // Eventos UI
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);

    // Limpieza y límite de RNC en tiempo real (solo dígitos, máximo 11)
    const rncInput = document.getElementById('rnc');
    if (rncInput) {
        rncInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
        });
    }

    // ── DRAWER LATERAL ─────────────────────────────────────
    const drawerOverlay   = document.getElementById('drawerOverlay');
    const drawer          = document.getElementById('drawer');
    const drawerTitle     = document.getElementById('drawerTitle');
    const drawerSubtitle  = document.getElementById('drawerSubtitle');
    const drawerInfo      = document.getElementById('drawerInfo');
    const adminList       = document.getElementById('adminList');
    const adminCount      = document.getElementById('adminCount');
    const btnDrawerEdit   = document.getElementById('btnDrawerEdit');
    const drawerClose     = document.getElementById('drawerClose');
    const addAdminDetails = document.getElementById('addAdminDetails');
    const addAdminForm    = document.getElementById('addAdminForm');
    const addAdminEmpresa = document.getElementById('addAdminEmpresaId');
    const btnCancelAdd    = document.getElementById('btnCancelAddAdmin');
    const btnSubmitAdd    = document.getElementById('btnSubmitAddAdmin');
    const addAdminSpinner = document.getElementById('addAdminSpinner');

    let currentDrawerEmpresa = null;

    function openDrawer(entity) {
        currentDrawerEmpresa = entity;
        drawerTitle.textContent = entity.razon_social || '—';
        drawerSubtitle.textContent = `RNC: ${entity.rnc} · ${entity.ambiente || ''}`;

        const activeSub = suscripcionesList.find(s => s.empresa === entity.id && s.estado === 'ACTIVA') || suscripcionesList.find(s => s.empresa === entity.id);
        const plan = activeSub ? planesList.find(p => p.id === activeSub.plan) : null;
        const paquetesEmpresa = paquetesList.filter(p => p.empresa === entity.id);
        const cantidadAdquirida = paquetesEmpresa.reduce((acc, p) => acc + (Number(p.total_comprobantes) || 0), 0);

        drawerInfo.innerHTML = `
            <div class="drawer-info-row"><span class="label">Nombre Comercial</span><span class="value">${entity.nombre_comercial || '—'}</span></div>
            <div class="drawer-info-row"><span class="label">Ambiente</span><span class="value"><span class="badge badge-${entity.ambiente === 'produccion' ? 'green' : 'gray'}">${entity.ambiente}</span></span></div>
            <div class="drawer-info-row"><span class="label">Estado</span><span class="value"><span class="badge badge-${entity.estado === 'ACTIVA' ? 'blue' : (entity.estado === 'SUSPENDIDA' ? 'red' : 'yellow')}">${entity.estado}</span></span></div>
            <div class="drawer-info-row"><span class="label">Activa</span><span class="value"><span class="badge badge-${entity.activa ? 'green' : 'red'}">${entity.activa ? 'Sí' : 'No'}</span></span></div>
            <div class="drawer-info-row"><span class="label">Plan activo</span><span class="value">${plan ? plan.nombre : 'Sin plan'}</span></div>
            <div class="drawer-info-row"><span class="label">Comprobantes adquiridos</span><span class="value">${cantidadAdquirida.toLocaleString('es-DO')}</span></div>
        `;

        renderAdminList(entity.id);
        addAdminEmpresa.value = entity.id;
        addAdminForm.reset();
        FORMS.clearErrors(addAdminForm);
        addAdminDetails.open = false;
        drawerOverlay.classList.add('open');
        drawerOverlay.setAttribute('aria-hidden', 'false');
    }

    function closeDrawer() {
        drawerOverlay.classList.remove('open');
        drawerOverlay.setAttribute('aria-hidden', 'true');
        currentDrawerEmpresa = null;
    }

    function renderAdminList(empresaId) {
        const admins = usersList.filter(u => u.empresa === empresaId);
        adminCount.textContent = `(${admins.length})`;
        if (admins.length === 0) {
            adminList.innerHTML = `<li class="kpi-sub" style="padding: 8px 0;">Sin administradores asignados.</li>`;
            return;
        }
        adminList.innerHTML = admins.map(a => {
            const initials = `${(a.nombre||'?')[0]}${(a.apellido||'?')[0]}`.toUpperCase();
            return `
                <li class="admin-item">
                    <div class="admin-avatar">${initials}</div>
                    <div class="admin-info">
                        <div class="admin-name">${a.nombre} ${a.apellido}</div>
                        <div class="admin-email" title="${a.email}">${a.email}</div>
                    </div>
                    <span class="badge badge-${a.is_active ? 'green' : 'red'}">${a.is_active ? 'ACTIVO' : 'INACTIVO'}</span>
                </li>
            `;
        }).join('');
    }

    async function refreshUsers() {
        try {
            usersList = await API.get('/usuarios/');
        } catch (e) {
            console.warn('No se pudo refrescar la lista de usuarios', e);
        }
    }

    function _validateAddAdminLocal() {
        const form = addAdminForm;
        FORMS.clearErrors(form);
        const errors = {};
        if (!form.nombre.value.trim())   errors.nombre = ['El nombre es obligatorio.'];
        if (!form.apellido.value.trim()) errors.apellido = ['El apellido es obligatorio.'];
        const email = form.email.value.trim();
        if (!email)                       errors.email = ['El correo es obligatorio.'];
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                                         errors.email = ['Formato de correo inválido.'];
        const pwd = form.password.value;
        if (!pwd)                         errors.password = ['La contraseña es obligatoria.'];
        else if (pwd.length < 8)          errors.password = ['Mínimo 8 caracteres.'];
        return errors;
    }

    async function _handleAddAdmin(e) {
        e.preventDefault();
        const errors = _validateAddAdminLocal();
        if (Object.keys(errors).length) {
            FORMS.apply(addAdminForm, errors);
            return;
        }
        if (!currentDrawerEmpresa) return;

        const payload = {
            email:     addAdminForm.email.value.trim(),
            nombre:    addAdminForm.nombre.value.trim(),
            apellido:  addAdminForm.apellido.value.trim(),
            password:  addAdminForm.password.value,
            rol:       'ADMIN_EMPRESA',
            empresa:   currentDrawerEmpresa.id,
            is_active: true,
        };

        btnSubmitAdd.disabled = true;
        addAdminSpinner.classList.remove('hidden');
        try {
            await API.post('/usuarios/', payload);
            showToast('Éxito', `Administrador ${payload.nombre} ${payload.apellido} creado.`, 'success');
            addAdminForm.reset();
            addAdminEmpresa.value = currentDrawerEmpresa.id;
            FORMS.clearErrors(addAdminForm);
            addAdminDetails.open = false;
            await refreshUsers();
            renderAdminList(currentDrawerEmpresa.id);
        } catch (err) {
            if (err.fields) {
                const orphans = FORMS.apply(addAdminForm, err.fields);
                if (orphans.length) showToast('Error', orphans[0], 'error');
            } else {
                showToast('Error', err.message, 'error');
            }
        } finally {
            btnSubmitAdd.disabled = false;
            addAdminSpinner.classList.add('hidden');
        }
    }

    drawerClose.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', (e) => {
        if (e.target === drawerOverlay) closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawerOverlay.classList.contains('open')) closeDrawer();
    });
    btnDrawerEdit.addEventListener('click', () => {
        if (currentDrawerEmpresa) {
            const entity = currentDrawerEmpresa;
            closeDrawer();
            openModal(entity);
        }
    });
    addAdminForm.addEventListener('submit', _handleAddAdmin);
    btnCancelAdd.addEventListener('click', () => {
        addAdminForm.reset();
        addAdminDetails.open = false;
        FORMS.clearErrors(addAdminForm);
    });
    
    // Iniciar
    loadData();
});
