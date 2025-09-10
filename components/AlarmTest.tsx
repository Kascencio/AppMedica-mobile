import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleNotification } from '../lib/notifications';
import { nativeAlarmService } from '../lib/nativeAlarmService';
import { androidAlarmManager } from '../lib/androidAlarmManager';
import * as Notifications from 'expo-notifications';
import COLORS from '../constants/colors';

interface AlarmTestProps {
  onNavigateToAlarm?: () => void;
}

export default function AlarmTest({ onNavigateToAlarm }: AlarmTestProps) {
  const [isTesting, setIsTesting] = useState(false);
  
  // Verificar disponibilidad del módulo nativo
  const nativeModuleInfo = androidAlarmManager.getNativeModuleInfo();

  const testImmediateAlarm = async () => {
    setIsTesting(true);
    try {
      console.log('[AlarmTest] Programando alarma de prueba inmediata...');
      
      // Programar alarma para que suene en 5 segundos
      const triggerDate = new Date(Date.now() + 5000);
      
      // Usar el servicio nativo para mejor apertura automática
      await nativeAlarmService.scheduleAlarmWithAutoOpen({
        id: 'test_med_001',
        title: '💊 Prueba de Alarma - Medicamento',
        body: 'Es hora de tomar Paracetamol 500mg',
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          medicationId: 'test_med_001',
          medicationName: 'Paracetamol',
          dosage: '500mg',
          instructions: 'Tomar con agua',
          time: triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          scheduledFor: triggerDate.toISOString(),
          test: true, // Marcar como prueba
        },
        triggerDate,
        channelId: 'medications',
      });
      
      Alert.alert(
        'Alarma de Prueba Programada',
        'La alarma sonará en 5 segundos. La app debería abrirse automáticamente usando el servicio nativo.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onNavigateToAlarm) {
                onNavigateToAlarm();
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('[AlarmTest] Error programando alarma de prueba:', error);
      Alert.alert('Error', 'No se pudo programar la alarma de prueba');
    } finally {
      setIsTesting(false);
    }
  };

  const testAppointmentAlarm = async () => {
    setIsTesting(true);
    try {
      console.log('[AlarmTest] Programando alarma de prueba para cita...');
      
      // Programar alarma para que suene en 5 segundos
      const triggerDate = new Date(Date.now() + 5000);
      
      // Usar el servicio nativo para mejor apertura automática
      await nativeAlarmService.scheduleAlarmWithAutoOpen({
        id: 'test_appt_001',
        title: '📅 Prueba de Alarma - Cita',
        body: 'Es hora de tu cita médica',
        data: {
          type: 'APPOINTMENT',
          kind: 'APPOINTMENT',
          appointmentId: 'test_appt_001',
          title: 'Cita con Dr. García',
          location: 'Consultorio 205',
          dateTime: triggerDate.toISOString(),
          scheduledFor: triggerDate.toISOString(),
          test: true, // Marcar como prueba
        },
        triggerDate,
        channelId: 'appointments',
      });
      
      Alert.alert(
        'Alarma de Cita Programada',
        'La alarma sonará en 5 segundos. La app debería abrirse automáticamente usando el servicio nativo.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onNavigateToAlarm) {
                onNavigateToAlarm();
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('[AlarmTest] Error programando alarma de cita:', error);
      Alert.alert('Error', 'No se pudo programar la alarma de cita');
    } finally {
      setIsTesting(false);
    }
  };

  const testBackgroundAlarm = async () => {
    setIsTesting(true);
    try {
      console.log('[AlarmTest] Programando alarma de prueba en segundo plano...');
      
      // Programar alarma para que suene en 10 segundos
      const triggerDate = new Date(Date.now() + 10000);
      
      // Usar el servicio nativo para mejor apertura automática
      await nativeAlarmService.scheduleAlarmWithAutoOpen({
        id: 'test_bg_001',
        title: '🔔 Prueba de Alarma en Segundo Plano',
        body: 'Esta alarma debería abrir la app desde segundo plano',
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          medicationId: 'test_bg_001',
          medicationName: 'Vitamina D',
          dosage: '1000 UI',
          instructions: 'Tomar con el desayuno',
          time: triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          scheduledFor: triggerDate.toISOString(),
          test: true, // Marcar como prueba
        },
        triggerDate,
        channelId: 'medications',
      });
      
      Alert.alert(
        'Alarma en Segundo Plano Programada',
        'La alarma sonará en 10 segundos. Minimiza la app para probar la apertura automática usando el servicio nativo.',
        [
          {
            text: 'Minimizar App',
            onPress: () => {
              // En una app real, aquí se minimizaría la app
              console.log('[AlarmTest] App debería minimizarse para probar apertura automática');
            }
          },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      
    } catch (error) {
      console.error('[AlarmTest] Error programando alarma en segundo plano:', error);
      Alert.alert('Error', 'No se pudo programar la alarma en segundo plano');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flask" size={24} color={COLORS.primary} />
        <Text style={styles.title}>Pruebas de Alarma</Text>
      </View>
      
      <Text style={styles.description}>
        Usa estos botones para probar que las alarmas aparezcan correctamente en pantalla
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, styles.medicationButton]}
          onPress={testImmediateAlarm}
          disabled={isTesting}
        >
          <Ionicons name="medical" size={20} color={COLORS.text.inverse} />
          <Text style={styles.buttonText}>
            {isTesting ? 'Probando...' : 'Probar Alarma de Medicamento'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, styles.appointmentButton]}
          onPress={testAppointmentAlarm}
          disabled={isTesting}
        >
          <Ionicons name="calendar" size={20} color={COLORS.text.inverse} />
          <Text style={styles.buttonText}>
            {isTesting ? 'Probando...' : 'Probar Alarma de Cita'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, styles.backgroundButton]}
          onPress={testBackgroundAlarm}
          disabled={isTesting}
        >
          <Ionicons name="phone-portrait" size={20} color={COLORS.text.inverse} />
          <Text style={styles.buttonText}>
            {isTesting ? 'Probando...' : 'Probar Apertura Automática'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={16} color={COLORS.text.secondary} />
        <Text style={styles.infoText}>
          Las alarmas de prueba sonarán en 5-10 segundos. Asegúrate de que las notificaciones estén habilitadas.
        </Text>
      </View>
      
      {/* Información del módulo nativo */}
      <View style={[styles.infoContainer, { backgroundColor: nativeModuleInfo.available ? '#dcfce7' : '#fef2f2' }]}>
        <Ionicons 
          name={nativeModuleInfo.available ? "checkmark-circle" : "close-circle"} 
          size={16} 
          color={nativeModuleInfo.available ? '#16a34a' : '#dc2626'} 
        />
        <Text style={[styles.infoText, { color: nativeModuleInfo.available ? '#16a34a' : '#dc2626' }]}>
          Módulo nativo: {nativeModuleInfo.available ? 'Disponible' : 'No disponible'} 
          {nativeModuleInfo.available ? ` (${nativeModuleInfo.moduleName})` : ''}
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
  medicationButton: {
    backgroundColor: COLORS.medical.medication,
  },
  appointmentButton: {
    backgroundColor: COLORS.medical.appointment,
  },
  backgroundButton: {
    backgroundColor: COLORS.warning,
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
