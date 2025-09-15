// components/AlarmSystemDiagnostic.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { runAlarmSystemDiagnostic, testAlarmScheduling, cancelTestAlarm, AlarmSystemDiagnostic } from '../lib/alarmSystemDiagnostic';

interface Props {
  onClose?: () => void;
}

export default function AlarmSystemDiagnosticComponent({ onClose }: Props) {
  const [diagnostic, setDiagnostic] = useState<AlarmSystemDiagnostic | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingAlarm, setTestingAlarm] = useState(false);
  const [testAlarmId, setTestAlarmId] = useState<string | null>(null);

  useEffect(() => {
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const result = await runAlarmSystemDiagnostic();
      setDiagnostic(result);
    } catch (error) {
      console.error('[AlarmSystemDiagnostic] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlarm = async () => {
    setTestingAlarm(true);
    try {
      const result = await testAlarmScheduling();
      
      if (result.success && result.scheduledId) {
        setTestAlarmId(result.scheduledId);
        Alert.alert(
          '🧪 Prueba de Alarma',
          result.details.join('\n') + '\n\n¿Quieres cancelar la alarma de prueba?',
          [
            { text: 'Dejar que suene', style: 'default' },
            { 
              text: 'Cancelar alarma', 
              style: 'destructive',
              onPress: () => handleCancelTestAlarm(result.scheduledId!)
            }
          ]
        );
      } else {
        Alert.alert('❌ Error', result.details.join('\n'));
      }
    } catch (error) {
      Alert.alert('❌ Error', `Error ejecutando prueba: ${error}`);
    } finally {
      setTestingAlarm(false);
    }
  };

  const handleCancelTestAlarm = async (alarmId: string) => {
    try {
      const cancelled = await cancelTestAlarm(alarmId);
      if (cancelled) {
        setTestAlarmId(null);
        Alert.alert('✅ Cancelado', 'La alarma de prueba ha sido cancelada');
      }
    } catch (error) {
      Alert.alert('❌ Error', `Error cancelando alarma: ${error}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <Ionicons name="checkmark-circle" size={24} color="#22c55e" />;
      case 'warning': return <Ionicons name="warning" size={24} color="#f59e0b" />;
      case 'error': return <Ionicons name="close-circle" size={24} color="#ef4444" />;
      default: return <Ionicons name="help-circle" size={24} color="#6b7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔍 Diagnóstico del Sistema</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analizando sistema...</Text>
        </View>
      </View>
    );
  }

  if (!diagnostic) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error cargando diagnóstico</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Diagnóstico del Sistema</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Estado General */}
      <View style={[styles.statusCard, { borderColor: getStatusColor(diagnostic.status) }]}>
        <View style={styles.statusHeader}>
          {getStatusIcon(diagnostic.status)}
          <Text style={[styles.statusText, { color: getStatusColor(diagnostic.status) }]}>
            {diagnostic.status === 'healthy' ? 'Sistema Saludable' :
             diagnostic.status === 'warning' ? 'Advertencias' : 'Errores Críticos'}
          </Text>
        </View>
      </View>

      {/* Permisos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Permisos</Text>
        <View style={styles.item}>
          <Ionicons 
            name={diagnostic.permissions.granted ? "checkmark-circle" : "close-circle"} 
            size={20} 
            color={diagnostic.permissions.granted ? "#22c55e" : "#ef4444"} 
          />
          <Text style={styles.itemText}>{diagnostic.permissions.details}</Text>
        </View>
      </View>

      {/* Canales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📢 Canales de Notificación</Text>
        <View style={styles.item}>
          <Ionicons 
            name={diagnostic.channels.configured ? "checkmark-circle" : "close-circle"} 
            size={20} 
            color={diagnostic.channels.configured ? "#22c55e" : "#ef4444"} 
          />
          <Text style={styles.itemText}>
            {diagnostic.channels.count} canales configurados
          </Text>
        </View>
        {diagnostic.channels.details.map((detail, index) => (
          <Text key={index} style={styles.detailText}>• {detail}</Text>
        ))}
      </View>

      {/* Alarmas Programadas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Alarmas Programadas</Text>
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{diagnostic.scheduledAlarms.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{diagnostic.scheduledAlarms.medications}</Text>
            <Text style={styles.statLabel}>Medicamentos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{diagnostic.scheduledAlarms.appointments}</Text>
            <Text style={styles.statLabel}>Citas</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#22c55e' }]}>{diagnostic.scheduledAlarms.upcoming}</Text>
            <Text style={styles.statLabel}>Próximas</Text>
          </View>
        </View>
      </View>

      {/* Validación de Tiempo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🕐 Validación de Tiempo</Text>
        <View style={styles.item}>
          <Ionicons 
            name={diagnostic.timeValidation.valid ? "checkmark-circle" : "close-circle"} 
            size={20} 
            color={diagnostic.timeValidation.valid ? "#22c55e" : "#ef4444"} 
          />
          <Text style={styles.itemText}>
            {diagnostic.timeValidation.valid ? 'Validación correcta' : 'Problemas de validación'}
          </Text>
        </View>
        {diagnostic.timeValidation.issues.map((issue, index) => (
          <Text key={index} style={styles.errorText}>• {issue}</Text>
        ))}
      </View>

      {/* Recomendaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Recomendaciones</Text>
        {diagnostic.recommendations.map((recommendation, index) => (
          <Text key={index} style={styles.recommendationText}>• {recommendation}</Text>
        ))}
      </View>

      {/* Botones de Acción */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={runDiagnostic}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.buttonText}>Actualizar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={handleTestAlarm}
          disabled={testingAlarm}
        >
          <Ionicons name="flask" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            {testingAlarm ? 'Probando...' : 'Probar Alarma'}
          </Text>
        </TouchableOpacity>
      </View>

      {testAlarmId && (
        <View style={styles.testAlarmInfo}>
          <Text style={styles.testAlarmText}>
            🧪 Alarma de prueba activa: {testAlarmId}
          </Text>
          <TouchableOpacity 
            onPress={() => handleCancelTestAlarm(testAlarmId)}
            style={styles.cancelTestButton}
          >
            <Text style={styles.cancelTestText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 24,
    marginTop: 4,
  },
  statusCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 28,
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
    marginTop: 0,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    elevation: 2,
  },
  testButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  testAlarmInfo: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testAlarmText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
  },
  cancelTestButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelTestText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});