import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { checkAutoOpenPermissions } from '../lib/notifications';

export default function AutoOpenAlarmTester() {
  const [testStatus, setTestStatus] = useState<string>('');

  // Función para verificar permisos de apertura automática
  const checkAutoOpenPermissionsStatus = async () => {
    try {
      setTestStatus('Verificando permisos de apertura automática...\n');
      
      const permissions = await checkAutoOpenPermissions();
      
      let status = '=== ESTADO DE PERMISOS DE APERTURA AUTOMÁTICA ===\n\n';
      
      // Estado de notificaciones
      status += `📱 NOTIFICACIONES:\n`;
      status += `• Estado: ${permissions.details.notifications.status}\n`;
      status += `• Concedido: ${permissions.notifications ? '✅ Sí' : '❌ No'}\n`;
      
      status += `\n🔝 OVERLAY (Aparecer arriba de las apps):\n`;
      status += `• Concedido: ${permissions.overlay ? '✅ Sí' : '❌ No'}\n`;
      
      status += `\n🎯 RESULTADO GENERAL:\n`;
      if (permissions.allGranted) {
        status += `✅ TODOS LOS PERMISOS CONCEDIDOS\n`;
        status += `La apertura automática debería funcionar correctamente.`;
      } else {
        status += `❌ FALTAN PERMISOS\n`;
        status += `Para que funcione la apertura automática necesitas:\n`;
        if (!permissions.notifications) {
          status += `• Conceder permisos de notificación\n`;
        }
        if (!permissions.overlay) {
          status += `• Conceder permiso "Aparecer arriba de las apps"\n`;
        }
      }
      
      setTestStatus(status);
      
    } catch (error: any) {
      setTestStatus(`❌ Error verificando permisos: ${error.message}`);
    }
  };

  // Función para solicitar permisos de overlay
  const requestOverlayPermissions = async () => {
    try {
      setTestStatus('Solicitando permisos de overlay...\n');
      
      const { overlayPermissionService } = await import('../lib/overlayPermissionService');
      const granted = await overlayPermissionService.requestOverlayPermission();
      
      if (granted) {
        setTestStatus('✅ Permisos de overlay concedidos!\n\nAhora puedes probar la apertura automática.');
      } else {
        setTestStatus('❌ Permisos de overlay no concedidos.\n\nPara probar la apertura automática necesitas conceder el permiso "Aparecer arriba de las apps".');
      }
      
    } catch (error: any) {
      setTestStatus(`❌ Error solicitando permisos: ${error.message}`);
    }
  };

  // Función para probar System Alert Window
  const testSystemAlertWindow = async () => {
    try {
      setTestStatus('Probando System Alert Window...\n');
      
      const { systemAlertWindowService } = await import('../lib/systemAlertWindowService');
      const isAvailable = await systemAlertWindowService.isServiceAvailable();
      
      if (!isAvailable) {
        setTestStatus('❌ System Alert Window no disponible.\n\nNecesitas conceder el permiso de "Aparecer arriba de las apps".');
        Alert.alert(
          'Permiso Requerido',
          'Para probar System Alert Window, necesitas conceder el permiso de "Aparecer arriba de las apps".',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Conceder', onPress: requestOverlayPermissions }
          ]
        );
        return;
      }
      
      // Simular datos de alarma
      const mockAlarmData = {
        test: true,
        type: 'MEDICATION',
        kind: 'MED',
        refId: `test_overlay_${Date.now()}`,
        medicationName: 'Test de Overlay - Medicamento',
        dosage: '1 tableta',
        scheduledFor: new Date().toISOString(),
        instructions: 'Test de System Alert Window'
      };
      
      setTestStatus('Mostrando alerta de prueba con System Alert Window...\n\nEsta alerta debería aparecer encima de otras aplicaciones.');
      
      const success = await systemAlertWindowService.showAlarmAlert(mockAlarmData);
      
      if (success) {
        setTestStatus('✅ System Alert Window funcionando correctamente!\n\nLa alerta se mostró encima de otras aplicaciones.');
      } else {
        setTestStatus('⚠️ System Alert Window no funcionó completamente.\n\nSe mostró una alerta de respaldo.');
      }
      
    } catch (error: any) {
      setTestStatus(`❌ Error probando System Alert Window: ${error.message}`);
    }
  };

  // Función para programar alarma de apertura automática
  const scheduleAutoOpenTest = async (delay: number, type: 'MEDICATION' | 'APPOINTMENT' | 'TREATMENT') => {
    try {
      setTestStatus(`Programando alarma de ${delay} segundos...`);
      
      const { scheduleNotification } = await import('../lib/notifications');
      const triggerTime = new Date(Date.now() + (delay * 1000));
      
      // Datos específicos según el tipo
      const getTestData = () => {
        switch (type) {
          case 'MEDICATION':
            return {
              test: true,
              type: 'MEDICATION',
              kind: 'MED',
              refId: `test_med_${Date.now()}`,
              medicationName: 'Test de Apertura Automática - Medicamento',
              dosage: '1 tableta',
              scheduledFor: triggerTime.toISOString(),
              instructions: 'Tomar con agua'
            };
          case 'APPOINTMENT':
            return {
              test: true,
              type: 'APPOINTMENT',
              kind: 'APPOINTMENT',
              refId: `test_appt_${Date.now()}`,
              appointmentTitle: 'Test de Apertura Automática - Cita',
              doctorName: 'Dr. Test',
              scheduledFor: triggerTime.toISOString(),
              location: 'Consultorio Test'
            };
          case 'TREATMENT':
            return {
              test: true,
              type: 'TREATMENT',
              kind: 'TREATMENT',
              refId: `test_treatment_${Date.now()}`,
              treatmentName: 'Test de Apertura Automática - Tratamiento',
              instructions: 'Seguir las instrucciones del médico',
              scheduledFor: triggerTime.toISOString()
            };
          default:
            return {};
        }
      };

      const getTitleAndBody = () => {
        switch (type) {
          case 'MEDICATION':
            return {
              title: '💊 Test de Apertura Automática - Medicamento',
              body: `Alarma de medicamento programada para ${delay} segundos. La app debería abrirse automáticamente.`
            };
          case 'APPOINTMENT':
            return {
              title: '📅 Test de Apertura Automática - Cita',
              body: `Alarma de cita programada para ${delay} segundos. La app debería abrirse automáticamente.`
            };
          case 'TREATMENT':
            return {
              title: '🏥 Test de Apertura Automática - Tratamiento',
              body: `Alarma de tratamiento programada para ${delay} segundos. La app debería abrirse automáticamente.`
            };
          default:
            return { title: 'Test', body: 'Test de apertura automática' };
        }
      };

      const { title, body } = getTitleAndBody();

      await scheduleNotification({
        title,
        body,
        data: getTestData(),
        trigger: { date: triggerTime }
      });

      setTestStatus(`✅ Alarma programada para ${delay} segundos\nTipo: ${type}\nHora: ${triggerTime.toLocaleTimeString()}`);
      
      Alert.alert(
        'Test Programado',
        `Alarma de apertura automática programada para ${delay} segundos.\n\nTipo: ${type}\n\nInstrucciones:\n1. Cierra la app completamente\n2. Espera ${delay} segundos\n3. La app debería abrirse automáticamente\n4. Verifica que aparezca la pantalla de alarma`,
        [
          { text: 'Entendido', style: 'default' },
          {
            text: 'Abrir Configuración',
            onPress: () => {
              Alert.alert(
                'Configuración de la App',
                'Para que la apertura automática funcione correctamente, asegúrate de que:\n\n• La app tenga permisos de notificación\n• La app no esté optimizada por el sistema\n• Las notificaciones estén habilitadas\n\n¿Quieres abrir la configuración de la app?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Abrir', onPress: () => Linking.openSettings() }
                ]
              );
            }
          }
        ]
      );

    } catch (error: any) {
      setTestStatus(`❌ Error: ${error.message}`);
      Alert.alert('Error', `Error programando alarma: ${error.message}`);
    }
  };

  // Función para programar múltiples tests
  const scheduleMultipleTests = async () => {
    try {
      setTestStatus('Programando múltiples tests...');
      
      const delays = [10, 15, 20]; // 10, 15 y 20 segundos
      const types: ('MEDICATION' | 'APPOINTMENT' | 'TREATMENT')[] = ['MEDICATION', 'APPOINTMENT', 'TREATMENT'];
      
      for (let i = 0; i < delays.length; i++) {
        await scheduleAutoOpenTest(delays[i], types[i]);
        // Pequeña pausa entre programaciones
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setTestStatus('✅ Múltiples tests programados:\n• Medicamento: 10 segundos\n• Cita: 15 segundos\n• Tratamiento: 20 segundos');
      
      Alert.alert(
        'Tests Múltiples Programados',
        'Se programaron 3 alarmas de apertura automática:\n\n• Medicamento: 10 segundos\n• Cita: 15 segundos\n• Tratamiento: 20 segundos\n\nInstrucciones:\n1. Cierra la app completamente\n2. Espera y observa las alarmas\n3. Cada una debería abrir la app automáticamente\n4. Verifica que aparezcan las pantallas correctas'
      );
      
    } catch (error: any) {
      setTestStatus(`❌ Error: ${error.message}`);
      Alert.alert('Error', `Error programando tests múltiples: ${error.message}`);
    }
  };

  // Función para limpiar todos los tests
  const clearAllTests = async () => {
    Alert.alert(
      'Limpiar Tests',
      '¿Estás seguro de que quieres cancelar todos los tests de apertura automática?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              setTestStatus('Limpiando tests...');
              const { cancelAllNotifications } = await import('../lib/notifications');
              await cancelAllNotifications();
              setTestStatus('✅ Todos los tests han sido cancelados');
              Alert.alert('Limpiado', 'Todos los tests de apertura automática han sido cancelados');
            } catch (error: any) {
              setTestStatus(`❌ Error: ${error.message}`);
              Alert.alert('Error', `Error limpiando: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="phone-portrait-outline" size={32} color={COLORS.primary} />
        <Text style={styles.title}>Test de Apertura Automática</Text>
        <Text style={styles.subtitle}>
          Prueba que las alarmas abran la app automáticamente cuando esté cerrada o en segundo plano
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tests Individuales</Text>
        <Text style={styles.sectionDescription}>
          Programa una alarma específica y cierra la app para probar la apertura automática
        </Text>
        
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.testButton, styles.medicationButton]} 
            onPress={() => scheduleAutoOpenTest(10, 'MEDICATION')}
          >
            <Ionicons name="medical" size={24} color="white" />
            <Text style={styles.buttonText}>Medicamento</Text>
            <Text style={styles.buttonSubtext}>10 segundos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, styles.appointmentButton]} 
            onPress={() => scheduleAutoOpenTest(15, 'APPOINTMENT')}
          >
            <Ionicons name="calendar" size={24} color="white" />
            <Text style={styles.buttonText}>Cita</Text>
            <Text style={styles.buttonSubtext}>15 segundos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, styles.treatmentButton]} 
            onPress={() => scheduleAutoOpenTest(20, 'TREATMENT')}
          >
            <Ionicons name="medical-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Tratamiento</Text>
            <Text style={styles.buttonSubtext}>20 segundos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Múltiple</Text>
        <Text style={styles.sectionDescription}>
          Programa múltiples alarmas para probar la apertura automática secuencial
        </Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.multipleButton]} 
          onPress={scheduleMultipleTests}
        >
          <Ionicons name="layers" size={24} color="white" />
          <Text style={styles.actionButtonText}>Programar Tests Múltiples</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permisos de Overlay</Text>
        <Text style={styles.sectionDescription}>
          Verifica y configura los permisos necesarios para que las alarmas aparezcan encima de otras aplicaciones
        </Text>
        
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.testButton, styles.permissionsButton]} 
            onPress={checkAutoOpenPermissionsStatus}
          >
            <Ionicons name="shield-checkmark" size={24} color="white" />
            <Text style={styles.testButtonText}>Verificar Permisos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, styles.overlayButton]} 
            onPress={requestOverlayPermissions}
          >
            <Ionicons name="phone-portrait" size={24} color="white" />
            <Text style={styles.testButtonText}>Solicitar Overlay</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, styles.systemAlertButton]} 
            onPress={testSystemAlertWindow}
          >
            <Ionicons name="apps" size={24} color="white" />
            <Text style={styles.testButtonText}>Test System Alert</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado del Test</Text>
        {testStatus ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{testStatus}</Text>
          </View>
        ) : (
          <Text style={styles.noStatusText}>No hay tests programados</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instrucciones</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>1.</Text> Programa una alarma usando los botones arriba
          </Text>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>2.</Text> Cierra la app completamente (no solo minimizar)
          </Text>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>3.</Text> Espera el tiempo programado
          </Text>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>4.</Text> La app debería abrirse automáticamente
          </Text>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>5.</Text> Verifica que aparezca la pantalla de alarma correcta
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solución de Problemas</Text>
        <View style={styles.troubleshootingContainer}>
          <Text style={styles.troubleshootingTitle}>Si la app no se abre automáticamente:</Text>
          <Text style={styles.troubleshootingText}>• Verifica que las notificaciones estén habilitadas</Text>
          <Text style={styles.troubleshootingText}>• Asegúrate de que la app no esté optimizada por el sistema</Text>
          <Text style={styles.troubleshootingText}>• Revisa la configuración de permisos de la app</Text>
          <Text style={styles.troubleshootingText}>• Algunos dispositivos pueden requerir configuración adicional</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.clearButton]} 
          onPress={clearAllTests}
        >
          <Ionicons name="trash" size={20} color="white" />
          <Text style={styles.actionButtonText}>Limpiar Todos los Tests</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background.card,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  testButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicationButton: {
    backgroundColor: COLORS.medical.medication,
  },
  appointmentButton: {
    backgroundColor: COLORS.medical.appointment,
  },
  treatmentButton: {
    backgroundColor: COLORS.medical.treatment,
  },
  permissionsButton: {
    backgroundColor: '#059669',
  },
  overlayButton: {
    backgroundColor: '#dc2626',
  },
  systemAlertButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  buttonSubtext: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  multipleButton: {
    backgroundColor: COLORS.primary,
  },
  clearButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: COLORS.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  noStatusText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  instructionsContainer: {
    backgroundColor: COLORS.background.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: 8,
    lineHeight: 20,
  },
  instructionNumber: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  troubleshootingContainer: {
    backgroundColor: COLORS.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  troubleshootingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
    lineHeight: 20,
  },
});
