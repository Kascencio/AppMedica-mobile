import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../store/useOffline';
import COLORS from '../constants/colors';

interface OfflineIndicatorProps {
  onSyncPress?: () => void;
  showDetails?: boolean;
}

export default function OfflineIndicator({ onSyncPress, showDetails = false }: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingSync, syncPendingData } = useOffline();

  const handleSyncPress = async () => {
    if (onSyncPress) {
      onSyncPress();
    } else {
      try {
        await syncPendingData();
        Alert.alert('Sincronización', 'Datos sincronizados correctamente');
      } catch (error) {
        Alert.alert('Error', 'No se pudo sincronizar los datos');
      }
    }
  };

  // No mostrar nada si estamos online y no hay datos pendientes
  if (isOnline && pendingSync.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[
          styles.indicator,
          isOnline ? styles.online : styles.offline,
          isSyncing && styles.syncing
        ]} 
        onPress={handleSyncPress}
        disabled={isSyncing}
      >
        <Ionicons 
          name={isSyncing ? "sync" : (isOnline ? "cloud-done" : "cloud-offline")} 
          size={16} 
          color={COLORS.text.inverse} 
          style={isSyncing ? styles.rotating : undefined}
        />
        <Text style={styles.text}>
          {isSyncing 
            ? 'Sincronizando...' 
            : isOnline 
              ? `${pendingSync.length} cambios pendientes`
              : 'Sin conexión - Solo lectura'
          }
        </Text>
        {!isSyncing && (
          <Ionicons 
            name="chevron-forward" 
            size={14} 
            color={COLORS.text.inverse} 
          />
        )}
      </TouchableOpacity>

      {showDetails && pendingSync.length > 0 && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Cambios pendientes:</Text>
          {pendingSync.slice(0, 3).map((item, index) => (
            <Text key={index} style={styles.detailItem}>
              • {item.action} {item.entity}
            </Text>
          ))}
          {pendingSync.length > 3 && (
            <Text style={styles.detailItem}>
              ... y {pendingSync.length - 3} más
            </Text>
          )}
        </View>
      )}

      {/* Mensaje adicional cuando está offline */}
      {!isOnline && (
        <View style={styles.offlineMessageContainer}>
          <Ionicons name="information-circle" size={16} color={COLORS.warning} />
          <Text style={styles.offlineMessage}>
            Los datos existentes están disponibles. No se pueden agregar nuevos elementos sin conexión.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  online: {
    backgroundColor: COLORS.success,
  },
  offline: {
    backgroundColor: COLORS.error,
  },
  syncing: {
    backgroundColor: COLORS.warning,
  },
  text: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
  detailsContainer: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  detailItem: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  offlineMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning + '10',
    borderColor: COLORS.warning + '20',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  offlineMessage: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 14,
  },
});
