/**
 * DerejFact Admin — API Keys Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('API Keys');

    const tableBody = document.getElementById('dataTableBody');
    const tableCount = document.getElementById('tableCount');
    const searchInput = document.getElementById('searchInput');
    
    // Modal Create
    const modalForm = document.getElementById('modalForm');
    const btnNew = document.getElementById('btnNew');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnSaveModal = document.getElementById('btnSaveModal');
    const dataForm = document.getElementById('dataForm');
    const empresaSelect = document.getElementById('empresa');

    // Modal Token
    const modalToken = document.getElementById('modalToken');
    const tokenDisplay = document.getElementById('tokenDisplay');
    const btnCopyToken = document.getElementById('btnCopyToken');
    const copyTokenText = document.getElementById('copyTokenText');
    const btnUnderstandToken = document.getElementById('btnUnderstandToken');

    // Modal Revocar
    const modalRevocar = document.getElementById('modalRevocar');
    const btnCancelRevocar = document.getElementById('btnCancelRevocar');
    const btnConfirmRevocar = document.getElementById('btnConfirmRevocar');
    const motivoRevocarInput = document.getElementById('motivo_revocar');

    let allData = [];
    let empresasList = [];
    let keyToRevokeId = null;

    // --- CARGA DE DATOS ---
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 30px;"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            const [keysRes, empRes] = await Promise.all([
                API.get('/api-keys/'),
                API.get('/empresas/')
            ]);
            
            allData = keysRes;
            empresasList = empRes;
            
            empresaSelect.innerHTML = `<option value="">Seleccione una empresa...</option>` + 
                empresasList.map(e => `<option value="${e.id}">${e.razon_social}</option>`).join('');

            renderTable(allData);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', 'No se pudieron cargar las API Keys', 'error');
        }
    }

    // --- RENDERIZADO ---
    function renderTable(data) {
        tableCount.textContent = `(${data.length})`;
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No hay API Keys registradas</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const emp = empresasList.find(e => e.id === item.empresa);
            const empName = emp ? emp.razon_social : 'Desconocida';
            
            const scopesHTML = (item.scopes || []).map(s => `<div class="kpi-sub" style="display:inline-block; margin-right:4px;">${s.split(':')[1]||s}</div>`).join('');
            
            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td>${item.nombre}</td>
                <td><span class="badge badge-gray">${item.prefix}</span></td>
                <td>${scopesHTML}</td>
                <td>${fmtDate(item.expira_at)}</td>
                <td><span class="badge badge-${item.activa ? 'green' : 'red'}">${item.activa ? 'ACTIVA' : 'REVOCADA'}</span></td>
                <td>
                    ${item.activa ? `
                    <div class="action-btns">
                        <button class="btn btn-sm btn-outline btn-revocar" data-id="${item.id}" title="Revocar Key">
                            Revocar
                        </button>
                    </div>
                    ` : '<span class="text-muted" style="font-size:0.75rem">Inactiva</span>'}
                </td>
            </tr>
        `}).join('');

        // Bind Revocar buttons
        document.querySelectorAll('.btn-revocar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                keyToRevokeId = e.currentTarget.dataset.id;
                motivoRevocarInput.value = '';
                modalRevocar.classList.add('open');
            });
        });
    }

    // --- BUSCADOR SEMÁNTICO (Local) ---
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase();
        if (!query) return renderTable(allData);

        const filtered = allData.filter(item => {
            const emp = empresasList.find(emp => emp.id === item.empresa);
            const nameMatch = item.nombre && item.nombre.toLowerCase().includes(query);
            const empMatch = emp && emp.razon_social.toLowerCase().includes(query);
            return nameMatch || empMatch;
        });
        renderTable(filtered);
    }, 300));

    // --- CREAR KEY ---
    function openModal() {
        dataForm.reset();
        
        // Expiración por defecto: 1 año
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        document.getElementById('expira_at').value = nextYear.toISOString().slice(0, 16);
        
        modalForm.classList.add('open');
    }

    function closeModal() {
        modalForm.classList.remove('open');
    }

    btnSaveModal.addEventListener('click', async () => {
        if (!dataForm.checkValidity()) {
            dataForm.reportValidity();
            return;
        }

        // Obtener checkboxes de scopes marcados
        const scopesMarcados = Array.from(document.querySelectorAll('input[name="scopes"]:checked')).map(cb => cb.value);
        
        // Parsear IPs
        const ipsInput = document.getElementById('allowed_ips_input').value;
        const allowed_ips = ipsInput ? ipsInput.split(',').map(ip => ip.trim()).filter(ip => ip) : [];

        const payload = {
            empresa: document.getElementById('empresa').value,
            nombre: document.getElementById('nombre').value,
            scopes: scopesMarcados,
            allowed_ips: allowed_ips,
            rate_limit_cantidad: parseInt(document.getElementById('rate_limit_cantidad').value),
            rate_limit_ventana: document.getElementById('rate_limit_ventana').value,
            expira_at: new Date(document.getElementById('expira_at').value).toISOString(),
            activa: document.getElementById('activa').checked
        };

        btnSaveModal.disabled = true;
        btnSaveModal.textContent = 'Generando...';

        try {
            const res = await API.post('/api-keys/', payload);
            
            closeModal();
            loadData();
            
            // Abrir modal especial para mostrar token
            showTokenModal(res.token);

        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnSaveModal.disabled = false;
            btnSaveModal.textContent = 'Generar Key';
        }
    });

    // --- MODAL MOSTRAR TOKEN ---
    function showTokenModal(token) {
        tokenDisplay.textContent = token;
        btnUnderstandToken.disabled = true; // Forzar copia
        
        // Reset estilos copia
        btnCopyToken.classList.remove('copied');
        copyTokenText.textContent = 'Copiar Token';
        
        modalToken.classList.add('open');
    }

    btnCopyToken.addEventListener('click', async () => {
        const text = tokenDisplay.textContent;
        try {
            await navigator.clipboard.writeText(text);
            btnCopyToken.classList.add('copied');
            copyTokenText.textContent = '¡Copiado!';
            btnUnderstandToken.disabled = false; // Ya puede cerrar
            showToast('Copiado', 'Token copiado al portapapeles', 'success');
        } catch (err) {
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            
            btnCopyToken.classList.add('copied');
            copyTokenText.textContent = '¡Copiado!';
            btnUnderstandToken.disabled = false;
        }
    });

    btnUnderstandToken.addEventListener('click', () => {
        modalToken.classList.remove('open');
    });

    // --- MODAL REVOCAR ---
    btnCancelRevocar.addEventListener('click', () => {
        modalRevocar.classList.remove('open');
        keyToRevokeId = null;
    });

    btnConfirmRevocar.addEventListener('click', async () => {
        if (!keyToRevokeId) return;
        
        const motivo = motivoRevocarInput.value.trim();
        if (!motivo) {
            showToast('Atención', 'Debe especificar el motivo de revocación', 'warning');
            motivoRevocarInput.focus();
            return;
        }

        btnConfirmRevocar.disabled = true;
        btnConfirmRevocar.textContent = 'Revocando...';

        try {
            await API.post(`/api-keys/${keyToRevokeId}/revocar/`, { motivo });
            showToast('Éxito', 'API Key revocada correctamente', 'success');
            modalRevocar.classList.remove('open');
            loadData();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btnConfirmRevocar.disabled = false;
            btnConfirmRevocar.textContent = 'Sí, Revocar Key';
        }
    });

    // Eventos UI
    btnNew.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    
    // Iniciar
    loadData();
});
