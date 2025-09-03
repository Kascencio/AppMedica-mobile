import { useState, useEffect } from 'react';
import { localDB } from '../data/db';

export const useDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeDatabase = async () => {
    if (isInitialized || isInitializing) {
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      console.log('[useDatabase] Inicializando base de datos...');
      await localDB.init();
      setIsInitialized(true);
      console.log('[useDatabase] Base de datos inicializada correctamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[useDatabase] Error inicializando base de datos:', errorMessage);
      
      // Intentar recuperación automática
      try {
        console.log('[useDatabase] Intentando recuperación automática...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
        await localDB.init();
        setIsInitialized(true);
        console.log('[useDatabase] Recuperación exitosa');
      } catch (recoveryError) {
        console.error('[useDatabase] Error en recuperación:', recoveryError);
        setError(errorMessage);
        // No detener la app, marcar como inicializada para permitir funcionamiento básico
        setIsInitialized(true);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initializeDatabase();
  }, []);

  return {
    isInitialized,
    isInitializing,
    error,
    initializeDatabase
  };
};
