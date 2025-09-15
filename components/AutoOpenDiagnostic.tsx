import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export default function AutoOpenDiagnostic() {
  const [diagnosticResults, setDiagnosticResults] = useState<string>('');

  // Función para diagnosticar permisos
  const checkPermissions = async () => {
    try {
      setDiagnosticResults('Verificando permisos...\n');
      
      const permissions = await Notifications.getPermissionsAsync();
      const settings = await Notifications.getNotificationSettingsAsync();
      
      let results = '=== DIAGNÓSTICO DE PERMISOS ===\n\n';
      
      results += `Permisos de notificación: ${permissions.status}\n`;
      results += `Alertas permitidas: ${settings.ios?.allowsAlert ? 'Sí' : 'No'}\n`;
      results += `Sonidos permitidos: ${settings.ios?.allowsSound ? 'Sí' : 'No'}\n`;
      results += `Badges permitidos: ${settings.ios?.allowsBadge ? 'Sí' : 'No'}\n`;
      
      if (Platform.OS === 'android') {
        results += `Importancia Android: ${settings.android?.importance}\n`;
        results += `Bloqueo de pantalla: ${settings.android?.lockscreenVisibility}\n`;
      }
      
      setDiagnosticResults(results);
      
      Alert.alert(
        'Resultados de Permisos',
        `Estado: ${permissions.status}\nAlertas: ${settings.ios?.allowsAlert ? 'Sí' : 'No'}\nSonidos: ${settings.ios?.allowsSound ? 'Sí' : 'No'}`,
        [
          { text: 'OK' },
          {
            text: 'Configurar',
            onPress: () => Linking.openSettings()
          }
        ]
      );
      
    } catch (error: any) {
      setDiagnosticResults(`Error verificando permisos: ${error.message}`);
    }
  };

  // Función para diagnosticar canales de notificación
  const checkNotificationChannels = async () => {
    try {
      setDiagnosticResults('Verificando canales de notificación...\n');
      
      let results = '=== CANALES DE NOTIFICACIÓN ===\n\n';
      
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
          results += `   Bypass DnD: ${channel.bypassDnd ? 'Sí' : 'No'}\n\n`;
        });
      } else {
        results += 'iOS: Los canales no son aplicables\n';
      }
      
      setDiagnosticResults(results);
      
    } catch (error: any) {
      setDiagnosticResults(`Error verificando canales: ${error.message}`);
    }
  };

  // Función para probar notificación con configuración optimizada
  const testOptimizedNotification = async () => {
    try {
      setDiagnosticResults('Programando notificación optimizada...\n');
      
      const triggerTime = new Date(Date.now() + 5000); // 5 segundos
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚀 Test de Apertura Automática Optimizada',
          body: 'Esta notificación debería abrir la app automáticamente',
          data: {
            test: true,
            type: 'MEDICATION',
            kind: 'MED',
            refId: `test_optimized_${Date.now()}`,
            medicationName: 'Test Optimizado',
            dosage: '1 tableta',
            scheduledFor: triggerTime.toISOString()
          },
          categoryIdentifier: 'MEDICATION_ALARM',
          sound: Platform.OS === 'android' ? 'alarm.mp3' : 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          // Configuración optimizada para apertura automática
          ...(Platform.OS === 'android' && {
            fullScreenIntent: true as any,
            channelId: 'medications',
            autoCancel: false,
            ongoing: true,
            showTimestamp: true,
            launchActivityFlags: 0x10000000, // FLAG_ACTIVITY_NEW_TASK
          }),
          ...(Platform.OS === 'ios' && {
            interruptionLevel: 'critical' as any,
            relevanceScore: 1.0,
          }),
        },
        trigger: { date: triggerTime }
      });
      
      setDiagnosticResults(`✅ Notificación optimizada programada\nID: ${notificationId}\nTiempo: ${triggerTime.toLocaleTimeString()}\n\nInstrucciones:\n1. Cierra la app completamente\n2. Espera 5 segundos\n3. La app debería abrirse automáticamente`);
      
      Alert.alert(
        'Test Optimizado Programado',
        'Se programó una notificación optimizada para 5 segundos.\n\nInstrucciones:\n1. Cierra la app completamente\n2. Espera 5 segundos\n3. La app debería abrirse automáticamente',
        [
          { text: 'Entendido' },
          {
            text: 'Configurar App',
            onPress: () => {
              Alert.alert(
                'Configuración de la App',
                'Para que la apertura automática funcione:\n\n• Permisos de notificación habilitados\n• App no optimizada por el sistema\n• Notificaciones críticas habilitadas\n• Modo "No molestar" deshabilitado\n\n¿Quieres abrir la configuración?',
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
      setDiagnosticResults(`❌ Error programando notificación: ${error.message}`);
      Alert.alert('Error', `Error programando notificación: ${error.message}`);
    }
  };

  // Función para verificar configuración del sistema
  const checkSystemConfiguration = async () => {
    try {
      setDiagnosticResults('Verificando configuración del sistema...\n');
      
      let results = '=== CONFIGURACIÓN DEL SISTEMA ===\n\n';
      
      // Verificar configuración de notificaciones
      const settings = await Notifications.getNotificationSettingsAsync();
      
      results += `Sistema: ${Platform.OS}\n`;
      results += `Versión: ${Platform.Version}\n\n`;
      
      if (Platform.OS === 'android') {
        results += 'Configuración Android:\n';
        results += `- Importancia: ${settings.android?.importance}\n`;
        results += `- Visibilidad en bloqueo: ${settings.android?.lockscreenVisibility}\n`;
        results += `- Interrupciones: ${settings.android?.interruptionFilter}\n\n`;
        
        results += 'Recomendaciones para Android:\n';
        results += '• Habilitar "Mostrar en pantalla de bloqueo"\n';
        results += '• Deshabilitar optimización de batería para esta app\n';
        results += '• Permitir notificaciones críticas\n';
        results += '• Deshabilitar "No molestar" durante las alarmas\n';
      } else {
        results += 'Configuración iOS:\n';
        results += `- Alertas: ${settings.ios?.allowsAlert ? 'Habilitadas' : 'Deshabilitadas'}\n`;
        results += `- Sonidos: ${settings.ios?.allowsSound ? 'Habilitados' : 'Deshabilitados'}\n`;
        results += `- Badges: ${settings.ios?.allowsBadge ? 'Habilitados' : 'Deshabilitados'}\n\n`;
        
        results += 'Recomendaciones para iOS:\n';
        results += '• Habilitar notificaciones en Configuración\n';
        results += '• Permitir alertas, sonidos y badges\n';
        results += '• Deshabilitar "No molestar" durante las alarmas\n';
        results += '• Verificar que la app no esté en modo silencioso\n';
      }
      
      setDiagnosticResults(results);
      
    } catch (error: any) {
      setDiagnosticResults(`Error verificando configuración: ${error.message}`);
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
        <Text style={styles.title}>Diagnóstico de Apertura Automática</Text>
        <Text style={styles.subtitle}>
          Herramientas para diagnosticar y corregir problemas de apertura automática
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnósticos</Text>
        
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.diagnosticButton, styles.permissionsButton]} 
            onPress={checkPermissions}
          >
            <Ionicons name="shield-checkmark" size={24} color="white" />
            <Text style={styles.buttonText}>Verificar Permisos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.diagnosticButton, styles.channelsButton]} 
            onPress={checkNotificationChannels}
          >
            <Ionicons name="radio" size={24} color="white" />
            <Text style={styles.buttonText}>Verificar Canales</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.diagnosticButton, styles.systemButton]} 
            onPress={checkSystemConfiguration}
          >
            <Ionicons name="settings" size={24} color="white" />
            <Text style={styles.buttonText}>Configuración Sistema</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tests Optimizados</Text>
        <Text style={styles.sectionDescription}>
          Prueba notificaciones con configuración optimizada para apertura automática
        </Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.testButton]} 
          onPress={testOptimizedNotification}
        >
          <Ionicons name="rocket" size={24} color="white" />
          <Text style={styles.actionButtonText}>Test Optimizado</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resultados del Diagnóstico</Text>
        {diagnosticResults ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>{diagnosticResults}</Text>
          </View>
        ) : (
          <Text style={styles.noResultsText}>Ejecuta un diagnóstico para ver los resultados</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solución de Problemas</Text>
        <View style={styles.troubleshootingContainer}>
          <Text style={styles.troubleshootingTitle}>Si la apertura automática no funciona:</Text>
          <Text style={styles.troubleshootingText}>1. Verifica que los permisos estén habilitados</Text>
          <Text style={styles.troubleshootingText}>2. Desactiva la optimización de batería para esta app</Text>
          <Text style={styles.troubleshootingText}>3. Asegúrate de que las notificaciones estén habilitadas</Text>
          <Text style={styles.troubleshootingText}>4. Desactiva el modo "No molestar"</Text>
          <Text style={styles.troubleshootingText}>5. Algunos dispositivos requieren configuración adicional</Text>
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
  clearButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
