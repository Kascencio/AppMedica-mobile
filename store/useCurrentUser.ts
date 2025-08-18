import { create } from 'zustand';
import { useAuth } from './useAuth';

interface UserProfile {
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
  role?: string;
  email?: string;
  // ...otros campos según API
}

interface CurrentUserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

export const useCurrentUser = create<CurrentUserState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      // 1. Intentar paciente
      let res = await fetch('http://72.60.30.129:3001/api/patients/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        // 2. Intentar cuidador extendido
        res = await fetch('http://72.60.30.129:3001/api/caregivers/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // 3. Intentar cuidador básico
          res = await fetch('http://72.60.30.129:3001/api/auth/caregiver/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al obtener perfil');
          }
          const data = await res.json();
          // Asegurar que tenga el rol
          if (!data.role) data.role = 'CAREGIVER';
          set({ profile: data });
          return;
        }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al obtener perfil');
      }
      const data = await res.json();
      if (!data.role) {
        data.role = res.url.includes('/caregivers/') ? 'CAREGIVER' : 'PATIENT';
      }
      set({ profile: data });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const { profile } = get();
      let endpoint = 'http://72.60.30.129:3001/api/patients/me';
      if (profile?.role === 'CAREGIVER') {
        endpoint = 'http://72.60.30.129:3001/api/caregivers/me';
      }
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al actualizar perfil');
      }
      const updated = await res.json();
      set({ profile: updated });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },
}));

// Comentario: Puedes usar useCurrentUser().profile en cualquier pantalla para acceder al perfil actual.
