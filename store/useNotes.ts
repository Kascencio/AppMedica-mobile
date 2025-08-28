import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { localDB } from '../data/db';
import { syncService } from '../lib/syncService';

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  patientProfileId?: string;
  createdAt?: string;
  updatedAt?: string;
  isOffline?: boolean;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

interface LocalNote {
  id: string;
  title: string;
  content: string;
  date: string;
  patientProfileId: string;
  createdAt: string;
  updatedAt: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

interface NotesState {
  notes: Note[];
  loading: boolean;
  error: string | null;
  getNotes: () => Promise<void>;
  createNote: (data: Partial<Note>) => Promise<void>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  error: null,

  getNotes: async () => {
    console.log('[useNotes] ========== INICIO getNotes ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      console.log('[useNotes] Perfil obtenido:', JSON.stringify(profile, null, 2));
      console.log('[useNotes] Estado de conexión:', isOnline);
      
      if (!profile?.id) {
        console.log('[useNotes] ❌ No hay perfil de paciente disponible');
        throw new Error('No hay perfil de paciente disponible');
      }
      
      console.log('[useNotes] ✅ Perfil válido encontrado');
      
      // Si estamos online, intentar obtener desde el servidor
      if (isOnline && token) {
        try {
          console.log('[useNotes] Obteniendo notas desde servidor...');
          
          const endpoint = buildApiUrl(`${API_CONFIG.ENDPOINTS.NOTES.BASE}?patientProfileId=${profile.id}`);
          console.log('[useNotes] Endpoint:', endpoint);
          
          const res = await fetch(endpoint, {
            headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
          });
          
          console.log('[useNotes] Respuesta del servidor:', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log('[useNotes] Datos del servidor:', JSON.stringify(data, null, 2));
            
            // Asegurar que siempre sea un array
            let notes = [];
            if (Array.isArray(data)) {
              notes = data;
            } else if (data && Array.isArray(data.items)) {
              notes = data.items;
            } else if (data && Array.isArray(data.notes)) {
              notes = data.notes;
            }
            
            console.log('[useNotes] Notas procesadas:', notes.length);
            
            // Guardar en base de datos local
            for (const note of notes) {
              const localNote: LocalNote = {
                ...note,
                isOffline: false,
                syncStatus: 'synced',
                createdAt: note.createdAt || new Date().toISOString(),
                updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
                patientProfileId: profile.id,
              };
              await localDB.saveNote(localNote);
            }
            
            // Obtener notas offline de la base de datos local
            const offlineNotes = await localDB.getNotes(profile.id);
            const offlineOnly = offlineNotes.filter(note => note.isOffline);
            
            // Combinar notas del servidor con notas offline
            const allNotes = [...notes, ...offlineOnly];
            console.log('[useNotes] Total de notas (servidor + offline):', allNotes.length);
            
            set({ notes: allNotes });
            return;
            
          } else if (res.status === 404) {
            console.log('[useNotes] No hay notas disponibles (404)');
            // Cargar solo notas offline
            const offlineNotes = await localDB.getNotes(profile.id);
            set({ notes: offlineNotes });
            return;
          } else {
            console.log('[useNotes] Error de API:', res.status, res.statusText);
            throw new Error('Error al obtener notas del servidor');
          }
          
        } catch (serverError: any) {
          console.log('[useNotes] Error obteniendo desde servidor:', serverError);
          console.log('[useNotes] Detalles del error:', {
            message: serverError.message,
            stack: serverError.stack,
            name: serverError.name
          });
        }
      }
      
      // Si estamos offline o falló el servidor, cargar desde base de datos local
      console.log('[useNotes] Cargando notas desde base de datos local...');
      try {
        const offlineNotes = await localDB.getNotes(profile.id);
        console.log('[useNotes] Notas locales encontradas:', offlineNotes.length);
        set({ notes: offlineNotes });
      } catch (offlineError) {
        console.log('[useNotes] Error cargando datos locales:', offlineError);
        set({ notes: [] });
      }
      
    } catch (err: any) {
      console.log('ERROR en getNotes:', err.message);
      set({ error: err.message, notes: [] });
    } finally {
      set({ loading: false });
    }
  },

  createNote: async (data) => {
    console.log('[useNotes] ========== INICIO createNote ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      // Validar datos de entrada
      console.log('[useNotes] Datos recibidos:', JSON.stringify(data, null, 2));
      
      if (!data.title || !data.content) {
        console.log('[useNotes] ❌ Validación fallida - title:', data.title, 'content:', data.content);
        throw new Error('Título y contenido son requeridos');
      }
      
      console.log('[useNotes] ✅ Validación exitosa');
      
      if (!profile?.id) {
        throw new Error('No hay perfil de paciente disponible');
      }
      
      // VERIFICAR CONECTIVIDAD - NO PERMITIR AGREGAR SI ESTÁ OFFLINE
      if (!isOnline) {
        throw new Error('No hay conexión a internet. No se pueden agregar notas en modo offline.');
      }
      
      if (!token) {
        throw new Error('No hay token de autenticación. Inicia sesión nuevamente.');
      }
      
      // Si estamos online, intentar sincronizar directamente con el servidor
      try {
        console.log('[useNotes] Intentando sincronizar con servidor...');
        
        const bodyData = { 
          ...data, 
          patientProfileId: profile.id 
        };
        const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.NOTES.BASE);
        
        console.log('[useNotes] Enviando petición a:', endpoint);
        console.log('[useNotes] Headers:', { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token.substring(0, 20)}...` });
        console.log('[useNotes] Body:', JSON.stringify(bodyData, null, 2));
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
          body: JSON.stringify(bodyData),
        });
        
        console.log('[useNotes] Respuesta recibida:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok
        });
        
        if (res.ok) {
          const responseData = await res.json();
          console.log('[useNotes] Nota sincronizada exitosamente:', responseData);
          
          // Guardar en base de datos local
          const localNote: LocalNote = {
            ...responseData,
            isOffline: false,
            syncStatus: 'synced',
            updatedAt: responseData.updatedAt || responseData.createdAt || new Date().toISOString()
          };
          await localDB.saveNote(localNote);
          
          // Recargar la lista completa
          await get().getNotes();
          
        } else {
          // Si falla la API, no permitir guardar
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error al guardar nota en el servidor');
        }
        
      } catch (serverError: any) {
        console.log('[useNotes] Error sincronizando con servidor:', serverError);
        console.log('[useNotes] Detalles del error:', {
          message: serverError.message,
          stack: serverError.stack,
          name: serverError.name
        });
        throw new Error(`Error de conexión: ${serverError.message}`);
      }
      
    } catch (err: any) {
      console.log('[useNotes] Error en createNote:', err.message);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateNote: async (id, data) => {
    console.log('[useNotes] ========== INICIO updateNote ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      if (!profile?.id) {
        throw new Error('No hay perfil de paciente disponible');
      }
      
      // Actualizar en base de datos local primero
      const currentNotes = get().notes;
      const noteToUpdate = currentNotes.find(note => note.id === id);
      
      if (!noteToUpdate) {
        throw new Error('Nota no encontrada');
      }
      
      const updatedNote: LocalNote = {
        ...noteToUpdate,
        ...data,
        updatedAt: new Date().toISOString(),
        isOffline: true,
        syncStatus: 'pending',
        createdAt: noteToUpdate.createdAt || new Date().toISOString(),
        patientProfileId: profile.id,
      };
      
      await localDB.saveNote(updatedNote);
      
      // Actualizar estado local
      const updatedNotes = currentNotes.map(note => 
        note.id === id ? updatedNote : note
      );
      set({ notes: updatedNotes });
      
      // Si estamos online, intentar sincronizar con el servidor
      if (isOnline && token) {
        try {
          console.log('[useNotes] Sincronizando actualización con servidor...');
          
          const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.NOTES.BY_ID, { id });
          
          const res = await fetch(endpoint, {
            method: 'PUT',
            headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...data, patientProfileId: profile.id }),
          });
          
          if (res.ok) {
            const responseData = await res.json();
            console.log('[useNotes] Nota actualizada exitosamente en servidor');
            
            // Marcar como sincronizado
            const syncedNote: LocalNote = {
              ...updatedNote,
              ...responseData,
              isOffline: false,
              syncStatus: 'synced',
              createdAt: responseData.createdAt || updatedNote.createdAt,
              updatedAt: responseData.updatedAt || updatedNote.updatedAt,
              patientProfileId: profile.id,
            };
            await localDB.saveNote(syncedNote);
            
            // Actualizar estado
            const finalNotes = updatedNotes.map(note => 
              note.id === id ? syncedNote : note
            );
            set({ notes: finalNotes });
            
          } else {
            console.log('[useNotes] Error actualizando en servidor, agregando a cola de sincronización');
            await syncService.addToSyncQueue('UPDATE', 'notes', { id, ...data });
          }
          
        } catch (syncError: any) {
          console.log('[useNotes] Error sincronizando actualización:', syncError);
          await syncService.addToSyncQueue('UPDATE', 'notes', { id, ...data });
        }
      } else {
        // Si estamos offline, agregar a cola de sincronización
        console.log('[useNotes] Modo offline, agregando a cola de sincronización');
        await syncService.addToSyncQueue('UPDATE', 'notes', { id, ...data });
      }
      
    } catch (err: any) {
      console.log('[useNotes] Error en updateNote:', err.message);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteNote: async (id) => {
    console.log('[useNotes] ========== INICIO deleteNote ==========');
    
    set({ loading: true, error: null });
    
    try {
      const profile = useCurrentUser.getState().profile;
      const isOnline = await syncService.isOnline();
      const token = useAuth.getState().userToken;
      
      if (!profile?.id) {
        throw new Error('No hay perfil de paciente disponible');
      }
      
      // Eliminar de base de datos local primero
      await localDB.deleteNote(id);
      
      // Actualizar estado local
      const currentNotes = get().notes;
      const filteredNotes = currentNotes.filter(note => note.id !== id);
      set({ notes: filteredNotes });
      
      // Si estamos online, intentar sincronizar con el servidor
      if (isOnline && token) {
        try {
          console.log('[useNotes] Sincronizando eliminación con servidor...');
          
          const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.NOTES.BY_ID, { id });
          
          const res = await fetch(endpoint, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!res.ok) {
            console.log('[useNotes] Error eliminando en servidor, agregando a cola de sincronización');
            await syncService.addToSyncQueue('DELETE', 'notes', { id });
          } else {
            console.log('[useNotes] Nota eliminada exitosamente en servidor');
          }
          
        } catch (syncError: any) {
          console.log('[useNotes] Error sincronizando eliminación:', syncError);
          await syncService.addToSyncQueue('DELETE', 'notes', { id });
        }
      } else {
        // Si estamos offline, agregar a cola de sincronización
        console.log('[useNotes] Modo offline, agregando a cola de sincronización');
        await syncService.addToSyncQueue('DELETE', 'notes', { id });
      }
      
    } catch (err: any) {
      console.log('[useNotes] Error en deleteNote:', err.message);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
