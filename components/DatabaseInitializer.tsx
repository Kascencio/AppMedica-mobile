import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useDatabase } from '../hooks/useDatabase';

interface DatabaseInitializerProps {
  children: React.ReactNode;
}

export const DatabaseInitializer: React.FC<DatabaseInitializerProps> = ({ children }) => {
  const { isInitialized, isInitializing, error } = useDatabase();
  const [showTimeoutWarning, setShowTimeoutWarning] = React.useState(false);

  // Timeout de seguridad: si después de 15 segundos no se inicializa, mostrar warning
  useEffect(() => {
    if (isInitializing || !isInitialized) {
      const timer = setTimeout(() => {
        console.warn('[DatabaseInitializer] ⚠️ Inicialización tardando más de 15 segundos');
        setShowTimeoutWarning(true);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isInitializing, isInitialized]);

  // Ejecutar limpieza y primer sync silencioso al inicializar
  useEffect(() => {
    if (!isInitialized || isInitializing) return;
    let cancelled = false;
    (async () => {
      try {
        const { localDB } = require('../data/db');
        const result = await localDB.cleanupDuplicateTreatmentMedications();
        if (!cancelled) console.log('[DatabaseInitializer] Limpieza duplicados medicamentos tratamiento:', result);
        const { useTreatments } = require('../store/useTreatments');
        const { useMedications } = require('../store/useMedications');
        const { useAppointments } = require('../store/useAppointments');
        const { useCurrentUser } = require('../store/useCurrentUser');
        const profile = useCurrentUser.getState().profile;
        if (profile?.id || profile?.patientProfileId) {
          try {
            const { checkNetworkConnectivity } = await import('../lib/network');
            const online = await checkNetworkConnectivity();
            if (online) {
              await Promise.all([
                useTreatments.getState().getTreatments().catch(()=>{}),
                useMedications.getState().getMedications().catch(()=>{}),
                useAppointments.getState().getAppointments().catch(()=>{}),
              ]);
              if (!cancelled) console.log('[DatabaseInitializer] Sincronización inicial completada');
            }
          } catch (syncErr) {
            if (!cancelled) console.warn('[DatabaseInitializer] Error en sync inicial:', (syncErr as any)?.message || syncErr);
          }
        }
      } catch (e) {
        if (!cancelled) console.warn('[DatabaseInitializer] Error en rutina de limpieza inicial:', (e as any)?.message || e);
      }
    })();
    return () => { cancelled = true; };
  }, [isInitialized, isInitializing]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Error de Base de Datos</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.retryMessage}>
          Por favor, reinicia la aplicación
        </Text>
      </View>
    );
  }

  if (!isInitialized || isInitializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>
          Inicializando base de datos...
        </Text>
        {showTimeoutWarning && (
          <Text style={styles.warningText}>
            La inicialización está tardando más de lo esperado.{'\n'}
            Por favor espera o reinicia la app.
          </Text>
        )}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  warningText: {
    marginTop: 12,
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  retryMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
