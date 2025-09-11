import { useEffect } from 'react';
import { useCurrentUser } from '../store/useCurrentUser';
import { useAuth } from '../store/useAuth';

/**
 * Hook que valida automáticamente el perfil del usuario cuando sea necesario
 * Se ejecuta cuando el perfil cambia y verifica que tenga IDs válidos
 * Implementa el flujo correcto de autenticación: Login → /auth/me → /patients/me
 */
export function useProfileValidation() {
  const { profile, validateCurrentProfile, fetchProfileCorrectFlow } = useCurrentUser();
  const { isAuthenticated, userToken } = useAuth();

  useEffect(() => {
    // Si estamos autenticados pero no tenemos perfil, usar el flujo correcto
    if (isAuthenticated && userToken && !profile) {
      console.log('[useProfileValidation] Usuario autenticado sin perfil, iniciando flujo correcto...');
      fetchProfileCorrectFlow();
    }
    // Si tenemos perfil pero le falta userId (que es crítico), usar el flujo correcto
    else if (profile && !profile.userId) {
      console.log('[useProfileValidation] Perfil sin userId detectado, reiniciando con flujo correcto...');
      fetchProfileCorrectFlow();
    }
    // Si tenemos perfil pero le faltan otros IDs, validar
    else if (profile && (!profile.id || !profile.patientProfileId)) {
      console.log('[useProfileValidation] Detectado perfil sin IDs válidos, validando...');
      validateCurrentProfile();
    }
  }, [profile, validateCurrentProfile, fetchProfileCorrectFlow, isAuthenticated, userToken]);

  return profile;
}
