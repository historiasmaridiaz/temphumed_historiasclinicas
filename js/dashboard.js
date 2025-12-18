// ═══════════════════════════════════════════════════════════════════
//  SISTEMA DE CONTROL DE TEMPERATURA Y HUMEDAD
//  Dashboard - Versión 1.0.0
// ═══════════════════════════════════════════════════════════════════

let SCRIPT_URL = localStorage.getItem('scriptUrl') || '';

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    generateDashboard();
});

// Generar dashboard
async function generateDashboard() {
    showLoading(true);
    
    try {
        const result = await callAppsScript('generateDashboard');
        
        if (result.success) {
            const data = result.data;
            
            // Actualizar temperatura
            document.getElementById('tempAvg').textContent = data.tempAvg.toFixed(1) + '°C';
            document.getElementById('tempSum').textContent = data.tempSum.toFixed(1);
            document.getElementById('tempAnalysis').textContent = data.tempAnalysis;
            document.getElementById('tempAnalysis').className = 'stat-label ' + getAnalysisClass(data.tempAnalysis);
            
            // Actualizar humedad
            document.getElementById('humidityAvg').textContent = data.humidityAvg.toFixed(0) + '%';
            document.getElementById('humiditySum').textContent = data.humiditySum.toFixed(0);
            document.getElementById('humidityAnalysis').textContent = data.humidityAnalysis;
            document.getElementById('humidityAnalysis').className = 'stat-label ' + getAnalysisClass(data.humidityAnalysis);
            
            // Actualizar promedios anuales
            document.getElementById('yearTempAvg').textContent = data.yearTempAvg.toFixed(1) + '°C';
            document.getElementById('yearHumidityAvg').textContent = data.yearHumidityAvg.toFixed(0) + '%';
            
            // Actualizar estadísticas generales
            document.getElementById('totalRecords').textContent = data.totalRecords;
            document.getElementById('lastRecord').textContent = formatDate(data.lastRecord);
            
            showAlert('Dashboard actualizado exitosamente', 'success');
        } else {
            showAlert('Error al generar dashboard: ' + result.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Obtener clase según análisis
function getAnalysisClass(analysis) {
    if (analysis.includes('Alta') || analysis.includes('Alto')) {
        return 'text-danger';
    } else if (analysis.includes('Baja') || analysis.includes('Bajo')) {
        return 'text-info';
    } else {
        return 'text-success';
    }
}

// Formatear fecha
function formatDate(dateStr) {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Exportar dashboard
function exportDashboard() {
    showAlert('Función de exportación en desarrollo', 'info');
    // Aquí puedes agregar lógica para exportar como PDF o Excel
}

// Mostrar loading
function showLoading(show) {
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
        if (show) {
            card.style.opacity = '0.5';
        } else {
            card.style.opacity = '1';
        }
    });
}

// Mostrar alerta
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.position = 'fixed';
    alert.style.top = '90px';
    alert.style.right = '20px';
    alert.style.zIndex = '1100';
    alert.style.minWidth = '300px';
    alert.innerHTML = `
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p>${message}</p>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// API Helper
async function callAppsScript(action, data = {}) {
    if (!SCRIPT_URL) {
        SCRIPT_URL = prompt('Por favor ingrese la URL de Apps Script:');
        if (SCRIPT_URL) {
            localStorage.setItem('scriptUrl', SCRIPT_URL);
        } else {
            return { success: false, message: 'URL no proporcionada' };
        }
    }
    
    const params = new URLSearchParams({
        action: action,
        ...data
    });
    
    const response = await fetch(`${SCRIPT_URL}?${params}`, {
        method: 'GET',
        redirect: 'follow'
    });
    
    return await response.json();
}

// Exportar funciones
window.generateDashboard = generateDashboard;
window.exportDashboard = exportDashboard;
