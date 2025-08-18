import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  type?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  // ...otros campos
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
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/medications?patientProfileId=${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al obtener medicamentos');
      const data = await res.json();
      console.log('RESPUESTA CRUDA MEDICAMENTOS:', JSON.stringify(data));
      set({ medications: data.items });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createMedication: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch('http://72.60.30.129:3001/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al crear medicamento');
      await get().getMedications();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  updateMedication: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/medications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al actualizar medicamento');
      await get().getMedications();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteMedication: async (id) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/medications/${id}?patientProfileId=${profile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al eliminar medicamento');
      await get().getMedications();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));

// Comentario: Llama useMedications().getMedications() en la pantalla para cargar la lista real.
