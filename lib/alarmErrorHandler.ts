/**
 * Sistema de manejo de errores para alarmas
 */

export interface AlarmError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export class AlarmErrorHandler {
  private static instance: AlarmErrorHandler;
  private errorHistory: AlarmError[] = [];
  private maxHistorySize = 50;

  public static getInstance(): AlarmErrorHandler {
    if (!AlarmErrorHandler.instance) {
      AlarmErrorHandler.instance = new AlarmErrorHandler();
    }
    return AlarmErrorHandler.instance;
  }

  /**
   * Registrar un error
   */
  public logError(error: Partial<AlarmError>): void {
    const fullError: AlarmError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Error desconocido',
      details: error.details,
      timestamp: new Date(),
      recoverable: error.recoverable ?? true,
    };

    this.errorHistory.unshift(fullError);
    
    // Mantener solo los últimos errores
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    console.error(`[AlarmErrorHandler] ${fullError.code}: ${fullError.message}`, fullError.details);
  }

  /**
   * Obtener errores recientes
   */
  public getRecentErrors(limit: number = 10): AlarmError[] {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Obtener errores por código
   */
  public getErrorsByCode(code: string): AlarmError[] {
    return this.errorHistory.filter(error => error.code === code);
  }

  /**
   * Limpiar historial de errores
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Verificar si hay errores críticos
   */
  public hasCriticalErrors(): boolean {
    const criticalCodes = ['PERMISSION_DENIED', 'NOTIFICATION_FAILED', 'AUDIO_FAILED'];
    return this.errorHistory.some(error => 
      criticalCodes.includes(error.code) && 
      (Date.now() - error.timestamp.getTime()) < 300000 // Últimos 5 minutos
    );
  }

  /**
   * Obtener estadísticas de errores
   */
  public getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    recent: number;
    critical: number;
  } {
    const now = Date.now();
    const recentThreshold = 300000; // 5 minutos

    const byCode: Record<string, number> = {};
    this.errorHistory.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    });

    return {
      total: this.errorHistory.length,
      byCode,
      recent: this.errorHistory.filter(error => 
        (now - error.timestamp.getTime()) < recentThreshold
      ).length,
      critical: this.errorHistory.filter(error => 
        !error.recoverable && (now - error.timestamp.getTime()) < recentThreshold
      ).length,
    };
  }
}

// Instancia singleton
export const alarmErrorHandler = AlarmErrorHandler.getInstance();

// Funciones de utilidad para errores comunes
export const AlarmErrorCodes = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOTIFICATION_FAILED: 'NOTIFICATION_FAILED',
  AUDIO_FAILED: 'AUDIO_FAILED',
  NAVIGATION_FAILED: 'NAVIGATION_FAILED',
  DATA_INVALID: 'DATA_INVALID',
  SCHEDULING_FAILED: 'SCHEDULING_FAILED',
  STORAGE_FAILED: 'STORAGE_FAILED',
  NETWORK_FAILED: 'NETWORK_FAILED',
} as const;

export function createAlarmError(
  code: string,
  message: string,
  details?: any,
  recoverable: boolean = true
): AlarmError {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
    recoverable,
  };
}

// Función para manejar errores de forma consistente
export function handleAlarmError(error: any, context: string): void {
  let alarmError: Partial<AlarmError>;

  if (error.code) {
    alarmError = {
      code: error.code,
      message: error.message || 'Error en ' + context,
      details: { originalError: error, context },
      recoverable: true,
    };
  } else if (error.message) {
    alarmError = {
      code: 'UNKNOWN_ERROR',
      message: `Error en ${context}: ${error.message}`,
      details: { originalError: error, context },
      recoverable: true,
    };
  } else {
    alarmError = {
      code: 'UNKNOWN_ERROR',
      message: `Error desconocido en ${context}`,
      details: { originalError: error, context },
      recoverable: true,
    };
  }

  alarmErrorHandler.logError(alarmError);
}
