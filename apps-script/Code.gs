// ═══════════════════════════════════════════════════════════════════
//  SISTEMA DE CONTROL DE TEMPERATURA Y HUMEDAD - BACKEND
//  Versión: 1.6.0 - NUEVA ESTRUCTURA 10 COLUMNAS (ID oculto)
//  Columnas: ID, No.HC, Fecha, Hora, Jornada, Día, Temp, Hum, Persona, Obs
// ═══════════════════════════════════════════════════════════════════

const SPREADSHEET_ID = '1YRAztDSETnV5GcsPhtfrvKM-8k922XxzUcLHiLHwBcI';
const SHEET_BASE      = 'BASE';
const SHEET_GRAFICO   = 'GRAFICO';
const SHEET_HISTORIAL = 'HISTORIAL_BACKEND';

// ── Manejador principal ───────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action || '';
    let result = {};

    switch (action) {
      case 'test': 
        result = { success: true, message: 'Conexión exitosa' };
        break;

      case 'getData':
      case 'getGraficoData':
        result = { success: true, data: getData() };
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

      case 'getHistory':
        result = { success: true, data: getHistoryData() };
        break;

      case 'restoreRecord':
        result = restoreRecord(e.parameter.id, e.parameter.data);
        break;

      case 'superUndo':
        result = superUndo(e.parameter.tipoAccion, e.parameter.datosJSON);
        break;

      case 'generateDashboard':
        result = { success: true, data: generateDashboardData() };
        break;

      case 'getHistoricalData':
        result = { success: true, data: getHistoricalData(e.parameter.year) };
        break;

      case 'getAllHistoricalData':
        result = { success: true, data: getAllHistoricalData() };
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
        result = { success: false, message: 'Acción desconocida: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error en doGet: ' + error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message || 'Error interno del servidor'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Parser de parámetros entrantes ────────────────────────────────
function parseRecordData(params) {
  return {
    id:            params.id || null,
    no_hc:         params.no_hc || '',
    fecha:         params.fecha || '',
    hora:          params.hora || '',
    jornada:       params.jornada || '',
    dia:           params.dia || '',
    temperatura:   parseFloat(params.temperatura) || 0,
    humedad:       parseFloat(params.humedad) || 0,
    persona:       params.persona || '',
    observaciones: params.observaciones || ''
  };
}

// ── CRUD (10 columnas: ID, No.HC, Fecha, Hora, Jornada, Día, Temp, Hum, Persona, Obs) ──
function getData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_BASE);
  if (!sheet) throw new Error('Hoja BASE no existe');

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  return data.map(row => ({
    id:            row[0],
    no_hc:         row[1] || '',
    fecha:         formatDate(row[2]),
    hora:          formatTime(row[3]),
    jornada:       row[4] || '',
    dia:           row[5] || '',
    temperatura:   parseFloat(row[6]) || 0,
   humedad: (() => {
        let h = parseFloat(String(row[7]).replace('%', '').trim());
        if (!isNaN(h) && h > 0 && h < 1) h = Math.round(h * 100);
        return Math.round(h) || 0;
    })(),
    persona:       row[8] || '',
    observaciones: row[9] || ''
  }));
}

function createData(record) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_BASE);

  // Calcular siguiente ID
  const values = sheet.getRange("A:A").getValues();
  let maxId = 0;
  for (let i = 1; i < values.length; i++) {
    const cid = parseInt(values[i][0]);
    if (!isNaN(cid) && cid > maxId) maxId = cid;
  }
  const newId = maxId + 1;

  const humFormatted = Math.round(record.humedad) + '%';

  sheet.appendRow([
    newId,
    record.no_hc,
    record.fecha,
    record.hora,
    record.jornada,
    record.dia,
    record.temperatura,
    humFormatted,
    record.persona,
    record.observaciones
  ]);

  applyRowFormats(sheet, sheet.getLastRow());
  updateChart();
  return { success: true, id: newId };
}

function updateData(record) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_BASE);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(record.id)) {
      const rowNum = i + 1;
      const humFormatted = Math.round(record.humedad) + '%';

      sheet.getRange(rowNum, 2, 1, 9).setValues([[
        record.no_hc,
        record.fecha,
        record.hora,
        record.jornada,
        record.dia,
        record.temperatura,
        humFormatted,
        record.persona,
        record.observaciones
      ]]);

      applyRowFormats(sheet, rowNum);
      updateChart();
      return { success: true };
    }
  }
  return { success: false, message: 'Registro no encontrado' };
}

function deleteData(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_BASE);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      const registro = {
        id: data[i][0],
        no_hc: data[i][1],
        fecha: formatDate(data[i][2]),
        hora: formatTime(data[i][3]),
        jornada: data[i][4],
        dia: data[i][5],
        temperatura: data[i][6],
        humedad: String(data[i][7]).replace('%', '').trim(),
        persona: data[i][8],
        observaciones: data[i][9]
      };

      registrarCambio('ELIMINACIÓN', registro);

      sheet.deleteRow(i + 1);
      updateChart();
      return { success: true };
    }
  }
  return { success: false, message: 'ID no encontrado' };
}

// ── Historial y Undo ──────────────────────────────────────────────
function registrarCambio(accion, datos) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_HISTORIAL);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_HISTORIAL);
    sheet.appendRow(['Fecha', 'Hora', 'Acción', 'Datos JSON', 'Usuario']);
  }

  const now = new Date();
  sheet.appendRow([
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
    accion,
    JSON.stringify(datos),
    Session.getActiveUser().getEmail() || 'Anónimo'
  ]);
}

function getHistoryData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_HISTORIAL);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // Extraer las últimas 30 acciones
  // Extraer las últimas 200 acciones (cubre ~2 días de actividad)
  const startRow = Math.max(2, lastRow - 199);
  const data = sheet.getRange(startRow, 1, (lastRow - startRow + 1), 5).getValues();

  return data.reverse().map(row => {
    let details = {};
    try { details = JSON.parse(row[3]); } catch(e) { details = {}; }
    
    return {
      fecha: formatDate(row[0]),
      hora: row[1],
      accion: row[2],
      usuario: row[4],
      fullData: details
    };
  });
}

function restoreRecord(id, jsonData) {
  try {
    const record = JSON.parse(jsonData);
    const humFormatted = Math.round(record.humedad) + '%';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_BASE);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        const rowNum = i + 1;
        sheet.getRange(rowNum, 2, 1, 9).setValues([[
          record.no_hc,
          record.fecha,
          record.hora,
          record.jornada,
          record.dia,
          record.temperatura,
          humFormatted,
          record.persona,
          record.observaciones
        ]]);
        applyRowFormats(sheet, rowNum);
        updateChart();
        return { success: true, message: 'Registro restaurado' };
      }
    }
    return { success: false, message: 'ID no encontrado' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function superUndo(tipoAccion, datosJSON) {
  try {
    const datos = JSON.parse(datosJSON);
    if (tipoAccion === 'ELIMINACIÓN') {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(SHEET_BASE);
      sheet.appendRow([
        datos.id,
        datos.no_hc,
        datos.fecha,
        datos.hora,
        datos.jornada,
        datos.dia,
        datos.temperatura,
        Math.round(datos.humedad) + '%',
        datos.persona,
        datos.observaciones
      ]);
      applyRowFormats(sheet, sheet.getLastRow());
      updateChart();
      return { success: true, message: 'Registro restaurado desde eliminación' };
    }
    return { success: false, message: 'Tipo de undo no soportado' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ── Migración y Históricos (del código antiguo) ───────────────────
function migrateData(year, month) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const base = ss.getSheetByName(SHEET_BASE);
  const lastRow = base.getLastRow();
  if (lastRow <= 1) return { success: false, message: 'No hay datos para migrar' };

  const data = base.getRange(2, 1, lastRow - 1, 10).getValues();

  // Respaldo completo
  registrarCambio('MIGRACIÓN', data);

  let yearSheet = ss.getSheetByName(year);
  if (!yearSheet) {
    yearSheet = ss.insertSheet(year);
    yearSheet.appendRow(['MES','ID','No.HC','FECHA','HORA','JORNADA','DIA','TEMPERATURA','HUMEDAD','PERSONA','OBSERVACIONES']);
  }

  data.forEach(row => {
    yearSheet.appendRow([month, ...row]);
  });

  if (lastRow > 1) {
    base.deleteRows(2, lastRow - 1);
  }

  updateChart();
  return { success: true, message: `Migrados ${data.length} registros a ${month}/${year}` };
}

function restoreMigration(year, month) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yearSheet = ss.getSheetByName(year);
    
    if (!yearSheet) {
      return { success: false, message: `La hoja "${year}" no existe` };
    }
    
    const baseSheet = ss.getSheetByName(SHEET_BASE);
    if (!baseSheet) {
      return { success: false, message: 'La hoja BASE no existe' };
    }
    
    const lastRow = yearSheet.getLastRow();
    if (lastRow <= 1) {
      return { success: false, message: `No hay datos en la hoja "${year}"` };
    }
    
    const data = yearSheet.getRange(2, 1, lastRow - 1, 11).getValues();
    const monthData = data.filter(row => row[0] === month);
    
    if (monthData.length === 0) {
      return { success: false, message: `No hay datos para ${month} en ${year}` };
    }
    
    const baseLastRow = baseSheet.getLastRow();
    let nextId = 1;
    if (baseLastRow > 1) {
      nextId = baseSheet.getRange(baseLastRow, 1).getValue() + 1;
    }
    
    const restoredData = monthData.map(row => {
      return [
        nextId++,
        row[2], // No.HC
        row[3], // Fecha
        row[4], // Hora
        row[5], // Jornada
        row[6], // Día
        row[7], // Temp
        row[8] + '%', // Hum
        row[9], // Persona
        row[10] // Obs
      ];
    });
    
    if (restoredData.length > 0) {
      baseSheet.getRange(baseLastRow + 1, 1, restoredData.length, 10).setValues(restoredData);
      
      const startRow = baseLastRow + 1;
      baseSheet.getRange(startRow, 3, restoredData.length, 1).setNumberFormat('yyyy-mm-dd');
      baseSheet.getRange(startRow, 4, restoredData.length, 1).setNumberFormat('hh:mm');
      baseSheet.getRange(startRow, 7, restoredData.length, 1).setNumberFormat('0.0');
      baseSheet.getRange(startRow, 8, restoredData.length, 1).setNumberFormat('0%');
    }
    
    updateChart();
    return {
      success: true,
      message: `${restoredData.length} registros restaurados`,
      recordsRestored: restoredData.length
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getHistoricalData(year) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(year);
    
    if (!sheet) return [];
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    
return data.map(row => ({
      mes:           row[0]  || '',
      id:            row[1]  || '',
      no_hc:         row[2]  || '',
      fecha:         formatDate(row[3]),
      hora:          formatTime(row[4]),
      jornada:       row[5]  || '',
      dia:           row[6]  || '',
      temperatura:   parseFloat(row[7]) || 0,
      humedad: (() => {
        let h = parseFloat(String(row[8]).replace('%','').trim());
        if (!isNaN(h) && h > 0 && h < 1) h = Math.round(h * 100);
        return Math.round(h) || 0;
      })(),
      persona:       row[9]  || '',
      observaciones: row[10] || ''
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
          const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
          
          historicalData[name] = {};
          
          data.forEach(row => {
            const month = row[0];
            if (!historicalData[name][month]) {
              historicalData[name][month] = [];
            }
            
            historicalData[name][month].push({
              id: row[1],
              no_hc: row[2],
              fecha: formatDate(row[3]),
              hora: formatTime(row[4]),
              jornada: row[5],
              dia: row[6],
              temperatura: parseFloat(row[7]),
              humedad: String(row[8]).replace('%', '').trim(),
              persona: row[9],
              observaciones: row[10]
            });
          });
        }
      }
    });
    
    return historicalData;
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
    sheet.appendRow(['MES', 'ID', 'No.HC', 'FECHA', 'HORA', 'JORNADA', 'DIA', 'TEMPERATURA', 'HUMEDAD', 'PERSONA', 'OBSERVACIONES']);
    
    const headerRange = sheet.getRange(1, 1, 1, 11);
    headerRange.setBackground('#667eea');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    
    return { success: true, gid: sheet.getSheetId() };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ── Gráficos y formatos ───────────────────────────────────────────
function updateChart() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const base = ss.getSheetByName(SHEET_BASE);
  let grafico = ss.getSheetByName(SHEET_GRAFICO);

  if (!grafico) {
    grafico = ss.insertSheet(SHEET_GRAFICO);
    const headers = base.getRange(1,1,1,10).getValues();
    grafico.getRange(1,1,1,10).setValues(headers);
    grafico.getRange(1,1,1,10)
      .setBackground('#2563eb')
      .setFontColor('white')
      .setFontWeight('bold');
  }

  grafico.clearContents();
  const headers = base.getRange(1,1,1,10).getValues();
  grafico.getRange(1,1,1,10).setValues(headers);

  const lastRow = base.getLastRow();
  if (lastRow > 1) {
    const data = base.getRange(2,1,lastRow-1,10).getValues();
    grafico.getRange(2,1,data.length,10).setValues(data);
    applyTableFormats(grafico, 2, data.length);
  }
}

function applyRowFormats(sheet, row) {
  sheet.getRange(row, 3).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(row, 4).setNumberFormat('hh:mm');
  sheet.getRange(row, 7).setNumberFormat('0.0');
  sheet.getRange(row, 8).setNumberFormat('@STRING@');    // ← humedad es texto "75%"
}

function applyTableFormats(sheet, startRow, numRows) {
  if (numRows < 1) return;
  sheet.getRange(startRow, 3, numRows, 1).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(startRow, 4, numRows, 1).setNumberFormat('hh:mm');
  sheet.getRange(startRow, 7, numRows, 1).setNumberFormat('0.0');
  sheet.getRange(startRow, 8, numRows, 1).setNumberFormat('@STRING@'); // ← ídem
}

// ── Dashboard ─────────────────────────────────────────────────────
function generateDashboardData() {
  const records = getData();

  const empty = {
    totalRecords: 0,
    tempAvg: 0, tempSum: 0, tempAnalysis: 'Sin datos',
    humidityAvg: 0, humiditySum: 0, humidityAnalysis: 'Sin datos',
    yearTempAvg: 0, yearHumidityAvg: 0,
    lastRecord: 'N/A'
  };

  if (!records.length) return empty;

  // ── USA TODOS LOS REGISTROS DE BASE (sin filtrar por mes) ─────
  const temps = records
    .map(r => parseFloat(r.temperatura))
    .filter(v => !isNaN(v) && v > 0);

  const hums = records
    .map(r => {
      let h = parseFloat(String(r.humedad).replace('%','').trim());
      if (!isNaN(h) && h > 0 && h < 1) h = Math.round(h * 100);
      return h;
    })
    .filter(v => !isNaN(v) && v > 0);

  const tempSum = temps.reduce((a,b) => a+b, 0);
  const humSum  = hums.reduce((a,b) => a+b, 0);
  const tempAvg = temps.length ? tempSum / temps.length : 0;
  const humAvg  = hums.length  ? humSum  / hums.length  : 0;

  // ── Promedios anuales = mismos datos base ─────────────────────
  const lastRecord = records[records.length - 1]?.fecha || 'N/A';

  return {
    totalRecords:     records.length,
    tempAvg:          Math.round(tempAvg * 10) / 10,
    tempSum:          Math.round(tempSum * 10) / 10,
    tempAnalysis:     tempAvg > 25 ? 'Alta' : tempAvg < 15 ? 'Baja' : 'Normal',
    humidityAvg:      Math.round(humAvg),
    humiditySum:      Math.round(humSum),
    humidityAnalysis: humAvg > 70 ? 'Alta' : humAvg < 40 ? 'Baja' : 'Normal',
    yearTempAvg:      Math.round(tempAvg * 10) / 10,
    yearHumidityAvg:  Math.round(humAvg),
    lastRecord:       lastRecord
  };
}

// ── Utilidades de formato (mejoradas del código antiguo) ──────────
function formatDate(value) {
  if (!value) return '';
  try {
    const date = (value instanceof Date) ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } catch (e) {
    return '';
  }
}

function formatTime(value) {
  if (!value && value !== 0) return '';
  try {
    const date = (value instanceof Date) ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm');
  } catch (e) {
    return String(value);
  }
}
