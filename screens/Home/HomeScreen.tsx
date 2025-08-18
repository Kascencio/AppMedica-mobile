import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMedications } from '../../store/useMedications';
import { useAppointments } from '../../store/useAppointments';
import { useTreatments } from '../../store/useTreatments';
import { useAuth } from '../../store/useAuth';
import { useCurrentUser } from '../../store/useCurrentUser';
import { useIntakeEvents } from '../../store/useIntakeEvents';
import logo from '../../assets/logo.webp';

const { width } = Dimensions.get('window');

function getNextEvents(meds, appts, trts) {
  const now = new Date();
  const events = [];
  if (Array.isArray(meds)) {
    meds.forEach(m => {
      if (m.startDate) events.push({
        type: 'Medicamento',
        name: m.name,
        date: new Date(m.startDate),
        icon: <Ionicons name="medkit" size={22} color="#22d3ee" />,
        color: '#22d3ee',
      });
    });
  }
  if (Array.isArray(appts)) {
    appts.forEach(a => {
      if (a.dateTime) events.push({
        type: 'Cita',
        name: a.title,
        date: new Date(a.dateTime),
        icon: <MaterialCommunityIcons name="calendar-check" size={22} color="#34d399" />,
        color: '#34d399',
      });
    });
  }
  if (Array.isArray(trts)) {
    trts.forEach(t => {
      if (t.startDate) events.push({
        type: 'Tratamiento',
        name: t.title,
        date: new Date(t.startDate),
        icon: <MaterialCommunityIcons name="leaf" size={22} color="#a78bfa" />,
        color: '#a78bfa',
      });
    });
  }
  return events
    .filter(e => e.date > now)
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);
}

const HEALTH_TIPS = [
  'Bebe suficiente agua durante el día.',
  'Haz al menos 30 minutos de actividad física.',
  'No olvides tus medicamentos a tiempo.',
  'Duerme al menos 7-8 horas cada noche.',
  'Mantén contacto regular con tu médico.',
  'Lleva un registro de tus síntomas y progresos.',
  'Evita el estrés con respiraciones profundas.',
  'Come frutas y verduras todos los días.',
];

function getAdherence(events) {
  // Porcentaje de tomas marcadas como TAKEN hoy
  const today = new Date();
  const isToday = (d) => {
    const dt = new Date(d);
    return dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate();
  };
  const todayEvents = Array.isArray(events) ? events.filter(e => isToday(e.scheduledFor)) : [];
  const total = todayEvents.length;
  const taken = todayEvents.filter(e => e.action === 'TAKEN').length;
  return { percent: total ? Math.round((taken / total) * 100) : 0, total, taken };
}

function getLastIntakeEvents(events) {
  return Array.isArray(events)
    ? [...events].sort((a, b) => new Date(b.scheduledFor) - new Date(a.scheduledFor)).slice(0, 5)
    : [];
}

export default function HomeScreen() {
  const { medications } = useMedications();
  const { appointments } = useAppointments();
  const { treatments } = useTreatments();
  const { logout } = useAuth();
  const { profile } = useCurrentUser();
  const { events: intakeEvents } = useIntakeEvents();

  const cards = [
    {
      icon: <Ionicons name="medkit" size={36} color="#38bdf8" />, title: 'Medicamentos',
      count: Array.isArray(medications) ? medications.length : 0,
      bg: ['#bae6fd', '#e0f2fe'], // azul pastel
      desc: 'Activos',
    },
    {
      icon: <MaterialCommunityIcons name="calendar-check" size={36} color="#6ee7b7" />, title: 'Citas',
      count: Array.isArray(appointments) ? appointments.length : 0,
      bg: ['#bbf7d0', '#d1fae5'], // verde pastel
      desc: 'Próximas',
    },
    {
      icon: <MaterialCommunityIcons name="leaf" size={36} color="#c7d2fe" />, title: 'Tratamientos',
      count: Array.isArray(treatments) ? treatments.length : 0,
      bg: ['#ddd6fe', '#e0e7ff'], // morado pastel
      desc: 'En curso',
    },
  ];

  const nextEvents = getNextEvents(medications, appointments, treatments);
  const adherence = getAdherence(intakeEvents);
  const lastEvents = getLastIntakeEvents(intakeEvents);
  const healthTip = HEALTH_TIPS[new Date().getDate() % HEALTH_TIPS.length];

  return (
    <LinearGradient colors={["#e0f2fe", "#f0fdf4", "#f0fdfa"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Logo principal */}
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Image source={logo} style={{ width: 80, height: 80, borderRadius: 20 }} resizeMode="contain" />
        </View>
        {/* Header con avatar y saludo */}
        <View style={styles.headerBox}>
          <View style={styles.avatarBox}>
            {profile?.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle" size={70} color="#cbd5e1" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>¡Hola, {profile?.name || 'Usuario'}!</Text>
            <Text style={styles.motivational}>Recuerda cuidar de ti cada día. ¡Tú salud es lo más importante!</Text>
          </View>
        </View>
        {/* Consejo de salud del día */}
        <View style={styles.tipBox}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color="#f59e42" style={{ marginRight: 6 }} />
          <Text style={styles.tipText}>{healthTip}</Text>
        </View>
        {/* Perfil rápido */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Perfil rápido</Text>
          <View style={styles.profileRow}>
            <View style={styles.profileCol}><Text style={styles.profileLabel}>Edad</Text><Text style={styles.profileValue}>{profile?.age || '—'}</Text></View>
            <View style={styles.profileCol}><Text style={styles.profileLabel}>Peso</Text><Text style={styles.profileValue}>{profile?.weight ? profile.weight + ' kg' : '—'}</Text></View>
            <View style={styles.profileCol}><Text style={styles.profileLabel}>Altura</Text><Text style={styles.profileValue}>{profile?.height ? profile.height + ' cm' : '—'}</Text></View>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.profileCol}><Text style={styles.profileLabel}>Alergias</Text><Text style={styles.profileValue}>{profile?.allergies || '—'}</Text></View>
            <View style={styles.profileCol}><Text style={styles.profileLabel}>Médico</Text><Text style={styles.profileValue}>{profile?.doctorName || '—'}</Text></View>
          </View>
          <TouchableOpacity style={styles.editProfileBtn} onPress={() => { /* Navegar a perfil */ }}>
            <Ionicons name="create-outline" size={18} color="#2563eb" />
            <Text style={styles.editProfileText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>
        {/* Últimos eventos de adherencia */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Últimos eventos</Text>
          {lastEvents.length === 0 ? (
            <Text style={styles.emptyText}>No hay eventos recientes.</Text>
          ) : (
            lastEvents.map((ev, idx) => (
              <View key={ev.id} style={styles.lastEventRow}>
                <MaterialCommunityIcons
                  name={ev.kind === 'MED' ? 'pill' : 'leaf'}
                  size={20}
                  color={ev.kind === 'MED' ? '#22d3ee' : '#a78bfa'}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.lastEventText}>{ev.kind === 'MED' ? 'Medicamento' : 'Tratamiento'}</Text>
                <Text style={[styles.lastEventText, { flex: 1, color: '#334155' }]}>{new Date(ev.scheduledFor).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
                <Text style={[styles.lastEventStatus, ev.action === 'TAKEN' ? styles.statusTaken : ev.action === 'SKIPPED' ? styles.statusSkipped : styles.statusSnooze]}>{ev.action === 'TAKEN' ? 'Tomado' : ev.action === 'SKIPPED' ? 'Omitido' : 'Pospuesto'}</Text>
              </View>
            ))
          )}
        </View>
        {/* Próximos eventos */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Próximos eventos</Text>
          {nextEvents.length === 0 ? (
            <Text style={styles.emptyText}>No hay eventos próximos.</Text>
          ) : (
            nextEvents.map((ev, idx) => (
              <View key={idx} style={[styles.eventCard, { borderLeftColor: ev.color }] }>
                <View style={styles.eventIcon}>{ev.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventType}>{ev.type}</Text>
                  <Text style={styles.eventName}>{ev.name}</Text>
                  <Text style={styles.eventDate}>{ev.date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
                </View>
              </View>
            ))
          )}
        </View>
        {/* Tarjetas de resumen */}
        <View style={styles.cardsRow}>
          {cards.map((card, idx) => (
            <LinearGradient key={card.title} colors={card.bg} style={styles.card} start={{x:0, y:0}} end={{x:1, y:1}}>
              <View style={styles.cardIcon}>{card.icon}</View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardCount}>{card.count}</Text>
              <Text style={styles.cardDesc}>{card.desc}</Text>
            </LinearGradient>
          ))}
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
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    gap: 10,
  },
  eventIcon: {
    marginRight: 8,
  },
  eventType: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 'bold',
  },
  eventName: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  eventDate: {
    fontSize: 13,
    color: '#334155',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '92%',
    marginBottom: 36,
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: width * 0.27,
    maxWidth: width * 0.3,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
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
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    borderRadius: 12,
    padding: 10,
    marginBottom: 18,
    width: '92%',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  tipText: {
    color: '#b45309',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  adherenceCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#22d3ee',
  },
  adherencePercent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: 10,
    backgroundColor: '#22d3ee',
    borderRadius: 6,
  },
  adherenceLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  profileCol: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    padding: 6,
    marginHorizontal: 2,
  },
  profileLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
  },
  profileValue: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 6,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  editProfileText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 4,
  },
  lastEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  lastEventText: {
    fontSize: 13,
    color: '#64748b',
  },
  lastEventStatus: {
    fontWeight: 'bold',
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    textAlign: 'center',
  },
  statusTaken: {
    backgroundColor: '#bbf7d0',
    color: '#22c55e',
  },
  statusSkipped: {
    backgroundColor: '#fee2e2',
    color: '#ef4444',
  },
  statusSnooze: {
    backgroundColor: '#fef9c3',
    color: '#f59e42',
  },
});
