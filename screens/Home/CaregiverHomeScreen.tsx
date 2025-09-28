import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCaregiver } from '../../store/useCaregiver';
import { useAppointments } from '../../store/useAppointments';
import { useMedications } from '../../store/useMedications';
import { useTreatments } from '../../store/useTreatments';
import { useCurrentUser } from '../../store/useCurrentUser';
import { useAuth } from '../../store/useAuth';
import { useOffline } from '../../store/useOffline';
import logo from '../../assets/logo.png';
import { ProfileAvatar } from '../../components/OptimizedImage';
import { IMAGEKIT_CONFIG } from '../../constants/imagekit';

const { width } = Dimensions.get('window');

export default function CaregiverHomeScreen({ navigation }: any) {
  const { patients, loading, fetchPatients, selectedPatientId } = useCaregiver();
  const { profile } = useCurrentUser();
  const { logout } = useAuth();
  const { isOnline } = useOffline();
  const { appointments, loading: loadingA, getAppointments } = useAppointments();
  const { medications, loading: loadingM, getMedications } = useMedications();
  const { treatments, loading: loadingT, getTreatments } = useTreatments();

  const normalizeImageUrl = (original?: string): string | undefined => {
    if (!original) return undefined;
    if (original.startsWith('data:image') || original.startsWith('file://') || original.startsWith('content://')) return original;
    if (original.startsWith('http')) return original;
    const path = original.startsWith('/') ? original : `/${original}`;
    return `${IMAGEKIT_CONFIG.URL_ENDPOINT}${path}`;
  };

  const getPatientPhotoUrl = (patient: any): string | undefined => {
    const candidate = patient?.photoUrl || patient?.avatarUrl || patient?.imageUrl || patient?.photo || patient?.photoPath || '';
    const resolved = normalizeImageUrl(candidate);
    if (__DEV__) {
      try {
        console.log('[CaregiverHome] Foto paciente', {
          patientId: patient?.id,
          name: patient?.name,
          raw: {
            photoUrl: patient?.photoUrl,
            avatarUrl: patient?.avatarUrl,
            imageUrl: patient?.imageUrl,
            photo: patient?.photo,
            photoPath: patient?.photoPath,
          },
          resolved,
        });
      } catch {}
    }
    return resolved;
  };

  const getPatientName = (patient: any): string => {
    const fromProfile = patient?.profile?.name 
      || [patient?.profile?.firstName, patient?.profile?.lastName].filter(Boolean).join(' ').trim();
    const fromRoot = patient?.name 
      || patient?.fullName 
      || patient?.patientName 
      || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ').trim()
      || patient?.user?.name;
    const value = (fromRoot && fromRoot.length > 0) ? fromRoot : (fromProfile && fromProfile.length > 0 ? fromProfile : 'Paciente');
    if (__DEV__) {
      try {
        console.log('[CaregiverHome] Nombre paciente', {
          patientId: patient?.id,
          chosen: value,
          candidates: { fromRoot, fromProfile },
        });
      } catch {}
    }
    return value;
  };

  const getPatientAge = (patient: any): string => {
    // Intentar obtener edad directamente
    const directAge = patient?.age || patient?.profile?.age;
    if (directAge && typeof directAge === 'number' && directAge > 0) {
      return `${directAge} años`;
    }

    // Calcular edad desde fecha de nacimiento
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
      } catch (e) {
        console.warn('[CaregiverHome] Error calculando edad:', e);
      }
    }

    if (__DEV__) {
      try {
        console.log('[CaregiverHome] Edad paciente', {
          patientId: patient?.id,
          directAge,
          birthDate,
          result: '—',
        });
      } catch {}
    }
    return '—';
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      try { getAppointments(selectedPatientId); } catch {}
      try { getMedications(selectedPatientId); } catch {}
      try { getTreatments(selectedPatientId); } catch {}
    }
  }, [selectedPatientId]);

  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    const events: Array<{ id: string; type: 'CITA' | 'MED' | 'TRT'; title: string; when: Date; subtitle?: string }> = [];

    try {
      (appointments || []).forEach((a: any) => {
        if (!a?.dateTime) return;
        const when = new Date(a.dateTime);
        if (!isNaN(when.getTime()) && when.getTime() >= now.getTime()) {
          events.push({ id: `A_${a.id}`, type: 'CITA', title: a.title || 'Cita médica', when, subtitle: a.location });
        }
      });
    } catch {}

    try {
      (medications || []).forEach((m: any) => {
        let when: Date | null = null;
        if (m?.startDate) {
          const d = new Date(m.startDate);
          if (!isNaN(d.getTime())) when = d;
        } else if (m?.time) {
          const [hh, mm] = String(m.time).split(':');
          const d = new Date();
          d.setHours(parseInt(hh || '0', 10), parseInt(mm || '0', 10), 0, 0);
          if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
          when = d;
        }
        if (when) {
          events.push({ id: `M_${m.id}`, type: 'MED', title: m.name || 'Medicamento', when, subtitle: m.dosage });
        }
      });
    } catch {}

    try {
      (treatments || []).forEach((t: any) => {
        if (!t?.startDate) return;
        const when = new Date(t.startDate);
        if (!isNaN(when.getTime()) && when.getTime() >= now.getTime()) {
          events.push({ id: `T_${t.id}`, type: 'TRT', title: t.title || t.name || 'Tratamiento', when });
        }
      });
    } catch {}

    events.sort((a, b) => a.when.getTime() - b.when.getTime());
    return events.slice(0, 5);
  }, [appointments, medications, treatments]);

  return (
    <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Logo y saludo */}
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Image source={logo} style={{ width: 80, height: 80, borderRadius: 20 }} resizeMode="contain" />
        </View>
        {/* Indicador de estado offline */}
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline-outline" size={16} color="#92400e" />
            <Text style={styles.offlineText}>Sin conexión - Modo offline</Text>
          </View>
        )}
        <View style={styles.headerBox}>
          <View style={styles.avatarBox}>
            {profile?.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle" size={70} color="#cbd5e1" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>¡Hola, {profile?.name || (profile as any)?.username || (profile as any)?.user?.name || 'Cuidador'}!</Text>
            <Text style={styles.motivational}>Gestiona y cuida a tus pacientes desde aquí.</Text>
          </View>
        </View>
        {/* Acceso a perfil personal */}
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Perfil')}>
          <Ionicons name="person-circle-outline" size={22} color="#2563eb" />
          <Text style={styles.profileBtnText}>Mi perfil</Text>
        </TouchableOpacity>
        {/* Próximos eventos */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Próximos eventos</Text>
          {!selectedPatientId ? (
            <Text style={styles.emptyText}>Selecciona un paciente para ver eventos.</Text>
          ) : (loadingA || loadingM || loadingT) ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : upcomingEvents.length === 0 ? (
            <Text style={styles.emptyText}>No hay eventos próximos.</Text>
          ) : (
            upcomingEvents.map(ev => (
              <TouchableOpacity
                key={ev.id}
                style={styles.eventRow}
                onPress={() => {
                  try {
                    if (ev.type === 'CITA') navigation.navigate('Citas');
                    else if (ev.type === 'MED') navigation.navigate('Medicamentos');
                    else navigation.navigate('Tratamientos');
                  } catch {}
                }}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${ev.type === 'CITA' ? 'Citas' : ev.type === 'MED' ? 'Medicamentos' : 'Tratamientos'}`}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.85}
              >
                <View style={styles.eventIcon}>
                  {ev.type === 'CITA' ? (
                    <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                  ) : ev.type === 'MED' ? (
                    <Ionicons name="medkit-outline" size={18} color="#38bdf8" />
                  ) : (
                    <Ionicons name="leaf-outline" size={18} color="#22c55e" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventSub}>{ev.when.toLocaleString()} {ev.subtitle ? `• ${ev.subtitle}` : ''}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        {/* Banner seleccionado y cards de pacientes asignados */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Pacientes asignados</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 16 }} />
          ) : patients.length === 0 ? (
            <Text style={styles.emptyText}>No tienes pacientes asignados.</Text>
          ) : (
            patients.map((p) => (
              <LinearGradient key={p.id} colors={["#e0e7ff", "#f0fdfa"]} style={styles.patientCard} start={{x:0, y:0}} end={{x:1, y:1}}>
                <View style={styles.patientInfoRow}>
                  <View style={styles.patientAvatarBox}>
                    {getPatientPhotoUrl(p) ? (
                      <ProfileAvatar uri={getPatientPhotoUrl(p)!} size={60} fallbackSource={logo} showLoading />
                    ) : (
                      <MaterialCommunityIcons name="account-circle" size={60} color="#2563eb" />
                    )}
                  </View>
                  <View style={styles.patientInfoContainer}>
                    <Text style={styles.patientName}>{getPatientName(p)}</Text>
                    <View style={styles.patientDetailsContainer}>
                      <Text style={styles.patientDetail}>Edad: {getPatientAge(p)}</Text>
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
                  <TouchableOpacity
                    style={styles.dashboardBtn}
                    onPress={() => {
                      try { useCaregiver.getState().setSelectedPatientId(p.id); } catch {}
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar paciente ${getPatientName(p)}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="checkmark-circle" size={36} color="#2563eb" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ))
          )}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    paddingTop: 52, // Aumentado de 32 a 52 para margen superior de 20px
    paddingBottom: 32,
    minHeight: '100%',
  },
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    marginBottom: 18,
    gap: 12,
  },
  avatarBox: {
    marginRight: 8,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 2,
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  motivational: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 2,
    textAlign: 'left',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: '4%',
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  profileBtnText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
  },
  sectionBox: {
    width: '92%',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  patientCard: {
    flexDirection: 'column',
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
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  patientAvatarBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  patientInfoContainer: {
    flex: 1,
    paddingTop: 4,
  },
  patientDetailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
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
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  eventIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  eventTitle: {
    color: '#1f2937',
    fontWeight: '600',
  },
  eventSub: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  dashboardBtn: {
    marginLeft: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: '#bae6fd',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 32,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  offlineText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});
