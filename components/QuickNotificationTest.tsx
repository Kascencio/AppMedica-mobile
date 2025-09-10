import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export function QuickNotificationTest() {
  const testImmediateNotification = async () => {
    try {
      console.log('[QuickTest] Probando notificación inmediata...');
      
      // Programar notificación para 5 segundos con configuración de apertura automática
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Prueba Rápida',
          body: '¡Esta es una notificación de prueba que debería abrir la app!',
          sound: 'alarm.mp3',
          data: { 
            test: true, 
            type: 'MEDICATION',
            kind: 'MED',
            medicationId: 'test_med_123',
            medicationName: 'Prueba de Medicamento',
            dosage: '1 comprimido',
            time: '12:00',
            scheduledFor: new Date().toISOString()
          },
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 250, 500, 250, 500],
          categoryIdentifier: 'medications',
          sticky: false,
          autoDismiss: false,
          badge: 1,
          launchImageName: 'SplashScreen',
        },
        trigger: { seconds: 5 },
      });
      
      console.log('[QuickTest] Notificación programada:', notificationId);
      Alert.alert(
        '✅ Éxito', 
        'Notificación programada para 5 segundos.\n\n' +
        'INSTRUCCIONES:\n' +
        '1. Cierra la app completamente\n' +
        '2. Espera 5 segundos\n' +
        '3. La app debería abrirse automáticamente\n' +
        '4. Debería mostrar la pantalla de alarma'
      );
      
    } catch (error) {
      console.error('[QuickTest] Error:', error);
      Alert.alert('❌ Error', `Error: ${error}`);
    }
  };

  const testDailyNotification = async () => {
    try {
      console.log('[QuickTest] Probando notificación diaria...');
      
      // Programar notificación diaria a las 00:00
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📅 Prueba Diaria',
          body: 'Recordatorio diario de prueba',
          sound: 'alarm.mp3',
          data: { test: true, type: 'daily' },
        },
        trigger: {
          hour: 0,
          minute: 0,
          repeats: true,
        },
      });
      
      console.log('[QuickTest] Notificación diaria programada:', notificationId);
      Alert.alert('✅ Éxito', 'Notificación diaria programada para las 00:00');
      
    } catch (error) {
      console.error('[QuickTest] Error:', error);
      Alert.alert('❌ Error', `Error: ${error}`);
    }
  };

  const checkScheduledNotifications = async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[QuickTest] Notificaciones programadas:', scheduled.length);
      Alert.alert('📋 Estado', `Notificaciones programadas: ${scheduled.length}`);
    } catch (error) {
      console.error('[QuickTest] Error:', error);
      Alert.alert('❌ Error', `Error: ${error}`);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[QuickTest] Todas las notificaciones canceladas');
      Alert.alert('✅ Limpiado', 'Todas las notificaciones canceladas');
    } catch (error) {
      console.error('[QuickTest] Error:', error);
      Alert.alert('❌ Error', `Error: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Prueba Rápida de Notificaciones</Text>
      <Text style={styles.subtitle}>Sin depender del sistema de perfiles</Text>
      
      <TouchableOpacity style={styles.button} onPress={testImmediateNotification}>
        <Text style={styles.buttonText}>⏰ Prueba Inmediata (5s)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testDailyNotification}>
        <Text style={styles.buttonText}>📅 Prueba Diaria (00:00)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={checkScheduledNotifications}>
        <Text style={styles.buttonText}>📋 Ver Programadas</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearAllNotifications}>
        <Text style={styles.buttonText}>🗑️ Limpiar Todas</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  clearButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});
