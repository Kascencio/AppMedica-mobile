import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMedications } from '../../store/useMedications';
import { useAppointments } from '../../store/useAppointments';
import { useAuth } from '../../store/useAuth';
import { useCurrentUser } from '../../store/useCurrentUser';
import { useIntakeEvents } from '../../store/useIntakeEvents';
import OfflineIndicator from '../../components/OfflineIndicator';
import logo from '../../assets/logo.png';
import { useNavigation } from '@react-navigation/native';
// Módulo de pruebas de alarmas removido
import COLORS from '../../constants/colors';
import { scheduleSnoozeMedication } from '../../lib/notifications';
import { useOffline } from '../../store/useOffline';
import { ProfileAvatar } from '../../components/OptimizedImage';

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

function getAdherence(events: any[]) {
  // Porcentaje de tomas marcadas como TAKEN hoy
  const today = new Date();
  const isToday = (d: any) => {
    const dt = new Date(d);
    return dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate();
  };
  const todayEvents = Array.isArray(events) ? events.filter(e => isToday(e.scheduledFor)) : [];
  const total = todayEvents.length;
  const taken = todayEvents.filter(e => e.action === 'TAKEN').length;
  return { percent: total ? Math.round((taken / total) * 100) : 0, total, taken };
}

export default function HomeScreen() {
  const { medications, getMedications } = useMedications();
  const { appointments, getAppointments } = useAppointments();
  const { logout } = useAuth();
  const { profile, fetchProfileCorrectFlow, loading, error } = useCurrentUser();
  const { events: intakeEvents, registerEvent, getEvents } = useIntakeEvents();
  const navigation = useNavigation();
  const { isOnline } = useOffline();

  React.useEffect(() => {
    // Si no hay internet, evita llamadas de red y usa solo datos locales ya cargados
    (async () => {
      try {
        const { checkConnectivity } = await import('../../lib/network');
        const online = await checkConnectivity();
        if (online) {
          fetchProfileCorrectFlow();
        }
      } catch {
        // Si falla la verificación, no forzar fetch para evitar errores de network
      }
    })();
  }, []);

  // Carga inicial: cuando el perfil esté disponible, cargar datos necesarios para Home
  React.useEffect(() => {
    const hasValidProfile = !!profile?.id || !!profile?.patientProfileId;
    if (!hasValidProfile) return;

    (async () => {
      try {
        const { checkConnectivity } = await import('../../lib/network');
        const online = await checkConnectivity();
        if (online) {
          await Promise.all([
            getMedications().catch(() => {}),
            getAppointments().catch(() => {}),
            getEvents().catch(() => {}),
          ]);
        }
        // Si no hay internet, no lanzar errores, la UI usará datos locales existentes
      } catch {}
    })();
  }, [profile?.id, profile?.patientProfileId]);

  // Funciones para acciones de medicamentos
  const handleTakeMedication = async () => {
    const nextMed = getNextMedication();
    if (!nextMed) return;

    try {
      // Crear evento de adherencia
      const adherenceEvent = {
        refId: nextMed.id,
        patientProfileId: profile?.patientProfileId || profile?.id,
        scheduledFor: new Date().toISOString(),
        action: 'TAKEN' as const,
        kind: 'MED' as const,
        notes: 'Registrado desde Home'
      };

      // Usar el store de eventos de adherencia
      await registerEvent(adherenceEvent);
      
      // Mostrar confirmación
      Alert.alert(
        '✅ Toma registrada',
        `Has registrado la toma de ${nextMed.name} correctamente.`,
        [{ text: 'OK' }]
      );

      // Actualizar datos
      await Promise.all([
        getMedications(),
        getEvents()
      ]);
    } catch (error) {
      console.error('[HomeScreen] Error al registrar toma:', error);
      Alert.alert(
        '❌ Error',
        'No se pudo registrar la toma. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSnoozeMedication = async () => {
    const nextMed = getNextMedication();
    if (!nextMed) return;

    try {
      // Crear evento de posponer
      const adherenceEvent = {
        refId: nextMed.id,
        patientProfileId: profile?.patientProfileId || profile?.id,
        scheduledFor: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // +10 minutos
        action: 'SNOOZE' as const,
        kind: 'MED' as const,
        notes: 'Pospuesto 10 minutos desde Home'
      };

      // Usar el store de eventos de adherencia
      await registerEvent(adherenceEvent);

      // Programar notificación para 10 minutos
      await scheduleSnoozeMedication({
        id: nextMed.id,
        name: nextMed.name,
        dosage: nextMed.dosage,
        snoozeMinutes: 10,
        patientProfileId: profile?.patientProfileId || profile?.id,
      });

      // Mostrar confirmación
      Alert.alert(
        '⏰ Toma pospuesta',
        `La toma de ${nextMed.name} se ha pospuesto 10 minutos.`,
        [{ text: 'OK' }]
      );

      // Actualizar datos
      await Promise.all([
        getMedications(),
        getEvents()
      ]);
    } catch (error) {
      console.error('[HomeScreen] Error al posponer toma:', error);
      Alert.alert(
        '❌ Error',
        'No se pudo posponer la toma. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSkipMedication = async () => {
    const nextMed = getNextMedication();
    if (!nextMed) return;

    try {
      // Crear evento de omitir
      const adherenceEvent = {
        refId: nextMed.id,
        patientProfileId: profile?.patientProfileId || profile?.id,
        scheduledFor: new Date().toISOString(),
        action: 'SKIPPED' as const,
        kind: 'MED' as const,
        notes: 'Omitido desde Home'
      };

      // Usar el store de eventos de adherencia
      await registerEvent(adherenceEvent);
      
      // Mostrar confirmación
      Alert.alert(
        '⏭️ Toma omitida',
        `${nextMed.name} ha sido marcado como omitido.`,
        [{ text: 'OK' }]
      );

      // Actualizar datos
      await Promise.all([
        getMedications(),
        getEvents()
      ]);
    } catch (error) {
      console.error('[HomeScreen] Error al omitir toma:', error);
      Alert.alert(
        '❌ Error',
        'No se pudo omitir la toma. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );
    }
  };

  // Funciones auxiliares para el nuevo diseño
  const getNextMedication = () => {
    if (!medications || medications.length === 0) return null;
    const now = new Date();
    const todayMedications = medications.filter(med => {
      if (!med.startDate) return false;
      const startDate = new Date(med.startDate);
      return startDate <= now;
    });
    
    if (todayMedications.length === 0) return null;
    
    // Ordenar por hora y encontrar la próxima
    const withTime = todayMedications.filter(m => !!m.time);
    const source = withTime.length > 0 ? withTime : todayMedications;
    return source.sort((a, b) => {
      const timeA = a.time ? new Date(`2000-01-01 ${a.time}`) : new Date(8640000000000000);
      const timeB = b.time ? new Date(`2000-01-01 ${b.time}`) : new Date(8640000000000000);
      return timeA.getTime() - timeB.getTime();
    })[0];
  };

  const getNextMedicationTime = () => {
    const nextMed = getNextMedication();
    if (!nextMed) return '--:--';
    if (nextMed.time) return nextMed.time;
    // Fallback: si no hay time, intentar formatear desde startDate
    if (nextMed.startDate) {
      const d = new Date(nextMed.startDate);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return '--:--';
  };

  const getNextAppointment = (): any => {
    if (!appointments || appointments.length === 0) return null;
    const now = new Date();
    const futureAppointments = appointments.filter((apt: any) => {
      if (!apt.dateTime) return false;
      const aptDate = new Date(apt.dateTime);
      return aptDate > now;
    });
    
    if (futureAppointments.length === 0) return null;
    
    return futureAppointments.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateA.getTime() - dateB.getTime();
    })[0];
  };

  const formatAppointmentDateTime = (appointment: any) => {
    if (!appointment?.dateTime) return '--';
    const date = new Date(appointment.dateTime);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTodayTimeline = () => {
    const timeline: any[] = [];
    
    // Agregar medicamentos del día
    if (medications && medications.length > 0) {
      medications.forEach(med => {
        if (med.startDate || med.time) {
          const time = med.time || new Date(med.startDate as any).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
          timeline.push({
            time,
            title: med.name,
            subtitle: `${med.dosage} - ${med.type}`,
            completed: false, // Esto se debería verificar contra eventos de adherencia
            type: 'medication'
          });
        }
      });
    }
    
    // Agregar citas del día
    if (appointments && appointments.length > 0) {
      appointments.forEach((apt: any) => {
        if (apt.dateTime) {
          const aptDate = new Date(apt.dateTime);
          const today = new Date();
          if (aptDate.toDateString() === today.toDateString()) {
            timeline.push({
              time: aptDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
              title: `Cita con ${apt.doctorName}`,
              subtitle: apt.location,
              completed: false,
              type: 'appointment'
            });
          }
        }
      });
    }
    
    // Ordenar por hora
    return timeline.sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a.time}`);
      const timeB = new Date(`2000-01-01 ${b.time}`);
      return timeA.getTime() - timeB.getTime();
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchProfile} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const adherence = getAdherence(intakeEvents);
  const healthTip = HEALTH_TIPS[new Date().getDate() % HEALTH_TIPS.length];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header mejorado con logo de la app e info del paciente */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.logoContainer}>
              <ProfileAvatar uri={profile?.photoUrl || ''} size={60} fallbackSource={logo} showLoading />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text.primary }}>
                {profile?.name || 'Usuario'}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.text.secondary, marginTop: 2 }}>
                {profile?.role === 'CAREGIVER' ? 'Cuidador' : 'Paciente'}
              </Text>
            </View>
          </View>
          {/* Botón de notificaciones removido */}
        </View>

        {/* Hero "Tu día" con progreso diario */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Tu día</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressRing}>
              <Text style={styles.progressText}>{adherence.percent}%</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              {adherence.total > 0 
                ? `${adherence.taken} de ${adherence.total} tomas realizadas`
                : 'No hay tomas programadas para hoy'
              }
            </Text>
          </View>
        </View>

        {/* Próxima toma con acciones */}
        {getNextMedication() && (
          <View style={styles.nextMedCard}>
            <View style={styles.nextMedHeader}>
              <Ionicons name="time" size={20} color={COLORS.primary} />
              <Text style={styles.nextMedTitle}>Próxima toma</Text>
            </View>
            <View style={styles.nextMedContent}>
              <Text style={styles.nextMedTime}>{getNextMedicationTime()}</Text>
              <Text style={styles.nextMedName}>{getNextMedication()?.name}</Text>
              <Text style={styles.nextMedDosage}>{getNextMedication()?.dosage}</Text>
            </View>
            <View style={styles.nextMedActions}>
              <TouchableOpacity 
                style={[styles.actionBtnPrimary, !isOnline && { opacity: 0.6 }]}
                onPress={handleTakeMedication}
                disabled={!isOnline}
              >
                <Ionicons name="checkmark-circle" size={16} color={COLORS.text.inverse} />
                <Text style={styles.actionBtnText}>Tomar ahora</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtnSecondary, !isOnline && { opacity: 0.6 }]}
                onPress={handleSnoozeMedication}
                disabled={!isOnline}
              >
                <Ionicons name="time" size={16} color={COLORS.primary} />
                <Text style={styles.actionBtnTextSecondary}>Posponer 10 min</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtnTertiary, !isOnline && { opacity: 0.6 }]}
                onPress={handleSkipMedication}
                disabled={!isOnline}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.text.secondary} />
                <Text style={styles.actionBtnTextTertiary}>Omitir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Siguiente cita o CTA */}
        {getNextAppointment() ? (
          <View style={styles.nextApptCard}>
            <View style={styles.nextApptHeader}>
              <Ionicons name="calendar" size={20} color={COLORS.medical.appointment} />
              <Text style={styles.nextApptTitle}>Siguiente cita</Text>
            </View>
            <View style={styles.nextApptContent}>
              <Text style={styles.nextApptDateTime}>
                {formatAppointmentDateTime(getNextAppointment())}
              </Text>
              <Text style={styles.nextApptDoctor}>{getNextAppointment()?.doctorName}</Text>
              <Text style={styles.nextApptLocation}>{getNextAppointment()?.location}</Text>
            </View>
            <TouchableOpacity style={styles.viewApptBtn}>
              <Text style={styles.viewApptText}>Ver detalles</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ctaCard}>
            <Ionicons name="calendar-outline" size={32} color={COLORS.text.tertiary} />
            <Text style={styles.ctaTitle}>Agenda tu próxima cita</Text>
            <Text style={styles.ctaSubtitle}>Mantén un seguimiento regular de tu salud</Text>
            <TouchableOpacity 
              style={styles.ctaBtn}
              onPress={() => (navigation as any).navigate('Appointments')}
            >
              <Text style={styles.ctaBtnText}>Agendar cita</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Acciones rápidas */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.quickActionsGrid}>
            {/* Solo acciones de navegación principales */}
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => (navigation as any).navigate('Appointments')}
            >
              <Ionicons name="calendar-outline" size={24} color={COLORS.medical.appointment} />
              <Text style={styles.quickActionText}>Agendar cita</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => (navigation as any).navigate('Medications')}
            >
              <Ionicons name="medkit-outline" size={24} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Mis medicamentos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline de hoy con estados */}
        {getTodayTimeline().length > 0 && (
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Timeline de hoy</Text>
            {getTodayTimeline().map((event, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineTime}>
                  <Text style={styles.timelineTimeText}>{event.time}</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{event.title}</Text>
                  <Text style={styles.timelineSubtitle}>{event.subtitle}</Text>
                </View>
                <View style={styles.timelineStatus}>
                  {event.completed ? (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  ) : event.skipped ? (
                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                  ) : (
                    <Ionicons name="time" size={20} color={COLORS.text.tertiary} />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tip del día descartable */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
                          <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={COLORS.accent.orange} />
            <Text style={styles.tipTitle}>Tip del día</Text>
            <TouchableOpacity style={styles.dismissTipBtn}>
              <Ionicons name="close" size={16} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipText}>{healthTip}</Text>
        </View>
        {/* Módulo de pruebas de alarmas removido */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 32,
    minHeight: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.text.secondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
  },
  errorText: {
    marginTop: 16,
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    marginBottom: 24,
  },
  logoContainer: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 12,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  alarmBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background.card,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressSubtext: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  nextMedicationCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    width: '92%',
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  nextMedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextMedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  nextMedContent: {
    marginBottom: 20,
  },
  nextMedTime: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  nextMedName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  nextMedDosage: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  nextMedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.text.inverse,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtonTextSecondary: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextAppointmentCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    width: '92%',
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  nextApptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextApptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  nextApptContent: {
    marginBottom: 20,
  },
  nextApptDateTime: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.medical.appointment,
    marginBottom: 8,
  },
  nextApptDoctor: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  nextApptLocation: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  viewAppointmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  viewAppointmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 6,
  },
  quickActionsSection: {
    width: '92%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  timelineSection: {
    width: '92%',
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  timelineTime: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 16,
  },
  timelineTimeText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  timelineStatus: {
    marginLeft: 16,
  },
  emptyStateCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    padding: 40,
    marginBottom: 24,
    width: '92%',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateCTA: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyStateCTAText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '92%',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  dismissTipBtn: {
    padding: 6,
  },
  tipText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 32,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  // Nuevos estilos para el diseño actualizado
  progressContainer: {
    alignItems: 'center',
  },
  nextMedCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    width: '92%',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },

  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionBtnTextSecondary: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionBtnTertiary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.text.secondary,
  },
  actionBtnTextTertiary: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  nextApptCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    width: '92%',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },

  viewApptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.medical.appointment,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  viewApptText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  ctaCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    width: '92%',
    alignItems: 'center',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: COLORS.medical.appointment,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  ctaBtnText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

});
