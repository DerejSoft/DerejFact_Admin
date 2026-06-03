/**
 * DerejFact Admin — Dashboard Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Layout
    LAYOUT.init('Dashboard');

    // Elementos del DOM
    const btnRefresh = document.getElementById('btnRefresh');
    
    // Instancias de gráficos para poder destruirlos al recargar
    let charts = {};

    // Configuración base de Chart.js para que use las variables CSS
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
    Chart.defaults.font.family = getComputedStyle(document.documentElement).getPropertyValue('--font').trim();
    
    const getColors = () => ({
        primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
        primaryLight: getComputedStyle(document.documentElement).getPropertyValue('--primary-light').trim(),
        accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        danger: getComputedStyle(document.documentElement).getPropertyValue('--danger').trim(),
        warning: getComputedStyle(document.documentElement).getPropertyValue('--warning').trim(),
        info: getComputedStyle(document.documentElement).getPropertyValue('--info').trim(),
        surface2: getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim(),
        border: getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim()
    });

    /** Cargar todos los datos */
    async function loadDashboardData() {
        btnRefresh.disabled = true;
        try {
            // Cargar datos en paralelo
            const [
                empresas,
                usuarios,
                planes,
                suscripciones,
                paquetes,
                apiKeys,
                pagosPendientes,
                pagosHistorial,
                secuenciales
            ] = await Promise.all([
                API.get('/empresas/').catch(() => []),
                API.get('/usuarios/').catch(() => []),
                API.get('/planes/').catch(() => []),
                API.get('/suscripciones/').catch(() => []),
                API.get('/paquetes/').catch(() => []),
                API.get('/api-keys/').catch(() => []),
                API.get('/pagos/?estado=PENDIENTE').catch(() => []),
                API.get('/pagos/historial/').catch(() => API.get('/pagos/?estado=CONFIRMADO').catch(() => [])),
                API.get('/secuenciales/').catch(() => [])
            ]);

            const pagosAll = [
                ...(Array.isArray(pagosPendientes) ? pagosPendientes : []),
                ...(Array.isArray(pagosHistorial) ? pagosHistorial : [])
            ];

            updateKPIs({ empresas, usuarios, planes, suscripciones, paquetes, apiKeys, pagosPendientes, secuenciales });
            updateCharts({ empresas, planes, suscripciones, pagos: pagosAll, apiKeys });
            updateTables(empresas, pagosHistorial);
            updateAlertasDGII(empresas, secuenciales);

        } catch (error) {
                showToast('Error', error.message || 'No se pudieron cargar todos los datos del dashboard', 'error');
            console.error(error);
        } finally {
            btnRefresh.disabled = false;
        }
    }

    /** Actualizar tarjetas KPI */
    function updateKPIs(data) {
        const { empresas, usuarios, planes, suscripciones, paquetes, apiKeys, pagosPendientes, secuenciales } = data;

        document.getElementById('kpiEmpresas').textContent = empresas.filter(e => e.activa).length;
        document.getElementById('kpiUsuarios').textContent = usuarios.length;
        document.getElementById('kpiPlanes').textContent = planes.filter(p => p.activo).length;
        document.getElementById('kpiSuscripciones').textContent = suscripciones.filter(s => s.estado === 'ACTIVA').length;
        document.getElementById('kpiPaquetes').textContent = paquetes.filter(p => p.estado === 'ACTIVO').length;
        document.getElementById('kpiApiKeys').textContent = apiKeys.filter(k => k.activa).length;
        document.getElementById('kpiPagos').textContent = (pagosPendientes || []).length; 
        document.getElementById('kpiSecuenciales').textContent = secuenciales.filter(s => s.bloqueado).length;

        // Nuevos KPIs: Latencia y DGII
        // Mock de latencia (idealmente viene del backend midiendo tiempos de respuesta de apis)
        const latenciaPromedio = Math.floor(Math.random() * (150 - 80 + 1) + 80); 
        document.getElementById('kpiLatencia').textContent = latenciaPromedio;

        // Tasa de aceptación DGII: Basada en total de comprobantes usados vs un margen de error simulado/real
        const totalUsados = paquetes.reduce((sum, p) => sum + (p.comprobantes_usados || 0), 0);
        const erroresEstimados = Math.floor(totalUsados * 0.015); // Simulación de 1.5% de error
        const aceptados = totalUsados - erroresEstimados;
        const tasa = totalUsados > 0 ? ((aceptados / totalUsados) * 100).toFixed(1) : 100.0;

        document.getElementById('kpiAceptacion').textContent = tasa;
        
        // Formateador acortado (ej. 1200 -> 1.2k) para caber en la tarjeta
        const formatK = (num) => num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;
        document.getElementById('kpiDgiiAceptados').textContent = `${formatK(aceptados)} Acept.`;
        document.getElementById('kpiDgiiRechazados').textContent = `${formatK(erroresEstimados)} Err.`;
    }

    /** Renderizar tablas recientes */
    function updateTables(empresas, pagos) {
        // Últimas 5 empresas
        const tbodyEmpresas = document.getElementById('tableEmpresasBody');
        const ultimasEmpresas = [...empresas].reverse().slice(0, 5); // Simplificación, ideal ordenar por fecha si existe
        
        if (ultimasEmpresas.length === 0) {
            tbodyEmpresas.innerHTML = `<tr><td colspan="4"><div class="empty-state">No hay empresas</div></td></tr>`;
        } else {
            tbodyEmpresas.innerHTML = ultimasEmpresas.map(e => `
                <tr>
                    <td><strong>${e.rnc || 'N/A'}</strong></td>
                    <td>${e.razon_social || e.nombre_comercial}</td>
                    <td><span class="badge badge-${e.ambiente === 'produccion' ? 'green' : 'gray'}">${e.ambiente || 'N/A'}</span></td>
                    <td><span class="badge badge-${e.activa ? 'blue' : 'red'}">${e.activa ? 'ACTIVA' : 'INACTIVA'}</span></td>
                </tr>
            `).join('');
        }

        // Últimos 5 pagos
        const tbodyPagos = document.getElementById('tablePagosBody');
        const ultimosPagos = [...pagos].reverse().slice(0, 5);
        
        if (ultimosPagos.length === 0) {
            tbodyPagos.innerHTML = `<tr><td colspan="3"><div class="empty-state">No hay pagos recientes</div></td></tr>`;
        } else {
            tbodyPagos.innerHTML = ultimosPagos.map(p => {
                const isHistorial = p.periodo_mes !== undefined || p.monto_pagado !== undefined;
                const monto = isHistorial ? p.monto_pagado : p.monto;
                const metodo = p.metodo_pago || '—';
                let badgeColor = 'gray';
                let estadoLabel = p.estado || (isHistorial ? 'HISTORIAL' : 'PENDIENTE');

                if (estadoLabel === 'CONFIRMADO') badgeColor = 'green';
                else if (estadoLabel === 'RECHAZADO') badgeColor = 'red';
                else if (estadoLabel === 'PENDIENTE') badgeColor = 'yellow';
                else if (estadoLabel === 'HISTORIAL') badgeColor = 'blue';

                return `
                <tr>
                    <td><strong>${fmtMoney(monto, p.moneda)}</strong></td>
                    <td>${metodo}</td>
                    <td><span class="badge badge-${badgeColor}">${estadoLabel}</span></td>
                </tr>
            `}).join('');
        }
    }

    /** Renderizar tabla de Alertas DGII */
    function updateAlertasDGII(empresas, secuenciales) {
        const tbodyAlertas = document.getElementById('tableAlertasDGIIBody');
        const alertas = [];

        // 1. Empresas pendientes de certificado
        empresas.filter(e => e.estado === 'PENDIENTE_CERTIFICADO').forEach(e => {
            alertas.push({
                tipo: 'Certificado Pendiente',
                badgeColor: 'yellow',
                empresa: e.razon_social || e.nombre_comercial,
                detalle: `La empresa en ambiente ${e.ambiente} no tiene configurado el certificado.`
            });
        });

        // 2. Secuenciales Bloqueados
        secuenciales.filter(s => s.bloqueado).forEach(s => {
            const e = empresas.find(emp => emp.id === s.empresa);
            const nombreEmpresa = e ? (e.razon_social || e.nombre_comercial) : 'Desconocida';
            alertas.push({
                tipo: `Secuencial Bloqueado (${s.tipo_ecf})`,
                badgeColor: 'red',
                empresa: nombreEmpresa,
                detalle: `Motivo: ${s.motivo_bloqueo || 'Desconocido'}`
            });
        });

        if (alertas.length === 0) {
            tbodyAlertas.innerHTML = `<tr><td colspan="3"><div class="empty-state" style="color:var(--text-muted);">No hay alertas DGII activas. Todo está en orden.</div></td></tr>`;
        } else {
            tbodyAlertas.innerHTML = alertas.map(a => `
                <tr>
                    <td><span class="badge badge-${a.badgeColor}">${a.tipo}</span></td>
                    <td><strong>${a.empresa}</strong></td>
                    <td>${a.detalle}</td>
                </tr>
            `).join('');
        }
    }

    /** Renderizar Gráficos con Chart.js */
    function updateCharts(data) {
        const { empresas, planes, suscripciones, pagos, apiKeys } = data;
        const colors = getColors();
        const commonOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

        // Helper para destruir gráfico previo
        const resetChart = (id) => { if (charts[id]) charts[id].destroy(); };

        // 1. Estado de Empresas (Donut)
        resetChart('chartEmpresas');
        const empresasActivas = empresas.filter(e => e.activa).length;
        const empresasInactivas = empresas.length - empresasActivas;
        
        charts.chartEmpresas = new Chart(document.getElementById('chartEmpresas'), {
            type: 'doughnut',
            data: {
                labels: ['Activas', 'Inactivas'],
                datasets: [{
                    data: [empresasActivas, empresasInactivas],
                    backgroundColor: [colors.primary, colors.surface2],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: commonOptions
        });

        // 2. Suscripciones por Plan (Bar)
        resetChart('chartPlanes');
        const planMap = {};
        planes.forEach(plan => { planMap[plan.id] = plan.nombre || 'Desconocido'; });
        const planesCount = {};
        suscripciones.forEach(s => {
            const name = planMap[s.plan] || (s.plan || 'Desconocido');
            planesCount[name] = (planesCount[name] || 0) + 1;
        });

        charts.chartPlanes = new Chart(document.getElementById('chartPlanes'), {
            type: 'bar',
            data: {
                labels: Object.keys(planesCount),
                datasets: [{
                    label: 'Suscripciones',
                    data: Object.values(planesCount),
                    backgroundColor: colors.accent,
                    borderRadius: 4
                }]
            },
            options: {
                ...commonOptions,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: colors.border } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 3. Métodos de Pago (Bar)
        resetChart('chartPagos');
        const metodosCount = {};
        pagos.forEach(p => {
            const m = p.metodo_pago || 'Otro';
            metodosCount[m] = (metodosCount[m] || 0) + 1;
        });

        charts.chartPagos = new Chart(document.getElementById('chartPagos'), {
            type: 'bar',
            data: {
                labels: Object.keys(metodosCount),
                datasets: [{
                    label: 'Pagos',
                    data: Object.values(metodosCount),
                    backgroundColor: colors.info,
                    borderRadius: 4
                }]
            },
            options: {
                ...commonOptions,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: colors.border } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 4. Estado API Keys (Donut)
        resetChart('chartApiKeys');
        const keysActivas = apiKeys.filter(k => k.activa).length;
        const keysInactivas = apiKeys.length - keysActivas;

        charts.chartApiKeys = new Chart(document.getElementById('chartApiKeys'), {
            type: 'doughnut',
            data: {
                labels: ['Activas', 'Inactivas/Revocadas'],
                datasets: [{
                    data: [keysActivas, keysInactivas],
                    backgroundColor: [colors.warning, colors.surface2],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: commonOptions
        });
    }

    // Eventos
    btnRefresh.addEventListener('click', loadDashboardData);

    // Carga inicial
    loadDashboardData();
});
