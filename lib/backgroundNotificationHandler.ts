import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Manejador especializado para notificaciones en segundo plano
 * Este archivo se encarga de manejar la apertura automática de la app
 * cuando llegan notificaciones de alarmas
 */

export class BackgroundNotificationHandler {
  private static instance: BackgroundNotificationHandler;
  private navigationRef: any = null;

  private constructor() {}

  public static getInstance(): BackgroundNotificationHandler {
    if (!BackgroundNotificationHandler.instance) {
      BackgroundNotificationHandler.instance = new BackgroundNotificationHandler();
    }
    return BackgroundNotificationHandler.instance;
  }

  /**
   * Configurar la referencia de navegación
   */
  public setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  /**
   * Manejar notificación recibida en segundo plano
   */
  public async handleBackgroundNotification(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    console.log('[BackgroundNotificationHandler] Notificación recibida en segundo plano:', data);

    // Verificar si es una notificación de alarma
    if (this.isAlarmNotification(data)) {
      console.log('[BackgroundNotificationHandler] Es una alarma, preparando apertura automática...');
      
      // Configurar audio para modo silencioso
      await this.configureAudioForAlarm();
      
      // Forzar apertura de la app
      await this.forceAppOpen();
      
      // Navegar a AlarmScreen si la navegación está disponible
      if (this.navigationRef && this.navigationRef.isReady()) {
        this.navigateToAlarmScreen(data);
      } else {
        console.log('[BackgroundNotificationHandler] Navegación no disponible, esperando...');
        // Reintentar después de un delay
        setTimeout(() => {
          if (this.navigationRef && this.navigationRef.isReady()) {
            this.navigateToAlarmScreen(data);
          }
        }, 1000);
      }
    }
  }

  /**
   * Verificar si es una notificación de alarma
   */
  private isAlarmNotification(data: any): boolean {
    return data && (
      data.type === 'MEDICATION' || 
      data.type === 'APPOINTMENT' || 
      data.kind === 'MED' || 
      data.kind === 'APPOINTMENT'
    );
  }

  /**
   * Forzar apertura de la app
   */
  private async forceAppOpen() {
    try {
      console.log('[BackgroundNotificationHandler] Forzando apertura de la app...');
      
      // En Android, las notificaciones de alta prioridad con fullScreenIntent
      // deberían abrir la app automáticamente
      // En iOS, las notificaciones con shouldShowAlert: true también deberían abrir la app
      
      // Log para verificar que se está ejecutando
      console.log('[BackgroundNotificationHandler] App debería abrirse automáticamente');
      
    } catch (error) {
      console.error('[BackgroundNotificationHandler] Error forzando apertura:', error);
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
      console.log('[BackgroundNotificationHandler] Audio configurado para modo silencioso');
    } catch (error) {
      console.error('[BackgroundNotificationHandler] Error configurando audio:', error);
    }
  }

  /**
   * Navegar a la pantalla de alarma
   */
  private navigateToAlarmScreen(data: any) {
    try {
      console.log('[BackgroundNotificationHandler] Navegando a AlarmScreen...');
      
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
      
      console.log('[BackgroundNotificationHandler] Navegación completada');
    } catch (error) {
      console.error('[BackgroundNotificationHandler] Error navegando a AlarmScreen:', error);
    }
  }

  /**
   * Configurar listeners para notificaciones
   */
  public setupNotificationListeners() {
    // Listener para notificaciones recibidas
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleBackgroundNotification(notification);
      }
    );

    // Listener para respuestas a notificaciones (cuando el usuario toca la notificación)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('[BackgroundNotificationHandler] Usuario tocó la notificación:', data);
        
        if (this.isAlarmNotification(data)) {
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
    if (listeners.notificationListener) {
      listeners.notificationListener.remove();
    }
    if (listeners.responseListener) {
      listeners.responseListener.remove();
    }
  }
}

// Exportar instancia singleton
export const backgroundNotificationHandler = BackgroundNotificationHandler.getInstance();
