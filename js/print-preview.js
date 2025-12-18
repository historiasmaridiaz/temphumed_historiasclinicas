// ═══════════════════════════════════════════════════════════════════════════
//  SCRIPT DE VISTA PREVIA DE IMPRESIÓN - VERSIÓN FINAL CORREGIDA
//  Sistema de Control de Temperatura y Humedad
// ═══════════════════════════════════════════════════════════════════════════

class PrintPreviewManager {
    constructor() {
        this.config = {
            paperSize: 'letter',
            orientation: 'landscape',
            scale: 57,
            marginTop: 0.1,
            marginBottom: 0.1,
            marginLeft: 0.1,
            marginRight: 0.1,
            showGridlines: true,
            showHeaders: false
        };
        
        this.spreadsheetId = null;
        this.gid = null;
        this.sheetName = 'GRAFICO_FORMATO';
        
        this.init();
    }
    
    init() {
        console.log('🚀 Inicializando PrintPreviewManager...');
        this.loadUrlParams();
        this.setupEventListeners();
        this.loadSavedConfig();
        this.loadPreview();
        this.updateSummary();
    }
    
    loadUrlParams() {
        const params = new URLSearchParams(window.location.search);
        this.spreadsheetId = params.get('sheetId');
        this.gid = params.get('gid');
        if (params.get('sheetName')) {
            this.sheetName = params.get('sheetName');
        }
        
        console.log('📋 Parámetros cargados:', {
            spreadsheetId: this.spreadsheetId,
            gid: this.gid,
            sheetName: this.sheetName
        });
    }
    
    setupEventListeners() {
        // Configuración de papel
        document.getElementById('paperSize').addEventListener('change', (e) => {
            this.config.paperSize = e.target.value;
            this.updateSummary();
        });
        
        // Botones de orientación
        document.querySelectorAll('.orientation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.orientation-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.config.orientation = e.target.dataset.orientation;
                this.updateSummary();
            });
        });
        
        // Escala
        document.getElementById('scale').addEventListener('input', (e) => {
            this.config.scale = parseInt(e.target.value);
            document.getElementById('scaleValue').textContent = this.config.scale;
            document.getElementById('resolutionInfo').textContent = `Escala: ${this.config.scale}%`;
            this.updateSummary();
        });
        
        document.getElementById('decreaseScale').addEventListener('click', () => {
            const scale = Math.max(50, this.config.scale - 5);
            this.config.scale = scale;
            document.getElementById('scale').value = scale;
            document.getElementById('scaleValue').textContent = scale;
            document.getElementById('resolutionInfo').textContent = `Escala: ${scale}%`;
            this.updateSummary();
        });
        
        document.getElementById('increaseScale').addEventListener('click', () => {
            const scale = Math.min(150, this.config.scale + 5);
            this.config.scale = scale;
            document.getElementById('scale').value = scale;
            document.getElementById('scaleValue').textContent = scale;
            document.getElementById('resolutionInfo').textContent = `Escala: ${scale}%`;
            this.updateSummary();
        });
        
        // Márgenes
        ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].forEach(margin => {
            document.getElementById(margin).addEventListener('change', (e) => {
                this.config[margin] = parseFloat(e.target.value);
                this.updateSummary();
            });
        });
        
        // Opciones
        document.getElementById('showGridlines').addEventListener('change', (e) => {
            this.config.showGridlines = e.target.checked;
        });
        
        document.getElementById('showHeaders').addEventListener('change', (e) => {
            this.config.showHeaders = e.target.checked;
        });
        
        // Botones de acción
        document.getElementById('downloadPDF').addEventListener('click', () => this.downloadPDF());
        document.getElementById('resetConfig').addEventListener('click', () => this.resetConfig());
        document.getElementById('closePreview').addEventListener('click', () => this.closePreview());
    }
    
    async loadPreview() {
        const loadingMessage = document.getElementById('loadingMessage');
        const pageContainer = document.getElementById('pageContainer');
        
        try {
            if (!this.spreadsheetId || !this.gid) {
                throw new Error('No se proporcionaron parámetros de hoja');
            }
            
            console.log('📄 Preparando vista previa...');
            
            // Mostrar mensaje informativo en lugar del spinner
            loadingMessage.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4285f4" style="margin-bottom: 20px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <h3 style="color: #202124; margin-bottom: 10px; font-size: 22px;">✅ Configuración Lista</h3>
                    <p style="color: #5f6368; font-size: 15px; line-height: 1.6; max-width: 450px; margin: 0 auto;">
                        Ajusta los parámetros de impresión en el panel izquierdo según tus necesidades.
                    </p>
                    <div style="margin-top: 30px; padding: 24px; background: linear-gradient(135deg, #f8f9fa 0%, #e8eaed 100%); border-radius: 12px; max-width: 500px; margin: 30px auto 0; border: 1px solid #dadce0;">
                        <p style="color: #202124; font-weight: 600; margin-bottom: 12px; font-size: 15px;">📊 Hoja a exportar:</p>
                        <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                            <p style="color: #5f6368; font-size: 13px; margin: 0;">
                                <strong style="color: #202124;">Nombre:</strong> ${this.sheetName}
                            </p>
                        </div>
                        <div style="background: white; padding: 12px; border-radius: 6px;">
                            <p style="color: #5f6368; font-size: 13px; margin: 0;">
                                <strong style="color: #202124;">ID Hoja:</strong> ${this.gid}
                            </p>
                        </div>
                    </div>
                    <div style="margin-top: 30px; padding: 16px; background: #e8f0fe; border-radius: 8px; border-left: 4px solid #4285f4;">
                        <p style="color: #185abc; font-size: 14px; font-weight: 500; margin: 0;">
                            💡 Cuando termines de configurar, haz click en <strong>"💾 Descargar PDF"</strong>
                        </p>
                    </div>
                </div>
            `;
            
            // Ocultar el contenedor del iframe
            pageContainer.style.display = 'none';
            
        } catch (error) {
            console.error('❌ Error cargando vista previa:', error);
            loadingMessage.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ea4335" style="margin-bottom: 20px;">
                        <circle cx="12" cy="12" r="10" stroke-width="2"/>
                        <path stroke-linecap="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
                    </svg>
                    <p style="color: #ea4335; font-weight: 600; font-size: 18px;">❌ Error al cargar</p>
                    <p style="font-size: 13px; color: #5f6368; margin-top: 10px; max-width: 400px;">${error.message}</p>
                </div>
            `;
        }
    }
    
    updateSummary() {
        const orientation = this.config.orientation === 'landscape' ? 'Horizontal' : 'Vertical';
        const summary = `${this.config.paperSize.toUpperCase()} | ${orientation} | ${this.config.scale}% | Márgenes: ${this.config.marginTop}cm`;
        document.getElementById('summaryText').textContent = summary;
        this.saveConfig();
    }
    
    async downloadPDF() {
        try {
            const button = document.getElementById('downloadPDF');
            const originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '⏳ Preparando descarga...';
            
            console.log('📥 Preparando PDF con configuración:', this.config);
            
            if (!this.spreadsheetId || !this.gid) {
                throw new Error('No se encontró la información de la hoja');
            }
            
            // Construir URL de exportación DIRECTA de Google Sheets
            const exportParams = {
                format: 'pdf',
                size: this.config.paperSize.toUpperCase(),
                portrait: this.config.orientation === 'portrait' ? 'true' : 'false',
                fitw: 'true',
                scale: this.config.scale,
                top_margin: this.config.marginTop,
                bottom_margin: this.config.marginBottom,
                left_margin: this.config.marginLeft,
                right_margin: this.config.marginRight,
                sheetnames: this.config.showHeaders ? 'true' : 'false',
                printtitle: this.config.showHeaders ? 'true' : 'false',
                pagenum: 'UNDEFINED',
                gridlines: this.config.showGridlines ? 'true' : 'false',
                fzr: 'false',
                gid: this.gid
            };
            
            // Construir query string
            const queryString = Object.entries(exportParams)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');
            
            // URL DIRECTA de exportación de Google Sheets
            const exportUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?${queryString}`;
            
            console.log('🔗 URL de exportación:', exportUrl);
            
            this.showNotification('⏳ Iniciando descarga del PDF...', 'info');
            
            // Abrir en nueva ventana (esto fuerza la descarga)
            const downloadWindow = window.open(exportUrl, '_blank');
            
            if (!downloadWindow) {
                throw new Error('Bloqueador de ventanas emergentes activado. Permite ventanas emergentes para este sitio.');
            }
            
            // Mostrar mensaje de éxito
            setTimeout(() => {
                this.showNotification('✅ Descarga iniciada. Revisa tu carpeta de Descargas.', 'success');
                
                // Mostrar instrucciones
                setTimeout(() => {
                    const showConfig = confirm(
                        '📄 DESCARGA INICIADA\n\n' +
                        '✅ El PDF se está descargando automáticamente.\n\n' +
                        '📁 Revisa tu carpeta de Descargas.\n\n' +
                        'Si no se descargó:\n' +
                        '1. Verifica el bloqueador de descargas del navegador\n' +
                        '2. Permite descargas para docs.google.com\n\n' +
                        '¿Deseas ver la configuración aplicada?'
                    );
                    
                    if (showConfig) {
                        const config = 
                            `📋 CONFIGURACIÓN APLICADA:\n\n` +
                            `📄 Papel: ${this.config.paperSize.toUpperCase()}\n` +
                            `📐 Orientación: ${this.config.orientation === 'landscape' ? 'Horizontal' : 'Vertical'}\n` +
                            `🔍 Escala: ${this.config.scale}%\n` +
                            `📏 Márgenes:\n` +
                            `   Superior: ${this.config.marginTop}cm\n` +
                            `   Inferior: ${this.config.marginBottom}cm\n` +
                            `   Izquierda: ${this.config.marginLeft}cm\n` +
                            `   Derecha: ${this.config.marginRight}cm\n` +
                            `🎨 Cuadrícula: ${this.config.showGridlines ? 'Sí' : 'No'}\n` +
                            `📌 Encabezados: ${this.config.showHeaders ? 'Sí' : 'No'}`;
                        
                        alert(config);
                    }
                }, 1000);
            }, 500);
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.showNotification(`❌ Error: ${error.message}`, 'error');
            
            // Ofrecer alternativa manual
            setTimeout(() => {
                const fallback = confirm(
                    '❌ ERROR AL DESCARGAR\n\n' +
                    error.message + '\n\n' +
                    '¿Deseas abrir Google Sheets para descargar manualmente?\n\n' +
                    '(Luego presiona Ctrl+P en Sheets para imprimir/descargar)'
                );
                
                if (fallback) {
                    const sheetsUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit#gid=${this.gid}`;
                    window.open(sheetsUrl, '_blank');
                    
                    setTimeout(() => {
                        alert(
                            '📋 INSTRUCCIONES MANUALES:\n\n' +
                            '1. En Google Sheets, presiona Ctrl+P (Cmd+P en Mac)\n' +
                            '2. Configura según tus preferencias:\n' +
                            `   • Papel: ${this.config.paperSize.toUpperCase()}\n` +
                            `   • Orientación: ${this.config.orientation === 'landscape' ? 'Horizontal' : 'Vertical'}\n` +
                            `   • Escala: ${this.config.scale}%\n` +
                            `   • Márgenes: ${this.config.marginTop}cm\n` +
                            '3. Selecciona "Guardar como PDF"\n' +
                            '4. Descarga'
                        );
                    }, 500);
                }
            }, 500);
            
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
    
    resetConfig() {
        this.config = {
            paperSize: 'letter',
            orientation: 'landscape',
            scale: 57,
            marginTop: 0.1,
            marginBottom: 0.1,
            marginLeft: 0.1,
            marginRight: 0.1,
            showGridlines: true,
            showHeaders: false
        };
        
        // Actualizar UI
        document.getElementById('paperSize').value = 'letter';
        document.getElementById('scale').value = 57;
        document.getElementById('scaleValue').textContent = '57';
        document.getElementById('marginTop').value = 0.1;
        document.getElementById('marginBottom').value = 0.1;
        document.getElementById('marginLeft').value = 0.1;
        document.getElementById('marginRight').value = 0.1;
        document.getElementById('showGridlines').checked = true;
        document.getElementById('showHeaders').checked = false;
        
        document.querySelectorAll('.orientation-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-orientation="landscape"]').classList.add('active');
        
        this.updateSummary();
        this.showNotification('🔄 Configuración restablecida', 'info');
    }
    
    closePreview() {
        if (confirm('¿Cerrar la vista previa de impresión?')) {
            window.close();
        }
    }
    
    saveConfig() {
        localStorage.setItem('printConfig', JSON.stringify(this.config));
    }
    
    loadSavedConfig() {
        const saved = localStorage.getItem('printConfig');
        if (saved) {
            try {
                const savedConfig = JSON.parse(saved);
                this.config = { ...this.config, ...savedConfig };
                
                // Actualizar UI
                document.getElementById('paperSize').value = this.config.paperSize;
                document.getElementById('scale').value = this.config.scale;
                document.getElementById('scaleValue').textContent = this.config.scale;
                document.getElementById('marginTop').value = this.config.marginTop;
                document.getElementById('marginBottom').value = this.config.marginBottom;
                document.getElementById('marginLeft').value = this.config.marginLeft;
                document.getElementById('marginRight').value = this.config.marginRight;
                document.getElementById('showGridlines').checked = this.config.showGridlines;
                document.getElementById('showHeaders').checked = this.config.showHeaders;
                
                document.querySelectorAll('.orientation-btn').forEach(btn => {
                    if (btn.dataset.orientation === this.config.orientation) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                
                console.log('✅ Configuración guardada cargada:', this.config);
            } catch (e) {
                console.warn('⚠️ No se pudo cargar configuración guardada');
            }
        }
    }
    
    showNotification(message, type = 'info') {
        // Eliminar notificaciones anteriores
        const oldNotifications = document.querySelectorAll('.notification');
        oldNotifications.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM cargado, iniciando PrintPreviewManager...');
    const manager = new PrintPreviewManager();
    window.printPreviewManager = manager;
});
