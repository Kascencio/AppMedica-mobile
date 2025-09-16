import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { useCurrentUser } from './useCurrentUser';

interface AuthState {
  userToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  userId: string | null;
  userRole: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'PATIENT' | 'CAREGIVER', inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  fetchUserData: () => Promise<{ userId: string; role: string }>;
}

export const useAuth = create<AuthState>((set, get) => ({
  userToken: null,
  isAuthenticated: false,
  loading: false,
  userId: null,
  userRole: null,

  login: async (email: string, password: string) => {
    console.log('[useAuth] Iniciando login...');
    set({ loading: true });
    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: API_CONFIG.DEFAULT_HEADERS,
        body: JSON.stringify({ email, password }),
      });
      console.log('[useAuth] Respuesta login:', res.status, res.ok);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error de autenticación');
      }
      
      const data = await res.json();
      console.log('[useAuth] Login exitoso, token recibido:', data.token ? 'SÍ' : 'NO');
      
      await AsyncStorage.setItem('userToken', data.token);
      set({ userToken: data.token, isAuthenticated: true });
      
      // NO llamar fetchProfile aquí para evitar ciclo de dependencias
      console.log('[useAuth] Login completado, perfil se cargará por separado');
    } catch (error) {
      console.log('[useAuth] Error en login:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  register: async (email: string, password: string, role: 'PATIENT' | 'CAREGIVER', inviteCode?: string) => {
    console.log('[useAuth] Iniciando registro...');
    console.log('[useAuth] Datos de registro:', { email, role, inviteCode: inviteCode ? 'PRESENTE' : 'NO' });
    set({ loading: true });
    try {
      const bodyData: any = { email, password, role };
      if (inviteCode && inviteCode.trim()) {
        bodyData.inviteCode = inviteCode.trim();
      }
      
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER), {
        method: 'POST',
        headers: API_CONFIG.DEFAULT_HEADERS,
        body: JSON.stringify(bodyData),
      });
      console.log('[useAuth] Respuesta registro:', res.status, res.ok);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error de registro');
      }
      
      const data = await res.json();
      console.log('[useAuth] Registro exitoso, token recibido:', data.token ? 'SÍ' : 'NO');
      
      await AsyncStorage.setItem('userToken', data.token);
      set({ userToken: data.token, isAuthenticated: true });
      
      // NO llamar fetchProfile aquí para evitar ciclo de dependencias
      console.log('[useAuth] Registro completado, perfil se cargará por separado');
    } catch (error) {
      console.log('[useAuth] Error en registro:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      // Borrar token y perfil en AsyncStorage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userProfile');
      // Borrar datos offline en AsyncStorage
      await AsyncStorage.removeItem('offlineData');
      await AsyncStorage.removeItem('pendingSync');
    } catch (e) {
      console.error('[useAuth] Error limpiando AsyncStorage en logout:', e);
    }

    try {
      // Limpiar base de datos local (SQLite)
      const { localDB } = await import('../data/db');
      await localDB.clearAll();
    } catch (e) {
      console.error('[useAuth] Error limpiando base de datos local en logout:', e);
    }

    try {
      // Limpiar estado de stores relacionados
      const { useCurrentUser } = await import('./useCurrentUser');
      useCurrentUser.getState().resetProfile();
      const { useOffline } = await import('./useOffline');
      await useOffline.getState().clearOfflineData();
    } catch (e) {
      console.error('[useAuth] Error reseteando stores en logout:', e);
    }

    set({ userToken: null, isAuthenticated: false, userId: null, userRole: null });
  },

  loadToken: async () => {
    set({ loading: true });
    try {
      const token = await AsyncStorage.getItem('userToken');
      set({ userToken: token, isAuthenticated: !!token, loading: false });
    } catch (error) {
      console.error('[useAuth] Error cargando token:', error);
      // En caso de error, limpiar estado y continuar
      set({ userToken: null, isAuthenticated: false, loading: false });
    }
  },

  fetchUserData: async () => {
    const { userToken } = get();
    if (!userToken) {
      throw new Error('No hay token de autenticación');
    }

    console.log('[useAuth] Obteniendo datos del usuario desde /auth/me...');
    const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME), {
      method: 'GET',
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        'Authorization': `Bearer ${userToken}`,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Error al obtener datos del usuario');
    }

    const data = await res.json();
    console.log('[useAuth] Datos del usuario obtenidos:', { userId: data.id, role: data.role });
    
    set({ userId: data.id, userRole: data.role });
    return { userId: data.id, role: data.role };
  },
}));

// Comentario: Puedes expandir este hook para cargar el perfil del usuario tras login/registro.
