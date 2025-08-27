import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { localDB, LocalAppointment } from '../data/db';
import { syncService } from '../lib/syncService';

interface Appointment {
  id: string;
  title: string;
  dateTime: string;
  location?: string;
  description?: string;
  patientProfileId?: string;
  createdAt?: string;
  updatedAt?: string;
  isOffline?: boolean;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

interface AppointmentsState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  getAppointments: () => Promise<void>;
  createAppointment: (data: Partial<Appointment>) => Promise<void>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
}

export const useAppointments = create<AppointmentsState>((set, get) => ({
  appointments: [],
  loading: false,
  error: null,

  getAppointments: async () => {
    console.log('[useAppointments] ========== INICIO getAppointments ==========');
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      if (!profile?.id) {
        console.log('[useAppointments] ❌ No hay perfil de paciente disponible');
        throw new Error('No hay perfil de paciente');
      }
      
      console.log('[useAppointments] ✅ Perfil válido encontrado:', profile.id);
      
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Intentar obtener desde servidor si estamos online
      if (isOnline && token) {
        try {
          console.log('[useAppointments] Obteniendo citas desde servidor...');
          
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}?patientProfileId=${profile.id}`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log('[useAppointments] Respuesta del servidor:', JSON.stringify(data, null, 2));
            
            // Asegurar que siempre sea un array
            let appointments = [];
            if (Array.isArray(data)) {
              appointments = data;
            } else if (data && Array.isArray(data.items)) {
              appointments = data.items;
            } else if (data && Array.isArray(data.appointments)) {
              appointments = data.appointments;
            }
            
            console.log('[useAppointments] Citas procesadas:', appointments.length);
            
            // Guardar en base de datos local
            for (const appointment of appointments) {
              const localAppointment: LocalAppointment = {
                ...appointment,
                // Asegurar que title esté presente
                title: appointment.title || appointment.doctorName || 'Sin título',
                // Asegurar que dateTime esté presente
                dateTime: appointment.dateTime || appointment.date || appointment.scheduledFor,
                // Preservar doctorName si existe
                doctorName: appointment.doctorName || appointment.title,
                // Asegurar que patientProfileId sea string
                patientProfileId: String(appointment.patientProfileId || profile.id),
                isOffline: false,
                syncStatus: 'synced',
                // Asegurar que createdAt y updatedAt estén presentes
                createdAt: appointment.createdAt || new Date().toISOString(),
                updatedAt: appointment.updatedAt || appointment.createdAt || new Date().toISOString()
              };
              await localDB.saveAppointment(localAppointment);
            }
            
            // Combinar con citas offline
            const offlineAppointments = await localDB.getAppointments(profile.id);
            const offlineOnly = offlineAppointments.filter(apt => apt.isOffline);
            
            // Mapear las citas del servidor para que tengan el formato correcto
            const mappedAppointments = appointments.map((appointment: any) => ({
              ...appointment,
              title: appointment.title || appointment.doctorName || 'Sin título',
              dateTime: appointment.dateTime || appointment.date || appointment.scheduledFor,
              doctorName: appointment.doctorName || appointment.title,
              // Asegurar que patientProfileId sea string
              patientProfileId: String(appointment.patientProfileId || profile.id),
              // Asegurar que createdAt y updatedAt estén presentes
              createdAt: appointment.createdAt || new Date().toISOString(),
              updatedAt: appointment.updatedAt || appointment.createdAt || new Date().toISOString(),
            }));
            
            const allAppointments = [...mappedAppointments, ...offlineOnly];
            
            set({ appointments: allAppointments });
            return;
          } else if (res.status === 404) {
            console.log('[useAppointments] No hay citas disponibles (404)');
            // Cargar solo datos offline
            const offlineAppointments = await localDB.getAppointments(profile.id);
            set({ appointments: offlineAppointments });
            return;
          } else {
            console.log('[useAppointments] Error de API:', res.status, res.statusText);
            throw new Error('Error al obtener citas');
          }
        } catch (serverError) {
          console.log('[useAppointments] Error obteniendo desde servidor:', serverError);
        }
      }
      
      // Si estamos offline o falló el servidor, cargar desde base de datos local
      console.log('[useAppointments] Cargando citas desde base de datos local...');
      try {
        const localAppointments = await localDB.getAppointments(profile.id);
        set({ appointments: localAppointments });
      } catch (offlineError) {
        console.log('[useAppointments] Error cargando datos locales:', offlineError);
        set({ appointments: [] });
      }
      
    } catch (err: any) {
      console.log('ERROR en getAppointments:', err.message);
      set({ error: err.message, appointments: [] });
    } finally {
      set({ loading: false });
    }
  },

  createAppointment: async (data) => {
    console.log('[useAppointments] ========== INICIO createAppointment ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Validar datos de entrada
      if (!data.title || !data.dateTime) {
        throw new Error('Título y fecha/hora son requeridos');
      }
      
      if (!profile?.id) {
        throw new Error('No hay perfil de paciente disponible');
      }
      
      // VERIFICAR CONECTIVIDAD - NO PERMITIR AGREGAR SI ESTÁ OFFLINE
      if (!isOnline) {
        throw new Error('No hay conexión a internet. No se pueden agregar citas en modo offline.');
      }
      
      if (!token) {
        throw new Error('No hay token de autenticación. Inicia sesión nuevamente.');
      }
      
      // Si estamos online, intentar sincronizar directamente con el servidor
      try {
        console.log('[useAppointments] Intentando sincronizar con servidor...');
        
        const bodyData = { 
          ...data, 
          patientProfileId: profile.id 
        };
        const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE);
        
        console.log('[useAppointments] Enviando petición a:', endpoint);
        console.log('[useAppointments] Headers:', { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token.substring(0, 20)}...` });
        console.log('[useAppointments] Body:', JSON.stringify(bodyData, null, 2));
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
          body: JSON.stringify(bodyData),
        });
        
        console.log('[useAppointments] Respuesta recibida:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok
        });
        
        if (res.ok) {
          const responseData = await res.json();
          console.log('[useAppointments] Cita sincronizada exitosamente:', responseData);
          
          // Guardar en base de datos local
          const localAppointment: LocalAppointment = {
            ...responseData,
            // Asegurar que title esté presente
            title: responseData.title || responseData.doctorName || 'Sin título',
            // Asegurar que dateTime esté presente
            dateTime: responseData.dateTime || responseData.date || responseData.scheduledFor,
            // Preservar doctorName si existe
            doctorName: responseData.doctorName || responseData.title,
            // Asegurar que patientProfileId sea string
            patientProfileId: String(responseData.patientProfileId || profile.id),
            isOffline: false,
            syncStatus: 'synced',
            // Asegurar que createdAt y updatedAt estén presentes
            createdAt: responseData.createdAt || new Date().toISOString(),
            updatedAt: responseData.updatedAt || responseData.createdAt || new Date().toISOString()
          };
          await localDB.saveAppointment(localAppointment);
          
          // Recargar la lista completa
          await get().getAppointments();
          
        } else {
          // Si falla la API, no permitir guardar
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error al guardar cita en el servidor');
        }
        
      } catch (serverError: any) {
        console.log('[useAppointments] Error sincronizando con servidor:', serverError);
        console.log('[useAppointments] Detalles del error:', {
          message: serverError.message,
          stack: serverError.stack,
          name: serverError.name
        });
        throw new Error(`Error de conexión: ${serverError.message}`);
      }
      
    } catch (err: any) {
      console.log('[useAppointments] Error en createAppointment:', err.message);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateAppointment: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      if (!profile?.id) throw new Error('No hay perfil de paciente');
      
      // Actualizar localmente primero
      const currentAppointments = get().appointments;
      const updatedAppointment = currentAppointments.find(apt => apt.id === id);
      
      if (!updatedAppointment) {
        throw new Error('Cita no encontrada');
      }
      
      const newAppointment = {
        ...updatedAppointment,
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      // Guardar en base de datos local
      const localAppointment: LocalAppointment = {
        ...newAppointment,
        patientProfileId: profile.id,
        createdAt: newAppointment.createdAt || new Date().toISOString(),
        isOffline: !isOnline,
        syncStatus: isOnline ? 'synced' : 'pending'
      };
      await localDB.saveAppointment(localAppointment);
      
      // Actualizar estado local
      const updatedAppointments = currentAppointments.map(apt => 
        apt.id === id ? newAppointment : apt
      );
      set({ appointments: updatedAppointments });
      
      // Si estamos online, intentar sincronizar
      if (isOnline && token) {
        try {
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${id}`), {
            method: 'PUT',
            headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...data, patientProfileId: profile.id }),
          });
          
          if (res.ok) {
            // Marcar como sincronizado
            const syncedAppointment: LocalAppointment = {
              ...localAppointment,
              isOffline: false,
              syncStatus: 'synced'
            };
            await localDB.saveAppointment(syncedAppointment);
          } else {
            // Agregar a cola de sincronización
            await syncService.addToSyncQueue('UPDATE', 'appointments', { id, ...data });
          }
        } catch (syncError) {
          await syncService.addToSyncQueue('UPDATE', 'appointments', { id, ...data });
        }
      } else {
        // Si estamos offline, agregar a cola de sincronización
        await syncService.addToSyncQueue('UPDATE', 'appointments', { id, ...data });
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteAppointment: async (id) => {
    set({ loading: true, error: null });
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      if (!profile?.id) throw new Error('No hay perfil de paciente');
      
      // Eliminar localmente primero
      const currentAppointments = get().appointments;
      const filteredAppointments = currentAppointments.filter(apt => apt.id !== id);
      set({ appointments: filteredAppointments });
      
      // Eliminar de base de datos local
      await localDB.deleteAppointment(id);
      
      // Si estamos online, intentar sincronizar
      if (isOnline && token) {
        try {
          const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${id}?patientProfileId=${profile.id}`), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!res.ok) {
            await syncService.addToSyncQueue('DELETE', 'appointments', { id });
          }
        } catch (syncError) {
          await syncService.addToSyncQueue('DELETE', 'appointments', { id });
        }
      } else {
        await syncService.addToSyncQueue('DELETE', 'appointments', { id });
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));
