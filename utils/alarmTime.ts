// utils/alarmTime.ts
/**
 * Utilidades para normalización de horas y manejo de alarmas
 * Evita problemas con DST y duplicados usando fechas normalizadas
 */

/**
 * Genera una clave única para una hora (HH:mm)
 */
export const hmKey = (d: Date) => `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

/**
 * Normaliza una fecha a una fecha base (1970-01-01) con la misma hora
 * Esto evita problemas con DST y cambios de zona horaria
 */
export const normalizeHM = (d: Date) => new Date(1970, 0, 1, d.getHours(), d.getMinutes(), 0, 0);

/**
 * Agrega una hora a una lista manteniendo orden y unicidad
 * @param list Lista actual de horas normalizadas
 * @param raw Nueva hora a agregar
 * @returns Nueva lista ordenada y sin duplicados
 */
export function pushTimeSortedUnique(list: Date[], raw: Date): Date[] {
  const t = normalizeHM(raw);
  const key = hmKey(t);
  const map = new Map(list.map(x => [hmKey(x), normalizeHM(x)]));
  map.set(key, t);
  return Array.from(map.values()).sort((a,b)=> a.getHours()-b.getHours() || a.getMinutes()-b.getMinutes());
}

/**
 * Calcula la próxima fecha a una hora específica
 * @param hour Hora (0-23)
 * @param minute Minuto (0-59)
 * @param fromDate Fecha de referencia (por defecto: ahora)
 * @returns Próxima fecha con la hora especificada
 */
export function nextDateAtHourMinute(hour: number, minute: number, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);
  next.setHours(hour, minute, 0, 0);
  
  // Si la hora ya pasó hoy, programar para mañana
  if (next <= fromDate) {
    next.setDate(next.getDate() + 1);
  }
  
  console.log(`[alarmTime] Calculando próxima fecha: ${hour}:${minute.toString().padStart(2, '0')} -> ${next.toISOString()}`);
  return next;
}

/**
 * Genera fechas para días específicos de la semana dentro de un rango
 * @param daysOfWeek Array de días (0=domingo, 1=lunes, ..., 6=sábado)
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @param hour Hora (0-23)
 * @param minute Minuto (0-59)
 * @returns Array de fechas válidas
 */
export function datesForDaysOfWeekWithin(
  daysOfWeek: number[],
  startDate: Date,
  endDate: Date,
  hour: number,
  minute: number
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (daysOfWeek.includes(current.getDay())) {
      const alarmDate = new Date(current);
      alarmDate.setHours(hour, minute, 0, 0);
      if (alarmDate >= startDate && alarmDate <= endDate) {
        dates.push(alarmDate);
      }
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Genera fechas para alarmas cada X horas
 * @param intervalHours Intervalo en horas
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @param firstHour Hora de la primera alarma (0-23)
 * @param firstMinute Minuto de la primera alarma (0-59)
 * @returns Array de fechas válidas
 */
export function datesForIntervalHours(
  intervalHours: number,
  startDate: Date,
  endDate: Date,
  firstHour: number,
  firstMinute: number
): Date[] {
  const dates: Date[] = [];
  const firstAlarm = nextDateAtHourMinute(firstHour, firstMinute, startDate);
  
  if (firstAlarm <= endDate) {
    dates.push(firstAlarm);
    
    let nextAlarm = new Date(firstAlarm);
    while (nextAlarm <= endDate) {
      nextAlarm.setHours(nextAlarm.getHours() + intervalHours);
      if (nextAlarm <= endDate) {
        dates.push(new Date(nextAlarm));
      }
    }
  }
  
  return dates;
}

/**
 * Genera fechas para alarmas diarias
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @param hour Hora (0-23)
 * @param minute Minuto (0-59)
 * @returns Array de fechas válidas
 */
export function datesForDaily(
  startDate: Date,
  endDate: Date,
  hour: number,
  minute: number
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const alarmDate = new Date(current);
    alarmDate.setHours(hour, minute, 0, 0);
    if (alarmDate >= startDate && alarmDate <= endDate) {
      dates.push(alarmDate);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Valida si una hora es válida
 * @param hour Hora (0-23)
 * @param minute Minuto (0-59)
 * @returns true si es válida
 */
export function isValidTime(hour: number, minute: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/**
 * Convierte string de tiempo (HH:mm) a objeto con hora y minuto
 * @param timeString String en formato HH:mm
 * @returns Objeto con hour y minute, o null si es inválido
 */
export function parseTimeString(timeString: string): { hour: number; minute: number } | null {
  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const match = timeString.match(timeRegex);
  
  if (!match) {
    return null;
  }
  
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  
  if (!isValidTime(hour, minute)) {
    return null;
  }
  
  return { hour, minute };
}

/**
 * Formatea una hora como string HH:mm
 * @param hour Hora (0-23)
 * @param minute Minuto (0-59)
 * @returns String formateado
 */
export function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Calcula la diferencia en minutos entre dos horas
 * @param hour1 Hora 1
 * @param minute1 Minuto 1
 * @param hour2 Hora 2
 * @param minute2 Minuto 2
 * @returns Diferencia en minutos
 */
export function timeDifferenceInMinutes(
  hour1: number, minute1: number,
  hour2: number, minute2: number
): number {
  const minutes1 = hour1 * 60 + minute1;
  const minutes2 = hour2 * 60 + minute2;
  return minutes2 - minutes1;
}

/**
 * Genera un identificador único para una alarma basado en su configuración
 * @param type Tipo de alarma (medication, appointment, etc.)
 * @param id ID del elemento
 * @param hour Hora
 * @param minute Minuto
 * @param frequency Frecuencia (daily, weekly, etc.)
 * @returns Identificador único
 */
export function generateAlarmIdentifier(
  type: string,
  id: string,
  hour: number,
  minute: number,
  frequency: string = 'daily'
): string {
  const timeStr = formatTime(hour, minute);
  return `${type}_${id}_${frequency}_${timeStr.replace(':', '_')}`;
}
