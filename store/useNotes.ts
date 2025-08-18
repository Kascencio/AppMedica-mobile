import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
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
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/notes?patientProfileId=${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al obtener notas');
      const data = await res.json();
      console.log('[NOTAS] Respuesta cruda:', JSON.stringify(data));
      if (Array.isArray(data)) {
        set({ notes: data });
      } else if (data && Array.isArray(data.items)) {
        set({ notes: data.items });
      } else {
        set({ notes: [] });
      }
    } catch (err: any) {
      console.log('[NOTAS] Error:', err.message);
      set({ error: err.message || 'Error desconocido al obtener notas' });
    } finally {
      set({ loading: false });
    }
  },

  createNote: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch('http://72.60.30.129:3001/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al crear nota');
      await get().getNotes();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  updateNote: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al actualizar nota');
      await get().getNotes();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteNote: async (id) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/notes/${id}?patientProfileId=${profile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al eliminar nota');
      await get().getNotes();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));
