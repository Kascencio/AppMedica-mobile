import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { 
  scheduleMedicationReminder, 
  scheduleAppointmentReminder, 
  scheduleSnoozeMedication,
  cancelMedicationNotifications,
  cancelAppointmentNotifications,
  getScheduledNotifications,
  getNotificationStats,
  cleanupOldNotifications
} from '../lib/notifications';
import { useCurrentUser } from '../store/useCurrentUser';

export interface AlarmConfig {
  id: string;
  type: 'medication' | 'appointment' | 'snooze';
  title: string;
  message: string;
  time: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  startDate?: Date;
  endDate?: Date;
  data?: any;
}

export function useAlarms() {
  const [alarms, setAlarms] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { profile } = useCurrentUser();

  // Cargar alarmas programadas
  const loadAlarms = useCallback(async () => {
    try {
      setLoading(true);
      const scheduled = await getScheduledNotifications();
      setAlarms(scheduled);
      
      // Obtener estadísticas
      const alarmStats = await getNotificationStats();
      setStats(alarmStats);
    } catch (error) {
      console.error('[useAlarms] Error cargando alarmas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Programar alarma de medicamento
  const scheduleMedicationAlarm = useCallback(async (config: {
    id: string;
    name: string;
    dosage: string;
    time: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    startDate?: Date;
    endDate?: Date;
  }) => {
    try {
      if (!profile?.patientProfileId && !profile?.id) {
        throw new Error('Perfil de usuario no disponible');
      }

      await scheduleMedicationReminder({
        id: config.id,
        name: config.name,
        dosage: config.dosage,
        time: config.time,
        frequency: config.frequency || 'daily',
        startDate: config.startDate,
        endDate: config.endDate,
        patientProfileId: profile.patientProfileId || profile.id,
      });

      // Recargar alarmas
      await loadAlarms();
      
      return true;
    } catch (error) {
      console.error('[useAlarms] Error programando alarma de medicamento:', error);
      Alert.alert('Error', 'No se pudo programar la alarma del medicamento');
      return false;
    }
  }, [profile?.id, loadAlarms]);

  // Programar alarma de cita
  const scheduleAppointmentAlarm = useCallback(async (config: {
    id: string;
    title: string;
    location: string;
    dateTime: Date;
    reminderMinutes?: number;
  }) => {
    try {
      if (!profile?.patientProfileId && !profile?.id) {
        throw new Error('Perfil de usuario no disponible');
      }

      await scheduleAppointmentReminder({
        id: config.id,
        title: config.title,
        location: config.location,
        dateTime: config.dateTime,
        reminderMinutes: config.reminderMinutes || 60,
        patientProfileId: profile.patientProfileId || profile.id,
      });

      // Recargar alarmas
      await loadAlarms();
      
      return true;
    } catch (error) {
      console.error('[useAlarms] Error programando alarma de cita:', error);
      Alert.alert('Error', 'No se pudo programar la alarma de la cita');
      return false;
    }
  }, [profile?.id, loadAlarms]);

  // Posponer medicamento
  const snoozeMedication = useCallback(async (config: {
    id: string;
    name: string;
    dosage: string;
    snoozeMinutes?: number;
  }) => {
    try {
      if (!profile?.id) {
        throw new Error('Perfil de usuario no disponible');
      }

      const snoozeId = await scheduleSnoozeMedication({
        id: config.id,
        name: config.name,
        dosage: config.dosage,
        snoozeMinutes: config.snoozeMinutes || 10,
        patientProfileId: profile.patientProfileId || profile.id,
      });

      // Recargar alarmas
      await loadAlarms();
      
      return snoozeId;
    } catch (error) {
      console.error('[useAlarms] Error posponiendo medicamento:', error);
      Alert.alert('Error', 'No se pudo posponer la alarma del medicamento');
      return null;
    }
  }, [profile?.id, loadAlarms]);

  // Cancelar alarma de medicamento
  const cancelMedicationAlarm = useCallback(async (medicationId: string) => {
    try {
      await cancelMedicationNotifications(medicationId);
      await loadAlarms();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error cancelando alarma de medicamento:', error);
      return false;
    }
  }, [loadAlarms]);

  // Cancelar alarma de cita
  const cancelAppointmentAlarm = useCallback(async (appointmentId: string) => {
    try {
      await cancelAppointmentNotifications(appointmentId);
      await loadAlarms();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error cancelando alarma de cita:', error);
      return false;
    }
  }, [loadAlarms]);

  // Limpiar alarmas antiguas
  const cleanupAlarms = useCallback(async () => {
    try {
      await cleanupOldNotifications();
      await loadAlarms();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error limpiando alarmas antiguas:', error);
      return false;
    }
  }, [loadAlarms]);

  // Obtener próximas alarmas
  const getUpcomingAlarms = useCallback(() => {
    const now = new Date();
    return alarms
      .filter(alarm => {
        if (alarm.trigger?.date) {
          return new Date(alarm.trigger.date) > now;
        }
        return true; // Las alarmas recurrentes siempre están activas
      })
      .sort((a, b) => {
        if (a.trigger?.date && b.trigger?.date) {
          return new Date(a.trigger.date).getTime() - new Date(b.trigger.date).getTime();
        }
        return 0;
      })
      .slice(0, 5); // Solo las próximas 5
  }, [alarms]);

  // Obtener alarmas por tipo
  const getAlarmsByType = useCallback((type: string) => {
    return alarms.filter(alarm => alarm.content?.data?.type === type);
  }, [alarms]);

  // Verificar si una alarma está activa
  const isAlarmActive = useCallback((identifier: string) => {
    return alarms.some(alarm => alarm.identifier === identifier);
  }, [alarms]);

  // Cargar alarmas al montar el hook
  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  // Limpiar alarmas antiguas cada día
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupAlarms();
    }, 24 * 60 * 60 * 1000); // 24 horas

    return () => clearInterval(cleanupInterval);
  }, [cleanupAlarms]);

  return {
    // Estado
    alarms,
    stats,
    loading,
    
    // Acciones
    loadAlarms,
    scheduleMedicationAlarm,
    scheduleAppointmentAlarm,
    snoozeMedication,
    cancelMedicationAlarm,
    cancelAppointmentAlarm,
    cleanupAlarms,
    
    // Utilidades
    getUpcomingAlarms,
    getAlarmsByType,
    isAlarmActive,
  };
}
