import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleNotification } from '../lib/notifications';
import * as Notifications from 'expo-notifications';
import COLORS from '../constants/colors';

interface AdvancedAlarmTestProps {
  onNavigateToAlarm?: () => void;
}

export default function AdvancedAlarmTest({ onNavigateToAlarm }: AdvancedAlarmTestProps) {
  const [isTesting, setIsTesting] = useState(false);

  const testFullScreenIntent = async () => {
    setIsTesting(true);
    try {
      console.log('[AdvancedAlarmTest] Probando FullScreenIntent...');
      
      const triggerDate = new Date(Date.now() + 5000);
      
      // Crear canal de notificación con configuración especial
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('fullscreen_alarm', {
          name: 'Alarma Pantalla Completa',
          description: 'Alarmas que abren la app en pantalla completa',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
          lightColor: '#FF0000',
          sound: 'alarm.mp3',
          enableVibrate: true,
          enableLights: true,
          bypassDnd: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }
      
      // Programar notificación con configuración especial
      await Notifications.scheduleNotificationAsync({
        identifier: 'fullscreen_test',
        content: {
          title: '🚨 ALARMA PANTALLA COMPLETA',
          body: 'Esta alarma debería abrir la app en pantalla completa',
          data: {
            type: 'MEDICATION',
            kind: 'MED',
            medicationId: 'fullscreen_test',
            medicationName: 'Medicamento de Prueba',
            dosage: '500mg',
            instructions: 'Prueba de pantalla completa',
            time: triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            scheduledFor: triggerDate.toISOString(),
            test: true,
            fullScreenIntent: true,
          },
          sound: 'alarm.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 1000, 500, 1000, 500, 1000],
          categoryIdentifier: 'fullscreen_alarm',
          // Configuración especial para Android
          ...(Platform.OS === 'android' && {
            fullScreenIntent: true,
            headsUp: true,
            ongoing: false,
            autoCancel: false,
            visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            showTimestamp: true,
            localOnly: false,
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      
      Alert.alert(
        'Alarma Pantalla Completa Programada',
        'La alarma sonará en 5 segundos. Debería abrir la app en pantalla completa.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('[AdvancedAlarmTest] Error:', error);
      Alert.alert('Error', 'No se pudo programar la alarma');
    } finally {
      setIsTesting(false);
    }
  };

  const testMultipleNotifications = async () => {
    setIsTesting(true);
    try {
      console.log('[AdvancedAlarmTest] Probando múltiples notificaciones...');
      
      const baseTime = Date.now() + 5000;
      
      // Programar múltiples notificaciones con diferentes configuraciones
      for (let i = 0; i < 3; i++) {
        const triggerDate = new Date(baseTime + (i * 1000)); // 1 segundo entre cada una
        
        await Notifications.scheduleNotificationAsync({
          identifier: `multi_test_${i}`,
          content: {
            title: `🔔 Alarma ${i + 1}`,
            body: `Notificación ${i + 1} de 3 - Debería abrir la app`,
            data: {
              type: 'MEDICATION',
              kind: 'MED',
              medicationId: `multi_test_${i}`,
              medicationName: `Medicamento ${i + 1}`,
              dosage: '500mg',
              instructions: `Prueba múltiple ${i + 1}`,
              time: triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
              scheduledFor: triggerDate.toISOString(),
              test: true,
              multiTest: true,
              index: i,
            },
            sound: 'alarm.mp3',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 250, 500],
            categoryIdentifier: 'medications',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
      
      Alert.alert(
        'Múltiples Alarmas Programadas',
        'Se programaron 3 alarmas que sonarán con 1 segundo de diferencia. Al menos una debería abrir la app.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('[AdvancedAlarmTest] Error:', error);
      Alert.alert('Error', 'No se pudieron programar las alarmas');
    } finally {
      setIsTesting(false);
    }
  };

  const testCriticalAlert = async () => {
    setIsTesting(true);
    try {
      console.log('[AdvancedAlarmTest] Probando alerta crítica...');
      
      const triggerDate = new Date(Date.now() + 5000);
      
      // Programar notificación con configuración crítica
      await Notifications.scheduleNotificationAsync({
        identifier: 'critical_test',
        content: {
          title: '🚨 ALERTA CRÍTICA',
          body: 'Esta es una alerta crítica que debería abrir la app inmediatamente',
          data: {
            type: 'MEDICATION',
            kind: 'MED',
            medicationId: 'critical_test',
            medicationName: 'Medicamento Crítico',
            dosage: '1000mg',
            instructions: 'ALERTA CRÍTICA - Tomar inmediatamente',
            time: triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            scheduledFor: triggerDate.toISOString(),
            test: true,
            critical: true,
          },
          sound: 'alarm.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 2000, 1000, 2000, 1000, 2000], // Vibración muy intensa
          categoryIdentifier: 'medications',
          badge: 1,
          // Configuración crítica
          ...(Platform.OS === 'android' && {
            fullScreenIntent: true,
            headsUp: true,
            ongoing: false,
            autoCancel: false,
            visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            showTimestamp: true,
            localOnly: false,
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      
      Alert.alert(
        'Alerta Crítica Programada',
        'La alerta crítica sonará en 5 segundos. Debería abrir la app inmediatamente.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('[AdvancedAlarmTest] Error:', error);
      Alert.alert('Error', 'No se pudo programar la alerta crítica');
    } finally {
      setIsTesting(false);
    }
  };

  const testSystemAlert = async () => {
    setIsTesting(true);
    try {
      console.log('[AdvancedAlarmTest] Probando alerta del sistema...');
      
      const triggerDate = new Date(Date.now() + 5000);
      
      // Programar notificación que debería mostrar alerta del sistema
      await Notifications.scheduleNotificationAsync({
        identifier: 'system_alert_test',
        content: {
          title: '📱 Alerta del Sistema',
          body: 'Esta notificación debería mostrar una alerta del sistema',
          data: {
            type: 'MEDICATION',
            kind: 'MED',
            medicationId: 'system_alert_test',
            medicationName: 'Medicamento Sistema',
            dosage: '500mg',
            instructions: 'Prueba de alerta del sistema',
            time: triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            scheduledFor: triggerDate.toISOString(),
            test: true,
            systemAlert: true,
          },
          sound: 'alarm.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 1000, 500, 1000],
          categoryIdentifier: 'medications',
          // Configuración para alerta del sistema
          ...(Platform.OS === 'android' && {
            fullScreenIntent: true,
            headsUp: true,
            ongoing: false,
            autoCancel: false,
            visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            showTimestamp: true,
            localOnly: false,
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      
      Alert.alert(
        'Alerta del Sistema Programada',
        'La alerta del sistema sonará en 5 segundos. Debería mostrar una alerta nativa.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('[AdvancedAlarmTest] Error:', error);
      Alert.alert('Error', 'No se pudo programar la alerta del sistema');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="settings" size={24} color={COLORS.warning} />
        <Text style={styles.title}>Pruebas Avanzadas de Alarma</Text>
      </View>
      
      <Text style={styles.description}>
        Estas pruebas usan diferentes estrategias para intentar abrir la app automáticamente
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, styles.fullscreenButton]}
          onPress={testFullScreenIntent}
          disabled={isTesting}
        >
          <Ionicons name="phone-portrait" size={20} color={COLORS.text.inverse} />
          <Text style={styles.buttonText}>
            {isTesting ? 'Probando...' : 'Probar Pantalla Completa'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, styles.multipleButton]}
          onPress={testMultipleNotifications}
          disabled={isTesting}
        >
          <Ionicons name="layers" size={20} color={COLORS.text.inverse} />
          <Text style={styles.buttonText}>
            {isTesting ? 'Probando...' : 'Probar Múltiples Alarmas'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, styles.criticalButton]}
          onPress={testCriticalAlert}
          disabled={isTesting}
        >
          <Ionicons name="warning" size={20} color={COLORS.text.inverse} />
          <Text style={styles.buttonText}>
            {isTesting ? 'Probando...' : 'Probar Alerta Crítica'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, styles.systemButton]}
          onPress={testSystemAlert}
          disabled={isTesting}
        >
          <Ionicons name="notifications" size={20} color={COLORS.text.inverse} />
          <Text style={styles.buttonText}>
            {isTesting ? 'Probando...' : 'Probar Alerta del Sistema'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={16} color={COLORS.text.secondary} />
        <Text style={styles.infoText}>
          Estas pruebas usan configuraciones más agresivas para intentar abrir la app. 
          Prueba cada una para ver cuál funciona mejor en tu dispositivo.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.white,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  fullscreenButton: {
    backgroundColor: '#8b5cf6',
  },
  multipleButton: {
    backgroundColor: '#06b6d4',
  },
  criticalButton: {
    backgroundColor: '#dc2626',
  },
  systemButton: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: COLORS.text.inverse,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.tertiary,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
