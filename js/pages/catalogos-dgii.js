document.addEventListener('DOMContentLoaded', () => {
    LAYOUT.init('Catálogos DGII');

    const PAGE_SIZE = 25;

    const CATALOGS = {
        'provincias': {
            label: 'Provincias',
            endpoint: '/provincias/',
            codeField: 'codigo',
            columns: [
                { id: 'codigo', label: 'Código', width: '120px' },
                { id: 'nombre', label: 'Nombre' }
            ],
            renderRow: item => [
                `<code style="font-size:0.82rem">${item.codigo}</code>`,
                item.nombre
            ],
            fields: [
                { id: 'codigo', label: 'Código', type: 'text', required: true, placeholder: 'Ej. 01', maxlength: 4 },
                { id: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej. Distrito Nacional' }
            ]
        },
        'municipios': {
            label: 'Municipios',
            endpoint: '/municipios/',
            codeField: 'codigo',
            columns: [
                { id: 'codigo', label: 'Código', width: '120px' },
                { id: 'nombre', label: 'Nombre' },
                { id: 'provincia', label: 'Provincia' }
            ],
            renderRow: (item, refs) => {
                const prov = refs.provincias ? refs.provincias.find(p => p.codigo === item.provincia) : null;
                return [
                    `<code style="font-size:0.82rem">${item.codigo}</code>`,
                    item.nombre,
                    prov ? prov.nombre : (item.provincia || '—')
                ];
            },
            fields: [
                { id: 'codigo', label: 'Código', type: 'text', required: true, placeholder: 'Ej. 0101', maxlength: 4 },
                { id: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej. Santo Domingo Norte' },
                { id: 'provincia', label: 'Provincia', type: 'select', required: true, optionsEndpoint: '/provincias/', optionValue: 'codigo', optionLabel: 'nombre' }
            ]
        },
        'unidades-medida': {
            label: 'Unidades de Medida',
            endpoint: '/unidades-medida/',
            codeField: 'codigo',
            columns: [
                { id: 'codigo', label: 'Código', width: '120px' },
                { id: 'nombre', label: 'Nombre' },
                { id: 'abreviatura', label: 'Abreviatura', width: '100px' }
            ],
            renderRow: item => [
                `<code style="font-size:0.82rem">${item.codigo}</code>`,
                item.nombre,
                item.abreviatura || '—'
            ],
            fields: [
                { id: 'codigo', label: 'Código', type: 'text', required: true, placeholder: 'Ej. U01', maxlength: 6 },
                { id: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej. Unidad' },
                { id: 'abreviatura', label: 'Abreviatura', type: 'text', placeholder: 'Ej. U', maxlength: 10 }
            ]
        },
        'monedas': {
            label: 'Monedas',
            endpoint: '/monedas/',
            codeField: 'codigo_iso',
            columns: [
                { id: 'codigo_iso', label: 'Código ISO', width: '120px' },
                { id: 'nombre', label: 'Nombre' },
                { id: 'simbolo', label: 'Símbolo', width: '100px' }
            ],
            renderRow: item => [
                `<code style="font-size:0.82rem">${item.codigo_iso}</code>`,
                item.nombre,
                item.simbolo || '—'
            ],
            fields: [
                { id: 'codigo_iso', label: 'Código ISO', type: 'text', required: true, placeholder: 'Ej. DOP', maxlength: 3 },
                { id: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej. Peso Dominicano' },
                { id: 'simbolo', label: 'Símbolo', type: 'text', placeholder: 'Ej. $', maxlength: 5 }
            ]
        },
        'impuestos-adicionales': {
            label: 'Impuestos Adicionales',
            endpoint: '/impuestos-adicionales/',
            codeField: 'codigo',
            columns: [
                { id: 'codigo', label: 'Código', width: '120px' },
                { id: 'nombre', label: 'Nombre' }
            ],
            renderRow: item => [
                `<code style="font-size:0.82rem">${item.codigo}</code>`,
                item.nombre
            ],
            fields: [
                { id: 'codigo', label: 'Código', type: 'text', required: true, placeholder: 'Ej. 01', maxlength: 6 },
                { id: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej. ITBIS 18%' }
            ]
        },
        'formas-pago': {
            label: 'Formas de Pago',
            endpoint: '/formas-pago/',
            codeField: 'codigo',
            columns: [
                { id: 'codigo', label: 'Código', width: '120px' },
                { id: 'nombre', label: 'Nombre' }
            ],
            renderRow: item => [
                `<code style="font-size:0.82rem">${item.codigo}</code>`,
                item.nombre
            ],
            fields: [
                { id: 'codigo', label: 'Código', type: 'text', required: true, placeholder: 'Ej. 01', maxlength: 6 },
                { id: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej. Efectivo' }
            ]
        }
    };

    const tableBody = document.getElementById('dataTableBody');
    const tableCount = document.getElementById('tableCount');
    const tableTitle = document.getElementById('tableTitle');
    const headerRow = document.getElementById('headerRow');
    const searchInput = document.getElementById('searchInput');
    const tabBar = document.getElementById('tabBar');
    const btnNew = document.getElementById('btnNew');
    const paginationBar = document.getElementById('paginationBar');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationPages = document.getElementById('paginationPages');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');

    const modalForm = document.getElementById('modalForm');
    const modalTitle = document.getElementById('modalTitle');
    const entityCode = document.getElementById('entityCode');
    const formFields = document.getElementById('formFields');
    const dataForm = document.getElementById('dataForm');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnSaveModal = document.getElementById('btnSaveModal');

    const modalConfirmDelete = document.getElementById('modalConfirmDelete');
    const confirmDeleteText = document.getElementById('confirmDeleteText');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');

    let currentTab = 'provincias';
    let allData = {};
    let pag = {};
    let references = {};
    let deleteTarget = null;

    async function fetchAllPages(endpoint) {
        let allItems = [];
        let url = endpoint;
        while (url) {
            const res = await API.getFull(url);
            const items = Array.isArray(res) ? res : (res.results || []);
            allItems = allItems.concat(items);
            url = res.next ? res.next.replace(CONFIG.API_BASE_URL, '') : null;
        }
        return allItems;
    }

    async function loadReferences() {
        try {
            references.provincias = await fetchAllPages('/provincias/');
        } catch (e) {
            references.provincias = [];
        }
    }

    async function loadData(tab) {
        const cat = CATALOGS[tab];
        if (!cat) return;
        tableBody.innerHTML = `<tr><td colspan="10"><div class="spinner-wrapper"><div class="spinner"></div></div></td></tr>`;
        try {
            allData[tab] = await fetchAllPages(cat.endpoint);
            pag[tab] = { page: 1, total: allData[tab].length };
            renderTable(tab);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="10"><div class="empty-state">Error al cargar datos</div></td></tr>`;
            showToast('Error', error.message || `No se pudieron cargar ${cat.label}`, 'error');
        }
    }

    function renderTable(tab) {
        const cat = CATALOGS[tab];
        const data = allData[tab] || [];
        const state = pag[tab] || { page: 1, total: 0 };
        const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
        const start = (state.page - 1) * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, state.total);
        const pageData = data.slice(start, end);

        tableCount.textContent = `(${state.total})`;
        tableTitle.textContent = `${cat.label} `;

        headerRow.innerHTML = cat.columns.map(col =>
            `<th${col.width ? ` style="width:${col.width}"` : ''}>${col.label}</th>`
        ).join('') + '<th style="width:100px">Acciones</th>';

        if (pageData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${cat.columns.length + 1}"><div class="empty-state">No hay registros en ${cat.label.toLowerCase()}</div></td></tr>`;
        } else {
            tableBody.innerHTML = pageData.map(item => {
                const cells = cat.renderRow(item, references);
                const codeVal = item[cat.codeField];
                return `<tr>
                    ${cells.map(c => `<td>${c}</td>`).join('')}
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-sm btn-outline btn-edit" data-tab="${tab}" data-code="${codeVal}">Editar</button>
                            <button class="btn btn-sm btn-ghost btn-delete" data-tab="${tab}" data-code="${codeVal}">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:var(--danger);">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
            bindTableActions();
        }

        renderPagination(tab);
    }

    function renderPagination(tab) {
        const state = pag[tab] || { page: 1, total: 0 };
        const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
        const start = (state.page - 1) * PAGE_SIZE + 1;
        const end = Math.min(state.page * PAGE_SIZE, state.total);
        const showing = state.total > 0 ? `${start}–${end}` : '0';
        paginationInfo.textContent = `Mostrando ${showing} de ${state.total} registros`;

        btnPrevPage.disabled = state.page <= 1;
        btnNextPage.disabled = state.page >= totalPages;

        let pagesHTML = '';
        const maxVisible = 5;
        let startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            pagesHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) pagesHTML += `<span class="pagination-ellipsis">…</span>`;
        }
        for (let i = startPage; i <= endPage; i++) {
            pagesHTML += `<button class="pagination-btn${i === state.page ? ' active' : ''}" data-page="${i}">${i}</button>`;
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pagesHTML += `<span class="pagination-ellipsis">…</span>`;
            pagesHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        paginationPages.innerHTML = pagesHTML;

        paginationPages.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => goToPage(tab, parseInt(btn.dataset.page)));
        });
    }

    function goToPage(tab, page) {
        const state = pag[tab];
        if (!state) return;
        const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
        state.page = Math.max(1, Math.min(page, totalPages));
        renderTable(tab);
    }

    function bindTableActions() {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                openEditModal(btn.dataset.tab, btn.dataset.code);
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                deleteTarget = { tab: btn.dataset.tab, code: btn.dataset.code };
                const cat = CATALOGS[deleteTarget.tab];
                const item = (allData[deleteTarget.tab] || []).find(i => i[cat.codeField] === deleteTarget.code);
                confirmDeleteText.textContent = `¿Está seguro de eliminar "${item ? item.nombre : deleteTarget.code}" de ${cat.label}?`;
                modalConfirmDelete.classList.add('open');
            });
        });
    }

    function openEditModal(tab, code) {
        const cat = CATALOGS[tab];
        const item = (allData[tab] || []).find(i => i[cat.codeField] === code);
        if (!item) return;
        modalTitle.textContent = `Editar ${cat.label}`;
        entityCode.value = code;
        entityCode.dataset.tab = tab;
        buildForm(tab, item);
        modalForm.classList.add('open');
    }

    function buildForm(tab, editItem) {
        const cat = CATALOGS[tab];
        const isEdit = !!editItem;
        const codeFieldId = cat.codeField;

        formFields.innerHTML = cat.fields.map(f => {
            if (f.type === 'select') {
                const lopts = references[f.optionsEndpoint.replace(/\//g, '')] || [];
                const valKey = f.optionValue;
                const lblKey = f.optionLabel;
                return `<div class="form-group">
                    <label class="form-label" for="field_${f.id}">${f.label}${f.required ? ' <span class="required">*</span>' : ''}</label>
                    <select id="field_${f.id}" name="${f.id}" class="form-select" ${f.required ? 'required' : ''}>
                        <option value="">— Seleccionar —</option>
                        ${lopts.map(o => `<option value="${o[valKey]}" ${editItem && editItem[f.id] === o[valKey] ? 'selected' : ''}>${o[lblKey]}</option>`).join('')}
                    </select>
                </div>`;
            }
            const val = editItem ? (editItem[f.id] || '') : '';
            const readonly = isEdit && f.id === codeFieldId ? 'readonly' : '';
            return `<div class="form-group">
                <label class="form-label" for="field_${f.id}">${f.label}${f.required ? ' <span class="required">*</span>' : ''}</label>
                <input type="${f.type}" id="field_${f.id}" name="${f.id}" class="form-input" value="${val}" ${f.required ? 'required' : ''} ${readonly} placeholder="${f.placeholder || ''}" ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}>
            </div>`;
        }).join('');
    }

    function openNewModal() {
        const cat = CATALOGS[currentTab];
        modalTitle.textContent = `Nuevo ${cat.label}`;
        entityCode.value = '';
        entityCode.dataset.tab = currentTab;
        buildForm(currentTab, null);
        modalForm.classList.add('open');
    }

    function collectFormData(tab) {
        const cat = CATALOGS[tab];
        const data = {};
        cat.fields.forEach(f => {
            const el = document.getElementById(`field_${f.id}`);
            if (el) data[f.id] = el.value.trim();
        });
        return data;
    }

    async function saveEntity() {
        const tab = entityCode.dataset.tab;
        const cat = CATALOGS[tab];
        const code = entityCode.value;
        const isEdit = !!code;
        const payload = collectFormData(tab);

        btnSaveModal.disabled = true;
        FORMS.clear(dataForm);

        try {
            if (isEdit) {
                const url = `${cat.endpoint}${code}/`;
                await API.patch(url, payload);
                showToast('Éxito', `${cat.label} actualizado correctamente`, 'success');
            } else {
                await API.post(cat.endpoint, payload);
                showToast('Éxito', `${cat.label} creado correctamente`, 'success');
            }
            modalForm.classList.remove('open');
            delete allData[tab];
            loadData(tab);
        } catch (err) {
            if (err.fields) {
                FORMS.apply(dataForm, err.fields);
            }
            showToast('Error', err.message || 'Error al guardar', 'error');
        } finally {
            btnSaveModal.disabled = false;
        }
    }

    async function deleteEntity() {
        if (!deleteTarget) return;
        const { tab, code } = deleteTarget;
        const cat = CATALOGS[tab];
        btnConfirmDelete.disabled = true;
        try {
            await API.delete(`${cat.endpoint}${code}/`);
            showToast('Éxito', `${cat.label} eliminado correctamente`, 'success');
            modalConfirmDelete.classList.remove('open');
            deleteTarget = null;
            delete allData[tab];
            loadData(tab);
        } catch (err) {
            showToast('Error', err.message || 'Error al eliminar', 'error');
        } finally {
            btnConfirmDelete.disabled = false;
        }
    }

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        searchInput.value = '';
        if (!allData[tab]) {
            loadData(tab);
        } else {
            renderTable(tab);
        }
    }

    // Event bindings
    tabBar.addEventListener('click', e => {
        const btn = e.target.closest('.tab-btn');
        if (btn) switchTab(btn.dataset.tab);
    });

    btnPrevPage.addEventListener('click', () => goToPage(currentTab, pag[currentTab].page - 1));
    btnNextPage.addEventListener('click', () => goToPage(currentTab, pag[currentTab].page + 1));

    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase();
        const cat = CATALOGS[currentTab];
        const data = allData[currentTab] || [];
        if (!query) return renderTable(currentTab);

        const filtered = data.filter(item =>
            cat.fields.some(f => {
                const val = item[f.id];
                return val && String(val).toLowerCase().includes(query);
            })
        );

        paginationInfo.textContent = `Mostrando ${filtered.length} de ${data.length} registros (filtro)`;
        paginationPages.innerHTML = '';
        btnPrevPage.disabled = true;
        btnNextPage.disabled = true;

        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${cat.columns.length + 1}"><div class="empty-state">Sin resultados para "${query}"</div></td></tr>`;
            return;
        }

        tableBody.innerHTML = filtered.map(item => {
            const cells = cat.renderRow(item, references);
            const codeVal = item[cat.codeField];
            return `<tr>
                ${cells.map(c => `<td>${c}</td>`).join('')}
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-outline btn-edit" data-tab="${currentTab}" data-code="${codeVal}">Editar</button>
                        <button class="btn btn-sm btn-ghost btn-delete" data-tab="${currentTab}" data-code="${codeVal}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:var(--danger);">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        bindTableActions();
    }, 300));

    btnNew.addEventListener('click', openNewModal);

    btnCloseModal.addEventListener('click', () => modalForm.classList.remove('open'));
    btnCancelModal.addEventListener('click', () => modalForm.classList.remove('open'));
    modalForm.addEventListener('click', e => { if (e.target === modalForm) modalForm.classList.remove('open'); });
    btnSaveModal.addEventListener('click', saveEntity);
    dataForm.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveEntity(); } });

    btnCancelDelete.addEventListener('click', () => { modalConfirmDelete.classList.remove('open'); deleteTarget = null; });
    btnConfirmDelete.addEventListener('click', deleteEntity);
    modalConfirmDelete.addEventListener('click', e => { if (e.target === modalConfirmDelete) { modalConfirmDelete.classList.remove('open'); deleteTarget = null; } });

    loadReferences().then(() => loadData('provincias'));
});
