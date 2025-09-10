import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getBackgroundTaskStatus, unregisterBackgroundAlarmTask, registerBackgroundAlarmTask } from '../lib/alarmTask';
import * as BackgroundFetch from 'expo-background-fetch';

interface BackgroundTaskStatusProps {
  style?: any;
}

export const BackgroundTaskStatus: React.FC<BackgroundTaskStatusProps> = ({ style }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const taskStatus = await getBackgroundTaskStatus();
      const backgroundFetchStatus = await BackgroundFetch.getStatusAsync();
      setStatus({
        ...taskStatus,
        backgroundFetchStatus,
      });
    } catch (error) {
      console.error('[BackgroundTaskStatus] Error obteniendo estado:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async () => {
    if (!status) return;
    
    setLoading(true);
    try {
      if (status.isRegistered) {
        await unregisterBackgroundAlarmTask();
      } else {
        await registerBackgroundAlarmTask();
      }
      await checkStatus();
    } catch (error) {
      console.error('[BackgroundTaskStatus] Error cambiando estado de tarea:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (!status) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.text}>Cargando estado de tarea en segundo plano...</Text>
      </View>
    );
  }

  const getStatusText = () => {
    if (status.backgroundFetchStatus === BackgroundFetch.BackgroundFetchStatus.Available) {
      return 'Disponible';
    } else if (status.backgroundFetchStatus === BackgroundFetch.BackgroundFetchStatus.Denied) {
      return 'Denegado';
    } else if (status.backgroundFetchStatus === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      return 'Restringido';
    } else {
      return 'Desconocido';
    }
  };

  const getStatusColor = () => {
    if (status.backgroundFetchStatus === BackgroundFetch.BackgroundFetchStatus.Available) {
      return '#10b981';
    } else if (status.backgroundFetchStatus === BackgroundFetch.BackgroundFetchStatus.Denied) {
      return '#ef4444';
    } else {
      return '#f59e0b';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Estado de Tarea en Segundo Plano</Text>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>Registrada:</Text>
        <Text style={[styles.value, { color: status.isRegistered ? '#10b981' : '#ef4444' }]}>
          {status.isRegistered ? 'Sí' : 'No'}
        </Text>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>Estado del sistema:</Text>
        <Text style={[styles.value, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>Puede ejecutar:</Text>
        <Text style={[styles.value, { color: status.canRun ? '#10b981' : '#ef4444' }]}>
          {status.canRun ? 'Sí' : 'No'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={toggleTask}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Procesando...' : (status.isRegistered ? 'Desregistrar' : 'Registrar')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.refreshButton, loading && styles.buttonDisabled]} 
        onPress={checkStatus}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    margin: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
  },
  refreshButton: {
    backgroundColor: '#64748b',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
