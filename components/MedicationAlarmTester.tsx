import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleNotification } from '../lib/notifications';

interface MedicationTest {
  name: string;
  dosage: string;
  time: string;
  scheduledId?: string;
}

export default function MedicationAlarmTester() {
  const [medicationName, setMedicationName] = useState('Medicamento de Prueba');
  const [dosage, setDosage] = useState('1 tableta');
  const [testTime, setTestTime] = useState('');
  const [scheduledTests, setScheduledTests] = useState<MedicationTest[]>([]);
  const [testing, setTesting] = useState(false);

  // Obtener hora actual + 1 minuto como default
  const getDefaultTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toTimeString().slice(0, 5);
  };

  const scheduleMedicationTest = async () => {
    if (!medicationName.trim() || !dosage.trim()) {
      Alert.alert('Error', 'Por favor completa el nombre del medicamento y la dosis');
      return;
    }

    setTesting(true);
    
    try {
      const timeToSchedule = testTime || getDefaultTime();
      const [hours, minutes] = timeToSchedule.split(':').map(Number);
      
      // Crear fecha para hoy con la hora especificada
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);
      
      // Si la hora ya pasó hoy, programar para mañana
      if (scheduledDate <= new Date()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      const notificationId = await scheduleNotification({
        title: '💊 Hora de Medicamento',
        body: `${medicationName} - ${dosage}`,
        data: {
          test: true,
          type: 'MEDICATION',
          kind: 'MED',
          refId: `test_med_${Date.now()}`,
          medicationName,
          dosage,
          scheduledFor: scheduledDate.toISOString()
        },
        trigger: { date: scheduledDate }
      });

      const newTest: MedicationTest = {
        name: medicationName,
        dosage,
        time: timeToSchedule,
        scheduledId: notificationId
      };

      setScheduledTests(prev => [...prev, newTest]);

      Alert.alert(
        'Alarma Programada',
        `Medicamento "${medicationName}" programado para ${scheduledDate.toLocaleString()}`,
        [
          { text: 'OK' },
          { 
            text: 'Cancelar Alarma', 
            style: 'destructive',
            onPress: () => cancelMedicationTest(notificationId)
          }
        ]
      );

    } catch (error: any) {
      Alert.alert('Error', `No se pudo programar la alarma: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const cancelMedicationTest = async (notificationId: string) => {
    try {
      const { cancelNotification } = await import('../lib/notifications');
      await cancelNotification(notificationId);
      
      setScheduledTests(prev => prev.filter(test => test.scheduledId !== notificationId));
      Alert.alert('Alarma Cancelada', 'La alarma del medicamento ha sido cancelada');
    } catch (error: any) {
      Alert.alert('Error', `No se pudo cancelar la alarma: ${error.message}`);
    }
  };

  const scheduleMultipleTests = async () => {
    const tests = [
      { name: 'Aspirina', dosage: '100mg', time: '08:00' },
      { name: 'Vitamina D', dosage: '1 cápsula', time: '12:00' },
      { name: 'Omega 3', dosage: '2 cápsulas', time: '18:00' },
      { name: 'Magnesio', dosage: '400mg', time: '21:00' }
    ];

    setTesting(true);
    
    try {
      const promises = tests.map(async (test) => {
        const [hours, minutes] = test.time.split(':').map(Number);
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);
        
        // Si la hora ya pasó hoy, programar para mañana
        if (scheduledDate <= new Date()) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        const notificationId = await scheduleNotification({
          title: '💊 Hora de Medicamento',
          body: `${test.name} - ${test.dosage}`,
          data: {
            test: true,
            type: 'MEDICATION',
            kind: 'MED',
            refId: `test_med_multiple_${index}_${Date.now()}`,
            medicationName: test.name,
            dosage: test.dosage,
            scheduledFor: scheduledDate.toISOString()
          },
          trigger: { date: scheduledDate }
        });

        return {
          name: test.name,
          dosage: test.dosage,
          time: test.time,
          scheduledId: notificationId
        };
      });

      const results = await Promise.all(promises);
      setScheduledTests(prev => [...prev, ...results]);

      Alert.alert(
        'Alarmas Programadas',
        `Se programaron ${results.length} alarmas de medicamentos de prueba`
      );

    } catch (error: any) {
      Alert.alert('Error', `Error programando alarmas múltiples: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const clearAllTests = () => {
    Alert.alert(
      'Limpiar Todas las Pruebas',
      '¿Estás seguro de que quieres cancelar todas las alarmas de prueba?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              const { cancelAllNotifications } = await import('../lib/notifications');
              await cancelAllNotifications();
              setScheduledTests([]);
              Alert.alert('Limpiado', 'Todas las alarmas de prueba han sido canceladas');
            } catch (error: any) {
              Alert.alert('Error', `Error limpiando alarmas: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const testImmediateMedication = async () => {
    try {
      const notificationId = await scheduleNotification({
        title: '💊 Medicamento Inmediato',
        body: `${medicationName} - ${dosage}`,
        data: {
          test: true,
          type: 'MEDICATION',
          kind: 'MED',
          refId: `test_med_immediate_${Date.now()}`,
          medicationName,
          dosage,
          scheduledFor: new Date().toISOString()
        },
        trigger: { seconds: 1 }
      });

      Alert.alert(
        'Notificación Enviada',
        'Se envió una notificación inmediata de medicamento',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', `Error enviando notificación: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>💊 Test de Alarmas de Medicamentos</Text>
      
      {/* Formulario de medicamento */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>📝 Configurar Medicamento de Prueba</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del Medicamento:</Text>
          <TextInput
            style={styles.input}
            value={medicationName}
            onChangeText={setMedicationName}
            placeholder="Ej: Aspirina, Vitamina D..."
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dosis:</Text>
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={setDosage}
            placeholder="Ej: 1 tableta, 100mg..."
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hora (HH:MM) - Opcional:</Text>
          <TextInput
            style={styles.input}
            value={testTime}
            onChangeText={setTestTime}
            placeholder={getDefaultTime()}
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Si no especificas hora, se usará en 1 minuto
          </Text>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={scheduleMedicationTest}
          disabled={testing}
        >
          <Ionicons name="alarm" size={20} color="#fff" />
          <Text style={styles.buttonText}>Programar Alarma</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={testImmediateMedication}
          disabled={testing}
        >
          <Ionicons name="flash" size={20} color="#2563eb" />
          <Text style={[styles.buttonText, { color: '#2563eb' }]}>Test Inmediato</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.tertiaryButton]} 
          onPress={scheduleMultipleTests}
          disabled={testing}
        >
          <Ionicons name="list" size={20} color="#22c55e" />
          <Text style={[styles.buttonText, { color: '#22c55e' }]}>Múltiples Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={clearAllTests}
          disabled={testing}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
          <Text style={[styles.buttonText, { color: '#ef4444' }]}>Limpiar Todo</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de alarmas programadas */}
      {scheduledTests.length > 0 && (
        <View style={styles.scheduledContainer}>
          <Text style={styles.sectionTitle}>⏰ Alarmas Programadas ({scheduledTests.length})</Text>
          
          {scheduledTests.map((test, index) => (
            <View key={index} style={styles.scheduledItem}>
              <View style={styles.scheduledInfo}>
                <Text style={styles.medicationName}>{test.name}</Text>
                <Text style={styles.medicationDosage}>{test.dosage}</Text>
                <Text style={styles.medicationTime}>⏰ {test.time}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => cancelMedicationTest(test.scheduledId!)}
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Información de ayuda */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>ℹ️ Información</Text>
        <Text style={styles.helpText}>
          • Las alarmas de prueba se programan con el prefijo "Test Mode"
        </Text>
        <Text style={styles.helpText}>
          • Puedes programar múltiples medicamentos para probar el sistema
        </Text>
        <Text style={styles.helpText}>
          • Usa "Test Inmediato" para ver notificaciones al instante
        </Text>
        <Text style={styles.helpText}>
          • "Múltiples Tests" programa 4 medicamentos comunes
        </Text>
        <Text style={styles.helpText}>
          • Las alarmas se cancelan automáticamente al salir de la app
        </Text>
      </View>

      {testing && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Programando alarmas...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  tertiaryButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scheduledContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scheduledItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  scheduledInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  medicationDosage: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  medicationTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  cancelButton: {
    padding: 4,
  },
  helpContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#075985',
    marginBottom: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
