import { create } from 'zustand';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { useAuth } from './useAuth';
import { Permission } from '../types';
import { useCurrentUser } from './useCurrentUser';

export interface PermissionItem {
  id: string;
  patientId: string;
  caregiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  level?: 'READ' | 'WRITE';
  createdAt?: string;
  updatedAt?: string;
  patient?: { id: string; name?: string; age?: number; photoUrl?: string };
}

interface PermissionsState {
  // Vista paciente
  permissions: Permission[];
  getPermissions: () => Promise<void>;
  updatePermissionStatus: (id: string, status: 'ACCEPTED' | 'REJECTED') => Promise<boolean>;
  updatePermissionLevel: (id: string, level: 'READ' | 'WRITE') => Promise<boolean>;
  clearError: () => void;

  // Vista cuidador
  items: PermissionItem[];
  getCaregiverPermissions: () => Promise<void>;
  approve: (id: string) => Promise<boolean>;
  reject: (id: string) => Promise<boolean>;
  revoke: (id: string) => Promise<boolean>;
  cancel: (id: string) => Promise<boolean>;

  // Estado común
  loading: boolean;
  error: string | null;
}

export const usePermissions = create<PermissionsState>((set, get) => ({
  // Estado inicial
  permissions: [],
  items: [],
  loading: false,
  error: null,

  // ============ PACIENTE ============
  getPermissions: async () => {
    console.log('[usePermissions] Obteniendo permisos (paciente)...');
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No hay token de autenticación');

      // Obtener patientProfileId del perfil actual usando validador centralizado
      const profile = useCurrentUser.getState().validateCurrentProfile() || useCurrentUser.getState().profile;
      const patientId = profile?.patientProfileId || profile?.id;
      if (!patientId) throw new Error('No se encontró patientProfileId');

      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BY_PATIENT, { patientId });
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          set({ permissions: [], loading: false });
          return;
        }
        throw new Error(errorData.error || errorData.message || 'Error al obtener permisos');
      }
      const raw = await response.json();
      const list = Array.isArray(raw) ? raw : (raw.items || raw.data || []);
      set({ permissions: list, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Error al obtener permisos', loading: false });
    }
  },

  updatePermissionStatus: async (id, status) => {
    console.log('[usePermissions] Actualizando estado de permiso:', id, status);
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No hay token de autenticación');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BY_ID, { id });
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          set({ loading: false });
          return true;
        }
        throw new Error(errorData.error || errorData.message || 'Error al actualizar permiso');
      }
      const current = get().permissions;
      set({ permissions: current.map(p => p.id === id ? { ...p, status } as any : p), loading: false });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Error al actualizar permiso', loading: false });
      return false;
    }
  },

  updatePermissionLevel: async (id, level) => {
    console.log('[usePermissions] Actualizando nivel de permiso:', id, level);
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No hay token de autenticación');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BY_ID, { id });
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ level }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          set({ loading: false });
          return true;
        }
        throw new Error(errorData.error || errorData.message || 'Error al actualizar nivel de permiso');
      }
      const current = get().permissions;
      set({ permissions: current.map(p => p.id === id ? { ...p, level } as any : p), loading: false });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Error al actualizar nivel de permiso', loading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  getCaregiverPermissions: async () => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.CAREGIVER);
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Error al obtener permisos');
      }
      const data = await res.json();
      const items: PermissionItem[] = data.items || data.data || data || [];
      set({ items });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  approve: async (id) => {
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BY_ID, { id });
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      });
      if (!res.ok) return false;
      // refresh list
      await get().getCaregiverPermissions();
      return true;
    } catch { return false; }
  },

  reject: async (id) => {
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BY_ID, { id });
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { ...API_CONFIG.DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      if (!res.ok) return false;
      await get().getCaregiverPermissions();
      return true;
    } catch { return false; }
  },

  revoke: async (id) => {
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BY_ID, { id });
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      await get().getCaregiverPermissions();
      return true;
    } catch { return false; }
  },

  cancel: async (id) => {
    // cancelar solicitud pendiente = DELETE si backend lo permite
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BY_ID, { id });
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      await get().getCaregiverPermissions();
      return true;
    } catch { return false; }
  },
}));
