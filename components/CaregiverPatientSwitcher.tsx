import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCaregiver } from '../store/useCaregiver';
import { useOffline } from '../store/useOffline';
import { ProfileAvatar } from './OptimizedImage';
import logo from '../assets/logo.png';

interface CaregiverPatientSwitcherProps {
  onSelected?: (patientId: string) => void;
}

export default function CaregiverPatientSwitcher({ onSelected }: CaregiverPatientSwitcherProps) {
  const { patients, selectedPatientId, setSelectedPatientId } = useCaregiver();
  const { isOnline } = useOffline();

  const handleSelect = (id: string) => {
    setSelectedPatientId(id);
    onSelected?.(id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pacientes</Text>
        {!isOnline && (
          <View style={styles.offlinePill}>
            <MaterialCommunityIcons name="cloud-off-outline" size={14} color="#92400e" />
            <Text style={styles.offlinePillText}>Offline</Text>
          </View>
        )}
      </View>
      {(!patients || patients.length === 0) ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Sin pacientes asignados.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {patients.map((p) => {
            const isActive = selectedPatientId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => handleSelect(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar paciente ${p.name || 'sin nombre'}`}
                accessibilityState={{ selected: isActive }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.9}
              >
                {p.photoUrl ? (
                  <ProfileAvatar uri={p.photoUrl} size={28} fallbackSource={logo} />
                ) : (
                  <View style={styles.initialCircle}>
                    <Text style={styles.initialText}>{(p.name || 'P').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {p.name || 'Paciente'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offlinePillText: {
    color: '#92400e',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    minWidth: 44,
  },
  chipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  chipText: {
    color: '#334155',
    fontSize: 14,
    marginLeft: 8,
    maxWidth: 140,
  },
  chipTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  initialCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: '#3730a3',
    fontWeight: 'bold',
    fontSize: 12,
  },
});


