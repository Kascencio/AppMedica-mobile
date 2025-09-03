import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useDatabase } from '../hooks/useDatabase';

interface DatabaseInitializerProps {
  children: React.ReactNode;
}

export const DatabaseInitializer: React.FC<DatabaseInitializerProps> = ({ children }) => {
  const { isInitialized, isInitializing, error } = useDatabase();

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
