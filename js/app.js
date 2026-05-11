// ═══════════════════════════════════════════════════════════════════
//  SISTEMA DE CONTROL DE TEMPERATURA Y HUMEDAD
//  JavaScript Principal - CRUD Operations
//  Versión: 1.3.0
//  Ajustes:
//  - Día debe coincidir con Fecha.
//  - Secuencia guiada por Día/Jornada.
//  - HC se calcula con base en el HC anterior real, evitando repetidos.
//  - Alerta visible por encima del modal.
//  - Persona guiada por lista.
//  - Edición masiva validada.
// ═══════════════════════════════════════════════════════════════════


// Variables globales
let SCRIPT_URL = '';
let currentData = [];
let historyStack = [];
let redoStack = [];
const MAX_HISTORY = 200;


// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE VALIDACIONES GUIADAS
// ═══════════════════════════════════════════════════════════════════

const JORNADAS_ORDEN = ['MAÑANA', 'TARDE'];

const PERSONAS_AUTORIZADAS = [
    'ANDRES DELGADO',
    'JUAN ACOSTA',
    'JOSE COLIMBA',
    'AMPARO LOPEZ',
    'MONICA MOJICA'
    
    // Agrega más personas aquí:
    // 'NOMBRE APELLIDO',
    // 'OTRA PERSONA'
];

const HORA_POR_JORNADA = {
    'MAÑANA': '08:00',
    'TARDE': '17:00'
};

const OBS_AUTOMATICA = 'Registro automático generado con promedio para completar cierre de mes';


// ═══════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    SCRIPT_URL = localStorage.getItem('scriptUrl');

    setupPersonaField();
    setupGuidedFieldListeners();

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

    setInterval(loadData, 300000);
});


// ═══════════════════════════════════════════════════════════════════
// UTILIDADES DE TEXTO, FECHAS Y SECUENCIA
// ═══════════════════════════════════════════════════════════════════

function normalizeText(value) {
    return String(value || '').trim().toUpperCase();
}

function normalizeJornada(value) {
    return normalizeText(value).replace('MANANA', 'MAÑANA');
}

function extractHCNumber(value) {
    const match = String(value || '').toUpperCase().match(/HC-?0*(\d+)/);
    return match ? Number(match[1]) : null;
}

function normalizeHC(value) {
    const number = extractHCNumber(value);
    return number === null ? String(value || '').trim().toUpperCase() : `HC-${number}`;
}

function formatHCNumber(number) {
    return `HC-${Number(number)}`;
}

function parseISODateParts(dateStr) {
    const value = String(dateStr || '').trim();
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return null;

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);

    const test = new Date(year, monthIndex, day);

    if (
        test.getFullYear() !== year ||
        test.getMonth() !== monthIndex ||
        test.getDate() !== day
    ) {
        return null;
    }

    return { year, monthIndex, day };
}

function toISODate(year, monthIndex, day) {
    const d = new Date(year, monthIndex, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function getDaysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

function monthLabel(year, monthIndex) {
    return `${String(monthIndex + 1).padStart(2, '0')}/${year}`;
}

function slotKey(day, jornada) {
    return `${Number(day)}|${normalizeJornada(jornada)}`;
}

function getSlotIndex(day, jornada) {
    return (Number(day) - 1) * 2 + (normalizeJornada(jornada) === 'MAÑANA' ? 0 : 1);
}

function getMonthRecords(year, monthIndex) {
    return currentData.filter(record => {
        const parts = parseISODateParts(record.fecha);
        return parts && parts.year === year && parts.monthIndex === monthIndex;
    });
}

function getMonthRecordsWithHC(year, monthIndex) {
    return getMonthRecords(year, monthIndex)
        .map(record => {
            const parts = parseISODateParts(record.fecha);
            const hcNumber = extractHCNumber(record.no_hc);

            if (!parts || hcNumber === null) return null;

            return {
                ...record,
                hcNumber,
                day: Number(record.dia),
                jornadaNorm: normalizeJornada(record.jornada),
                slotIndex: getSlotIndex(record.dia, record.jornada)
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.slotIndex - b.slotIndex);
}

function getNextUnusedHCNumber(preferredNumber, usedNumbers) {
    let number = Number(preferredNumber);

    if (!number || number < 1) number = 1;

    while (usedNumbers.has(number)) {
        number++;
    }

    return number;
}

function buildExpectedHC(day, jornada, year = null, monthIndex = null) {
    const targetDay = Number(day);
    const targetJornada = normalizeJornada(jornada);
    const targetSlotIndex = getSlotIndex(targetDay, targetJornada);

    // Fallback si no se conoce el mes/año
    if (year === null || monthIndex === null) {
        return formatHCNumber(targetSlotIndex + 1);
    }

    const monthRecords = getMonthRecordsWithHC(year, monthIndex);

    // Si ya existe el mismo Día + Jornada, conserva su HC.
    const sameSlot = monthRecords.find(record =>
        Number(record.day) === targetDay &&
        normalizeJornada(record.jornadaNorm) === targetJornada
    );

    if (sameSlot) {
        return formatHCNumber(sameSlot.hcNumber);
    }

    const usedNumbers = new Set(monthRecords.map(record => record.hcNumber));

    // Busca el registro anterior real más cercano.
    const previousRecords = monthRecords
        .filter(record => record.slotIndex < targetSlotIndex)
        .sort((a, b) => b.slotIndex - a.slotIndex);

    if (previousRecords.length > 0) {
        const previous = previousRecords[0];
        const distance = targetSlotIndex - previous.slotIndex;
        const preferred = previous.hcNumber + distance;
        return formatHCNumber(getNextUnusedHCNumber(preferred, usedNumbers));
    }

    // Si no hay anterior, busca el siguiente real y calcula hacia atrás.
    const nextRecords = monthRecords
        .filter(record => record.slotIndex > targetSlotIndex)
        .sort((a, b) => a.slotIndex - b.slotIndex);

    if (nextRecords.length > 0) {
        const next = nextRecords[0];
        const distance = next.slotIndex - targetSlotIndex;
        const preferred = next.hcNumber - distance;
        return formatHCNumber(getNextUnusedHCNumber(preferred, usedNumbers));
    }

    // Si el mes no tiene registros, inicia según la posición.
    return formatHCNumber(targetSlotIndex + 1);
}

function getExpectedSlotsForMonth(year, monthIndex, endDay = null, endJornada = 'TARDE') {
    const lastDay = getDaysInMonth(year, monthIndex);
    const maxDay = endDay ? Math.min(Number(endDay), lastDay) : lastDay;
    const maxIndex = getSlotIndex(maxDay, endJornada);
    const slots = [];

    for (let day = 1; day <= maxDay; day++) {
        for (const jornada of JORNADAS_ORDEN) {
            const index = getSlotIndex(day, jornada);
            if (index > maxIndex) continue;

            slots.push({
                day,
                dia: day,
                jornada,
                fecha: toISODate(year, monthIndex, day),
                no_hc: buildExpectedHC(day, jornada, year, monthIndex),
                hora: HORA_POR_JORNADA[jornada]
            });
        }
    }

    return slots;
}

function getMissingSlots(year, monthIndex, endDay = null, endJornada = 'TARDE') {
    const records = getMonthRecords(year, monthIndex);
    const existing = new Set(records.map(r => slotKey(r.dia, r.jornada)));

    return getExpectedSlotsForMonth(year, monthIndex, endDay, endJornada)
        .filter(slot => !existing.has(slotKey(slot.day, slot.jornada)));
}

function getAverageValues(records) {
    const temps = records
        .map(r => parseFloat(String(r.temperatura).replace('°C', '').trim()))
        .filter(v => !isNaN(v) && v > 0);

    const hums = records
        .map(r => {
            let h = parseFloat(String(r.humedad).replace('%', '').trim());
            if (!isNaN(h) && h > 0 && h < 1) h = h * 100;
            return h;
        })
        .filter(v => !isNaN(v) && v > 0);

    const tempDefault = typeof CONFIG !== 'undefined' && CONFIG.TEMP_OPTIMAL ? CONFIG.TEMP_OPTIMAL : 20;
    const humDefault = typeof CONFIG !== 'undefined' && CONFIG.HUMIDITY_OPTIMAL ? CONFIG.HUMIDITY_OPTIMAL : 55;

    const tempAvg = temps.length
        ? temps.reduce((a, b) => a + b, 0) / temps.length
        : tempDefault;

    const humAvg = hums.length
        ? hums.reduce((a, b) => a + b, 0) / hums.length
        : humDefault;

    return {
        temperatura: Math.round(tempAvg * 10) / 10,
        humedad: Math.round(humAvg)
    };
}

function getPreviousMonthParts(year, monthIndex) {
    const d = new Date(year, monthIndex, 0);
    return {
        year: d.getFullYear(),
        monthIndex: d.getMonth()
    };
}

function compareRecordSequence(a, b) {
    const dateCompare = String(a.fecha || '').localeCompare(String(b.fecha || ''));
    if (dateCompare !== 0) return dateCompare;

    return getSlotIndex(a.dia, a.jornada) - getSlotIndex(b.dia, b.jornada);
}

function getLatestRecordBySequence() {
    const validRecords = currentData
        .map(record => {
            const parts = parseISODateParts(record.fecha);
            if (!parts) return null;

            return {
                ...record,
                year: parts.year,
                monthIndex: parts.monthIndex,
                day: Number(record.dia),
                jornadaNorm: normalizeJornada(record.jornada),
                slotIndex: getSlotIndex(record.dia, record.jornada)
            };
        })
        .filter(Boolean);

    if (validRecords.length === 0) return null;

    validRecords.sort(compareRecordSequence);
    return validRecords[validRecords.length - 1];
}

function getNextGuidedSlot() {
    const latest = getLatestRecordBySequence();

    if (!latest) {
        const now = new Date();
        return {
            fecha: toISODate(now.getFullYear(), now.getMonth(), 1),
            day: 1,
            dia: 1,
            jornada: 'MAÑANA',
            hora: HORA_POR_JORNADA['MAÑANA'],
            no_hc: buildExpectedHC(1, 'MAÑANA', now.getFullYear(), now.getMonth()),
            aviso: 'Iniciando mes: debe empezar por Día 1, jornada MAÑANA.'
        };
    }

    const missingUntilLatest = getMissingSlots(
        latest.year,
        latest.monthIndex,
        latest.day,
        latest.jornadaNorm
    );

    if (missingUntilLatest.length > 0) {
        const first = missingUntilLatest[0];

        return {
            fecha: first.fecha,
            day: first.day,
            dia: first.day,
            jornada: first.jornada,
            hora: HORA_POR_JORNADA[first.jornada],
            no_hc: first.no_hc,
            aviso: `Primero tienes que diligenciar el Día ${first.day}, jornada ${first.jornada}, fecha ${formatDisplayDate(first.fecha)}, para poder seguir.`
        };
    }

    let nextYear = latest.year;
    let nextMonthIndex = latest.monthIndex;
    let nextDay = latest.day;
    let nextJornada = 'TARDE';

    if (latest.jornadaNorm === 'MAÑANA') {
        nextJornada = 'TARDE';
    } else {
        nextDay = latest.day + 1;
        nextJornada = 'MAÑANA';

        const lastDay = getDaysInMonth(latest.year, latest.monthIndex);

        if (nextDay > lastDay) {
            const nextDate = new Date(latest.year, latest.monthIndex + 1, 1);
            nextYear = nextDate.getFullYear();
            nextMonthIndex = nextDate.getMonth();
            nextDay = 1;
        }
    }

    const fecha = toISODate(nextYear, nextMonthIndex, nextDay);

    return {
        fecha,
        day: nextDay,
        dia: nextDay,
        jornada: nextJornada,
        hora: HORA_POR_JORNADA[nextJornada],
        no_hc: buildExpectedHC(nextDay, nextJornada, nextYear, nextMonthIndex),
        aviso: `Registro sugerido: Día ${nextDay}, jornada ${nextJornada}, fecha ${formatDisplayDate(fecha)}.`
    };
}

function hasDuplicateSlot(recordData) {
    const parts = parseISODateParts(recordData.fecha);
    if (!parts) return false;

    return currentData.some(record => {
        if (String(record.id || '') === String(recordData.id || '')) return false;

        const recordParts = parseISODateParts(record.fecha);
        if (!recordParts) return false;

        return (
            recordParts.year === parts.year &&
            recordParts.monthIndex === parts.monthIndex &&
            Number(record.dia) === Number(recordData.dia) &&
            normalizeJornada(record.jornada) === normalizeJornada(recordData.jornada)
        );
    });
}

function hasDuplicateHC(recordData) {
    const parts = parseISODateParts(recordData.fecha);
    const hcNumber = extractHCNumber(recordData.no_hc);

    if (!parts || hcNumber === null) return false;

    return currentData.some(record => {
        if (String(record.id || '') === String(recordData.id || '')) return false;

        const recordParts = parseISODateParts(record.fecha);
        const recordHC = extractHCNumber(record.no_hc);

        if (!recordParts || recordHC === null) return false;

        return (
            recordParts.year === parts.year &&
            recordParts.monthIndex === parts.monthIndex &&
            recordHC === hcNumber
        );
    });
}

function validateRecordBeforeSave(recordData, enforceSequence = true) {
    const parts = parseISODateParts(recordData.fecha);

    if (!parts) {
        return {
            ok: false,
            message: 'La fecha no es válida. Use una fecha real.'
        };
    }

    const dia = Number(recordData.dia);
    const jornada = normalizeJornada(recordData.jornada);
    const persona = normalizeText(recordData.persona);
    const temperatura = parseFloat(recordData.temperatura);
    let humedad = parseFloat(String(recordData.humedad).replace('%', '').trim());

    if (!Number.isInteger(dia) || dia < 1 || dia > getDaysInMonth(parts.year, parts.monthIndex)) {
        return {
            ok: false,
            message: `El día debe estar entre 1 y ${getDaysInMonth(parts.year, parts.monthIndex)} para el mes ${monthLabel(parts.year, parts.monthIndex)}.`
        };
    }

    if (dia !== parts.day) {
        const correctedHC = buildExpectedHC(parts.day, jornada, parts.year, parts.monthIndex);

        return {
            ok: false,
            message: `El Día no coincide con la Fecha. Fecha seleccionada: ${formatDisplayDate(recordData.fecha)}. El día correcto es ${parts.day}. Se ajustó automáticamente.`,
            suggestedSlot: {
                day: parts.day,
                dia: parts.day,
                jornada: jornada,
                fecha: recordData.fecha,
                hora: HORA_POR_JORNADA[jornada] || recordData.hora,
                no_hc: correctedHC
            }
        };
    }

    if (!JORNADAS_ORDEN.includes(jornada)) {
        return {
            ok: false,
            message: 'La jornada debe ser MAÑANA o TARDE.'
        };
    }

    if (!PERSONAS_AUTORIZADAS.includes(persona)) {
        return {
            ok: false,
            message: 'Seleccione una persona autorizada para realizar el registro.'
        };
    }

    if (isNaN(temperatura)) {
        return {
            ok: false,
            message: 'La temperatura debe ser un número válido.'
        };
    }

    if (!isNaN(humedad) && humedad > 0 && humedad < 1) humedad = humedad * 100;

    if (isNaN(humedad) || humedad < 0 || humedad > 100) {
        return {
            ok: false,
            message: 'La humedad debe ser un número entre 0 y 100.'
        };
    }

    const expectedHC = buildExpectedHC(dia, jornada, parts.year, parts.monthIndex);

    if (recordData.no_hc && normalizeHC(recordData.no_hc) !== normalizeHC(expectedHC)) {
        return {
            ok: false,
            message: `El No. HC no coincide con la secuencia. Para Día ${dia} ${jornada} debe ser ${expectedHC}. Se ajustó automáticamente.`,
            suggestedSlot: {
                day: dia,
                dia: dia,
                jornada: jornada,
                fecha: recordData.fecha,
                hora: HORA_POR_JORNADA[jornada],
                no_hc: expectedHC
            }
        };
    }

    if (hasDuplicateSlot(recordData)) {
        return {
            ok: false,
            message: `Ya existe un registro para el Día ${dia}, jornada ${jornada}, del mes ${monthLabel(parts.year, parts.monthIndex)}.`
        };
    }

    if (hasDuplicateHC(recordData)) {
        return {
            ok: false,
            message: `El No. HC ${recordData.no_hc} ya existe en este mes. Se ajustó automáticamente al siguiente disponible.`,
            suggestedSlot: {
                day: dia,
                dia: dia,
                jornada: jornada,
                fecha: recordData.fecha,
                hora: HORA_POR_JORNADA[jornada],
                no_hc: expectedHC
            }
        };
    }

    if (enforceSequence) {
        const selectedIndex = getSlotIndex(dia, jornada);

        const missingBefore = getMissingSlots(parts.year, parts.monthIndex, dia, jornada)
            .filter(slot => getSlotIndex(slot.day, slot.jornada) < selectedIndex);

        if (missingBefore.length > 0) {
            const first = missingBefore[0];

            return {
                ok: false,
                message: `Primero tienes que diligenciar el Día ${first.day}, jornada ${first.jornada}, fecha ${formatDisplayDate(first.fecha)}, para poder seguir. Se seleccionó automáticamente la secuencia correcta.`,
                suggestedSlot: {
                    day: first.day,
                    dia: first.day,
                    jornada: first.jornada,
                    fecha: first.fecha,
                    hora: HORA_POR_JORNADA[first.jornada],
                    no_hc: first.no_hc || buildExpectedHC(first.day, first.jornada, parts.year, parts.monthIndex)
                }
            };
        }
    }

    return { ok: true };
}

async function autoCompletePreviousMonthIfNeeded(recordData) {
    const parts = parseISODateParts(recordData.fecha);
    if (!parts) return 0;

    const previous = getPreviousMonthParts(parts.year, parts.monthIndex);
    const previousRecords = getMonthRecords(previous.year, previous.monthIndex);

    if (previousRecords.length === 0) return 0;

    const missing = getMissingSlots(previous.year, previous.monthIndex);

    if (missing.length === 0) return 0;

    const avg = getAverageValues(previousRecords);
    const persona = normalizeText(recordData.persona) || PERSONAS_AUTORIZADAS[0];

    for (const slot of missing) {
        await callAppsScript('createData', {
            no_hc: slot.no_hc,
            fecha: slot.fecha,
            hora: HORA_POR_JORNADA[slot.jornada],
            jornada: slot.jornada,
            dia: slot.day,
            temperatura: avg.temperatura,
            humedad: avg.humedad,
            persona: persona,
            observaciones: OBS_AUTOMATICA
        });
    }

    const refreshed = await callAppsScript('getData');
    if (refreshed.success) {
        currentData = refreshed.data;
        renderTable(currentData);
        populateHCSelect();
    }

    showAlert(
        `Se completaron ${missing.length} registros faltantes del mes ${monthLabel(previous.year, previous.monthIndex)} con datos promedio.`,
        'success'
    );

    return missing.length;
}


// ═══════════════════════════════════════════════════════════════════
// UI GUIADA
// ═══════════════════════════════════════════════════════════════════

function setupPersonaField() {
    const current = document.getElementById('persona');
    if (!current) return;

    let select = current;

    if (current.tagName !== 'SELECT') {
        select = document.createElement('select');
        select.id = current.id;
        select.name = current.name || current.id;
        select.className = current.className || 'form-control';
        select.required = current.required;
        current.replaceWith(select);
    }

    select.innerHTML = '<option value="">-- Seleccione persona --</option>' +
        PERSONAS_AUTORIZADAS
            .map(persona => `<option value="${escapeAttr(persona)}">${escapeHTML(persona)}</option>`)
            .join('');

    const lastPersona = localStorage.getItem('lastPersona') || PERSONAS_AUTORIZADAS[0];

    if (lastPersona && PERSONAS_AUTORIZADAS.includes(normalizeText(lastPersona))) {
        select.value = normalizeText(lastPersona);
    }
}

function setupGuidedFieldListeners() {
    const fecha = document.getElementById('fecha');
    const dia = document.getElementById('dia');
    const jornada = document.getElementById('jornada');
    const hora = document.getElementById('hora');
    const noHC = document.getElementById('no_hc');

    if (fecha) {
        fecha.addEventListener('change', function() {
            const parts = parseISODateParts(this.value);
            if (!parts) return;

            if (dia) dia.value = parts.day;
            updateGuidedHCAndHour();
        });
    }

    if (dia) {
        dia.addEventListener('change', function() {
            const parts = parseISODateParts(fecha?.value);

            if (!parts) {
                updateGuidedHCAndHour();
                return;
            }

            const selectedDay = Number(this.value);
            const lastDay = getDaysInMonth(parts.year, parts.monthIndex);

            if (selectedDay < 1 || selectedDay > lastDay) {
                this.value = parts.day;
                showAlert(`El mes ${monthLabel(parts.year, parts.monthIndex)} solo permite días entre 1 y ${lastDay}.`, 'warning');
                return;
            }

            fecha.value = toISODate(parts.year, parts.monthIndex, selectedDay);
            updateGuidedHCAndHour();
        });
    }

    if (jornada) {
        jornada.addEventListener('change', updateGuidedHCAndHour);
    }

    if (noHC) {
        noHC.addEventListener('change', function() {
            const expected = getExpectedHCFromForm();

            if (expected && normalizeHC(this.value) !== normalizeHC(expected)) {
                showAlert(`No. HC sugerido para esta fecha y jornada: ${expected}`, 'warning');
                this.value = expected;
            }
        });
    }

    if (hora) {
        hora.addEventListener('blur', function() {
            const j = normalizeJornada(jornada?.value);

            if (HORA_POR_JORNADA[j] && !this.value) {
                this.value = HORA_POR_JORNADA[j];
            }
        });
    }
}

function getExpectedHCFromForm() {
    const fecha = document.getElementById('fecha')?.value;
    const jornada = document.getElementById('jornada')?.value;
    const parts = parseISODateParts(fecha);

    if (!parts || !jornada) return '';

    return buildExpectedHC(parts.day, jornada, parts.year, parts.monthIndex);
}

function updateGuidedHCAndHour() {
    const fecha = document.getElementById('fecha');
    const dia = document.getElementById('dia');
    const jornada = document.getElementById('jornada');
    const hora = document.getElementById('hora');
    const noHC = document.getElementById('no_hc');

    const parts = parseISODateParts(fecha?.value);
    const jornadaValue = normalizeJornada(jornada?.value);

    if (parts && dia) {
        dia.value = parts.day;
    }

    if (jornadaValue && HORA_POR_JORNADA[jornadaValue] && hora) {
        hora.value = HORA_POR_JORNADA[jornadaValue];
    }

    if (parts && jornadaValue && noHC) {
        const expected = buildExpectedHC(parts.day, jornadaValue, parts.year, parts.monthIndex);
        ensureOption(noHC, expected);
        noHC.value = expected;
    }
}

function applyGuidedSlotToForm(slot, message = '') {
    if (!slot) return;

    const noHC = document.getElementById('no_hc');
    const fecha = document.getElementById('fecha');
    const hora = document.getElementById('hora');
    const jornada = document.getElementById('jornada');
    const dia = document.getElementById('dia');

    const slotDay = slot.day || slot.dia;
    const slotJornada = normalizeJornada(slot.jornada);

    let slotHC = slot.no_hc;

    if (!slotHC) {
        const parts = parseISODateParts(slot.fecha);
        slotHC = parts
            ? buildExpectedHC(slotDay, slotJornada, parts.year, parts.monthIndex)
            : buildExpectedHC(slotDay, slotJornada);
    }

    const slotHora = slot.hora || HORA_POR_JORNADA[slotJornada] || '';

    if (noHC) {
        ensureOption(noHC, slotHC);
        noHC.value = slotHC;
    }

    if (fecha) fecha.value = slot.fecha || '';
    if (hora) hora.value = slotHora;
    if (jornada) jornada.value = slotJornada;
    if (dia) dia.value = slotDay || '';

    if (message) {
        setGuidanceMessage(message);
    }
}

function setGuidanceMessage(message) {
    const form = document.getElementById('data-form');
    if (!form) return;

    let box = document.getElementById('guidance-message');

    if (!box) {
        box = document.createElement('div');
        box.id = 'guidance-message';
        box.style.padding = '12px';
        box.style.marginBottom = '15px';
        box.style.borderRadius = '8px';
        box.style.background = '#eef2ff';
        box.style.border = '1px solid #6366f1';
        box.style.color = '#1e293b';
        box.style.fontWeight = '600';
        form.prepend(box);
    }

    box.textContent = message || '';
    box.style.display = message ? 'block' : 'none';
}

function ensureOption(select, value) {
    if (!select || !value) return;

    const exists = Array.from(select.options).some(opt => normalizeHC(opt.value) === normalizeHC(value));

    if (!exists) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    }
}


// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN Y CARGA
// ═══════════════════════════════════════════════════════════════════

function showConfigSection() {
    document.getElementById('config-section').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
}

function showMainContent() {
    document.getElementById('config-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'flex';
}

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

async function loadData() {
    showLoading(true);

    try {
        const result = await callAppsScript('getData');

        if (result.success) {
            currentData = Array.isArray(result.data) ? result.data : [];
            currentData.sort(compareRecordSequence);
            renderTable(currentData);
            populateHCSelect();
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


// ═══════════════════════════════════════════════════════════════════
// FORMATO Y SEGURIDAD HTML
// ═══════════════════════════════════════════════════════════════════

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';

    const value = String(dateStr).trim();

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${day}/${month}/${year}`;
    }

    const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    return value;
}

function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


// ═══════════════════════════════════════════════════════════════════
// MODAL AGREGAR / EDITAR
// ═══════════════════════════════════════════════════════════════════

function openAddModal() {
    document.getElementById('modal-title').textContent = 'Agregar Nuevo Registro';
    document.getElementById('data-form').reset();
    document.getElementById('record-id').value = '';

    setupPersonaField();

    const slot = getNextGuidedSlot();

    const hcSelect = document.getElementById('no_hc');
    ensureOption(hcSelect, slot.no_hc);

    document.getElementById('no_hc').value = slot.no_hc;
    document.getElementById('fecha').value = slot.fecha;
    document.getElementById('hora').value = slot.hora;
    document.getElementById('jornada').value = slot.jornada;
    document.getElementById('dia').value = slot.day || slot.dia;

    const lastPersona = localStorage.getItem('lastPersona') || PERSONAS_AUTORIZADAS[0];
    const personaField = document.getElementById('persona');

    if (personaField) {
        personaField.value = normalizeText(lastPersona);
    }

    setGuidanceMessage(slot.aviso);

    openModal();
}

function editRecord(id) {
    const record = currentData.find(r => String(r.id) === String(id));
    if (!record) return;

    setupPersonaField();

    document.getElementById('modal-title').textContent = 'Editar Registro';
    document.getElementById('record-id').value = record.id;

    const hcSelect = document.getElementById('no_hc');
    ensureOption(hcSelect, record.no_hc || '');

    document.getElementById('no_hc').value = record.no_hc || '';
    document.getElementById('fecha').value = record.fecha;
    document.getElementById('hora').value = record.hora;
    document.getElementById('jornada').value = normalizeJornada(record.jornada || '');
    document.getElementById('dia').value = record.dia;
    document.getElementById('temperatura').value = record.temperatura;

    let humVal = parseFloat(String(record.humedad).replace('%', '').trim());

    if (!isNaN(humVal) && humVal > 0 && humVal < 1) {
        humVal = Math.round(humVal * 100);
    }

    document.getElementById('humedad').value = Math.round(humVal) || 0;

    const personaField = document.getElementById('persona');

    if (personaField) {
        personaField.value = normalizeText(record.persona);
    }

    document.getElementById('observaciones').value = record.observaciones || '';

    setGuidanceMessage('Editando registro existente. Si cambia fecha, día o jornada, se validará que coincidan.');

    openModal();
}

async function saveData(event) {
    event.preventDefault();

    const recordData = {
        id: document.getElementById('record-id').value,
        no_hc: document.getElementById('no_hc').value,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        jornada: normalizeJornada(document.getElementById('jornada').value),
        dia: document.getElementById('dia').value,
        temperatura: document.getElementById('temperatura').value,
        humedad: document.getElementById('humedad').value,
        persona: normalizeText(document.getElementById('persona').value),
        observaciones: document.getElementById('observaciones').value
    };

    const isCreate = !recordData.id;

    const validation = validateRecordBeforeSave(recordData, isCreate);

    if (!validation.ok) {
        showAlert(validation.message, 'warning');
        setGuidanceMessage(validation.message);

        if (validation.suggestedSlot) {
            applyGuidedSlotToForm(validation.suggestedSlot, validation.message);
        }

        return;
    }

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
        if (isCreate) {
            await autoCompletePreviousMonthIfNeeded(recordData);
        }

        const action = isCreate ? 'createData' : 'updateData';
        const result = await callAppsScript(action, recordData);

        if (result.success) {
            localStorage.setItem('lastSelectedHC', recordData.no_hc);
            localStorage.setItem('lastDia', recordData.dia);
            localStorage.setItem('lastJornada', recordData.jornada);
            localStorage.setItem('lastPersona', recordData.persona);

            saveToHistory({
                action: isCreate ? 'create' : 'update',
                data: recordData,
                timestamp: new Date().toISOString()
            });

            showAlert(
                isCreate ? 'Registro creado exitosamente' : 'Registro actualizado exitosamente',
                'success'
            );

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

async function deleteRecord(id) {
    if (!confirm('¿Está seguro de eliminar este registro?')) {
        return;
    }

    showLoading(true);

    try {
        const record = currentData.find(r => String(r.id) === String(id));
        const result = await callAppsScript('deleteData', { id: id });

        if (result.success) {
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


// ═══════════════════════════════════════════════════════════════════
// MODALES
// ═══════════════════════════════════════════════════════════════════

function openModal() {
    document.getElementById('data-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('data-modal').classList.remove('active');
    document.getElementById('data-form').reset();
    setGuidanceMessage('');
}

window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
};

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});


// ═══════════════════════════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════════════════════════

function saveToHistory(change) {
    historyStack.push(change);

    const hace2Dias = new Date();
    hace2Dias.setDate(hace2Dias.getDate() - 2);
    historyStack = historyStack.filter(c => new Date(c.timestamp) >= hace2Dias);

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

    historyList.innerHTML = history.slice().reverse().map(change => `
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
                    <p><strong>ID:</strong> ${escapeHTML(change.data.id || 'N/A')}</p>
                    <p><strong>No. HC:</strong> ${escapeHTML(change.data.no_hc || 'N/A')}</p>
                    <p><strong>Fecha:</strong> ${escapeHTML(formatDisplayDate(change.data.fecha))}</p>
                    <p><strong>Hora:</strong> ${escapeHTML(change.data.hora)}</p>
                    <p><strong>Jornada:</strong> ${escapeHTML(change.data.jornada || '')}</p>
                    <p><strong>Día:</strong> ${escapeHTML(change.data.dia || '')}</p>
                    <p><strong>Temperatura:</strong> ${escapeHTML(change.data.temperatura)}°C</p>
                    <p><strong>Humedad:</strong> ${escapeHTML(change.data.humedad)}%</p>
                    <p><strong>Persona:</strong> ${escapeHTML(change.data.persona)}</p>
                </div>
            </div>
        </div>
    `).join('');

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
            await callAppsScript('deleteData', { id: lastChange.data.id });
        } else if (lastChange.action === 'delete') {
            await callAppsScript('createData', lastChange.data);
        } else if (lastChange.action === 'update') {
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


// ═══════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('table-container').style.display = show ? 'none' : 'block';
}

function showAlert(message, type = 'info') {
    let alertContainer = document.getElementById('alert-container-front');

    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container-front';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.left = '50%';
        alertContainer.style.transform = 'translateX(-50%)';
        alertContainer.style.zIndex = '999999';
        alertContainer.style.width = 'min(620px, calc(100% - 30px))';
        alertContainer.style.pointerEvents = 'none';
        document.body.appendChild(alertContainer);
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.pointerEvents = 'auto';
    alert.style.boxShadow = '0 18px 45px rgba(15, 23, 42, 0.35)';
    alert.style.marginBottom = '12px';
    alert.style.border = '2px solid currentColor';
    alert.style.background = '#ffffff';

    alert.innerHTML = `
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
            <p style="font-weight: 700;">${escapeHTML(type.charAt(0).toUpperCase() + type.slice(1))}</p>
            <p>${escapeHTML(message)}</p>
        </div>
    `;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.5s';
        setTimeout(() => alert.remove(), 500);
    }, 5000);
}


// ═══════════════════════════════════════════════════════════════════
// TABLA
// ═══════════════════════════════════════════════════════════════════

function populateHCSelect() {
    const select = document.getElementById('no_hc');
    if (!select) return;

    const baseList = [];

    for (let i = 1; i <= 200; i++) {
        baseList.push(`HC-${i}`);
    }

    if (currentData.length > 0) {
        const extras = currentData
            .map(r => r.no_hc)
            .filter(hc => hc && !baseList.some(base => normalizeHC(base) === normalizeHC(hc)));

        extras.forEach(hc => baseList.push(hc));
    }

    baseList.sort((a, b) => {
        const aNum = extractHCNumber(a) || 0;
        const bNum = extractHCNumber(b) || 0;
        return aNum - bNum;
    });

    select.innerHTML = '<option value="">-- Seleccione HC --</option>' +
        baseList.map(hc => `<option value="${escapeAttr(hc)}">${escapeHTML(hc)}</option>`).join('');
}

function renderTable(data) {
    const tbody = document.getElementById('data-tbody');

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 40px;">No hay datos disponibles</td></tr>';
        document.getElementById('table-container').style.display = 'block';
        return;
    }

    tbody.innerHTML = data.map(record => {
        let hRaw = String(record.humedad || '0').replace('%', '').trim();
        let hNum = parseFloat(hRaw);

        if (!isNaN(hNum) && hNum > 0 && hNum < 1) {
            hNum = Math.round(hNum * 100);
        }

        hNum = Math.round(hNum) || 0;

        let tRaw = String(record.temperatura || '0').split('°')[0].trim();
        let tNum = parseFloat(tRaw) || 0;

        const jornada = normalizeJornada(record.jornada);

        return `
            <tr>
                <td class="hide-column">${escapeHTML(record.id)}</td>
                <td style="font-weight: bold; color: var(--primary);">${escapeHTML(record.no_hc || '-')}</td>
                <td>${escapeHTML(formatDisplayDate(record.fecha))}</td>
                <td>${escapeHTML(record.hora || '')}</td>
                <td><span class="badge badge-${jornada === 'MAÑANA' ? 'info' : 'success'}">${escapeHTML(jornada)}</span></td>
                <td>${escapeHTML(record.dia)}</td>
                <td class="font-mono">${tNum.toFixed(1)} °C</td>
                <td class="font-mono">${hNum}%</td>
                <td>${escapeHTML(record.persona || '')}</td>
                <td>${escapeHTML(record.observaciones || '-')}</td>
                <td>
                    <div class="button-group" style="gap: 5px;">
                        <button class="btn btn-primary" onclick="editRecord('${escapeAttr(record.id)}')">✏️</button>
                        <button class="btn btn-danger" onclick="deleteRecord('${escapeAttr(record.id)}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('table-container').style.display = 'block';
}


// ═══════════════════════════════════════════════════════════════════
// EDICIÓN MASIVA
// ═══════════════════════════════════════════════════════════════════

let isBulkEditing = false;

function toggleBulkEdit() {
    const btn = document.getElementById('btn-bulk-edit');
    const saveBtn = document.getElementById('btn-save-bulk');

    if (!isBulkEditing) {
        isBulkEditing = true;
        btn.innerHTML = '❌ Cancelar';
        btn.className = 'btn btn-danger';
        saveBtn.style.display = 'inline-block';
        enableInlineEditing();
    } else {
        isBulkEditing = false;
        btn.innerHTML = '✏️ Edición Masiva';
        btn.className = 'btn btn-warning';
        saveBtn.style.display = 'none';
        renderTable(currentData);
    }
}

function enableInlineEditing() {
    const rows = document.querySelectorAll('#data-tbody tr');

    rows.forEach(row => {
        const id = row.cells[0]?.textContent.trim();
        if (!id) return;

        const record = currentData.find(r => String(r.id) === String(id));
        if (!record) return;

        row.cells[1].innerHTML = `<input type="text" class="bulk-input" value="${escapeAttr(record.no_hc || '')}">`;
        row.cells[2].innerHTML = `<input type="date" class="bulk-input" value="${escapeAttr(record.fecha || '')}">`;
        row.cells[3].innerHTML = `<input type="time" class="bulk-input" value="${escapeAttr(record.hora || '')}">`;

        const jornada = normalizeJornada(record.jornada);

        row.cells[4].innerHTML = `
            <select class="bulk-input">
                <option value="MAÑANA" ${jornada === 'MAÑANA' ? 'selected' : ''}>MAÑANA</option>
                <option value="TARDE" ${jornada === 'TARDE' ? 'selected' : ''}>TARDE</option>
            </select>
        `;

        row.cells[5].innerHTML = `<input type="number" class="bulk-input" value="${escapeAttr(record.dia || '')}">`;
        row.cells[6].innerHTML = `<input type="number" step="0.1" class="bulk-input" value="${escapeAttr(record.temperatura || '')}">`;

        let humVal = parseFloat(String(record.humedad || '0').replace('%', '').trim());

        if (!isNaN(humVal) && humVal > 0 && humVal < 1) {
            humVal = Math.round(humVal * 100);
        }

        humVal = Math.round(humVal) || 0;

        row.cells[7].innerHTML = `<input type="number" min="0" max="100" class="bulk-input" value="${humVal}">`;

        row.cells[8].innerHTML = `
            <select class="bulk-input">
                <option value="">-- Seleccione persona --</option>
                ${PERSONAS_AUTORIZADAS.map(persona => `
                    <option value="${escapeAttr(persona)}" ${normalizeText(record.persona) === persona ? 'selected' : ''}>${escapeHTML(persona)}</option>
                `).join('')}
            </select>
        `;

        row.cells[9].innerHTML = `<textarea class="bulk-input" rows="1">${escapeHTML(record.observaciones || '')}</textarea>`;
    });
}

async function saveBulkChanges() {
    const rows = document.querySelectorAll('#data-tbody tr');
    const updates = [];

    try {
        rows.forEach(row => {
            const id = row.cells[0]?.textContent.trim();
            if (!id) return;

            const inputs = row.querySelectorAll('.bulk-input');
            if (inputs.length === 0) return;

            let humRaw = inputs[6]?.value?.replace('%', '').trim() || '0';
            let humNum = parseFloat(humRaw);

            if (!isNaN(humNum) && humNum > 0 && humNum < 1) {
                humNum *= 100;
            }

            humNum = Math.round(humNum) || 0;

            const record = {
                id: id,
                no_hc: inputs[0]?.value || '',
                fecha: inputs[1]?.value || '',
                hora: inputs[2]?.value || '',
                jornada: normalizeJornada(inputs[3]?.value || ''),
                dia: inputs[4]?.value || '',
                temperatura: parseFloat(inputs[5]?.value) || 0,
                humedad: humNum,
                persona: normalizeText(inputs[7]?.value || ''),
                observaciones: inputs[8]?.value || ''
            };

            const validation = validateRecordBeforeSave(record, false);

            if (!validation.ok) {
                if (validation.suggestedSlot) {
                    applyGuidedSlotToForm(validation.suggestedSlot, validation.message);
                }

                throw new Error(`Fila ID ${id}: ${validation.message}`);
            }

            updates.push(callAppsScript('updateData', record));
        });

        showLoading(true);

        if (updates.length > 0) await Promise.all(updates);

        showAlert('✅ Cambios masivos guardados', 'success');
        await loadData();
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


// ═══════════════════════════════════════════════════════════════════
// ORDENAMIENTO
// ═══════════════════════════════════════════════════════════════════

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

        if (['temperatura', 'humedad', 'dia'].includes(column)) {
            valA = parseFloat(String(valA).replace('%', '')) || 0;
            valB = parseFloat(String(valB).replace('%', '')) || 0;
            return sortAsc ? valA - valB : valB - valA;
        }

        if (column === 'fecha') {
            return sortAsc
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        }

        if (column === 'no_hc') {
            const aNum = extractHCNumber(valA) || 0;
            const bNum = extractHCNumber(valB) || 0;
            return sortAsc ? aNum - bNum : bNum - aNum;
        }

        return sortAsc
            ? String(valA).localeCompare(String(valB), 'es')
            : String(valB).localeCompare(String(valA), 'es');
    });

    renderTable(sorted);
}


// ═══════════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES GLOBALES
// ═══════════════════════════════════════════════════════════════════

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
