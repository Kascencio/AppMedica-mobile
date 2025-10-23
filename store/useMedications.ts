import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { localDB, LocalMedication } from '../data/db';
import { syncService } from '../lib/syncService';
import { scheduleAlarmsForElement, cancelAlarmsForElement } from '../lib/alarmHelper';
import { alarmSyncService } from '../lib/alarmSyncService';
import { useIntakeEvents } from './useIntakeEvents';
import { useCaregiver } from './useCaregiver';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  type: string;
  frequency: string;
  time?: string;
  notes?: string;
  patientProfileId: string;
  treatmentId?: string;
  is_active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isOffline?: boolean;
  syncStatus?: 'pending' | 'synced' | 'failed';
  alarm_config?: any;
  startDate?: string;
  endDate?: string;
}

interface AlarmConfig {
  frequency: 'daily' | 'weekly' | 'interval';
  daysOfWeek?: number[]; // 0=Domingo
  intervalHours?: number;
}

interface MedicationsState {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  getMedications: (patientIdOverride?: string) => Promise<void>;
  createMedication: (data: Partial<Medication>) => Promise<Medication | undefined>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  scheduleMedicationAlarms: (medication: Medication, config: AlarmConfig, selectedTimes?: Date[]) => Promise<void>;
  cancelMedicationAlarms: (medicationId: string) => Promise<void>;
  rescheduleMedicationAlarms: (medication: Medication, config: AlarmConfig, selectedTimes?: Date[]) => Promise<void>;
}

// Helper to map server data to local data, ensuring required fields
const mapToLocalMedication = (med: any, patientId: string): LocalMedication => ({
  ...med,
  id: String(med.id),
  patientProfileId: String(med.patientProfileId || patientId),
  name: med.name || 'Medicamento sin nombre',
  dosage: med.dosage || 'Sin dosis',
  type: med.type || 'Pills', // Default value
  frequency: med.frequency || 'daily', // Default value
  time: med.time,
  notes: med.notes,
  is_active: med.is_active !== undefined ? med.is_active : true,
  isOffline: false,
  syncStatus: 'synced',
  createdAt: med.createdAt || new Date().toISOString(),
  updatedAt: med.updatedAt || new Date().toISOString(),
});


export const useMedications = create<MedicationsState>((set, get) => ({
  medications: [],
  loading: false,
  error: null,

  getMedications: async (patientIdOverride?: string) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
      const patientId = patientIdOverride || (profile?.role === 'CAREGIVER' ? caregiverSelectedId : profile?.patientProfileId);

      if (!patientId) {
        throw new Error('No se pudo determinar el ID del paciente.');
      }

      await localDB.ensureInitialized?.();
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;

      // Immediate local load for better UX
      const localMedications = await localDB.getMedications(patientId);
      set({ medications: localMedications });

      if (isOnline && token) {
        const numericPatientId = (profile as any)?.patientProfileIdNumber || patientId;
        const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}?patientProfileId=${numericPatientId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const serverMeds = data?.items || data?.medications || data || [];
          
          const localMeds = await localDB.getMedications(patientId);
          const serverMedsMap = new Map(serverMeds.map((m: any) => [m.id, m]));
          
          // Sync: Update local with server data, preserving pending offline changes
          for (const serverMed of serverMeds) {
            const localMed = localMeds.find(lm => lm.id === serverMed.id);
            const isPending = localMed?.syncStatus === 'pending' && new Date(localMed.updatedAt).getTime() > new Date(serverMed.updatedAt).getTime();
            if (!isPending) {
              await localDB.saveMedication(mapToLocalMedication(serverMed, patientId));
            }
          }

          // Sync: Remove local meds that are no longer on the server (unless pending)
          for (const localMed of localMeds) {
            if (!serverMedsMap.has(localMed.id) && localMed.syncStatus !== 'pending') {
              await localDB.deleteMedication(localMed.id);
            }
          }
        } else {
          console.warn(`[useMedications] API error fetching meds: ${res.status}`);
        }
      }

      // Final load from local DB to reflect all changes
      const finalMedications = await localDB.getMedications(patientId);
      set({ medications: finalMedications });

    } catch (err: any) {
      console.error('[useMedications] Error en getMedications:', err);
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createMedication: async (data) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
      const patientId = profile?.role === 'CAREGIVER' ? caregiverSelectedId : profile?.patientProfileId;
      const token = useAuth.getState().userToken;

      if (!patientId) throw new Error('Debe seleccionar un paciente.');
      if (!data.name || !data.dosage) throw new Error('Nombre y dosis son requeridos.');
      if (!token) throw new Error('No autenticado. Inicie sesión.');

      const isOnline = await syncService.isOnline();
      if (!isOnline) throw new Error('No hay conexión a internet.');

      const payload = {
        ...data,
        patientProfileId: patientId,
        type: data.type || 'Pills',
        frequency: data.frequency || 'daily',
      };

      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.MEDICATIONS.BASE), {
        method: 'POST',
        headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || res.statusText}`);
      }

      const newMedication = await res.json();
      const localMed = mapToLocalMedication(newMedication, patientId);
      await localDB.saveMedication(localMed);

      // Schedule alarms if config is provided - usando sincronización con backend
      if (data.alarm_config) {
        try {
          const alarmConfig = {
            title: `${localMed.name} - ${localMed.dosage}`,
            description: `Tomar medicamento: ${localMed.name}`,
            scheduledTime: data.alarm_config.selectedTimes?.[0] 
              ? new Date(`2024-01-01T${data.alarm_config.selectedTimes[0]}:00`)
              : new Date(),
            frequency: data.alarm_config.frequencyType === 'daily' ? 'daily' : 
                      data.alarm_config.frequencyType === 'daysOfWeek' ? 'weekly' : 'daily' as 'daily' | 'weekly' | 'interval',
            daysOfWeek: data.alarm_config.daysOfWeek,
            reminderMinutes: 0,
            snoozeDuration: 10,
            maxSnoozes: 3,
          };
          
          await alarmSyncService.createSyncedAlarm('medication', localMed.id, alarmConfig);
          console.log('[useMedications] Alarma sincronizada creada para medicamento:', localMed.name);
        } catch (alarmError) {
          console.warn('[useMedications] Error creando alarma sincronizada, usando solo local:', alarmError);
          // Fallback a alarma solo local
          await scheduleAlarmsForElement('medication', localMed.id, data.alarm_config, {
            name: localMed.name,
            dosage: localMed.dosage,
          });
        }
      }

      await get().getMedications(patientId); // Refresh list
      return localMed;

    } catch (err: any) {
      console.error('[useMedications] Error en createMedication:', err);
      set({ error: err.message });
      throw err; // Re-throw for the UI to catch
    } finally {
      set({ loading: false });
    }
  },

  updateMedication: async (id, data) => {
    set({ loading: true, error: null });
    let finalPatientId: string | undefined;

    try {
      const profile = useCurrentUser.getState().profile;
      const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
      const patientId = profile?.role === 'CAREGIVER' ? caregiverSelectedId : profile?.patientProfileId;

      if (!patientId) {
        throw new Error('No se pudo determinar el ID del paciente.');
      }
      finalPatientId = patientId; // Assign to a broader scope variable

      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado. Inicie sesión.');

      const existing = get().medications.find(m => m.id === id);
      if (!existing) throw new Error('Medicamento no encontrado.');

      const updatedMedication: Medication = { 
        ...existing, 
        ...data, 
        updatedAt: new Date().toISOString(),
        // Ensure required fields for local save have defaults
        createdAt: existing.createdAt || new Date().toISOString(),
      };
      
      // Optimistic UI update
      set({ medications: get().medications.map(m => m.id === id ? updatedMedication : m) });

      const isOnline = await syncService.isOnline();
      const payload = { ...data, patientProfileId: finalPatientId };

      if (isOnline) {
        const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}/${id}`), {
          method: 'PUT',
          headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const serverResponse = await res.json();
          const finalMed = mapToLocalMedication(serverResponse, finalPatientId);
          await localDB.saveMedication({ ...finalMed, syncStatus: 'synced', isOffline: false });
        } else {
          // If server fails, mark as pending
          await localDB.saveMedication({ ...(updatedMedication as LocalMedication), syncStatus: 'pending', isOffline: true });
          await syncService.addToSyncQueue('UPDATE', 'medications', { id, ...payload });
        }
      } else {
        // If offline, mark as pending
        await localDB.saveMedication({ ...(updatedMedication as LocalMedication), syncStatus: 'pending', isOffline: true });
        await syncService.addToSyncQueue('UPDATE', 'medications', { id, ...payload });
      }

      // If alarm config was part of the update, reschedule alarms usando sincronización
      if (data.alarm_config) {
        console.log(`[useMedications] Rescheduling alarms for ${updatedMedication.name}`);
        try {
          // Buscar el backendAlarmId del medicamento existente
          const existingMed = get().medications.find(m => m.id === id);
          const backendAlarmId = existingMed?.alarm_config?.backendAlarmId;
          
          if (backendAlarmId) {
            const alarmUpdates = {
              title: `${updatedMedication.name} - ${updatedMedication.dosage}`,
              description: `Tomar medicamento: ${updatedMedication.name}`,
              scheduledTime: data.alarm_config.selectedTimes?.[0] 
                ? new Date(`2024-01-01T${data.alarm_config.selectedTimes[0]}:00`)
                : undefined,
              frequency: data.alarm_config.frequencyType === 'daily' ? 'daily' : 
                        data.alarm_config.frequencyType === 'daysOfWeek' ? 'weekly' : 'daily' as 'daily' | 'weekly' | 'interval',
              daysOfWeek: data.alarm_config.daysOfWeek,
              snoozeDuration: 10,
              maxSnoozes: 3,
            };
            
            await alarmSyncService.updateSyncedAlarm(backendAlarmId, id, 'medication', alarmUpdates);
          } else {
            // No hay alarma backend, crear una nueva
            const alarmConfig = {
              title: `${updatedMedication.name} - ${updatedMedication.dosage}`,
              description: `Tomar medicamento: ${updatedMedication.name}`,
              scheduledTime: data.alarm_config.selectedTimes?.[0] 
                ? new Date(`2024-01-01T${data.alarm_config.selectedTimes[0]}:00`)
                : new Date(),
              frequency: data.alarm_config.frequencyType === 'daily' ? 'daily' : 
                        data.alarm_config.frequencyType === 'daysOfWeek' ? 'weekly' : 'daily' as 'daily' | 'weekly' | 'interval',
              daysOfWeek: data.alarm_config.daysOfWeek,
              reminderMinutes: 0,
              snoozeDuration: 10,
              maxSnoozes: 3,
            };
            
            await alarmSyncService.createSyncedAlarm('medication', id, alarmConfig);
          }
          
          console.log('[useMedications] Alarma sincronizada actualizada');
        } catch (alarmError) {
          console.warn('[useMedications] Error actualizando alarma sincronizada, usando solo local:', alarmError);
          // Fallback a alarmas solo locales
          await cancelAlarmsForElement('medication', id);
          await scheduleAlarmsForElement('medication', id, data.alarm_config, {
            name: updatedMedication.name,
            dosage: updatedMedication.dosage,
          });
        }
      }

    } catch (err: any) {
      console.error('[useMedications] Error en updateMedication:', err);
      set({ error: err.message });
    } finally {
      if (finalPatientId) {
        await get().getMedications(finalPatientId);
        await useIntakeEvents.getState().forceIntakeEventsRefresh(finalPatientId);
      }
      set({ loading: false });
    }
  },

  deleteMedication: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const patientId = profile?.role === 'CAREGIVER' 
        ? useCaregiver.getState().selectedPatientId 
        : profile?.patientProfileId;

      if (!patientId) throw new Error('No se pudo determinar el ID del paciente.');

      // Optimistic UI update
      set({ medications: get().medications.filter(med => med.id !== id) });
      
      // Cancel alarms - sincronizado con backend
      const existingMed = get().medications.find(m => m.id === id);
      const backendAlarmId = existingMed?.alarm_config?.backendAlarmId;
      
      if (backendAlarmId) {
        try {
          await alarmSyncService.deleteSyncedAlarm(backendAlarmId, id, 'medication');
          console.log('[useMedications] Alarma sincronizada eliminada');
        } catch (alarmError) {
          console.warn('[useMedications] Error eliminando alarma sincronizada:', alarmError);
          // Fallback a eliminar solo local
          await cancelAlarmsForElement('medication', id);
        }
      } else {
        await cancelAlarmsForElement('medication', id);
      }
      
      // Local DB deletion
      await localDB.deleteMedication(id);

      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;

      if (isOnline && token) {
        const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // If server fails, queue deletion
          await syncService.addToSyncQueue('DELETE', 'medications', { id });
        }
      } else {
        // If offline, queue deletion
        await syncService.addToSyncQueue('DELETE', 'medications', { id });
      }

    } catch (err: any) {
      console.error('[useMedications] Error en deleteMedication:', err);
      set({ error: err.message });
      // Re-fetch to restore state if deletion failed
      await get().getMedications();
    } finally {
      set({ loading: false });
    }
  },
  
  // === Alarm helpers expuestos al screen ===
  scheduleMedicationAlarms: async (medication, config, selectedTimes?: Date[]) => {
    try {
      if (!medication?.id) return;
      
      // Preparar configuración de alarma sincronizada
      const times = (selectedTimes && selectedTimes.length > 0)
        ? selectedTimes.map(d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))
        : (medication.time ? [medication.time] : ['09:00']);
      
      const firstTime = times[0];
      const scheduledTime = new Date(`2024-01-01T${firstTime}:00`);
      
      const alarmConfig = {
        title: `${medication.name} - ${medication.dosage}`,
        description: `Tomar medicamento: ${medication.name}`,
        scheduledTime,
        frequency: config.frequency === 'interval' ? 'daily' : 
                  config.frequency === 'weekly' ? 'weekly' : 'daily' as 'daily' | 'weekly' | 'interval',
        daysOfWeek: config.daysOfWeek,
        reminderMinutes: 0,
        snoozeDuration: 10,
        maxSnoozes: 3,
      };
      
      try {
        const result = await alarmSyncService.createSyncedAlarm('medication', medication.id, alarmConfig);
        console.log('[useMedications] Alarma sincronizada programada:', result);
      } catch (syncError) {
        console.warn('[useMedications] Error con alarma sincronizada, usando solo local:', syncError);
        // Fallback a alarma solo local
        const engineConfig = {
          selectedTimes: times,
          frequencyType: config.frequency === 'interval' ? 'everyXHours' : (config.frequency === 'weekly' ? 'daysOfWeek' : 'daily') as 'daily' | 'daysOfWeek' | 'everyXHours',
          daysOfWeek: config.daysOfWeek,
          everyXHours: config.intervalHours ? String(config.intervalHours) : undefined,
        };
        await scheduleAlarmsForElement('medication', medication.id, engineConfig, {
          name: medication.name,
          dosage: medication.dosage,
        });
      }
    } catch (e) {
      console.error('[useMedications] Error scheduleMedicationAlarms:', e);
      throw e;
    }
  },
  cancelMedicationAlarms: async (medicationId) => {
    try {
      if (!medicationId) return;
      
      // Buscar si tiene alarma backend asociada
      const existingMed = get().medications.find(m => m.id === medicationId);
      const backendAlarmId = existingMed?.alarm_config?.backendAlarmId;
      
      if (backendAlarmId) {
        try {
          await alarmSyncService.deleteSyncedAlarm(backendAlarmId, medicationId, 'medication');
          console.log('[useMedications] Alarma sincronizada cancelada');
        } catch (syncError) {
          console.warn('[useMedications] Error cancelando alarma sincronizada:', syncError);
          // Fallback a cancelar solo local
          await cancelAlarmsForElement('medication', medicationId);
        }
      } else {
        await cancelAlarmsForElement('medication', medicationId);
      }
    } catch (e) {
      console.error('[useMedications] Error cancelMedicationAlarms:', e);
      throw e;
    }
  },
  rescheduleMedicationAlarms: async (medication, config, selectedTimes?: Date[]) => {
    try {
      if (!medication?.id) return;
      
      // Cancelar alarmas existentes primero
      await get().cancelMedicationAlarms(medication.id);
      
      // Reprogramar con nueva configuración
      await get().scheduleMedicationAlarms(medication, config, selectedTimes);
    } catch (e) {
      console.error('[useMedications] Error rescheduleMedicationAlarms:', e);
      throw e;
    }
  },
}));

