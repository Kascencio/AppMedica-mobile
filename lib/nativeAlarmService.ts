import { Platform, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

/**
 * Servicio nativo para manejar alarmas que abran la app automáticamente
 * Este servicio usa diferentes estrategias según la plataforma
 */
export class NativeAlarmService {
  private static instance: NativeAlarmService;
  private navigationRef: any = null;
  private isAlarmActive = false;
  private currentAlarmSound: Audio.Sound | null = null;
  private vibrationInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): NativeAlarmService {
    if (!NativeAlarmService.instance) {
      NativeAlarmService.instance = new NativeAlarmService();
    }
    return NativeAlarmService.instance;
  }

  /**
   * Configurar la referencia de navegación
   */
  public setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  /**
   * Programar alarma que abra la app automáticamente
   */
  public async scheduleAlarmWithAutoOpen({
    id,
    title,
    body,
    data,
    triggerDate,
    channelId = 'medications'
  }: {
    id: string;
    title: string;
    body: string;
    data: any;
    triggerDate: Date;
    channelId?: string;
  }) {
    try {
      console.log('[NativeAlarmService] Programando alarma con apertura automática...');
      
      if (Platform.OS === 'android') {
        await this.scheduleAndroidAlarm({ id, title, body, data, triggerDate, channelId });
      } else {
        await this.scheduleIOSAlarm({ id, title, body, data, triggerDate, channelId });
      }
      
      console.log('[NativeAlarmService] Alarma programada exitosamente');
    } catch (error) {
      console.error('[NativeAlarmService] Error programando alarma:', error);
      throw error;
    }
  }

  /**
   * Programar alarma para Android usando estrategias nativas
   */
  private async scheduleAndroidAlarm({
    id,
    title,
    body,
    data,
    triggerDate,
    channelId
  }: {
    id: string;
    title: string;
    body: string;
    data: any;
    triggerDate: Date;
    channelId: string;
  }) {
    try {
      // Estrategia 1: Usar CustomAlarm si está disponible
      const { CustomAlarm } = require('react-native').NativeModules;
      if (CustomAlarm) {
        console.log('[NativeAlarmService] Usando CustomAlarm nativo...');
        await CustomAlarm.schedule({
          title,
          body,
          kind: data.kind || 'MEDICATION',
          refId: data.refId || id,
          name: data.name || title,
          dosage: data.dosage || '',
          instructions: data.instructions || '',
          scheduledFor: triggerDate.toISOString(),
          timestamp: triggerDate.getTime(),
        });
        return;
      }

      // Estrategia 2: Usar notificación con configuración especial
      console.log('[NativeAlarmService] Usando notificación con configuración especial...');
      
      // Crear canal de notificación con máxima prioridad
      await this.createHighPriorityChannel(channelId);
      
      // Programar notificación con configuración especial
      await Notifications.scheduleNotificationAsync({
        identifier: `native_alarm_${id}`,
        content: {
          title,
          body,
          data: {
            ...data,
            isNativeAlarm: true,
            autoOpen: true,
          },
          sound: 'alarm.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 250, 500, 250, 500, 250, 500],
          categoryIdentifier: channelId,
          // Configuración especial para Android
          ...(Platform.OS === 'android' && {
            fullScreenIntent: true,
            headsUp: true,
            ongoing: false,
            autoCancel: false,
            visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            showTimestamp: true,
            localOnly: false,
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      // Estrategia 3: Programar múltiples notificaciones como respaldo
      await this.scheduleBackupNotifications(id, title, body, data, triggerDate, channelId);
      
    } catch (error) {
      console.error('[NativeAlarmService] Error programando alarma Android:', error);
      throw error;
    }
  }

  /**
   * Programar alarma para iOS
   */
  private async scheduleIOSAlarm({
    id,
    title,
    body,
    data,
    triggerDate,
    channelId
  }: {
    id: string;
    title: string;
    body: string;
    data: any;
    triggerDate: Date;
    channelId: string;
  }) {
    try {
      console.log('[NativeAlarmService] Programando alarma iOS...');
      
      await Notifications.scheduleNotificationAsync({
        identifier: `native_alarm_${id}`,
        content: {
          title,
          body,
          data: {
            ...data,
            isNativeAlarm: true,
            autoOpen: true,
          },
          sound: 'alarm.mp3',
          categoryIdentifier: channelId,
          // Configuración especial para iOS
          badge: 1,
          launchImageName: 'SplashScreen',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      
    } catch (error) {
      console.error('[NativeAlarmService] Error programando alarma iOS:', error);
      throw error;
    }
  }

  /**
   * Crear canal de notificación de alta prioridad
   */
  private async createHighPriorityChannel(channelId: string) {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(channelId, {
          name: channelId === 'medications' ? 'Medicamentos' : 'Citas',
          description: 'Alarmas de alta prioridad',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 500],
          lightColor: '#FF0000',
          sound: 'alarm.mp3',
          enableVibrate: true,
          enableLights: true,
          bypassDnd: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }
    } catch (error) {
      console.error('[NativeAlarmService] Error creando canal de alta prioridad:', error);
    }
  }

  /**
   * Programar notificaciones de respaldo
   */
  private async scheduleBackupNotifications(
    id: string,
    title: string,
    body: string,
    data: any,
    triggerDate: Date,
    channelId: string
  ) {
    try {
      // Notificación de respaldo 1: 1 segundo después
      const backup1Date = new Date(triggerDate.getTime() + 1000);
      await Notifications.scheduleNotificationAsync({
        identifier: `backup1_${id}`,
        content: {
          title: `🔔 ${title}`,
          body: body,
          data: { ...data, isBackup: true },
          sound: 'alarm.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: backup1Date,
        },
      });

      // Notificación de respaldo 2: 5 segundos después
      const backup2Date = new Date(triggerDate.getTime() + 5000);
      await Notifications.scheduleNotificationAsync({
        identifier: `backup2_${id}`,
        content: {
          title: `🚨 ${title}`,
          body: `¡ALARMA! ${body}`,
          data: { ...data, isBackup: true },
          sound: 'alarm.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: backup2Date,
        },
      });

      console.log('[NativeAlarmService] Notificaciones de respaldo programadas');
    } catch (error) {
      console.error('[NativeAlarmService] Error programando notificaciones de respaldo:', error);
    }
  }

  /**
   * Manejar alarma recibida
   */
  public async handleAlarmReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    console.log('[NativeAlarmService] Alarma recibida:', data);

    if (data?.isNativeAlarm || data?.autoOpen) {
      console.log('[NativeAlarmService] Procesando alarma nativa...');
      
      // Marcar que hay una alarma activa
      this.isAlarmActive = true;
      
      // Configurar audio para modo silencioso
      await this.configureAudioForAlarm();
      
      // Iniciar vibración continua
      this.startContinuousVibration();
      
      // Navegar a AlarmScreen
      await this.navigateToAlarmScreen(data);
      
      // Mostrar alerta del sistema como respaldo
      this.showSystemAlert(data);
    }
  }

  /**
   * Configurar audio para que se reproduzca en modo silencioso
   */
  private async configureAudioForAlarm() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log('[NativeAlarmService] Audio configurado para modo silencioso');
    } catch (error) {
      console.error('[NativeAlarmService] Error configurando audio:', error);
    }
  }

  /**
   * Iniciar vibración continua
   */
  private startContinuousVibration() {
    // Vibración inicial más intensa
    const { Vibration } = require('react-native');
    Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
    
    // Configurar vibración continua cada 2 segundos
    this.vibrationInterval = setInterval(() => {
      if (this.isAlarmActive) {
        Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
      }
    }, 2000);
  }

  /**
   * Navegar a AlarmScreen
   */
  private async navigateToAlarmScreen(data: any) {
    try {
      console.log('[NativeAlarmService] Navegando a AlarmScreen...');
      
      if (this.navigationRef && this.navigationRef.isReady()) {
        this.navigationRef.navigate('AlarmScreen', {
          kind: data.kind || (data.type === 'MEDICATION' ? 'MED' : 'APPOINTMENT'),
          refId: data.medicationId || data.appointmentId || data.refId,
          scheduledFor: data.scheduledFor,
          name: data.medicationName || data.doctorName || data.name,
          dosage: data.dosage || '',
          instructions: data.instructions || data.notes || '',
          time: data.time,
          location: data.location || ''
        });
        console.log('[NativeAlarmService] Navegación completada');
      } else {
        console.log('[NativeAlarmService] Navegación no disponible, reintentando...');
        // Reintentar después de un delay
        setTimeout(() => {
          if (this.navigationRef && this.navigationRef.isReady()) {
            this.navigateToAlarmScreen(data);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('[NativeAlarmService] Error navegando a AlarmScreen:', error);
    }
  }

  /**
   * Mostrar alerta del sistema como respaldo
   */
  private showSystemAlert(data: any) {
    try {
      const title = data.type === 'MEDICATION' ? '💊 Hora de medicamento' : '📅 Hora de cita';
      const message = data.type === 'MEDICATION' 
        ? `Es hora de tomar ${data.medicationName || 'tu medicamento'}`
        : `Es hora de tu cita: ${data.title || 'Cita médica'}`;
      
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Ver detalles',
            onPress: () => {
              if (this.navigationRef && this.navigationRef.isReady()) {
                this.navigateToAlarmScreen(data);
              }
            }
          },
          {
            text: 'Cerrar',
            onPress: () => {
              this.stopAlarm();
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('[NativeAlarmService] Error mostrando alerta del sistema:', error);
    }
  }

  /**
   * Detener la alarma
   */
  public stopAlarm() {
    console.log('[NativeAlarmService] Deteniendo alarma...');
    this.isAlarmActive = false;
    
    // Detener vibración
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    
    // Detener sonido
    if (this.currentAlarmSound) {
      this.currentAlarmSound.unloadAsync();
      this.currentAlarmSound = null;
    }
  }

  /**
   * Configurar listeners para notificaciones
   */
  public setupNotificationListeners() {
    console.log('[NativeAlarmService] Configurando listeners de notificaciones...');
    
    // Listener para notificaciones recibidas
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleAlarmReceived(notification);
      }
    );

    // Listener para respuestas a notificaciones (cuando el usuario toca la notificación)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('[NativeAlarmService] Usuario tocó la notificación:', data);
        
        if (data?.isNativeAlarm || data?.autoOpen) {
          this.navigateToAlarmScreen(data);
        }
      }
    );

    return {
      notificationListener,
      responseListener
    };
  }

  /**
   * Limpiar listeners
   */
  public cleanup(listeners: { notificationListener: any; responseListener: any }) {
    console.log('[NativeAlarmService] Limpiando listeners...');
    
    if (listeners.notificationListener) {
      listeners.notificationListener.remove();
    }
    if (listeners.responseListener) {
      listeners.responseListener.remove();
    }
    
    // Detener alarma si está activa
    this.stopAlarm();
  }

  /**
   * Verificar si hay una alarma activa
   */
  public isAlarmCurrentlyActive(): boolean {
    return this.isAlarmActive;
  }
}

// Exportar instancia singleton
export const nativeAlarmService = NativeAlarmService.getInstance();
