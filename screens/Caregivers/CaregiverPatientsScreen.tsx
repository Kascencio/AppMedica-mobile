import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCaregiver } from '../../store/useCaregiver';
import { usePermissions } from '../../store/usePermissions';
import { LinearGradient } from 'expo-linear-gradient';
import { useOffline } from '../../store/useOffline';

export default function CaregiverPatientsScreen() {
  const { patients, loading, error, fetchPatients } = useCaregiver();
  const { joinPatient } = useCaregiver();
  const permissions = usePermissions();
  const { isOnline } = useOffline();
  const [code, setCode] = useState('');

  useEffect(() => {
    fetchPatients();
    permissions.getCaregiverPermissions();
  }, []);

  const onJoin = async () => {
    if (!code.trim()) return;
    if (!isOnline) return;
    const ok = await joinPatient(code.trim());
    if (ok) {
      Alert.alert('Solicitud enviada', 'Espera aprobación del paciente.');
      setCode('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.card} start={{x:0, y:0}} end={{x:1, y:1}}>
        <Text style={styles.headerTitle}>Unirme a un paciente</Text>
        {!isOnline && (
          <View style={{ backgroundColor: '#fef9c3', borderColor: '#fde047', borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 8 }}>
            <Text style={{ color: '#92400e' }}>Modo sin conexión: visualización habilitada, edición deshabilitada.</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput style={styles.input} placeholder="Código de invitación o ID de paciente" value={code} onChangeText={setCode} />
          <TouchableOpacity style={[styles.joinBtn, (!code.trim() || !isOnline) && { opacity: 0.5 }]} onPress={onJoin} disabled={!code.trim() || !isOnline}>
            <Text style={styles.joinBtnText}>Unirse</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </LinearGradient>

      <Text style={styles.listTitle}>Pacientes asignados</Text>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : patients.length === 0 ? (
        <View style={styles.centered}><Text style={styles.emptyText}>No tienes pacientes asignados.</Text></View>
      ) : (
        patients.map((p) => (
          <LinearGradient key={p.id} colors={["#e0e7ff", "#f0fdfa"]} style={styles.patientCard} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={styles.patientCardContent}>
              <View style={styles.patientAvatarSection}>
                <MaterialCommunityIcons name="account-circle" size={48} color="#2563eb" />
              </View>
              <View style={styles.patientInfoSection}>
                <Text style={styles.patientName}>{p.name}</Text>
                <View style={styles.patientDetailsRow}>
                  <Text style={styles.patientDetail}>Edad: {p.age || '—'} años</Text>
                  {p.birthDate && (
                    <Text style={styles.patientBirthDate}>
                      • Nacimiento: {new Date(p.birthDate).toLocaleDateString('es-ES', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </Text>
                  )}
                </View>
                {p.weight && (
                  <Text style={styles.patientAdditionalInfo}>Peso: {p.weight} kg</Text>
                )}
                {p.height && (
                  <Text style={styles.patientAdditionalInfo}>Altura: {p.height} cm</Text>
                )}
                {p.allergies && (
                  <Text style={styles.patientAllergies}>⚠️ Alergias: {p.allergies}</Text>
                )}
              </View>
              <View style={styles.patientActionsSection}>
                {/* Botón revocar si hay permiso activo */}
                {permissions.items.find(it => it.patientId === p.id && it.status === 'ACCEPTED') && (
                  <TouchableOpacity style={[styles.revokeBtn, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && permissions.revoke(permissions.items.find(it => it.patientId === p.id)?.id || '')} disabled={!isOnline}>
                    <Text style={styles.revokeText}>Revocar</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.patientStatusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: permissions.items.find(it => it.patientId === p.id && it.status === 'ACCEPTED') ? '#22c55e' : '#f59e0b' }]} />
                  <Text style={styles.statusText}>
                    {permissions.items.find(it => it.patientId === p.id && it.status === 'ACCEPTED') ? 'Activo' : 'Pendiente'}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        ))
      )}

      <Text style={styles.listTitle}>Solicitudes pendientes</Text>
      {permissions.loading ? (
        <View style={styles.centered}><ActivityIndicator size="small" color="#2563eb" /></View>
      ) : (
        permissions.items.filter(it => it.status === 'PENDING').length === 0 ? (
          <View style={styles.centered}><Text style={styles.emptyText}>No hay solicitudes pendientes.</Text></View>
        ) : (
          permissions.items.filter(it => it.status === 'PENDING').map(it => (
            <LinearGradient key={it.id} colors={["#fef9c3", "#fef3c7"]} style={styles.permissionCard} start={{x:0, y:0}} end={{x:1, y:1}}>
              <Text style={styles.permissionText}>Solicitud para paciente {it.patient?.name || it.patientId}</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity style={[styles.approveBtn, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && permissions.approve(it.id)} disabled={!isOnline}>
                  <Text style={styles.approveText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rejectBtn, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && permissions.reject(it.id)} disabled={!isOnline}>
                  <Text style={styles.rejectText}>Rechazar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cancelBtn, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && permissions.cancel(it.id)} disabled={!isOnline}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ))
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 44, // Aumentado de 24 a 44 para margen superior de 20px
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.96)'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  joinBtn: {
    marginLeft: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  joinBtnText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    marginTop: 6,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
  },
  patientCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  patientCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  patientAvatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  patientInfoSection: {
    flex: 1,
    paddingTop: 4,
  },
  patientDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  patientActionsSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  patientStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  permissionCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.97)'
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  patientDetail: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  patientBirthDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  patientAdditionalInfo: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  patientAllergies: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  approveBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  approveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  rejectText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cancelText: {
    color: '#334155',
    fontWeight: 'bold',
  },
  revokeBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  revokeText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
});


