import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { scheduleNotification, requestPermissions } from './notifications';

/**
 * Pruebas del sistema de alarmas
 */
export class AlarmTest {
  /**
   * Ejecutar todas las pruebas
   */
  static async runAllTests() {
    console.log('[AlarmTest] Iniciando pruebas del sistema de alarmas...');
    
    try {
      // 1. Verificar permisos
      const permissionsOk = await this.testPermissions();
      if (!permissionsOk) {
        throw new Error('Permisos no concedidos');
      }
      
      // 2. Verificar canales (Android)
      if (Platform.OS === 'android') {
        const channelsOk = await this.testChannels();
        if (!channelsOk) {
          throw new Error('Canales no configurados correctamente');
        }
      }
      
      // 3. Probar notificación inmediata
      await this.testImmediateNotification();
      
      // 4. Probar notificación programada (1 minuto)
      await this.testScheduledNotification();
      
      console.log('[AlarmTest] ✅ Todas las pruebas completadas exitosamente');
      return true;
    } catch (error) {
      console.error('[AlarmTest] ❌ Error en las pruebas:', error);
      return false;
    }
  }
  
  /**
   * Probar permisos de notificación
   */
  static async testPermissions(): Promise<boolean> {
    try {
      console.log('[AlarmTest] Verificando permisos...');
      
      const permissionsGranted = await requestPermissions();
      if (permissionsGranted) {
        console.log('[AlarmTest] ✅ Permisos concedidos');
        return true;
      } else {
        console.log('[AlarmTest] ❌ Permisos no concedidos');
        return false;
      }
    } catch (error) {
      console.error('[AlarmTest] Error verificando permisos:', error);
      return false;
    }
  }
  
  /**
   * Probar canales de notificación (Android)
   */
  static async testChannels(): Promise<boolean> {
    try {
      console.log('[AlarmTest] Verificando canales...');
      
      const channels = await Notifications.getNotificationChannelsAsync();
      console.log('[AlarmTest] Canales encontrados:', channels.length);
      
      const requiredChannels = ['default', 'medications', 'appointments'];
      const foundChannels = channels.map(c => c.id);
      
      for (const required of requiredChannels) {
        if (!foundChannels.includes(required)) {
          console.log(`[AlarmTest] ❌ Canal requerido no encontrado: ${required}`);
          return false;
        }
      }
      
      console.log('[AlarmTest] ✅ Todos los canales requeridos encontrados');
      return true;
    } catch (error) {
      console.error('[AlarmTest] Error verificando canales:', error);
      return false;
    }
  }
  
  /**
   * Probar notificación inmediata
   */
  static async testImmediateNotification(): Promise<void> {
    try {
      console.log('[AlarmTest] Enviando notificación de prueba inmediata...');
      
      await scheduleNotification({
        title: '🔔 Prueba de Alarma',
        body: 'Esta es una notificación de prueba inmediata',
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          medicationId: 'test-med-001',
          medicationName: 'Medicamento de Prueba',
          dosage: '500mg',
          instructions: 'Tomar con agua',
          time: new Date().toLocaleTimeString(),
          test: true,
        },
        trigger: null, // Inmediata
        identifier: 'test-immediate-' + Date.now(),
        channelId: 'medications',
      });
      
      console.log('[AlarmTest] ✅ Notificación inmediata enviada');
    } catch (error) {
      console.error('[AlarmTest] Error enviando notificación inmediata:', error);
      throw error;
    }
  }
  
  /**
   * Probar notificación programada (1 minuto)
   */
  static async testScheduledNotification(): Promise<void> {
    try {
      console.log('[AlarmTest] Programando notificación de prueba (1 minuto)...');
      
      const triggerDate = new Date();
      triggerDate.setMinutes(triggerDate.getMinutes() + 1);
      
      await scheduleNotification({
        title: '⏰ Alarma Programada',
        body: 'Esta alarma se programó para sonar en 1 minuto',
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          medicationId: 'test-med-002',
          medicationName: 'Medicamento Programado',
          dosage: '250mg',
          instructions: 'Tomar con comida',
          time: triggerDate.toLocaleTimeString(),
          scheduledFor: triggerDate.toISOString(),
          test: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
        identifier: 'test-scheduled-' + Date.now(),
        channelId: 'medications',
      });
      
      console.log('[AlarmTest] ✅ Notificación programada para:', triggerDate.toLocaleString());
    } catch (error) {
      console.error('[AlarmTest] Error programando notificación:', error);
      throw error;
    }
  }
  
  /**
   * Probar notificación de cita
   */
  static async testAppointmentNotification(): Promise<void> {
    try {
      console.log('[AlarmTest] Enviando notificación de cita de prueba...');
      
      await scheduleNotification({
        title: '📅 Cita de Prueba',
        body: 'Esta es una notificación de cita de prueba',
        data: {
          type: 'APPOINTMENT',
          kind: 'APPOINTMENT',
          appointmentId: 'test-appt-001',
          title: 'Cita con Dr. Prueba',
          location: 'Consultorio 123',
          dateTime: new Date().toISOString(),
          test: true,
        },
        trigger: null, // Inmediata
        identifier: 'test-appointment-' + Date.now(),
        channelId: 'appointments',
      });
      
      console.log('[AlarmTest] ✅ Notificación de cita enviada');
    } catch (error) {
      console.error('[AlarmTest] Error enviando notificación de cita:', error);
      throw error;
    }
  }
  
  /**
   * Limpiar notificaciones de prueba
   */
  static async cleanupTestNotifications(): Promise<void> {
    try {
      console.log('[AlarmTest] Limpiando notificaciones de prueba...');
      
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const testNotifications = scheduled.filter(n => 
        n.identifier.includes('test-') || 
        n.content.data?.test === true
      );
      
      for (const notification of testNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`[AlarmTest] Notificación de prueba cancelada: ${notification.identifier}`);
      }
      
      console.log(`[AlarmTest] ✅ ${testNotifications.length} notificaciones de prueba canceladas`);
    } catch (error) {
      console.error('[AlarmTest] Error limpiando notificaciones de prueba:', error);
    }
  }
  
  /**
   * Mostrar estadísticas del sistema
   */
  static async showSystemStats(): Promise<void> {
    try {
      console.log('[AlarmTest] Obteniendo estadísticas del sistema...');
      
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const permissions = await Notifications.getPermissionsAsync();
      
      console.log('[AlarmTest] === ESTADÍSTICAS DEL SISTEMA ===');
      console.log(`[AlarmTest] Permisos: ${permissions.status}`);
      console.log(`[AlarmTest] Notificaciones programadas: ${scheduled.length}`);
      
      if (Platform.OS === 'android') {
        const channels = await Notifications.getNotificationChannelsAsync();
        console.log(`[AlarmTest] Canales configurados: ${channels.length}`);
        
        channels.forEach((channel, index) => {
          console.log(`[AlarmTest] ${index + 1}. ${channel.id} - ${channel.name} (${channel.importance})`);
        });
      }
      
      console.log('[AlarmTest] === FIN ESTADÍSTICAS ===');
    } catch (error) {
      console.error('[AlarmTest] Error obteniendo estadísticas:', error);
    }
  }
}

/**
 * Función de conveniencia para ejecutar todas las pruebas
 */
export async function runAllTests() {
  return await AlarmTest.runAllTests();
}

/**
 * Función de conveniencia para limpiar notificaciones de prueba
 */
export async function cleanupTestNotifications() {
  return await AlarmTest.cleanupTestNotifications();
}

/**
 * Función de conveniencia para mostrar estadísticas
 */
export async function showSystemStats() {
  return await AlarmTest.showSystemStats();
}
