import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { useCaregiver } from './useCaregiver';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { localDB, LocalTreatment } from '../data/db';
import { syncService } from '../lib/syncService';
import { validateAndFormatTreatment } from '../lib/treatmentValidator';
import { alarmSchedulerEngine, AlarmConfig } from '../lib/alarmSchedulerEngine';

interface Treatment {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  progress?: string;
  patientProfileId?: string;
  createdAt?: string;
  updatedAt?: string;
  isOffline?: boolean;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

interface TreatmentsState {
  treatments: Treatment[];
  loading: boolean;
  error: string | null;
  getTreatments: (patientIdOverride?: string) => Promise<void>;
  createTreatment: (data: Partial<Treatment>) => Promise<void>;
  updateTreatment: (id: string, data: Partial<Treatment>) => Promise<void>;
  deleteTreatment: (id: string) => Promise<void>;
  // Funciones de alarmas
  scheduleTreatmentAlarms: (treatment: Treatment, alarmConfig: Partial<AlarmConfig>) => Promise<string[]>;
  cancelTreatmentAlarms: (treatmentId: string) => Promise<number>;
  rescheduleTreatmentAlarms: (treatment: Treatment, alarmConfig: Partial<AlarmConfig>) => Promise<string[]>;
}

export const useTreatments = create<TreatmentsState>((set, get) => ({
  treatments: [],
  loading: false,
  error: null,

  getTreatments: async (patientIdOverride?: string) => {
    console.log('[useTreatments] ========== INICIO getTreatments ==========');
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const role = (profile?.role || 'PATIENT').toUpperCase();
      const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
      const patientId = patientIdOverride || (role === 'CAREGIVER' ? caregiverSelectedId : (profile?.patientProfileId || profile?.id));
      if (!patientId) {
        console.log('[useTreatments] ❌ No hay perfil de paciente disponible');
        throw new Error('No hay perfil de paciente');
      }
      
      console.log('[useTreatments] ✅ Perfil válido encontrado:', patientId);
      
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Intentar obtener desde servidor si estamos online
      if (isOnline && token) {
        try {
          console.log('[useTreatments] Obteniendo tratamientos desde servidor...');
          // Algunos backends esperan ID numérico
          const numericPatientId = (profile as any)?.patientProfileIdNumber || patientId;
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.TREATMENTS.BASE}?patientProfileId=${numericPatientId}`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log('[useTreatments] Respuesta del servidor:', JSON.stringify(data, null, 2));
            
            // Asegurar que siempre sea un array - NUEVA ESTRUCTURA DEL BACKEND
            let treatments = [];
            if (Array.isArray(data)) {
              treatments = data;
            } else if (data && Array.isArray(data.items)) {
              treatments = data.items;
            } else if (data && Array.isArray(data.treatments)) {
              treatments = data.treatments;
            }
            
            console.log('[useTreatments] Tratamientos procesados:', treatments.length);
            
            // Guardar en base de datos local
            for (const treatment of treatments) {
              const localTreatment: LocalTreatment = {
                ...treatment,
                title: (treatment as any).title || (treatment as any).name || 'Sin nombre',
                isOffline: false,
                syncStatus: 'synced',
                updatedAt: treatment.updatedAt || treatment.createdAt || new Date().toISOString()
              };
              await localDB.saveTreatment(localTreatment);
            }
            
            // Combinar con tratamientos offline
            const offlineTreatments = await localDB.getTreatments(patientId);
            const offlineOnly = offlineTreatments.filter(treat => treat.isOffline);
            const allTreatments = [...treatments, ...offlineOnly];
            
            set({ treatments: allTreatments });
            return;
          } else if (res.status === 404) {
            console.log('[useTreatments] No hay tratamientos disponibles (404)');
            // Cargar solo datos offline
            const offlineTreatments = await localDB.getTreatments(String(patientId));
            set({ treatments: offlineTreatments });
            return;
          } else {
            console.log('[useTreatments] Error de API:', res.status, res.statusText);
            throw new Error('Error al obtener tratamientos');
          }
        } catch (serverError) {
          console.log('[useTreatments] Error obteniendo desde servidor:', serverError);
        }
      }
      
      // Si estamos offline o falló el servidor, cargar desde base de datos local
      console.log('[useTreatments] Cargando tratamientos desde base de datos local...');
      try {
        const localTreatments = await localDB.getTreatments(String(patientId));
        set({ treatments: localTreatments });
      } catch (offlineError) {
        console.log('[useTreatments] Error cargando datos locales:', offlineError);
        set({ treatments: [] });
      }
      
    } catch (err: any) {
      console.log('ERROR en getTreatments:', err.message);
      set({ error: err.message, treatments: [] });
    } finally {
      set({ loading: false });
    }
  },

  createTreatment: async (data) => {
    console.log('[useTreatments] ========== INICIO createTreatment ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const role = (profile?.role || 'PATIENT').toUpperCase();
      const selectedPatientId = useCaregiver.getState().selectedPatientId;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Validar y formatear datos usando el validador
      const validation = validateAndFormatTreatment(data as any);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      const formattedData = validation.formattedData;
      
      // Determinar patientId según rol
      let patientId: string | undefined = undefined;
      if (role === 'CAREGIVER') {
        patientId = selectedPatientId || undefined;
        if (!patientId) {
          throw new Error('Selecciona un paciente para agregar tratamientos');
        }
      } else {
        patientId = profile?.patientProfileId || profile?.id;
      }
      if (!patientId) {
        throw new Error('No hay perfil de paciente disponible');
      }
      
      console.log('[useTreatments] IDs disponibles:', {
        patientProfileId: profile.patientProfileId,
        id: profile.id,
        selectedPatientId: patientId
      });
      
      // VERIFICAR CONECTIVIDAD - NO PERMITIR AGREGAR SI ESTÁ OFFLINE
      if (!isOnline) {
        throw new Error('No hay conexión a internet. No se pueden agregar tratamientos en modo offline.');
      }
      
      if (!token) {
        throw new Error('No hay token de autenticación. Inicia sesión nuevamente.');
      }
      
      // Si estamos online, intentar sincronizar directamente con el servidor
      try {
        console.log('[useTreatments] Intentando sincronizar con servidor...');
        
        const bodyData = { 
          ...formattedData, 
          patientProfileId: patientId
        };
        const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.TREATMENTS.BASE);
        
        console.log('[useTreatments] Enviando petición a:', endpoint);
        console.log('[useTreatments] Body:', JSON.stringify(bodyData, null, 2));
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
          body: JSON.stringify(bodyData),
        });
        
        console.log('[useTreatments] Respuesta recibida:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok
        });
        
        if (res.ok) {
          const responseData = await res.json();
          console.log('[useTreatments] Tratamiento sincronizado exitosamente:', responseData);
          
          // Guardar en base de datos local
          const localTreatment: LocalTreatment = {
            ...responseData,
            title: (responseData as any).title || (responseData as any).name || 'Sin nombre',
            isOffline: false,
            syncStatus: 'synced',
            updatedAt: responseData.updatedAt || responseData.createdAt || new Date().toISOString()
          };
          await localDB.saveTreatment(localTreatment);
          
          // Recargar la lista completa
          await get().getTreatments(patientId);
          
        } else {
          // Si falla la API, obtener detalles del error
          let errorData: any = {};
          try {
            errorData = await res.json();
            console.log('[useTreatments] Error del servidor:', errorData);
          } catch (jsonError) {
            console.log('[useTreatments] No se pudo parsear respuesta de error:', jsonError);
          }
          
          // Procesar errores de validación específicos
          let errorMessage = errorData.message || 
                            errorData.error || 
                            `Error ${res.status}: ${res.statusText}`;
          
          // Si hay errores de validación específicos, mostrarlos
          if (errorData.details && errorData.details.fieldErrors) {
            const fieldErrors = errorData.details.fieldErrors;
            const fieldErrorMessages = Object.entries(fieldErrors).map(([field, errors]) => 
              `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`
            );
            errorMessage = `Errores de validación: ${fieldErrorMessages.join('; ')}`;
          }
          
          console.log('[useTreatments] Error detallado:', {
            status: res.status,
            statusText: res.statusText,
            errorData,
            errorMessage
          });
          
          throw new Error(`Error al guardar tratamiento en el servidor: ${errorMessage}`);
        }
        
      } catch (serverError: any) {
        console.log('[useTreatments] Error sincronizando con servidor:', serverError);
        throw new Error(`Error de conexión: ${serverError.message}`);
      }
      
    } catch (err: any) {
      console.log('[useTreatments] Error en createTreatment:', err.message);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateTreatment: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Bloquear modificaciones en modo offline
      if (!isOnline) {
        throw new Error('No hay conexión a internet. No se pueden modificar tratamientos en modo offline.');
      }

      if (!profile?.id) throw new Error('No hay perfil de paciente');
      
      // Actualizar localmente primero
      const currentTreatments = get().treatments;
      const updatedTreatment = currentTreatments.find(treat => treat.id === id);
      
      if (!updatedTreatment) {
        throw new Error('Tratamiento no encontrado');
      }
      
      const newTreatment = {
        ...updatedTreatment,
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      // Guardar en base de datos local
      const localTreatment: LocalTreatment = {
        ...newTreatment,
        patientProfileId: profile.id,
        createdAt: newTreatment.createdAt || new Date().toISOString(),
        isOffline: !isOnline,
        syncStatus: isOnline ? 'synced' : 'pending'
      };
      await localDB.saveTreatment(localTreatment);
      
      // Actualizar estado local
      const updatedTreatments = currentTreatments.map(treat => 
        treat.id === id ? newTreatment : treat
      );
      set({ treatments: updatedTreatments });
      
      // Si estamos online, intentar sincronizar
      if (token) {
        try {
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.TREATMENTS.BASE}/${id}`), {
            method: 'PUT',
            headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...data, patientProfileId: profile.id }),
          });
          
          if (res.ok) {
            // Marcar como sincronizado
            const syncedTreatment: LocalTreatment = {
              ...localTreatment,
              isOffline: false,
              syncStatus: 'synced'
            };
            await localDB.saveTreatment(syncedTreatment);
          } else {
            // Agregar a cola de sincronización
            await syncService.addToSyncQueue('UPDATE', 'treatments', { id, ...data });
          }
        } catch (syncError) {
          await syncService.addToSyncQueue('UPDATE', 'treatments', { id, ...data });
        }
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteTreatment: async (id) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Bloquear eliminaciones en modo offline
      if (!isOnline) {
        throw new Error('No hay conexión a internet. No se pueden eliminar tratamientos en modo offline.');
      }

      if (!profile?.id) throw new Error('No hay perfil de paciente');
      
      // Eliminar localmente primero
      const currentTreatments = get().treatments;
      const filteredTreatments = currentTreatments.filter(treat => treat.id !== id);
      set({ treatments: filteredTreatments });
      
      // Eliminar de base de datos local
      await localDB.deleteTreatment(id);
      
      // Si estamos online, intentar sincronizar
      if (token) {
        try {
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.TREATMENTS.BASE}/${id}?patientProfileId=${profile.id}`), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!res.ok) {
            await syncService.addToSyncQueue('DELETE', 'treatments', { id });
          }
        } catch (syncError) {
          await syncService.addToSyncQueue('DELETE', 'treatments', { id });
        }
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  // Funciones de alarmas
  scheduleTreatmentAlarms: async (treatment, alarmConfig) => {
    try {
      console.log('[useTreatments] Programando alarmas para tratamiento:', treatment.title);
      
      const config: AlarmConfig = {
        id: treatment.id,
        type: 'treatment',
        name: treatment.title,
        time: alarmConfig.time || '09:00',
        frequency: alarmConfig.frequency || 'daily',
        startDate: treatment.startDate ? new Date(treatment.startDate) : new Date(),
        endDate: treatment.endDate ? new Date(treatment.endDate) : undefined,
        daysOfWeek: alarmConfig.daysOfWeek,
        intervalHours: alarmConfig.intervalHours,
        data: {
          treatmentId: treatment.id,
          treatmentName: treatment.title,
          description: treatment.description,
          patientProfileId: treatment.patientProfileId,
          instructions: treatment.description,
        },
      };

      const scheduledIds = await alarmSchedulerEngine.scheduleAlarmsFromConfig(config);
      console.log(`[useTreatments] ${scheduledIds.length} alarmas programadas para ${treatment.title}`);
      return scheduledIds;
    } catch (error) {
      console.error('[useTreatments] Error programando alarmas:', error);
      throw error;
    }
  },

  cancelTreatmentAlarms: async (treatmentId) => {
    try {
      console.log('[useTreatments] Cancelando alarmas para tratamiento:', treatmentId);
      const cancelledCount = await alarmSchedulerEngine.cancelAlarmsForElement('treatment', treatmentId);
      console.log(`[useTreatments] ${cancelledCount} alarmas canceladas para tratamiento ${treatmentId}`);
      return cancelledCount;
    } catch (error) {
      console.error('[useTreatments] Error cancelando alarmas:', error);
      throw error;
    }
  },

  rescheduleTreatmentAlarms: async (treatment, alarmConfig) => {
    try {
      console.log('[useTreatments] Reprogramando alarmas para tratamiento:', treatment.title);
      
      const config: AlarmConfig = {
        id: treatment.id,
        type: 'treatment',
        name: treatment.title,
        time: alarmConfig.time || '09:00',
        frequency: alarmConfig.frequency || 'daily',
        startDate: treatment.startDate ? new Date(treatment.startDate) : new Date(),
        endDate: treatment.endDate ? new Date(treatment.endDate) : undefined,
        daysOfWeek: alarmConfig.daysOfWeek,
        intervalHours: alarmConfig.intervalHours,
        data: {
          treatmentId: treatment.id,
          treatmentName: treatment.title,
          description: treatment.description,
          patientProfileId: treatment.patientProfileId,
          instructions: treatment.description,
        },
      };

      const scheduledIds = await alarmSchedulerEngine.rescheduleAlarmsForElement(config);
      console.log(`[useTreatments] ${scheduledIds.length} alarmas reprogramadas para ${treatment.title}`);
      return scheduledIds;
    } catch (error) {
      console.error('[useTreatments] Error reprogramando alarmas:', error);
      throw error;
    }
  },
}));
