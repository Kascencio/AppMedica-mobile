import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCaregiver } from '../store/useCaregiver';
import { ProfileAvatar } from './OptimizedImage';
import logo from '../assets/logo.png';

function getPatientName(patient: any): string {
  const fromProfile = patient?.profile?.name 
    || [patient?.profile?.firstName, patient?.profile?.lastName].filter(Boolean).join(' ').trim();
  const fromRoot = patient?.name 
    || patient?.fullName 
    || patient?.patientName 
    || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ').trim()
    || patient?.user?.name;
  const value = (fromRoot && fromRoot.length > 0) ? fromRoot : (fromProfile && fromProfile.length > 0 ? fromProfile : 'Paciente');
  return value;
}

function getPatientAge(patient: any): string {
  const directAge = patient?.age || patient?.profile?.age;
  if (directAge && typeof directAge === 'number' && directAge > 0) {
    return `${directAge} años`;
  }
  const birthDate = patient?.birthDate || patient?.dateOfBirth || patient?.profile?.birthDate || patient?.profile?.dateOfBirth;
  if (birthDate) {
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age >= 0 && age <= 150) {
        return `${age} años`;
      }
    } catch {}
  }
  return '—';
}

export default function SelectedPatientBanner({ onChange }: { onChange?: () => void }) {
  const { patients, selectedPatientId } = useCaregiver();
  const patient = React.useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  if (!patient) return null;

  return (
    <View style={styles.banner}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {patient.photoUrl ? (
          <ProfileAvatar uri={patient.photoUrl} size={44} fallbackSource={logo} />
        ) : (
          <MaterialCommunityIcons name="account-circle" size={44} color="#93c5fd" />
        )}
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{getPatientName(patient)}</Text>
          <Text style={styles.sub} numberOfLines={1}>Edad: {getPatientAge(patient)}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onChange}
        style={styles.changeBtn}
        accessibilityRole="button"
        accessibilityLabel="Cambiar paciente"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="swap-horizontal" size={20} color="#2563eb" />
        <Text style={styles.changeText}>Cambiar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  name: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 16,
  },
  sub: {
    color: '#475569',
    fontSize: 13,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  changeText: {
    color: '#2563eb',
    fontWeight: '700',
    marginLeft: 6,
  },
});


