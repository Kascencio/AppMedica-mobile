// screens/AlarmScreen/AlarmScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  ToastAndroid, 
  Animated, 
  Dimensions,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useKeepAwake } from 'expo-keep-awake';
import { unifiedAlarmService } from '../../lib/unifiedAlarmService';
// import { scheduleSnooze10 } from '../../lib/notifications'; // Función eliminada
import { COLORS } from '../../constants/colors';
// importa tus stores reales:
import { useCurrentUser } from '../../store/useCurrentUser';
import { useIntakeEvents } from '../../store/useIntakeEvents';

const { width, height } = Dimensions.get('window');

export default function AlarmScreen(props: any) {
  useKeepAwake();
  const { profile } = useCurrentUser();
  const { registerEvent } = useIntakeEvents();

  // 1) Consolidar parámetros desde varias fuentes
  const [ready, setReady] = useState(false);
  const [params, setParams] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 2) Animaciones
  const pulseAnim = useMemo(() => new Animated.Value(1), []);
  const slideAnim = useMemo(() => new Animated.Value(0), []);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    (async () => {
      // a) route.params (React Navigation)
      const rp = props?.route?.params ?? {};
      // b) props directos (si montas este componente con AppRegistry)
      const pp = props ?? {};
      // c) desde la última respuesta de notificación (si abriste por acción)
      const resp = await Notifications.getLastNotificationResponseAsync();
      const rd = resp?.notification?.request?.content?.data ?? {};

      const merged = {
        kind: rp.kind ?? pp.kind ?? rd.kind ?? rp.type ?? rd.type,
        refId: rp.refId ?? rp.id ?? pp.refId ?? rd.medicationId ?? rd.appointmentId ?? rd.refId,
        scheduledFor: rp.scheduledFor ?? pp.scheduledFor ?? rd.scheduledFor ?? new Date().toISOString(),
        name: rp.name ?? pp.name ?? rd.medicationName ?? rd.appointmentTitle ?? rd.name,
        dosage: rp.dosage ?? pp.dosage ?? rd.dosage,
        instructions: rp.instructions ?? pp.instructions ?? rd.instructions,
        time: rp.time ?? pp.time ?? rd.time,
        autoAction: rp.autoAction ?? pp.autoAction ?? rd.autoAction,
        type: rp.type ?? rd.type,
      };

      if (!merged.kind || !merged.refId) {
        setError('Faltan datos mínimos de la alarma.');
      } else {
        setParams(merged);
      }
      setReady(true);
    })();
  }, []);

  // 3) Iniciar animaciones cuando la pantalla esté lista
  useEffect(() => {
    if (ready && params) {
      // Animación de entrada
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Animación de pulso continuo
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Limpiar animación al desmontar
      return () => {
        pulseAnimation.stop();
      };
    }
  }, [ready, params]);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  };

  // 2) Acciones
  const handleAction = async (action: 'TAKEN' | 'SNOOZE' | 'SKIPPED') => {
    if (!params?.kind || !params?.refId) {
      setError('No hay datos suficientes para registrar el evento.');
      return;
    }
    try {
      // detener efectos (vibración/sonido) usando el servicio unificado
      unifiedAlarmService.stopAlarm();

      if (action === 'SNOOZE') {
        // Programar alarma pospuesta usando el servicio unificado
        const snoozeDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
        await unifiedAlarmService.scheduleAlarm({
          id: `snooze_${params.refId}_${Date.now()}`,
          title: `⏰ ${params.name || 'Medicamento'} (pospuesto)`,
          body: `Te recordaremos en 10 minutos`,
          data: {
            type: 'MEDICATION',
            kind: 'MED',
            medicationId: params.refId,
            medicationName: params.name,
            dosage: params.dosage,
            scheduledFor: snoozeDate.toISOString(),
            patientProfileId: profile?.patientProfileId || profile?.id,
            isSnooze: true
          },
          triggerDate: snoozeDate
        });
        showToast('Alarma pospuesta 10 min');
      } else {
        // registra evento en tu store/backend
        await registerEvent({
          kind: params.kind,
          refId: params.refId,
          action: action,
          scheduledFor: params.scheduledFor,
        });
        
        // Mensajes específicos según el tipo de alarma y acción
        const isMedication = params?.kind === 'MED' || params?.type === 'MEDICATION';
        const isAppointment = params?.kind === 'APPOINTMENT' || params?.type === 'APPOINTMENT';
        const isTreatment = params?.kind === 'TREATMENT' || params?.type === 'TREATMENT';
        
        let message = '';
        if (action === 'TAKEN') {
          if (isMedication) message = 'Medicamento marcado como tomado';
          else if (isAppointment) message = 'Asistencia a cita confirmada';
          else if (isTreatment) message = 'Tratamiento marcado como realizado';
          else message = 'Alarma confirmada';
        } else if (action === 'SKIPPED') {
          if (isMedication) message = 'Dosis omitida';
          else if (isAppointment) message = 'Cita cancelada';
          else if (isTreatment) message = 'Tratamiento omitido';
          else message = 'Alarma omitida';
        }
        
        showToast(message);
      }

      // cierra pantalla
      // Detener alarma antes de cerrar
      unifiedAlarmService.stopAlarm();
      
      if (props?.navigation?.goBack) {
        props.navigation.goBack();
      } else if (props?.navigation?.replace) {
        props.navigation.replace('Home');
      }
    } catch (e) {
      console.error('[AlarmScreen] handleAction error', e);
      setError('No se pudo procesar la acción.');
    }
  };

  // 3) Auto-acción si venía desde el botón de la notificación
  useEffect(() => {
    if (ready && params?.autoAction) {
      // Ejecuta sin UI si quieres, o solo preselecciona
      const map: any = { TAKEN: 'TAKEN', SNOOZE: 'SNOOZE', SKIPPED: 'SKIPPED' };
      const act = map[params.autoAction];
      if (act) handleAction(act);
    }
  }, [ready, params?.autoAction]);

  // Limpiar efectos cuando el componente se desmonte
  useEffect(() => {
    return () => {
      unifiedAlarmService.stopAlarm();
    };
  }, []);

  if (!ready) return null;

  // Función para obtener el emoji según el tipo de alarma
  const getAlarmEmoji = () => {
    if (params?.kind === 'MED' || params?.type === 'MEDICATION') return '💊';
    if (params?.kind === 'APPOINTMENT' || params?.type === 'APPOINTMENT') return '📅';
    if (params?.kind === 'TREATMENT' || params?.type === 'TREATMENT') return '🏥';
    return '⏰';
  };

  // Función para obtener el color de la alarma
  const getAlarmColor = () => {
    if (params?.kind === 'MED' || params?.type === 'MEDICATION') return COLORS.medical.medication;
    if (params?.kind === 'APPOINTMENT' || params?.type === 'APPOINTMENT') return COLORS.medical.appointment;
    if (params?.kind === 'TREATMENT' || params?.type === 'TREATMENT') return COLORS.medical.treatment;
    return COLORS.primary;
  };

  // Función para obtener los botones específicos según el tipo de alarma
  const getAlarmButtons = () => {
    const isMedication = params?.kind === 'MED' || params?.type === 'MEDICATION';
    const isAppointment = params?.kind === 'APPOINTMENT' || params?.type === 'APPOINTMENT';
    const isTreatment = params?.kind === 'TREATMENT' || params?.type === 'TREATMENT';

    if (isMedication) {
      return [
        {
          action: 'TAKEN',
          label: 'Tomado',
          icon: '✅',
          colors: [COLORS.success, '#0d9488'],
          description: 'Marcar medicamento como tomado'
        },
        {
          action: 'SNOOZE',
          label: 'Posponer',
          icon: '⏰',
          colors: [COLORS.warning, '#d97706'],
          description: 'Recordar en 10 minutos'
        },
        {
          action: 'SKIPPED',
          label: 'Omitir',
          icon: '❌',
          colors: [COLORS.error, '#dc2626'],
          description: 'Omitir esta dosis'
        }
      ];
    }

    if (isAppointment) {
      return [
        {
          action: 'TAKEN',
          label: 'Asistiré',
          icon: '✅',
          colors: [COLORS.success, '#0d9488'],
          description: 'Confirmar asistencia a la cita'
        },
        {
          action: 'SNOOZE',
          label: 'Recordar',
          icon: '⏰',
          colors: [COLORS.warning, '#d97706'],
          description: 'Recordar en 10 minutos'
        },
        {
          action: 'SKIPPED',
          label: 'Cancelar',
          icon: '❌',
          colors: [COLORS.error, '#dc2626'],
          description: 'Cancelar la cita'
        }
      ];
    }

    if (isTreatment) {
      return [
        {
          action: 'TAKEN',
          label: 'Realizado',
          icon: '✅',
          colors: [COLORS.success, '#0d9488'],
          description: 'Marcar tratamiento como realizado'
        },
        {
          action: 'SNOOZE',
          label: 'Posponer',
          icon: '⏰',
          colors: [COLORS.warning, '#d97706'],
          description: 'Recordar en 10 minutos'
        },
        {
          action: 'SKIPPED',
          label: 'Omitir',
          icon: '❌',
          colors: [COLORS.error, '#dc2626'],
          description: 'Omitir este tratamiento'
        }
      ];
    }

    // Botones por defecto para alarmas generales
    return [
      {
        action: 'TAKEN',
        label: 'Confirmar',
        icon: '✅',
        colors: [COLORS.success, '#0d9488'],
        description: 'Confirmar la alarma'
      },
      {
        action: 'SNOOZE',
        label: 'Posponer',
        icon: '⏰',
        colors: [COLORS.warning, '#d97706'],
        description: 'Recordar en 10 minutos'
      },
      {
        action: 'SKIPPED',
        label: 'Omitir',
        icon: '❌',
        colors: [COLORS.error, '#dc2626'],
        description: 'Omitir esta alarma'
      }
    ];
  };

  // Función para obtener el título específico según el tipo
  const getAlarmTitle = () => {
    const isMedication = params?.kind === 'MED' || params?.type === 'MEDICATION';
    const isAppointment = params?.kind === 'APPOINTMENT' || params?.type === 'APPOINTMENT';
    const isTreatment = params?.kind === 'TREATMENT' || params?.type === 'TREATMENT';

    if (isMedication) return '💊 Recordatorio de Medicamento';
    if (isAppointment) return '📅 Recordatorio de Cita';
    if (isTreatment) return '🏥 Recordatorio de Tratamiento';
    return '⏰ Alarma';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Fondo con gradiente */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.background}
      >
        {/* Contenido principal */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Icono de alarma con animación de pulso */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={[styles.iconBackground, { backgroundColor: getAlarmColor() }]}>
              <Text style={styles.iconText}>{getAlarmEmoji()}</Text>
            </View>
          </Animated.View>

          {/* Título de la alarma */}
          <Text style={styles.title}>{getAlarmTitle()}</Text>
          <Text style={styles.subtitle}>{params?.name || 'Alarma'}</Text>
          
          {/* Información adicional */}
          {!!params?.dosage && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Dosis:</Text>
              <Text style={styles.infoValue}>{params.dosage}</Text>
            </View>
          )}
          
          {!!params?.instructions && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Instrucciones:</Text>
              <Text style={styles.infoValue}>{params.instructions}</Text>
            </View>
          )}

          {/* Hora programada */}
          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>Hora programada:</Text>
            <Text style={styles.timeValue}>
              {new Date(params?.scheduledFor).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Mensaje de error */}
          {!!error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Botones de acción dinámicos */}
          <View style={styles.buttonsContainer}>
            {getAlarmButtons().map((button, index) => (
              <TouchableOpacity 
                key={button.action}
                style={[styles.actionButton]} 
                onPress={() => handleAction(button.action as 'TAKEN' | 'SNOOZE' | 'SKIPPED')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={button.colors as [string, string]}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonIcon}>{button.icon}</Text>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonText}>{button.label}</Text>
                    <Text style={styles.buttonDescription}>{button.description}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  
  // Icono de alarma
  iconContainer: {
    marginBottom: 32,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconText: {
    fontSize: 48,
  },
  
  // Título
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.inverse,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: COLORS.shadow.dark,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text.inverse,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
    textShadowColor: COLORS.shadow.dark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Tarjetas de información
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.inverse,
    opacity: 0.9,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.inverse,
  },
  
  // Tarjeta de tiempo
  timeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.inverse,
    opacity: 0.9,
    marginBottom: 8,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.inverse,
  },
  
  // Mensaje de error
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 320,
  },
  errorText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Contenedor de botones
  buttonsContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  
  // Botones de acción
  actionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  buttonText: {
    color: COLORS.text.inverse,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  buttonDescription: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  
  // Estilos específicos de botones
  takenButton: {
    // Estilo específico para botón "Tomada"
  },
  snoozeButton: {
    // Estilo específico para botón "Posponer"
  },
  skipButton: {
    // Estilo específico para botón "Omitir"
  },
});