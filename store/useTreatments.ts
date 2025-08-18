import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';

interface Treatment {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  progress?: string;
  // ...otros campos
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
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/treatments?patientProfileId=${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al obtener tratamientos');
      const data = await res.json();
      console.log('RESPUESTA CRUDA TRATAMIENTOS:', JSON.stringify(data));
      set({ treatments: data.items });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createTreatment: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch('http://72.60.30.129:3001/api/treatments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al crear tratamiento');
      await get().getTreatments();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  updateTreatment: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/treatments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al actualizar tratamiento');
      await get().getTreatments();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteTreatment: async (id) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/treatments/${id}?patientProfileId=${profile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al eliminar tratamiento');
      await get().getTreatments();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));

// Comentario: Llama useTreatments().getTreatments() en la pantalla para cargar la lista real.
