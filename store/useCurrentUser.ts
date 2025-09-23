import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import { useOffline } from './useOffline'; // Importar useOffline
import { checkNetworkConnectivity } from '../lib/network';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { UserProfile } from '../types';
import { localDB, LocalProfile } from '../data/db';
import { UPDATABLE_PROFILE_FIELDS } from '../constants/profileFields';

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
  saveProfileToDB: (profile: UserProfile) => Promise<void>;
  loadProfileFromDB: (id: string) => Promise<UserProfile | null>;
  uploadPhoto: (uri: string) => Promise<string>;
  syncProfileUpdate: (profileData: Partial<UserProfile>) => Promise<boolean>;
  setProfileWithValidation: (profile: UserProfile | null) => UserProfile | null;
  validateCurrentProfile: () => UserProfile | null;
  forceRefreshFromServer: () => Promise<UserProfile | null>;
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
  
  // Asegurar que patientProfileId solo se establezca automáticamente para pacientes
  const effectiveRole = (defaultProfile.role || base.role || 'PATIENT').toUpperCase();
  if (effectiveRole === 'PATIENT') {
    if (defaultProfile.id && !defaultProfile.patientProfileId) {
      defaultProfile.patientProfileId = defaultProfile.id;
    }
  } else {
    // Cuidadores: no deben tener patientProfileId
    (defaultProfile as any).patientProfileId = undefined as any;
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
                         tokenPayload.id ||
                         tokenPayload.sub ||
                         tokenPayload.userId;
        
        console.log('[useCurrentUser] ID extraído del token:', patientId);
        
        if (patientId) {
          profile.id = patientId;
          profile.userId = tokenPayload.sub || tokenPayload.userId || patientId;
          // Solo asignar patientProfileId si el rol del token es PATIENT
          const tokenRole = (tokenPayload.role || '').toUpperCase();
          if (tokenRole === 'PATIENT') {
            (profile as any).patientProfileId = patientId;
          } else {
            (profile as any).patientProfileId = undefined as any;
          }
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
  
  // Asegurar consistencia entre id y patientProfileId SOLO para pacientes
  const effectiveRole = (profile.role || 'PATIENT').toUpperCase();
  if (effectiveRole === 'PATIENT') {
    if (profile.id && !profile.patientProfileId) {
      profile.patientProfileId = profile.id;
      console.log('[useCurrentUser] patientProfileId asignado desde id (paciente):', profile.patientProfileId);
    } else if (profile.patientProfileId && !profile.id) {
      profile.id = profile.patientProfileId;
      console.log('[useCurrentUser] id asignado desde patientProfileId (paciente):', profile.id);
    }
  } else {
    (profile as any).patientProfileId = undefined as any;
  }
  
  // Importante: NO aplicar correcciones hardcodeadas de IDs. Confiar en /auth/me y /patients/me
  
  console.log('[useCurrentUser] Perfil final después de validación:', { 
    id: profile.id, 
    patientProfileId: profile.patientProfileId, 
    userId: profile.userId 
  });
  
  return profile;
};

// Mezcla que prioriza valores definidos/no vacíos del primero sobre los siguientes
function mergePreferNonNull<T extends Record<string, any>>(
  primary: Partial<T> | undefined,
  secondary: Partial<T> | undefined,
  fallback: Partial<T> | undefined
): T {
  const p = primary || {};
  const s = secondary || {};
  const f = fallback || {};
  const keys = new Set<string>([...Object.keys(f), ...Object.keys(s), ...Object.keys(p)]);
  const out: any = {};
  keys.forEach((k) => {
    const pv = (p as any)[k];
    const sv = (s as any)[k];
    const fv = (f as any)[k];
    out[k] = pv !== undefined && pv !== null && pv !== '' ? pv : (sv !== undefined && sv !== null && sv !== '' ? sv : fv);
  });
  return out as T;
}

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

    // Si ya está inicializado y hay perfil válido, no hacer nada
    const currentProfile = get().profile;
    if (initialized && currentProfile && currentProfile.id && currentProfile.name) {
      console.log('[useCurrentUser] Ya inicializado con perfil válido, saltando.');
      return;
    }
    
    // Si está inicializado pero el perfil está vacío o corrupto, forzar recarga
    if (initialized && (!currentProfile || !currentProfile.id || !currentProfile.name)) {
      console.log('[useCurrentUser] Perfil corrupto o vacío detectado, forzando recarga...');
      set({ initialized: false });
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

    // Si no hay conectividad real, no intentar red y no marcar error
    const hasInternet = await checkNetworkConnectivity();
    if (!hasInternet) {
        console.log('[useCurrentUser] Sin conectividad real. Usando datos locales y modo lectura.');
        if (localProfile) {
          set({ profile: localProfile, initialized: true, loading: false, error: null });
        } else {
          const minimalProfile = createDefaultProfile({
            id: 'temp_' + Date.now(),
            userId: 'temp_user',
            patientProfileId: 'temp_patient',
            name: 'Usuario',
            role: 'PATIENT',
          });
          await saveProfileLocally(minimalProfile);
          set({ profile: minimalProfile, initialized: true, loading: false, error: null });
        }
        return;
    }

    try {
        // Decodificar token para obtener datos base
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('[useCurrentUser] Token payload decodificado:', tokenPayload);
        console.log('[useCurrentUser] 🔍 ID en el token:', tokenPayload.id);
        console.log('[useCurrentUser] 🔍 ID esperado: cmff28z53000bjxvg0z4smal1');
        console.log('[useCurrentUser] 🔍 ¿Token tiene ID correcto?', tokenPayload.id === 'cmff28z53000bjxvg0z4smal1');
        
        // IDs y rol desde token
        const tokenRole = (tokenPayload.role || 'PATIENT').toUpperCase();
        const tokenUserId = tokenPayload.sub || tokenPayload.userId || tokenPayload.id;
        const tokenPatientId = tokenPayload.patientId || tokenPayload.patientProfileId || tokenPayload.profileId || tokenUserId;

        console.log('[useCurrentUser] Rol desde token:', tokenRole);

        const baseProfile = {
            id: tokenRole === 'PATIENT' ? tokenPatientId : tokenUserId,
            userId: tokenUserId,
            patientProfileId: tokenRole === 'PATIENT' ? tokenPatientId : undefined,
            name: tokenPayload.patientName || tokenPayload.name || 'Usuario',
            role: tokenRole,
        } as Partial<UserProfile>;
        
        console.log('[useCurrentUser] Perfil base creado desde token:', baseProfile);

        let finalProfile;
        let res: Response | null = null;
        if (tokenRole === 'PATIENT') {
          const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
          console.log('[useCurrentUser] Obteniendo perfil del servidor desde:', endpoint);
          console.log('[useCurrentUser] 🔍 Token usado:', token.substring(0, 20) + '...');
          res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
        } else {
          console.log('[useCurrentUser] Usuario es CUIDADOR; no llamar /patients/me');
        }

        if (res && res.ok) {
            const serverData = await res.json();
            console.log('[useCurrentUser] ✅ PERFIL CARGADO DESDE SERVIDOR:', serverData);
            console.log('[useCurrentUser] 🔍 Status del servidor:', res.status);
            
            // Mapear datos del servidor a nuestro modelo de perfil
            const genderMapReverse = { 'male': 'Masculino', 'female': 'Femenino', 'other': 'Otro' };
            const mappedData = {
                ...serverData,
                // CORREGIDO: Priorizar siempre el ID del servidor sobre el del token
                id: serverData.id, // Usar SIEMPRE el ID del servidor
                userId: serverData.userId || baseProfile.userId || tokenPayload.sub,
                patientProfileId: serverData.id, // Usar SIEMPRE el ID del servidor como patientProfileId
                // Mapear campos de fecha
                birthDate: serverData.dateOfBirth || serverData.birthDate,
                // Mapear género
                gender: serverData.gender ? genderMapReverse[serverData.gender as keyof typeof genderMapReverse] || serverData.gender : undefined,
                // Mapear otros campos
                name: serverData.name || baseProfile.name,
                role: serverData.role || baseProfile.role,
            };
            
            console.log('[useCurrentUser] Datos mapeados del servidor:', mappedData);
            console.log('[useCurrentUser] ✅ ID CORRECTO del servidor:', serverData.id);
            console.log('[useCurrentUser] ✅ PatientProfileId establecido:', mappedData.patientProfileId);
            console.log('[useCurrentUser] 🔍 ID esperado: cmff28z53000bjxvg0z4smal1');
            console.log('[useCurrentUser] 🔍 ID obtenido:', serverData.id);
            console.log('[useCurrentUser] 🔍 ¿IDs coinciden?', serverData.id === 'cmff28z53000bjxvg0z4smal1');
            
            // Validar que tenemos el ID correcto del servidor
            if (!serverData.id) {
                console.error('[useCurrentUser] ❌ ERROR: El servidor no devolvió un ID válido');
                throw new Error('El servidor no devolvió un ID de paciente válido');
            }
            
            // Combinar datos: locales -> base del token -> del servidor
            finalProfile = mergePreferNonNull<UserProfile>(mappedData as any, localProfile || undefined, baseProfile);
            
            // No forzar correcciones de ID; usar el ID que devuelve el servidor
        } else {
            const errorText = await (res ? res.text().catch(() => 'No response body') : Promise.resolve('No fetch'));
            if (res) console.warn('[useCurrentUser] ❌ NO SE PUDO CARGAR DESDE SERVIDOR - Status:', res.status, 'Response:', errorText);
            console.warn('[useCurrentUser] Usando datos locales/base como fallback...');
            
            // Si el error es "ID inválido", intentar crear un perfil con datos del token
            if (res && res.status === 400 && errorText.includes('ID inválido')) {
                console.log('[useCurrentUser] Error de ID inválido, creando perfil desde token...');
                // Usar solo los datos del token para crear un perfil básico
                finalProfile = { ...localProfile, ...baseProfile };
            } else {
                finalProfile = mergePreferNonNull<UserProfile>(localProfile || undefined, baseProfile, {});
            }
            
            // No forzar correcciones de ID en fallback
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
    const { profile, saveProfileLocally, saveProfileToDB, syncProfileUpdate } = get();
    
    if (!profile) {
      console.error('[useCurrentUser] No hay perfil para actualizar.');
      set({ error: 'No hay perfil para actualizar.' });
      return;
    }

    // Guardado local inmediato con el payload crudo (incluye nulls para limpiar)
    const currentProfile = get().profile;
    if (currentProfile) {
      const localMerged: UserProfile = { 
        ...currentProfile, 
        ...data, 
        createdAt: currentProfile.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      };
      await saveProfileLocally(localMerged);
    }

    // CORREGIDO: Usar whitelist completo de campos actualizables
    const cleanedData: Partial<UserProfile> = {};
    Object.entries(data).forEach(([key, value]) => {
      // Solo incluir campos que están en el whitelist
      if (UPDATABLE_PROFILE_FIELDS.includes(key as any)) {
        // CORREGIDO: Reemplazar undefined por null para permitir sobrescribir columnas
        if (value === undefined) {
          (cleanedData as any)[key] = null;
        } else if (value !== null) {
          if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
            return; // No incluir NaN o Infinity
          }
          (cleanedData as any)[key] = value;
        } else {
          (cleanedData as any)[key] = null;
        }
      }
    });

    // CORREGIDO: Enviar tanto birthDate como dateOfBirth durante transición
    if (cleanedData.birthDate) {
      cleanedData.dateOfBirth = cleanedData.birthDate;
    }

    // 1. Optimistic UI Update - PRESERVAR IDs críticos
    const updatedProfile = { 
      ...profile, 
      ...cleanedData, 
      // Asegurar que los IDs críticos se preserven
      id: profile.id,
      userId: profile.userId,
      patientProfileId: profile.patientProfileId || profile.id,
      // Asegurar que los campos de fecha estén presentes
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString() 
    };
    set({ profile: updatedProfile, loading: false, error: null });
    console.log('[useCurrentUser] Perfil actualizado localmente (optimista)');

    // 2. Persist Locally (AsyncStorage)
    await saveProfileLocally(updatedProfile);

    // 3. Persist in Database (SQLite)
    await saveProfileToDB(updatedProfile);

    // 4. Sync with Server - PASAR perfil completo para sincronización
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
        
        // MEJORADO: Detectar específicamente qué campo tiene NaN
        Object.keys(validatedBodyData).forEach(key => {
          const value = validatedBodyData[key];
          if (typeof value === 'number' && isNaN(value)) {
            console.error(`[useCurrentUser] ❌ CAMPO CON NaN DETECTADO: ${key} = ${value}`);
          }
        });
        
        throw new Error('Datos inválidos detectados antes de enviar al servidor');
      }

      console.log('[useCurrentUser] Datos finales a enviar al servidor:', JSON.stringify(validatedBodyData, null, 2));
      console.log('[useCurrentUser] Endpoint:', endpoint);
      console.log('[useCurrentUser] Método: PUT');

      // MEJORADO: Validación campo por campo antes de crear el objeto final
      const cleanBodyData: Record<string, any> = {};
      Object.keys(validatedBodyData).forEach(key => {
        const value = validatedBodyData[key];
        
        // Validación exhaustiva de cada campo
        if (typeof value === 'number') {
          if (isNaN(value)) {
            console.error(`[useCurrentUser] ❌ EXCLUYENDO campo con NaN: ${key} = ${value}`);
            return; // No incluir este campo
          }
          if (!isFinite(value)) {
            console.error(`[useCurrentUser] ❌ EXCLUYENDO campo con Infinity: ${key} = ${value}`);
            return; // No incluir este campo
          }
          cleanBodyData[key] = value;
          console.log(`[useCurrentUser] ✅ Campo numérico válido: ${key} = ${value}`);
        } else if (value !== null && value !== undefined) {
          cleanBodyData[key] = value;
          console.log(`[useCurrentUser] ✅ Campo válido: ${key} = ${value} (${typeof value})`);
        } else {
          console.log(`[useCurrentUser] ⚠️ Excluyendo campo nulo/undefined: ${key} = ${value}`);
        }
      });

      console.log('[useCurrentUser] Datos limpios finales:', JSON.stringify(cleanBodyData, null, 2));

      // MEJORADO: Logging detallado del JSON que se envía
      const jsonToSend = JSON.stringify(cleanBodyData);
      console.log('[useCurrentUser] JSON raw a enviar:', jsonToSend);
      
      // Verificar si hay NaN en el JSON string
      if (jsonToSend.includes('NaN')) {
        console.error('[useCurrentUser] ❌ NaN DETECTADO EN JSON STRING:', jsonToSend);
        // Buscar específicamente dónde está el NaN
        const lines = jsonToSend.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('NaN')) {
            console.error(`[useCurrentUser] ❌ NaN en línea ${index + 1}: ${line}`);
          }
        });
        throw new Error('NaN detectado en JSON a enviar');
      }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: jsonToSend,
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
      try {
        await AsyncStorage.setItem('lastProfileSync', new Date().toISOString());
      } catch {}
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
    set({ initialized: false, profile: null });
    // Usar el flujo correcto basado en /auth/me
    if (get().fetchProfileCorrectFlow) {
      await get().fetchProfileCorrectFlow();
    } else {
      await get().fetchProfile();
    }
  },

  // Función para forzar recarga desde el servidor (ignorando caché local)
  forceRefreshFromServer: async () => {
    console.log('[useCurrentUser] Forzando recarga desde el servidor...');
    set({ initialized: false, profile: null, loading: true, error: null });
    
    try {
      const token = useAuth.getState().userToken;
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Obtener perfil directamente del servidor
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
      console.log('[useCurrentUser] Obteniendo perfil desde servidor:', endpoint);
      
      const res = await fetch(endpoint, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      if (res.ok) {
        const serverData = await res.json();
        console.log('[useCurrentUser] Perfil obtenido del servidor:', serverData);
        
        // Crear perfil completo
        const completeProfile = createDefaultProfile(serverData);
        const validatedProfile = get().setProfileWithValidation(completeProfile);
        
        if (validatedProfile) {
          // Guardar localmente
          await get().saveProfileLocally(validatedProfile);
          await get().saveProfileToDB(validatedProfile);
          
          set({ 
            profile: validatedProfile, 
            loading: false, 
            error: null,
            initialized: true 
          });
          
          console.log('[useCurrentUser] ✅ Perfil recargado desde servidor exitosamente');
          return validatedProfile;
        }
      } else {
        const errorText = await res.text();
        throw new Error(`Error del servidor: ${res.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.error('[useCurrentUser] Error forzando recarga desde servidor:', error);
      set({ 
        profile: null, 
        loading: false, 
        error: error.message,
        initialized: true 
      });
      throw error;
    }
    
    return null;
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

  saveProfileToDB: async (profile) => {
    console.log('[useCurrentUser] Guardando perfil en base de datos...');
    try {
      const localProfile: LocalProfile = {
        id: profile.id,
        userId: profile.userId,
        patientProfileId: profile.patientProfileId,
        name: profile.name,
        age: profile.age,
        birthDate: profile.birthDate,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        weight: profile.weight,
        height: profile.height,
        bloodType: profile.bloodType,
        emergencyContactName: profile.emergencyContactName,
        emergencyContactRelation: profile.emergencyContactRelation,
        emergencyContactPhone: profile.emergencyContactPhone,
        allergies: profile.allergies,
        chronicDiseases: profile.chronicDiseases,
        currentConditions: profile.currentConditions,
        reactions: profile.reactions,
        doctorName: profile.doctorName,
        doctorContact: profile.doctorContact,
        hospitalReference: profile.hospitalReference,
        phone: profile.phone,
        relationship: profile.relationship,
        photoUrl: profile.photoUrl,
        photoFileId: profile.photoFileId,
        role: profile.role,
        createdAt: profile.createdAt || new Date().toISOString(),
        updatedAt: profile.updatedAt || new Date().toISOString()
      };
      
      await localDB.saveProfile(localProfile);
      console.log('[useCurrentUser] Perfil guardado en base de datos con éxito.');
    } catch (error) {
      console.error('[useCurrentUser] Error al guardar perfil en base de datos:', error);
      throw error;
    }
  },

  loadProfileFromDB: async (id) => {
    console.log('[useCurrentUser] Cargando perfil desde base de datos...');
    try {
      const localProfile = await localDB.getProfile(id);
      if (localProfile) {
        const profile: UserProfile = {
          id: localProfile.id,
          userId: localProfile.userId,
          patientProfileId: localProfile.patientProfileId,
          name: localProfile.name,
          age: localProfile.age,
          birthDate: localProfile.birthDate,
          dateOfBirth: localProfile.dateOfBirth,
          gender: localProfile.gender,
          weight: localProfile.weight,
          height: localProfile.height,
          bloodType: localProfile.bloodType,
          emergencyContactName: localProfile.emergencyContactName,
          emergencyContactRelation: localProfile.emergencyContactRelation,
          emergencyContactPhone: localProfile.emergencyContactPhone,
          allergies: localProfile.allergies,
          chronicDiseases: localProfile.chronicDiseases,
          currentConditions: localProfile.currentConditions,
          reactions: localProfile.reactions,
          doctorName: localProfile.doctorName,
          doctorContact: localProfile.doctorContact,
          hospitalReference: localProfile.hospitalReference,
          phone: localProfile.phone,
          relationship: localProfile.relationship,
          photoUrl: localProfile.photoUrl,
          photoFileId: localProfile.photoFileId,
          role: localProfile.role,
          createdAt: localProfile.createdAt,
          updatedAt: localProfile.updatedAt
        };
        
        console.log('[useCurrentUser] Perfil cargado desde base de datos con éxito.');
        return profile;
      }
      console.log('[useCurrentUser] No hay perfil en base de datos.');
      return null;
    } catch (error) {
      console.error('[useCurrentUser] Error al cargar perfil desde base de datos:', error);
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

      console.log('[useCurrentUser] Foto subida exitosamente:', result.url, 'Método:', result.method);
      
      // Si es una imagen de respaldo, mostrar mensaje informativo
      if (result.method === 'local' || result.method === 'base64') {
        console.log('[useCurrentUser] ⚠️ Imagen guardada como respaldo (ImageKit no disponible)');
      }
      
      // Retornar URL; si es local/base64, igualmente la app la mostrará con OptimizedImage
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
    
    // No saltar: siempre confirmar datos desde /auth/me para evitar perfiles mezclados
    const currentProfile = null;
    
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

  // Función para forzar actualización del perfil con datos correctos
  forceProfileRefresh: async () => {
    console.log('[useCurrentUser] 🔄 Forzando actualización del perfil...');
    set({ loading: true, error: null });
    
    try {
      const token = useAuth.getState().userToken;
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Obtener perfil correcto del servidor
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
      console.log('[useCurrentUser] Obteniendo perfil correcto desde:', endpoint);
      
      const res = await fetch(endpoint, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      if (res.ok) {
        const serverData = await res.json();
        console.log('[useCurrentUser] Perfil correcto obtenido del servidor:', serverData);
        
        // Aplicar corrección de IDs si es necesario
        const correctedProfile = validateAndFixProfileIds(serverData);
        
        set({ 
          profile: correctedProfile, 
          loading: false, 
          error: null 
        });
        
        console.log('[useCurrentUser] ✅ Perfil actualizado correctamente');
        return correctedProfile;
      } else {
        throw new Error(`Error obteniendo perfil: ${res.status}`);
      }
    } catch (error) {
      console.error('[useCurrentUser] Error forzando actualización:', error);
      set({ 
        profile: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
      throw error;
    }
  },

}));