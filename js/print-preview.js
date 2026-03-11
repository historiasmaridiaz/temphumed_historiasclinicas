// ═════════════════════════════════════════════════════════════════════════
//  SISTEMA DE CONTROL DE TEMPERATURA Y HUMEDAD
//  Migración de Datos - Versión 1.0.4
// ═════════════════════════════════════════════════════════════════════════

let SCRIPT_URL = localStorage.getItem('scriptUrl') || '';
let historicalData = {};

// ═════════════════════════════════════════════════════════════════════════
//  FUNCIÓN DE NOTIFICACIONES (DEBE IR PRIMERO)
// ═════════════════════════════════════════════════════════════════════════

function showNotification(message, type = 'info') {
    // Remover notificación anterior
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    // Iconos por tipo
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    // Colores por tipo
    const colors = {
        info: '#3182ce',
        success: '#38a169',
        error: '#e53e3e',
        warning: '#dd6b20'
    };
    
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        background: ${colors[type]};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        transform: translateX(450px);
        transition: transform 0.3s ease;
        white-space: pre-line;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 24px; flex-shrink: 0;">${icons[type] || icons.info}</span>
            <span style="flex: 1; line-height: 1.5;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: transparent; border: none; color: white; cursor: pointer; font-size: 24px; padding: 0 5px; flex-shrink: 0; line-height: 1;"
                    title="Cerrar">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remover
    const duration = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
        notification.style.transform = 'translateX(450px)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ═════════════════════════════════════════════════════════════════════════
//  API HELPER
// ═════════════════════════════════════════════════════════════════════════

async function callAppsScript(action, data = {}) {
    if (!SCRIPT_URL) {
        SCRIPT_URL = prompt('Por favor ingrese la URL de Apps Script:');
        if (SCRIPT_URL) {
            localStorage.setItem('scriptUrl', SCRIPT_URL);
        } else {
            return { success: false, message: 'URL no proporcionada' };
        }
    }
    
    const params = new URLSearchParams({ action, ...data });
    const response = await fetch(`${SCRIPT_URL}?${params}`, {
        method: 'GET',
        redirect: 'follow'
    });
    
    return await response.json();
}

// ═════════════════════════════════════════════════════════════════════════
//  INICIALIZAR
// ═════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    if (!SCRIPT_URL) {
        SCRIPT_URL = prompt('Por favor ingrese la URL de Apps Script:');
        if (SCRIPT_URL) {
            localStorage.setItem('scriptUrl', SCRIPT_URL);
        }
    }
    
    loadYearSheets();
    loadHistoricalData();
    updateCurrentMonthStatus();
    
    // Event listeners para los selectores
    const monthSelect = document.getElementById('migrationMonth');
    const yearSelect = document.getElementById('targetYear');
    
    if (monthSelect) {
        monthSelect.addEventListener('change', updateMigrationPreview);
    }
    
    if (yearSelect) {
        yearSelect.addEventListener('change', updateMigrationPreview);
    }
});

// ═════════════════════════════════════════════════════════════════════════
//  CARGAR HOJAS DE AÑOS
// ═════════════════════════════════════════════════════════════════════════

async function loadYearSheets() {
    try {
        showNotification('🔄 Cargando hojas de años...', 'info');
        
        const result = await callAppsScript('getYearSheets');
        
        if (result.success) {
            renderYearsGrid(result.data);
            showNotification(`✅ ${result.data.length} hojas cargadas`, 'success');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error loading year sheets:', error);
        showNotification('❌ Error al cargar hojas: ' + error.message, 'error');
    }
}

// ═════════════════════════════════════════════════════════════════════════
//  RENDERIZAR GRID DE AÑOS
// ═════════════════════════════════════════════════════════════════════════

function renderYearsGrid(years) {
    const container = document.getElementById('yearSheetsContainer');
    if (!container) return;

    if (years.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color: #718096;">
                <p style="font-size:1.1em;">No hay hojas de años disponibles</p>
                <button class="btn btn-primary" style="margin-top:15px;" onclick="openCreateYearModal()">
                    ➕ Crear Nueva Hoja
                </button>
            </div>`;
        return;
    }

    const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                   'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

    container.innerHTML = years.map(yearData => `
        <div style="
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.07);
            transition: box-shadow 0.2s;
        " onmouseover="this.style.boxShadow='0 6px 20px rgba(102,126,234,0.18)'"
           onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.07)'">

            <!-- Header -->
            <div style="
                background: ${yearData.active
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)'};
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h3 style="color:white; margin:0; font-size:1.4em; font-weight:700;">
                    📁 ${yearData.year}
                </h3>
                ${yearData.active
                    ? '<span style="background:rgba(255,255,255,0.25); color:white; padding:3px 10px; border-radius:20px; font-size:0.78em; font-weight:600;">✅ ACTIVO</span>'
                    : '<span style="background:rgba(255,255,255,0.15); color:rgba(255,255,255,0.8); padding:3px 10px; border-radius:20px; font-size:0.78em;">Archivado</span>'
                }
            </div>

            <!-- Stats -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #e2e8f0;">
                <div style="padding: 14px 16px; text-align:center; border-right: 1px solid #e2e8f0;">
                    <div style="font-size:0.72em; color:#718096; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Meses</div>
                    <div style="font-size:1.4em; font-weight:700; color:#2d3748;">${yearData.months}</div>
                </div>
                <div style="padding: 14px 16px; text-align:center; border-right: 1px solid #e2e8f0;">
                    <div style="font-size:0.72em; color:#718096; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Registros</div>
                    <div style="font-size:1.4em; font-weight:700; color:#667eea;">${yearData.records}</div>
                </div>
                <div style="padding: 14px 16px; text-align:center;">
                    <div style="font-size:0.72em; color:#718096; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Actualizado</div>
                    <div style="font-size:0.82em; font-weight:600; color:#4a5568;">${yearData.lastUpdate}</div>
                </div>
            </div>

            <!-- Filtro por mes -->
            <div style="padding: 14px 16px; background: #f7fafc; border-bottom: 1px solid #e2e8f0;">
                <label style="font-size:0.78em; color:#718096; font-weight:600; display:block; margin-bottom:6px;">
                    📆 FILTRAR POR MES
                </label>
                <select id="monthFilter_${yearData.year}" class="form-control"
                    style="font-size:0.88em; padding: 7px 10px; border-radius:8px;"
                    onchange="viewYearDataFiltered('${yearData.year}', this.value)">
                    <option value="">— Todos los meses —</option>
                    ${MESES.map(m => `<option value="${m}">${m}</option>`).join('')}
                </select>
            </div>

            <!-- Acciones -->
            <div style="padding: 14px 16px; display: flex; gap: 8px;">
                <button class="btn btn-primary" style="flex:1; font-size:0.85em; padding:8px 0;"
                    onclick="viewYearDataFiltered('${yearData.year}', document.getElementById('monthFilter_${yearData.year}').value)">
                    👁️ Ver Datos
                </button>
                <button class="btn btn-outline" style="flex:1; font-size:0.85em; padding:8px 0;"
                    onclick="openSheetInGoogleSheets('${yearData.gid}')">
                    🔗 Sheets
                </button>
            </div>
        </div>
    `).join('');
}

// ═════════════════════════════════════════════════════════════════════════
//  ACTUALIZAR ESTADO DEL MES ACTUAL
// ═════════════════════════════════════════════════════════════════════════

async function updateCurrentMonthStatus() {
    try {
        const result = await callAppsScript('getData');
        
        if (result.success) {
            const recordCount = result.data.length;
            const requiredRecords = 62;
            const progress = Math.min((recordCount / requiredRecords) * 100, 100);
            
            document.getElementById('currentRecords').textContent = recordCount;
            document.getElementById('recordsProgress').style.width = progress + '%';
            document.getElementById('progressBar').style.width = progress + '%';
            document.getElementById('monthProgress').textContent = Math.round(progress) + '%';
            
            // Calcular días restantes
            const now = new Date();
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const daysRemaining = lastDay.getDate() - now.getDate();
            document.getElementById('daysRemaining').textContent = daysRemaining;
            
            // Actualizar nombre del mes
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            document.getElementById('currentMonthName').textContent = 
                `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        }
    } catch (error) {
        console.error('Error updating month status:', error);
    }
}

// ═════════════════════════════════════════════════════════════════════════
//  ACTUALIZAR VISTA PREVIA DE MIGRACIÓN
// ═════════════════════════════════════════════════════════════════════════

async function updateMigrationPreview() {
    const month = document.getElementById('migrationMonth').value;
    const year = document.getElementById('targetYear').value;
    
    // Actualizar vista previa
    document.getElementById('destSheet').textContent = 
        year ? `${year} (Mes: ${month || 'No seleccionado'})` : 'No seleccionado';
    
    // Obtener cantidad de registros actuales
    try {
        const result = await callAppsScript('getData');
        if (result.success) {
            document.getElementById('recordsToMigrate').textContent = result.data.length;
        }
    } catch (error) {
        console.error('Error loading records count:', error);
    }
}

// ═════════════════════════════════════════════════════════════════════════
//  EJECUTAR MIGRACIÓN DESDE EL PANEL
// ═════════════════════════════════════════════════════════════════════════

async function executeMigrationFromPanel() {
    const month = document.getElementById('migrationMonth').value;
    const year = document.getElementById('targetYear').value;
    
    if (!month || !year) {
        showNotification('⚠️ Por favor selecciona mes y año', 'error');
        return;
    }
    
    if (!confirm(`¿Estás seguro de migrar todos los datos actuales a ${month} ${year}?\n\nEsta acción vaciará la hoja BASE.`)) {
        return;
    }
    
    // Mostrar modal de progreso
    document.getElementById('migrationModal').style.display = 'flex';
    
    try {
        // Simular progreso
        for (let i = 0; i <= 100; i += 20) {
            document.getElementById('migrationProgressBar').style.width = i + '%';
            document.getElementById('migrationProgressText').textContent = i + '%';
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const result = await callAppsScript('migrateData', { year, month });
        
        // Ocultar modal
        document.getElementById('migrationModal').style.display = 'none';
        
        if (result.success) {
            showNotification('✅ Migración completada exitosamente', 'success');
            
            // Actualizar vistas
            setTimeout(() => {
                loadYearSheets();
                loadHistoricalData();
                updateCurrentMonthStatus();
            }, 500);
            
            alert(
                `✅ MIGRACIÓN EXITOSA\n\n` +
                `Los datos fueron migrados a:\n` +
                `📅 Año: ${year}\n` +
                `📆 Mes: ${month}\n\n` +
                `La hoja BASE está ahora vacía.`
            );
        } else {
            showNotification(`❌ Error: ${result.message}`, 'error');
        }
        
    } catch (error) {
        document.getElementById('migrationModal').style.display = 'none';
        console.error('Error:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

// ═════════════════════════════════════════════════════════════════════════
//  RESTAURAR MIGRACIÓN (DESHACER)
// ═════════════════════════════════════════════════════════════════════════

function showRestoreModal() {
    document.getElementById('restoreModal').style.display = 'flex';
    loadAvailableYears();
}

function closeRestoreModal() {
    document.getElementById('restoreModal').style.display = 'none';
}

async function loadAvailableYears() {
    try {
        const result = await callAppsScript('getYearSheets');
        
        if (result.success) {
            const select = document.getElementById('restoreYear');
            select.innerHTML = '<option value="">Seleccionar año...</option>';
            
            result.data.forEach(sheet => {
                const option = document.createElement('option');
                option.value = sheet.year;
                option.textContent = `${sheet.year} (${sheet.months} meses, ${sheet.records} registros)`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading years:', error);
        showNotification('❌ Error al cargar años disponibles', 'error');
    }
}

async function executeRestore() {
    const year = document.getElementById('restoreYear').value;
    const month = document.getElementById('restoreMonth').value;
    
    if (!year || !month) {
        showNotification('⚠️ Por favor selecciona año y mes', 'error');
        return;
    }
    
    if (!confirm(`¿Estás seguro de que deseas restaurar los datos de ${month} ${year} a la hoja BASE?\n\nEsta acción eliminará esos registros del historial del año.`)) {
        return;
    }
    
    try {
        showNotification(`🔄 Restaurando datos de ${month} ${year}...`, 'info');
        
        const result = await callAppsScript('restoreMigration', { year, month });
        
        if (result.success) {
            showNotification(`✅ ${result.recordsRestored} registros restaurados exitosamente`, 'success');
            
            // Cerrar modal
            closeRestoreModal();
            
            // Actualizar listado
            setTimeout(() => {
                loadYearSheets();
                loadHistoricalData();
                updateCurrentMonthStatus();
            }, 500);
            
            // Mostrar resumen
            setTimeout(() => {
                alert(
                    `✅ RESTAURACIÓN EXITOSA\n\n` +
                    `${result.recordsRestored} registros de ${month} ${year}\n` +
                    `fueron restaurados a la hoja BASE.\n\n` +
                    `Los registros fueron eliminados del historial del año.`
                );
            }, 1000);
        } else {
            showNotification(`❌ Error: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

// ═════════════════════════════════════════════════════════════════════════
//  CREAR NUEVA HOJA DE AÑO
// ═════════════════════════════════════════════════════════════════════════

function openCreateYearModal() {
    document.getElementById('createYearModal').style.display = 'flex';
}

function closeCreateYearModal() {
    document.getElementById('createYearModal').style.display = 'none';
}

async function executeCreateYear() {
    const year = document.getElementById('newYearValue').value;
    
    if (!year || !/^\d{4}$/.test(year)) {
        showNotification('⚠️ Por favor ingresa un año válido (YYYY)', 'error');
        return;
    }
    
    try {
        showNotification('⏳ Creando hoja...', 'info');
        
        const result = await callAppsScript('createYearSheet', { year });
        
        if (result.success) {
            showNotification(`✅ Hoja ${year} creada exitosamente`, 'success');
            closeCreateYearModal();
            loadYearSheets();
        } else {
            showNotification(`❌ Error: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

// ═════════════════════════════════════════════════════════════════════════
//  VER DATOS DE UN AÑO
// ═════════════════════════════════════════════════════════════════════════

async function viewYearData(year) {
    try {
        showNotification(`📊 Cargando datos de ${year}...`, 'info');
        
        const result = await callAppsScript('getHistoricalData', { year });
        
        if (result.success) {
            renderHistoricalData(year, result.data);
            showNotification(`✅ Datos de ${year} cargados`, 'success');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al cargar datos: ' + error.message, 'error');
    }
}

function renderHistoricalData(year, data) {
    const container = document.getElementById('historicalDataContainer');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: #718096; padding: 40px;">
                No hay datos disponibles para ${year}
            </p>`;
        return;
    }

    // Agrupar por mes correctamente
    const dataByMonth = {};
    data.forEach(record => {
        const mes = record.mes || 'Sin mes';
        if (!dataByMonth[mes]) dataByMonth[mes] = [];
        dataByMonth[mes].push(record);
    });

    let html = `
        <div style="padding: 15px 20px; border-bottom: 2px solid #667eea; margin-bottom: 10px;">
            <h3 style="color: #2d3748;">📅 Datos de ${year} — ${data.length} registros totales</h3>
        </div>`;

    Object.keys(dataByMonth).sort().forEach(month => {
        const monthData = dataByMonth[month];

        // Calcular estadísticas del mes
        const temps = monthData.map(r => parseFloat(r.temperatura)).filter(v => !isNaN(v) && v > 0);
        const hums  = monthData.map(r => {
            let h = parseFloat(String(r.humedad).replace('%','').trim());
            if (!isNaN(h) && h > 0 && h < 1) h = Math.round(h * 100);
            return h;
        }).filter(v => !isNaN(v) && v > 0);

        const tempAvg = temps.length ? (temps.reduce((a,b)=>a+b,0)/temps.length).toFixed(1) : '--';
        const humAvg  = hums.length  ? Math.round(hums.reduce((a,b)=>a+b,0)/hums.length)    : '--';

        html += `
            <div style="margin: 15px 20px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <div style="background: #667eea; padding: 12px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="color: white; margin: 0;">📆 ${month} — ${monthData.length} registros</h4>
                    <span style="color: rgba(255,255,255,0.85); font-size: 0.85em;">
                        Temp promedio: ${tempAvg}°C &nbsp;|&nbsp; Humedad promedio: ${humAvg}%
                    </span>
                </div>
                <div style="overflow-x: auto;">
                    <table class="data-table" style="margin:0;">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>No. HC</th>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Jornada</th>
                                <th>Día</th>
                                <th>Temp (°C)</th>
                                <th>Humedad (%)</th>
                                <th>Persona</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthData.map(record => {
                                // Limpiar humedad
                                let h = parseFloat(String(record.humedad || '0').replace('%','').trim());
                                if (!isNaN(h) && h > 0 && h < 1) h = Math.round(h * 100);
                                const humDisplay = Math.round(h) || 0;

                                // Limpiar temperatura
                                const tempDisplay = parseFloat(record.temperatura) || 0;

                                return `
                                <tr>
                                    <td>${record.id || '-'}</td>
                                    <td style="font-weight:bold; color:#667eea;">${record.no_hc || '-'}</td>
                                    <td>${record.fecha || '-'}</td>
                                    <td>${record.hora || '-'}</td>
                                    <td>
                                        <span class="badge badge-${record.jornada === 'MAÑANA' ? 'info' : 'success'}">
                                            ${record.jornada || '-'}
                                        </span>
                                    </td>
                                    <td>${record.dia || '-'}</td>
                                    <td>${tempDisplay.toFixed(1)}°C</td>
                                    <td>${humDisplay}%</td>
                                    <td>${record.persona || '-'}</td>
                                    <td>${record.observaciones || '-'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}



// ═════════════════════════════════════════════════════════════════════════
//  CARGAR DATOS HISTÓRICOS
// ═════════════════════════════════════════════════════════════════════════

async function loadHistoricalData() {
    try {
        const result = await callAppsScript('getAllHistoricalData');
        
        if (result.success) {
            historicalData = result.data;
            
            // Renderizar todos los años automáticamente
            const container = document.getElementById('historicalDataContainer');
            if (container) {
                if (Object.keys(historicalData).length === 0) {
                    container.innerHTML = `
                        <p style="text-align: center; color: #718096; padding: 40px;">
                            No hay datos históricos disponibles
                        </p>
                    `;
                } else {
                    container.innerHTML = '<p style="padding: 20px; color: #718096;">Datos históricos cargados. Click en "Ver Datos" de cualquier año para visualizar.</p>';
                }
            }
        }
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

// ═════════════════════════════════════════════════════════════════════════
//  ABRIR EN GOOGLE SHEETS
// ═════════════════════════════════════════════════════════════════════════

function openSheetInGoogleSheets(gid) {
    const spreadsheetId = '1YRAztDSETnV5GcsPhtfrvKM-8k922XxzUcLHiLHwBcI';
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

async function viewYearDataFiltered(year, month) {
    try {
        showNotification(`📊 Cargando datos de ${year}${month ? ' — ' + month : ''}...`, 'info');

        const result = await callAppsScript('getHistoricalData', { year });

        if (!result.success) throw new Error(result.message);

        let data = result.data;

        // Filtrar por mes si se seleccionó uno
        if (month && month !== '') {
            data = data.filter(r => r.mes === month);
        }

        if (data.length === 0) {
            const container = document.getElementById('historicalDataContainer');
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#718096;">
                    <p style="font-size:1.1em;">No hay registros para 
                        <strong>${month || 'este año'}</strong> en ${year}
                    </p>
                </div>`;
            // Scroll suave al explorador
            document.getElementById('historicalDataContainer')
                .scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        renderHistoricalData(year, data);
        showNotification(`✅ ${data.length} registros cargados`, 'success');

        // Scroll suave al explorador
        setTimeout(() => {
            document.getElementById('historicalDataContainer')
                .scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);

    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// ═════════════════════════════════════════════════════════════════════════
//  HACER FUNCIONES GLOBALES
// ═════════════════════════════════════════════════════════════════════════

window.loadYearSheets = loadYearSheets;
window.executeMigrationFromPanel = executeMigrationFromPanel;
window.showRestoreModal = showRestoreModal;
window.closeRestoreModal = closeRestoreModal;
window.executeRestore = executeRestore;
window.openCreateYearModal = openCreateYearModal;
window.closeCreateYearModal = closeCreateYearModal;
window.executeCreateYear = executeCreateYear;
window.viewYearData = viewYearData;
window.openSheetInGoogleSheets = openSheetInGoogleSheets;
window.loadHistoricalData = loadHistoricalData;
window.loadYearSheets = loadYearSheets;
window.viewYearDataFiltered = viewYearDataFiltered;
