import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlarms } from '../hooks/useAlarms';
import { unifiedAlarmService } from '../lib/unifiedAlarmService';
import { getScheduledNotifications } from '../lib/notifications';
import COLORS from '../constants/colors';

interface AlarmStatusProps {
  showDetails?: boolean;
  onRepair?: () => void;
}

export default function AlarmStatus({ showDetails = false, onRepair }: AlarmStatusProps) {
  const { 
    stats, 
    apiStats, 
    checkAlarmSystemStatus, 
    repairAlarmSystem,
    checkNotificationHealth,
    syncPendingQueue,
    loadApiNotifications,
    loadApiStats
  } = useAlarms();
  
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiHealth, setApiHealth] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const status = await checkAlarmSystemStatus();
      setSystemStatus(status);
      
      // Verificar salud de la API
      const health = await checkNotificationHealth();
      setApiHealth(health);
    } catch (error) {
      console.error('[AlarmStatus] Error verificando estado:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async () => {
    Alert.alert(
      'Reparar Sistema de Alarmas',
      '¿Estás seguro de que quieres reparar el sistema de alarmas? Esto puede tomar unos momentos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reparar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await repairAlarmSystem();
              if (success) {
                Alert.alert('Éxito', 'Sistema de alarmas reparado correctamente');
                await checkStatus();
                onRepair?.();
              } else {
                Alert.alert('Error', 'No se pudo reparar el sistema de alarmas');
              }
            } catch (error) {
              Alert.alert('Error', 'Error durante la reparación');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await syncPendingQueue();
      await loadApiNotifications();
      await loadApiStats();
      Alert.alert('Éxito', 'Sincronización completada');
      await checkStatus();
    } catch (error) {
      Alert.alert('Error', 'Error durante la sincronización');
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    Alert.alert(
      'Ejecutar Pruebas',
      '¿Quieres ejecutar pruebas de notificaciones? Esto creará notificaciones de prueba.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ejecutar',
          onPress: async () => {
            setLoading(true);
            try {
              // Ejecutar diagnóstico del servicio unificado
              const status = unifiedAlarmService.getStatus();
              const success = status.isInitialized;
              if (success) {
                Alert.alert('Éxito', 'Pruebas ejecutadas correctamente');
                await checkStatus();
              } else {
                Alert.alert('Error', 'Algunas pruebas fallaron. Revisa la consola para más detalles.');
              }
            } catch (error) {
              Alert.alert('Error', 'Error ejecutando pruebas');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const showStats = async () => {
    setLoading(true);
    try {
      // Mostrar estadísticas del sistema unificado
      const status = unifiedAlarmService.getStatus();
      const scheduledAlarms = await getScheduledNotifications();
      Alert.alert(
        'Estadísticas del Sistema',
        `Servicio inicializado: ${status.isInitialized ? 'Sí' : 'No'}\n` +
        `Alarma activa: ${status.isAlarmActive ? 'Sí' : 'No'}\n` +
        `Estado de la app: ${status.appState}\n` +
        `Listeners: ${status.listenersCount}\n` +
        `Alarmas programadas: ${scheduledAlarms.length}`
      );
      Alert.alert('Estadísticas', 'Las estadísticas se han mostrado en la consola');
    } catch (error) {
      Alert.alert('Error', 'Error obteniendo estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const cleanupTests = async () => {
    Alert.alert(
      'Limpiar Pruebas',
      '¿Quieres limpiar todas las notificaciones de prueba?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          onPress: async () => {
            setLoading(true);
            try {
              await unifiedAlarmService.cancelAllAlarms();
              Alert.alert('Éxito', 'Notificaciones de prueba limpiadas');
              await checkStatus();
            } catch (error) {
              Alert.alert('Error', 'Error limpiando notificaciones de prueba');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (!systemStatus) {
    return (
      <View style={styles.container}>
        <View style={styles.statItem}>
          <Ionicons name="help-circle" size={20} color={COLORS.text.secondary} />
          <Text style={styles.statText}>Verificando estado...</Text>
        </View>
      </View>
    );
  }

  const hasErrors = systemStatus.errors.length > 0;
  const isHealthy = systemStatus.permissions && systemStatus.channels && systemStatus.storageSync;
  const isApiHealthy = apiHealth?.status === 'healthy' || apiHealth?.status === 'local_only';

  return (
    <View style={styles.container}>
      {/* Estado general */}
      <View style={[styles.statusHeader, hasErrors ? styles.statusError : styles.statusSuccess]}>
        <Ionicons 
          name={isHealthy ? "checkmark-circle" : "alert-circle"} 
          size={24} 
          color={isHealthy ? COLORS.success : COLORS.error} 
        />
        <Text style={[styles.statusTitle, { color: isHealthy ? COLORS.success : COLORS.error }]}>
          {isHealthy ? 'Sistema de Alarmas Funcionando' : 'Problemas Detectados'}
        </Text>
      </View>

      {/* Estadísticas básicas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Notificaciones Locales</Text>
          <Text style={styles.statValue}>{systemStatus.scheduledNotifications}</Text>
        </View>
        {stats && (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Medicamentos</Text>
              <Text style={styles.statValue}>{stats.types?.medications || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Citas</Text>
              <Text style={styles.statValue}>{stats.types?.appointments || 0}</Text>
            </View>
          </>
        )}
      </View>

      {/* Estadísticas de la API */}
      {apiStats && (
        <View style={styles.apiStatsContainer}>
          <Text style={styles.apiStatsTitle}>API de Notificaciones</Text>
          <View style={styles.apiStatsRow}>
            <View style={styles.apiStatItem}>
              <Text style={styles.apiStatLabel}>Total</Text>
              <Text style={styles.apiStatValue}>{(apiStats as any).total || 0}</Text>
            </View>
            <View style={styles.apiStatItem}>
              <Text style={styles.apiStatLabel}>No Leídas</Text>
              <Text style={[styles.apiStatValue, { color: ((apiStats as any).unread || 0) > 0 ? COLORS.warning : COLORS.text.primary }]}>
                {(apiStats as any).unread || 0}
              </Text>
            </View>
            <View style={styles.apiStatItem}>
              <Text style={styles.apiStatLabel}>Leídas</Text>
              <Text style={styles.apiStatValue}>{(apiStats as any).read || 0}</Text>
            </View>
          </View>
          <View style={[styles.apiHealthIndicator, { backgroundColor: isApiHealthy ? COLORS.success + '20' : COLORS.error + '20' }]}>
            <Ionicons 
              name={apiHealth?.status === 'healthy' ? "cloud-done" : apiHealth?.status === 'local_only' ? "phone-portrait" : "cloud-offline"} 
              size={16} 
              color={isApiHealthy ? COLORS.success : COLORS.error} 
            />
            <Text style={[styles.apiHealthText, { color: isApiHealthy ? COLORS.success : COLORS.error }]}>
              {apiHealth?.status === 'healthy' ? 'API Conectada' : apiHealth?.status === 'local_only' ? 'Modo Local' : 'API Desconectada'}
            </Text>
          </View>
        </View>
      )}

      {/* Detalles si están habilitados */}
      {showDetails && (
        <ScrollView style={styles.detailsContainer}>
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Verificaciones del Sistema</Text>
            
            <View style={styles.checkItem}>
              <Ionicons 
                name={systemStatus.permissions ? "checkmark" : "close"} 
                size={16} 
                color={systemStatus.permissions ? COLORS.success : COLORS.error} 
              />
              <Text style={styles.checkText}>Permisos de Notificación</Text>
            </View>
            
            <View style={styles.checkItem}>
              <Ionicons 
                name={systemStatus.channels ? "checkmark" : "close"} 
                size={16} 
                color={systemStatus.channels ? COLORS.success : COLORS.error} 
              />
              <Text style={styles.checkText}>Canales de Notificación</Text>
            </View>
            
            <View style={styles.checkItem}>
              <Ionicons 
                name={systemStatus.storageSync ? "checkmark" : "close"} 
                size={16} 
                color={systemStatus.storageSync ? COLORS.success : COLORS.error} 
              />
              <Text style={styles.checkText}>Sincronización de Almacenamiento</Text>
            </View>

            <View style={styles.checkItem}>
              <Ionicons 
                name={isApiHealthy ? "checkmark" : "close"} 
                size={16} 
                color={isApiHealthy ? COLORS.success : COLORS.error} 
              />
              <Text style={styles.checkText}>API de Notificaciones</Text>
            </View>
          </View>

          {/* Errores si los hay */}
          {systemStatus.errors.length > 0 && (
            <View style={styles.errorSection}>
              <Text style={styles.errorTitle}>Problemas Detectados:</Text>
              {systemStatus.errors.map((error: string, index: number) => (
                <Text key={index} style={styles.errorText}>• {error}</Text>
              ))}
            </View>
          )}

          {/* Estado de la API */}
          {apiHealth && (
            <View style={styles.apiHealthSection}>
              <Text style={styles.apiHealthTitle}>Estado de la API:</Text>
              <Text style={styles.apiHealthMessage}>{apiHealth.message}</Text>
              <Text style={styles.apiHealthTimestamp}>
                Última verificación: {new Date(apiHealth.timestamp).toLocaleString()}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Acciones */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton]}
          onPress={checkStatus}
          disabled={loading}
        >
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Verificar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.syncButton]}
          onPress={handleSync}
          disabled={loading}
        >
          <Ionicons name="sync" size={16} color={COLORS.secondary || '#10b981'} />
          <Text style={[styles.actionButtonText, { color: COLORS.secondary || '#10b981' }]}>Sincronizar</Text>
        </TouchableOpacity>

        {hasErrors && (
          <TouchableOpacity
            style={[styles.actionButton, styles.repairButton]}
            onPress={handleRepair}
            disabled={loading}
          >
            <Ionicons name="build" size={16} color={COLORS.text.inverse} />
            <Text style={[styles.actionButtonText, { color: COLORS.text.inverse }]}>Reparar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.testButton]}
          onPress={runTests}
          disabled={loading}
        >
          <Ionicons name="flask" size={16} color={COLORS.warning} />
          <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Probar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.statsButton]}
          onPress={showStats}
          disabled={loading}
        >
          <Ionicons name="stats-chart" size={16} color={COLORS.primary} />
          <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Estadísticas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.cleanupButton]}
          onPress={cleanupTests}
          disabled={loading}
        >
          <Ionicons name="trash" size={16} color={COLORS.text.secondary} />
          <Text style={[styles.actionButtonText, { color: COLORS.text.secondary }]}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Procesando...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    paddingLeft: 12,
  },
  statusError: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    paddingLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  apiStatsContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  apiStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  apiStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  apiStatItem: {
    alignItems: 'center',
  },
  apiStatLabel: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  apiStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  apiHealthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 4,
  },
  apiHealthText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  detailsContainer: {
    maxHeight: 200,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  errorSection: {
    backgroundColor: COLORS.error + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginBottom: 4,
  },
  apiHealthSection: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  apiHealthTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  apiHealthMessage: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  apiHealthTimestamp: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.neutral,
    minWidth: 80,
  },
  refreshButton: {
    backgroundColor: COLORS.background.white,
  },
  syncButton: {
    backgroundColor: COLORS.background.white,
    borderColor: COLORS.secondary || '#10b981',
  },
  repairButton: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  testButton: {
    backgroundColor: COLORS.background.white,
    borderColor: COLORS.warning,
  },
  statsButton: {
    backgroundColor: COLORS.background.white,
    borderColor: COLORS.primary,
  },
  cleanupButton: {
    backgroundColor: COLORS.background.white,
    borderColor: COLORS.text.secondary,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});
