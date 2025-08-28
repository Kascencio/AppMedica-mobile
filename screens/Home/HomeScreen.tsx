import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMedications } from '../../store/useMedications';
import { useAppointments } from '../../store/useAppointments';
import { useAuth } from '../../store/useAuth';
import { useCurrentUser } from '../../store/useCurrentUser';
import { useIntakeEvents } from '../../store/useIntakeEvents';
import OfflineIndicator from '../../components/OfflineIndicator';
import logo from '../../assets/logo.webp';
import { useNavigation } from '@react-navigation/native';
import AlarmStatus from '../../components/AlarmStatus';
import COLORS from '../../constants/colors';
import { scheduleSnoozeMedication } from '../../lib/notifications';

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
  const { appointments } = useAppointments();
  const { logout } = useAuth();
  const { profile, fetchProfile, loading, error } = useCurrentUser();
  const { events: intakeEvents, registerEvent, getEvents } = useIntakeEvents();
  const navigation = useNavigation();

  React.useEffect(() => {
    fetchProfile();
  }, []);

  // Funciones para acciones de medicamentos
  const handleTakeMedication = async () => {
    const nextMed = getNextMedication();
    if (!nextMed) return;

    try {
      // Crear evento de adherencia
      const adherenceEvent = {
        refId: nextMed.id,
        patientProfileId: profile?.id,
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
        patientProfileId: profile?.id,
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
        patientProfileId: profile?.id,
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
    return todayMedications.sort((a, b) => {
      const timeA = a.time ? new Date(`2000-01-01 ${a.time}`) : new Date(0);
      const timeB = b.time ? new Date(`2000-01-01 ${b.time}`) : new Date(0);
      return timeA.getTime() - timeB.getTime();
    })[0];
  };

  const getNextMedicationTime = () => {
    const nextMed = getNextMedication();
    if (!nextMed?.time) return '--:--';
    return nextMed.time;
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
        if (med.startDate && med.time) {
          timeline.push({
            time: med.time,
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
              time: aptDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
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
        {/* Indicador de sincronización */}
        <OfflineIndicator showDetails={true} />
        
        {/* Estado de las alarmas */}
        <AlarmStatus />
        
        {/* Header con logo y notificaciones */}
        <View style={styles.headerRow}>
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications' as never)}
            style={styles.notificationBtn}
            accessibilityRole="button"
            accessibilityLabel="Ver notificaciones"
            accessibilityHint="Toca para ver tus notificaciones y recordatorios"
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero Section - Hoy */}
        <View 
          style={styles.heroSection}
          accessibilityRole="summary"
          accessibilityLabel={`Progreso de hoy: ${adherence.percent}% completado. ${adherence.total > 0 ? `${adherence.taken} de ${adherence.total} tomas realizadas` : 'No hay tomas programadas para hoy'}`}
        >
          <Text style={styles.heroTitle}>Hoy</Text>
          <View 
            style={styles.progressRing}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: adherence.percent }}
            accessibilityLabel={`Progreso diario: ${adherence.percent} por ciento completado`}
          >
            <Text style={styles.progressText}>{adherence.percent}%</Text>
            <Text style={styles.progressSubtext}>Completado</Text>
          </View>
          <Text style={styles.heroSubtitle}>
            {adherence.total > 0 
              ? `${adherence.taken} de ${adherence.total} tomas realizadas`
              : 'No hay tomas programadas para hoy'
            }
          </Text>
        </View>

        {/* Próxima Toma - PRIORIDAD ALTA */}
        {getNextMedication() && (
          <View 
            style={styles.nextMedicationCard}
            accessibilityRole="summary"
            accessibilityLabel={`Próxima toma: ${getNextMedication()?.name} a las ${getNextMedicationTime()}, dosis ${getNextMedication()?.dosage}`}
          >
            <View style={styles.nextMedHeader}>
              <Ionicons name="time" size={20} color={COLORS.primary} />
              <Text style={styles.nextMedTitle}>Próxima toma</Text>
            </View>
            <View style={styles.nextMedContent}>
              <Text style={styles.nextMedTime} accessibilityLabel={`Hora: ${getNextMedicationTime()}`}>{getNextMedicationTime()}</Text>
              <Text style={styles.nextMedName} accessibilityLabel={`Medicamento: ${getNextMedication()?.name}`}>{getNextMedication()?.name}</Text>
              <Text style={styles.nextMedDosage} accessibilityLabel={`Dosis: ${getNextMedication()?.dosage}`}>{getNextMedication()?.dosage}</Text>
            </View>
            <View style={styles.nextMedActions}>
              <TouchableOpacity 
                style={styles.actionButtonPrimary}
                accessibilityRole="button"
                accessibilityLabel="Registrar toma"
                accessibilityHint={`Marca como tomado el medicamento ${getNextMedication()?.name}`}
                onPress={handleTakeMedication}
              >
                <Ionicons name="checkmark-circle" size={20} color={COLORS.text.inverse} />
                <Text style={styles.actionButtonText}>Registrar toma</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButtonSecondary}
                accessibilityRole="button"
                accessibilityLabel="Posponer 10 minutos"
                accessibilityHint={`Pospone la toma de ${getNextMedication()?.name} por 10 minutos`}
                onPress={handleSnoozeMedication}
              >
                <Ionicons name="time" size={20} color={COLORS.primary} />
                <Text style={styles.actionButtonTextSecondary}>Posponer 10 min</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Siguiente Cita - PRIORIDAD ALTA */}
        {getNextAppointment() && (
          <View style={styles.nextAppointmentCard}>
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
            <TouchableOpacity style={styles.viewAppointmentBtn}>
              <Text style={styles.viewAppointmentText}>Ver detalles</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Acciones Rápidas */}
        <View 
          style={styles.quickActionsSection}
          accessibilityRole="summary"
          accessibilityLabel="Acciones rápidas"
        >
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Medications' as never)}
              accessibilityRole="button"
              accessibilityLabel="Agregar medicamento"
              accessibilityHint="Navega a la pantalla de medicamentos para agregar uno nuevo"
            >
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Agregar medicamento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Appointments' as never)}
              accessibilityRole="button"
              accessibilityLabel="Agendar cita"
              accessibilityHint="Navega a la pantalla de citas para agendar una nueva"
            >
              <Ionicons name="calendar-outline" size={24} color={COLORS.medical.appointment} />
              <Text style={styles.quickActionText}>Agendar cita</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline de Hoy - Solo si hay eventos */}
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
                  ) : (
                    <Ionicons name="time" size={20} color={COLORS.text.tertiary} />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CTA si no hay eventos */}
        {getTodayTimeline().length === 0 && (
          <View style={styles.emptyStateCard}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyStateTitle}>No tienes eventos hoy</Text>
            <Text style={styles.emptyStateSubtitle}>Agrega medicamentos o agenda citas para comenzar</Text>
            <TouchableOpacity style={styles.emptyStateCTA} onPress={() => navigation.navigate('Medications' as never)}>
              <Text style={styles.emptyStateCTAText}>Agregar medicamento</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tip del día - Descartable y pequeño */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipTitle}>Tip del día</Text>
            <TouchableOpacity style={styles.dismissTipBtn}>
              <Ionicons name="close" size={16} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipText}>{healthTip}</Text>
        </View>

        {/* Botón de logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.text.inverse} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
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
  headerRow: {
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
  notificationBtn: {
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
});
