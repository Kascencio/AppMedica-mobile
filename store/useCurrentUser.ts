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
    console.log('[useCurrentUser] ========== INICIO updateProfile ==========');
    console.log('[useCurrentUser] Datos recibidos:', JSON.stringify(data, null, 2));
    
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const { profile } = get();
      
      console.log('[useCurrentUser] Actualizando perfil con datos:', data);
      console.log('[useCurrentUser] Perfil actual:', profile);
      
      // Actualizar campos según la estructura del backend
      const allowedFields = [
        'name', 'dateOfBirth', 'gender', 'weight', 'height', 'bloodType',
        'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
        'allergies', 'chronicDiseases', 'currentConditions', 'reactions',
        'doctorName', 'doctorContact', 'hospitalReference', 'photoUrl', 'age'
      ];
      
      const bodyData: Record<string, any> = {};
      allowedFields.forEach(field => {
        let value = data[field as keyof typeof data];
        
        // Mapear birthDate del frontend a dateOfBirth del backend
        if (field === 'dateOfBirth' && !value) {
          value = data.birthDate;
        }
        
        // Mapear géneros del español al inglés
        if (field === 'gender' && value) {
          const genderMap: Record<string, string> = {
            'Masculino': 'male',
            'Femenino': 'female',
            'Otro': 'other'
          };
          value = genderMap[value] || value;
        }
        
        if (value !== undefined && value !== null && value !== '') {
          // Campos que deben ser números
          if (field === 'weight' || field === 'height') {
            let numValue: number;
            
            if (typeof value === 'number') {
              numValue = value;
            } else if (typeof value === 'string') {
              numValue = parseFloat(value);
            } else {
              console.log(`[useCurrentUser] Omitiendo campo ${field} - tipo inválido:`, typeof value);
              return;
            }
            
            // Validar que sea un número válido
            if (!isNaN(numValue) && isFinite(numValue) && numValue > 0) {
              bodyData[field] = numValue; // Asegurar que sea number
              console.log(`[useCurrentUser] Campo ${field} convertido a número:`, numValue, typeof numValue);
            } else {
              console.log(`[useCurrentUser] Omitiendo campo ${field} - valor inválido:`, numValue);
            }
          } else if (field === 'dateOfBirth') {
            // Calcular edad a partir de la fecha de nacimiento
            try {
              const birthDate = new Date(value);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              
              if (age >= 0 && age <= 150) {
                bodyData['age'] = age; // Agregar campo age como número
                bodyData[field] = value; // Mantener dateOfBirth también
                console.log(`[useCurrentUser] Edad calculada: ${age} años`);
              } else {
                console.log(`[useCurrentUser] Edad calculada inválida: ${age}`);
              }
            } catch (error) {
              console.log(`[useCurrentUser] Error calculando edad:`, error);
            }
          } else {
            // Campos de texto
            bodyData[field] = value;
          }
        }
      });
      
      console.log('[useCurrentUser] Campos permitidos enviados:', Object.keys(bodyData));
      console.log('[useCurrentUser] Datos a enviar (bodyData):', JSON.stringify(bodyData, null, 2));
      console.log('[useCurrentUser] Datos originales del formulario:', JSON.stringify(data, null, 2));
      
      // Verificar que no haya NaN en los datos
      Object.entries(bodyData).forEach(([key, value]) => {
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          console.error(`[useCurrentUser] 🚨 PROBLEMA: Campo ${key} contiene valor inválido:`, value);
        }
      });
      
      // Usar el ID del paciente para construir la URL
      const patientId = profile?.patientProfileId || profile?.id;
      if (!patientId) {
        throw new Error('ID de paciente no encontrado');
      }
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME, { id: patientId.toString() });
      
      // Limpiar datos antes de enviar - remover cualquier valor NaN o inválido
      const cleanBodyData = { ...bodyData };
      Object.keys(cleanBodyData).forEach(key => {
        const value = cleanBodyData[key];
        
        // Para campos numéricos, asegurar que sean números válidos
        if (key === 'weight' || key === 'height' || key === 'age') {
          if (typeof value !== 'number' || isNaN(value) || !isFinite(value) || value <= 0) {
            console.log(`[useCurrentUser] Removiendo campo ${key} con valor inválido:`, value, typeof value);
            delete cleanBodyData[key];
          } else {
            console.log(`[useCurrentUser] Campo ${key} válido:`, value, typeof value);
          }
        } else if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          console.log(`[useCurrentUser] Removiendo campo ${key} con valor inválido:`, value);
          delete cleanBodyData[key];
        }
      });
      
      const body = JSON.stringify(cleanBodyData);
      
      // Verificación final de tipos antes de enviar
      console.log('[useCurrentUser] Verificación final de tipos:');
      Object.entries(cleanBodyData).forEach(([key, value]) => {
        if (key === 'weight' || key === 'height' || key === 'age') {
          console.log(`[useCurrentUser] ${key}: ${value} (${typeof value}) - ${typeof value === 'number' ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
        }
      });
      
      console.log('[useCurrentUser] Endpoint:', endpoint);
      console.log('[useCurrentUser] Body:', body);
      
      // Usar PATCH directamente (según las pruebas)
      console.log('[useCurrentUser] Usando PATCH para actualizar perfil...');
      let res;
      
      res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.log('[useCurrentUser] Error de API:', res.status, err);
        
        // Manejar error 500 específicamente
        if (res.status === 500) {
          console.log('[useCurrentUser] ⚠️ Error 500 del servidor, guardando localmente como fallback...');
          
          // Crear perfil actualizado combinando datos existentes con nuevos
          const updatedProfile = {
            ...profile,
            ...bodyData,
            // Mapear campos del backend al frontend
            birthDate: bodyData.dateOfBirth || profile?.birthDate,
            // Mapear géneros del inglés al español
            gender: bodyData.gender === 'male' ? 'Masculino' : 
                   bodyData.gender === 'female' ? 'Femenino' : 
                   bodyData.gender === 'other' ? 'Otro' : bodyData.gender,
          };
          
          // Guardar localmente
          await get().saveProfileLocally(updatedProfile);
          await AsyncStorage.setItem('lastProfileSync', new Date().toISOString());
          set({ profile: updatedProfile, loading: false });
          
          console.log('[useCurrentUser] ✅ Perfil guardado localmente como fallback');
          return; // No lanzar error, ya que se guardó localmente
        }
        
        let errorMessage = 'Error al actualizar perfil';
        if (res.status === 405) {
          errorMessage = `Método no permitido en ${endpoint}. Verificar endpoint de la API.`;
        } else if (res.status === 404) {
          errorMessage = `Endpoint ${endpoint} no encontrado. Verificar configuración de la API.`;
        } else if (res.status === 401) {
          errorMessage = 'No autorizado. Verificar token de autenticación.';
        } else if (res.status === 400) {
          if (err.issues && Array.isArray(err.issues)) {
            console.log('[useCurrentUser] Issues completos del servidor:', JSON.stringify(err.issues, null, 2));
            const fieldErrors = err.issues.map((issue: any) => {
              const field = issue.path?.join('.') || 'campo';
              console.log(`[useCurrentUser] Issue específico - Campo: ${field}, Esperado: ${issue.expected}, Recibido: ${issue.received}, Mensaje: ${issue.message}`);
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
      await AsyncStorage.setItem('lastProfileSync', new Date().toISOString());
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