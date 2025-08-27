import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { handleNetworkError } from '../constants/config';

interface ErrorState {
  hasError: boolean;
  error: string | null;
  errorType: 'network' | 'validation' | 'permission' | 'unknown';
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorType: 'unknown',
  });

  const handleError = useCallback((error: any, context?: string) => {
    console.error(`[${context || 'useErrorHandler'}] Error:`, error);
    
    let errorMessage = 'Error desconocido';
    let errorType: ErrorState['errorType'] = 'unknown';
    
    // Clasificar el tipo de error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
      errorType = 'network';
    } else if (error.status === 401) {
      errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      errorType = 'permission';
    } else if (error.status === 403) {
      errorMessage = 'No tienes permisos para realizar esta acción.';
      errorType = 'permission';
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado.';
      errorType = 'network';
    } else if (error.status >= 500) {
      errorMessage = 'Error del servidor. Inténtalo más tarde.';
      errorType = 'network';
    } else if (error.message) {
      errorMessage = error.message;
      errorType = 'unknown';
    }
    
    setErrorState({
      hasError: true,
      error: errorMessage,
      errorType,
    });
    
    // Mostrar alerta solo para errores críticos
    if (errorType === 'permission' || errorType === 'network') {
      Alert.alert('Error', errorMessage, [
        { text: 'OK', onPress: () => clearError() }
      ]);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorType: 'unknown',
    });
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncFunction();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError]);

  return {
    ...errorState,
    handleError,
    clearError,
    handleAsyncError,
  };
}

// Hook específico para errores de red
export function useNetworkErrorHandler() {
  const { handleError, clearError, ...errorState } = useErrorHandler();
  
  const handleNetworkError = useCallback((error: any, context?: string) => {
    const networkError = {
      ...error,
      message: handleNetworkError(error),
    };
    handleError(networkError, context);
  }, [handleError]);
  
  return {
    ...errorState,
    handleNetworkError,
    clearError,
  };
}

// Hook específico para errores de validación
export function useValidationErrorHandler() {
  const { handleError, clearError, ...errorState } = useErrorHandler();
  
  const handleValidationError = useCallback((errors: string[], context?: string) => {
    const validationError = {
      message: errors.join('\n'),
      type: 'validation',
    };
    handleError(validationError, context);
  }, [handleError]);
  
  return {
    ...errorState,
    handleValidationError,
    clearError,
  };
}
