import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../store/useAuth';
import { useDatabase } from '../hooks/useDatabase';

interface StartupDebuggerProps {
  onForceSkip?: () => void;
}

export const StartupDebugger: React.FC<StartupDebuggerProps> = ({ onForceSkip }) => {
  const { loading: authLoading, isAuthenticated, userToken } = useAuth();
  const { isInitialized, isInitializing, error: dbError } = useDatabase();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getAuthStatus = () => {
    if (authLoading) return '🔄 Cargando...';
    if (isAuthenticated) return '✅ Autenticado';
    return '❌ No autenticado';
  };

  const getDbStatus = () => {
    if (dbError) return `❌ Error: ${dbError}`;
    if (isInitializing) return '🔄 Inicializando...';
    if (isInitialized) return '✅ Inicializada';
    return '⏳ Pendiente';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🔍 Debug de Inicio</Text>
        <Text style={styles.elapsed}>Tiempo transcurrido: {formatTime(elapsed)}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Autenticación</Text>
          <Text style={styles.statusText}>Estado: {getAuthStatus()}</Text>
          <Text style={styles.detailText}>Loading: {authLoading ? 'true' : 'false'}</Text>
          <Text style={styles.detailText}>Token: {userToken ? 'Presente' : 'Ausente'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base de Datos</Text>
          <Text style={styles.statusText}>Estado: {getDbStatus()}</Text>
          <Text style={styles.detailText}>Inicializada: {isInitialized ? 'true' : 'false'}</Text>
          <Text style={styles.detailText}>Inicializando: {isInitializing ? 'true' : 'false'}</Text>
          {dbError && <Text style={styles.errorText}>Error: {dbError}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnóstico</Text>
          {authLoading && (
            <Text style={styles.warningText}>
              ⚠️ Auth loading está en true. Revisa useAuth.loadToken()
            </Text>
          )}
          {isInitializing && elapsed > 10 && (
            <Text style={styles.warningText}>
              ⚠️ Base de datos lleva {formatTime(elapsed)} inicializando.{'\n'}
              Posible problema en migraciones o creación de tablas.
            </Text>
          )}
          {!authLoading && !isInitializing && !isInitialized && (
            <Text style={styles.warningText}>
              ⚠️ DB no está inicializada ni inicializando.{'\n'}
              Posible error silencioso en useDatabase.
            </Text>
          )}
        </View>

        <Text style={styles.infoText}>
          Revisa los logs en la consola con los prefijos:{'\n'}
          • [useAuth]{'\n'}
          • [useDatabase]{'\n'}
          • [LocalDatabase]
        </Text>

        {onForceSkip && elapsed > 20 && (
          <TouchableOpacity style={styles.skipButton} onPress={onForceSkip}>
            <Text style={styles.skipButtonText}>
              ⚠️ Forzar Continuar (PELIGROSO)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  elapsed: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  skipButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
