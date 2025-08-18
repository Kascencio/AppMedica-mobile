import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrentUser } from './useCurrentUser';

interface AuthState {
  userToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'PATIENT' | 'CAREGIVER') => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  userToken: null,
  isAuthenticated: false,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch('http://72.60.30.129:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error de autenticación');
      }
      const data = await res.json();
      await AsyncStorage.setItem('userToken', data.token);
      set({ userToken: data.token, isAuthenticated: true });
      // Cargar perfil tras login
      await useCurrentUser.getState().fetchProfile();
    } finally {
      set({ loading: false });
    }
  },

  register: async (email, password, role) => {
    set({ loading: true });
    try {
      const res = await fetch('http://72.60.30.129:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error de registro');
      }
      const data = await res.json();
      await AsyncStorage.setItem('userToken', data.token);
      set({ userToken: data.token, isAuthenticated: true });
      // Cargar perfil tras registro
      await useCurrentUser.getState().fetchProfile();
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
