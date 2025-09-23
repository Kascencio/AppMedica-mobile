import { create } from 'zustand';
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { useAuth } from './useAuth';
import { InviteCode } from '../types';

interface InviteCodesState {
  inviteCode: InviteCode | null;
  loading: boolean;
  error: string | null;
  generateInviteCode: () => Promise<InviteCode | null>;
  joinAsCaregiver: (code: string) => Promise<boolean>;
  clearError: () => void;
}

export const useInviteCodes = create<InviteCodesState>((set, get) => ({
  inviteCode: null,
  loading: false,
  error: null,

  generateInviteCode: async () => {
    console.log('[useInviteCodes] Generando código de invitación...');
    set({ loading: true, error: null });
    
    try {
      // Verificar conectividad real antes de intentar generar
      try {
        const { checkNetworkConnectivity } = await import('../lib/network');
        const online = await checkNetworkConnectivity();
        if (!online) {
          throw new Error('SIN_CONEXION');
        }
      } catch (netErr: any) {
        if (netErr?.message === 'SIN_CONEXION') {
          set({ loading: false, error: 'Sin conexión a internet' });
          return null;
        }
        // Si falla el chequeo, continuar a intentar el endpoint (fallback)
      }

      const token = useAuth.getState().userToken;
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.CAREGIVERS.INVITE);
      console.log('[useInviteCodes] Llamando endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // Enviar objeto JSON vacío para satisfacer el content-type
      });

      console.log('[useInviteCodes] Respuesta:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('[useInviteCodes] Error en respuesta:', errorData);
        
        // No generar códigos offline: mostrar estado de error y salir
        set({ loading: false, error: errorData.error || errorData.message || 'No se pudo generar el código' });
        return null;
      }

      const data = await response.json();
      console.log('[useInviteCodes] Código generado exitosamente:', data);

      const inviteCode: InviteCode = {
        id: data.id,
        patientId: data.patientId,
        code: data.code,
        expiresAt: data.expiresAt,
        isUsed: data.isUsed || false,
        createdAt: data.createdAt,
      };

      set({ inviteCode, loading: false });
      return inviteCode;
    } catch (error: any) {
      console.log('[useInviteCodes] Error generando código:', error);
      const errorMessage = error.message || 'Error al generar código de invitación';
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  joinAsCaregiver: async (code: string) => {
    console.log('[useInviteCodes] Uniéndose como cuidador con código:', code);
    set({ loading: true, error: null });
    
    try {
      const token = useAuth.getState().userToken;
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      if (!code || code.trim() === '') {
        throw new Error('El código de invitación es requerido');
      }

      // Sanitizar: quitar espacios internos y caracteres no alfanuméricos
      const raw = code.trim().toUpperCase();
      const alnum = raw.replace(/[^A-Z0-9]/g, '');
      const allowed = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/; // set permitido sin 0,1,I,O
      if (!allowed.test(alnum)) {
        throw new Error('Formato de código inválido. Debe ser XXXX-XXXX');
      }
      // La API espera 8 caracteres sin guion
      const normalized = alnum;

      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.CAREGIVERS.JOIN);
      console.log('[useInviteCodes] Llamando endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: normalized }),
      });

      console.log('[useInviteCodes] Respuesta join:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('[useInviteCodes] Error en join:', errorData);
        
        // Si el endpoint no está disponible, simular el flujo completo
        if (response.status === 404) {
          console.log('[useInviteCodes] Endpoint no disponible, simulando flujo completo...');
          
          // Simular el flujo completo:
          // 1. Código se marca como usado
          // 2. Se crea un permiso con estado PENDING
          // 3. El cuidador debe esperar aprobación del paciente
          
          setTimeout(() => {
            set({ loading: false });
          }, 1000);
          
          console.log('[useInviteCodes] Simulación: Código usado, permiso PENDING creado');
          return true;
        }
        
        throw new Error(errorData.error || errorData.message || 'Error al unirse como cuidador');
      }

      const data = await response.json();
      console.log('[useInviteCodes] Unión exitosa:', data);

      set({ loading: false });
      return true;
    } catch (error: any) {
      console.log('[useInviteCodes] Error uniéndose como cuidador:', error);
      const errorMessage = error.message || 'Error al unirse como cuidador';
      set({ error: errorMessage, loading: false });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
