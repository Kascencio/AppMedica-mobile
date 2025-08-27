import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { localDB, LocalIntakeEvent } from '../data/db';
import { syncService } from '../lib/syncService';

export type IntakeEventKind = 'MED' | 'TRT';
export type IntakeEventAction = 'TAKEN' | 'SNOOZE' | 'SKIPPED';

export interface IntakeEvent {
  id: string;
  kind: IntakeEventKind;
  refId: string;
  scheduledFor: string;
  action: IntakeEventAction;
  at: string;
  meta?: any;
  patientProfileId?: string;
  createdAt?: string;
  updatedAt?: string;
  isOffline?: boolean;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

interface IntakeEventsState {
  events: IntakeEvent[];
  loading: boolean;
  error: string | null;
  getEvents: () => Promise<void>;
  registerEvent: (data: Omit<IntakeEvent, 'id' | 'at'>) => Promise<void>;
}

export const useIntakeEvents = create<IntakeEventsState>((set, get) => ({
  events: [],
  loading: false,
  error: null,

  getEvents: async () => {
    console.log('[useIntakeEvents] ========== INICIO getEvents ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      console.log('[useIntakeEvents] Perfil obtenido:', JSON.stringify(profile, null, 2));
      console.log('[useIntakeEvents] Estado de conexión:', isOnline);
      
      if (!profile?.id) {
        console.log('[useIntakeEvents] ❌ No hay perfil de paciente disponible');
        throw new Error('No hay perfil de paciente disponible');
      }
      
      console.log('[useIntakeEvents] ✅ Perfil válido encontrado');
      
      // Si estamos online, intentar obtener desde el servidor
      if (isOnline && token) {
        try {
          console.log('[useIntakeEvents] Obteniendo eventos desde servidor...');
          
          const endpoint = buildApiUrl(`${API_CONFIG.ENDPOINTS.INTAKE_EVENTS.BASE}?patientProfileId=${profile.id}`);
          console.log('[useIntakeEvents] Endpoint:', endpoint);
          
          const res = await fetch(endpoint, {
            headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
          });
          
          console.log('[useIntakeEvents] Respuesta del servidor:', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log('[useIntakeEvents] Datos del servidor:', JSON.stringify(data, null, 2));
            
            // Asegurar que siempre sea un array
            let events = [];
            if (Array.isArray(data)) {
              events = data;
            } else if (data && Array.isArray(data.items)) {
              events = data.items;
            } else if (data && Array.isArray(data.events)) {
              events = data.events;
            }
            
            console.log('[useIntakeEvents] Eventos procesados:', events.length);
            
            // Guardar en base de datos local
            for (const event of events) {
              const localEvent: LocalIntakeEvent = {
                ...event,
                isOffline: false,
                syncStatus: 'synced',
                updatedAt: event.updatedAt || event.createdAt || new Date().toISOString()
              };
              await localDB.saveIntakeEvent(localEvent);
            }
            
            // Obtener eventos offline de la base de datos local
            const offlineEvents = await localDB.getIntakeEvents(profile.id);
            const offlineOnly = offlineEvents.filter(event => event.isOffline);
            
            // Combinar eventos del servidor con eventos offline
            const allEvents = [...events, ...offlineOnly];
            console.log('[useIntakeEvents] Total de eventos (servidor + offline):', allEvents.length);
            
            set({ events: allEvents });
            return;
            
          } else if (res.status === 404) {
            console.log('[useIntakeEvents] No hay eventos disponibles (404)');
            // Cargar solo eventos offline
            const offlineEvents = await localDB.getIntakeEvents(profile.id);
            set({ events: offlineEvents });
            return;
          } else {
            console.log('[useIntakeEvents] Error de API:', res.status, res.statusText);
            throw new Error('Error al obtener eventos del servidor');
          }
          
        } catch (serverError: any) {
          console.log('[useIntakeEvents] Error obteniendo desde servidor:', serverError);
          console.log('[useIntakeEvents] Detalles del error:', {
            message: serverError.message,
            stack: serverError.stack,
            name: serverError.name
          });
        }
      }
      
      // Si estamos offline o falló el servidor, cargar desde base de datos local
      console.log('[useIntakeEvents] Cargando eventos desde base de datos local...');
      try {
        const offlineEvents = await localDB.getIntakeEvents(profile.id);
        console.log('[useIntakeEvents] Eventos locales encontrados:', offlineEvents.length);
        set({ events: offlineEvents });
      } catch (offlineError) {
        console.log('[useIntakeEvents] Error cargando datos locales:', offlineError);
        set({ events: [] });
      }
      
    } catch (err: any) {
      console.log('ERROR en getEvents:', err.message);
      set({ error: err.message, events: [] });
    } finally {
      set({ loading: false });
    }
  },

  registerEvent: async (data) => {
    console.log('[useIntakeEvents] ========== INICIO registerEvent ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Validar datos de entrada
      console.log('[useIntakeEvents] Datos recibidos:', JSON.stringify(data, null, 2));
      
      if (!data.kind || !data.refId || !data.action) {
        console.log('[useIntakeEvents] ❌ Validación fallida - kind:', data.kind, 'refId:', data.refId, 'action:', data.action);
        throw new Error('Tipo, referencia y acción son requeridos');
      }
      
      console.log('[useIntakeEvents] ✅ Validación exitosa');
      
      if (!profile?.id) {
        throw new Error('No hay perfil de paciente disponible');
      }
      
      // VERIFICAR CONECTIVIDAD - NO PERMITIR AGREGAR SI ESTÁ OFFLINE
      if (!isOnline) {
        throw new Error('No hay conexión a internet. No se pueden registrar eventos en modo offline.');
      }
      
      if (!token) {
        throw new Error('No hay token de autenticación. Inicia sesión nuevamente.');
      }
      
      // Si estamos online, intentar sincronizar directamente con el servidor
      try {
        console.log('[useIntakeEvents] Intentando sincronizar con servidor...');
        
        const bodyData = { 
          ...data, 
          patientProfileId: profile.id,
          at: new Date().toISOString()
        };
        const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.INTAKE_EVENTS.BASE);
        
        console.log('[useIntakeEvents] Enviando petición a:', endpoint);
        console.log('[useIntakeEvents] Headers:', { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token.substring(0, 20)}...` });
        console.log('[useIntakeEvents] Body:', JSON.stringify(bodyData, null, 2));
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
          body: JSON.stringify(bodyData),
        });
        
        console.log('[useIntakeEvents] Respuesta recibida:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok
        });
        
        if (res.ok) {
          const responseData = await res.json();
          console.log('[useIntakeEvents] Evento registrado exitosamente:', responseData);
          
          // Guardar en base de datos local
          const localEvent: LocalIntakeEvent = {
            ...responseData,
            isOffline: false,
            syncStatus: 'synced',
            updatedAt: responseData.updatedAt || responseData.createdAt || new Date().toISOString()
          };
          await localDB.saveIntakeEvent(localEvent);
          
          // Recargar la lista completa
          await get().getEvents();
          
        } else {
          // Si falla la API, no permitir guardar
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error al registrar evento en el servidor');
        }
        
      } catch (serverError: any) {
        console.log('[useIntakeEvents] Error sincronizando con servidor:', serverError);
        console.log('[useIntakeEvents] Detalles del error:', {
          message: serverError.message,
          stack: serverError.stack,
          name: serverError.name
        });
        throw new Error(`Error de conexión: ${serverError.message}`);
      }
      
    } catch (err: any) {
      console.log('[useIntakeEvents] Error en registerEvent:', err.message);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
