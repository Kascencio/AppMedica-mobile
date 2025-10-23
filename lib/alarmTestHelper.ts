// lib/alarmTestHelper.ts
import { unifiedAlarmService } from './unifiedAlarmService';
import { alarmSystemInitializer } from './alarmSystemInitializer';

/**
 * Herramientas para probar y diagnosticar el sistema de alarmas
 */
export class AlarmTestHelper {
  
  /**
   * Programar una alarma de prueba que se ejecute en 30 segundos
   */
  public static async scheduleTestAlarm(type: 'medication' | 'appointment' | 'treatment' = 'medication'): Promise<void> {
    try {
      console.log('[AlarmTestHelper] 🧪 Programando alarma de prueba...');
      
      // Asegurar que el sistema esté inicializado
      await alarmSystemInitializer.initialize();
      
      const testDate = new Date(Date.now() + 30000); // 30 segundos
      
      const testData = {
        type: type.toUpperCase(),
        kind: type === 'medication' ? 'MED' : type.toUpperCase(),
        medicationId: type === 'medication' ? 'test-med-001' : undefined,
        appointmentId: type === 'appointment' ? 'test-apt-001' : undefined,
        treatmentId: type === 'treatment' ? 'test-treat-001' : undefined,
        refId: `test-${type}-001`,
        medicationName: type === 'medication' ? 'Medicamento de Prueba' : undefined,
        appointmentTitle: type === 'appointment' ? 'Cita de Prueba' : undefined,
        treatmentName: type === 'treatment' ? 'Tratamiento de Prueba' : undefined,
        name: type === 'medication' ? 'Medicamento de Prueba' : 
              type === 'appointment' ? 'Cita de Prueba' : 
              'Tratamiento de Prueba',
        dosage: type === 'medication' ? '1 pastilla' : undefined,
        location: type === 'appointment' ? 'Consultorio 123' : undefined,
        description: type === 'treatment' ? 'Descripción del tratamiento de prueba' : undefined,
        scheduledFor: testDate.toISOString(),
        test: true,
        isAlarm: true
      };
      
      const title = type === 'medication' ? '💊 Alarma de Medicamento' :
                   type === 'appointment' ? '📅 Alarma de Cita' :
                   '🏥 Alarma de Tratamiento';
      
      const body = type === 'medication' ? 'Es hora de tomar tu medicamento de prueba' :
                  type === 'appointment' ? 'Tienes una cita de prueba' :
                  'Es hora de tu tratamiento de prueba';
      
      const alarmId = await unifiedAlarmService.scheduleAlarm({
        id: `test-${type}-${Date.now()}`,
        title,
        body,
        data: testData,
        triggerDate: testDate
      });
      
      if (alarmId) {
        console.log('[AlarmTestHelper] ✅ Alarma de prueba programada para:', testDate.toLocaleString());
        console.log('[AlarmTestHelper] ID de alarma:', alarmId);
        console.log('[AlarmTestHelper] Tipo:', type);
      } else {
        console.error('[AlarmTestHelper] ❌ Error programando alarma de prueba');
      }
      
    } catch (error) {
      console.error('[AlarmTestHelper] Error en alarma de prueba:', error);
    }
  }
  
  /**
   * Activar alarma de prueba inmediata
   */
  public static async triggerImmediateTestAlarm(type: 'medication' | 'appointment' | 'treatment' = 'medication'): Promise<void> {
    try {
      console.log('[AlarmTestHelper] 🚨 Activando alarma de prueba inmediata...');
      
      const testData = {
        type: type.toUpperCase(),
        kind: type === 'medication' ? 'MED' : type.toUpperCase(),
        refId: `immediate-test-${type}`,
        name: `Alarma Inmediata de ${type === 'medication' ? 'Medicamento' : 
                                   type === 'appointment' ? 'Cita' : 'Tratamiento'}`,
        dosage: type === 'medication' ? '1 pastilla' : undefined,
        location: type === 'appointment' ? 'Consultorio Prueba' : undefined,
        description: type === 'treatment' ? 'Tratamiento de prueba inmediato' : undefined,
        scheduledFor: new Date().toISOString(),
        test: true,
        isAlarm: true
      };
      
      // Activar efectos de alarma directamente
      await unifiedAlarmService.startAlarmEffects(testData);
      
      // Navegar a pantalla de alarma
      await unifiedAlarmService.onNotificationReceivedInForeground(testData);
      
      console.log('[AlarmTestHelper] ✅ Alarma inmediata activada');
      
    } catch (error) {
      console.error('[AlarmTestHelper] Error en alarma inmediata:', error);
    }
  }
  
  /**
   * Obtener estado del sistema de alarmas
   */
  public static async getSystemStatus(): Promise<any> {
    try {
      const status = await alarmSystemInitializer.getSystemStatus();
      const scheduledAlarms = await unifiedAlarmService.getScheduledAlarms();
      
      return {
        ...status,
        scheduledAlarmsCount: scheduledAlarms.length,
        scheduledAlarms: scheduledAlarms.map(alarm => ({
          id: alarm.identifier,
          title: alarm.content.title,
          body: alarm.content.body,
          trigger: alarm.trigger
        }))
      };
    } catch (error) {
      console.error('[AlarmTestHelper] Error obteniendo estado:', error);
      return {
        error: (error as Error)?.message || 'Error desconocido',
        isInitialized: false,
        notificationPermissions: false,
        canScheduleAlarms: false,
        unifiedServiceReady: false,
        scheduledAlarmsCount: 0,
        scheduledAlarms: []
      };
    }
  }
  
  /**
   * Cancelar todas las alarmas de prueba
   */
  public static async cancelTestAlarms(): Promise<void> {
    try {
      console.log('[AlarmTestHelper] 🧹 Cancelando alarmas de prueba...');
      
      const scheduledAlarms = await unifiedAlarmService.getScheduledAlarms();
      let cancelledCount = 0;
      
      for (const alarm of scheduledAlarms) {
        const data = alarm.content.data;
        if (data?.test === true) {
          await unifiedAlarmService.cancelAlarm(alarm.identifier);
          cancelledCount++;
        }
      }
      
      console.log(`[AlarmTestHelper] ✅ ${cancelledCount} alarmas de prueba canceladas`);
      
    } catch (error) {
      console.error('[AlarmTestHelper] Error cancelando alarmas de prueba:', error);
    }
  }
  
  /**
   * Test completo del sistema de alarmas
   */
  public static async runFullAlarmTest(): Promise<void> {
    try {
      console.log('[AlarmTestHelper] 🔥 Iniciando test completo del sistema...');
      
      // 1. Verificar estado inicial
      console.log('1. Verificando estado del sistema...');
      const initialStatus = await this.getSystemStatus();
      console.log('Estado inicial:', initialStatus);
      
      // 2. Inicializar sistema si es necesario
      if (!initialStatus.isInitialized) {
        console.log('2. Inicializando sistema...');
        await alarmSystemInitializer.initialize();
      }
      
      // 3. Programar alarma de cada tipo para 1 minuto
      console.log('3. Programando alarmas de prueba...');
      await this.scheduleTestAlarm('medication');
      await this.scheduleTestAlarm('appointment');
      await this.scheduleTestAlarm('treatment');
      
      // 4. Verificar alarmas programadas
      console.log('4. Verificando alarmas programadas...');
      const finalStatus = await this.getSystemStatus();
      console.log('Estado final:', finalStatus);
      
      console.log('[AlarmTestHelper] ✅ Test completo finalizado. Revisa los logs para detalles.');
      
    } catch (error) {
      console.error('[AlarmTestHelper] ❌ Error en test completo:', error);
    }
  }
}

// Instancia singleton
export const alarmTestHelper = AlarmTestHelper;