// ═══════════════════════════════════════════════════════════════════
//  SISTEMA DE CONTROL DE TEMPERATURA Y HUMEDAD
//  Gráficos con Chart.js - Versión 1.0.1 CORREGIDA
// ═══════════════════════════════════════════════════════════════════

let SCRIPT_URL = localStorage.getItem('scriptUrl') || '';
let temperatureChart = null;
let humidityChart = null;
let autoRefreshInterval = null;

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    loadChartData();
    autoRefreshInterval = setInterval(loadChartData, 60000);
});

// Inicializar gráficos
function initializeCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(1);
                            label += context.dataset.label.includes('Temp') ? '°C' : '%';
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { size: 12 } }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 45 }
            }
        }
    };

    // Gráfico de Temperatura
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    temperatureChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperatura',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Máxima',
                    data: [],
                    borderColor: '#e53e3e',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0
                },
                {
                    label: 'Mínima',
                    data: [],
                    borderColor: '#3182ce',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Temperatura (°C)',
                        font: { size: 13, weight: 'bold' }
                    }
                }
            }
        }
    });

    // Gráfico de Humedad
    const humCtx = document.getElementById('humidityChart').getContext('2d');
    humidityChart = new Chart(humCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Humedad',
                    data: [],
                    borderColor: '#38b2ac',
                    backgroundColor: 'rgba(56, 178, 172, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#38b2ac',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Máxima',
                    data: [],
                    borderColor: '#e53e3e',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0
                },
                {
                    label: 'Mínima',
                    data: [],
                    borderColor: '#3182ce',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Humedad (%)',
                        font: { size: 13, weight: 'bold' }
                    },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

// Cargar datos de los gráficos
async function loadChartData() {
    try {
        const result = await callAppsScript('getData');
        
        if (result.success && result.data.length > 0) {
            const data = result.data;
            const recentData = data.slice(-24);
            
            const labels = recentData.map(item => {
                const fecha = new Date(item.fecha);
                const dia = fecha.getDate();
                return `${dia}/${item.hora}`;
            });
            
            const temperatures = recentData.map(item => parseFloat(item.temperatura));
            const humidities = recentData.map(item => {
                let hum = parseFloat(String(item.humedad).replace('%', '').trim());
                // Si viene como decimal 0.56 → convertir a 56
                if (!isNaN(hum) && hum > 0 && hum < 1) hum = Math.round(hum * 100);
                return Math.round(hum) || 0;
            });
            
            const tempMax = Math.max(...temperatures);
            const tempMin = Math.min(...temperatures);
            const humMax = Math.max(...humidities);
            const humMin = Math.min(...humidities);
            
            const tempMaxIndex = temperatures.indexOf(tempMax);
            const tempMinIndex = temperatures.indexOf(tempMin);
            const humMaxIndex = humidities.indexOf(humMax);
            const humMinIndex = humidities.indexOf(humMin);
            
            // Actualizar gráfico de temperatura
            temperatureChart.data.labels = labels;
            temperatureChart.data.datasets[0].data = temperatures;
            temperatureChart.data.datasets[1].data = new Array(labels.length).fill(tempMax);
            temperatureChart.data.datasets[2].data = new Array(labels.length).fill(tempMin);
            temperatureChart.update();
            
            // Actualizar gráfico de humedad
            humidityChart.data.labels = labels;
            humidityChart.data.datasets[0].data = humidities;
            humidityChart.data.datasets[1].data = new Array(labels.length).fill(humMax);
            humidityChart.data.datasets[2].data = new Array(labels.length).fill(humMin);
            humidityChart.update();
            
            // Actualizar estadísticas de temperatura
            document.getElementById('tempCurrent').innerHTML = temperatures[temperatures.length - 1].toFixed(1) + '<span class="stat-unit">°C</span>';
            document.getElementById('tempMax').innerHTML = tempMax.toFixed(1) + '<span class="stat-unit">°C</span>';
            document.getElementById('tempMin').innerHTML = tempMin.toFixed(1) + '<span class="stat-unit">°C</span>';
            document.getElementById('tempAvg').innerHTML = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1) + '<span class="stat-unit">°C</span>';
            document.getElementById('tempMaxTime').innerHTML = `🔺 ${labels[tempMaxIndex]}`;
            document.getElementById('tempMinTime').innerHTML = `🔻 ${labels[tempMinIndex]}`;
            
            // Actualizar estadísticas de humedad
            document.getElementById('humCurrent').innerHTML = humidities[humidities.length - 1].toFixed(0) + '<span class="stat-unit">%</span>';
            document.getElementById('humMax').innerHTML = humMax.toFixed(0) + '<span class="stat-unit">%</span>';
            document.getElementById('humMin').innerHTML = humMin.toFixed(0) + '<span class="stat-unit">%</span>';
            document.getElementById('humAvg').innerHTML = (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(0) + '<span class="stat-unit">%</span>';
            document.getElementById('humMaxTime').innerHTML = `🔺 ${labels[humMaxIndex]}`;
            document.getElementById('humMinTime').innerHTML = `🔻 ${labels[humMinIndex]}`;
            
            console.log('Gráficos actualizados exitosamente');
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

// Actualizar gráficos manualmente
function refreshCharts() {
    loadChartData();
    const iframe = document.querySelector('.iframe-container iframe');
    if (iframe) iframe.src = iframe.src;
    showNotification('Gráficos actualizados exitosamente', 'success');
}

// Descargar gráficos
function downloadCharts() {
    const tempLink = document.createElement('a');
    tempLink.download = `temperatura_${new Date().toISOString().split('T')[0]}.png`;
    tempLink.href = temperatureChart.toBase64Image();
    tempLink.click();
    
    setTimeout(() => {
        const humLink = document.createElement('a');
        humLink.download = `humedad_${new Date().toISOString().split('T')[0]}.png`;
        humLink.href = humidityChart.toBase64Image();
        humLink.click();
    }, 500);
    
    showNotification('Gráficos descargados exitosamente', 'success');
}

// ═══════════════════════════════════════════════════════════════════
//  EXPORTACIÓN PDF - MÉTODO SIMPLE QUE FUNCIONA
// ═══════════════════════════════════════════════════════════════════

function exportPdfAuto() {
    const spreadsheetId = '1YRAztDSETnV5GcsPhtfrvKM-8k922XxzUcLHiLHwBcI';
    const gid = '9685068';
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`;
    
    showNotification('📄 Abriendo Google Sheets para exportar...', 'info');
    
    const ventana = window.open(sheetsUrl, '_blank');
    
    if (!ventana) {
        alert('⚠️ Bloqueador de ventanas activado.\nPermite ventanas emergentes para este sitio.');
        return;
    }
    
    setTimeout(() => {
        showNotification('✅ Abierto. Usa Ctrl+P para exportar.', 'success');
        
        setTimeout(() => {
            alert(
                '📄 CÓMO EXPORTAR A PDF:\n\n' +
                '1. Presiona Ctrl+P (Cmd+P en Mac)\n' +
                '2. Configura:\n' +
                '   • Tamaño: Carta\n' +
                '   • Orientación: Horizontal\n' +
                '   • Escala: 57%\n' +
                '   • Márgenes: 0.1cm\n' +
                '   • Cuadrículas: Sí\n' +
                '3. Click "Siguiente" → "Descargar"'
            );
        }, 1000);
    }, 500);
}

function exportPdfManual() {
    exportPdfAuto(); // Ambas funciones hacen lo mismo
}

// Notificación
function showNotification(message, type) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    const colors = { info: '#3182ce', success: '#38a169', error: '#e53e3e', warning: '#dd6b20' };
    
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
        font-size: 14px;
        transform: translateX(450px);
        transition: transform 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 20px;">${icons[type] || icons.info}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: transparent; border: none; color: white; cursor: pointer; font-size: 20px;">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(450px)';
        setTimeout(() => notification.remove(), 300);
    }, type === 'error' ? 8000 : 5000);
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
    
    const params = new URLSearchParams({ action: action, ...data });
    const response = await fetch(`${SCRIPT_URL}?${params}`, {
        method: 'GET',
        redirect: 'follow'
    });
    
    return await response.json();
}

// Cleanup al salir
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
});

// ═══════════════════════════════════════════════════════════════════════════
//  DESCARGAR PDF DE GOOGLE SHEETS PÚBLICO
// ═══════════════════════════════════════════════════════════════════════════

function exportPDF() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    try {
        button.disabled = true;
        button.innerHTML = '⏳ Generando PDF...';
        button.style.opacity = '0.7';
        
        showNotification('⏳ Iniciando descarga del PDF...', 'info');
        
        // ID de la hoja pública (del URL que compartiste)
        const spreadsheetId = '1YRAztDSETnV5GcsPhtfrvKM-8k922XxzUcLHiLHwBcI';
        const gid = '9685068'; // GRAFICO_FORMATO
        
        // Parámetros de exportación optimizados
        const params = {
            format: 'pdf',
            size: 'letter',
            portrait: false,
            fitw: true,
            scale: 57,
            top_margin: 0.1,
            bottom_margin: 0.1,
            left_margin: 0.1,
            right_margin: 0.1,
            sheetnames: false,
            printtitle: false,
            pagenum: 'UNDEFINED',
            gridlines: true,
            fzr: false,
            gid: gid
        };
        
        // Construir URL de descarga
        const queryString = Object.entries(params)
            .map(([key, value]) => {
                if (typeof value === 'boolean') {
                    return `${key}=${value ? 'true' : 'false'}`;
                }
                return `${key}=${encodeURIComponent(value)}`;
            })
            .join('&');
        
        const downloadUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${queryString}`;
        
        console.log('🔗 URL de descarga:', downloadUrl);
        
        // Crear elemento para descargar
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `Registro-Temperatura-${new Date().toISOString().split('T')[0]}.pdf`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('✅ Descarga iniciada. Revisa tu carpeta de Descargas.', 'success');
        
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalText;
            button.style.opacity = '1';
            
            alert(
                '✅ DESCARGA INICIADA\n\n' +
                'El PDF se está descargando automáticamente.\n\n' +
                '📁 Revisa tu carpeta de Descargas.\n\n' +
                'Configuración aplicada:\n' +
                '• Papel: Carta\n' +
                '• Orientación: Horizontal\n' +
                '• Escala: 57%\n' +
                '• Márgenes: 0.1 cm\n' +
                '• Cuadrículas: Sí\n\n' +
                'Nombre del archivo:\n' +
                'Registro-Temperatura-[FECHA].pdf'
            );
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        button.disabled = false;
        button.innerHTML = originalText;
        button.style.opacity = '1';
        
        showNotification('❌ Error: ' + error.message, 'error');
        
        alert('❌ ERROR EN LA DESCARGA\n\n' + error.message);
    }
}

// Funciones alias para compatibilidad
function exportPdfAuto() { exportPDF(); }
function exportPdfManual() { exportPDF(); }
function exportPdfDirect() { exportPDF(); }
function downloadPDFDirect() { exportPDF(); }
function openGoogleSheetsForPDF() { exportPDF(); }


// ═══════════════════════════════════════════════════════════════════════════
//  FUNCIÓN 2: ABRIR GOOGLE SHEETS PARA EXPORTAR MANUALMENTE
// ═══════════════════════════════════════════════════════════════════════════

function openGoogleSheetsForPDF() {
    try {
        const button = event.target;
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '⏳ Abriendo Google Sheets...';
        
        // Configuración
        const spreadsheetId = '1qraItHZYo4jxLjwf1su9hOxu9OSLhi0mUSY8A3EcB94';
        const gid = '9685068'; // GRAFICO_FORMATO
            
        // URL de Google Sheets
        const sheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`;
        
        showNotification('📄 Abriendo Google Sheets...', 'info');
        
        // Abrir en nueva pestaña
        const ventana = window.open(sheetsUrl, '_blank', 'noopener,noreferrer');
        
        if (!ventana) {
            throw new Error('Bloqueador de ventanas emergentes activado');
        }
        
        // Restaurar botón y mostrar instrucciones
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalText;
            showNotification('✅ Google Sheets abierto en nueva pestaña', 'success');
            
            setTimeout(() => {
                alert(
                    '📋 INSTRUCCIONES PARA EXPORTAR PDF:\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '1️⃣ ABRIR DIÁLOGO DE IMPRESIÓN:\n' +
                    '   • Windows/Linux: Ctrl + P\n' +
                    '   • Mac: Cmd + P\n' +
                    '   • O: Archivo → Imprimir\n\n' +
                    '2️⃣ CONFIGURAR:\n\n' +
                    '   📄 Tamaño del papel:\n' +
                    '      → Carta (Letter) o A4\n\n' +
                    '   📐 Orientación:\n' +
                    '      → Horizontal (Landscape)\n\n' +
                    '   🔍 Escala:\n' +
                    '      → 57% (ajustar para que quepa en 1 página)\n\n' +
                    '   📏 Márgenes:\n' +
                    '      → Superior: 0.1 cm\n' +
                    '      → Inferior: 0.1 cm\n' +
                    '      → Izquierda: 0.1 cm\n' +
                    '      → Derecha: 0.1 cm\n\n' +
                    '   ✅ Opciones:\n' +
                    '      → Mostrar líneas de cuadrícula: ✅ SÍ\n' +
                    '      → Mostrar encabezados: ❌ NO\n' +
                    '      → Alineación: Centrado\n\n' +
                    '3️⃣ EXPORTAR:\n' +
                    '   • Click en "Siguiente"\n' +
                    '   • Selecciona "Descargar"\n' +
                    '   • El PDF se descargará automáticamente\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '💡 CONSEJO:\n' +
                    'Ajusta la escala hasta que el gráfico\n' +
                    'quepa perfectamente en una sola página.'
                );
            }, 1000);
        }, 500);
        
    } catch (error) {
        console.error('❌ Error:', error);
        const button = event.target;
        button.disabled = false;
        button.innerHTML = '📄 Exportar en Google Sheets';
        
        showNotification('❌ Error: ' + error.message, 'error');
        
        // Fallback: copiar URL
        const spreadsheetId = '1YRAztDSETnV5GcsPhtfrvKM-8k922XxzUcLHiLHwBcI';
        const gid = '9685068';
        const sheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`;
        
        setTimeout(() => {
            const copyUrl = confirm(
                '❌ NO SE PUDO ABRIR AUTOMÁTICAMENTE\n\n' +
                'Tu navegador bloqueó la ventana emergente.\n\n' +
                '¿Deseas copiar la URL para abrirla manualmente?'
            );
            
            if (copyUrl) {
                navigator.clipboard.writeText(sheetsUrl)
                    .then(() => {
                        alert('✅ URL COPIADA AL PORTAPAPELES\n\nPégala en tu navegador para abrir Google Sheets.');
                    })
                    .catch(() => {
                        prompt('Copia esta URL manualmente:', sheetsUrl);
                    });
            }
        }, 500);
    }
}


// ═══════════════════════════════════════════════════════════════════════════
//  FUNCIONES ALIAS (para compatibilidad)
// ═══════════════════════════════════════════════════════════════════════════

function exportPdfAuto() {
    downloadPDFDirect(); // Redirigir a descarga directa
}

function exportPdfManual() {
    openGoogleSheetsForPDF(); // Redirigir a manual
}

function exportPdfDirect() {
    downloadPDFDirect(); // Alias
}
