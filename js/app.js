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
const MAX_HISTORY = 50;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    SCRIPT_URL = localStorage.getItem('scriptUrl');
    
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
            showAlert(`${currentData.length} registros cargados`, 'success');
        } else {
            showAlert('Error al cargar datos: ' + result.message, 'error');
        }
    } catch (error) {
        showAlert('Error de conexión: ' + error.message, 'error');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Renderizar tabla
function renderTable(data) {
    const tbody = document.getElementById('data-tbody');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 40px;">No hay datos disponibles</td></tr>';
        document.getElementById('table-container').style.display = 'block';
        return;
    }
    
    tbody.innerHTML = data.map(record => `
        <tr>
            <td>${record.id}</td>
            <td>${formatDisplayDate(record.fecha)}</td>
            <td>${record.hora}</td>
            <td><span class="badge badge-${record.jornada === 'MAÑANA' ? 'info' : 'success'}">${record.jornada}</span></td>
            <td>${record.dia}</td>
            <td>${record.temperatura}°C</td>
            <td>${record.humedad}%</td>
            <td>${record.persona}</td>
            <td>${record.observaciones || '-'}</td>
            <td>
                <div class="button-group" style="gap: 5px;">
                    <button class="btn btn-primary" style="padding: 8px 12px;" onclick="editRecord(${record.id})">✏️</button>
                    <button class="btn btn-danger" style="padding: 8px 12px;" onclick="deleteRecord(${record.id})">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    document.getElementById('table-container').style.display = 'block';
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
    document.getElementById('fecha').value = record.fecha;
    document.getElementById('hora').value = record.hora;
    document.getElementById('jornada').value = record.jornada;
    document.getElementById('dia').value = record.dia;
    document.getElementById('temperatura').value = record.temperatura;
    document.getElementById('humedad').value = record.humedad;
    document.getElementById('persona').value = record.persona;
    document.getElementById('observaciones').value = record.observaciones || '';
    
    openModal();
}

// Guardar datos (crear o actualizar)
async function saveData(event) {
    event.preventDefault();
    
    const recordData = {
        id: document.getElementById('record-id').value,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        jornada: document.getElementById('jornada').value,
        dia: document.getElementById('dia').value,
        temperatura: document.getElementById('temperatura').value,
        humedad: document.getElementById('humedad').value,
        persona: document.getElementById('persona').value,
        observaciones: document.getElementById('observaciones').value
    };
    
    showLoading(true);
    
    try {
        const action = recordData.id ? 'updateData' : 'createData';
        const result = await callAppsScript(action, recordData);
        
        if (result.success) {
            // Guardar en historial
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
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    }
    redoStack = []; // Limpiar redo stack
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
