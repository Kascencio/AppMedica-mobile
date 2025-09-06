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

export const useCurrentUser = create<CurrentUserState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  initialized: false,

  fetchProfile: async () => {
    console.log('[useCurrentUser] Iniciando fetchProfile...');
    
    const currentState = get();
    if (currentState.loading) {
      console.log('[useCurrentUser] Ya hay una carga en progreso, saltando...');
      return;
    }
    
    // Evitar ciclos infinitos - solo cargar si no está inicializado o no hay perfil
    if (currentState.initialized && currentState.profile) {
      console.log('[useCurrentUser] Ya inicializado con perfil, saltando...');
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      // PRIMERO: Intentar cargar perfil localmente
      const localProfile = await get().loadProfileLocally();
      if (localProfile) {
        console.log('[useCurrentUser] Perfil cargado localmente:', localProfile);
        set({ profile: localProfile, loading: false, initialized: true });
      }
      
      // SEGUNDO: Intentar sincronizar con el servidor solo si hay token
      const token = useAuth.getState().userToken;
      if (!token) {
        console.log('[useCurrentUser] No hay token, usando solo perfil local');
        set({ loading: false, initialized: true });
        return;
      }
      
      // Decodificar el token JWT para obtener información del usuario
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('[useCurrentUser] Payload del token:', payload);
          
          // Crear perfil básico desde el token
          const userProfile: UserProfile = {
            id: payload.profileId || payload.sub,
            userId: payload.sub,
            patientProfileId: payload.profileId,
            name: payload.patientName || 'Usuario',
            role: payload.role || 'PATIENT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          console.log('[useCurrentUser] Perfil básico creado desde token:', userProfile);
          
          // Intentar obtener información del usuario desde /auth/me
          try {
            const authEndpoint = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
            console.log('[useCurrentUser] Obteniendo información de usuario desde:', authEndpoint);
            
            const authRes = await fetch(authEndpoint, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (authRes.ok) {
              const authData = await authRes.json();
              console.log('[useCurrentUser] Datos de usuario obtenidos:', authData);
              Object.assign(userProfile, authData);
            }
          } catch (authError) {
            console.log('[useCurrentUser] Error obteniendo datos de usuario:', authError);
            // No fallar si no se puede obtener datos adicionales
          }
          
          // Intentar obtener información completa del perfil desde /patients/me
          try {
            // Usar el ID del paciente del token para construir la URL
            const patientId = userProfile.patientProfileId || userProfile.id;
            const patientsEndpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME, { id: patientId.toString() });
            console.log('[useCurrentUser] Obteniendo perfil de paciente desde:', patientsEndpoint);
            
            const patientsRes = await fetch(patientsEndpoint, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (patientsRes.ok) {
              const patientsData = await patientsRes.json();
              console.log('[useCurrentUser] Perfil de paciente obtenido:', patientsData);
              
              // Mapear géneros del inglés al español
              const genderMapReverse: Record<string, string> = {
                'male': 'Masculino',
                'female': 'Femenino',
                'other': 'Otro'
              };
              
              // Mapear campos del backend a la estructura del frontend
              const completeProfile = {
                ...userProfile,
                ...patientsData,
                id: patientsData.id || userProfile.id,
                role: patientsData.role || userProfile.role || 'PATIENT',
                // Mapear campos específicos del backend
                birthDate: patientsData.dateOfBirth || patientsData.birthDate,
                gender: patientsData.gender ? genderMapReverse[patientsData.gender] || patientsData.gender : patientsData.gender,
                // Mantener campos que no existen en el backend como undefined
                bloodType: patientsData.bloodType,
                emergencyContactName: patientsData.emergencyContactName,
                emergencyContactRelation: patientsData.emergencyContactRelation,
                emergencyContactPhone: patientsData.emergencyContactPhone,
                chronicDiseases: patientsData.chronicDiseases,
                currentConditions: patientsData.currentConditions,
                hospitalReference: patientsData.hospitalReference,
              };
              console.log('[useCurrentUser] Perfil completo combinado:', completeProfile);
              
              // Guardar perfil localmente
              await get().saveProfileLocally(completeProfile);
              set({ profile: completeProfile, loading: false, initialized: true });
            } else {
              // Si no se puede obtener el perfil completo, usar el básico
              console.log('[useCurrentUser] No se pudo obtener perfil completo, usando básico');
              await get().saveProfileLocally(userProfile);
              set({ profile: userProfile, loading: false, initialized: true });
            }
          } catch (patientsError) {
            console.log('[useCurrentUser] Error obteniendo perfil de paciente:', patientsError);
            // Usar perfil básico si hay error
            await get().saveProfileLocally(userProfile);
            set({ profile: userProfile, loading: false, initialized: true });
          }
        } else {
          throw new Error('Token inválido');
        }
      } catch (tokenError) {
        console.error('[useCurrentUser] Error procesando token:', tokenError);
        set({ error: 'Error de autenticación', loading: false, initialized: true });
      }
    } catch (error) {
      console.error('[useCurrentUser] Error en fetchProfile:', error);
      set({ error: error instanceof Error ? error.message : 'Error desconocido', loading: false, initialized: true });
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

    // 1. Optimistic UI Update
    const updatedProfile = { ...profile, ...data, updatedAt: new Date().toISOString() };
    set({ profile: updatedProfile, loading: false, error: null });
    console.log('[useCurrentUser] Perfil actualizado localmente (optimista)');

    // 2. Persist Locally
    await saveProfileLocally(updatedProfile);

    // 3. Sync with Server
    const { isOnline, addPendingSync } = useOffline.getState();
    if (isOnline) {
      console.log('[useCurrentUser] Online, intentando sincronizar inmediatamente...');
      const success = await syncProfileUpdate(data);
      if (!success) {
        console.log('[useCurrentUser] Sincronización falló, agregando a la cola.');
        await addPendingSync('UPDATE', 'profile', data);
      } else {
        console.log('[useCurrentUser] Sincronización inmediata exitosa.');
      }
    } else {
      console.log('[useCurrentUser] Offline, agregando a la cola de sincronización.');
      await addPendingSync('UPDATE', 'profile', data);
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