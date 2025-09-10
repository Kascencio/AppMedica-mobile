import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleMedicationReminder, getScheduledNotifications, cancelAllNotifications } from '../lib/notifications';
import { notificationRepair } from '../lib/notificationSystemRepair';

interface NotificationTestProps {
  style?: any;
}

export const NotificationTest: React.FC<NotificationTestProps> = ({ style }) => {
  const [testing, setTesting] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  const loadScheduledCount = async () => {
    try {
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
    } catch (error) {
      console.error('[NotificationTest] Error cargando notificaciones programadas:', error);
    }
  };

  const testImmediateNotification = async () => {
    setTesting(true);
    try {
      const testTime = new Date();
      testTime.setMinutes(testTime.getMinutes() + 1);
      const timeString = testTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      await scheduleMedicationReminder({
        id: 'test_immediate_' + Date.now(),
        name: 'Prueba Inmediata',
        dosage: '1mg',
        time: timeString,
        frequency: 'daily',
        patientProfileId: 'test'
      });

      Alert.alert(
        'Prueba Programada', 
        `Notificación de prueba programada para las ${timeString}. Debería aparecer en 1 minuto.`,
        [
          { text: 'OK', onPress: loadScheduledCount }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Error programando notificación de prueba: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const testDailyNotification = async () => {
    setTesting(true);
    try {
      const testTime = new Date();
      testTime.setHours(testTime.getHours() + 1, 0, 0, 0);
      const timeString = testTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      await scheduleMedicationReminder({
        id: 'test_daily_' + Date.now(),
        name: 'Prueba Diaria',
        dosage: '1mg',
        time: timeString,
        frequency: 'daily',
        patientProfileId: 'test'
      });

      Alert.alert(
        'Prueba Diaria Programada', 
        `Notificación diaria programada para las ${timeString}. Se repetirá todos los días.`,
        [
          { text: 'OK', onPress: loadScheduledCount }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Error programando notificación diaria: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await cancelAllNotifications();
      setScheduledCount(0);
      Alert.alert('Limpieza Completada', 'Todas las notificaciones han sido canceladas.');
    } catch (error) {
      Alert.alert('Error', `Error limpiando notificaciones: ${error}`);
    }
  };

  const runDiagnostic = async () => {
    await notificationRepair.runFullDiagnostic();
  };

  const runRepair = async () => {
    await notificationRepair.runFullRepair();
  };

  // Cargar conteo inicial
  React.useEffect(() => {
    loadScheduledCount();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>🧪 Pruebas de Notificaciones</Text>
      <Text style={styles.subtitle}>Probar y diagnosticar el sistema de notificaciones</Text>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>Notificaciones programadas:</Text>
        <Text style={[styles.value, { color: scheduledCount > 0 ? '#10b981' : '#64748b' }]}>
          {scheduledCount}
        </Text>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={testImmediateNotification}
          disabled={testing}
        >
          <Ionicons name="time" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            {testing ? 'Probando...' : 'Prueba Inmediata'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dailyButton]} 
          onPress={testDailyNotification}
          disabled={testing}
        >
          <Ionicons name="repeat" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            {testing ? 'Probando...' : 'Prueba Diaria'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.diagnosticButton]} 
          onPress={runDiagnostic}
        >
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.buttonText}>Diagnosticar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.repairButton]} 
          onPress={runRepair}
        >
          <Ionicons name="construct" size={20} color="#fff" />
          <Text style={styles.buttonText}>Reparar</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, styles.clearButton]} 
        onPress={clearAllNotifications}
      >
        <Ionicons name="trash" size={20} color="#fff" />
        <Text style={styles.buttonText}>Limpiar Todas</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.refreshButton]} 
        onPress={loadScheduledCount}
      >
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.buttonText}>Actualizar Conteo</Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  testButton: {
    backgroundColor: '#2563eb',
  },
  dailyButton: {
    backgroundColor: '#059669',
  },
  diagnosticButton: {
    backgroundColor: '#7c3aed',
  },
  repairButton: {
    backgroundColor: '#f59e0b',
  },
  clearButton: {
    backgroundColor: '#ef4444',
  },
  refreshButton: {
    backgroundColor: '#64748b',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
