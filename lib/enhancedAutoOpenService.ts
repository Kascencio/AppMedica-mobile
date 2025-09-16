import * as Notifications from 'expo-notifications';
import { Platform, AppState, Linking, Alert } from 'react-native';
import { AlarmAudioManager } from './alarmAudioManager';

/**
 * Servicio mejorado para manejar la apertura automática de la app
 * cuando llegan notificaciones de alarmas y la app está minimizada
 */
export class EnhancedAutoOpenService {
  private static instance: EnhancedAutoOpenService;
  private navigationRef: any = null;
  private isAppInForeground = false;
  private audioManager: AlarmAudioManager;
  private appStateSubscription: any = null;
  private notificationListeners: any[] = [];

  private constructor() {
    this.audioManager = AlarmAudioManager.getInstance();
    this.setupAppStateListener();
  }

  public static getInstance(): EnhancedAutoOpenService {
    if (!EnhancedAutoOpenService.instance) {
      EnhancedAutoOpenService.instance = new EnhancedAutoOpenService();
    }
    return EnhancedAutoOpenService.instance;
  }

  /**
   * Configurar la referencia de navegación
   */
  public setNavigationRef(ref: any) {
    this.navigationRef = ref;
    console.log('[EnhancedAutoOpenService] Referencia de navegación configurada');
  }

  /**
   * Configurar listener del estado de la app
   */
  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const wasInForeground = this.isAppInForeground;
      this.isAppInForeground = nextAppState === 'active';
      
      console.log('[EnhancedAutoOpenService] Estado de la app:', {
        anterior: wasInForeground ? 'Foreground' : 'Background',
        actual: this.isAppInForeground ? 'Foreground' : 'Background'
      });

      // Si la app acaba de volver al foreground, verificar si hay alarmas pendientes
      if (!wasInForeground && this.isAppInForeground) {
        this.checkForPendingAlarms();
      }
    });
  }

  /**
   * Inicializar el servicio
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log('[EnhancedAutoOpenService] Inicializando servicio de apertura automática...');
      
      // Configurar handler global de notificaciones con apertura automática
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const data = notification.request.content.data;
          console.log('[EnhancedAutoOpenService] Notificación recibida:', notification.request.content.title);
          
          // Si es una alarma, manejarla con apertura automática
          if (this.isAlarmNotification(data)) {
            await this.handleAlarmWithAutoOpen(notification);
          }
          
          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          };
        },
      });

      // Configurar listeners de notificaciones
      this.setupNotificationListeners();

      console.log('[EnhancedAutoOpenService] ✅ Servicio inicializado correctamente');
      return true;
    } catch (error) {
      console.error('[EnhancedAutoOpenService] ❌ Error inicializando servicio:', error);
      return false;
    }
  }

  /**
   * Configurar listeners de notificaciones
   */
  private setupNotificationListeners() {
    console.log('[EnhancedAutoOpenService] Configurando listeners de notificaciones...');
    
    // Listener para notificaciones recibidas (cuando la app está en foreground)
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[EnhancedAutoOpenService] Notificación recibida en foreground');
        this.handleNotificationReceived(notification);
      }
    );

    // Listener para respuestas a notificaciones (cuando el usuario toca la notificación)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[EnhancedAutoOpenService] Respuesta a notificación recibida');
        this.handleNotificationResponse(response);
      }
    );

    this.notificationListeners = [notificationListener, responseListener];
  }

  /**
   * Manejar notificación recibida
   */
  private async handleNotificationReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    
    if (this.isAlarmNotification(data)) {
      console.log('[EnhancedAutoOpenService] Alarma recibida en foreground, manejando...');
      await this.handleAlarmWithAutoOpen(notification);
    }
  }

  /**
   * Manejar respuesta a notificación (cuando el usuario toca la notificación)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    
    if (this.isAlarmNotification(data)) {
      console.log('[EnhancedAutoOpenService] Usuario tocó notificación de alarma, abriendo app...');
      
      // Si la app no está en foreground, intentar abrirla
      if (!this.isAppInForeground) {
        await this.forceOpenApp();
      }
      
      // Navegar a AlarmScreen
      setTimeout(() => {
        this.navigateToAlarmScreen(data);
      }, 1000);
    }
  }

  /**
   * Manejar alarma con apertura automática
   */
  private async handleAlarmWithAutoOpen(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    
    try {
      console.log('[EnhancedAutoOpenService] 🚨 Procesando alarma con apertura automática:', data.medicationName || data.appointmentTitle || data.name);
      
      // Reproducir audio de alarma inmediatamente
      await this.audioManager.configureAudio();
      const audioStarted = await this.audioManager.playAlarmSound();
      
      if (audioStarted) {
        console.log('[EnhancedAutoOpenService] ✅ Audio de alarma iniciado');
      } else {
        console.log('[EnhancedAutoOpenService] ⚠️ Audio no disponible, continuando con vibración');
      }
      
      // Iniciar vibración
      this.audioManager.startAlarmVibration();
      
      // Si la app está en background, intentar abrirla automáticamente
      if (!this.isAppInForeground) {
        console.log('[EnhancedAutoOpenService] App en background, intentando apertura automática...');
        await this.forceOpenApp();
        
        // Esperar un momento para que la app se abra
        setTimeout(() => {
          this.navigateToAlarmScreen(data);
        }, 1500);
      } else {
        // Si ya está en foreground, navegar directamente
        console.log('[EnhancedAutoOpenService] App en foreground, navegando directamente...');
        this.navigateToAlarmScreen(data);
      }
      
      // Mostrar alerta del sistema como respaldo usando System Alert Window
      setTimeout(async () => {
        if (!this.isAppInForeground) {
          try {
            const { systemAlertWindowService } = await import('./systemAlertWindowService');
            const success = await systemAlertWindowService.showAlarmAlert(data);
            
            if (!success) {
              // Fallback a alerta normal si System Alert Window no funciona
              this.showSystemAlert(data);
            }
          } catch (error) {
            console.error('[EnhancedAutoOpenService] Error usando System Alert Window:', error);
            this.showSystemAlert(data);
          }
        }
      }, 3000);
      
    } catch (error) {
      console.error('[EnhancedAutoOpenService] Error manejando alarma:', error);
    }
  }

  /**
   * Forzar apertura de la app
   */
  private async forceOpenApp() {
    try {
      console.log('[EnhancedAutoOpenService] Forzando apertura de la app...');
      
      // En Android, usar fullScreenIntent ya debería abrir la app
      // En iOS, las notificaciones críticas deberían abrir la app
      
      // Método adicional: intentar abrir la app usando Linking
      if (Platform.OS === 'android') {
        // En Android, las notificaciones con fullScreenIntent deberían abrir la app automáticamente
        console.log('[EnhancedAutoOpenService] Android: fullScreenIntent debería abrir la app');
      } else {
        // En iOS, intentar abrir la app
        console.log('[EnhancedAutoOpenService] iOS: notificación crítica debería abrir la app');
      }
      
      // Verificar si la app se abrió después de un delay
      setTimeout(() => {
        if (!this.isAppInForeground) {
          console.log('[EnhancedAutoOpenService] ⚠️ La app no se abrió automáticamente');
        } else {
          console.log('[EnhancedAutoOpenService] ✅ La app se abrió correctamente');
        }
      }, 2000);
      
    } catch (error) {
      console.error('[EnhancedAutoOpenService] Error forzando apertura de app:', error);
    }
  }

  /**
   * Navegar a AlarmScreen
   */
  private navigateToAlarmScreen(data: any) {
    try {
      if (!this.navigationRef || !this.navigationRef.isReady()) {
        console.log('[EnhancedAutoOpenService] Navegación no disponible, reintentando...');
        setTimeout(() => this.navigateToAlarmScreen(data), 1000);
        return;
      }

      console.log('[EnhancedAutoOpenService] Navegando a AlarmScreen con datos:', data);
      
      this.navigationRef.navigate('AlarmScreen', {
        kind: data.kind || (data.type === 'MEDICATION' ? 'MED' : 'APPOINTMENT'),
        refId: data.medicationId || data.appointmentId || data.refId,
        scheduledFor: data.scheduledFor,
        name: data.medicationName || data.appointmentTitle || data.name,
        dosage: data.dosage || '',
        instructions: data.instructions || data.notes || '',
        time: data.time,
        location: data.location || '',
        autoOpened: true, // Flag para indicar que se abrió automáticamente
        fromBackground: !this.isAppInForeground
      });
      
      console.log('[EnhancedAutoOpenService] ✅ Navegación completada');
    } catch (error) {
      console.error('[EnhancedAutoOpenService] Error navegando a AlarmScreen:', error);
    }
  }

  /**
   * Mostrar alerta del sistema como respaldo
   */
  private showSystemAlert(data: any) {
    try {
      const title = data.medicationName || data.appointmentTitle || 'Alarma';
      const message = 'Es hora de tu alarma. Toca aquí para abrir la app y gestionarla.';
      
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Abrir App',
            onPress: () => {
              this.navigateToAlarmScreen(data);
            }
          },
          {
            text: 'Cerrar',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('[EnhancedAutoOpenService] Error mostrando alerta del sistema:', error);
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
      data.type === 'TREATMENT' ||
      data.kind === 'TREATMENT' ||
      data.isAlarm === true ||
      data.autoOpen === true ||
      data.test === true // Para pruebas
    );
  }

  /**
   * Verificar alarmas pendientes cuando la app vuelve al foreground
   */
  private async checkForPendingAlarms() {
    try {
      console.log('[EnhancedAutoOpenService] Verificando alarmas pendientes...');
      
      // Obtener la última respuesta de notificación
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      
      if (lastResponse) {
        const data = lastResponse.notification.request.content.data;
        
        // Si la última notificación fue una alarma y fue reciente (últimos 5 minutos)
        if (this.isAlarmNotification(data)) {
          const notificationTime = new Date(lastResponse.notification.date);
          const now = new Date();
          const timeDiff = now.getTime() - notificationTime.getTime();
          
          // Si fue en los últimos 5 minutos, considerar que es una alarma pendiente
          if (timeDiff < 5 * 60 * 1000) {
            console.log('[EnhancedAutoOpenService] Alarma pendiente encontrada, navegando...');
            setTimeout(() => {
              this.navigateToAlarmScreen(data);
            }, 500);
          }
        }
      }
    } catch (error) {
      console.error('[EnhancedAutoOpenService] Error verificando alarmas pendientes:', error);
    }
  }

  /**
   * Detener alarma
   */
  public stopAlarm() {
    try {
      console.log('[EnhancedAutoOpenService] Deteniendo alarma...');
      this.audioManager.stopAlarmSound();
      // Compatibilidad: algunos entornos usan stopVibration
      if (typeof (this.audioManager as any).stopAlarmVibration === 'function') {
        (this.audioManager as any).stopAlarmVibration();
      } else {
        this.audioManager.stopVibration();
      }
    } catch (error) {
      console.error('[EnhancedAutoOpenService] Error deteniendo alarma:', error);
    }
  }

  /**
   * Limpiar recursos
   */
  public cleanup() {
    console.log('[EnhancedAutoOpenService] Limpiando recursos...');
    
    // Limpiar listeners de notificaciones
    this.notificationListeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    
    // Limpiar listener del estado de la app
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Detener alarma si está activa
    this.stopAlarm();
  }
}

// Exportar instancia singleton
export const enhancedAutoOpenService = EnhancedAutoOpenService.getInstance();
