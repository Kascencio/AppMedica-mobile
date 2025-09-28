import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { useCaregiver } from './useCaregiver';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { localDB, LocalTreatment } from '../data/db';
import { syncService } from '../lib/syncService';
import { validateAndFormatTreatment } from '../lib/treatmentValidator';
import { alarmSchedulerEngine, AlarmConfig } from '../lib/alarmSchedulerEngine';

// Tipos locales para medicamentos dentro de un tratamiento
interface NewTreatmentMedication {
  name: string;
  dosage: string;
  frequency: string;
  type: string;
}

interface TreatmentMedication extends NewTreatmentMedication {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  medications?: TreatmentMedication[];
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
  // Medicamentos del tratamiento
  getTreatmentMedications: (treatmentId: string, patientIdOverride?: string) => Promise<TreatmentMedication[]>;
  addMedicationToTreatment: (
    treatmentId: string,
    medication: NewTreatmentMedication,
    patientIdOverride?: string
  ) => Promise<TreatmentMedication>;
  updateTreatmentMedication: (
    treatmentId: string,
    medicationId: string,
    data: Partial<NewTreatmentMedication>,
    patientIdOverride?: string
  ) => Promise<TreatmentMedication>;
  deleteTreatmentMedication: (
    treatmentId: string,
    medicationId: string,
    patientIdOverride?: string
  ) => Promise<void>;
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
        
        const { medications, ...restFormatted } = (formattedData as any);
        const bodyData: any = { 
          ...restFormatted, 
          patientProfileId: patientId
        };
        // NUEVO: no enviamos medications en el POST de tratamiento; se crearán luego
        const medicationsToCreate: NewTreatmentMedication[] = Array.isArray((data as any)?.medications)
          ? (data as any).medications
          : [];
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

          // Crear medicamentos anidados si se enviaron
          try {
            const createdTreatmentId = (responseData as any)?.id;
            if (createdTreatmentId && medicationsToCreate.length > 0) {
              await Promise.all(
                medicationsToCreate
                  .filter((m) => (m?.name || '').trim().length > 0)
                  .map((m) => {
                    const frequency = (m.frequency || 'DAILY').toUpperCase();
                    const type = (m.type || 'ORAL').toUpperCase();
                    return get().addMedicationToTreatment(createdTreatmentId, {
                      name: m.name.trim(),
                      dosage: (m.dosage || '').toString().trim(),
                      frequency,
                      type,
                    });
                  })
              );
            }
          } catch (nestedErr: any) {
            console.log('[useTreatments] Advertencia: error creando medicamentos anidados:', nestedErr?.message || nestedErr);
          }
          
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

  // ========================
  // Medicamentos por tratamiento
  // ========================
  getTreatmentMedications: async (treatmentId, patientIdOverride) => {
    const profile = useCurrentUser.getState().profile;
    const role = (profile?.role || 'PATIENT').toUpperCase();
    const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
    const patientId = patientIdOverride || (role === 'CAREGIVER' ? caregiverSelectedId : (profile?.patientProfileId || profile?.id));
    if (!patientId) throw new Error('No hay perfil de paciente');

    const token = useAuth.getState().userToken;
    const isOnline = await syncService.isOnline();
    if (!isOnline || !token) {
      // Cargar desde local si offline
      const localMeds = await localDB.getTreatmentMedications(String(patientId), String(treatmentId));
      return localMeds as any;
    }

    const patientIdForServer = (profile as any)?.patientProfileIdNumber || patientId;
    // Intentar endpoint de listado por tratamiento si el backend no tiene ruta anidada
    let endpoint = buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}?patientProfileId=${patientIdForServer}&treatmentId=${treatmentId}`);
    let res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) {
      // Fallback al endpoint anidado (por si existe en otro despliegue)
      endpoint = buildApiUrl(`${API_CONFIG.ENDPOINTS.TREATMENTS.BASE}/${treatmentId}/medications?patientProfileId=${patientIdForServer}`);
      res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    }
    if (!res.ok) {
      // Fallback a local si falla
      const localMeds = await localDB.getTreatmentMedications(String(patientId), String(treatmentId));
      return localMeds as any;
    }
    const data = await res.json();
    const meds: TreatmentMedication[] = Array.isArray(data) ? data : (data?.items || data?.medications || []);
    // Persistir localmente como sincronizadas
    for (const m of meds) {
      await localDB.saveTreatmentMedication({
        id: m.id,
        treatmentId: String(treatmentId),
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        type: (m as any).type,
        patientProfileId: String(patientIdForServer),
        createdAt: (m as any).createdAt || new Date().toISOString(),
        updatedAt: (m as any).updatedAt || new Date().toISOString(),
        isOffline: false,
        syncStatus: 'synced'
      } as any);
    }
    return meds;
  },

  addMedicationToTreatment: async (treatmentId, medication, patientIdOverride) => {
    const profile = useCurrentUser.getState().profile;
    const role = (profile?.role || 'PATIENT').toUpperCase();
    const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
    const patientId = patientIdOverride || (role === 'CAREGIVER' ? caregiverSelectedId : (profile?.patientProfileId || profile?.id));
    if (!patientId) throw new Error('No hay perfil de paciente');

    const token = useAuth.getState().userToken;
    const isOnline = await syncService.isOnline();
    if (!isOnline || !token) {
      // Guardado offline: crear ID temporal y encolar
      const tempId = `temp_med_${Date.now()}_${Math.random()}`;
      // Guardar en base local de treatment_medications como pendiente
      await localDB.saveTreatmentMedication({
        id: tempId,
        treatmentId,
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        type: medication.type,
        patientProfileId: String(patientId),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOffline: true,
        syncStatus: 'pending'
      } as any);
      await syncService.addToSyncQueue('CREATE', 'treatments', {
        __nested: 'medication',
        treatmentId,
        patientProfileId: String(patientId),
        payload: medication
      });
      return { id: tempId, ...medication } as any;
    }

    const patientIdForServer = (profile as any)?.patientProfileIdNumber || patientId;
    // Usar endpoint base de medicamentos con treatmentId en body
    const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.MEDICATIONS.BASE);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: (medication.name || '').trim(),
        dosage: (medication.dosage || '').toString().trim(),
        frequency: (medication.frequency || 'DAILY').toUpperCase(),
        type: (medication.type || 'ORAL').toUpperCase(),
        patientProfileId: patientIdForServer,
        treatmentId,
      })
    });
    if (!res.ok) {
      let errorBody: any = null;
      try {
        errorBody = await res.json();
      } catch {
        try { errorBody = await res.text(); } catch {}
      }
      console.log('[useTreatments] Error creando medicamento anidado:', {
        status: res.status,
        statusText: res.statusText,
        error: errorBody,
      });
      throw new Error('No se pudo agregar el medicamento');
    }
    const created = await res.json();
    // Guardar local como sincronizado
    await localDB.saveTreatmentMedication({
      id: created.id,
      treatmentId,
      name: created.name,
      dosage: created.dosage,
      frequency: created.frequency,
      type: created.type,
      patientProfileId: String(patientIdForServer),
      createdAt: created.createdAt || new Date().toISOString(),
      updatedAt: created.updatedAt || new Date().toISOString(),
      isOffline: false,
      syncStatus: 'synced'
    } as any);
    return created as TreatmentMedication;
  },

  updateTreatmentMedication: async (treatmentId, medicationId, data, patientIdOverride) => {
    const profile = useCurrentUser.getState().profile;
    const role = (profile?.role || 'PATIENT').toUpperCase();
    const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
    const patientId = patientIdOverride || (role === 'CAREGIVER' ? caregiverSelectedId : (profile?.patientProfileId || profile?.id));
    if (!patientId) throw new Error('No hay perfil de paciente');

    const token = useAuth.getState().userToken;
    const isOnline = await syncService.isOnline();
    if (!isOnline || !token) {
      // Guardar local en modo pendiente y encolar
      await localDB.saveTreatmentMedication({
        id: medicationId,
        treatmentId,
        name: data.name || '',
        dosage: data.dosage || '',
        frequency: data.frequency,
        type: data.type,
        patientProfileId: String(patientId),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOffline: true,
        syncStatus: 'pending'
      } as any);
      await syncService.addToSyncQueue('UPDATE', 'treatments', {
        __nested: 'medication',
        treatmentId,
        medicationId,
        patientProfileId: String(patientId),
        payload: data
      });
      return { id: medicationId, ...(data as any) } as any;
    }

    const patientIdForServer = (profile as any)?.patientProfileIdNumber || patientId;
    // Usar endpoint base de medicamentos con id
    const endpoint = buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}/${medicationId}`);
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: (data.name || '').trim(),
        dosage: (data.dosage || '').toString().trim(),
        frequency: (data.frequency || '').toString().toUpperCase() || undefined,
        type: (data.type || '').toString().toUpperCase() || undefined,
        patientProfileId: patientIdForServer,
        treatmentId,
      })
    });
    if (!res.ok) throw new Error('No se pudo actualizar el medicamento');
    const updated = await res.json();
    await localDB.saveTreatmentMedication({
      id: medicationId,
      treatmentId,
      name: updated.name || data.name || '',
      dosage: updated.dosage || data.dosage || '',
      frequency: updated.frequency || data.frequency,
      type: updated.type || data.type,
      patientProfileId: String(patientIdForServer),
      createdAt: updated.createdAt || new Date().toISOString(),
      updatedAt: updated.updatedAt || new Date().toISOString(),
      isOffline: false,
      syncStatus: 'synced'
    } as any);
    return updated as TreatmentMedication;
  },

  deleteTreatmentMedication: async (treatmentId, medicationId, patientIdOverride) => {
    const profile = useCurrentUser.getState().profile;
    const role = (profile?.role || 'PATIENT').toUpperCase();
    const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
    const patientId = patientIdOverride || (role === 'CAREGIVER' ? caregiverSelectedId : (profile?.patientProfileId || profile?.id));
    if (!patientId) throw new Error('No hay perfil de paciente');

    const token = useAuth.getState().userToken;
    const isOnline = await syncService.isOnline();
    if (!isOnline || !token) {
      await localDB.deleteTreatmentMedication(medicationId);
      await syncService.addToSyncQueue('DELETE', 'treatments', {
        __nested: 'medication',
        treatmentId,
        medicationId,
        patientProfileId: String(patientId)
      });
      return;
    }

    const patientIdForServer = (profile as any)?.patientProfileIdNumber || patientId;
    // Usar endpoint base de medicamentos con id y patientProfileId por query
    const endpoint = buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}/${medicationId}?patientProfileId=${patientIdForServer}`);
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('No se pudo eliminar el medicamento');
    await localDB.deleteTreatmentMedication(medicationId);
  },
}));
