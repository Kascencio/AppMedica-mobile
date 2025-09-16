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

export interface CaregiverProfile {
  id?: string;
  name?: string;
  phone?: string;
  relationship?: string;
  photoUrl?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CaregiverState {
  patients: PatientProfile[];
  loading: boolean;
  error: string | null;
  fetchPatients: () => Promise<void>;
  joinPatient: (code: string) => Promise<boolean>;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  // Perfil de cuidador
  caregiverProfile: CaregiverProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  fetchCaregiverProfile: () => Promise<void>;
  updateCaregiverProfile: (data: Partial<CaregiverProfile>) => Promise<boolean>;
}

export const useCaregiver = create<CaregiverState>((set, get) => ({
  patients: [],
  loading: false,
  error: null,
  selectedPatientId: null,
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
  caregiverProfile: null,
  profileLoading: false,
  profileError: null,

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
      
      // NUEVA ESTRUCTURA DEL BACKEND: items en lugar de data
      const patients = data.items || data.data || data || [];
      set({ patients });
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

  // Obtener perfil del cuidador
  fetchCaregiverProfile: async () => {
    set({ profileLoading: true, profileError: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.CAREGIVERS.ME);
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Error al obtener perfil de cuidador');
      }
      const data = await res.json();
      set({ caregiverProfile: data, profileLoading: false });
    } catch (err: any) {
      set({ profileError: err.message, profileLoading: false });
    }
  },

  // Crear/actualizar perfil del cuidador
  updateCaregiverProfile: async (data) => {
    set({ profileLoading: true, profileError: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.CAREGIVERS.ME);
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Error al actualizar perfil de cuidador');
      }
      const updated = await res.json();
      set({ caregiverProfile: updated, profileLoading: false });
      return true;
    } catch (err: any) {
      set({ profileError: err.message, profileLoading: false });
      return false;
    }
  },
}));
