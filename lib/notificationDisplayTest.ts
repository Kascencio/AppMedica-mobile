import * as Notifications from 'expo-notifications';
import { scheduleNotification } from './notifications';

export async function testNotificationDisplay() {
  console.log('🧪 [NOTIFICATION_DISPLAY_TEST] Iniciando prueba de visualización de notificaciones...');
  
  try {
    // Limpiar notificaciones existentes
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🧪 [NOTIFICATION_DISPLAY_TEST] Notificaciones limpiadas');
    
    // Programar notificación de prueba inmediata (en 5 segundos)
    const testTime = new Date(Date.now() + 5000);
    
    const notificationId = await scheduleNotification({
      title: '🧪 Prueba de Notificación',
      body: 'Esta es una notificación de prueba para verificar que se muestre correctamente',
      data: {
        type: 'MEDICATION',
        kind: 'MED',
        medicationId: 'test_display_001',
        medicationName: 'Prueba de Visualización',
        dosage: '500mg',
        time: testTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        refId: 'test_display_001',
        name: 'Prueba de Visualización',
        instructions: '500mg',
        scheduledFor: testTime.toISOString(),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: testTime,
      },
      identifier: 'test_display_notification',
      channelId: 'medications',
    });
    
    console.log('🧪 [NOTIFICATION_DISPLAY_TEST] ✅ Notificación de prueba programada para:', testTime.toLocaleString());
    console.log('🧪 [NOTIFICATION_DISPLAY_TEST] ID:', notificationId);
    
    // Verificar que se programó correctamente
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const testNotification = scheduledNotifications.find(n => n.identifier === 'test_display_notification');
    
    if (testNotification) {
      console.log('🧪 [NOTIFICATION_DISPLAY_TEST] ✅ Notificación encontrada en programadas');
      console.log('🧪 [NOTIFICATION_DISPLAY_TEST] Título:', testNotification.content.title);
      console.log('🧪 [NOTIFICATION_DISPLAY_TEST] Cuerpo:', testNotification.content.body);
      console.log('🧪 [NOTIFICATION_DISPLAY_TEST] Datos:', testNotification.content.data);
      console.log('🧪 [NOTIFICATION_DISPLAY_TEST] Trigger:', testNotification.trigger);
    } else {
      console.log('🧪 [NOTIFICATION_DISPLAY_TEST] ❌ Notificación no encontrada en programadas');
    }
    
    return {
      success: true,
      notificationId,
      scheduledFor: testTime.toISOString(),
      message: 'Notificación de prueba programada correctamente'
    };
    
  } catch (error) {
    console.error('🧪 [NOTIFICATION_DISPLAY_TEST] ❌ Error:', error);
    return {
      success: false,
      error: String(error),
      message: 'Error programando notificación de prueba'
    };
  }
}

export async function testImmediateNotification() {
  console.log('🧪 [IMMEDIATE_NOTIFICATION_TEST] Enviando notificación inmediata...');
  
  try {
    // Enviar notificación inmediata (no programada)
    await Notifications.presentNotificationAsync({
      title: '🚨 Notificación Inmediata',
      body: 'Esta notificación debería aparecer inmediatamente en el sistema',
      data: {
        type: 'MEDICATION',
        kind: 'MED',
        medicationId: 'immediate_test',
        medicationName: 'Prueba Inmediata',
        dosage: '500mg',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        refId: 'immediate_test',
        name: 'Prueba Inmediata',
        instructions: '500mg',
        scheduledFor: new Date().toISOString(),
      },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      vibrate: [0, 500, 250, 500, 250, 500],
      categoryIdentifier: 'medications',
      sticky: false,
      autoDismiss: true,
    });
    
    console.log('🧪 [IMMEDIATE_NOTIFICATION_TEST] ✅ Notificación inmediata enviada');
    
    return {
      success: true,
      message: 'Notificación inmediata enviada correctamente'
    };
    
  } catch (error) {
    console.error('🧪 [IMMEDIATE_NOTIFICATION_TEST] ❌ Error:', error);
    return {
      success: false,
      error: String(error),
      message: 'Error enviando notificación inmediata'
    };
  }
}

export async function checkNotificationPermissions() {
  console.log('🧪 [PERMISSION_CHECK] Verificando permisos de notificaciones...');
  
  try {
    const { status } = await Notifications.getPermissionsAsync();
    console.log('🧪 [PERMISSION_CHECK] Estado de permisos:', status);
    
    const canAskAgain = await Notifications.canAskAgainAsync();
    console.log('🧪 [PERMISSION_CHECK] Puede solicitar permisos:', canAskAgain);
    
    return {
      status,
      canAskAgain,
      granted: status === 'granted'
    };
    
  } catch (error) {
    console.error('🧪 [PERMISSION_CHECK] ❌ Error:', error);
    return {
      status: 'unknown',
      canAskAgain: false,
      granted: false,
      error: String(error)
    };
  }
}
