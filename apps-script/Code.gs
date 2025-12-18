// ═══════════════════════════════════════════════════════════════════
//  SISTEMA DE CONTROL DE TEMPERATURA Y HUMEDAD
//  Google Apps Script - Backend COMPLETO
//  Versión: 1.0.5 - Con hoja GRAFICO separada de GRAFICO_FORMATO
// ═══════════════════════════════════════════════════════════════════

// CONFIGURACIÓN
const SPREADSHEET_ID = '1YRAztDSETnV5GcsPhtfrvKM-8k922XxzUcLHiLHwBcI';
const SHEET_BASE = 'BASE';
const SHEET_GRAFICO = 'GRAFICO';
const SHEET_GRAFICO_FORMATO = 'GRAFICO_FORMATO';
const SHEET_2024 = '2024';
const SHEET_2025 = '2025';
const SHEET_DASHBOARD = 'DASHBOARD';

// Función principal para manejar peticiones GET
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result = {};
    
    switch(action) {
      case 'test':
        result = { success: true, message: 'Conexión exitosa' };
        break;
        
      case 'getData':
        result = { success: true, data: getData() };
        break;
        
      case 'getGraficoData':
        result = getGraficoData();
        break;
        
      case 'getHistoricalData':
        result = { success: true, data: getHistoricalData(e.parameter.year) };
        break;
        
      case 'getAllHistoricalData':
        result = { success: true, data: getAllHistoricalData() };
        break;
        
      case 'generateDashboard':
        result = { success: true, data: generateDashboardData() };
        break;
        
      case 'createData':
        result = createData(parseRecordData(e.parameter));
        break;
        
      case 'updateData':
        result = updateData(parseRecordData(e.parameter));
        break;
        
      case 'deleteData':
        result = deleteData(e.parameter.id);
        break;
        
      case 'migrateData':
        result = migrateData(e.parameter.year, e.parameter.month);
        break;
        
      case 'getYearSheets':
        result = getYearSheets();
        break;
        
      case 'createYearSheet':
        result = createYearSheet(e.parameter.year);
        break;
        
      case 'restoreMigration':
        result = restoreMigration(e.parameter.year, e.parameter.month);
        break;
        
      default:
        result = { success: false, message: 'Acción no reconocida: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Parser de datos del record
function parseRecordData(params) {
  return {
    id: params.id || null,
    fecha: params.fecha,
    hora: params.hora,
    jornada: params.jornada,
    dia: params.dia,
    temperatura: parseFloat(params.temperatura),
    humedad: parseInt(params.humedad),
    persona: params.persona,
    observaciones: params.observaciones || ''
  };
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES DE FORMATO
// ═══════════════════════════════════════════════════════════════════

function formatDate(dateValue) {
  if (!dateValue) return '';
  
  try {
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }
    
    let date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      const baseDate = new Date(1899, 11, 30);
      date = new Date(baseDate.getTime() + dateValue * 24 * 60 * 60 * 1000);
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
    
  } catch (error) {
    Logger.log('Error formateando fecha: ' + error);
    return '';
  }
}

function formatTime(timeValue) {
  if (!timeValue && timeValue !== 0) return '';
  
  try {
    if (typeof timeValue === 'string' && timeValue.match(/^\d{1,2}:\d{2}$/)) {
      const parts = timeValue.split(':');
      return String(parts[0]).padStart(2, '0') + ':' + String(parts[1]).padStart(2, '0');
    }
    
    if (timeValue instanceof Date) {
      const hours = String(timeValue.getHours()).padStart(2, '0');
      const minutes = String(timeValue.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    if (typeof timeValue === 'number') {
      const totalMinutes = Math.round(timeValue * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
    }
    
    if (typeof timeValue === 'string') {
      const date = new Date(timeValue);
      if (!isNaN(date.getTime())) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    }
    
    return String(timeValue);
    
  } catch (error) {
    Logger.log('Error formateando hora: ' + error);
    return '';
  }
}

function formatHumidity(humidityValue) {
  if (!humidityValue && humidityValue !== 0) return '0';
  
  try {
    if (typeof humidityValue === 'string') {
      return humidityValue.replace('%', '').trim();
    }
    
    if (typeof humidityValue === 'number') {
      if (humidityValue < 1 && humidityValue > 0) {
        return String(Math.round(humidityValue * 100));
      } else if (humidityValue >= 1 && humidityValue <= 100) {
        return String(Math.round(humidityValue));
      } else if (humidityValue > 100) {
        return String(Math.round(humidityValue / 100));
      }
    }
    
    return String(Math.round(parseFloat(humidityValue) || 0));
    
  } catch (error) {
    Logger.log('Error formateando humedad: ' + error);
    return '0';
  }
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES CRUD
// ═══════════════════════════════════════════════════════════════════

function getData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_BASE);
    
    if (!sheet) {
      throw new Error('Hoja BASE no encontrada');
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    
    return data.map(row => ({
      id: row[0],
      fecha: formatDate(row[1]),
      hora: formatTime(row[2]),
      jornada: row[3],
      dia: row[4],
      temperatura: parseFloat(row[5]) || 0,
      humedad: formatHumidity(row[6]),
      persona: row[7],
      observaciones: row[8] || ''
    }));
    
  } catch (error) {
    Logger.log('Error en getData: ' + error);
    throw new Error('Error al obtener datos: ' + error.message);
  }
}

function createData(recordData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_BASE);
    
    const lastRow = sheet.getLastRow();
    const newId = lastRow > 1 ? sheet.getRange(lastRow, 1).getValue() + 1 : 1;
    
    const newRow = [
      newId,
      recordData.fecha,
      recordData.hora,
      recordData.jornada,
      recordData.dia,
      recordData.temperatura,
      recordData.humedad + '%',
      recordData.persona,
      recordData.observaciones || ''
    ];
    
    sheet.appendRow(newRow);
    
    const newRowIndex = lastRow + 1;
    sheet.getRange(newRowIndex, 2).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(newRowIndex, 3).setNumberFormat('hh:mm');
    sheet.getRange(newRowIndex, 6).setNumberFormat('0.0');
    sheet.getRange(newRowIndex, 7).setNumberFormat('0%');
    
    updateChart();
    
    return { success: true, id: newId };
  } catch (error) {
    Logger.log('Error en createData: ' + error);
    return { success: false, message: error.toString() };
  }
}

function updateData(recordData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_BASE);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == recordData.id) {
        sheet.getRange(i + 1, 2).setValue(recordData.fecha);
        sheet.getRange(i + 1, 3).setValue(recordData.hora);
        sheet.getRange(i + 1, 4).setValue(recordData.jornada);
        sheet.getRange(i + 1, 5).setValue(recordData.dia);
        sheet.getRange(i + 1, 6).setValue(recordData.temperatura);
        sheet.getRange(i + 1, 7).setValue(recordData.humedad + '%');
        sheet.getRange(i + 1, 8).setValue(recordData.persona);
        sheet.getRange(i + 1, 9).setValue(recordData.observaciones || '');
        
        sheet.getRange(i + 1, 2).setNumberFormat('yyyy-mm-dd');
        sheet.getRange(i + 1, 3).setNumberFormat('hh:mm');
        sheet.getRange(i + 1, 6).setNumberFormat('0.0');
        sheet.getRange(i + 1, 7).setNumberFormat('0%');
        
        updateChart();
        return { success: true };
      }
    }
    
    return { success: false, message: 'Registro no encontrado' };
  } catch (error) {
    Logger.log('Error en updateData: ' + error);
    return { success: false, message: error.toString() };
  }
}

function deleteData(id) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_BASE);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        sheet.deleteRow(i + 1);
        updateChart();
        return { success: true };
      }
    }
    
    return { success: false, message: 'Registro no encontrado' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES DE GRÁFICOS
// ═══════════════════════════════════════════════════════════════════

function getGraficoData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_BASE);
    
    if (!sheet) {
      throw new Error('Hoja BASE no encontrada');
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return {
        success: true,
        data: [],
        message: 'No hay datos disponibles'
      };
    }
    
    const rowCount = Math.min(24, lastRow - 1);
    const startRow = lastRow - rowCount + 1;
    
    const data = sheet.getRange(startRow, 1, rowCount, 9).getValues();
    
    const formattedData = data.map(row => ({
      id: row[0],
      fecha: formatDate(row[1]),
      hora: formatTime(row[2]),
      jornada: row[3],
      dia: row[4],
      temperatura: parseFloat(row[5]) || 0,
      humedad: parseInt(formatHumidity(row[6])) || 0,
      persona: row[7],
      observaciones: row[8] || ''
    }));
    
    return {
      success: true,
      data: formattedData,
      lastUpdated: new Date().toISOString(),
      recordCount: formattedData.length
    };
    
  } catch (error) {
    Logger.log('Error en getGraficoData: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

function updateChart() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const baseSheet = ss.getSheetByName(SHEET_BASE);
    
    // Buscar o crear la hoja GRAFICO
    let graficoSheet = ss.getSheetByName(SHEET_GRAFICO);
    
    if (!graficoSheet) {
      // Si no existe, crearla
      graficoSheet = ss.insertSheet(SHEET_GRAFICO);
      
      // Copiar encabezados de BASE
      const headers = baseSheet.getRange(1, 1, 1, 9).getValues();
      graficoSheet.getRange(1, 1, 1, 9).setValues(headers);
      
      // Aplicar formato a encabezados
      const headerRange = graficoSheet.getRange(1, 1, 1, 9);
      headerRange.setBackground('#667eea');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      Logger.log('✅ Hoja GRAFICO creada exitosamente');
    }
    
    // Limpiar solo los datos (mantener encabezados)
    const lastRow = graficoSheet.getLastRow();
    if (lastRow > 1) {
      graficoSheet.deleteRows(2, lastRow - 1);
    }
    
    // Obtener datos de BASE
    const baseLastRow = baseSheet.getLastRow();
    if (baseLastRow > 1) {
      const data = baseSheet.getRange(2, 1, baseLastRow - 1, 9).getValues();
      
      // Insertar datos en GRAFICO
      if (data.length > 0) {
        graficoSheet.getRange(2, 1, data.length, 9).setValues(data);
        
        // Aplicar formatos
        graficoSheet.getRange(2, 2, data.length, 1).setNumberFormat('yyyy-mm-dd');  // Fecha
        graficoSheet.getRange(2, 3, data.length, 1).setNumberFormat('hh:mm');        // Hora
        graficoSheet.getRange(2, 6, data.length, 1).setNumberFormat('0.0');          // Temperatura
        graficoSheet.getRange(2, 7, data.length, 1).setNumberFormat('0%');           // Humedad
      }
    }
    
    Logger.log('✅ Hoja GRAFICO actualizada con ' + (baseLastRow - 1) + ' registros');
    return { success: true };
    
  } catch (error) {
    Logger.log('❌ Error al actualizar gráfico: ' + error.message);
    return { success: false, message: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES DE MIGRACIÓN
// ═══════════════════════════════════════════════════════════════════

function migrateData(year, month) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const baseSheet = ss.getSheetByName(SHEET_BASE);
    
    let yearSheet = ss.getSheetByName(year);
    if (!yearSheet) {
      yearSheet = ss.insertSheet(year);
      yearSheet.appendRow(['MES', 'ID', 'FECHA', 'HORA', 'JORNADA', 'DIA', 'TEMPERATURA', 'HUMEDAD', 'PERSONA', 'OBSERVACIONES']);
    }
    
    const lastRow = baseSheet.getLastRow();
    if (lastRow <= 1) {
      return { success: false, message: 'No hay datos para migrar' };
    }
    
    const data = baseSheet.getRange(2, 1, lastRow - 1, 9).getValues();
    
    data.forEach(row => {
      const newRow = [
        month,
        row[0],
        formatDate(row[1]),
        formatTime(row[2]),
        row[3],
        row[4],
        row[5],
        formatHumidity(row[6]),
        row[7],
        row[8]
      ];
      yearSheet.appendRow(newRow);
    });
    
    if (lastRow > 1) {
      baseSheet.deleteRows(2, lastRow - 1);
    }
    
    // Actualizar hoja GRAFICO también
    updateChart();
    
    return { success: true, message: 'Datos migrados a ' + month + ' ' + year };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function restoreMigration(year, month) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yearSheet = ss.getSheetByName(year);
    
    if (!yearSheet) {
      return {
        success: false,
        message: `La hoja "${year}" no existe`
      };
    }
    
    const baseSheet = ss.getSheetByName(SHEET_BASE);
    if (!baseSheet) {
      return {
        success: false,
        message: 'La hoja BASE no existe'
      };
    }
    
    const lastRow = yearSheet.getLastRow();
    if (lastRow <= 1) {
      return {
        success: false,
        message: `No hay datos en la hoja "${year}"`
      };
    }
    
    const data = yearSheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const monthData = data.filter(row => row[0] === month);
    
    if (monthData.length === 0) {
      return {
        success: false,
        message: `No hay datos para ${month} en ${year}`
      };
    }
    
    const baseLastRow = baseSheet.getLastRow();
    let nextId = 1;
    if (baseLastRow > 1) {
      nextId = baseSheet.getRange(baseLastRow, 1).getValue() + 1;
    }
    
    const restoredData = monthData.map(row => {
      return [
        nextId++,
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7] + '%',
        row[8],
        row[9]
      ];
    });
    
    if (restoredData.length > 0) {
      baseSheet.getRange(baseLastRow + 1, 1, restoredData.length, 9).setValues(restoredData);
      
      const startRow = baseLastRow + 1;
      baseSheet.getRange(startRow, 2, restoredData.length, 1).setNumberFormat('yyyy-mm-dd');
      baseSheet.getRange(startRow, 3, restoredData.length, 1).setNumberFormat('hh:mm');
      baseSheet.getRange(startRow, 6, restoredData.length, 1).setNumberFormat('0.0');
      baseSheet.getRange(startRow, 7, restoredData.length, 1).setNumberFormat('0%');
    }
    
    const rowsToDelete = [];
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i][0] === month) {
        rowsToDelete.push(i + 2);
      }
    }
    
    rowsToDelete.forEach(rowIndex => {
      yearSheet.deleteRow(rowIndex);
    });
    
    updateChart();
    
    return {
      success: true,
      message: `${restoredData.length} registros de ${month} ${year} restaurados a BASE`,
      recordsRestored: restoredData.length
    };
    
  } catch (error) {
    Logger.log('Error en restoreMigration: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

function getHistoricalData(year) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(year);
    
    if (!sheet) return [];
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    
    return data.map(row => ({
      mes: row[0],
      id: row[1],
      fecha: formatDate(row[2]),
      hora: formatTime(row[3]),
      jornada: row[4],
      dia: row[5],
      temperatura: parseFloat(row[6]),
      humedad: formatHumidity(row[7]),
      persona: row[8],
      observaciones: row[9]
    }));
  } catch (error) {
    throw new Error('Error al obtener datos históricos: ' + error.message);
  }
}

function getAllHistoricalData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const historicalData = {};
    
    const sheets = ss.getSheets();
    sheets.forEach(sheet => {
      const name = sheet.getName();
      if (/^\d{4}$/.test(name)) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
          
          historicalData[name] = {};
          
          data.forEach(row => {
            const month = row[0];
            if (!historicalData[name][month]) {
              historicalData[name][month] = [];
            }
            
            historicalData[name][month].push({
              id: row[1],
              fecha: formatDate(row[2]),
              hora: formatTime(row[3]),
              jornada: row[4],
              dia: row[5],
              temperatura: parseFloat(row[6]),
              humedad: formatHumidity(row[7]),
              persona: row[8],
              observaciones: row[9]
            });
          });
        }
      }
    });
    
    return { success: true, data: historicalData };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getYearSheets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const yearSheets = [];
    
    sheets.forEach(sheet => {
      const name = sheet.getName();
      if (/^\d{4}$/.test(name)) {
        const lastRow = sheet.getLastRow();
        const records = lastRow > 1 ? lastRow - 1 : 0;
        
        let months = 0;
        if (lastRow > 1) {
          const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
          const uniqueMonths = new Set(data.map(row => row[0]));
          months = uniqueMonths.size;
        }
        
        yearSheets.push({
          year: name,
          gid: sheet.getSheetId(),
          months: months,
          records: records,
          lastUpdate: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'),
          active: name === new Date().getFullYear().toString()
        });
      }
    });
    
    return { success: true, data: yearSheets };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function createYearSheet(year) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    let sheet = ss.getSheetByName(year);
    if (sheet) {
      return { success: false, message: 'La hoja ya existe' };
    }
    
    sheet = ss.insertSheet(year);
    sheet.appendRow(['MES', 'ID', 'FECHA', 'HORA', 'JORNADA', 'DIA', 'TEMPERATURA', 'HUMEDAD', 'PERSONA', 'OBSERVACIONES']);
    
    const headerRange = sheet.getRange(1, 1, 1, 10);
    headerRange.setBackground('#667eea');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    
    return { success: true, gid: sheet.getSheetId() };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function generateDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const baseSheet = ss.getSheetByName(SHEET_BASE);
    
    const lastRow = baseSheet.getLastRow();
    if (lastRow <= 1) {
      return getEmptyDashboard();
    }
    
    const data = baseSheet.getRange(2, 1, lastRow - 1, 9).getValues();
    
    let tempSum = 0;
    let humiditySum = 0;
    let tempValues = [];
    let humidityValues = [];
    
    data.forEach(row => {
      const temp = parseFloat(row[5]);
      const humidity = parseInt(formatHumidity(row[6]));
      
      if (!isNaN(temp)) {
        tempSum += temp;
        tempValues.push(temp);
      }
      
      if (!isNaN(humidity)) {
        humiditySum += humidity;
        humidityValues.push(humidity);
      }
    });
    
    const tempAvg = tempValues.length > 0 ? tempSum / tempValues.length : 0;
    const humidityAvg = humidityValues.length > 0 ? humiditySum / humidityValues.length : 0;
    
    let tempAnalysis = 'Normal';
    if (tempAvg < 15) tempAnalysis = 'Temperatura Baja';
    else if (tempAvg > 25) tempAnalysis = 'Temperatura Alta';
    
    let humidityAnalysis = 'Normal';
    if (humidityAvg < 40) humidityAnalysis = 'Humedad Baja';
    else if (humidityAvg > 70) humidityAnalysis = 'Humedad Alta';
    
    const yearTempAvg = calculateYearlyAverage('temperatura');
    const yearHumidityAvg = calculateYearlyAverage('humedad');
    
    const lastRecord = data.length > 0 ? formatDate(data[data.length - 1][1]) : 'N/A';
    
    return {
      tempAvg: tempAvg,
      tempSum: tempSum,
      tempAnalysis: tempAnalysis,
      humidityAvg: humidityAvg,
      humiditySum: humiditySum,
      humidityAnalysis: humidityAnalysis,
      yearTempAvg: yearTempAvg,
      yearHumidityAvg: yearHumidityAvg,
      totalRecords: data.length,
      lastRecord: lastRecord
    };
  } catch (error) {
    throw new Error('Error al generar dashboard: ' + error.message);
  }
}

function calculateYearlyAverage(type) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const currentYear = new Date().getFullYear().toString();
    const yearSheet = ss.getSheetByName(currentYear);
    
    if (!yearSheet) return 0;
    
    const lastRow = yearSheet.getLastRow();
    if (lastRow <= 1) return 0;
    
    const colIndex = type === 'temperatura' ? 7 : 8;
    const values = yearSheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
    
    let sum = 0;
    let count = 0;
    
    values.forEach(row => {
      const value = type === 'humedad' ? 
        parseInt(formatHumidity(row[0])) : 
        parseFloat(row[0]);
      
      if (!isNaN(value)) {
        sum += value;
        count++;
      }
    });
    
    return count > 0 ? sum / count : 0;
  } catch (error) {
    return 0;
  }
}

function getEmptyDashboard() {
  return {
    tempAvg: 0,
    tempSum: 0,
    tempAnalysis: 'Sin datos',
    humidityAvg: 0,
    humiditySum: 0,
    humidityAnalysis: 'Sin datos',
    yearTempAvg: 0,
    yearHumidityAvg: 0,
    totalRecords: 0,
    lastRecord: 'N/A'
  };
}
