import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
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
      
      // SEGUNDO: Intentar sincronizar con el servidor
      const token = useAuth.getState().userToken;
      if (!token) {
        console.log('[useCurrentUser] No hay token, usando solo perfil local');
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
          }
          
          // Intentar obtener información completa del perfil desde /patients/me
          try {
            const patientsEndpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
            console.log('[useCurrentUser] Obteniendo perfil de paciente desde:', patientsEndpoint);
            
            const patientsRes = await fetch(patientsEndpoint, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (patientsRes.ok) {
              const patientsData = await patientsRes.json();
              console.log('[useCurrentUser] Perfil de paciente obtenido:', patientsData);
              
              const completeProfile = {
                ...userProfile,
                ...patientsData,
                id: patientsData.id || userProfile.id,
                role: patientsData.role || userProfile.role || 'PATIENT',
              };
              console.log('[useCurrentUser] Perfil completo combinado:', completeProfile);
              
              // Guardar perfil localmente
              await get().saveProfileLocally(completeProfile);
              set({ profile: completeProfile, loading: false, initialized: true });
              return;
            } else {
              console.log('[useCurrentUser] Error obteniendo perfil de paciente:', patientsRes.status, patientsRes.statusText);
            }
          } catch (patientsError) {
            console.log('[useCurrentUser] Error obteniendo perfil de paciente:', patientsError);
          }
          
          // Si no se pudo obtener de patients/me, intentar obtener el perfil por ID
          try {
            console.log('[useCurrentUser] Intentando obtener perfil por ID:', userProfile.id);
            const profileByIdEndpoint = buildApiUrl(`/patients/${userProfile.id}`);
            
            const profileByIdRes = await fetch(profileByIdEndpoint, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (profileByIdRes.ok) {
              const profileByIdData = await profileByIdRes.json();
              console.log('[useCurrentUser] Perfil obtenido por ID:', profileByIdData);
              
              const completeProfile = {
                ...userProfile,
                ...profileByIdData,
                id: profileByIdData.id || userProfile.id,
                role: profileByIdData.role || userProfile.role || 'PATIENT',
                name: profileByIdData.name || userProfile.name || null,
                birthDate: profileByIdData.birthDate || profileByIdData.dateOfBirth || null,
                gender: profileByIdData.gender || null,
                weight: profileByIdData.weight || null,
                height: profileByIdData.height || null,
                bloodType: profileByIdData.bloodType || null,
                emergencyContactName: profileByIdData.emergencyContactName || null,
                emergencyContactRelation: profileByIdData.emergencyContactRelation || null,
                emergencyContactPhone: profileByIdData.emergencyContactPhone || null,
                allergies: profileByIdData.allergies || null,
                chronicDiseases: profileByIdData.chronicDiseases || null,
                currentConditions: profileByIdData.currentConditions || null,
                reactions: profileByIdData.reactions || null,
                doctorName: profileByIdData.doctorName || null,
                doctorContact: profileByIdData.doctorContact || null,
                hospitalReference: profileByIdData.hospitalReference || null,
                photoUrl: profileByIdData.photoUrl || null,
              };
              console.log('[useCurrentUser] Perfil completo obtenido por ID:', completeProfile);
              
              // Guardar perfil localmente
              await get().saveProfileLocally(completeProfile);
              set({ profile: completeProfile, loading: false, initialized: true });
              return;
            } else {
              console.log('[useCurrentUser] Error obteniendo perfil por ID:', profileByIdRes.status);
            }
          } catch (profileByIdError) {
            console.log('[useCurrentUser] Error obteniendo perfil por ID:', profileByIdError);
          }
          
          // Si no se pudo obtener de ninguna forma, usar solo el perfil básico del token
          console.log('[useCurrentUser] Usando solo perfil básico del token');
          await get().saveProfileLocally(userProfile);
          set({ profile: userProfile, loading: false, initialized: true });
          return;
        }
      } catch (decodeError) {
        console.log('[useCurrentUser] Error decodificando token:', decodeError);
        throw new Error('Token inválido');
      }
      
    } catch (err: any) {
      console.log('[useCurrentUser] Error capturado:', err.message);
      set({ error: err.message, loading: false });
    }
  },

  updateProfile: async (data) => {
    console.log('[useCurrentUser] ========== INICIO updateProfile ==========');
    console.log('[useCurrentUser] Datos recibidos:', JSON.stringify(data, null, 2));
    
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const { profile } = get();
      
      console.log('[useCurrentUser] Actualizando perfil con datos:', data);
      console.log('[useCurrentUser] Perfil actual:', profile);
      
      // Actualizar todos los campos permitidos según la nueva estructura
      const allowedFields = [
        'name', 'birthDate', 'gender', 'weight', 'height', 'bloodType',
        'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
        'allergies', 'chronicDiseases', 'currentConditions', 'reactions',
        'doctorName', 'doctorContact', 'hospitalReference', 'photoUrl'
      ];
      
      const bodyData: Record<string, any> = {};
      allowedFields.forEach(field => {
        if (data[field as keyof typeof data] !== undefined) {
          bodyData[field] = data[field as keyof typeof data];
        }
      });
      
      console.log('[useCurrentUser] Campos permitidos enviados:', Object.keys(bodyData));
      
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
      const body = JSON.stringify(bodyData);
      
      console.log('[useCurrentUser] Endpoint:', endpoint);
      console.log('[useCurrentUser] Body:', body);
      
      // Probar PUT primero
      let res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      
      // Si PUT falla con 405, probar PATCH
      if (!res.ok && res.status === 405) {
        console.log('[useCurrentUser] PUT falló con 405, intentando PATCH /patients/me');
        res = await fetch(endpoint, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body,
        });
      }
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.log('[useCurrentUser] Error de API:', res.status, err);
        
        let errorMessage = 'Error al actualizar perfil';
        if (res.status === 405) {
          errorMessage = `Método no permitido en ${endpoint}. Verificar endpoint de la API.`;
        } else if (res.status === 404) {
          errorMessage = `Endpoint ${endpoint} no encontrado. Verificar configuración de la API.`;
        } else if (res.status === 401) {
          errorMessage = 'No autorizado. Verificar token de autenticación.';
        } else if (res.status === 400) {
          if (err.issues && Array.isArray(err.issues)) {
            const fieldErrors = err.issues.map((issue: any) => {
              const field = issue.path?.join('.') || 'campo';
              return `${field}: ${issue.message} (esperaba ${issue.expected}, recibió ${issue.received})`;
            }).join(', ');
            errorMessage = `Error de validación: ${fieldErrors}`;
          } else {
            errorMessage = err.error || err.message || 'Datos inválidos enviados a la API.';
          }
        } else if (err.error) {
          errorMessage = err.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        throw new Error(errorMessage);
      }
      
      const updated = await res.json();
      console.log('[useCurrentUser] Perfil actualizado exitosamente:', updated);
      
      // Actualizar el estado local con la respuesta del servidor
      const updatedProfile = { ...profile, ...updated };
      
      // Guardar perfil localmente
      await get().saveProfileLocally(updatedProfile);
      set({ profile: updatedProfile });
      
      // Recargar el perfil para asegurar sincronización con el servidor
      await get().refreshProfile();
      
    } catch (err: any) {
      console.log('[useCurrentUser] Error en updateProfile:', err.message);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
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
    console.log('[useCurrentUser] Subiendo foto...');
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      // Por ahora, devolver la URI local hasta que se implemente la subida al servidor
      console.log('[useCurrentUser] Foto subida localmente:', uri);
      return uri;
      
      // TODO: Implementar subida real al servidor cuando esté disponible
      /*
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      const uploadEndpoint = buildApiUrl('/upload');
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[useCurrentUser] Error al subir foto:', res.status, err);
        throw new Error('Error al subir foto');
      }

      const uploadedUrl = await res.json();
      console.log('[useCurrentUser] Foto subida exitosamente:', uploadedUrl);
      return uploadedUrl.url;
      */
    } catch (error) {
      console.error('[useCurrentUser] Error en uploadPhoto:', error);
      throw error;
    }
  },
}));