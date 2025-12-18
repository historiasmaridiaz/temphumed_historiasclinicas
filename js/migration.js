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
            <div class="empty-state">
                <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>No hay hojas de años disponibles</p>
                <button class="btn btn-primary" onclick="openCreateYearModal()">
                    Crear Nueva Hoja
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = years.map(yearData => `
        <div class="year-card ${yearData.active ? 'active' : ''}">
            <div class="year-card-header">
                <h3>${yearData.year}</h3>
                ${yearData.active ? '<span class="badge badge-success">Activo</span>' : ''}
            </div>
            
            <div class="year-stats">
                <div class="stat-item">
                    <span class="stat-label">📅 Meses</span>
                    <span class="stat-value">${yearData.months}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">📊 Registros</span>
                    <span class="stat-value">${yearData.records}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">🕒 Actualizado</span>
                    <span class="stat-value">${yearData.lastUpdate}</span>
                </div>
            </div>
            
            <div class="year-actions">
                <button class="btn btn-sm btn-primary" onclick="viewYearData('${yearData.year}')">
                    👁️ Ver Datos
                </button>
                <button class="btn btn-sm btn-outline" onclick="openSheetInGoogleSheets('${yearData.gid}')">
                    🔗 Abrir en Sheets
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
            </p>
        `;
        return;
    }
    
    // Agrupar por mes
    const dataByMonth = {};
    data.forEach(record => {
        if (!dataByMonth[record.mes]) {
            dataByMonth[record.mes] = [];
        }
        dataByMonth[record.mes].push(record);
    });
    
    let html = `<h3 style="padding: 20px; border-bottom: 1px solid #e2e8f0;">📅 Datos de ${year}</h3>`;
    
    Object.keys(dataByMonth).forEach(month => {
        const monthData = dataByMonth[month];
        html += `
            <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h4 style="color: #667eea; margin-bottom: 15px;">
                    📆 ${month} (${monthData.length} registros)
                </h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
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
                            ${monthData.map(record => `
                                <tr>
                                    <td>${record.id}</td>
                                    <td>${record.fecha}</td>
                                    <td>${record.hora}</td>
                                    <td>${record.jornada}</td>
                                    <td>${record.dia}</td>
                                    <td>${record.temperatura}</td>
                                    <td>${record.humedad}</td>
                                    <td>${record.persona}</td>
                                    <td>${record.observaciones || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
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
