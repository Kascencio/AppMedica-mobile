import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../store/useOffline';
import COLORS from '../constants/colors';

interface SyncStatusBarProps {
  onPress?: () => void;
}

export default function SyncStatusBar({ onPress }: SyncStatusBarProps) {
  const { isOnline, isSyncing, pendingSync } = useOffline();

  // No mostrar nada si estamos online y no hay datos pendientes
  if (isOnline && pendingSync.length === 0) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isOnline ? styles.online : styles.offline,
        isSyncing && styles.syncing
      ]} 
      onPress={onPress}
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
            : 'Modo offline'
        }
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 8,
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
    marginLeft: 4,
  },
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
});
