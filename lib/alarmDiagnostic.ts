import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { Alert } from 'react-native';
import { scheduleMedicationReminder, getScheduledNotifications, cancelAllNotifications } from './notifications';
import { setupNotificationChannels, checkNotificationChannels, recreateNotificationChannels } from './notificationChannels';

/**
 * Diagnóstico completo del sistema de alarmas
 */
export async function diagnoseAlarmSystem() {
  const results = {
    device: '',
    permissions: '',
    channels: '',
    scheduled: '',
    test: '',
    recommendations: [] as string[]
  };

  try {
    console.log('🔍 [ALARM_DIAGNOSTIC] Iniciando diagnóstico completo...');

    // 1. Verificar dispositivo
    results.device = Device.isDevice ? 'Dispositivo físico' : 'Simulador';
    console.log('🔍 [ALARM_DIAGNOSTIC] Dispositivo:', results.device);

    // 2. Verificar permisos
    const { status } = await Notifications.getPermissionsAsync();
    results.permissions = status;
    console.log('🔍 [ALARM_DIAGNOSTIC] Permisos:', status);

    if (status !== 'granted') {
      results.recommendations.push('Solicitar permisos de notificación');
    }

    // 3. Verificar canales (Android)
    if (Platform.OS === 'android') {
      const channels = await checkNotificationChannels();
      results.channels = `Canales: ${channels.length}`;
      console.log('🔍 [ALARM_DIAGNOSTIC] Canales Android:', channels.length);
      
      if (channels.length === 0) {
        results.recommendations.push('Configurar canales de notificación');
        // Intentar configurar canales automáticamente
        const setupSuccess = await setupNotificationChannels();
        if (setupSuccess) {
          results.recommendations.push('✅ Canales configurados automáticamente');
        } else {
          results.recommendations.push('❌ Error configurando canales');
        }
      }
    } else {
      results.channels = 'iOS - No aplica';
    }

    // 4. Verificar notificaciones programadas
    const scheduled = await getScheduledNotifications();
    results.scheduled = `Programadas: ${scheduled.length}`;
    console.log('🔍 [ALARM_DIAGNOSTIC] Notificaciones programadas:', scheduled.length);

    if (scheduled.length === 0) {
      results.recommendations.push('No hay alarmas programadas');
    }

    // 5. Prueba de programación
    try {
      const testTime = new Date();
      testTime.setMinutes(testTime.getMinutes() + 1);
      const timeString = testTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      await scheduleMedicationReminder({
        id: 'diagnostic_test',
        name: 'Prueba de Diagnóstico',
        dosage: '1mg',
        time: timeString,
        frequency: 'daily',
        patientProfileId: 'test'
      });

      results.test = '✅ Prueba exitosa';
      console.log('🔍 [ALARM_DIAGNOSTIC] Prueba de programación exitosa');

      // Limpiar la prueba
      await cancelAllNotifications();
    } catch (error) {
      results.test = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('🔍 [ALARM_DIAGNOSTIC] Error en prueba:', error);
      results.recommendations.push('Error en programación de notificaciones');
    }

    // 6. Recomendaciones adicionales
    if (Platform.OS === 'android') {
      results.recommendations.push('Verificar optimización de batería');
      results.recommendations.push('Verificar modo "No molestar"');
    }

    console.log('🔍 [ALARM_DIAGNOSTIC] Diagnóstico completado:', results);
    return results;

  } catch (error) {
    console.error('🔍 [ALARM_DIAGNOSTIC] Error en diagnóstico:', error);
    results.test = `❌ Error crítico: ${error instanceof Error ? error.message : String(error)}`;
    results.recommendations.push('Error crítico en el sistema');
    return results;
  }
}

/**
 * Mostrar resultados del diagnóstico
 */
export function showDiagnosticResults(results: any) {
  const message = `
🔍 DIAGNÓSTICO DEL SISTEMA DE ALARMAS

📱 Dispositivo: ${results.device}
🔐 Permisos: ${results.permissions}
📢 Canales: ${results.channels}
⏰ Programadas: ${results.scheduled}
🧪 Prueba: ${results.test}

${results.recommendations.length > 0 ? `
📋 RECOMENDACIONES:
${results.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
` : '✅ Sistema funcionando correctamente'}
  `;

  Alert.alert('Diagnóstico de Alarmas', message, [
    { text: 'OK' }
  ]);
}

/**
 * Ejecutar diagnóstico completo y mostrar resultados
 */
export async function runFullDiagnostic() {
  try {
    const results = await diagnoseAlarmSystem();
    showDiagnosticResults(results);
    return results;
  } catch (error) {
    console.error('🔍 [ALARM_DIAGNOSTIC] Error ejecutando diagnóstico:', error);
    Alert.alert('Error', 'Error ejecutando diagnóstico de alarmas');
    return null;
  }
}
