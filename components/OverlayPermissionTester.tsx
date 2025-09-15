import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { overlayPermissionService } from '../lib/overlayPermissionService';
import { systemAlertWindowService } from '../lib/systemAlertWindowService';
import { checkAutoOpenPermissions } from '../lib/notifications';

export default function OverlayPermissionTester() {
  const [permissionStatus, setPermissionStatus] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Verificar estado de permisos
  const checkPermissionStatus = async () => {
    try {
      setIsChecking(true);
      setPermissionStatus('Verificando estado de permisos...\n');
      
      const permissions = await checkAutoOpenPermissions();
      
      let status = '=== ESTADO DE PERMISOS DE APERTURA AUTOMÁTICA ===\n\n';
      
      // Estado de notificaciones
      status += `📱 NOTIFICACIONES:\n`;
      status += `• Estado: ${permissions.details.notifications.status}\n`;
      status += `• Concedido: ${permissions.notifications ? '✅ Sí' : '❌ No'}\n`;
      
      if (Platform.OS === 'android') {
        status += `• Importancia: ${permissions.details.notifications.settings?.android?.importance || 'No disponible'}\n`;
        status += `• Visibilidad: ${permissions.details.notifications.settings?.android?.lockscreenVisibility || 'No disponible'}\n`;
      } else {
        status += `• Alertas: ${permissions.details.notifications.settings?.ios?.allowsAlert ? '✅ Sí' : '❌ No'}\n`;
        status += `• Sonidos: ${permissions.details.notifications.settings?.ios?.allowsSound ? '✅ Sí' : '❌ No'}\n`;
      }
      
      status += `\n🔝 OVERLAY (Aparecer arriba de las apps):\n`;
      status += `• Concedido: ${permissions.overlay ? '✅ Sí' : '❌ No'}\n`;
      
      status += `\n🎯 RESULTADO GENERAL:\n`;
      status += `• Todos los permisos: ${permissions.allGranted ? '✅ Concedidos' : '❌ Faltantes'}\n`;
      
      if (permissions.allGranted) {
        status += `\n🎉 ¡PERFECTO! La apertura automática debería funcionar correctamente.`;
      } else {
        status += `\n⚠️ FALTAN PERMISOS. La apertura automática puede no funcionar correctamente.`;
        
        if (!permissions.notifications) {
          status += `\n• Necesitas habilitar notificaciones`;
        }
        if (!permissions.overlay) {
          status += `\n• Necesitas conceder "Aparecer arriba de las apps"`;
        }
      }
      
      setPermissionStatus(status);
      
    } catch (error: any) {
      setPermissionStatus(`❌ Error verificando permisos: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Solicitar permisos de overlay
  const requestOverlayPermission = async () => {
    try {
      setIsChecking(true);
      setPermissionStatus('Solicitando permiso de overlay...\n');
      
      const granted = await overlayPermissionService.requestOverlayPermission();
      
      if (granted) {
        setPermissionStatus('✅ Permiso de overlay concedido exitosamente!\n\nAhora puedes probar la apertura automática.');
        Alert.alert(
          '¡Éxito!',
          'El permiso de "Aparecer arriba de las apps" ha sido concedido.\n\nAhora las alarmas podrán abrir la aplicación automáticamente.',
          [{ text: 'Perfecto' }]
        );
      } else {
        setPermissionStatus('❌ Permiso de overlay no concedido.\n\nSigue las instrucciones en pantalla para configurarlo manualmente.');
      }
      
    } catch (error: any) {
      setPermissionStatus(`❌ Error solicitando permiso: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Solicitar todos los permisos
  const requestAllPermissions = async () => {
    try {
      setIsChecking(true);
      setPermissionStatus('Solicitando todos los permisos necesarios...\n');
      
      const granted = await overlayPermissionService.requestAllAutoOpenPermissions();
      
      if (granted) {
        setPermissionStatus('✅ Todos los permisos concedidos exitosamente!\n\nLa apertura automática está completamente configurada.');
      } else {
        setPermissionStatus('⚠️ Algunos permisos no fueron concedidos.\n\nRevisa el estado de permisos para ver qué falta.');
      }
      
    } catch (error: any) {
      setPermissionStatus(`❌ Error solicitando permisos: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Probar System Alert Window
  const testSystemAlertWindow = async () => {
    try {
      setIsChecking(true);
      setPermissionStatus('Probando System Alert Window...\n');
      
      const isAvailable = await systemAlertWindowService.isServiceAvailable();
      
      if (!isAvailable) {
        setPermissionStatus('❌ System Alert Window no disponible.\n\nNecesitas conceder el permiso de "Aparecer arriba de las apps".');
        Alert.alert(
          'Permiso Requerido',
          'Para probar System Alert Window, necesitas conceder el permiso de "Aparecer arriba de las apps".',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Conceder', onPress: requestOverlayPermission }
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
      
      setPermissionStatus('Mostrando alerta de prueba con System Alert Window...\n\nEsta alerta debería aparecer encima de otras aplicaciones.');
      
      const success = await systemAlertWindowService.showAlarmAlert(mockAlarmData);
      
      if (success) {
        setPermissionStatus('✅ System Alert Window funcionando correctamente!\n\nLa alerta se mostró encima de otras aplicaciones.');
      } else {
        setPermissionStatus('⚠️ System Alert Window no funcionó completamente.\n\nSe mostró una alerta de respaldo.');
      }
      
    } catch (error: any) {
      setPermissionStatus(`❌ Error probando System Alert Window: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Abrir configuración del sistema
  const openSystemSettings = () => {
    Alert.alert(
      'Abrir Configuración',
      'Selecciona qué configuración quieres abrir:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Configuración de App',
          onPress: () => Linking.openSettings()
        },
        {
          text: 'Configuración de Notificaciones',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings();
            } else {
              Linking.openSettings();
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
        <Text style={styles.title}>Test de Permisos de Overlay</Text>
        <Text style={styles.subtitle}>
          Verifica y configura los permisos necesarios para la apertura automática de alarmas
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verificación de Permisos</Text>
        <Text style={styles.sectionDescription}>
          Verifica el estado actual de todos los permisos necesarios para la apertura automática
        </Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.checkButton, isChecking && styles.disabledButton]} 
          onPress={checkPermissionStatus}
          disabled={isChecking}
        >
          <Ionicons name="shield-checkmark" size={24} color="white" />
          <Text style={styles.actionButtonText}>Verificar Estado de Permisos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración de Permisos</Text>
        
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.overlayButton, isChecking && styles.disabledButton]} 
            onPress={requestOverlayPermission}
            disabled={isChecking}
          >
            <Ionicons name="phone-portrait" size={24} color="white" />
            <Text style={styles.actionButtonText}>Solicitar Overlay</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.allButton, isChecking && styles.disabledButton]} 
            onPress={requestAllPermissions}
            disabled={isChecking}
          >
            <Ionicons name="settings" size={24} color="white" />
            <Text style={styles.actionButtonText}>Todos los Permisos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pruebas</Text>
        <Text style={styles.sectionDescription}>
          Prueba el funcionamiento del System Alert Window
        </Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.testButton, isChecking && styles.disabledButton]} 
          onPress={testSystemAlertWindow}
          disabled={isChecking}
        >
          <Ionicons name="eye" size={24} color="white" />
          <Text style={styles.actionButtonText}>Probar System Alert Window</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado de Permisos</Text>
        {permissionStatus ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{permissionStatus}</Text>
          </View>
        ) : (
          <Text style={styles.noStatusText}>Ejecuta una verificación para ver el estado de los permisos</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración Manual</Text>
        <Text style={styles.sectionDescription}>
          Si los permisos automáticos no funcionan, puedes configurarlos manualmente
        </Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.settingsButton]} 
          onPress={openSystemSettings}
        >
          <Ionicons name="cog" size={24} color="white" />
          <Text style={styles.actionButtonText}>Abrir Configuración del Sistema</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instrucciones</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>1.</Text> Verifica el estado de permisos
          </Text>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>2.</Text> Solicita los permisos faltantes
          </Text>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>3.</Text> Prueba el System Alert Window
          </Text>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>4.</Text> Si es necesario, configura manualmente en Configuración del Sistema
          </Text>
          <Text style={styles.instructionText}>
            <Text style={styles.instructionNumber}>5.</Text> Una vez configurado, las alarmas podrán abrir la app automáticamente
          </Text>
        </View>
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
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkButton: {
    backgroundColor: COLORS.info,
  },
  overlayButton: {
    backgroundColor: COLORS.primary,
  },
  allButton: {
    backgroundColor: COLORS.success,
  },
  testButton: {
    backgroundColor: COLORS.warning,
  },
  settingsButton: {
    backgroundColor: COLORS.medical.appointment,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusContainer: {
    backgroundColor: COLORS.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noStatusText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
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
});
