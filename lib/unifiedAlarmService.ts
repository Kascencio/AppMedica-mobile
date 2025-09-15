// lib/unifiedAlarmService.ts
import * as Notifications from 'expo-notifications';
import { Platform, AppState, Alert } from 'react-native';
import { AlarmAudioManager } from './alarmAudioManager';
import { alarmErrorHandler, AlarmErrorCodes, handleAlarmError } from './alarmErrorHandler';

/**
 * Servicio unificado para manejar todas las alarmas y notificaciones
 * Combina programación, reproducción de audio, navegación y apertura automática
 */
export class UnifiedAlarmService {
  private static instance: UnifiedAlarmService;
  private navigationRef: any = null;
  private audioManager: AlarmAudioManager;
  private isAlarmActive = false;
  private appState: string = 'active';
  private notificationListeners: any[] = [];

  private constructor() {
    this.audioManager = new AlarmAudioManager();
    this.setupAppStateListener();
  }

  public static getInstance(): UnifiedAlarmService {
    if (!UnifiedAlarmService.instance) {
      UnifiedAlarmService.instance = new UnifiedAlarmService();
    }
    return UnifiedAlarmService.instance;
  }

  /**
   * Configurar referencia de navegación
   */
  public setNavigationRef(ref: any): void {
    this.navigationRef = ref;
    console.log('[UnifiedAlarmService] Navegación configurada');
  }

  /**
   * Inicializar el sistema de alarmas
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log('[UnifiedAlarmService] Inicializando sistema unificado...');
      
      // Configurar handler global de notificaciones
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const data = notification.request.content.data;
          console.log('[UnifiedAlarmService] Notificación recibida:', notification.request.content.title);
          
          // Si es una alarma, manejarla inmediatamente
          if (this.isAlarmNotification(data)) {
            await this.handleAlarmReceived(notification);
          }
          
          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          };
        },
      });

      // Configurar categorías de notificación
      await this.setupNotificationCategories();
      
      // Configurar canales Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Configurar listeners
      this.setupNotificationListeners();

      console.log('[UnifiedAlarmService] ✅ Sistema inicializado correctamente');
      return true;
    } catch (error) {
      handleAlarmError(error, 'initialize');
      return false;
    }
  }

  /**
   * Programar alarma con apertura automática optimizada
   */
  public async scheduleAlarm({
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
  }): Promise<string | null> {
    try {
      console.log('[UnifiedAlarmService] Programando alarma:', title);
      
      // Determinar configuración basada en tipo de alarma
      const isAlarm = this.isAlarmNotification(data);
      const categoryId = this.getCategoryForData(data);
      
      // Configuración optimizada para apertura automática
      const notificationContent: Notifications.NotificationContentInput = {
        title,
        body,
        data: {
          ...data,
          isAlarm: true,
          autoOpen: true,
        },
        sound: 'alarm.mp3',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500, 250, 500, 250, 500],
        categoryIdentifier: categoryId,
        ...(Platform.OS === 'android' && {
          fullScreenIntent: true as any,
          channelId,
          autoCancel: false,
          ongoing: true,
          showTimestamp: true,
          launchActivityFlags: 0x10000000, // FLAG_ACTIVITY_NEW_TASK
          bypassDnd: true,
          visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        }),
        ...(Platform.OS === 'ios' && {
          interruptionLevel: 'critical' as any,
          relevanceScore: 1.0,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      };

      // Programar la notificación
      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: notificationContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      console.log('[UnifiedAlarmService] ✅ Alarma programada:', notificationId);
      return notificationId;
    } catch (error) {
      handleAlarmError(error, 'scheduleAlarm');
      return null;
    }
  }

  /**
   * Manejar alarma recibida
   */
  private async handleAlarmReceived(notification: Notifications.Notification): Promise<void> {
    const data = notification.request.content.data;
    
    try {
      console.log('[UnifiedAlarmService] 🚨 Procesando alarma:', data.medicationName || data.appointmentTitle || data.name);
      
      // Marcar alarma como activa
      this.isAlarmActive = true;
      
      // Configurar y reproducir audio
      await this.audioManager.configureAudio();
      const audioStarted = await this.audioManager.playAlarmSound();
      
      if (audioStarted) {
        console.log('[UnifiedAlarmService] ✅ Audio de alarma iniciado');
      } else {
        console.log('[UnifiedAlarmService] ⚠️ Audio no disponible, continuando con vibración');
      }
      
      // Iniciar vibración
      this.audioManager.startAlarmVibration();
      
      // Navegar a AlarmScreen
      this.navigateToAlarmScreen(data);
      
      // Mostrar alerta del sistema como respaldo usando System Alert Window
      setTimeout(async () => {
        if (this.isAlarmActive && this.appState !== 'active') {
          try {
            const { systemAlertWindowService } = await import('./systemAlertWindowService');
            const success = await systemAlertWindowService.showAlarmAlert(data);
            
            if (!success) {
              // Fallback a alerta normal si System Alert Window no funciona
              this.showSystemAlert(data);
            }
          } catch (error) {
            console.error('[UnifiedAlarmService] Error usando System Alert Window:', error);
            this.showSystemAlert(data);
          }
        }
      }, 2000);
      
    } catch (error) {
      handleAlarmError(error, 'handleAlarmReceived');
    }
  }

  /**
   * Navegar a AlarmScreen
   */
  private navigateToAlarmScreen(data: any): void {
    try {
      if (!this.navigationRef || !this.navigationRef.isReady()) {
        console.log('[UnifiedAlarmService] Navegación no disponible, reintentando...');
        setTimeout(() => this.navigateToAlarmScreen(data), 1000);
        return;
      }

      console.log('[UnifiedAlarmService] Navegando a AlarmScreen...');
      
      this.navigationRef.navigate('AlarmScreen', {
        kind: data.kind || (data.type === 'MEDICATION' ? 'MED' : 'APPOINTMENT'),
        refId: data.medicationId || data.appointmentId || data.refId,
        scheduledFor: data.scheduledFor,
        name: data.medicationName || data.appointmentTitle || data.name,
        dosage: data.dosage || '',
        instructions: data.instructions || data.notes || '',
        time: data.time,
        location: data.location || ''
      });
      
      console.log('[UnifiedAlarmService] ✅ Navegación completada');
    } catch (error) {
      handleAlarmError(error, 'navigateToAlarmScreen');
    }
  }

  /**
   * Detener alarma activa
   */
  public stopAlarm(): void {
    try {
      console.log('[UnifiedAlarmService] Deteniendo alarma...');
      
      this.isAlarmActive = false;
      this.audioManager.stopAlarmSound();
      this.audioManager.stopVibration();
      
      console.log('[UnifiedAlarmService] ✅ Alarma detenida');
    } catch (error) {
      handleAlarmError(error, 'stopAlarm');
    }
  }

  /**
   * Cancelar alarma específica
   */
  public async cancelAlarm(notificationId: string): Promise<boolean> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('[UnifiedAlarmService] ✅ Alarma cancelada:', notificationId);
      return true;
    } catch (error) {
      handleAlarmError(error, 'cancelAlarm');
      return false;
    }
  }

  /**
   * Cancelar todas las alarmas
   */
  public async cancelAllAlarms(): Promise<boolean> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[UnifiedAlarmService] ✅ Todas las alarmas canceladas');
      return true;
    } catch (error) {
      handleAlarmError(error, 'cancelAllAlarms');
      return false;
    }
  }

  /**
   * Obtener alarmas programadas
   */
  public async getScheduledAlarms(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      handleAlarmError(error, 'getScheduledAlarms');
      return [];
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
      data.kind === 'APPOINTMENT' ||
      data.isAlarm === true ||
      data.test === true
    );
  }

  /**
   * Obtener categoría de notificación basada en datos
   */
  private getCategoryForData(data: any): string {
    if (data.type === 'MEDICATION' || data.kind === 'MED') {
      return 'MEDICATION_ALARM';
    } else if (data.type === 'APPOINTMENT' || data.kind === 'APPOINTMENT') {
      return 'APPOINTMENT_ALARM';
    }
    return 'GENERAL_ALARM';
  }

  /**
   * Configurar categorías de notificación
   */
  private async setupNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('MEDICATION_ALARM', [
        { identifier: 'TAKEN', buttonTitle: 'Tomada', options: { opensAppToForeground: true } },
        { identifier: 'SNOOZE_10', buttonTitle: 'Posponer 10 min', options: { opensAppToForeground: true } },
        { identifier: 'SKIP', buttonTitle: 'Omitir', options: { opensAppToForeground: true, isDestructive: true } },
        { identifier: 'OPEN_ALARM', buttonTitle: 'Abrir alarma', options: { opensAppToForeground: true } },
      ]);

      await Notifications.setNotificationCategoryAsync('APPOINTMENT_ALARM', [
        { identifier: 'OPEN_ALARM', buttonTitle: 'Ver cita', options: { opensAppToForeground: true } },
        { identifier: 'SNOOZE_10', buttonTitle: 'Posponer 10 min', options: { opensAppToForeground: true } },
      ]);

      await Notifications.setNotificationCategoryAsync('GENERAL_ALARM', [
        { identifier: 'OPEN_ALARM', buttonTitle: 'Abrir alarma', options: { opensAppToForeground: true } },
        { identifier: 'DISMISS', buttonTitle: 'Cerrar', options: { opensAppToForeground: true } },
      ]);

      console.log('[UnifiedAlarmService] ✅ Categorías de notificación configuradas');
    } catch (error) {
      handleAlarmError(error, 'setupNotificationCategories');
    }
  }

  /**
   * Configurar canales Android
   */
  private async setupAndroidChannels(): Promise<void> {
    try {
      await Notifications.setNotificationChannelAsync('medications', {
        name: 'Medicamentos',
        description: 'Recordatorios de medicamentos',
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

      await Notifications.setNotificationChannelAsync('appointments', {
        name: 'Citas',
        description: 'Recordatorios de citas médicas',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 500],
        lightColor: '#0000FF',
        sound: 'alarm.mp3',
        enableVibrate: true,
        enableLights: true,
        bypassDnd: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('alarms', {
        name: 'Alarmas',
        description: 'Alarmas generales',
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

      console.log('[UnifiedAlarmService] ✅ Canales Android configurados');
    } catch (error) {
      handleAlarmError(error, 'setupAndroidChannels');
    }
  }

  /**
   * Configurar listeners de notificaciones
   */
  private setupNotificationListeners(): void {
    // Listener para respuestas a notificaciones (botones)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('[UnifiedAlarmService] Respuesta a notificación:', response.actionIdentifier);
        
        if (this.isAlarmNotification(data)) {
          this.handleNotificationResponse(response);
        }
      }
    );

    this.notificationListeners.push(responseListener);
    console.log('[UnifiedAlarmService] ✅ Listeners configurados');
  }

  /**
   * Manejar respuesta a notificación
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { actionIdentifier } = response;
    const data = response.notification.request.content.data;

    switch (actionIdentifier) {
      case 'TAKEN':
        console.log('[UnifiedAlarmService] Medicamento marcado como tomado');
        this.stopAlarm();
        break;
      case 'SNOOZE_10':
        console.log('[UnifiedAlarmService] Alarma pospuesta 10 minutos');
        this.snoozeAlarm(data, 10);
        break;
      case 'SKIP':
        console.log('[UnifiedAlarmService] Alarma omitida');
        this.stopAlarm();
        break;
      case 'OPEN_ALARM':
        console.log('[UnifiedAlarmService] Abriendo alarma');
        this.navigateToAlarmScreen(data);
        break;
      case 'DISMISS':
        console.log('[UnifiedAlarmService] Alarma cerrada');
        this.stopAlarm();
        break;
      default:
        // Si el usuario tocó la notificación directamente
        this.navigateToAlarmScreen(data);
        break;
    }
  }

  /**
   * Posponer alarma
   */
  private async snoozeAlarm(data: any, minutes: number): Promise<void> {
    try {
      const snoozeDate = new Date();
      snoozeDate.setMinutes(snoozeDate.getMinutes() + minutes);
      
      const snoozeId = `snooze_${Date.now()}`;
      await this.scheduleAlarm({
        id: snoozeId,
        title: `🔔 Pospuesto: ${data.medicationName || data.appointmentTitle}`,
        body: `Alarma pospuesta ${minutes} minutos`,
        data: { ...data, isSnooze: true },
        triggerDate: snoozeDate,
      });
      
      this.stopAlarm();
      console.log('[UnifiedAlarmService] ✅ Alarma pospuesta');
    } catch (error) {
      handleAlarmError(error, 'snoozeAlarm');
    }
  }

  /**
   * Configurar listener de estado de la app
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState) => {
      this.appState = nextAppState;
      console.log('[UnifiedAlarmService] Estado de la app:', nextAppState);
    });
  }

  /**
   * Mostrar alerta del sistema como respaldo
   */
  private showSystemAlert(data: any): void {
    try {
      const title = data.type === 'MEDICATION' ? '💊 Hora de medicamento' : '📅 Hora de cita';
      const message = data.type === 'MEDICATION' 
        ? `Es hora de tomar ${data.medicationName || 'tu medicamento'}`
        : `Es hora de tu cita: ${data.appointmentTitle || 'Cita médica'}`;
      
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Ver detalles',
            onPress: () => this.navigateToAlarmScreen(data)
          },
          {
            text: 'Cerrar',
            onPress: () => this.stopAlarm()
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      handleAlarmError(error, 'showSystemAlert');
    }
  }

  /**
   * Limpiar listeners
   */
  public cleanup(): void {
    console.log('[UnifiedAlarmService] Limpiando listeners...');
    
    this.notificationListeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    
    this.notificationListeners = [];
    this.stopAlarm();
  }

  /**
   * Obtener estado del servicio
   */
  public getStatus(): {
    isInitialized: boolean;
    isAlarmActive: boolean;
    appState: string;
    listenersCount: number;
  } {
    return {
      isInitialized: this.notificationListeners.length > 0,
      isAlarmActive: this.isAlarmActive,
      appState: this.appState,
      listenersCount: this.notificationListeners.length,
    };
  }
}

// Exportar instancia singleton
export const unifiedAlarmService = UnifiedAlarmService.getInstance();
