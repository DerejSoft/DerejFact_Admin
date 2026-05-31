/**
 * DerejFact Admin — Secuenciales Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Secuenciales');

    const tableBody = document.getElementById('dataTableBody');
    const tableCount = document.getElementById('tableCount');
    const searchInput = document.getElementById('searchInput');

    // Modales
    const modalPreview = document.getElementById('modalPreview');
    const previewNCF = document.getElementById('previewNCF');
    const btnClosePreview = document.getElementById('btnClosePreview');

    const modalBloquear = document.getElementById('modalBloquear');
    const motivoBloqueoInput = document.getElementById('motivo_bloqueo');
    const btnCancelBloquear = document.getElementById('btnCancelBloquear');
    const btnConfirmBloquear = document.getElementById('btnConfirmBloquear');

    const modalDesbloquear = document.getElementById('modalDesbloquear');
    const btnCancelDesbloquear = document.getElementById('btnCancelDesbloquear');
    const btnConfirmDesbloquear = document.getElementById('btnConfirmDesbloquear');

    let allData = [];
    let empresasList = [];
    let currentId = null;

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            const [seqsRes, empRes] = await Promise.all([
                API.get('/secuenciales/'),
                API.get('/empresas/')
            ]);
            
            allData = seqsRes;
            empresasList = empRes;

            renderTable(allData);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', error.message || 'No se pudieron cargar los secuenciales', 'error');
        }
    }

    // --- RENDERIZADO ---
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No hay secuenciales registrados</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const emp = empresasList.find(e => e.id === item.empresa);
            const empName = emp ? emp.razon_social : 'Desconocida';
            
            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td><span class="badge badge-gray">${item.tipo_ecf}</span></td>
                <td><strong>${item.ultimo_numero}</strong></td>
                <td>
                    <div style="font-size: 0.8rem">Min: ${item.minimo_asignado}</div>
                    <div style="font-size: 0.8rem">Max: ${item.maximo_asignado}</div>
                </td>
                <td>
                    ${item.bloqueado 
                        ? `<span class="badge badge-red" title="${item.motivo_bloqueo}">BLOQUEADO</span>`
                        : `<span class="badge badge-green">ACTIVO</span>`
                    }
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-outline btn-preview" data-id="${item.id}" title="Ver Preview">
                            Preview
                        </button>
                        ${item.bloqueado 
                            ? `<button class="btn btn-sm btn-outline btn-desbloquear" data-id="${item.id}">Desbloquear</button>` 
                            : `<button class="btn btn-sm btn-outline btn-bloquear" data-id="${item.id}">Bloquear</button>`
                        }
                    </div>
                </td>
            </tr>
        `}).join('');

        // Binds
        document.querySelectorAll('.btn-preview').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                try {
                    const res = await API.get(`/secuenciales/${id}/preview/`);
                    previewNCF.textContent = res.siguiente_ncf || 'Error';
                    modalPreview.classList.add('open');
                } catch(err) {
                    showToast('Error', 'No se pudo obtener preview: ' + err.message, 'error');
                }
            });
        });

        document.querySelectorAll('.btn-bloquear').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentId = e.currentTarget.dataset.id;
                motivoBloqueoInput.value = '';
                modalBloquear.classList.add('open');
            });
        });

        document.querySelectorAll('.btn-desbloquear').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentId = e.currentTarget.dataset.id;
                modalDesbloquear.classList.add('open');
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

    // --- ACCIONES MODALES ---
    btnClosePreview.addEventListener('click', () => modalPreview.classList.remove('open'));
    
    btnCancelBloquear.addEventListener('click', () => { modalBloquear.classList.remove('open'); currentId = null; });
    btnCancelDesbloquear.addEventListener('click', () => { modalDesbloquear.classList.remove('open'); currentId = null; });

    btnConfirmBloquear.addEventListener('click', async () => {
        const motivo = motivoBloqueoInput.value.trim();
        if (!motivo) {
            showToast('Atención', 'Especifique el motivo', 'warning');
            return;
        }

        btnConfirmBloquear.disabled = true;
        try {
            await API.post(`/secuenciales/${currentId}/bloquear/`, { motivo });
            showToast('Éxito', 'Secuencial bloqueado', 'success');
            modalBloquear.classList.remove('open');
            loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnConfirmBloquear.disabled = false;
        }
    });

    btnConfirmDesbloquear.addEventListener('click', async () => {
        btnConfirmDesbloquear.disabled = true;
        try {
            await API.post(`/secuenciales/${currentId}/desbloquear/`);
            showToast('Éxito', 'Secuencial desbloqueado', 'success');
            modalDesbloquear.classList.remove('open');
            loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnConfirmDesbloquear.disabled = false;
        }
    });

    // Iniciar
    loadData();
});
