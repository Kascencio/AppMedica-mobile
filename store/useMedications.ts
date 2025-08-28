import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { localDB, LocalMedication } from '../data/db';
import { syncService } from '../lib/syncService';
import { scheduleMedicationReminder } from '../lib/notifications';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  type?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  time?: string;
  patientProfileId?: string;
  createdAt?: string;
  updatedAt?: string;
  isOffline?: boolean;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

interface MedicationsState {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  getMedications: () => Promise<void>;
  createMedication: (data: Partial<Medication>) => Promise<void>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
}

export const useMedications = create<MedicationsState>((set, get) => ({
  medications: [],
  loading: false,
  error: null,

  getMedications: async () => {
    console.log('[useMedications] ========== INICIO getMedications ==========');
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      if (!profile?.id) {
        console.log('[useMedications] ❌ No hay perfil de paciente disponible');
        throw new Error('No hay perfil de paciente');
      }
      
      console.log('[useMedications] ✅ Perfil válido encontrado:', profile.id);
      
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Intentar obtener desde servidor si estamos online
      if (isOnline && token) {
        try {
          console.log('[useMedications] Obteniendo medicamentos desde servidor...');
          
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}?patientProfileId=${profile.id}`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log('[useMedications] Respuesta del servidor:', JSON.stringify(data, null, 2));
            
            // Asegurar que siempre sea un array
            let medications = [];
            if (Array.isArray(data)) {
              medications = data;
            } else if (data && Array.isArray(data.items)) {
              medications = data.items;
            } else if (data && Array.isArray(data.medications)) {
              medications = data.medications;
            }
            
            console.log('[useMedications] Medicamentos procesados:', medications.length);
            
            // Guardar en base de datos local
            for (const medication of medications) {
              const localMedication: LocalMedication = {
                ...medication,
                isOffline: false,
                syncStatus: 'synced',
                updatedAt: medication.updatedAt || medication.createdAt || new Date().toISOString()
              };
              await localDB.saveMedication(localMedication);
            }
            
            // Combinar con medicamentos offline
            const offlineMedications = await localDB.getMedications(profile.id);
            const offlineOnly = offlineMedications.filter(med => med.isOffline);
            const allMedications = [...medications, ...offlineOnly];
            
            set({ medications: allMedications });
            return;
          } else if (res.status === 404) {
            console.log('[useMedications] No hay medicamentos disponibles (404)');
            // Cargar solo datos offline
            const offlineMedications = await localDB.getMedications(profile.id);
            set({ medications: offlineMedications });
            return;
          } else {
            console.log('[useMedications] Error de API:', res.status, res.statusText);
            throw new Error('Error al obtener medicamentos');
          }
        } catch (serverError) {
          console.log('[useMedications] Error obteniendo desde servidor:', serverError);
        }
      }
      
      // Si estamos offline o falló el servidor, cargar desde base de datos local
      console.log('[useMedications] Cargando medicamentos desde base de datos local...');
      try {
        const localMedications = await localDB.getMedications(profile.id);
        set({ medications: localMedications });
      } catch (offlineError) {
        console.log('[useMedications] Error cargando datos locales:', offlineError);
        set({ medications: [] });
      }
      
    } catch (err: any) {
      console.log('ERROR en getMedications:', err.message);
      set({ error: err.message, medications: [] });
    } finally {
      set({ loading: false });
    }
  },

  createMedication: async (data) => {
    console.log('[useMedications] ========== INICIO createMedication ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Validar datos de entrada
      console.log('[useMedications] Datos recibidos:', JSON.stringify(data, null, 2));
      
      if (!data.name || !data.dosage) {
        console.log('[useMedications] ❌ Validación fallida - name:', data.name, 'dosage:', data.dosage);
        throw new Error('Nombre y dosis son requeridos');
      }
      
      console.log('[useMedications] ✅ Validación exitosa');
      
      if (!profile?.id) {
        throw new Error('No hay perfil de paciente disponible');
      }
      
      // VERIFICAR CONECTIVIDAD - NO PERMITIR AGREGAR SI ESTÁ OFFLINE
      if (!isOnline) {
        throw new Error('No hay conexión a internet. No se pueden agregar medicamentos en modo offline.');
      }
      
      if (!token) {
        throw new Error('No hay token de autenticación. Inicia sesión nuevamente.');
      }
      
      // Si estamos online, intentar sincronizar directamente con el servidor
      try {
        console.log('[useMedications] Intentando sincronizar con servidor...');
        
        const bodyData = { 
          ...data, 
          patientProfileId: profile.id 
        };
        const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.MEDICATIONS.BASE);
        
        console.log('[useMedications] Enviando petición a:', endpoint);
        console.log('[useMedications] Headers:', { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token.substring(0, 20)}...` });
        console.log('[useMedications] Body:', JSON.stringify(bodyData, null, 2));
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
          body: JSON.stringify(bodyData),
        });
        
        console.log('[useMedications] Respuesta recibida:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok
        });
        
        if (res.ok) {
          const responseData = await res.json();
          console.log('[useMedications] Medicamento sincronizado exitosamente:', responseData);
          
          // Guardar en base de datos local
          const localMedication: LocalMedication = {
            ...responseData,
            isOffline: false,
            syncStatus: 'synced',
            updatedAt: responseData.updatedAt || responseData.createdAt || new Date().toISOString()
          };
          await localDB.saveMedication(localMedication);
          
          // Recargar la lista completa
          await get().getMedications();
          
          // Programar notificaciones locales de forma segura
          try {
            if (data.startDate && data.time) {
              const success = await scheduleMedicationReminder({
                id: responseData.id,
                name: data.name,
                dosage: data.dosage,
                time: data.time,
                patientProfileId: profile.id,
              });
              
              if (!success) {
                console.log('[useMedications] No se pudo programar la notificación');
              }
            }
          } catch (notificationError) {
            console.log('[useMedications] Error programando notificaciones:', notificationError);
          }
          
        } else {
          // Si falla la API, no permitir guardar
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error al guardar medicamento en el servidor');
        }
        
      } catch (serverError: any) {
        console.log('[useMedications] Error sincronizando con servidor:', serverError);
        throw new Error(`Error de conexión: ${serverError.message}`);
      }
      
    } catch (err: any) {
      console.log('[useMedications] Error en createMedication:', err.message);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateMedication: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      if (!profile?.id) throw new Error('No hay perfil de paciente');
      
      // Actualizar localmente primero
      const currentMedications = get().medications;
      const updatedMedication = currentMedications.find(med => med.id === id);
      
      if (!updatedMedication) {
        throw new Error('Medicamento no encontrado');
      }
      
      const newMedication = {
        ...updatedMedication,
        ...data,
        updatedAt: new Date().toISOString()
      };
      
             // Guardar en base de datos local
       const localMedication: LocalMedication = {
         ...newMedication,
         patientProfileId: profile.id,
         createdAt: newMedication.createdAt || new Date().toISOString(),
         isOffline: !isOnline,
         syncStatus: isOnline ? 'synced' : 'pending'
       };
      await localDB.saveMedication(localMedication);
      
      // Actualizar estado local
      const updatedMedications = currentMedications.map(med => 
        med.id === id ? newMedication : med
      );
      set({ medications: updatedMedications });
      
      // Si estamos online, intentar sincronizar
      if (isOnline && token) {
        try {
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}/${id}`), {
            method: 'PUT',
            headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...data, patientProfileId: profile.id }),
          });
          
          if (res.ok) {
            // Marcar como sincronizado
            const syncedMedication: LocalMedication = {
              ...localMedication,
              isOffline: false,
              syncStatus: 'synced'
            };
            await localDB.saveMedication(syncedMedication);
          } else {
            // Agregar a cola de sincronización
            await syncService.addToSyncQueue('UPDATE', 'medications', { id, ...data });
          }
        } catch (syncError) {
          await syncService.addToSyncQueue('UPDATE', 'medications', { id, ...data });
        }
      } else {
        // Si estamos offline, agregar a cola de sincronización
        await syncService.addToSyncQueue('UPDATE', 'medications', { id, ...data });
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteMedication: async (id) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      if (!profile?.id) throw new Error('No hay perfil de paciente');
      
      // Eliminar localmente primero
      const currentMedications = get().medications;
      const filteredMedications = currentMedications.filter(med => med.id !== id);
      set({ medications: filteredMedications });
      
      // Eliminar de base de datos local
      await localDB.deleteMedication(id);
      
      // Si estamos online, intentar sincronizar
      if (isOnline && token) {
        try {
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.MEDICATIONS.BASE}/${id}?patientProfileId=${profile.id}`), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!res.ok) {
            await syncService.addToSyncQueue('DELETE', 'medications', { id });
          }
        } catch (syncError) {
          await syncService.addToSyncQueue('DELETE', 'medications', { id });
        }
      } else {
        await syncService.addToSyncQueue('DELETE', 'medications', { id });
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));

