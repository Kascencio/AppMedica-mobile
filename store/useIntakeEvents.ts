import { create } from 'zustand';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';

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
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch(`http://72.60.30.129:3001/api/intake-events?patientProfileId=${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al obtener eventos de adherencia');
      const data = await res.json();
      set({ events: data });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  registerEvent: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      const profile = useCurrentUser.getState().profile;
      if (!token || !profile?.id) throw new Error('No autenticado o sin perfil');
      const res = await fetch('http://72.60.30.129:3001/api/intake-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, patientProfileId: profile.id }),
      });
      if (!res.ok) throw new Error('Error al registrar evento de adherencia');
      await get().getEvents();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));
