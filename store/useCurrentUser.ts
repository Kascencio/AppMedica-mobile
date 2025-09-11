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
  fetchProfileCorrectFlow: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  resetProfile: () => void;
  refreshProfile: () => Promise<void>;
  saveProfileLocally: (profile: UserProfile) => Promise<void>;
  loadProfileLocally: () => Promise<UserProfile | null>;
  uploadPhoto: (uri: string) => Promise<string>;
  syncProfileUpdate: (profileData: Partial<UserProfile>) => Promise<boolean>;
  setProfileWithValidation: (profile: UserProfile | null) => UserProfile | null;
  validateCurrentProfile: () => UserProfile | null;
}

// Helper para asegurar que el objeto de perfil tenga una estructura consistente
const createDefaultProfile = (base: Partial<UserProfile>): UserProfile => {
  // MEJORADO: Asegurar que los IDs críticos se preserven
  const defaultProfile = {
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
  };
  
  // Asegurar que si tenemos un ID, también lo asignemos a patientProfileId
  if (defaultProfile.id && !defaultProfile.patientProfileId) {
    defaultProfile.patientProfileId = defaultProfile.id;
  }
  
  return defaultProfile;
};

// Función para validar y corregir IDs de perfil
const validateAndFixProfileIds = (profile: UserProfile): UserProfile => {
  console.log('[useCurrentUser] Validando IDs del perfil:', { 
    id: profile.id, 
    patientProfileId: profile.patientProfileId, 
    userId: profile.userId 
  });
  
  if (!profile.id && !profile.patientProfileId) {
    console.warn('[useCurrentUser] Perfil sin IDs válidos detectado, intentando recuperar...');
    
    const token = useAuth.getState().userToken;
    console.log('[useCurrentUser] Token disponible:', token ? 'SÍ' : 'NO');
    
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('[useCurrentUser] Token payload completo:', tokenPayload);
        
        const patientId = tokenPayload.patientId || 
                         tokenPayload.patientProfileId || 
                         tokenPayload.profileId || 
                         tokenPayload.id ||  // CORREGIDO: El token tiene el ID en el campo "id"
                         tokenPayload.sub ||
                         tokenPayload.userId;
        
        console.log('[useCurrentUser] ID extraído del token:', patientId);
        
        if (patientId) {
          profile.id = patientId;
          profile.patientProfileId = patientId;
          profile.userId = tokenPayload.sub || tokenPayload.userId || patientId;
          console.log('[useCurrentUser] IDs corregidos desde token:', { 
            id: profile.id, 
            patientProfileId: profile.patientProfileId,
            userId: profile.userId 
          });
        } else {
          console.error('[useCurrentUser] No se pudo extraer ID del token');
        }
      } catch (tokenError) {
        console.error('[useCurrentUser] Error procesando token para corregir IDs:', tokenError);
      }
    } else {
      console.error('[useCurrentUser] No hay token disponible para recuperar IDs');
    }
  }
  
  // Asegurar consistencia entre id y patientProfileId
  if (profile.id && !profile.patientProfileId) {
    profile.patientProfileId = profile.id;
    console.log('[useCurrentUser] patientProfileId asignado desde id:', profile.patientProfileId);
  } else if (profile.patientProfileId && !profile.id) {
    profile.id = profile.patientProfileId;
    console.log('[useCurrentUser] id asignado desde patientProfileId:', profile.id);
  }
  
  console.log('[useCurrentUser] Perfil final después de validación:', { 
    id: profile.id, 
    patientProfileId: profile.patientProfileId, 
    userId: profile.userId 
  });
  
  return profile;
};

export const useCurrentUser = create<CurrentUserState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  initialized: false,

  // Función helper para establecer perfil con validación automática
  setProfileWithValidation: (profile: UserProfile | null) => {
    if (profile) {
      const validatedProfile = validateAndFixProfileIds(profile);
      set({ profile: validatedProfile });
      return validatedProfile;
    } else {
      set({ profile: null });
      return null;
    }
  },

  // Función para validar y corregir el perfil actual si es necesario
  validateCurrentProfile: () => {
    const { profile } = get();
    if (profile && (!profile.id || !profile.patientProfileId)) {
      console.log('[useCurrentUser] Validando perfil actual que tiene IDs faltantes...');
      const validatedProfile = validateAndFixProfileIds(profile);
      set({ profile: validatedProfile });
      return validatedProfile;
    }
    return profile;
  },

  fetchProfile: async () => {
    console.log('[useCurrentUser] Iniciando fetchProfile...');
    const { loading, initialized, loadProfileLocally, saveProfileLocally } = get();

    if (loading) {
      console.log('[useCurrentUser] Carga en progreso, saltando.');
      return;
    }

    // Si ya está inicializado y hay perfil, no hacer nada
    if (initialized && get().profile) {
      console.log('[useCurrentUser] Ya inicializado con perfil, saltando.');
      return;
    }

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
        // Si no hay token pero hay perfil local, usarlo
        if (localProfile) {
          set({ profile: localProfile, initialized: true });
        } else {
          // Crear perfil mínimo sin token
          const minimalProfile = createDefaultProfile({
            id: 'temp_' + Date.now(),
            userId: 'temp_user',
            patientProfileId: 'temp_patient',
            name: 'Usuario',
            role: 'PATIENT',
          });
          await saveProfileLocally(minimalProfile);
          set({ profile: minimalProfile, initialized: true });
        }
        set({ loading: false });
        return;
    }

    try {
        // Decodificar token para obtener datos base
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('[useCurrentUser] Token payload decodificado:', tokenPayload);
        
        // Intentar obtener el ID del paciente de diferentes campos del token
        const patientId = tokenPayload.patientId || 
                         tokenPayload.patientProfileId || 
                         tokenPayload.profileId || 
                         tokenPayload.id ||  // CORREGIDO: El token tiene el ID en el campo "id"
                         tokenPayload.sub;
        
        console.log('[useCurrentUser] ID del paciente extraído del token:', patientId);
        
        const baseProfile = {
            id: patientId,
            userId: tokenPayload.sub || tokenPayload.userId,
            patientProfileId: patientId,
            name: tokenPayload.patientName || tokenPayload.name || 'Usuario',
            role: tokenPayload.role || 'PATIENT',
        };
        
        console.log('[useCurrentUser] Perfil base creado desde token:', baseProfile);

        // Obtener perfil detallado del backend
        const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
        console.log('[useCurrentUser] Obteniendo perfil del servidor desde:', endpoint);
        const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });

        let finalProfile;
        if (res.ok) {
            const serverData = await res.json();
            console.log('[useCurrentUser] Perfil del servidor obtenido:', serverData);
            
            // Mapear datos del servidor a nuestro modelo de perfil
            const genderMapReverse = { 'male': 'Masculino', 'female': 'Femenino', 'other': 'Otro' };
            const mappedData = {
                ...serverData,
                // MEJORADO: Asegurar que tenemos IDs válidos con múltiples fallbacks
                id: serverData.id || baseProfile.id || patientId,
                userId: serverData.userId || baseProfile.userId || tokenPayload.sub,
                patientProfileId: serverData.id || baseProfile.patientProfileId || patientId,
                // Mapear campos de fecha
                birthDate: serverData.dateOfBirth || serverData.birthDate,
                // Mapear género
                gender: serverData.gender ? genderMapReverse[serverData.gender as keyof typeof genderMapReverse] || serverData.gender : undefined,
                // Mapear otros campos
                name: serverData.name || baseProfile.name,
                role: serverData.role || baseProfile.role,
            };
            
            console.log('[useCurrentUser] Datos mapeados del servidor:', mappedData);
            
            // Combinar datos: locales -> base del token -> del servidor
            finalProfile = { ...localProfile, ...baseProfile, ...mappedData };
        } else {
            const errorText = await res.text().catch(() => 'No response body');
            console.warn('[useCurrentUser] No se pudo obtener perfil detallado, usando datos locales/base.');
            console.warn('[useCurrentUser] Status:', res.status, 'Response:', errorText);
            
            // Si el error es "ID inválido", intentar crear un perfil con datos del token
            if (res.status === 400 && errorText.includes('ID inválido')) {
                console.log('[useCurrentUser] Error de ID inválido, creando perfil desde token...');
                // Usar solo los datos del token para crear un perfil básico
                finalProfile = { ...localProfile, ...baseProfile };
            } else {
                finalProfile = { ...localProfile, ...baseProfile };
            }
        }

        const completeProfile = createDefaultProfile(finalProfile);
        const validatedProfile = get().setProfileWithValidation(completeProfile);

        console.log('[useCurrentUser] Perfil final combinado y limpio:', validatedProfile);
        if (validatedProfile) {
          await saveProfileLocally(validatedProfile);
        }
        set({ initialized: true });

    } catch (error: any) {
        console.error('[useCurrentUser] Error en fetchProfile:', error);
        set({ error: error.message || 'Error desconocido al obtener perfil' });
        
        // Si hay error pero tenemos datos base del token, crear perfil mínimo
        if (token) {
          try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            const baseProfile = {
              id: tokenPayload.id || tokenPayload.profileId || tokenPayload.sub,  // CORREGIDO: Usar tokenPayload.id
              userId: tokenPayload.sub,
              patientProfileId: tokenPayload.id || tokenPayload.profileId,  // CORREGIDO: Usar tokenPayload.id
              name: tokenPayload.patientName || 'Usuario',
              role: tokenPayload.role || 'PATIENT',
            };
            const completeProfile = createDefaultProfile({ ...localProfile, ...baseProfile });
            const validatedProfile = get().setProfileWithValidation(completeProfile);
            if (validatedProfile) {
              await saveProfileLocally(validatedProfile);
            }
            set({ initialized: true });
            console.log('[useCurrentUser] Perfil mínimo creado desde token debido a error');
          } catch (tokenError) {
            console.error('[useCurrentUser] Error procesando token:', tokenError);
            set({ initialized: true }); // Marcar como inicializado para evitar bucle
          }
        } else {
          set({ initialized: true }); // Marcar como inicializado para evitar bucle
        }
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

    // 1. Optimistic UI Update - PRESERVAR IDs críticos
    const updatedProfile = { 
      ...profile, 
      ...cleanedData, 
      // Asegurar que los IDs críticos se preserven
      id: profile.id,
      userId: profile.userId,
      patientProfileId: profile.patientProfileId || profile.id,
      updatedAt: new Date().toISOString() 
    };
    set({ profile: updatedProfile, loading: false, error: null });
    console.log('[useCurrentUser] Perfil actualizado localmente (optimista)');

    // 2. Persist Locally
    await saveProfileLocally(updatedProfile);

    // 3. Sync with Server - PASAR perfil completo para sincronización
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
      
      // MEJORADO: Buscar ID de paciente de múltiples fuentes
      const patientId = profile.patientProfileId || 
                       profile.id || 
                       profile.userId;
      
      console.log('[useCurrentUser] IDs disponibles:', {
        patientProfileId: profile.patientProfileId,
        id: profile.id,
        userId: profile.userId,
        selectedPatientId: patientId
      });
      
      if (!patientId) {
        console.error('[useCurrentUser] Perfil completo:', JSON.stringify(profile, null, 2));
        throw new Error('ID de paciente no encontrado');
      }

      // Usar endpoint sin parámetros ya que el backend debería identificar al usuario por el token
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
      
      // Mapear y limpiar datos para el backend
      const bodyData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        let value = data[key as keyof typeof data];
        
        // CORREGIDO: Filtrar valores inválidos antes de enviar
        if (value === null || value === undefined || value === '') {
          console.log(`[useCurrentUser] Excluyendo campo vacío: ${key} = ${value}`);
          return; // No incluir valores vacíos
        }
        
        // CORREGIDO: Validar números
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          console.log(`[useCurrentUser] Excluyendo número inválido: ${key} = ${value}`);
          return; // No incluir NaN o Infinity
        }
        
        if (key === 'birthDate') {
          // CORREGIDO: El backend espera birthDate con formato ISO datetime completo
          if (value && typeof value === 'string') {
            // Convertir fecha simple a ISO datetime completo
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              bodyData['birthDate'] = date.toISOString();
            } else {
              console.log(`[useCurrentUser] ⚠️ Fecha inválida excluida: ${key} = ${value}`);
              return;
            }
          } else {
            console.log(`[useCurrentUser] ⚠️ Fecha vacía excluida: ${key} = ${value}`);
            return;
          }
        }
        else if (key === 'gender') {
          const genderMap: Record<string, string> = { 'Masculino': 'male', 'Femenino': 'female', 'Otro': 'other' };
          bodyData['gender'] = genderMap[value as string] || value;
        }
        else if (key === 'weight' || key === 'height') {
          // CORREGIDO: Asegurar que weight y height sean números
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          if (typeof numValue === 'number' && !isNaN(numValue) && isFinite(numValue)) {
            bodyData[key] = numValue;
          } else {
            console.log(`[useCurrentUser] ⚠️ Valor numérico inválido excluido: ${key} = ${value}`);
            return;
          }
        }
        else bodyData[key] = value;
      });

      // CORREGIDO: Validar cada campo antes de enviar
      const validatedBodyData: Record<string, any> = {};
      Object.keys(bodyData).forEach(key => {
        const value = bodyData[key];
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          console.error(`[useCurrentUser] ❌ CAMPO INVÁLIDO DETECTADO: ${key} = ${value} (${typeof value})`);
          return; // No incluir este campo
        }
        if (value === null || value === undefined) {
          console.log(`[useCurrentUser] ⚠️ Campo nulo excluido: ${key} = ${value}`);
          return;
        }
        validatedBodyData[key] = value;
        console.log(`[useCurrentUser] ✅ Campo válido: ${key} = ${value} (${typeof value})`);
      });

      // CORREGIDO: Verificación final antes de enviar
      const finalCheck = JSON.stringify(validatedBodyData);
      if (finalCheck.includes('NaN') || finalCheck.includes('Infinity')) {
        console.error('[useCurrentUser] ❌ VALORES INVÁLIDOS DETECTADOS EN JSON FINAL:', finalCheck);
        throw new Error('Datos inválidos detectados antes de enviar al servidor');
      }

      console.log('[useCurrentUser] Datos finales a enviar al servidor:', JSON.stringify(validatedBodyData, null, 2));
      console.log('[useCurrentUser] Endpoint:', endpoint);
      console.log('[useCurrentUser] Método: PATCH');

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validatedBodyData),
      });

      console.log('[useCurrentUser] Respuesta del servidor:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'No response body');
        console.error('[useCurrentUser] Error del servidor:', res.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(`Error del servidor: ${res.status} - ${errorData.message || errorText || 'Error desconocido'}`);
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
        
        // MEJORADO: Validar y corregir IDs usando función centralizada
        const validatedProfile = validateAndFixProfileIds(profile);
        
        console.log('[useCurrentUser] Perfil cargado localmente con éxito.');
        return validatedProfile;
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

  // NUEVA FUNCIÓN: Implementar el flujo correcto de autenticación
  fetchProfileCorrectFlow: async () => {
    const { userToken } = useAuth.getState();
    if (!userToken) {
      console.log('[useCurrentUser] No hay token, saltando fetchProfileCorrectFlow');
      return;
    }

    console.log('[useCurrentUser] Iniciando flujo correcto de autenticación...');
    
    // Verificar si ya se inicializó y tiene userId válido
    const currentProfile = get().profile;
    if (currentProfile && currentProfile.userId) {
      console.log('[useCurrentUser] Ya inicializado con perfil válido (con userId), saltando.');
      return;
    }
    
    if (currentProfile && !currentProfile.userId) {
      console.log('[useCurrentUser] Perfil existente sin userId, reiniciando con flujo correcto...');
    }

    try {
      // PASO 1: Obtener datos del usuario desde /auth/me
      console.log('[useCurrentUser] PASO 1: Obteniendo datos del usuario desde /auth/me...');
      const { userId, role } = await useAuth.getState().fetchUserData();
      console.log('[useCurrentUser] Datos del usuario obtenidos:', { userId, role });

      // PASO 2: Si es paciente, obtener perfil desde /patients/me
      if (role === 'PATIENT') {
        console.log('[useCurrentUser] PASO 2: Usuario es paciente, obteniendo perfil desde /patients/me...');
        
        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME), {
          method: 'GET',
          headers: {
            ...API_CONFIG.DEFAULT_HEADERS,
            'Authorization': `Bearer ${userToken}`,
          },
        });
        
        if (res.ok) {
          const patientData = await res.json();
          console.log('[useCurrentUser] Datos del paciente obtenidos:', patientData);
          
          // Crear perfil completo con los datos correctos
          const completeProfile = {
            ...patientData,
            id: patientData.id, // patientId del servidor
            userId: userId, // userId del /auth/me
            patientProfileId: patientData.id, // patientId del servidor
            role: role, // role del /auth/me
          };
          
          console.log('[useCurrentUser] Perfil completo creado:', completeProfile);
          
          const validatedProfile = get().setProfileWithValidation(completeProfile);
          if (validatedProfile) {
            await get().saveProfileLocally(validatedProfile);
            console.log('[useCurrentUser] Perfil del paciente guardado localmente');
          }
        } else {
          console.log('[useCurrentUser] Error obteniendo perfil del paciente:', res.status);
          // Crear perfil mínimo con los datos disponibles
          const minimalProfile = {
            id: userId, // Usar userId como fallback
            userId: userId,
            patientProfileId: userId,
            name: 'Usuario',
            role: role,
          };
          
          const completeProfile = createDefaultProfile(minimalProfile);
          const validatedProfile = get().setProfileWithValidation(completeProfile);
          if (validatedProfile) {
            await get().saveProfileLocally(validatedProfile);
          }
        }
      } else {
        console.log('[useCurrentUser] Usuario no es paciente, creando perfil básico...');
        // Para cuidadores, crear perfil básico
        const basicProfile = {
          id: userId,
          userId: userId,
          patientProfileId: undefined, // Los cuidadores no tienen patientProfileId
          name: 'Usuario',
          role: role,
        };
        
        const completeProfile = createDefaultProfile(basicProfile);
        const validatedProfile = get().setProfileWithValidation(completeProfile);
        if (validatedProfile) {
          await get().saveProfileLocally(validatedProfile);
        }
      }
    } catch (error) {
      console.error('[useCurrentUser] Error en fetchProfileCorrectFlow:', error);
      
      // En caso de error, intentar cargar perfil local como fallback
      try {
        const localProfile = await get().loadProfileLocally();
        if (localProfile) {
          const validatedProfile = get().setProfileWithValidation(localProfile);
          if (validatedProfile) {
            await get().saveProfileLocally(validatedProfile);
          }
        }
      } catch (localError) {
        console.error('[useCurrentUser] Error cargando perfil local como fallback:', localError);
      }
    }
  },
}));