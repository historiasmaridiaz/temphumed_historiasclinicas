// ═══════════════════════════════════════════════════════════════════
//  SISTEMA DE CONTROL DE TEMPERATURA Y HUMEDAD
//  JavaScript Principal - CRUD Operations
//  Versión: 1.0.0
// ═══════════════════════════════════════════════════════════════════


// Variables globales
let SCRIPT_URL = '';
let currentData = [];
let historyStack = [];
let redoStack = [];
const MAX_HISTORY = 200;


// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    SCRIPT_URL = localStorage.getItem('scriptUrl');

    // Limpiar historial viejo (más de 2 días) al iniciar
    const historialGuardado = JSON.parse(localStorage.getItem('changeHistory') || '[]');
    const hace2Dias = new Date();
    hace2Dias.setDate(hace2Dias.getDate() - 2);
    historyStack = historialGuardado.filter(c => new Date(c.timestamp) >= hace2Dias);
    localStorage.setItem('changeHistory', JSON.stringify(historyStack));

    if (!SCRIPT_URL) {
        showConfigSection();
    } else {
        showMainContent();
        loadData();
    }

    // Auto-actualizar cada 5 minutos
    setInterval(loadData, 300000);
});


// Mostrar sección de configuración
function showConfigSection() {
    document.getElementById('config-section').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
}


// Mostrar contenido principal
function showMainContent() {
    document.getElementById('config-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'flex';
}


// Guardar configuración
function saveConfiguration() {
    const url = document.getElementById('script-url-input').value.trim();
    
    if (!url) {
        showAlert('Por favor ingrese una URL válida', 'warning');
        return;
    }
    
    if (!url.includes('script.google.com') || !url.includes('/exec')) {
        showAlert('La URL debe ser de Google Apps Script y terminar en /exec', 'error');
        return;
    }
    
    localStorage.setItem('scriptUrl', url);
    SCRIPT_URL = url;
    
    showAlert('Configuración guardada exitosamente', 'success');
    
    setTimeout(() => {
        showMainContent();
        loadData();
    }, 1000);
}


// Cargar datos
async function loadData() {
    showLoading(true);
    
    try {
        const result = await callAppsScript('getData');
        
        if (result.success) {
                currentData = result.data;
                renderTable(currentData);
                populateHCSelect();  // ← AGREGAR ESTA LÍNEA
                showAlert(`${currentData.length} registros cargados`, 'success');
                }
        else {
                    showAlert('Error al cargar datos: ' + result.message, 'error');
                }
            } catch (error) {
                showAlert('Error de conexión: ' + error.message, 'error');
                console.error(error);
            } finally {
                showLoading(false);
            }
}




// Formatear fecha para mostrar
function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}


// Abrir modal para agregar
function openAddModal() {
    document.getElementById('modal-title').textContent = 'Agregar Nuevo Registro';
    document.getElementById('data-form').reset();
    document.getElementById('record-id').value = '';

    // Retomar última HC seleccionada
  // Avanzar al siguiente HC en la secuencia
    // Avanzar al siguiente HC en la secuencia
    const lastHC = localStorage.getItem('lastSelectedHC') || '';
    const select = document.getElementById('no_hc');

    if (lastHC) {
        const options = Array.from(select.options).map(o => o.value).filter(v => v);
        const lastIndex = options.indexOf(lastHC);
        const nextHC = lastIndex >= 0 && lastIndex < options.length - 1
            ? options[lastIndex + 1]
            : lastHC; // Si ya es el último, queda igual
        select.value = nextHC;
    }
    
    // Establecer fecha y hora actuales
    const now = new Date();
    document.getElementById('fecha').value = now.toISOString().split('T')[0];
    document.getElementById('hora').value = now.toTimeString().slice(0, 5);
    document.getElementById('dia').value = now.getDate();
    
    // Determinar jornada automáticamente
    const hour = now.getHours();
    document.getElementById('jornada').value = hour < 14 ? 'MAÑANA' : 'TARDE';
    
    openModal();
}


// Editar registro
function editRecord(id) {
    const record = currentData.find(r => r.id === id);
    if (!record) return;
    
    document.getElementById('modal-title').textContent = 'Editar Registro';
    document.getElementById('record-id').value = record.id;
    document.getElementById('no_hc').value = record.no_hc || '';           // ← NUEVO
    document.getElementById('fecha').value = record.fecha;
    document.getElementById('hora').value = record.hora;
    document.getElementById('jornada').value = record.jornada || '';
    document.getElementById('dia').value = record.dia;
    document.getElementById('temperatura').value = record.temperatura;
    // Limpiar humedad: si viene como 0.56 convertir a 56
    let humVal = parseFloat(String(record.humedad).replace('%', '').trim());
    if (!isNaN(humVal) && humVal > 0 && humVal < 1) humVal = Math.round(humVal * 100);
    document.getElementById('humedad').value = Math.round(humVal) || 0;
    document.getElementById('persona').value = record.persona;
    document.getElementById('observaciones').value = record.observaciones || '';
    
    openModal();
}


// Guardar datos (crear o actualizar)
async function saveData(event) {
    event.preventDefault();
    
    const selectedHC = document.getElementById('no_hc').value;
    if (selectedHC) localStorage.setItem('lastSelectedHC', selectedHC);

    const recordData = {
        id: document.getElementById('record-id').value,
        no_hc: selectedHC,                        // ← NUEVO
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        jornada: document.getElementById('jornada').value,
        dia: document.getElementById('dia').value,
        temperatura: document.getElementById('temperatura').value,
        humedad: document.getElementById('humedad').value,
        persona: document.getElementById('persona').value,
        observaciones: document.getElementById('observaciones').value
    };
    
// Spinner en botón guardar
    const saveBtn = document.querySelector('#data-form button[type="submit"]');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:8px;">
            <svg style="animation:spin 1s linear infinite;width:18px;height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Guardando...
        </span>`;

    showLoading(true);

    try {
        const action = recordData.id ? 'updateData' : 'createData';
        const result = await callAppsScript(action, recordData);

        if (result.success) {
            saveToHistory({
                action: recordData.id ? 'update' : 'create',
                data: recordData,
                timestamp: new Date().toISOString()
            });

            showAlert(recordData.id ? 'Registro actualizado exitosamente' : 'Registro creado exitosamente', 'success');
            closeModal();
            loadData();
        } else {
            showAlert('Error al guardar: ' + result.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
        showLoading(false);
    }
}


// Eliminar registro
async function deleteRecord(id) {
    if (!confirm('¿Está seguro de eliminar este registro?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const record = currentData.find(r => r.id === id);
        const result = await callAppsScript('deleteData', { id: id });
        
        if (result.success) {
            // Guardar en historial
            saveToHistory({
                action: 'delete',
                data: record,
                timestamp: new Date().toISOString()
            });
            
            showAlert('Registro eliminado exitosamente', 'success');
            loadData();
        } else {
            showAlert('Error al eliminar: ' + result.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}


// Llamar a Apps Script
async function callAppsScript(action, data = {}) {
    if (!SCRIPT_URL) {
        throw new Error('URL de Apps Script no configurada');
    }
    
    const params = new URLSearchParams({
        action: action,
        ...data
    });
    
    const response = await fetch(`${SCRIPT_URL}?${params}`, {
        method: 'GET',
        redirect: 'follow'
    });
    
    if (!response.ok) {
        throw new Error('Error en la petición: ' + response.status);
    }
    
    return await response.json();
}


// Gestión de Modales
function openModal() {
    document.getElementById('data-modal').classList.add('active');
}


function closeModal() {
    document.getElementById('data-modal').classList.remove('active');
    document.getElementById('data-form').reset();
}


// Historial de cambios
function saveToHistory(change) {
    historyStack.push(change);

    // Mantener solo cambios de los últimos 2 días
    const hace2Dias = new Date();
    hace2Dias.setDate(hace2Dias.getDate() - 2);
    historyStack = historyStack.filter(c => new Date(c.timestamp) >= hace2Dias);

    // Límite adicional por seguridad
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    }

    redoStack = [];
    localStorage.setItem('changeHistory', JSON.stringify(historyStack));
}


function showHistory() {
    const history = JSON.parse(localStorage.getItem('changeHistory') || '[]');
    
    if (history.length === 0) {
        showAlert('No hay cambios en el historial', 'info');
        return;
    }
    
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = history.slice().reverse().map((change, index) => `
        <div class="accordion">
            <div class="accordion-header">
                <div>
                    <strong>${change.action === 'create' ? '➕ Creado' : change.action === 'update' ? '✏️ Actualizado' : '🗑️ Eliminado'}</strong>
                    <div style="color: #718096; font-size: 0.9em; margin-top: 5px;">
                        ${new Date(change.timestamp).toLocaleString('es-ES')}
                    </div>
                </div>
            </div>
            <div class="accordion-content">
                <div style="padding: 15px; background: white;">
                    <p><strong>ID:</strong> ${change.data.id || 'N/A'}</p>
                    <p><strong>Fecha:</strong> ${change.data.fecha}</p>
                    <p><strong>Hora:</strong> ${change.data.hora}</p>
                    <p><strong>Temperatura:</strong> ${change.data.temperatura}°C</p>
                    <p><strong>Humedad:</strong> ${change.data.humedad}%</p>
                    <p><strong>Persona:</strong> ${change.data.persona}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    // Agregar funcionalidad de acordeón
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            content.classList.toggle('active');
        });
    });
    
    document.getElementById('history-modal').classList.add('active');
}


function closeHistoryModal() {
    document.getElementById('history-modal').classList.remove('active');
}


async function undoLastChange() {
    if (historyStack.length === 0) {
        showAlert('No hay cambios para deshacer', 'warning');
        return;
    }
    
    const lastChange = historyStack.pop();
    redoStack.push(lastChange);
    
    showLoading(true);
    
    try {
        if (lastChange.action === 'create') {
            // Deshacer creación = eliminar
            await callAppsScript('deleteData', { id: lastChange.data.id });
        } else if (lastChange.action === 'delete') {
            // Deshacer eliminación = crear
            await callAppsScript('createData', lastChange.data);
        } else if (lastChange.action === 'update') {
            // Deshacer actualización = restaurar versión anterior
            await callAppsScript('updateData', lastChange.data);
        }
        
        showAlert('Cambio deshecho exitosamente', 'success');
        localStorage.setItem('changeHistory', JSON.stringify(historyStack));
        loadData();
        closeHistoryModal();
    } catch (error) {
        showAlert('Error al deshacer: ' + error.message, 'error');
        historyStack.push(lastChange);
        redoStack.pop();
    } finally {
        showLoading(false);
    }
}


async function redoLastChange() {
    if (redoStack.length === 0) {
        showAlert('No hay cambios para rehacer', 'warning');
        return;
    }
    
    const change = redoStack.pop();
    historyStack.push(change);
    
    showLoading(true);
    
    try {
        if (change.action === 'create') {
            await callAppsScript('createData', change.data);
        } else if (change.action === 'delete') {
            await callAppsScript('deleteData', { id: change.data.id });
        } else if (change.action === 'update') {
            await callAppsScript('updateData', change.data);
        }
        
        showAlert('Cambio rehecho exitosamente', 'success');
        localStorage.setItem('changeHistory', JSON.stringify(historyStack));
        loadData();
        closeHistoryModal();
    } catch (error) {
        showAlert('Error al rehacer: ' + error.message, 'error');
        redoStack.push(change);
        historyStack.pop();
    } finally {
        showLoading(false);
    }
}


// UI Helpers
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('table-container').style.display = show ? 'none' : 'block';
}


function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
            <p style="font-weight: 600;">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
            <p>${message}</p>
        </div>
    `;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.5s';
        setTimeout(() => alert.remove(), 500);
    }, 3000);
}


// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
}


// Atajo de teclado para cerrar modales (ESC)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// === 1. LISTA HC DESDE DATOS REALES ===
function populateHCSelect() {
    const select = document.getElementById('no_hc');
    if (!select) return;

    // Base fija: HC-01 a HC-62
    const baseList = [];
    for (let i = 1; i <= 62; i++) {
        baseList.push(`HC-${i.toString().padStart(2, '0')}`);
    }

    // Agregar los que existan en datos reales pero no estén en la base
    if (currentData.length > 0) {
        const extras = currentData
            .map(r => r.no_hc)
            .filter(hc => hc && !baseList.includes(hc));
        extras.forEach(hc => baseList.push(hc));
    }

    baseList.sort();

    select.innerHTML = '<option value="">-- Seleccione HC --</option>' +
        baseList.map(hc => `<option value="${hc}">${hc}</option>`).join('');
}
// === 2. RENDER TABLE CON HUMEDAD FIJA ===
function renderTable(data) {
    const tbody = document.getElementById('data-tbody');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 40px;">No hay datos disponibles</td></tr>';
        document.getElementById('table-container').style.display = 'block';
        return;
    }
    
    tbody.innerHTML = data.map(record => {
        // LIMPIAR HUMEDAD
        let hRaw = String(record.humedad || '0').replace('%', '').trim();
        let hNum = parseFloat(hRaw);
        if (!isNaN(hNum) && hNum > 0 && hNum < 1) hNum = Math.round(hNum * 100);
        hNum = Math.round(hNum) || 0;
        
        // LIMPIAR TEMPERATURA
        let tRaw = String(record.temperatura || '0').split('°')[0].trim();
        let tNum = parseFloat(tRaw) || 0;
        
        return `
            <tr>
                <td class="hide-column">${record.id}</td>
                <td style="font-weight: bold; color: var(--primary);">${record.no_hc || '-'}</td>
                <td>${formatDisplayDate(record.fecha)}</td>
                <td>${record.hora}</td>
                <td><span class="badge badge-${record.jornada === 'MAÑANA' ? 'info' : 'success'}">${record.jornada}</span></td>
                <td>${record.dia}</td>
                <td class="font-mono">${tNum.toFixed(1)}°C</td>
                <td class="font-mono">${hNum}%</td>
                <td>${record.persona}</td>
                <td>${record.observaciones || '-'}</td>
                <td>
                    <div class="button-group" style="gap: 5px;">
                        <button class="btn btn-primary" onclick="editRecord(${record.id})">✏️</button>
                        <button class="btn btn-danger" onclick="deleteRecord(${record.id})">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    document.getElementById('table-container').style.display = 'block';
}

// === 3. EDICIÓN MASIVA ===
let isBulkEditing = false;

function toggleBulkEdit() {
    isBulkEditing = !isBulkEditing;
    const btn = document.getElementById('btn-bulk-edit');
    const saveBtn = document.getElementById('btn-save-bulk');
    
    if (isBulkEditing) {
        btn.innerHTML = '❌ Cancelar';
        btn.className = 'btn btn-danger';
        saveBtn.style.display = 'inline-block';
        enableInlineEditing();
    } else {
        saveBulkChanges();
        btn.innerHTML = '✏️ Edición Masiva';
        btn.className = 'btn btn-warning';
        saveBtn.style.display = 'none';
    }
}

function enableInlineEditing() {
    const rows = document.querySelectorAll('#data-tbody tr');
    rows.forEach(row => {
        const id = row.cells[0].textContent.trim();
        if (!id) return;
        
        const cells = Array.from(row.cells).slice(1, -1); // Excluye ID y Acciones
        cells.forEach((cell, idx) => {
            let value = cell.textContent.replace('°C', '').replace('%', '').trim();
            if (value === '-') value = '';
            
            if (idx === 8) { // Observaciones
                cell.innerHTML = `<textarea class="bulk-input" rows="1">${value}</textarea>`;
            } else {
                cell.innerHTML = `<input type="text" class="bulk-input" value="${value}">`;
            }
        });
    });
}

async function saveBulkChanges() {
    showLoading(true);
    const rows = document.querySelectorAll('#data-tbody tr');
    const updates = [];
    
    rows.forEach(row => {
        const id = row.cells[0].textContent.trim();
        if (!id) return;
        
        const inputs = row.querySelectorAll('.bulk-input');
        if (inputs.length === 0) return;
        
        // HUMEDAD CORRECTA
        let humRaw = inputs[6]?.value?.replace('%', '').trim() || '0';
        let humNum = parseFloat(humRaw);
        if (!isNaN(humNum) && humNum > 0 && humNum < 1) humNum *= 100;
        humNum = Math.round(humNum) || 0;
        
        const record = {
            id: id,
            no_hc: inputs[0]?.value || '',
            fecha: inputs[1]?.value || '',
            hora: inputs[2]?.value || '',
            jornada: inputs[3]?.value || '',
            dia: inputs[4]?.value || '',
            temperatura: parseFloat(inputs[5]?.value) || 0,
            humedad: humNum,
            persona: inputs[7]?.value || '',
            observaciones: inputs[8]?.value || ''
        };
        updates.push(callAppsScript('updateData', record));
    });
    
    try {
        if (updates.length > 0) await Promise.all(updates);
        showAlert('✅ Cambios masivos guardados', 'success');
        loadData();
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    } finally {
        isBulkEditing = false;
        document.getElementById('btn-bulk-edit').innerHTML = '✏️ Edición Masiva';
        document.getElementById('btn-bulk-edit').className = 'btn btn-warning';
        document.getElementById('btn-save-bulk').style.display = 'none';
        showLoading(false);
    }
}


// Ordenar tabla por columna
let sortColumn = '';
let sortAsc = true;

function sortTable(column) {
    if (sortColumn === column) {
        sortAsc = !sortAsc;
    } else {
        sortColumn = column;
        sortAsc = true;
    }

    const sorted = [...currentData].sort((a, b) => {
        let valA = a[column] ?? '';
        let valB = b[column] ?? '';

        // Numérico para temperatura, humedad, dia
        if (['temperatura', 'humedad', 'dia'].includes(column)) {
            valA = parseFloat(String(valA).replace('%', '')) || 0;
            valB = parseFloat(String(valB).replace('%', '')) || 0;
            return sortAsc ? valA - valB : valB - valA;
        }

        // Texto
        return sortAsc
            ? String(valA).localeCompare(String(valB), 'es')
            : String(valB).localeCompare(String(valA), 'es');
    });

    renderTable(sorted);
}



// Exportar funciones globales
window.saveConfiguration = saveConfiguration;
window.loadData = loadData;
window.openAddModal = openAddModal;
window.editRecord = editRecord;
window.deleteRecord = deleteRecord;
window.saveData = saveData;
window.closeModal = closeModal;
window.showHistory = showHistory;
window.closeHistoryModal = closeHistoryModal;
window.undoLastChange = undoLastChange;
window.redoLastChange = redoLastChange;
window.toggleBulkEdit = toggleBulkEdit;
window.saveBulkChanges = saveBulkChanges;
window.populateHCSelect = populateHCSelect;
window.sortTable = sortTable;
