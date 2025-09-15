/**
 * Componente de diagnóstico del sistema de alarmas
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { unifiedAlarmService } from '../lib/unifiedAlarmService';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}
import { alarmErrorHandler } from '../lib/alarmErrorHandler';
import { getScheduledNotifications } from '../lib/notifications';
import COLORS from '../constants/colors';

interface AlarmDiagnosticProps {
  onClose?: () => void;
}

export default function AlarmDiagnostic({ onClose }: AlarmDiagnosticProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [errorStats, setErrorStats] = useState<any>(null);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
      
      const stats = alarmErrorHandler.getErrorStats();
      setErrorStats(stats);
    } catch (error) {
      console.error('[AlarmDiagnostic] Error cargando información del sistema:', error);
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    try {
      // Ejecutar diagnóstico usando el servicio unificado
      const status = unifiedAlarmService.getStatus();
      const scheduledAlarms = await unifiedAlarmService.getScheduledAlarms();
      const errorStats = alarmErrorHandler.getErrorStats();
      
      const results: TestResult[] = [
        {
          name: 'Servicio Unificado',
          status: status.isInitialized ? 'success' : 'error',
          message: status.isInitialized ? 'Servicio inicializado correctamente' : 'Servicio no inicializado',
          details: status
        },
        {
          name: 'Alarmas Programadas',
          status: scheduledAlarms.length > 0 ? 'success' : 'warning',
          message: `${scheduledAlarms.length} alarmas programadas`,
          details: { count: scheduledAlarms.length }
        },
        {
          name: 'Errores del Sistema',
          status: errorStats.total === 0 ? 'success' : 'warning',
          message: `${errorStats.total} errores registrados`,
          details: errorStats
        }
      ];
      setTestResults(results);
    } catch (error) {
      console.error('[AlarmDiagnostic] Error ejecutando pruebas:', error);
      Alert.alert('Error', 'No se pudieron ejecutar las pruebas');
    } finally {
      setIsRunning(false);
    }
  };

  const clearErrors = () => {
    alarmErrorHandler.clearErrorHistory();
    setErrorStats({ total: 0, byCode: {}, recent: 0, critical: 0 });
    Alert.alert('Éxito', 'Historial de errores limpiado');
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? COLORS.success : COLORS.error;
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? 'checkmark-circle' : 'close-circle';
  };

  // Generar resumen basado en los resultados actuales
  const summary = {
    total: testResults.length,
    passed: testResults.filter(r => r.status === 'success').length,
    failed: testResults.filter(r => r.status === 'error').length,
    warnings: testResults.filter(r => r.status === 'warning').length
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Diagnóstico del Sistema de Alarmas</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Información del Sistema */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Estado del Sistema</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Notificaciones Programadas:</Text>
          <Text style={styles.infoValue}>{scheduledCount}</Text>
        </View>
        {errorStats && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Errores Totales:</Text>
              <Text style={[styles.infoValue, { color: errorStats.total > 0 ? COLORS.error : COLORS.success }]}>
                {errorStats.total}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Errores Recientes:</Text>
              <Text style={[styles.infoValue, { color: errorStats.recent > 0 ? COLORS.warning : COLORS.success }]}>
                {errorStats.recent}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Botones de Acción */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠️ Acciones</Text>
        <TouchableOpacity
          style={[styles.actionButton, isRunning && styles.actionButtonDisabled]}
          onPress={runTests}
          disabled={isRunning}
        >
          <Ionicons name="play" size={20} color={COLORS.text.inverse} />
          <Text style={styles.actionButtonText}>
            {isRunning ? 'Ejecutando Pruebas...' : 'Ejecutar Pruebas'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={clearErrors}
        >
          <Ionicons name="trash" size={20} color={COLORS.text.primary} />
          <Text style={[styles.actionButtonText, { color: COLORS.text.primary }]}>
            Limpiar Errores
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resumen de Pruebas */}
      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Resultados de Pruebas</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={styles.summaryValue}>{summary.total}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Exitosas:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>{summary.passed}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fallidas:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>{summary.failed}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tasa de Éxito:</Text>
              <Text style={[styles.summaryValue, { color: summary.successRate >= 80 ? COLORS.success : COLORS.warning }]}>
                {summary.successRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Detalles de Pruebas */}
      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Detalles de Pruebas</Text>
          {testResults.map((result, index) => (
            <View key={index} style={styles.testResultCard}>
              <View style={styles.testResultHeader}>
                <Ionicons
                  name={getStatusIcon(result.passed)}
                  size={20}
                  color={getStatusColor(result.passed)}
                />
                <Text style={styles.testResultName}>{result.testName}</Text>
                <Text style={styles.testResultDuration}>{result.duration}ms</Text>
              </View>
              <Text style={styles.testResultMessage}>{result.message}</Text>
              {result.details && (
                <Text style={styles.testResultDetails}>
                  {JSON.stringify(result.details, null, 2)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Errores Recientes */}
      {errorStats && errorStats.total > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Errores Recientes</Text>
          {Object.entries(errorStats.byCode).map(([code, count]) => (
            <View key={code} style={styles.errorRow}>
              <Text style={styles.errorCode}>{code}</Text>
              <Text style={styles.errorCount}>{count as number}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  section: {
    margin: 16,
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonDisabled: {
    backgroundColor: COLORS.text.tertiary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  actionButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  testResultCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginLeft: 8,
  },
  testResultDuration: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  testResultMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  testResultDetails: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontFamily: 'monospace',
  },
  errorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  errorCode: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
  },
  errorCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});
