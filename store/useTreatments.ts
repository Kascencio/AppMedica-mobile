import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { localDB, LocalTreatment } from '../data/db';
import { syncService } from '../lib/syncService';

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
  getTreatments: () => Promise<void>;
  createTreatment: (data: Partial<Treatment>) => Promise<void>;
  updateTreatment: (id: string, data: Partial<Treatment>) => Promise<void>;
  deleteTreatment: (id: string) => Promise<void>;
}

export const useTreatments = create<TreatmentsState>((set, get) => ({
  treatments: [],
  loading: false,
  error: null,

  getTreatments: async () => {
    console.log('[useTreatments] ========== INICIO getTreatments ==========');
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      if (!profile?.id) {
        console.log('[useTreatments] ❌ No hay perfil de paciente disponible');
        throw new Error('No hay perfil de paciente');
      }
      
      console.log('[useTreatments] ✅ Perfil válido encontrado:', profile.id);
      
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Intentar obtener desde servidor si estamos online
      if (isOnline && token) {
        try {
          console.log('[useTreatments] Obteniendo tratamientos desde servidor...');
          
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.TREATMENTS.BASE}?patientProfileId=${profile.id}`), {
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
                isOffline: false,
                syncStatus: 'synced',
                updatedAt: treatment.updatedAt || treatment.createdAt || new Date().toISOString()
              };
              await localDB.saveTreatment(localTreatment);
            }
            
            // Combinar con tratamientos offline
            const offlineTreatments = await localDB.getTreatments(profile.id);
            const offlineOnly = offlineTreatments.filter(treat => treat.isOffline);
            const allTreatments = [...treatments, ...offlineOnly];
            
            set({ treatments: allTreatments });
            return;
          } else if (res.status === 404) {
            console.log('[useTreatments] No hay tratamientos disponibles (404)');
            // Cargar solo datos offline
            const offlineTreatments = await localDB.getTreatments(profile.id);
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
        const localTreatments = await localDB.getTreatments(profile.id);
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
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Validar datos de entrada
      if (!data.title) {
        throw new Error('Título es requerido');
      }
      
      if (!profile?.id) {
        throw new Error('No hay perfil de paciente disponible');
      }
      
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
          ...data, 
          patientProfileId: profile.id 
        };
        const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.TREATMENTS.BASE);
        
        console.log('[useTreatments] Enviando petición a:', endpoint);
        console.log('[useTreatments] Headers:', { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token.substring(0, 20)}...` });
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
            isOffline: false,
            syncStatus: 'synced',
            updatedAt: responseData.updatedAt || responseData.createdAt || new Date().toISOString()
          };
          await localDB.saveTreatment(localTreatment);
          
          // Recargar la lista completa
          await get().getTreatments();
          
        } else {
          // Si falla la API, no permitir guardar
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error al guardar tratamiento en el servidor');
        }
        
      } catch (serverError: any) {
        console.log('[useTreatments] Error sincronizando con servidor:', serverError);
        console.log('[useTreatments] Detalles del error:', {
          message: serverError.message,
          stack: serverError.stack,
          name: serverError.name
        });
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
      if (isOnline && token) {
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
      } else {
        // Si estamos offline, agregar a cola de sincronización
        await syncService.addToSyncQueue('UPDATE', 'treatments', { id, ...data });
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
      
      if (!profile?.id) throw new Error('No hay perfil de paciente');
      
      // Eliminar localmente primero
      const currentTreatments = get().treatments;
      const filteredTreatments = currentTreatments.filter(treat => treat.id !== id);
      set({ treatments: filteredTreatments });
      
      // Eliminar de base de datos local
      await localDB.deleteTreatment(id);
      
      // Si estamos online, intentar sincronizar
      if (isOnline && token) {
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
      } else {
        await syncService.addToSyncQueue('DELETE', 'treatments', { id });
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));
