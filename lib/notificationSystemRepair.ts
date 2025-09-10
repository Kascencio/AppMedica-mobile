import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import { scheduleMedicationReminder, getScheduledNotifications, cancelAllNotifications, requestPermissions } from './notifications';
import { setupNotificationChannels, checkNotificationChannels } from './notificationChannels';

/**
 * Sistema completo de reparación de notificaciones
 */
export class NotificationSystemRepair {
  private static instance: NotificationSystemRepair;
  
  public static getInstance(): NotificationSystemRepair {
    if (!NotificationSystemRepair.instance) {
      NotificationSystemRepair.instance = new NotificationSystemRepair();
    }
    return NotificationSystemRepair.instance;
  }

  /**
   * Diagnóstico completo del sistema
   */
  async diagnoseSystem(): Promise<{
    device: string;
    permissions: string;
    channels: string;
    scheduled: number;
    testResult: string;
    issues: string[];
    recommendations: string[];
  }> {
    const result = {
      device: '',
      permissions: '',
      channels: '',
      scheduled: 0,
      testResult: '',
      issues: [] as string[],
      recommendations: [] as string[]
    };

    try {
      console.log('🔧 [NotificationRepair] Iniciando diagnóstico completo...');

      // 1. Verificar dispositivo
      result.device = Device.isDevice ? 'Dispositivo físico' : 'Simulador';
      if (!Device.isDevice) {
        result.issues.push('Ejecutándose en simulador - las notificaciones pueden no funcionar');
        result.recommendations.push('Probar en dispositivo físico');
      }

      // 2. Verificar permisos
      const { status } = await Notifications.getPermissionsAsync();
      result.permissions = status;
      
      if (status !== 'granted') {
        result.issues.push('Permisos de notificación no concedidos');
        result.recommendations.push('Solicitar permisos de notificación');
      }

      // 3. Verificar canales (Android)
      if (Platform.OS === 'android') {
        const channels = await checkNotificationChannels();
        result.channels = `Canales: ${channels.length}`;
        
        if (channels.length === 0) {
          result.issues.push('No hay canales de notificación configurados');
          result.recommendations.push('Configurar canales de notificación');
        }
      } else {
        result.channels = 'iOS - No aplica';
      }

      // 4. Verificar notificaciones programadas
      const scheduled = await getScheduledNotifications();
      result.scheduled = scheduled.length;
      
      if (scheduled.length === 0) {
        result.issues.push('No hay notificaciones programadas');
        result.recommendations.push('Programar algunas alarmas de prueba');
      }

      // 5. Prueba de programación
      try {
        const testTime = new Date();
        testTime.setMinutes(testTime.getMinutes() + 2);
        const timeString = testTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        await scheduleMedicationReminder({
          id: 'repair_test_' + Date.now(),
          name: 'Prueba de Reparación',
          dosage: '1mg',
          time: timeString,
          frequency: 'daily',
          patientProfileId: 'test'
        });

        result.testResult = '✅ Prueba de programación exitosa';
        console.log('🔧 [NotificationRepair] Prueba de programación exitosa');

        // Limpiar la prueba después de 5 segundos
        setTimeout(async () => {
          try {
            await cancelAllNotifications();
            console.log('🔧 [NotificationRepair] Prueba de notificación limpiada');
          } catch (error) {
            console.error('🔧 [NotificationRepair] Error limpiando prueba:', error);
          }
        }, 5000);

      } catch (error) {
        result.testResult = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
        result.issues.push('Error en programación de notificaciones');
        result.recommendations.push('Revisar configuración de notificaciones');
        console.error('🔧 [NotificationRepair] Error en prueba:', error);
      }

      // 6. Recomendaciones adicionales
      if (Platform.OS === 'android') {
        result.recommendations.push('Verificar optimización de batería para RecuerdaMed');
        result.recommendations.push('Verificar que el modo "No molestar" esté desactivado');
        result.recommendations.push('Verificar permisos de "Alarmas exactas" en configuración');
      }

      console.log('🔧 [NotificationRepair] Diagnóstico completado:', result);
      return result;

    } catch (error) {
      console.error('🔧 [NotificationRepair] Error en diagnóstico:', error);
      result.testResult = `❌ Error crítico: ${error instanceof Error ? error.message : String(error)}`;
      result.issues.push('Error crítico en el sistema');
      result.recommendations.push('Reiniciar la aplicación');
      return result;
    }
  }

  /**
   * Reparar el sistema de notificaciones
   */
  async repairSystem(): Promise<{
    success: boolean;
    steps: string[];
    errors: string[];
  }> {
    const result = {
      success: false,
      steps: [] as string[],
      errors: [] as string[]
    };

    try {
      console.log('🔧 [NotificationRepair] Iniciando reparación del sistema...');

      // Paso 1: Reparar permisos
      try {
        result.steps.push('1. Reparando permisos de notificación...');
        const permissionsGranted = await requestPermissions();
        if (permissionsGranted) {
          result.steps.push('✅ Permisos reparados correctamente');
        } else {
          result.errors.push('No se pudieron obtener permisos de notificación');
          result.steps.push('❌ Error obteniendo permisos');
        }
      } catch (error) {
        result.errors.push(`Error reparando permisos: ${error}`);
        result.steps.push('❌ Error en reparación de permisos');
      }

      // Paso 2: Reparar canales (Android)
      if (Platform.OS === 'android') {
        try {
          result.steps.push('2. Reparando canales de notificación...');
          const channelsSetup = await setupNotificationChannels();
          if (channelsSetup) {
            result.steps.push('✅ Canales reparados correctamente');
          } else {
            result.errors.push('Error configurando canales de notificación');
            result.steps.push('❌ Error configurando canales');
          }
        } catch (error) {
          result.errors.push(`Error reparando canales: ${error}`);
          result.steps.push('❌ Error en reparación de canales');
        }
      }

      // Paso 3: Limpiar notificaciones corruptas
      try {
        result.steps.push('3. Limpiando notificaciones corruptas...');
        await cancelAllNotifications();
        result.steps.push('✅ Notificaciones limpiadas');
      } catch (error) {
        result.errors.push(`Error limpiando notificaciones: ${error}`);
        result.steps.push('❌ Error limpiando notificaciones');
      }

      // Paso 4: Probar programación
      try {
        result.steps.push('4. Probando programación de notificaciones...');
        const testTime = new Date();
        testTime.setMinutes(testTime.getMinutes() + 3);
        const timeString = testTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        await scheduleMedicationReminder({
          id: 'repair_test_final_' + Date.now(),
          name: 'Prueba Final de Reparación',
          dosage: '1mg',
          time: timeString,
          frequency: 'daily',
          patientProfileId: 'test'
        });

        result.steps.push('✅ Programación de prueba exitosa');
        
        // Limpiar la prueba después de 10 segundos
        setTimeout(async () => {
          try {
            await cancelAllNotifications();
            console.log('🔧 [NotificationRepair] Prueba final limpiada');
          } catch (error) {
            console.error('🔧 [NotificationRepair] Error limpiando prueba final:', error);
          }
        }, 10000);

      } catch (error) {
        result.errors.push(`Error en prueba de programación: ${error}`);
        result.steps.push('❌ Error en prueba de programación');
      }

      // Determinar si la reparación fue exitosa
      result.success = result.errors.length === 0;

      if (result.success) {
        result.steps.push('🎉 Sistema de notificaciones reparado exitosamente');
      } else {
        result.steps.push('⚠️ Reparación completada con errores');
      }

      console.log('🔧 [NotificationRepair] Reparación completada:', result);
      return result;

    } catch (error) {
      console.error('🔧 [NotificationRepair] Error crítico en reparación:', error);
      result.errors.push(`Error crítico: ${error}`);
      result.steps.push('❌ Error crítico en reparación');
      return result;
    }
  }

  /**
   * Mostrar resultados del diagnóstico
   */
  showDiagnosticResults(results: any) {
    const message = `
🔍 DIAGNÓSTICO DEL SISTEMA DE NOTIFICACIONES

📱 Dispositivo: ${results.device}
🔐 Permisos: ${results.permissions}
📢 Canales: ${results.channels}
⏰ Programadas: ${results.scheduled}
🧪 Prueba: ${results.testResult}

${results.issues.length > 0 ? `
❌ PROBLEMAS DETECTADOS:
${results.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}
` : ''}

${results.recommendations.length > 0 ? `
📋 RECOMENDACIONES:
${results.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
` : '✅ Sistema funcionando correctamente'}
    `;

    Alert.alert('Diagnóstico de Notificaciones', message, [
      { text: 'OK' }
    ]);
  }

  /**
   * Mostrar resultados de la reparación
   */
  showRepairResults(results: any) {
    const message = `
🔧 REPARACIÓN DEL SISTEMA DE NOTIFICACIONES

${results.success ? '✅ REPARACIÓN EXITOSA' : '⚠️ REPARACIÓN CON ERRORES'}

PASOS EJECUTADOS:
${results.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${results.errors.length > 0 ? `
❌ ERRORES:
${results.errors.map((error, i) => `${i + 1}. ${error}`).join('\n')}
` : ''}
    `;

    Alert.alert(
      results.success ? 'Reparación Exitosa' : 'Reparación con Errores', 
      message, 
      [
        { text: 'OK' }
      ]
    );
  }

  /**
   * Ejecutar diagnóstico completo y mostrar resultados
   */
  async runFullDiagnostic() {
    try {
      const results = await this.diagnoseSystem();
      this.showDiagnosticResults(results);
      return results;
    } catch (error) {
      console.error('🔧 [NotificationRepair] Error ejecutando diagnóstico:', error);
      Alert.alert('Error', 'Error ejecutando diagnóstico de notificaciones');
      return null;
    }
  }

  /**
   * Ejecutar reparación completa y mostrar resultados
   */
  async runFullRepair() {
    try {
      const results = await this.repairSystem();
      this.showRepairResults(results);
      return results;
    } catch (error) {
      console.error('🔧 [NotificationRepair] Error ejecutando reparación:', error);
      Alert.alert('Error', 'Error ejecutando reparación de notificaciones');
      return null;
    }
  }
}

// Instancia singleton
export const notificationRepair = NotificationSystemRepair.getInstance();
