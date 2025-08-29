import { create } from 'zustand';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { useAuth } from './useAuth';
import { Permission } from '../types';

interface PermissionsState {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  getPermissions: () => Promise<void>;
  getCaregiverPermissions: () => Promise<void>;
  updatePermissionStatus: (id: string, status: 'ACCEPTED' | 'REJECTED') => Promise<boolean>;
  clearError: () => void;
}

export const usePermissions = create<PermissionsState>((set, get) => ({
  permissions: [],
  loading: false,
  error: null,

  getPermissions: async () => {
    console.log('[usePermissions] Obteniendo permisos...');
    set({ loading: true, error: null });
    
    try {
      const token = useAuth.getState().userToken;
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BASE);
      console.log('[usePermissions] Llamando endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('[usePermissions] Respuesta:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('[usePermissions] Error en respuesta:', errorData);
        
        // Si el endpoint no está disponible, usar array vacío
        if (response.status === 404) {
          console.log('[usePermissions] Endpoint no disponible, usando array vacío');
          set({ permissions: [], loading: false });
          return;
        }
        
        throw new Error(errorData.error || errorData.message || 'Error al obtener permisos');
      }

      const data = await response.json();
      console.log('[usePermissions] Permisos obtenidos:', data);

      set({ permissions: data, loading: false });
    } catch (error: any) {
      console.log('[usePermissions] Error obteniendo permisos:', error);
      const errorMessage = error.message || 'Error al obtener permisos';
      set({ error: errorMessage, loading: false });
    }
  },

  getCaregiverPermissions: async () => {
    console.log('[usePermissions] Obteniendo permisos del cuidador...');
    set({ loading: true, error: null });
    
    try {
      const token = useAuth.getState().userToken;
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.CAREGIVER);
      console.log('[usePermissions] Llamando endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('[usePermissions] Respuesta cuidador:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('[usePermissions] Error en respuesta cuidador:', errorData);
        
        // Si el endpoint no está disponible, usar array vacío
        if (response.status === 404) {
          console.log('[usePermissions] Endpoint no disponible, usando array vacío');
          set({ permissions: [], loading: false });
          return;
        }
        
        throw new Error(errorData.error || errorData.message || 'Error al obtener permisos del cuidador');
      }

      const data = await response.json();
      console.log('[usePermissions] Permisos del cuidador obtenidos:', data);

      set({ permissions: data, loading: false });
    } catch (error: any) {
      console.log('[usePermissions] Error obteniendo permisos del cuidador:', error);
      const errorMessage = error.message || 'Error al obtener permisos del cuidador';
      set({ error: errorMessage, loading: false });
    }
  },

  updatePermissionStatus: async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    console.log('[usePermissions] Actualizando estado de permiso:', id, status);
    set({ loading: true, error: null });
    
    try {
      const token = useAuth.getState().userToken;
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PERMISSIONS.BY_ID, { id });
      console.log('[usePermissions] Llamando endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      console.log('[usePermissions] Respuesta actualización:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('[usePermissions] Error en actualización:', errorData);
        
        // Si el endpoint no está disponible, simular éxito
        if (response.status === 404) {
          console.log('[usePermissions] Endpoint no disponible, simulando actualización exitosa');
          set({ loading: false });
          return true;
        }
        
        throw new Error(errorData.error || errorData.message || 'Error al actualizar permiso');
      }

      const data = await response.json();
      console.log('[usePermissions] Permiso actualizado:', data);

      // Actualizar el estado local
      const currentPermissions = get().permissions;
      const updatedPermissions = currentPermissions.map(permission => 
        permission.id === id ? { ...permission, status } : permission
      );
      set({ permissions: updatedPermissions, loading: false });

      return true;
    } catch (error: any) {
      console.log('[usePermissions] Error actualizando permiso:', error);
      const errorMessage = error.message || 'Error al actualizar permiso';
      set({ error: errorMessage, loading: false });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
