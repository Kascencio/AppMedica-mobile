import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { runAlarmSystemDiagnostic, testAlarmScheduling, cancelTestAlarm } from '../lib/alarmSystemDiagnostic';
import { unifiedAlarmService } from '../lib/unifiedAlarmService';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function AlarmTestSuite() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [testAlarmId, setTestAlarmId] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  const addResult = (result: TestResult) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === result.name);
      if (existing) {
        return prev.map(r => r.name === result.name ? result : r);
      }
      return [...prev, result];
    });
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test básico de permisos
  const testPermissions = async () => {
    addResult({ name: 'Permisos', status: 'running', message: 'Verificando permisos...' });
    
    try {
      const { requestPermissions } = await import('../lib/notifications');
      const granted = await requestPermissions();
      
      addResult({
        name: 'Permisos',
        status: granted ? 'success' : 'error',
        message: granted ? 'Permisos concedidos' : 'Permisos denegados',
        details: { granted }
      });
    } catch (error: any) {
      addResult({
        name: 'Permisos',
        status: 'error',
        message: `Error: ${error.message}`,
        details: error
      });
    }
  };

  // Test de inicialización del sistema
  const testSystemInit = async () => {
    addResult({ name: 'Inicialización', status: 'running', message: 'Inicializando sistema...' });
    
    try {
      const { initNotificationSystem } = await import('../lib/notifications');
      const success = await initNotificationSystem();
      
      addResult({
        name: 'Inicialización',
        status: success ? 'success' : 'error',
        message: success ? 'Sistema inicializado correctamente' : 'Error en inicialización',
        details: { success }
      });
    } catch (error: any) {
      addResult({
        name: 'Inicialización',
        status: 'error',
        message: `Error: ${error.message}`,
        details: error
      });
    }
  };

  // Test de canales de notificación (Android)
  const testNotificationChannels = async () => {
    addResult({ name: 'Canales', status: 'running', message: 'Verificando canales de notificación...' });
    
    try {
      const { getNotificationChannels } = await import('../lib/notifications');
      const channels = await getNotificationChannels();
      
      addResult({
        name: 'Canales',
        status: 'success',
        message: `Canales encontrados: ${channels.length}`,
        details: { channels }
      });
    } catch (error: any) {
      addResult({
        name: 'Canales',
        status: 'error',
        message: `Error: ${error.message}`,
        details: error
      });
    }
  };

  // Test de notificación inmediata
  const testImmediateNotification = async () => {
    addResult({ name: 'Notificación Inmediata', status: 'running', message: 'Enviando notificación inmediata...' });
    
    try {
      const { scheduleNotification } = await import('../lib/notifications');
      const id = await scheduleNotification({
        title: '🧪 Test de Alarma',
        body: 'Esta es una notificación de prueba inmediata',
        data: { 
          test: true, 
          type: 'MEDICATION',
          kind: 'MED',
          refId: 'test_immediate_001',
          medicationName: 'Test Inmediato',
          dosage: '1 dosis',
          scheduledFor: new Date().toISOString()
        },
        trigger: { seconds: 1 } // 1 segundo
      });
      
      addResult({
        name: 'Notificación Inmediata',
        status: 'success',
        message: `Notificación enviada (ID: ${id})`,
        details: { notificationId: id }
      });
    } catch (error: any) {
      addResult({
        name: 'Notificación Inmediata',
        status: 'error',
        message: `Error: ${error.message}`,
        details: error
      });
    }
  };

  // Test de notificación programada
  const testScheduledNotification = async () => {
    addResult({ name: 'Notificación Programada', status: 'running', message: 'Programando notificación para 10 segundos...' });
    
    try {
      const { scheduleNotification } = await import('../lib/notifications');
      const triggerTime = new Date(Date.now() + 10000); // 10 segundos
      
      const id = await scheduleNotification({
        title: '⏰ Alarma Programada',
        body: 'Esta alarma fue programada hace 10 segundos',
        data: { 
          test: true, 
          type: 'MEDICATION',
          kind: 'MED',
          refId: 'test_scheduled_001',
          medicationName: 'Test Programado',
          dosage: '1 cápsula',
          scheduledFor: triggerTime.toISOString()
        },
        trigger: { date: triggerTime }
      });
      
      setTestAlarmId(id);
      
      addResult({
        name: 'Notificación Programada',
        status: 'success',
        message: `Alarma programada para ${triggerTime.toLocaleTimeString()} (ID: ${id})`,
        details: { notificationId: id, triggerTime: triggerTime.toISOString() }
      });
      
      Alert.alert(
        'Alarma Programada',
        `Alarma programada para ${triggerTime.toLocaleTimeString()}. ¿Quieres cancelarla?`,
        [
          { text: 'Dejar que suene', style: 'default' },
          { text: 'Cancelar', onPress: () => cancelTestAlarm(id) }
        ]
      );
    } catch (error: any) {
      addResult({
        name: 'Notificación Programada',
        status: 'error',
        message: `Error: ${error.message}`,
        details: error
      });
    }
  };

  // Test de alarma nativa
  const testNativeAlarm = async () => {
    addResult({ name: 'Alarma Nativa', status: 'running', message: 'Probando alarma nativa...' });
    
    try {
      const testId = 'test_alarm_' + Date.now();
      const success = await unifiedAlarmService.scheduleAlarm({
        id: testId,
        title: '🧪 Test Nativo',
        body: 'Esta es una prueba del sistema nativo',
        data: { test: true, type: 'MEDICATION', kind: 'MED' },
        triggerDate: new Date(Date.now() + 5000)
      });
      
      addResult({
        name: 'Alarma Nativa',
        status: success ? 'success' : 'error',
        message: success ? 'Alarma nativa funcionando' : 'Error en alarma nativa',
        details: { success }
      });
    } catch (error: any) {
      addResult({
        name: 'Alarma Nativa',
        status: 'error',
        message: `Error: ${error.message}`,
        details: error
      });
    }
  };

  // Test de display service eliminado (obsoleto)

  // Test completo del sistema
  const runCompleteTest = async () => {
    setRunning(true);
    clearResults();
    
    try {
      addResult({ name: 'Test Completo', status: 'running', message: 'Iniciando test completo del sistema de alarmas...' });
      
      // Ejecutar todos los tests
      await testPermissions();
      await testSystemInit();
      await testNotificationChannels();
      await testImmediateNotification();
      await testScheduledNotification();
      await testNativeAlarm();
      await testDisplayService();
      
      // Usar el tester existente
      const tester = AlarmSystemTester.getInstance();
      const fullTestResult = await tester.runFullTest();
      
      addResult({
        name: 'Test Completo',
        status: fullTestResult.success ? 'success' : 'error',
        message: fullTestResult.success ? 'Test completo exitoso' : 'Test completo falló',
        details: fullTestResult.results
      });
      
      setSystemStatus(fullTestResult.results);
      
    } catch (error: any) {
      addResult({
        name: 'Test Completo',
        status: 'error',
        message: `Error en test completo: ${error.message}`,
        details: error
      });
    } finally {
      setRunning(false);
    }
  };

  // Test de diagnóstico del sistema
  const runSystemDiagnostic = async () => {
    addResult({ name: 'Diagnóstico', status: 'running', message: 'Ejecutando diagnóstico del sistema...' });
    
    try {
      const diagnostic = await runAlarmSystemDiagnostic();
      
      addResult({
        name: 'Diagnóstico',
        status: diagnostic.isHealthy ? 'success' : 'error',
        message: diagnostic.isHealthy ? 'Sistema saludable' : 'Problemas detectados',
        details: diagnostic
      });
      
      setSystemStatus(diagnostic);
    } catch (error: any) {
      addResult({
        name: 'Diagnóstico',
        status: 'error',
        message: `Error: ${error.message}`,
        details: error
      });
    }
  };

  // Cancelar alarma de prueba
  const cancelTestAlarm = async (alarmId?: string) => {
    const idToCancel = alarmId || testAlarmId;
    if (!idToCancel) return;
    
    try {
      const { cancelNotification } = await import('../lib/notifications');
      await cancelNotification(idToCancel);
      setTestAlarmId(null);
      Alert.alert('Alarma Cancelada', 'La alarma de prueba ha sido cancelada');
    } catch (error: any) {
      Alert.alert('Error', `No se pudo cancelar la alarma: ${error.message}`);
    }
  };

  // Limpiar todas las notificaciones
  const clearAllNotifications = async () => {
    try {
      const { cancelAllNotifications } = await import('../lib/notifications');
      await cancelAllNotifications();
      Alert.alert('Notificaciones Limpiadas', 'Todas las notificaciones han sido canceladas');
    } catch (error: any) {
      Alert.alert('Error', `Error limpiando notificaciones: ${error.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '⏳';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'running': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Suite de Tests de Alarmas</Text>
      
      {/* Botones de control */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runCompleteTest}
          disabled={running}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.buttonText}>Test Completo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={runSystemDiagnostic}
          disabled={running}
        >
          <Ionicons name="search" size={20} color="#2563eb" />
          <Text style={[styles.buttonText, { color: '#2563eb' }]}>Diagnóstico</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.tertiaryButton]} 
          onPress={testImmediateNotification}
          disabled={running}
        >
          <Ionicons name="notifications" size={20} color="#22c55e" />
          <Text style={[styles.buttonText, { color: '#22c55e' }]}>Test Inmediato</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.warningButton]} 
          onPress={testScheduledNotification}
          disabled={running}
        >
          <Ionicons name="alarm" size={20} color="#f59e0b" />
          <Text style={[styles.buttonText, { color: '#f59e0b' }]}>Test Programado</Text>
        </TouchableOpacity>
        
        {testAlarmId && (
          <TouchableOpacity 
            style={[styles.button, styles.dangerButton]} 
            onPress={cancelTestAlarm}
            disabled={running}
          >
            <Ionicons name="stop" size={20} color="#ef4444" />
            <Text style={[styles.buttonText, { color: '#ef4444' }]}>Cancelar Alarma</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.button, styles.infoButton]} 
          onPress={clearAllNotifications}
          disabled={running}
        >
          <Ionicons name="trash" size={20} color="#0ea5e9" />
          <Text style={[styles.buttonText, { color: '#0ea5e9' }]}>Limpiar Todo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={clearResults}
          disabled={running}
        >
          <Ionicons name="close" size={20} color="#ef4444" />
          <Text style={[styles.buttonText, { color: '#ef4444' }]}>Limpiar Logs</Text>
        </TouchableOpacity>
      </View>

      {/* Indicador de progreso */}
      {running && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Ejecutando tests...</Text>
        </View>
      )}

      {/* Resultados de tests */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>📋 Resultados de Tests:</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No hay resultados aún. Ejecuta algún test.</Text>
        ) : (
          testResults.map((result, index) => (
            <View key={index} style={[styles.resultItem, { borderLeftColor: getStatusColor(result.status) }]}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultIcon}>{getStatusIcon(result.status)}</Text>
                <Text style={styles.resultName}>{result.name}</Text>
                <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
                  {result.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {result.details && (
                <Text style={styles.resultDetails}>
                  {JSON.stringify(result.details, null, 2)}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Estado del sistema */}
      {systemStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>📊 Estado del Sistema:</Text>
          <ScrollView style={styles.statusScroll} showsVerticalScrollIndicator={true}>
            <Text style={styles.statusText}>
              {JSON.stringify(systemStatus, null, 2)}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* Tests individuales */}
      <View style={styles.individualTestsContainer}>
        <Text style={styles.individualTestsTitle}>🔧 Tests Individuales:</Text>
        
        <View style={styles.testGrid}>
          <TouchableOpacity style={styles.testButton} onPress={testPermissions}>
            <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
            <Text style={styles.testButtonText}>Permisos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testSystemInit}>
            <Ionicons name="settings" size={24} color="#2563eb" />
            <Text style={styles.testButtonText}>Inicialización</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testNotificationChannels}>
            <Ionicons name="layers" size={24} color="#2563eb" />
            <Text style={styles.testButtonText}>Canales</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testNativeAlarm}>
            <Ionicons name="phone-portrait" size={24} color="#2563eb" />
            <Text style={styles.testButtonText}>Nativa</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testDisplayService}>
            <Ionicons name="tv" size={24} color="#2563eb" />
            <Text style={styles.testButtonText}>Display</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={clearResults}>
            <Ionicons name="refresh" size={24} color="#ef4444" />
            <Text style={styles.testButtonText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  warningButton: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  infoButton: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#2563eb',
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resultsTitle: {
    color: '#f1f5f9',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
  },
  noResults: {
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  resultItem: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resultName: {
    color: '#f1f5f9',
    fontWeight: '600',
    flex: 1,
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultMessage: {
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 4,
  },
  resultDetails: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  statusContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  statusTitle: {
    color: '#0c4a6e',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
  },
  statusScroll: {
    maxHeight: 200,
  },
  statusText: {
    color: '#075985',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  individualTestsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  individualTestsTitle: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
  },
  testGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  testButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 80,
  },
  testButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
