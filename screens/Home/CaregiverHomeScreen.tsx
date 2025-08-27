import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCaregiver } from '../../store/useCaregiver';
import { useCurrentUser } from '../../store/useCurrentUser';
import { useAuth } from '../../store/useAuth';
import logo from '../../assets/logo.webp';

const { width } = Dimensions.get('window');

export default function CaregiverHomeScreen({ navigation }: any) {
  const { patients, loading, fetchPatients } = useCaregiver();
  const { profile } = useCurrentUser();
  const { logout } = useAuth();

  useEffect(() => {
    fetchPatients();
  }, []);

  return (
    <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Logo y saludo */}
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Image source={logo} style={{ width: 80, height: 80, borderRadius: 20 }} resizeMode="contain" />
        </View>
        <View style={styles.headerBox}>
          <View style={styles.avatarBox}>
            {profile?.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle" size={70} color="#cbd5e1" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>¡Hola, {profile?.name || 'Cuidador'}!</Text>
            <Text style={styles.motivational}>Gestiona y cuida a tus pacientes desde aquí.</Text>
          </View>
        </View>
        {/* Acceso a perfil personal */}
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Perfil')}>
          <Ionicons name="person-circle-outline" size={22} color="#2563eb" />
          <Text style={styles.profileBtnText}>Mi perfil</Text>
        </TouchableOpacity>
        {/* Notificaciones relevantes (placeholder) */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          <Text style={styles.emptyText}>Próximamente verás alertas importantes aquí.</Text>
        </View>
        {/* Cards de pacientes asignados */}
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
                    {p.photoUrl ? (
                      <Image source={{ uri: p.photoUrl }} style={styles.patientAvatar} />
                    ) : (
                      <MaterialCommunityIcons name="account-circle" size={54} color="#cbd5e1" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{p.name}</Text>
                    <Text style={styles.patientDetail}>Edad: {p.age || '—'} años</Text>
                  </View>
                  <TouchableOpacity style={styles.dashboardBtn} onPress={() => navigation.navigate('CaregiverDashboardScreen', { patientId: p.id })}>
                    <Ionicons name="arrow-forward-circle" size={32} color="#2563eb" />
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
    paddingTop: 32,
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
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientAvatarBox: {
    marginRight: 10,
  },
  patientAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#e0e7ff',
  },
  patientName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  patientDetail: {
    fontSize: 14,
    color: '#64748b',
  },
  dashboardBtn: {
    marginLeft: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    padding: 4,
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
});
