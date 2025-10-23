// lib/alarmSyncService.ts
import { alarmApiService, BackendAlarm, CreateAlarmRequest } from './alarmApiService';
import { unifiedAlarmService } from './unifiedAlarmService';
import { alarmSchedulerEngine } from './alarmSchedulerEngine';
import { checkNetworkConnectivity } from './network';

/**
 * Servicio que sincroniza alarmas locales con el backend
 * Maneja la sincronización bidireccional entre alarmas locales y del servidor
 */
class AlarmSyncService {
  private syncInProgress = false;
  
  /**
   * Convertir alarma del backend a configuración local
   */
  private convertBackendToLocal(backendAlarm: BackendAlarm) {
    // Extraer hora de scheduledTime
    const scheduledDate = new Date(backendAlarm.scheduledTime);
    const timeStr = scheduledDate.toTimeString().substring(0, 5); // HH:MM
    
    return {
      id: backendAlarm.referenceId, // Usar referenceId (medicamento/cita/tratamiento)
      type: backendAlarm.type.toLowerCase() as 'medication' | 'appointment' | 'treatment',
      name: backendAlarm.title,
      time: timeStr,
      frequency: this.convertBackendFrequency(backendAlarm.frequency),
      startDate: scheduledDate,
      endDate: undefined, // Backend no maneja endDate en alarmas individuales
      daysOfWeek: backendAlarm.repeatDays,
      reminderMinutes: backendAlarm.reminderMinutes,
      data: {
        backendAlarmId: backendAlarm.id, // Importante: guardar ID de la alarma en el backend
        patientProfileId: backendAlarm.patientProfileId,
        title: backendAlarm.title,
        description: backendAlarm.description,
        snoozeDuration: backendAlarm.snoozeDuration,
        maxSnoozes: backendAlarm.maxSnoozes,
        snoozeCount: backendAlarm.snoozeCount,
        isCompleted: backendAlarm.isCompleted,
      }
    };
  }
  
  /**
   * Convertir frecuencia del backend a local
   */
  private convertBackendFrequency(backendFreq: string): 'daily' | 'weekly' | 'interval' {
    switch (backendFreq) {
      case 'DAILY': return 'daily';
      case 'WEEKLY': return 'weekly';
      case 'MONTHLY': return 'interval'; // Tratamos monthly como interval
      case 'CUSTOM': return 'weekly'; // Custom lo mapeamos a weekly con repeatDays
      default: return 'daily';
    }
  }
  
  /**
   * Convertir frecuencia local a backend
   */
  private convertLocalToBackendFrequency(localFreq: string, daysOfWeek?: number[]): 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' {
    switch (localFreq) {
      case 'daily': return 'DAILY';
      case 'weekly': return daysOfWeek && daysOfWeek.length > 0 ? 'WEEKLY' : 'DAILY';
      case 'interval': return 'CUSTOM';
      default: return 'DAILY';
    }
  }
  
  /**
   * Sincronizar alarmas con el backend
   */
  async syncAlarms(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('[AlarmSyncService] Sincronización ya en progreso');
      return false;
    }
    
    try {
      this.syncInProgress = true;
      console.log('[AlarmSyncService] 🔄 Iniciando sincronización de alarmas...');
      
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        console.log('[AlarmSyncService] Sin conexión, omitiendo sincronización');
        return false;
      }
      
      // 1. Obtener alarmas del backend
      const backendAlarms = await alarmApiService.getAllAlarms();
      console.log(`[AlarmSyncService] ${backendAlarms.length} alarmas obtenidas del backend`);
      
      // 2. Programar alarmas locales basadas en las del backend
      let syncedCount = 0;
      for (const backendAlarm of backendAlarms) {
        if (backendAlarm.isActive && !backendAlarm.isCompleted) {
          try {
            const localConfig = this.convertBackendToLocal(backendAlarm);
            
            // Cancelar alarmas existentes para este elemento
            await alarmSchedulerEngine.cancelAlarmsForElement(
              localConfig.type, 
              localConfig.id
            );
            
            // Programar nueva alarma local
            const scheduledIds = await alarmSchedulerEngine.scheduleAlarmsFromConfig(localConfig);
            
            if (scheduledIds.length > 0) {
              syncedCount++;
              console.log(`[AlarmSyncService] ✅ Sincronizada alarma: ${backendAlarm.title}`);
            }
          } catch (error) {
            console.error(`[AlarmSyncService] Error sincronizando alarma ${backendAlarm.id}:`, error);
          }
        }
      }
      
      console.log(`[AlarmSyncService] ✅ Sincronización completada: ${syncedCount}/${backendAlarms.length} alarmas`);
      return true;
      
    } catch (error) {
      console.error('[AlarmSyncService] Error en sincronización:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Crear alarma tanto local como en el backend
   */
  async createSyncedAlarm(
    type: 'medication' | 'appointment' | 'treatment',
    referenceId: string,
    config: {
      title: string;
      description?: string;
      scheduledTime: Date;
      frequency: 'daily' | 'weekly' | 'interval';
      daysOfWeek?: number[];
      reminderMinutes?: number;
      snoozeDuration?: number;
      maxSnoozes?: number;
    }
  ): Promise<{ backendAlarm?: BackendAlarm; localAlarmIds?: string[] }> {
    try {
      console.log('[AlarmSyncService] 📡 Creando alarma sincronizada...', { type, referenceId, title: config.title });
      
      const result: { backendAlarm?: BackendAlarm; localAlarmIds?: string[] } = {};
      
      // 1. Crear en el backend si hay conexión
      const isOnline = await checkNetworkConnectivity();
      if (isOnline) {
        try {
          const backendRequest: CreateAlarmRequest = {
            type: type.toUpperCase() as 'MEDICATION' | 'APPOINTMENT' | 'TREATMENT',
            referenceId,
            title: config.title,
            description: config.description,
            scheduledTime: config.scheduledTime.toISOString(),
            frequency: this.convertLocalToBackendFrequency(config.frequency, config.daysOfWeek),
            repeatDays: config.daysOfWeek,
            reminderMinutes: config.reminderMinutes,
            snoozeDuration: config.snoozeDuration || 10,
            maxSnoozes: config.maxSnoozes || 3,
          };
          
          result.backendAlarm = await alarmApiService.createAlarm(backendRequest);
          console.log('[AlarmSyncService] ✅ Alarma creada en backend:', result.backendAlarm.id);
        } catch (backendError) {
          console.error('[AlarmSyncService] Error creando alarma en backend:', backendError);
          // Continuar con creación local aunque falle el backend
        }
      }
      
      // 2. Crear alarma local
      try {
        const localConfig = {
          id: referenceId,
          type,
          name: config.title,
          time: config.scheduledTime.toTimeString().substring(0, 5),
          frequency: config.frequency,
          startDate: config.scheduledTime,
          daysOfWeek: config.daysOfWeek,
          reminderMinutes: config.reminderMinutes,
          data: {
            backendAlarmId: result.backendAlarm?.id,
            title: config.title,
            description: config.description,
            snoozeDuration: config.snoozeDuration || 10,
            maxSnoozes: config.maxSnoozes || 3,
          }
        };
        
        result.localAlarmIds = await alarmSchedulerEngine.scheduleAlarmsFromConfig(localConfig);
        console.log('[AlarmSyncService] ✅ Alarma creada localmente:', result.localAlarmIds);
      } catch (localError) {
        console.error('[AlarmSyncService] Error creando alarma local:', localError);
        throw localError;
      }
      
      return result;
    } catch (error) {
      console.error('[AlarmSyncService] Error creando alarma sincronizada:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar alarma en backend y local
   */
  async updateSyncedAlarm(
    backendAlarmId: string,
    localElementId: string,
    localElementType: 'medication' | 'appointment' | 'treatment',
    updates: {
      title?: string;
      description?: string;
      scheduledTime?: Date;
      frequency?: 'daily' | 'weekly' | 'interval';
      daysOfWeek?: number[];
      reminderMinutes?: number;
      snoozeDuration?: number;
      maxSnoozes?: number;
      isActive?: boolean;
    }
  ): Promise<boolean> {
    try {
      console.log('[AlarmSyncService] 📝 Actualizando alarma sincronizada...', backendAlarmId);
      
      // 1. Actualizar en backend si hay conexión
      const isOnline = await checkNetworkConnectivity();
      if (isOnline) {
        try {
          const backendUpdates: any = {};
          if (updates.title) backendUpdates.title = updates.title;
          if (updates.description !== undefined) backendUpdates.description = updates.description;
          if (updates.scheduledTime) backendUpdates.scheduledTime = updates.scheduledTime.toISOString();
          if (updates.frequency) {
            backendUpdates.frequency = this.convertLocalToBackendFrequency(updates.frequency, updates.daysOfWeek);
            backendUpdates.repeatDays = updates.daysOfWeek;
          }
          if (updates.reminderMinutes !== undefined) backendUpdates.reminderMinutes = updates.reminderMinutes;
          if (updates.snoozeDuration !== undefined) backendUpdates.snoozeDuration = updates.snoozeDuration;
          if (updates.maxSnoozes !== undefined) backendUpdates.maxSnoozes = updates.maxSnoozes;
          if (updates.isActive !== undefined) backendUpdates.isActive = updates.isActive;
          
          await alarmApiService.updateAlarm(backendAlarmId, backendUpdates);
          console.log('[AlarmSyncService] ✅ Alarma actualizada en backend');
        } catch (backendError) {
          console.error('[AlarmSyncService] Error actualizando alarma en backend:', backendError);
        }
      }
      
      // 2. Actualizar alarma local (reprogramar)
      try {
        // Cancelar alarmas existentes
        await alarmSchedulerEngine.cancelAlarmsForElement(localElementType, localElementId);
        
        // Reprogramar si la alarma sigue activa
        if (updates.isActive !== false) {
          const newConfig = {
            id: localElementId,
            type: localElementType,
            name: updates.title || 'Alarma actualizada',
            time: updates.scheduledTime ? updates.scheduledTime.toTimeString().substring(0, 5) : '09:00',
            frequency: updates.frequency || 'daily',
            startDate: updates.scheduledTime || new Date(),
            daysOfWeek: updates.daysOfWeek,
            reminderMinutes: updates.reminderMinutes,
            data: {
              backendAlarmId,
              title: updates.title,
              description: updates.description,
            }
          };
          
          await alarmSchedulerEngine.scheduleAlarmsFromConfig(newConfig);
        }
        
        console.log('[AlarmSyncService] ✅ Alarma actualizada localmente');
      } catch (localError) {
        console.error('[AlarmSyncService] Error actualizando alarma local:', localError);
        throw localError;
      }
      
      return true;
    } catch (error) {
      console.error('[AlarmSyncService] Error actualizando alarma sincronizada:', error);
      throw error;
    }
  }
  
  /**
   * Eliminar alarma del backend y local
   */
  async deleteSyncedAlarm(
    backendAlarmId: string,
    localElementId: string,
    localElementType: 'medication' | 'appointment' | 'treatment'
  ): Promise<boolean> {
    try {
      console.log('[AlarmSyncService] 🗑️ Eliminando alarma sincronizada...', backendAlarmId);
      
      // 1. Eliminar del backend si hay conexión
      const isOnline = await checkNetworkConnectivity();
      if (isOnline) {
        try {
          await alarmApiService.deleteAlarm(backendAlarmId);
          console.log('[AlarmSyncService] ✅ Alarma eliminada del backend');
        } catch (backendError) {
          console.error('[AlarmSyncService] Error eliminando alarma del backend:', backendError);
        }
      }
      
      // 2. Eliminar alarma local
      try {
        await alarmSchedulerEngine.cancelAlarmsForElement(localElementType, localElementId);
        console.log('[AlarmSyncService] ✅ Alarma eliminada localmente');
      } catch (localError) {
        console.error('[AlarmSyncService] Error eliminando alarma local:', localError);
        throw localError;
      }
      
      return true;
    } catch (error) {
      console.error('[AlarmSyncService] Error eliminando alarma sincronizada:', error);
      throw error;
    }
  }
  
  /**
   * Posponer alarma en backend
   */
  async snoozeAlarm(backendAlarmId: string): Promise<boolean> {
    try {
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        console.log('[AlarmSyncService] Sin conexión para posponer alarma en backend');
        return false;
      }
      
      await alarmApiService.snoozeAlarm(backendAlarmId);
      console.log('[AlarmSyncService] ✅ Alarma pospuesta en backend');
      return true;
    } catch (error) {
      console.error('[AlarmSyncService] Error posponiendo alarma:', error);
      return false;
    }
  }
  
  /**
   * Marcar alarma como completada en backend
   */
  async dismissAlarm(backendAlarmId: string): Promise<boolean> {
    try {
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        console.log('[AlarmSyncService] Sin conexión para completar alarma en backend');
        return false;
      }
      
      await alarmApiService.dismissAlarm(backendAlarmId);
      console.log('[AlarmSyncService] ✅ Alarma completada en backend');
      return true;
    } catch (error) {
      console.error('[AlarmSyncService] Error completando alarma:', error);
      return false;
    }
  }
  
  /**
   * Obtener alarmas próximas del backend
   */
  async getUpcomingAlarms(): Promise<BackendAlarm[]> {
    try {
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        return [];
      }
      
      return await alarmApiService.getUpcomingAlarms();
    } catch (error) {
      console.error('[AlarmSyncService] Error obteniendo alarmas próximas:', error);
      return [];
    }
  }
}

// Instancia singleton
export const alarmSyncService = new AlarmSyncService();