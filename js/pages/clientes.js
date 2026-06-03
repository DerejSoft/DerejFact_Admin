/**
 * DerejFact Admin — Clientes Logic
 * CRUD completo: POST/GET/PATCH/DELETE /clientes/
 * Identificador: rnc_cedula (string)
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Clientes');

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
    let empresasList = [];

    // ── CARGA ───────────────────────────────────────────────
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            const [clientesRes, empRes] = await Promise.all([
                API.get('/clientes/'),
                API.get('/empresas/')
            ]);
            allData = clientesRes;
            empresasList = empRes;
            renderTable(allData);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', error.message || 'No se pudieron cargar los clientes', 'error');
        }
    }

    // ── RENDER ──────────────────────────────────────────────
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No hay clientes registrados</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            let empName = '';
            if (item.empresa) {
                const emp = empresasList.find(e => e.id === item.empresa);
                empName = emp ? emp.razon_social : '';
            }

            return `
            <tr>
                <td><strong>${item.rnc_cedula}</strong></td>
                <td>
                    <div>${item.nombre}</div>
                    ${empName ? `<div class="kpi-sub">${empName}</div>` : ''}
                </td>
                <td>${item.correo || '—'}</td>
                <td>${item.telefono || '—'}</td>
                <td><span class="badge badge-${item.activo ? 'blue' : 'red'}">${item.activo ? 'ACTIVO' : 'INACTIVO'}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-icon btn-ghost btn-edit" data-rnc="${item.rnc_cedula}" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button class="btn btn-icon btn-ghost btn-delete" data-rnc="${item.rnc_cedula}" title="Desactivar">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rnc = e.currentTarget.dataset.rnc;
                const entity = allData.find(x => x.rnc_cedula === rnc || x.rnc_cedula == rnc);
                if (entity) openModal(entity);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rnc = e.currentTarget.dataset.rnc;
                const entity = allData.find(x => x.rnc_cedula === rnc || x.rnc_cedula == rnc);
                if (entity) handleDelete(entity);
            });
        });
    }

    // ── BUSCADOR ────────────────────────────────────────────
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase();
        if (!query) return renderTable(allData);

        const filtered = allData.filter(item =>
            (item.rnc_cedula && item.rnc_cedula.toLowerCase().includes(query)) ||
            (item.nombre && item.nombre.toLowerCase().includes(query)) ||
            (item.correo && item.correo.toLowerCase().includes(query))
        );
        renderTable(filtered);
    }, 300));

    // ── MODAL ────────────────────────────────────────────────
    function openModal(entity = null) {
        dataForm.reset();
        FORMS.clearErrors(dataForm);
        document.getElementById('entityId').value = '';

        const rncInput = document.getElementById('rnc_cedula');

        if (entity) {
            modalTitle.textContent = 'Editar Cliente';
            document.getElementById('entityId').value = entity.rnc_cedula;
            rncInput.value = entity.rnc_cedula || '';
            rncInput.readOnly = true;
            rncInput.classList.add('readonly');
            document.getElementById('nombre').value = entity.nombre || '';
            document.getElementById('correo').value = entity.correo || '';
            document.getElementById('telefono').value = entity.telefono || '';
            document.getElementById('direccion').value = entity.direccion || '';
        } else {
            modalTitle.textContent = 'Nuevo Cliente';
            rncInput.readOnly = false;
            rncInput.classList.remove('readonly');
        }

        modalForm.classList.add('open');
    }

    function closeModal() {
        modalForm.classList.remove('open');
    }

    // ── GUARDAR ──────────────────────────────────────────────
    btnSaveModal.addEventListener('click', async () => {
        FORMS.clearErrors(dataForm);

        const rncInput = document.getElementById('rnc_cedula');
        rncInput.value = rncInput.value.replace(/\D/g, '').slice(0, 11);
        const rncCedula = rncInput.value.trim();

        if (!rncCedula) {
            FORMS.showFieldErrors(dataForm, { rnc_cedula: ['El RNC/Cédula es obligatorio.'] });
            rncInput.focus();
            return;
        }
        if (rncCedula.length !== 9 && rncCedula.length !== 11) {
            FORMS.showFieldErrors(dataForm, { rnc_cedula: ['Debe tener 9 (RNC) u 11 (Cédula) dígitos.'] });
            rncInput.focus();
            return;
        }

        if (!document.getElementById('nombre').value.trim()) {
            FORMS.showFieldErrors(dataForm, { nombre: ['El nombre es obligatorio.'] });
            return;
        }

        const isEdit = !!document.getElementById('entityId').value;
        const payload = {
            rnc_cedula: rncCedula,
            nombre: document.getElementById('nombre').value.trim(),
            correo: document.getElementById('correo').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            direccion: document.getElementById('direccion').value.trim(),
        };

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Guardando...';

        try {
            if (isEdit) {
                await API.patch(`/clientes/${rncCedula}/`, payload);
                showToast('Éxito', 'Cliente actualizado', 'success');
            } else {
                await API.post('/clientes/', payload);
                showToast('Éxito', 'Cliente creado', 'success');
            }
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

    // ── ELIMINAR (borrado lógico) ────────────────────────────
    async function handleDelete(entity) {
        if (!confirm(`¿Desactivar al cliente "${entity.nombre}" (${entity.rnc_cedula})?`)) return;

        try {
            await API.delete(`/clientes/${entity.rnc_cedula}/`);
            showToast('Éxito', 'Cliente desactivado correctamente', 'success');
            loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        }
    }

    // ── RNC limpieza en tiempo real ──────────────────────────
    const rncInputField = document.getElementById('rnc_cedula');
    if (rncInputField) {
        rncInputField.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
        });
    }

    // Eventos UI
    btnNew.addEventListener('click', () => openModal());
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);

    // Iniciar
    loadData();
});
