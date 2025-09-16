import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkNetworkConnectivity } from '../lib/network';

export default function SyncStatus() {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'error'>('synced');

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      // Verificar conectividad real primero
      const online = await checkNetworkConnectivity();
      const lastSyncTime = await AsyncStorage.getItem('lastProfileSync');

      if (online) {
        // Si hay conectividad, no mostrar "local" aunque no haya timestamp aún
        if (lastSyncTime) setLastSync(lastSyncTime);
        setSyncStatus('synced');
      } else {
        // Sin conectividad: mostrar estado local solo si no hay última sync
        if (lastSyncTime) {
          setLastSync(lastSyncTime);
          setSyncStatus('synced');
        } else {
          setSyncStatus('local');
        }
      }
    } catch (error) {
      setSyncStatus('error');
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'synced':
        return '#22c55e';
      case 'local':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced':
        return 'Sincronizado con el servidor';
      case 'local':
        return 'Guardado localmente (servidor no disponible)';
      case 'error':
        return 'Error de sincronización';
      default:
        return 'Estado desconocido';
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return 'checkmark-circle';
      case 'local':
        return 'cloud-offline';
      case 'error':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Ionicons name={getStatusIcon()} size={20} color={getStatusColor()} />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      {lastSync && (
        <Text style={styles.lastSyncText}>
          Última sincronización: {new Date(lastSync).toLocaleString('es-ES')}
        </Text>
      )}
      
      {syncStatus === 'local' && (
        <Text style={styles.warningText}>
          ⚠️ Los datos se guardan localmente debido a problemas del servidor
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    margin: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
