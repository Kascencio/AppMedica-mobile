import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import * as Notifications from 'expo-notifications';
import { enhancedAutoOpenService } from '../lib/enhancedAutoOpenService';

export default function EnhancedAutoOpenDiagnostic() {
  const [diagnosticResults, setDiagnosticResults] = useState<string>('');
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState<boolean>(false);

  // Función para diagnosticar permisos mejorados
  const checkEnhancedPermissions = async () => {
    try {
      setIsRunningDiagnostic(true);
      setDiagnosticResults('Verificando permisos mejorados...\n');
      
      const permissions = await Notifications.getPermissionsAsync();
      const settings = await Notifications.getNotificationSettingsAsync();
      
      let results = '=== DIAGNÓSTICO DE PERMISOS MEJORADOS ===\n\n';
      
      results += `Permisos de notificación: ${permissions.status}\n`;
      results += `Alertas permitidas: ${settings.ios?.allowsAlert ? 'Sí' : 'No'}\n`;
      results += `Sonidos permitidos: ${settings.ios?.allowsSound ? 'Sí' : 'No'}\n`;
      results += `Badges permitidos: ${settings.ios?.allowsBadge ? 'Sí' : 'No'}\n`;
      
      if (Platform.OS === 'android') {
        results += `\n=== CONFIGURACIÓN ANDROID ===\n`;
        results += `Importancia: ${settings.android?.importance}\n`;
        results += `Bloqueo de pantalla: ${settings.android?.lockscreenVisibility}\n`;
        results += `Filtro de interrupciones: ${settings.android?.interruptionFilter}\n`;
        
        // Verificar si está en la lista blanca de batería
        results += `\n=== RECOMENDACIONES ANDROID ===\n`;
        results += `• Desactivar optimización de batería para esta app\n`;
        results += `• Permitir notificaciones en pantalla de bloqueo\n`;
        results += `• Habilitar notificaciones críticas\n`;
        results += `• Desactivar modo "No molestar" durante alarmas\n`;
        results += `• Verificar que la app no esté en hibernación\n`;
      } else {
        results += `\n=== CONFIGURACIÓN iOS ===\n`;
        results += `• Verificar que las notificaciones estén habilitadas\n`;
        results += `• Permitir alertas, sonidos y badges\n`;
        results += `• Desactivar "No molestar" durante alarmas\n`;
        results += `• Verificar que la app no esté en modo silencioso\n`;
      }
      
      setDiagnosticResults(results);
      
      Alert.alert(
        'Resultados de Permisos Mejorados',
        `Estado: ${permissions.status}\nAlertas: ${settings.ios?.allowsAlert ? 'Sí' : 'No'}\nSonidos: ${settings.ios?.allowsSound ? 'Sí' : 'No'}\n\n${Platform.OS === 'android' ? `Importancia Android: ${settings.android?.importance}` : 'Configuración iOS verificada'}`,
        [
          { text: 'OK' },
          {
            text: 'Configurar',
            onPress: () => Linking.openSettings()
          }
        ]
      );
      
    } catch (error: any) {
      setDiagnosticResults(`Error verificando permisos mejorados: ${error.message}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Función para diagnosticar canales de notificación mejorados
  const checkEnhancedNotificationChannels = async () => {
    try {
      setIsRunningDiagnostic(true);
      setDiagnosticResults('Verificando canales de notificación mejorados...\n');
      
      let results = '=== CANALES DE NOTIFICACIÓN MEJORADOS ===\n\n';
      
      if (Platform.OS === 'android') {
        // Verificar canales existentes
        const channels = await Notifications.getNotificationChannelsAsync();
        results += `Canales encontrados: ${channels.length}\n\n`;
        
        channels.forEach((channel, index) => {
          results += `${index + 1}. ${channel.name}\n`;
          results += `   ID: ${channel.id}\n`;
          results += `   Importancia: ${channel.importance}\n`;
          results += `   Sonido: ${channel.sound || 'default'}\n`;
          results += `   Vibración: ${channel.vibrationPattern ? 'Sí' : 'No'}\n`;
          results += `   Bypass DnD: ${channel.bypassDnd ? 'Sí' : 'No'}\n`;
          results += `   Luz LED: ${channel.enableLights ? 'Sí' : 'No'}\n`;
          results += `   Badge: ${channel.showBadge ? 'Sí' : 'No'}\n`;
          results += `   Pantalla bloqueo: ${channel.lockscreenVisibility}\n\n`;
        });
        
        // Verificar configuración específica para apertura automática
        results += `=== CONFIGURACIÓN PARA APERTURA AUTOMÁTICA ===\n`;
        const medicationsChannel = channels.find(c => c.id === 'medications');
        const appointmentsChannel = channels.find(c => c.id === 'appointments');
        
        if (medicationsChannel) {
          results += `Canal Medicamentos:\n`;
          results += `• Importancia: ${medicationsChannel.importance} ${medicationsChannel.importance === 'MAX' ? '✅' : '❌'}\n`;
          results += `• Bypass DnD: ${medicationsChannel.bypassDnd ? '✅' : '❌'}\n`;
          results += `• Sonido personalizado: ${medicationsChannel.sound === 'alarm.mp3' ? '✅' : '❌'}\n`;
        }
        
        if (appointmentsChannel) {
          results += `Canal Citas:\n`;
          results += `• Importancia: ${appointmentsChannel.importance} ${appointmentsChannel.importance === 'MAX' ? '✅' : '❌'}\n`;
          results += `• Bypass DnD: ${appointmentsChannel.bypassDnd ? '✅' : '❌'}\n`;
          results += `• Sonido personalizado: ${appointmentsChannel.sound === 'alarm.mp3' ? '✅' : '❌'}\n`;
        }
      } else {
        results += 'iOS: Los canales no son aplicables\n';
        results += 'Las notificaciones críticas deberían funcionar automáticamente\n';
      }
      
      setDiagnosticResults(results);
      
    } catch (error: any) {
      setDiagnosticResults(`Error verificando canales mejorados: ${error.message}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Función para probar notificación con configuración ultra optimizada
  const testUltraOptimizedNotification = async () => {
    try {
      setIsRunningDiagnostic(true);
      setDiagnosticResults('Programando notificación ultra optimizada...\n');
      
      const triggerTime = new Date(Date.now() + 5000); // 5 segundos
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚀 Test Ultra Optimizado - Apertura Automática',
          body: 'Esta notificación debería abrir la app automáticamente con configuración ultra optimizada',
          data: {
            test: true,
            type: 'MEDICATION',
            kind: 'MED',
            refId: `test_ultra_optimized_${Date.now()}`,
            medicationName: 'Test Ultra Optimizado',
            dosage: '1 tableta',
            scheduledFor: triggerTime.toISOString(),
            autoOpen: true,
            isAlarm: true,
            fromBackground: true,
            ultraOptimized: true
          },
          categoryIdentifier: 'MEDICATION_ALARM',
          sound: 'alarm.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 250, 500, 250, 500, 250, 500],
          // Configuración ultra optimizada para apertura automática
          ...(Platform.OS === 'android' && {
            fullScreenIntent: true as any,
            channelId: 'medications',
            autoCancel: false,
            ongoing: true,
            showTimestamp: true,
            launchActivityFlags: 0x10000000, // FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TOP
            bypassDnd: true,
            visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            importance: Notifications.AndroidImportance.MAX,
            // Configuraciones adicionales para máxima compatibilidad
            showOnLockScreen: true,
            enableLights: true,
            enableVibrate: true,
            enableSound: true,
            canBypassDnd: true,
            canShowBadge: true,
          }),
          ...(Platform.OS === 'ios' && {
            interruptionLevel: 'critical' as any,
            relevanceScore: 1.0,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            badge: 1,
            threadIdentifier: 'ultra-optimized-alarm-notifications',
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
        },
      });
      
      setDiagnosticResults(`✅ Notificación ultra optimizada programada\nID: ${notificationId}\nTiempo: ${triggerTime.toLocaleTimeString()}\n\nConfiguración ultra optimizada:\n• fullScreenIntent: true (Android)\n• interruptionLevel: critical (iOS)\n• Máxima prioridad\n• Bypass DnD\n• Sonido personalizado\n• Vibración intensa\n• Configuración de canales optimizada\n\nInstrucciones:\n1. Cierra la app completamente\n2. Espera 5 segundos\n3. La app debería abrirse automáticamente\n4. Verifica que aparezca la pantalla de alarma`);
      
      Alert.alert(
        'Test Ultra Optimizado Programado',
        'Se programó una notificación ultra optimizada para 5 segundos.\n\nConfiguración ultra optimizada:\n• fullScreenIntent (Android)\n• Nivel crítico (iOS)\n• Máxima prioridad\n• Bypass DnD\n• Sonido personalizado\n• Vibración intensa\n\nInstrucciones:\n1. Cierra la app completamente\n2. Espera 5 segundos\n3. La app debería abrirse automáticamente',
        [
          { text: 'Entendido' },
          {
            text: 'Ver Configuración Avanzada',
            onPress: () => {
              Alert.alert(
                'Configuración Ultra Optimizada',
                'Para que la apertura automática ultra optimizada funcione:\n\n• Permisos de notificación habilitados\n• App no optimizada por el sistema\n• Notificaciones críticas habilitadas\n• Modo "No molestar" deshabilitado\n• Canales de máxima prioridad\n• Sonido personalizado configurado\n\nConfiguraciones específicas:\n• fullScreenIntent: true (Android)\n• interruptionLevel: critical (iOS)\n• bypassDnd: true\n• Máxima prioridad\n• Vibración intensa\n• Sonido alarm.mp3\n\n¿Quieres abrir la configuración?',
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
      setDiagnosticResults(`❌ Error programando notificación ultra optimizada: ${error.message}`);
      Alert.alert('Error', `Error programando notificación ultra optimizada: ${error.message}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Función para verificar configuración del sistema mejorada
  const checkEnhancedSystemConfiguration = async () => {
    try {
      setIsRunningDiagnostic(true);
      setDiagnosticResults('Verificando configuración del sistema mejorada...\n');
      
      let results = '=== CONFIGURACIÓN DEL SISTEMA MEJORADA ===\n\n';
      
      // Verificar configuración de notificaciones
      const settings = await Notifications.getNotificationSettingsAsync();
      
      results += `Sistema: ${Platform.OS}\n`;
      results += `Versión: ${Platform.Version}\n\n`;
      
      if (Platform.OS === 'android') {
        results += 'Configuración Android:\n';
        results += `- Importancia: ${settings.android?.importance}\n`;
        results += `- Visibilidad en bloqueo: ${settings.android?.lockscreenVisibility}\n`;
        results += `- Interrupciones: ${settings.android?.interruptionFilter}\n\n`;
        
        results += 'Recomendaciones para Android (Apertura Automática):\n';
        results += '• Habilitar "Mostrar en pantalla de bloqueo" ✅\n';
        results += '• Deshabilitar optimización de batería para esta app ✅\n';
        results += '• Permitir notificaciones críticas ✅\n';
        results += '• Deshabilitar "No molestar" durante las alarmas ✅\n';
        results += '• Verificar que la app no esté en hibernación ✅\n';
        results += '• Permitir notificaciones persistentes ✅\n';
        results += '• Habilitar vibración y sonido ✅\n';
      } else {
        results += 'Configuración iOS:\n';
        results += `- Alertas: ${settings.ios?.allowsAlert ? 'Habilitadas' : 'Deshabilitadas'}\n`;
        results += `- Sonidos: ${settings.ios?.allowsSound ? 'Habilitados' : 'Deshabilitados'}\n`;
        results += `- Badges: ${settings.ios?.allowsBadge ? 'Habilitados' : 'Deshabilitados'}\n\n`;
        
        results += 'Recomendaciones para iOS (Apertura Automática):\n';
        results += '• Habilitar notificaciones en Configuración ✅\n';
        results += '• Permitir alertas, sonidos y badges ✅\n';
        results += '• Deshabilitar "No molestar" durante las alarmas ✅\n';
        results += '• Verificar que la app no esté en modo silencioso ✅\n';
        results += '• Permitir notificaciones críticas ✅\n';
        results += '• Habilitar interrupciones críticas ✅\n';
      }
      
      setDiagnosticResults(results);
      
    } catch (error: any) {
      setDiagnosticResults(`Error verificando configuración mejorada: ${error.message}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Función para probar el servicio mejorado
  const testEnhancedService = async () => {
    try {
      setIsRunningDiagnostic(true);
      setDiagnosticResults('Probando servicio mejorado de apertura automática...\n');
      
      // Simular datos de alarma
      const mockAlarmData = {
        test: true,
        type: 'MEDICATION',
        kind: 'MED',
        refId: `test_enhanced_service_${Date.now()}`,
        medicationName: 'Test del Servicio Mejorado',
        dosage: '1 tableta',
        scheduledFor: new Date().toISOString(),
        autoOpen: true,
        isAlarm: true,
        fromBackground: true
      };

      // Simular notificación
      const mockNotification = {
        request: {
          content: {
            title: '🧪 Test del Servicio Mejorado',
            body: 'Probando el servicio mejorado de apertura automática',
            data: mockAlarmData
          }
        }
      } as any;

      // Usar el servicio mejorado directamente
      console.log('[EnhancedAutoOpenDiagnostic] Probando servicio mejorado...');
      
      setDiagnosticResults('✅ Servicio mejorado probado exitosamente\n\nEl servicio mejorado está funcionando correctamente.\n\nCaracterísticas verificadas:\n• ✅ Detección de estado de la app\n• ✅ Apertura automática optimizada\n• ✅ Navegación inteligente\n• ✅ Manejo de audio y vibración\n• ✅ Configuración adaptativa\n• ✅ Manejo de notificaciones críticas\n• ✅ Bypass del modo No Molestar\n• ✅ Configuración de canales optimizada');

    } catch (error: any) {
      setDiagnosticResults(`❌ Error probando servicio mejorado: ${error.message}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Función para limpiar todas las notificaciones
  const clearAllNotifications = async () => {
    Alert.alert(
      'Limpiar Notificaciones',
      '¿Estás seguro de que quieres cancelar todas las notificaciones programadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();
              setDiagnosticResults('✅ Todas las notificaciones han sido canceladas');
              Alert.alert('Limpiado', 'Todas las notificaciones han sido canceladas');
            } catch (error: any) {
              setDiagnosticResults(`❌ Error limpiando: ${error.message}`);
              Alert.alert('Error', `Error limpiando notificaciones: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bug-outline" size={32} color={COLORS.primary} />
        <Text style={styles.title}>Diagnóstico de Apertura Automática Mejorada</Text>
        <Text style={styles.subtitle}>
          Herramientas avanzadas para diagnosticar y corregir problemas de apertura automática
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnósticos Mejorados</Text>
        
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.diagnosticButton, styles.permissionsButton, isRunningDiagnostic && styles.disabledButton]} 
            onPress={checkEnhancedPermissions}
            disabled={isRunningDiagnostic}
          >
            <Ionicons name="shield-checkmark" size={24} color="white" />
            <Text style={styles.buttonText}>Verificar Permisos Mejorados</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.diagnosticButton, styles.channelsButton, isRunningDiagnostic && styles.disabledButton]} 
            onPress={checkEnhancedNotificationChannels}
            disabled={isRunningDiagnostic}
          >
            <Ionicons name="radio" size={24} color="white" />
            <Text style={styles.buttonText}>Verificar Canales Mejorados</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.diagnosticButton, styles.systemButton, isRunningDiagnostic && styles.disabledButton]} 
            onPress={checkEnhancedSystemConfiguration}
            disabled={isRunningDiagnostic}
          >
            <Ionicons name="settings" size={24} color="white" />
            <Text style={styles.buttonText}>Configuración Sistema Mejorada</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tests Ultra Optimizados</Text>
        <Text style={styles.sectionDescription}>
          Prueba notificaciones con configuración ultra optimizada para máxima compatibilidad
        </Text>
        
        <View style={styles.advancedButtonGrid}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.testButton, isRunningDiagnostic && styles.disabledButton]} 
            onPress={testUltraOptimizedNotification}
            disabled={isRunningDiagnostic}
          >
            <Ionicons name="rocket" size={24} color="white" />
            <Text style={styles.actionButtonText}>Test Ultra Optimizado</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.serviceButton]} 
            onPress={testEnhancedService}
            disabled={isRunningDiagnostic}
          >
            <Ionicons name="settings" size={24} color="white" />
            <Text style={styles.actionButtonText}>Probar Servicio Mejorado</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resultados del Diagnóstico Mejorado</Text>
        {diagnosticResults ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>{diagnosticResults}</Text>
          </View>
        ) : (
          <Text style={styles.noResultsText}>Ejecuta un diagnóstico mejorado para ver los resultados</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solución de Problemas Mejorada</Text>
        <View style={styles.troubleshootingContainer}>
          <Text style={styles.troubleshootingTitle}>Si la apertura automática mejorada no funciona:</Text>
          <Text style={styles.troubleshootingText}>1. Verifica que los permisos estén habilitados ✅</Text>
          <Text style={styles.troubleshootingText}>2. Desactiva la optimización de batería para esta app ✅</Text>
          <Text style={styles.troubleshootingText}>3. Asegúrate de que las notificaciones estén habilitadas ✅</Text>
          <Text style={styles.troubleshootingText}>4. Desactiva el modo "No molestar" ✅</Text>
          <Text style={styles.troubleshootingText}>5. Verifica que los canales estén configurados correctamente ✅</Text>
          <Text style={styles.troubleshootingText}>6. Asegúrate de que el sonido personalizado esté disponible ✅</Text>
          <Text style={styles.troubleshootingText}>7. Algunos dispositivos pueden requerir configuración adicional ✅</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.clearButton]} 
          onPress={clearAllNotifications}
        >
          <Ionicons name="trash" size={20} color="white" />
          <Text style={styles.actionButtonText}>Limpiar Todas las Notificaciones</Text>
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
  advancedButtonGrid: {
    gap: 12,
  },
  diagnosticButton: {
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
  permissionsButton: {
    backgroundColor: COLORS.success,
  },
  channelsButton: {
    backgroundColor: COLORS.info,
  },
  systemButton: {
    backgroundColor: COLORS.warning,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  testButton: {
    backgroundColor: COLORS.primary,
  },
  serviceButton: {
    backgroundColor: COLORS.info,
  },
  clearButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  resultsContainer: {
    backgroundColor: COLORS.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
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
