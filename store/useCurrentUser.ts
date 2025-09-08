import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import { useOffline } from './useOffline'; // Importar useOffline
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { UserProfile } from '../types';

interface CurrentUserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  resetProfile: () => void;
  refreshProfile: () => Promise<void>;
  saveProfileLocally: (profile: UserProfile) => Promise<void>;
  loadProfileLocally: () => Promise<UserProfile | null>;
  uploadPhoto: (uri: string) => Promise<string>;
  syncProfileUpdate: (profileData: Partial<UserProfile>) => Promise<boolean>;
}

// Helper para asegurar que el objeto de perfil tenga una estructura consistente
const createDefaultProfile = (base: Partial<UserProfile>): UserProfile => ({
  id: '',
  userId: '',
  patientProfileId: '',
  name: '',
  role: 'PATIENT',
  birthDate: '',
  gender: '',
  weight: undefined,
  height: undefined,
  bloodType: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
  allergies: '',
  chronicDiseases: '',
  currentConditions: '',
  reactions: '',
  doctorName: '',
  doctorContact: '',
  hospitalReference: '',
  photoUrl: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...base,
});


export const useCurrentUser = create<CurrentUserState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  initialized: false,

  fetchProfile: async () => {
    console.log('[useCurrentUser] Iniciando fetchProfile...');
    const { loading, initialized, loadProfileLocally, saveProfileLocally } = get();

    if (loading) return console.log('[useCurrentUser] Carga en progreso, saltando.');

    set({ loading: true, error: null });

    // 1. Cargar desde local para una UI más rápida
    const localProfile = await loadProfileLocally();
    if (localProfile && !initialized) {
        console.log('[useCurrentUser] Perfil cargado desde local. Sincronizando en segundo plano...');
        set({ profile: localProfile, initialized: true });
    }

    // 2. Sincronizar con el servidor si hay token
    const token = useAuth.getState().userToken;
    if (!token) {
        console.log('[useCurrentUser] No hay token, usando perfil local si existe.');
        set({ loading: false, initialized: true }); // Marcar como inicializado
        return;
    }

    try {
        // Decodificar token para obtener datos base
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const baseProfile = {
            id: tokenPayload.profileId || tokenPayload.sub,
            userId: tokenPayload.sub,
            patientProfileId: tokenPayload.profileId,
            name: tokenPayload.patientName || 'Usuario',
            role: tokenPayload.role || 'PATIENT',
        };

        // Obtener perfil detallado del backend
        const patientId = baseProfile.patientProfileId || baseProfile.id;
        const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME, { id: patientId.toString() });
        const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });

        let finalProfile;
        if (res.ok) {
            const serverData = await res.json();
            console.log('[useCurrentUser] Perfil del servidor obtenido:', serverData);
            
            // Mapear datos del servidor a nuestro modelo de perfil
            const genderMapReverse = { 'male': 'Masculino', 'female': 'Femenino', 'other': 'Otro' };
            const mappedData = {
                ...serverData,
                birthDate: serverData.dateOfBirth || serverData.birthDate,
                gender: serverData.gender ? genderMapReverse[serverData.gender as keyof typeof genderMapReverse] || serverData.gender : undefined,
            };
            
            // Combinar datos: locales -> base del token -> del servidor
            finalProfile = { ...localProfile, ...baseProfile, ...mappedData };
        } else {
            console.warn('[useCurrentUser] No se pudo obtener perfil detallado, usando datos locales/base.');
            finalProfile = { ...localProfile, ...baseProfile };
        }

        const completeProfile = createDefaultProfile(finalProfile);

        console.log('[useCurrentUser] Perfil final combinado y limpio:', completeProfile);
        await saveProfileLocally(completeProfile);
        set({ profile: completeProfile, initialized: true });

    } catch (error: any) {
        console.error('[useCurrentUser] Error en fetchProfile:', error);
        set({ error: error.message || 'Error desconocido al obtener perfil' });
    } finally {
        set({ loading: false });
    }
},

  updateProfile: async (data) => {
    console.log('[useCurrentUser] Iniciando updateProfile (offline-first)');
    const { profile, saveProfileLocally, syncProfileUpdate } = get();
    
    if (!profile) {
      console.error('[useCurrentUser] No hay perfil para actualizar.');
      set({ error: 'No hay perfil para actualizar.' });
      return;
    }

    // Safeguard: Limpiar datos entrantes para evitar guardar valores inválidos
    const cleanedData: Partial<UserProfile> = {};
    Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
                return; // No incluir NaN o Infinity
            }
            (cleanedData as any)[key] = value;
        }
    });

    // 1. Optimistic UI Update
    const updatedProfile = { ...profile, ...cleanedData, updatedAt: new Date().toISOString() };
    set({ profile: updatedProfile, loading: false, error: null });
    console.log('[useCurrentUser] Perfil actualizado localmente (optimista)');

    // 2. Persist Locally
    await saveProfileLocally(updatedProfile);

    // 3. Sync with Server
    const { isOnline, addPendingSync } = useOffline.getState();
    if (isOnline) {
      console.log('[useCurrentUser] Online, intentando sincronizar inmediatamente...');
      const success = await syncProfileUpdate(cleanedData);
      if (!success) {
        console.log('[useCurrentUser] Sincronización falló, agregando a la cola.');
        await addPendingSync('UPDATE', 'profile', cleanedData);
      } else {
        console.log('[useCurrentUser] Sincronización inmediata exitosa.');
      }
    } else {
      console.log('[useCurrentUser] Offline, agregando a la cola de sincronización.');
      await addPendingSync('UPDATE', 'profile', cleanedData);
    }
  },

  syncProfileUpdate: async (data) => {
    console.log('[useCurrentUser] Sincronizando perfil con el servidor...');
    set({ loading: true });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      
      const { profile } = get();
      if (!profile) throw new Error('Perfil no disponible para sincronización');
      
      const patientId = profile.patientProfileId || profile.id;
      if (!patientId) throw new Error('ID de paciente no encontrado');

      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME, { id: patientId.toString() });
      
      // Mapear y limpiar datos para el backend
      const bodyData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        let value = data[key as keyof typeof data];
        if (key === 'birthDate') bodyData['dateOfBirth'] = value;
        else if (key === 'gender') {
          const genderMap: Record<string, string> = { 'Masculino': 'male', 'Femenino': 'female', 'Otro': 'other' };
          bodyData['gender'] = genderMap[value as string] || value;
        }
        else bodyData[key] = value;
      });

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error de red' }));
        throw new Error(`Error del servidor: ${res.status} - ${errorData.message || 'Error desconocido'}`);
      }

      const serverProfile = await res.json();
      
      // Actualizar estado con la respuesta del servidor para consistencia
      const finalProfile = { ...get().profile, ...serverProfile, updatedAt: new Date().toISOString() };
      set({ profile: finalProfile, loading: false });
      await get().saveProfileLocally(finalProfile);

      console.log('[useCurrentUser] Sincronización de perfil exitosa.');
      return true;
    } catch (err: any) {
      console.error('[useCurrentUser] Error en syncProfileUpdate:', err.message);
      set({ error: err.message, loading: false });
      return false;
    }
  },

  resetProfile: () => {
    console.log('[useCurrentUser] Reiniciando estado del perfil...');
    set({ profile: null, loading: false, error: null, initialized: false });
  },

  refreshProfile: async () => {
    console.log('[useCurrentUser] Forzando recarga del perfil...');
    set({ initialized: false });
    await get().fetchProfile();
  },

  saveProfileLocally: async (profile) => {
    console.log('[useCurrentUser] Guardando perfil localmente...');
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      console.log('[useCurrentUser] Perfil guardado localmente con éxito.');
    } catch (error) {
      console.error('[useCurrentUser] Error al guardar perfil localmente:', error);
      throw error;
    }
  },

  loadProfileLocally: async () => {
    console.log('[useCurrentUser] Cargando perfil localmente...');
    try {
      const storedProfile = await AsyncStorage.getItem('userProfile');
      if (storedProfile) {
        const profile: UserProfile = JSON.parse(storedProfile);
        console.log('[useCurrentUser] Perfil cargado localmente con éxito.');
        return profile;
      }
      console.log('[useCurrentUser] No hay perfil guardado localmente.');
      return null;
    } catch (error) {
      console.error('[useCurrentUser] Error al cargar perfil localmente:', error);
      throw error;
    }
  },

  uploadPhoto: async (uri) => {
    console.log('[useCurrentUser] Subiendo foto con ImageKit...');
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const profile = get().profile;
      if (!profile?.id) throw new Error('Perfil no encontrado');

      // Importar el servicio de ImageKit
      const { imageUploadService } = await import('../lib/imageUploadService');
      
      const result = await imageUploadService.uploadImage(uri, {
        userId: profile.id,
        folder: '/recuerdamed/profiles',
        tags: ['profile', 'avatar'],
        useUniqueFileName: true,
        compressImage: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al subir imagen');
      }

      console.log('[useCurrentUser] Foto subida exitosamente a ImageKit:', result.url);
      return result.url!;

    } catch (error) {
      console.error('[useCurrentUser] Error en uploadPhoto:', error);
      throw error;
    }
  },
}));