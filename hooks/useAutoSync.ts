import { useEffect, useRef } from 'react';
import { useOffline } from '../store/useOffline';
import { useMedications } from '../store/useMedications';
import { useAppointments } from '../store/useAppointments';
import { useTreatments } from '../store/useTreatments';
import { useNotes } from '../store/useNotes';
import { useIntakeEvents } from '../store/useIntakeEvents';

export function useAutoSync() {
  const { isOnline, pendingSync, syncPendingData, checkConnectivity } = useOffline();
  const { getMedications } = useMedications();
  const { getAppointments } = useAppointments();
  const { getTreatments } = useTreatments();
  const { getNotes } = useNotes();
  const { getEvents } = useIntakeEvents();
  
  const wasOnlineRef = useRef(isOnline);
  const syncInProgressRef = useRef(false);
  const lastSyncAttemptRef = useRef(0);

  useEffect(() => {
    // Solo sincronizar cuando cambiamos de offline a online
    if (isOnline && !wasOnlineRef.current && pendingSync.length > 0 && !syncInProgressRef.current) {
      console.log('[useAutoSync] Conexión recuperada, iniciando sincronización automática...');
      
      const performAutoSync = async () => {
        try {
          syncInProgressRef.current = true;
          lastSyncAttemptRef.current = Date.now();
          
          // Verificar conectividad real antes de sincronizar
          const hasRealConnection = await checkConnectivity();
          if (!hasRealConnection) {
            console.log('[useAutoSync] Sin conectividad real, saltando sincronización');
            return;
          }
          
          // Sincronizar datos pendientes
          await syncPendingData();
          
          // Recargar datos desde el servidor con retry
          const syncData = async (retryCount = 0) => {
            try {
              await Promise.all([
                getMedications(),
                getAppointments(),
                getTreatments(),
                getNotes(),
                getEvents(),
              ]);
              console.log('[useAutoSync] Sincronización automática completada');
            } catch (error) {
              console.error('[useAutoSync] Error recargando datos:', error);
              if (retryCount < 2) {
                console.log(`[useAutoSync] Reintentando sincronización (${retryCount + 1}/3)...`);
                setTimeout(() => syncData(retryCount + 1), 2000);
              }
            }
          };
          
          await syncData();
        } catch (error) {
          console.error('[useAutoSync] Error en sincronización automática:', error);
        } finally {
          syncInProgressRef.current = false;
        }
      };
      
      // Pequeño delay para asegurar que la conexión sea estable
      setTimeout(performAutoSync, 1000);
    }
    
    wasOnlineRef.current = isOnline;
  }, [isOnline, pendingSync.length, syncPendingData, getMedications, getAppointments, getTreatments, getNotes, getEvents, checkConnectivity]);

  // Sincronización periódica cuando estamos online
  useEffect(() => {
    if (!isOnline) return;

    const periodicSync = async () => {
      // Solo sincronizar si han pasado al menos 5 minutos desde el último intento
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < 5 * 60 * 1000) return;
      
      if (!syncInProgressRef.current && pendingSync.length > 0) {
        console.log('[useAutoSync] Sincronización periódica iniciada...');
        
        try {
          syncInProgressRef.current = true;
          lastSyncAttemptRef.current = now;
          
          await syncPendingData();
        } catch (error) {
          console.error('[useAutoSync] Error en sincronización periódica:', error);
        } finally {
          syncInProgressRef.current = false;
        }
      }
    };

    // Sincronizar cada 10 minutos
    const interval = setInterval(periodicSync, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isOnline, pendingSync.length, syncPendingData]);

  return {
    isOnline,
    pendingSyncCount: pendingSync.length,
    isSyncing: syncInProgressRef.current,
    lastSyncAttempt: lastSyncAttemptRef.current,
  };
}
