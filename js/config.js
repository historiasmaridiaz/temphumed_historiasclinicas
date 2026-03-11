// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN DEL SISTEMA
//  Solo cambia la URL aquí y funcionará en todo el sistema
// ═══════════════════════════════════════════════════════════════════


// ⚠️ REEMPLAZA ESTA URL CON LA TUYA
// Ejemplo: 'https://script.google.com/macros/s/AKfycbxxx.../exec'
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9JON4PyxVWxIFTI4UsmIFer2j5dOHFTI39yW5cu8x-CIdx4fnf_yUJwfaw46Ey6kVXQ/exec';


// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN ADICIONAL PARA MÓDULOS
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
    // URL de tu Google Apps Script desplegado
    SCRIPT_URL: APPS_SCRIPT_URL,  // Usa la URL definida arriba
    
    // ID de la hoja de cálculo
    SPREADSHEET_ID: '1YRAztDSETnV5GcsPhtfrvKM-8k922XxzUcLHiLHwBcI',
    
    // Intervalo de actualización automática (milisegundos)
    REFRESH_INTERVAL: 60000, // 60 segundos
    
    // Configuración de gráficos
    CHART_RECORDS_LIMIT: 24, // Últimas 24 lecturas
    
    // Rangos de temperatura (°C)
    TEMP_MIN: 15,
    TEMP_MAX: 25,
    TEMP_OPTIMAL: 20,
    
    // Rangos de humedad (%)
    HUMIDITY_MIN: 40,
    HUMIDITY_MAX: 70,
    HUMIDITY_OPTIMAL: 55
};


// ═══════════════════════════════════════════════════════════════════
// NO MODIFICAR NADA DEBAJO DE ESTA LÍNEA
// ═══════════════════════════════════════════════════════════════════


// Validar y guardar URL automáticamente
if (APPS_SCRIPT_URL && 
    APPS_SCRIPT_URL !== 'PEGA_AQUI_TU_URL_DE_APPS_SCRIPT' && 
    APPS_SCRIPT_URL.includes('script.google.com') && 
    APPS_SCRIPT_URL.includes('/exec')) {
    
    localStorage.setItem('scriptUrl', APPS_SCRIPT_URL);
    console.log('✅ URL de Apps Script configurada correctamente');
    console.log('📍 URL:', APPS_SCRIPT_URL);
    
} else {
    console.warn('⚠️ IMPORTANTE: Debes configurar tu URL de Apps Script en js/config.js');
    console.warn('La URL debe terminar en /exec');
}


// Información del sistema
const SYSTEM_CONFIG = {
    name: 'Sistema de Control de Temperatura y Humedad',
    version: '1.0.1', // Actualizada
    spreadsheetId: '1YRAztDSETnV5GcsPhtfrvKM-8k922XxzUcLHiLHwBcI',
    author: 'Sistema automatizado',
    lastUpdate: '2025-12-17' // Actualizada
};


// Mostrar información en consola
console.log('🚀 Sistema:', SYSTEM_CONFIG.name);
console.log('📌 Versión:', SYSTEM_CONFIG.version);
console.log('🔗 Script URL:', CONFIG.SCRIPT_URL);
console.log('📊 Spreadsheet ID:', CONFIG.SPREADSHEET_ID);
