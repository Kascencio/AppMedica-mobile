import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Vibration, ToastAndroid, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useIntakeEvents } from '../../store/useIntakeEvents';
import { useKeepAwake } from 'expo-keep-awake';
import { scheduleNotification } from '../../lib/notifications';
import { useCurrentUser } from '../../store/useCurrentUser';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../constants/colors';

const { width, height } = Dimensions.get('window');

// Mock de datos de alarma
const mockAlarm = {
  name: 'Paracetamol',
  dosage: '500mg',
  instructions: 'Tomar con agua',
  time: '09:00',
};

export default function AlarmScreen({ navigation }: any) {
  useKeepAwake();
  const route = useRoute();
  const { kind, refId, scheduledFor, name, dosage, instructions, time } = route.params as any || {};
  const { registerEvent } = useIntakeEvents();
  const [loading, setLoading] = React.useState(false);
  const [paramError, setParamError] = React.useState<string | null>(null);
  const { profile } = useCurrentUser();

  useEffect(() => {
    console.log('AlarmScreen params:', { kind, refId, scheduledFor, name, dosage, instructions, time });
    
    // Validar parámetros mínimos
    if (!kind || !refId) {
      setParamError('Faltan datos para registrar el evento. Vuelve a abrir la app desde la notificación.');
      return;
    }
    
    // Si no hay scheduledFor, usar la fecha actual
    if (!scheduledFor) {
      console.log('No hay scheduledFor, usando fecha actual');
    }
    
    setParamError(null);
  }, [kind, refId, scheduledFor]);

  // Vibración y sonido al abrir
  useEffect(() => {
    // Vibración más intensa para alarmas
    Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);

    let sound: Audio.Sound | null = null;
    (async () => {
      try {
        const result = await Audio.Sound.createAsync(
          require('../../assets/alarm.mp3'),
          {
            shouldPlay: true,
            isLooping: true, // Repetir el sonido hasta que el usuario tome acción
            volume: 1.0,
          }
        );
        sound = result.sound;
      } catch (error) {
        console.error('[AlarmScreen] Error reproduciendo audio:', error);
        // Si no se puede reproducir el archivo, usar vibración más intensa
        Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);
      }
    })();

    return () => {
      sound?.unloadAsync();
    };
  }, []);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    // Para iOS, podrías usar un modal o una librería de toast
  };

  const handleAction = async (action: 'TAKEN' | 'SNOOZE' | 'SKIPPED') => {
    if (!kind || !refId) {
      setParamError('Faltan datos para registrar el evento.');
      return;
    }
    
    // Usar fecha actual si no hay scheduledFor
    const eventDate = scheduledFor || new Date().toISOString();
    setLoading(true);
    
    try {
      // Manejar posponer de forma segura
      if (action === 'SNOOZE') {
        try {
          const snoozeDate = new Date();
          snoozeDate.setMinutes(snoozeDate.getMinutes() + 10);

          await scheduleNotification({
            title: `Recordatorio: ${name || 'Medicamento'}`,
            body: `Dosis: ${dosage || ''}`,
            data: {
              kind,
              refId,
              scheduledFor: snoozeDate.toISOString(),
              name,
              dosage,
              instructions,
              time: snoozeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              patientProfileId: profile?.patientProfileId || profile?.id,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: snoozeDate,
            },
            identifier: `snooze_${refId}_${Date.now()}`,
            channelId: kind === 'APPOINTMENT' ? 'appointments' : 'medications',
          });
        } catch (snoozeError) {
          console.error('[AlarmScreen] Error programando posponer:', snoozeError);
          // Continuar con el registro del evento aunque falle la notificación
        }
      }
      
      // Registrar evento de forma segura
      try {
        await registerEvent({
          kind,
          refId,
          scheduledFor: eventDate,
          action,
          meta: {},
        });
        showToast('Evento registrado');
        navigation.goBack();
      } catch (eventError) {
        console.error('[AlarmScreen] Error registrando evento:', eventError);
        showToast('Error al registrar evento');
        setParamError('Error al registrar evento.');
      }
    } catch (e) {
      console.error('[AlarmScreen] Error general en handleAction:', e);
      showToast('Error al procesar acción');
      setParamError('Error al procesar acción.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <LinearGradient 
      colors={[COLORS.background.primary, COLORS.background.secondary, COLORS.background.tertiary]} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header con animación de pulso */}
      <View style={styles.header}>
        <View style={styles.alarmIconContainer}>
          <View style={styles.alarmIconPulse} />
          <Ionicons name="alarm" size={80} color={COLORS.primary} style={styles.alarmIcon} />
        </View>
        <Text style={styles.title}>
          {kind === 'APPOINTMENT' ? '¡Hora de tu cita!' : '¡Hora de tu medicamento!'}
        </Text>
        <Text style={styles.subtitle}>
          {kind === 'APPOINTMENT' 
            ? 'Es importante llegar a tiempo a tus citas médicas' 
            : 'Es importante mantener tu horario de medicación'
          }
        </Text>
      </View>

      {/* Información del medicamento o cita */}
      <View style={styles.medicationCard}>
        <View style={styles.medicationHeader}>
          <View style={styles.medicationIcon}>
            <Ionicons 
              name={kind === 'APPOINTMENT' ? 'calendar' : 'medical'} 
              size={32} 
              color={kind === 'APPOINTMENT' ? COLORS.medical.appointment : COLORS.medical.medication} 
            />
          </View>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{name || (kind === 'APPOINTMENT' ? 'Cita' : 'Medicamento')}</Text>
            <Text style={styles.medicationDosage}>
              {kind === 'APPOINTMENT' ? ((route.params as any)?.location || 'Sin ubicación') : (dosage || '')}
            </Text>
          </View>
        </View>
        
        {instructions && (
          <View style={styles.instructionsContainer}>
            <Ionicons name="information-circle" size={20} color={COLORS.text.secondary} />
            <Text style={styles.instructions}>{instructions}</Text>
          </View>
        )}
        
        <View style={styles.timeContainer}>
          <Ionicons name="time" size={24} color={COLORS.primary} />
          <Text style={styles.timeText}>
            {time || (scheduledFor ? new Date(scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : getCurrentTime())}
          </Text>
        </View>
      </View>

      {/* Mensaje de error */}
      {paramError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
          <Text style={styles.errorText}>{paramError}</Text>
        </View>
      )}

      {/* Botones de acción */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.takenButton,
            { opacity: loading || !!paramError ? 0.6 : 1 }
          ]}
          onPress={() => handleAction('TAKEN')}
          disabled={loading || !!paramError}
          accessibilityLabel="Marcar como tomado"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[COLORS.success, COLORS.primary]}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="checkmark-circle" size={32} color={COLORS.text.inverse} />
            <Text style={styles.actionButtonText}>
              {loading ? 'Guardando...' : (kind === 'APPOINTMENT' ? 'Asistí' : 'Tomado')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.snoozeButton,
            { opacity: loading || !!paramError ? 0.6 : 1 }
          ]}
          onPress={() => handleAction('SNOOZE')}
          disabled={loading || !!paramError}
          accessibilityLabel="Posponer 10 minutos"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[COLORS.warning, COLORS.accent]}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="time" size={32} color={COLORS.text.inverse} />
            <Text style={styles.actionButtonText}>
              {loading ? 'Guardando...' : 'Posponer 10m'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.skipButton,
            { opacity: loading || !!paramError ? 0.6 : 1 }
          ]}
          onPress={() => handleAction('SKIPPED')}
          disabled={loading || !!paramError}
          accessibilityLabel="Saltar toma"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[COLORS.error, '#dc2626']}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="close-circle" size={32} color={COLORS.text.inverse} />
            <Text style={styles.actionButtonText}>
              {loading ? 'Guardando...' : 'Saltar'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Footer informativo */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Mantén un registro de tu adherencia para mejores resultados
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
  },
  
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  
  alarmIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  
  alarmIconPulse: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    transform: [{ scale: 1.2 }],
  },
  
  alarmIcon: {
    zIndex: 1,
  },
  
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  medicationCard: {
    backgroundColor: COLORS.background.card,
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  medicationIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  
  medicationInfo: {
    flex: 1,
  },
  
  medicationName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  
  medicationDosage: {
    fontSize: 18,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.tertiary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  
  instructions: {
    fontSize: 16,
    color: COLORS.text.primary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.secondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  
  timeText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    borderColor: COLORS.error + '20',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginLeft: 8,
    flex: 1,
  },
  
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  
  actionButton: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  
  actionButtonText: {
    color: COLORS.text.inverse,
    fontWeight: '700',
    fontSize: 18,
    marginLeft: 12,
  },
  
  takenButton: {
    // Estilos específicos para el botón "Tomado"
  },
  
  snoozeButton: {
    // Estilos específicos para el botón "Posponer"
  },
  
  skipButton: {
    // Estilos específicos para el botón "Saltar"
  },
  
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
