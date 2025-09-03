// Configuración de la API
export const API_CONFIG = {
  BASE_URL: 'https://www.recuerdamed.org/api',
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
  
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
      ME: '/auth/me',
      CAREGIVER_ME: '/auth/caregiver/me',
    },
    USERS: {
      PROFILE: '/users/profile',
      UPDATE: '/users/profile',
    },
    PATIENTS: {
      ME: '/patients/:id',
      BY_ID: '/patients/:id',
      PHOTO: '/patients/:id/photo',
      TEST_FIELDS: '/patients/test-fields',
    },
    CAREGIVERS: {
      ME: '/caregivers/me',
      PATIENTS: '/caregivers/patients',
      INVITE: '/caregivers/invite',
      JOIN: '/caregivers/join',
    },
    PERMISSIONS: {
      BASE: '/permissions',
      CAREGIVER: '/permissions/caregiver',
      BY_ID: '/permissions/:id',
    },
    MEDICATIONS: {
      BASE: '/medications',
      BY_ID: '/medications/:id',
    },
    APPOINTMENTS: {
      BASE: '/appointments',
      BY_ID: '/appointments/:id',
    },
    TREATMENTS: {
      BASE: '/treatments',
      BY_ID: '/treatments/:id',
    },
    INTAKE_EVENTS: {
      BASE: '/intake-events',
      BY_ID: '/intake-events/:id',
    },
    NOTES: {
      BASE: '/notes',
      BY_ID: '/notes/:id',
    },
    NOTIFICATIONS: {
      BASE: '/notifications',
      BY_ID: '/notifications/:id',
      READ: '/notifications/:id/read',
      ARCHIVE: '/notifications/:id/archive',
      STATS: '/notifications/stats',
      BULK_READ: '/notifications/bulk/read',
      CLEANUP: '/notifications/cleanup/old',
      HEALTH: '/notifications/health',
      PING: '/notifications/ping',
    },
    SUBSCRIBE: {
      BASE: '/subscribe',
      BY_ID: '/subscribe/:id',
    },
    SYSTEM: {
      HEALTH: '/health',
      UPLOADS: '/uploads/:filename',
    },
  },
};

// Configuración de la aplicación
export const APP_CONFIG = {
  // Configuración de notificaciones
  NOTIFICATIONS: {
    DEFAULT_CHANNEL: 'default',
    MEDICATION_CHANNEL: 'medications',
    APPOINTMENT_CHANNEL: 'appointments',
    SNOOZE_MINUTES: 10,
    MAX_RETRY_ATTEMPTS: 3,
  },
  
  // Configuración offline
  OFFLINE: {
    MAX_STORAGE_SIZE: 50 * 1024 * 1024, // 50MB
    SYNC_INTERVAL: 30000, // 30 segundos
    MAX_PENDING_ITEMS: 100,
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas
  },
  
  // Configuración de errores
  ERROR_HANDLING: {
    MAX_ERROR_LOG_SIZE: 100,
    ERROR_REPORTING_ENABLED: true,
    CRASH_RECOVERY_ENABLED: true,
  },
  
  // Configuración de rendimiento
  PERFORMANCE: {
    DEBOUNCE_DELAY: 300, // 300ms
    THROTTLE_DELAY: 1000, // 1 segundo
    MAX_CONCURRENT_REQUESTS: 5,
    REQUEST_TIMEOUT: 15000, // 15 segundos
  },
  
  // Configuración de seguridad
  SECURITY: {
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutos
    MAX_LOGIN_ATTEMPTS: 5,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas
  },
};

// Función para construir URLs de la API
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    Object.keys(params).forEach(key => {
      url = url.replace(`:${key}`, params[key]);
    });
  }
  
  return url;
}

// Función para construir URL con query parameters
export function buildApiUrlWithQuery(endpoint: string, queryParams?: Record<string, any>): string {
  let url = buildApiUrl(endpoint);
  
  if (queryParams && Object.keys(queryParams).length > 0) {
    const queryString = Object.keys(queryParams)
      .filter(key => queryParams[key] !== undefined && queryParams[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');
    
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  return url;
}

// Función para manejar errores de red de forma consistente
export function handleNetworkError(error: any): string {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Error de conexión. Verifica tu conexión a internet.';
  }
  
  if (error.status === 401) {
    return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
  }
  
  if (error.status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }
  
  if (error.status === 404) {
    return 'Recurso no encontrado.';
  }
  
  if (error.status >= 500) {
    return 'Error del servidor. Inténtalo más tarde.';
  }
  
  return error.message || 'Error desconocido.';
}

// Función para validar datos de entrada
export function validateInput(data: any, requiredFields: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`El campo ${field} es requerido.`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Función para limpiar datos sensibles
export function sanitizeData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Configuración de paginación por defecto
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
};

// Tipos de notificación disponibles
export const NOTIFICATION_TYPES = {
  MEDICATION_REMINDER: 'MEDICATION_REMINDER',
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  TREATMENT_REMINDER: 'TREATMENT_REMINDER',
  SYSTEM: 'SYSTEM',
  CUSTOM: 'CUSTOM',
} as const;

// Prioridades de notificación
export const NOTIFICATION_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

// Estados de notificación
export const NOTIFICATION_STATUSES = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  ARCHIVED: 'ARCHIVED',
} as const;

// Tipos de sangre disponibles
export const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];

// Géneros disponibles
export const GENDERS = [
  'Masculino', 'Femenino', 'No binario', 'Prefiero no decir'
];

// Relaciones de contacto de emergencia
export const EMERGENCY_RELATIONS = [
  'Padre', 'Madre', 'Hijo', 'Hija', 'Hermano', 'Hermana',
  'Esposo', 'Esposa', 'Pareja', 'Amigo', 'Amiga', 'Otro'
];

// Relaciones de cuidador
export const CAREGIVER_RELATIONS = [
  'Padre', 'Madre', 'Hijo', 'Hija', 'Hermano', 'Hermana',
  'Esposo', 'Esposa', 'Pareja', 'Amigo', 'Amiga', 'Tutor', 'Otro'
];

// Estados de citas
export const APPOINTMENT_STATUSES = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

// Estados de tratamientos
export const TREATMENT_STATUSES = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
} as const;

// Estados de permisos
export const PERMISSION_STATUSES = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;

// Acciones de eventos de ingesta
export const INTAKE_ACTIONS = {
  TAKEN: 'TAKEN',
  SNOOZE: 'SNOOZE',
  SKIPPED: 'SKIPPED',
} as const;

// Tipos de eventos de ingesta
export const INTAKE_KINDS = {
  MED: 'MED',
  TRT: 'TRT',
} as const;

// Re-exportar tipos desde types/index.ts
export type { 
  Notification, 
  NotificationFilters, 
  NotificationStats, 
  CreateNotificationData,
  PaginatedResponse,
  PaginationParams
} from '../types';
