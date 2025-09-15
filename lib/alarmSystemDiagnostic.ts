// lib/alarmSystemDiagnostic.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getScheduledNotifications, getNotificationStats } from './notifications';
import { alarmSchedulerEngine } from './alarmSchedulerEngine';
import { parseTimeString, nextDateAtHourMinute } from '../utils/alarmTime';

export interface AlarmSystemDiagnostic {
  status: 'healthy' | 'warning' | 'error';
  permissions: {
    granted: boolean;
    details: string;
  };
  channels: {
    configured: boolean;
    count: number;
    details: string[];
  };
  scheduledAlarms: {
    total: number;
    medications: number;
    appointments: number;
    upcoming: number;
    details: any[];
  };
  timeValidation: {
    valid: boolean;
    issues: string[];
  };
  recommendations: string[];
}

/**
 * Ejecuta un diagnóstico completo del sistema de alarmas
 */
export async function runAlarmSystemDiagnostic(): Promise<AlarmSystemDiagnostic> {
  console.log('[AlarmSystemDiagnostic] 🔍 Iniciando diagnóstico completo...');
  
  const diagnostic: AlarmSystemDiagnostic = {
    status: 'healthy',
    permissions: { granted: false, details: '' },
    channels: { configured: false, count: 0, details: [] },
    scheduledAlarms: { total: 0, medications: 0, appointments: 0, upcoming: 0, details: [] },
    timeValidation: { valid: true, issues: [] },
    recommendations: []
  };

  try {
    // 1. Verificar permisos
    await checkPermissions(diagnostic);
    
    // 2. Verificar canales (Android)
    await checkNotificationChannels(diagnostic);
    
    // 3. Verificar alarmas programadas
    await checkScheduledAlarms(diagnostic);
    
    // 4. Verificar validación de tiempo
    checkTimeValidation(diagnostic);
    
    // 5. Generar recomendaciones
    generateRecommendations(diagnostic);
    
    // 6. Determinar estado general
    determineOverallStatus(diagnostic);
    
    console.log('[AlarmSystemDiagnostic] ✅ Diagnóstico completado:', diagnostic.status);
    return diagnostic;
    
  } catch (error) {
    console.error('[AlarmSystemDiagnostic] ❌ Error en diagnóstico:', error);
    diagnostic.status = 'error';
    diagnostic.recommendations.push('Error ejecutando diagnóstico. Revisar logs.');
    return diagnostic;
  }
}

async function checkPermissions(diagnostic: AlarmSystemDiagnostic) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    diagnostic.permissions.granted = status === 'granted';
    diagnostic.permissions.details = `Estado: ${status}`;
    
    if (!diagnostic.permissions.granted) {
      diagnostic.recommendations.push('Conceder permisos de notificación en configuración del dispositivo');
    }
  } catch (error) {
    diagnostic.permissions.details = `Error verificando permisos: ${error}`;
  }
}

async function checkNotificationChannels(diagnostic: AlarmSystemDiagnostic) {
  if (Platform.OS === 'android') {
    try {
      const channels = await Notifications.getNotificationChannelsAsync();
      diagnostic.channels.configured = channels.length > 0;
      diagnostic.channels.count = channels.length;
      diagnostic.channels.details = channels.map(ch => `${ch.name} (${ch.id})`);
      
      if (diagnostic.channels.count === 0) {
        diagnostic.recommendations.push('Configurar canales de notificación para Android');
      }
    } catch (error) {
      diagnostic.channels.details = [`Error verificando canales: ${error}`];
    }
  } else {
    diagnostic.channels.configured = true; // iOS no usa canales
    diagnostic.channels.details = ['iOS no requiere canales'];
  }
}

async function checkScheduledAlarms(diagnostic: AlarmSystemDiagnostic) {
  try {
    const scheduled = await getScheduledNotifications();
    diagnostic.scheduledAlarms.total = scheduled.length;
    
    const now = new Date();
    let medications = 0;
    let appointments = 0;
    let upcoming = 0;
    
    for (const notification of scheduled) {
      const data = notification.content.data;
      
      // Contar por tipo
      if (data?.type === 'MEDICATION' || data?.kind === 'MED') {
        medications++;
      } else if (data?.type === 'APPOINTMENT' || data?.kind === 'APPOINTMENT') {
        appointments++;
      }
      
      // Contar próximas (futuras)
      const triggerDate = (notification.trigger as any)?.date;
      if (triggerDate && new Date(triggerDate) > now) {
        upcoming++;
      }
      
      // Detalles para debugging
      diagnostic.scheduledAlarms.details.push({
        title: notification.content.title,
        type: data?.type || data?.kind,
        scheduledFor: triggerDate,
        id: notification.identifier
      });
    }
    
    diagnostic.scheduledAlarms.medications = medications;
    diagnostic.scheduledAlarms.appointments = appointments;
    diagnostic.scheduledAlarms.upcoming = upcoming;
    
    if (diagnostic.scheduledAlarms.total === 0) {
      diagnostic.recommendations.push('No hay alarmas programadas. Crear medicamentos o citas para generar alarmas.');
    } else if (diagnostic.scheduledAlarms.upcoming === 0) {
      diagnostic.recommendations.push('No hay alarmas futuras. Las alarmas pasadas se eliminan automáticamente.');
    }
    
  } catch (error) {
    diagnostic.scheduledAlarms.details = [`Error verificando alarmas: ${error}`];
  }
}

function checkTimeValidation(diagnostic: AlarmSystemDiagnostic) {
  // Probar algunas horas comunes
  const testTimes = ['09:00', '14:30', '20:15', '23:59'];
  
  for (const timeStr of testTimes) {
    const parsed = parseTimeString(timeStr);
    if (!parsed) {
      diagnostic.timeValidation.valid = false;
      diagnostic.timeValidation.issues.push(`No se pudo parsear: ${timeStr}`);
    } else {
      // Verificar que nextDateAtHourMinute funciona
      try {
        const nextDate = nextDateAtHourMinute(parsed.hour, parsed.minute);
        if (!nextDate || isNaN(nextDate.getTime())) {
          diagnostic.timeValidation.valid = false;
          diagnostic.timeValidation.issues.push(`Fecha inválida para: ${timeStr}`);
        }
      } catch (error) {
        diagnostic.timeValidation.valid = false;
        diagnostic.timeValidation.issues.push(`Error calculando fecha para ${timeStr}: ${error}`);
      }
    }
  }
  
  if (!diagnostic.timeValidation.valid) {
    diagnostic.recommendations.push('Hay problemas con la validación de tiempo. Revisar utilidades de tiempo.');
  }
}

function generateRecommendations(diagnostic: AlarmSystemDiagnostic) {
  // Recomendaciones basadas en el estado del sistema
  
  if (!diagnostic.permissions.granted) {
    diagnostic.recommendations.push('🔴 CRÍTICO: Activar permisos de notificación para que las alarmas funcionen');
  }
  
  if (Platform.OS === 'android' && !diagnostic.channels.configured) {
    diagnostic.recommendations.push('🟡 IMPORTANTE: Configurar canales de notificación para Android');
  }
  
  if (diagnostic.scheduledAlarms.total > 50) {
    diagnostic.recommendations.push('🟡 Considerar limpiar alarmas antiguas para mejorar rendimiento');
  }
  
  if (diagnostic.scheduledAlarms.upcoming === 0 && diagnostic.scheduledAlarms.total > 0) {
    diagnostic.recommendations.push('🟡 Todas las alarmas son pasadas. Crear nuevos medicamentos/citas o verificar fechas.');
  }
  
  // Recomendaciones generales
  if (diagnostic.recommendations.length === 0) {
    diagnostic.recommendations.push('✅ Sistema funcionando correctamente');
  }
}

function determineOverallStatus(diagnostic: AlarmSystemDiagnostic) {
  if (!diagnostic.permissions.granted || !diagnostic.timeValidation.valid) {
    diagnostic.status = 'error';
  } else if (
    (Platform.OS === 'android' && !diagnostic.channels.configured) ||
    diagnostic.scheduledAlarms.upcoming === 0
  ) {
    diagnostic.status = 'warning';
  } else {
    diagnostic.status = 'healthy';
  }
}

/**
 * Función de prueba rápida para verificar que las alarmas se programen correctamente
 */
export async function testAlarmScheduling(): Promise<{
  success: boolean;
  details: string[];
  scheduledId?: string;
}> {
  const details: string[] = [];
  
  try {
    details.push('🧪 Iniciando prueba de programación de alarma...');
    
    // Programar una alarma de prueba para 2 minutos en el futuro
    const testTime = new Date();
    testTime.setMinutes(testTime.getMinutes() + 2);
    
    const testConfig = {
      id: 'test_alarm_' + Date.now(),
      type: 'medication' as const,
      name: 'Prueba de Alarma',
      time: testTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      frequency: 'daily' as const,
      data: {
        medicationId: 'test_med',
        medicationName: 'Medicamento de Prueba',
        dosage: '1 pastilla',
        test: true
      }
    };
    
    details.push(`📅 Programando alarma para: ${testTime.toISOString()}`);
    
    const scheduledIds = await alarmSchedulerEngine.scheduleAlarmsFromConfig(testConfig, 1);
    
    if (scheduledIds.length > 0) {
      details.push(`✅ Alarma programada exitosamente: ${scheduledIds[0]}`);
      details.push(`⏰ La alarma sonará en aproximadamente 2 minutos`);
      
      return {
        success: true,
        details,
        scheduledId: scheduledIds[0]
      };
    } else {
      details.push('❌ No se pudo programar la alarma');
      return { success: false, details };
    }
    
  } catch (error) {
    details.push(`❌ Error programando alarma de prueba: ${error}`);
    return { success: false, details };
  }
}

/**
 * Cancelar alarma de prueba
 */
export async function cancelTestAlarm(alarmId: string): Promise<boolean> {
  try {
    console.log('[AlarmSystemDiagnostic] Cancelando alarma de prueba:', alarmId);
    await alarmSchedulerEngine.cancelScheduledBatch([alarmId]);
    return true;
  } catch (error) {
    console.error('[AlarmSystemDiagnostic] Error cancelando alarma de prueba:', error);
    return false;
  }
}
