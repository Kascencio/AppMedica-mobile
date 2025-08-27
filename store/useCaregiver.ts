import { create } from 'zustand';
import { useAuth } from './useAuth';
import { buildApiUrl, API_CONFIG } from '../constants/config';

export interface PatientProfile {
  id: string;
  name: string;
  age?: number;
  weight?: number;
  height?: number;
  allergies?: string;
  reactions?: string;
  doctorName?: string;
  doctorContact?: string;
  photoUrl?: string;
  userId?: string;
  // ...otros campos según API
}

interface CaregiverState {
  patients: PatientProfile[];
  loading: boolean;
  error: string | null;
  fetchPatients: () => Promise<void>;
  joinPatient: (code: string) => Promise<boolean>;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
}

export const useCaregiver = create<CaregiverState>((set, get) => ({
  patients: [],
  loading: false,
  error: null,
  selectedPatientId: null,
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),

  fetchPatients: async () => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.CAREGIVERS.PATIENTS), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al obtener pacientes');
      }
      const data = await res.json();
      set({ patients: data });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  joinPatient: async (patientId) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.CAREGIVERS.JOIN), {
        method: 'POST',
        headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al unirse al paciente');
      }
      // Si todo bien, recargar pacientes
      await get().fetchPatients();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },
}));
