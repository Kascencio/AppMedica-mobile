import { scheduleMedicationReminder, getScheduledNotifications, cancelAllNotifications } from './notifications';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Prueba específica de alarmas de medicamentos
 */
export async function testMedicationAlarm() {
  try {
    console.log('🧪 [ALARM_TEST] Iniciando prueba de alarma de medicamento...');
    
    // Limpiar notificaciones existentes
    await cancelAllNotifications();
    console.log('🧪 [ALARM_TEST] Notificaciones limpiadas');
    
    // Programar alarma para 1 minuto en el futuro
    const testTime = new Date();
    testTime.setMinutes(testTime.getMinutes() + 1);
    const timeString = testTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    console.log(`🧪 [ALARM_TEST] Programando alarma para las ${timeString} (en 1 minuto)`);
    
    // Programar medicamento de prueba
    await scheduleMedicationReminder({
      id: 'test_med_001',
      name: 'Paracetamol de Prueba',
      dosage: '500mg',
      time: timeString,
      frequency: 'daily',
      patientProfileId: 'test_patient_001'
    });
    
    console.log('🧪 [ALARM_TEST] ✅ Alarma programada correctamente');
    
    // Verificar notificaciones programadas
    const scheduled = await getScheduledNotifications();
    console.log('🧪 [ALARM_TEST] Notificaciones programadas:', scheduled.length);
    
    // Mostrar detalles
    scheduled.forEach((notif, index) => {
      console.log(`🧪 [ALARM_TEST] ${index + 1}. ${notif.content.title}`);
      console.log(`   - ID: ${notif.identifier}`);
      console.log(`   - Trigger: ${JSON.stringify(notif.trigger)}`);
      console.log(`   - Data: ${JSON.stringify(notif.content.data)}`);
    });
    
    Alert.alert(
      'Prueba de Alarma Programada',
      `Alarma programada para las ${timeString} (en 1 minuto).\n\nVerifica que:\n1. La notificación aparezca\n2. Se abra AlarmScreen automáticamente\n3. Los datos se muestren correctamente`,
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    console.error('🧪 [ALARM_TEST] Error:', error);
    Alert.alert('Error', `Error en la prueba: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verificar estado de las alarmas
 */
export async function checkAlarmStatus() {
  try {
    console.log('🧪 [ALARM_CHECK] Verificando estado de alarmas...');
    
    // Verificar permisos
    const { status } = await Notifications.getPermissionsAsync();
    console.log('🧪 [ALARM_CHECK] Permisos:', status);
    
    // Verificar notificaciones programadas
    const scheduled = await getScheduledNotifications();
    console.log('🧪 [ALARM_CHECK] Notificaciones programadas:', scheduled.length);
    
    // Verificar canales
    const channels = await Notifications.getNotificationChannelsAsync();
    console.log('🧪 [ALARM_CHECK] Canales:', channels.length);
    
    let statusMessage = `Estado de las Alarmas:\n\n`;
    statusMessage += `Permisos: ${status}\n`;
    statusMessage += `Notificaciones programadas: ${scheduled.length}\n`;
    statusMessage += `Canales configurados: ${channels.length}\n\n`;
    
    if (scheduled.length > 0) {
      statusMessage += `Próximas alarmas:\n`;
      scheduled.slice(0, 3).forEach((notif, index) => {
        statusMessage += `${index + 1}. ${notif.content.title}\n`;
      });
    } else {
      statusMessage += `No hay alarmas programadas.\n`;
      statusMessage += `Prueba programar un medicamento.`;
    }
    
    Alert.alert('Estado de Alarmas', statusMessage);
    
  } catch (error) {
    console.error('🧪 [ALARM_CHECK] Error:', error);
    Alert.alert('Error', `Error verificando estado: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Limpiar todas las alarmas
 */
export async function clearAllAlarms() {
  try {
    await cancelAllNotifications();
    console.log('🧪 [ALARM_CLEAR] Todas las alarmas canceladas');
    Alert.alert('Limpieza', 'Todas las alarmas han sido canceladas');
  } catch (error) {
    console.error('🧪 [ALARM_CLEAR] Error:', error);
    Alert.alert('Error', `Error limpiando alarmas: ${error instanceof Error ? error.message : String(error)}`);
  }
}
