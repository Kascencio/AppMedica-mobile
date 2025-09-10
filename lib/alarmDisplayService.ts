import * as Notifications from 'expo-notifications';
import { Platform, Vibration, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { backgroundNotificationHandler } from './backgroundNotificationHandler';

/**
 * Servicio especializado para manejar la visualización de alarmas en pantalla
 * Este servicio se encarga de asegurar que las alarmas aparezcan correctamente
 * cuando es la hora asignada
 */
export class AlarmDisplayService {
  private static instance: AlarmDisplayService;
  private navigationRef: any = null;
  private isAlarmActive = false;
  private currentAlarmSound: Audio.Sound | null = null;
  private vibrationInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): AlarmDisplayService {
    if (!AlarmDisplayService.instance) {
      AlarmDisplayService.instance = new AlarmDisplayService();
    }
    return AlarmDisplayService.instance;
  }

  /**
   * Configurar la referencia de navegación
   */
  public setNavigationRef(ref: any) {
    this.navigationRef = ref;
    backgroundNotificationHandler.setNavigationRef(ref);
  }

  /**
   * Manejar alarma recibida
   */
  public async handleAlarmReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    console.log('[AlarmDisplayService] Alarma recibida:', data);

    if (this.isAlarmNotification(data)) {
      console.log('[AlarmDisplayService] Procesando alarma...');
      
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
   * Verificar si es una notificación de alarma
   */
  private isAlarmNotification(data: any): boolean {
    return data && (
      data.type === 'MEDICATION' ||
      data.kind === 'MED' ||
      data.type === 'APPOINTMENT' ||
      data.kind === 'APPOINTMENT' ||
      data.test === true // Para pruebas
    );
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
      console.log('[AlarmDisplayService] Audio configurado para modo silencioso');
    } catch (error) {
      console.error('[AlarmDisplayService] Error configurando audio:', error);
    }
  }

  /**
   * Iniciar vibración continua
   */
  private startContinuousVibration() {
    // Vibración inicial más intensa
    Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
    
    // Configurar vibración continua cada 3 segundos
    this.vibrationInterval = setInterval(() => {
      if (this.isAlarmActive) {
        Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
      }
    }, 3000);
  }

  /**
   * Navegar a AlarmScreen
   */
  private async navigateToAlarmScreen(data: any) {
    try {
      console.log('[AlarmDisplayService] Navegando a AlarmScreen...');
      
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
        console.log('[AlarmDisplayService] Navegación completada');
      } else {
        console.log('[AlarmDisplayService] Navegación no disponible, reintentando...');
        // Reintentar después de un delay
        setTimeout(() => {
          if (this.navigationRef && this.navigationRef.isReady()) {
            this.navigateToAlarmScreen(data);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('[AlarmDisplayService] Error navegando a AlarmScreen:', error);
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
      console.error('[AlarmDisplayService] Error mostrando alerta del sistema:', error);
    }
  }

  /**
   * Detener la alarma
   */
  public stopAlarm() {
    console.log('[AlarmDisplayService] Deteniendo alarma...');
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
    console.log('[AlarmDisplayService] Configurando listeners de notificaciones...');
    
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
        console.log('[AlarmDisplayService] Usuario tocó la notificación:', data);
        
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
    console.log('[AlarmDisplayService] Limpiando listeners...');
    
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
export const alarmDisplayService = AlarmDisplayService.getInstance();
