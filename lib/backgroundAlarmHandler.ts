import * as Notifications from 'expo-notifications';
import { Platform, Alert, Vibration } from 'react-native';
import * as Audio from 'expo-av';

/**
 * Servicio para manejar alarmas cuando la app está cerrada o en segundo plano
 */
export class BackgroundAlarmHandler {
  private static instance: BackgroundAlarmHandler;
  private navigationRef: any = null;
  private isAlarmActive: boolean = false;

  public static getInstance(): BackgroundAlarmHandler {
    if (!BackgroundAlarmHandler.instance) {
      BackgroundAlarmHandler.instance = new BackgroundAlarmHandler();
    }
    return BackgroundAlarmHandler.instance;
  }

  /**
   * Configurar la referencia de navegación
   */
  public setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  /**
   * Configurar listeners para notificaciones en segundo plano
   */
  public setupNotificationListeners() {
    console.log('[BackgroundAlarmHandler] Configurando listeners para app cerrada...');

    // Listener para cuando se recibe una notificación
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[BackgroundAlarmHandler] Notificación recibida:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener para cuando se responde a una notificación (toque)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[BackgroundAlarmHandler] Respuesta a notificación:', response);
      this.handleNotificationResponse(response);
    });

    return {
      notificationListener,
      responseListener,
    };
  }

  /**
   * Manejar notificación recibida
   */
  private async handleNotificationReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    
    if (this.isAlarmNotification(data)) {
      console.log('[BackgroundAlarmHandler] Alarma detectada, configurando audio...');
      
      // Configurar audio para modo silencioso
      await this.configureAudioForAlarm();
      
      // Iniciar vibración continua
      this.startContinuousVibration();
      
      // Marcar alarma como activa
      this.isAlarmActive = true;
    }
  }

  /**
   * Manejar respuesta a notificación (cuando el usuario toca la notificación)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    
    if (this.isAlarmNotification(data)) {
      console.log('[BackgroundAlarmHandler] Alarma tocada, navegando a AlarmScreen...');
      
      // Esperar un poco para que la app se abra completamente
      setTimeout(() => {
        this.navigateToAlarmScreen(data);
      }, 1000);
    }
  }

  /**
   * Verificar si es una notificación de alarma
   */
  private isAlarmNotification(data: any): boolean {
    return data?.type === 'MEDICATION' || 
           data?.kind === 'MED' ||
           data?.type === 'APPOINTMENT' || 
           data?.kind === 'APPOINTMENT' ||
           data?.isAlarm === true;
  }

  /**
   * Navegar a la pantalla de alarma
   */
  private navigateToAlarmScreen(data: any) {
    if (this.navigationRef && this.navigationRef.isReady()) {
      console.log('[BackgroundAlarmHandler] Navegando a AlarmScreen...');
      
      this.navigationRef.navigate('AlarmScreen', {
        kind: data.kind || data.type,
        refId: data.medicationId || data.appointmentId,
        scheduledFor: data.scheduledFor,
        medicationName: data.medicationName,
        dosage: data.dosage,
        instructions: data.instructions,
        time: data.time,
        location: data.location,
      });
    } else {
      console.log('[BackgroundAlarmHandler] Navegación no disponible, reintentando...');
      // Reintentar después de un delay
      setTimeout(() => {
        this.navigateToAlarmScreen(data);
      }, 2000);
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
      console.log('[BackgroundAlarmHandler] Audio configurado para modo silencioso');
    } catch (error) {
      console.error('[BackgroundAlarmHandler] Error configurando audio:', error);
    }
  }

  /**
   * Iniciar vibración continua
   */
  private startContinuousVibration() {
    // Vibración inicial más intensa
    Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
    
    // Configurar vibración continua cada 3 segundos
    const vibrationInterval = setInterval(() => {
      if (this.isAlarmActive) {
        Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
      } else {
        clearInterval(vibrationInterval);
      }
    }, 3000);
  }

  /**
   * Detener alarma
   */
  public stopAlarm() {
    this.isAlarmActive = false;
    console.log('[BackgroundAlarmHandler] Alarma detenida');
  }

  /**
   * Limpiar listeners
   */
  public cleanup(listeners: any) {
    if (listeners?.notificationListener) {
      Notifications.removeNotificationSubscription(listeners.notificationListener);
    }
    if (listeners?.responseListener) {
      Notifications.removeNotificationSubscription(listeners.responseListener);
    }
    console.log('[BackgroundAlarmHandler] Listeners limpiados');
  }
}

export const backgroundAlarmHandler = BackgroundAlarmHandler.getInstance();
