import { create } from 'zustand';
import { useAuth } from './useAuth';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { UserProfile } from '../types';

interface CurrentUserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean; // Nuevo estado para controlar carga inicial
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  resetProfile: () => void; // Nueva función para reiniciar
  refreshProfile: () => Promise<void>; // Nueva función para forzar recarga
}

export const useCurrentUser = create<CurrentUserState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  initialized: false, // Inicialmente no se ha cargado

  fetchProfile: async () => {
    console.log('[useCurrentUser] Iniciando fetchProfile...');
    
    // Evitar llamadas múltiples simultáneas
    const currentState = get();
    if (currentState.loading) {
      console.log('[useCurrentUser] Ya hay una carga en progreso, saltando...');
      return;
    }
    
    // Si ya está inicializado y tiene perfil, no recargar
    if (currentState.initialized && currentState.profile) {
      console.log('[useCurrentUser] Ya inicializado con perfil, saltando...');
      return;
    }
    
          console.log('[useCurrentUser] Configuración de API cargada');
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      console.log('[useCurrentUser] Token obtenido:', token ? 'SÍ' : 'NO');
      if (!token) throw new Error('No autenticado');
      
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          console.log('[useCurrentUser] Perfil básico creado desde token:', userProfile);
          
          // PRIMERO: Intentar obtener información del usuario desde /auth/me
          try {
            const authEndpoint = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
            console.log('[useCurrentUser] Obteniendo información de usuario desde:', authEndpoint);
            
            const authRes = await fetch(authEndpoint, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (authRes.ok) {
              const authData = await authRes.json();
              console.log('[useCurrentUser] Datos de usuario obtenidos:', authData);
              
              // Actualizar perfil con datos de autenticación
              Object.assign(userProfile, authData);
            }
          } catch (authError) {
            console.log('[useCurrentUser] Error obteniendo datos de usuario:', authError);
          }
          
          // SEGUNDO: Intentar obtener información completa del perfil desde /patients/me
          try {
            const patientsEndpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
            console.log('[useCurrentUser] Obteniendo perfil de paciente desde:', patientsEndpoint);
            
            const patientsRes = await fetch(patientsEndpoint, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (patientsRes.ok) {
              const patientsData = await patientsRes.json();
              console.log('[useCurrentUser] Perfil de paciente obtenido:', patientsData);
              
              // Combinar información del token, auth y patients
              const completeProfile = {
                ...userProfile,
                ...patientsData,
                id: patientsData.id || userProfile.id,
              };
              console.log('[useCurrentUser] Perfil completo combinado:', completeProfile);
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
                // Asegurar que los campos nulos se manejen correctamente
                name: profileByIdData.name || userProfile.name || null,
                age: profileByIdData.age || null,
                weight: profileByIdData.weight || null,
                height: profileByIdData.height || null,
                allergies: profileByIdData.allergies || null,
                reactions: profileByIdData.reactions || null,
                doctorName: profileByIdData.doctorName || null,
                doctorContact: profileByIdData.doctorContact || null,
                photoUrl: profileByIdData.photoUrl || null,
              };
              console.log('[useCurrentUser] Perfil completo obtenido por ID:', completeProfile);
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
    console.log('[useCurrentUser] Tipos de datos recibidos:', Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, typeof value])
    ));
    
    // Verificar si hay NaN en los datos de entrada
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number' && isNaN(value)) {
        console.log(`[useCurrentUser] 🚨 PROBLEMA: Campo ${key} contiene NaN desde el inicio:`, value);
      }
    });
    
    set({ loading: true, error: null });
    try {
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');
      const { profile } = get();
      
      console.log('[useCurrentUser] Actualizando perfil con datos:', data);
      console.log('[useCurrentUser] Perfil actual:', profile);
      
      // No necesitamos validar userId ya que no lo enviamos
      // La API lo obtiene del token JWT automáticamente
      console.log('[useCurrentUser] Profile completo:', JSON.stringify(profile, null, 2));
      
      let res;
      let endpoint;
      let method;
      let body;
      
      // Intentar diferentes métodos HTTP para /patients/me
      endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
      
      // Según la documentación, solo enviar los campos del perfil (sin IDs)
      // Filtrar solo los campos permitidos según API_DOCS.md
      const allowedFields = ['name', 'age', 'weight', 'height', 'allergies', 'reactions', 'doctorName', 'doctorContact', 'photoUrl'];
      const bodyData: Record<string, any> = {};
      
      allowedFields.forEach(field => {
        if (data[field as keyof typeof data] !== undefined) {
          bodyData[field] = data[field as keyof typeof data];
        }
      });
      
      console.log('[useCurrentUser] Campos permitidos enviados:', Object.keys(bodyData));
      console.log('[useCurrentUser] Campos filtrados de data original:', Object.keys(data));
      
      // Verificar que no haya NaN en los datos antes de stringify
      console.log('[useCurrentUser] Datos antes de stringify:', bodyData);
      Object.entries(bodyData).forEach(([key, value]) => {
        if (typeof value === 'number' && isNaN(value)) {
          console.log(`[useCurrentUser] ⚠️ Campo ${key} contiene NaN:`, value);
        }
      });
      
      body = JSON.stringify(bodyData);
      console.log('[useCurrentUser] Body JSON final:', body);
      
      console.log('[useCurrentUser] Endpoint:', endpoint);
      console.log('[useCurrentUser] Body:', body);
      console.log('[useCurrentUser] Datos originales:', data);
      console.log('[useCurrentUser] Token válido:', !!token);
      console.log('[useCurrentUser] Tipos de datos:', Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, typeof value])
      ));
      
      // Probar PUT primero
      console.log('[useCurrentUser] Intentando con PUT /patients/me');
      res = await fetch(endpoint, {
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
      
      // Si PATCH también falla con 405, probar POST
      if (!res.ok && res.status === 405) {
        console.log('[useCurrentUser] PATCH falló con 405, intentando POST /patients/me');
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body,
        });
      }
      
      // Si PATCH falla con 400 (datos inválidos), probar POST /patients (sin /me)
      if (!res.ok && res.status === 400) {
        const alternativeEndpoint = buildApiUrl('/patients');
        console.log('[useCurrentUser] PATCH falló con 400, intentando POST /patients (crear nuevo perfil)');
        
        // Para POST /patients necesitamos incluir userId
        const bodyDataWithUserId = {
          ...bodyData,
          userId: profile?.userId, // Agregar userId para crear perfil
        };
        
        const bodyWithUserId = JSON.stringify(bodyDataWithUserId);
        console.log('[useCurrentUser] POST /patients con userId:', bodyWithUserId);
        
        res = await fetch(alternativeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: bodyWithUserId,
        });
      }
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.log('[useCurrentUser] Error de API:', res.status, err);
        
        // Mensajes de error más específicos según el código de estado
        let errorMessage = 'Error al actualizar perfil';
        if (res.status === 405) {
          errorMessage = `Método ${method} no permitido en ${endpoint}. Verificar endpoint de la API.`;
        } else if (res.status === 404) {
          errorMessage = `Endpoint ${endpoint} no encontrado. Verificar configuración de la API.`;
        } else if (res.status === 401) {
          errorMessage = 'No autorizado. Verificar token de autenticación.';
        } else if (res.status === 400) {
          // Mostrar detalles específicos de validación si están disponibles
          if (err.issues && Array.isArray(err.issues)) {
            console.log('[useCurrentUser] Issues completos:', JSON.stringify(err.issues, null, 2));
            const fieldErrors = err.issues.map((issue: any) => {
              const field = issue.path?.join('.') || 'campo';
              console.log(`[useCurrentUser] Issue: campo="${field}", expected="${issue.expected}", received="${issue.received}", message="${issue.message}"`);
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
      set({ profile: updatedProfile });
      
      // Recargar el perfil para asegurar sincronización con el servidor
      await get().refreshProfile();
      
    } catch (err: any) {
      console.log('[useCurrentUser] Error en updateProfile:', err.message);
      set({ error: err.message });
      throw err; // Re-lanzar el error para que lo maneje la UI
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
    set({ initialized: false }); // Resetear estado para permitir recarga
    await get().fetchProfile();
  },
}));

// Comentario: Puedes usar useCurrentUser().profile en cualquier pantalla para acceder al perfil actual.