import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleNotification } from '../lib/notifications';

interface AppointmentTest {
  title: string;
  doctor: string;
  date: string;
  time: string;
  scheduledId?: string;
}

export default function AppointmentAlarmTester() {
  const [appointmentTitle, setAppointmentTitle] = useState('Consulta de Prueba');
  const [doctorName, setDoctorName] = useState('Dr. Test');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [scheduledTests, setScheduledTests] = useState<AppointmentTest[]>([]);
  const [testing, setTesting] = useState(false);

  // Obtener fecha y hora por defecto
  const getDefaultDateTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
    
    return {
      date: tomorrow.toISOString().split('T')[0], // YYYY-MM-DD
      time: '10:00'
    };
  };

  const scheduleAppointmentTest = async () => {
    if (!appointmentTitle.trim() || !doctorName.trim()) {
      Alert.alert('Error', 'Por favor completa el título de la cita y el nombre del doctor');
      return;
    }

    setTesting(true);
    
    try {
      const defaultDateTime = getDefaultDateTime();
      const dateToUse = appointmentDate || defaultDateTime.date;
      const timeToUse = appointmentTime || defaultDateTime.time;
      
      // Crear fecha de la cita
      const appointmentDateTime = new Date(`${dateToUse}T${timeToUse}:00`);
      
      // Crear recordatorio 1 hora antes
      const reminderDateTime = new Date(appointmentDateTime);
      reminderDateTime.setHours(reminderDateTime.getHours() - 1);

      // Si el recordatorio ya pasó, programar para mañana
      if (reminderDateTime <= new Date()) {
        reminderDateTime.setDate(reminderDateTime.getDate() + 1);
        appointmentDateTime.setDate(appointmentDateTime.getDate() + 1);
      }

      const notificationId = await scheduleNotification({
        title: '📅 Recordatorio de Cita',
        body: `${appointmentTitle} con ${doctorName}`,
        data: {
          test: true,
          type: 'APPOINTMENT',
          kind: 'APPOINTMENT',
          refId: `test_appointment_${Date.now()}`,
          appointmentTitle,
          doctorName,
          appointmentDate: appointmentDateTime.toISOString(),
          scheduledFor: reminderDateTime.toISOString()
        },
        trigger: { date: reminderDateTime }
      });

      const newTest: AppointmentTest = {
        title: appointmentTitle,
        doctor: doctorName,
        date: dateToUse,
        time: timeToUse,
        scheduledId: notificationId
      };

      setScheduledTests(prev => [...prev, newTest]);

      Alert.alert(
        'Recordatorio Programado',
        `Recordatorio de "${appointmentTitle}" programado para ${reminderDateTime.toLocaleString()}\n\nCita: ${appointmentDateTime.toLocaleString()}`,
        [
          { text: 'OK' },
          { 
            text: 'Cancelar Recordatorio', 
            style: 'destructive',
            onPress: () => cancelAppointmentTest(notificationId)
          }
        ]
      );

    } catch (error: any) {
      Alert.alert('Error', `No se pudo programar el recordatorio: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const cancelAppointmentTest = async (notificationId: string) => {
    try {
      const { cancelNotification } = await import('../lib/notifications');
      await cancelNotification(notificationId);
      
      setScheduledTests(prev => prev.filter(test => test.scheduledId !== notificationId));
      Alert.alert('Recordatorio Cancelado', 'El recordatorio de la cita ha sido cancelado');
    } catch (error: any) {
      Alert.alert('Error', `No se pudo cancelar el recordatorio: ${error.message}`);
    }
  };

  const scheduleMultipleAppointments = async () => {
    const appointments = [
      { title: 'Consulta General', doctor: 'Dr. García', date: '2024-01-15', time: '09:00' },
      { title: 'Revisión Anual', doctor: 'Dr. López', date: '2024-01-16', time: '14:30' },
      { title: 'Examen de Sangre', doctor: 'Dr. Martínez', date: '2024-01-17', time: '08:00' },
      { title: 'Consulta Especializada', doctor: 'Dr. Rodríguez', date: '2024-01-18', time: '16:00' }
    ];

    setTesting(true);
    
    try {
      const promises = appointments.map(async (appointment) => {
        const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
        const reminderDateTime = new Date(appointmentDateTime);
        reminderDateTime.setHours(reminderDateTime.getHours() - 1);

        // Si el recordatorio ya pasó, programar para la próxima semana
        if (reminderDateTime <= new Date()) {
          reminderDateTime.setDate(reminderDateTime.getDate() + 7);
          appointmentDateTime.setDate(appointmentDateTime.getDate() + 7);
        }

        const notificationId = await scheduleNotification({
          title: '📅 Recordatorio de Cita',
          body: `${appointment.title} con ${appointment.doctor}`,
          data: {
            test: true,
            type: 'APPOINTMENT',
            kind: 'APPOINTMENT',
            refId: `test_appointment_multiple_${index}_${Date.now()}`,
            appointmentTitle: appointment.title,
            doctorName: appointment.doctor,
            appointmentDate: appointmentDateTime.toISOString(),
            scheduledFor: reminderDateTime.toISOString()
          },
          trigger: { date: reminderDateTime }
        });

        return {
          title: appointment.title,
          doctor: appointment.doctor,
          date: appointment.date,
          time: appointment.time,
          scheduledId: notificationId
        };
      });

      const results = await Promise.all(promises);
      setScheduledTests(prev => [...prev, ...results]);

      Alert.alert(
        'Recordatorios Programados',
        `Se programaron ${results.length} recordatorios de citas de prueba`
      );

    } catch (error: any) {
      Alert.alert('Error', `Error programando recordatorios múltiples: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const testImmediateAppointment = async () => {
    try {
      const notificationId = await scheduleNotification({
        title: '📅 Cita Inmediata',
        body: `${appointmentTitle} con ${doctorName}`,
        data: {
          test: true,
          type: 'APPOINTMENT',
          kind: 'APPOINTMENT',
          refId: `test_appointment_immediate_${Date.now()}`,
          appointmentTitle,
          doctorName,
          scheduledFor: new Date().toISOString()
        },
        trigger: { seconds: 1 }
      });

      Alert.alert(
        'Notificación Enviada',
        'Se envió una notificación inmediata de cita médica'
      );
    } catch (error: any) {
      Alert.alert('Error', `Error enviando notificación: ${error.message}`);
    }
  };

  const clearAllTests = () => {
    Alert.alert(
      'Limpiar Todas las Pruebas',
      '¿Estás seguro de que quieres cancelar todos los recordatorios de prueba?',
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📅 Test de Alarmas de Citas Médicas</Text>
      
      {/* Formulario de cita */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>📝 Configurar Cita de Prueba</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Título de la Cita:</Text>
          <TextInput
            style={styles.input}
            value={appointmentTitle}
            onChangeText={setAppointmentTitle}
            placeholder="Ej: Consulta General, Revisión..."
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del Doctor:</Text>
          <TextInput
            style={styles.input}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="Ej: Dr. García, Dr. López..."
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fecha (YYYY-MM-DD) - Opcional:</Text>
          <TextInput
            style={styles.input}
            value={appointmentDate}
            onChangeText={setAppointmentDate}
            placeholder={getDefaultDateTime().date}
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.helpText}>
            Si no especificas fecha, se usará mañana
          </Text>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hora (HH:MM) - Opcional:</Text>
          <TextInput
            style={styles.input}
            value={appointmentTime}
            onChangeText={setAppointmentTime}
            placeholder={getDefaultDateTime().time}
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.helpText}>
            El recordatorio se programará 1 hora antes
          </Text>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={scheduleAppointmentTest}
          disabled={testing}
        >
          <Ionicons name="calendar" size={20} color="#fff" />
          <Text style={styles.buttonText}>Programar Recordatorio</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={testImmediateAppointment}
          disabled={testing}
        >
          <Ionicons name="flash" size={20} color="#2563eb" />
          <Text style={[styles.buttonText, { color: '#2563eb' }]}>Test Inmediato</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.tertiaryButton]} 
          onPress={scheduleMultipleAppointments}
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

      {/* Lista de recordatorios programados */}
      {scheduledTests.length > 0 && (
        <View style={styles.scheduledContainer}>
          <Text style={styles.sectionTitle}>⏰ Recordatorios Programados ({scheduledTests.length})</Text>
          
          {scheduledTests.map((test, index) => (
            <View key={index} style={styles.scheduledItem}>
              <View style={styles.scheduledInfo}>
                <Text style={styles.appointmentTitle}>{test.title}</Text>
                <Text style={styles.doctorName}>👨‍⚕️ {test.doctor}</Text>
                <Text style={styles.appointmentDateTime}>
                  📅 {test.date} a las {test.time}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => cancelAppointmentTest(test.scheduledId!)}
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
          • Los recordatorios se programan 1 hora antes de la cita
        </Text>
        <Text style={styles.helpText}>
          • Puedes programar múltiples citas para probar el sistema
        </Text>
        <Text style={styles.helpText}>
          • Usa "Test Inmediato" para ver notificaciones al instante
        </Text>
        <Text style={styles.helpText}>
          • "Múltiples Tests" programa 4 citas de prueba
        </Text>
        <Text style={styles.helpText}>
          • Las fechas pasadas se programan automáticamente para el futuro
        </Text>
      </View>

      {testing && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Programando recordatorios...</Text>
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
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  doctorName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  appointmentDateTime: {
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
