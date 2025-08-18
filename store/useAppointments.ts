import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';

interface Appointment {
  id: string;
  title: string;
  dateTime: string;
  location?: string;
  description?: string;
  // ...otros campos
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
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/appointments?patientProfileId=${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al obtener citas');
      const data = await res.json();
      console.log('RESPUESTA CRUDA CITAS:', JSON.stringify(data));
      set({ appointments: data.items });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createAppointment: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch('http://72.60.30.129:3001/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al crear cita');
      await get().getAppointments();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  updateAppointment: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al actualizar cita');
      await get().getAppointments();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteAppointment: async (id) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/appointments/${id}?patientProfileId=${profile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al eliminar cita');
      await get().getAppointments();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));

// Comentario: Llama useAppointments().getAppointments() en la pantalla para cargar la lista real.
