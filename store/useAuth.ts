import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { useCurrentUser } from './useCurrentUser';

interface AuthState {
  userToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'PATIENT' | 'CAREGIVER', inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  userToken: null,
  isAuthenticated: false,
  loading: false,

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
    await AsyncStorage.removeItem('userToken');
    set({ userToken: null, isAuthenticated: false });
  },

  loadToken: async () => {
    set({ loading: true });
    const token = await AsyncStorage.getItem('userToken');
    set({ userToken: token, isAuthenticated: !!token, loading: false });
  },
}));

// Comentario: Puedes expandir este hook para cargar el perfil del usuario tras login/registro.
