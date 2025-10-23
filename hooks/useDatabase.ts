import { useState, useEffect } from 'react';
import { localDB } from '../data/db';

export const useDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeDatabase = async () => {
    if (isInitialized || isInitializing) {
      console.log('[useDatabase] Ya inicializada o en proceso, saltando...', { isInitialized, isInitializing });
      return;
    }

    console.log('[useDatabase] INICIANDO proceso de inicialización de base de datos...');
    setIsInitializing(true);
    setError(null);

    try {
      console.log('[useDatabase] Llamando a localDB.init()...');
      await localDB.init();
      console.log('[useDatabase] localDB.init() completado exitosamente');
      setIsInitialized(true);
      console.log('[useDatabase] ✅ Base de datos inicializada correctamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[useDatabase] ❌ Error inicializando base de datos:', errorMessage);
      console.error('[useDatabase] Stack trace:', err);
      
      // Intentar recuperación automática
      try {
        console.log('[useDatabase] Intentando recuperación automática en 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('[useDatabase] Reintentando localDB.init()...');
        await localDB.init();
        setIsInitialized(true);
        console.log('[useDatabase] ✅ Recuperación exitosa');
      } catch (recoveryError) {
        console.error('[useDatabase] ❌ Error en recuperación:', recoveryError);
        setError(errorMessage);
        // No detener la app, marcar como inicializada para permitir funcionamiento básico
        console.warn('[useDatabase] ⚠️ Marcando como inicializada a pesar del error para no bloquear la app');
        setIsInitialized(true);
      }
    } finally {
      console.log('[useDatabase] Finalizando proceso de inicialización, setting isInitializing=false');
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
