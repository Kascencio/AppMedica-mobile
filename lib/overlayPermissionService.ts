import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import * as Device from 'expo-device';

/**
 * Servicio para manejar permisos de overlay (Aparecer arriba de las apps)
 * Necesario para la apertura automática de alarmas
 */
export class OverlayPermissionService {
  private static instance: OverlayPermissionService;

  public static getInstance(): OverlayPermissionService {
    if (!OverlayPermissionService.instance) {
      OverlayPermissionService.instance = new OverlayPermissionService();
    }
    return OverlayPermissionService.instance;
  }

  /**
   * Verificar si el permiso de overlay está concedido
   */
  public async checkOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('[OverlayPermissionService] iOS no requiere permiso de overlay');
      return true;
    }

    if (!Device.isDevice) {
      console.log('[OverlayPermissionService] Simulador - asumiendo permiso concedido');
      return true;
    }

    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW
      );
      
      console.log('[OverlayPermissionService] Permiso de overlay:', hasPermission ? 'Concedido' : 'Denegado');
      return hasPermission;
    } catch (error) {
      console.error('[OverlayPermissionService] Error verificando permiso de overlay:', error);
      return false;
    }
  }

  /**
   * Solicitar permiso de overlay
   */
  public async requestOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('[OverlayPermissionService] iOS no requiere permiso de overlay');
      return true;
    }

    if (!Device.isDevice) {
      console.log('[OverlayPermissionService] Simulador - asumiendo permiso concedido');
      return true;
    }

    try {
      // Verificar si ya tiene el permiso
      const hasPermission = await this.checkOverlayPermission();
      if (hasPermission) {
        console.log('[OverlayPermissionService] Permiso de overlay ya concedido');
        return true;
      }

      console.log('[OverlayPermissionService] Solicitando permiso de overlay...');
      
      // Para Android 6.0+ (API 23+), SYSTEM_ALERT_WINDOW requiere configuración manual
      // Mostrar alerta para guiar al usuario
      return new Promise((resolve) => {
        Alert.alert(
          'Permiso Requerido: "Aparecer arriba de las apps"',
          'Para que las alarmas puedan abrir la aplicación automáticamente, necesitas conceder el permiso de "Aparecer arriba de las apps".\n\nEsto es necesario para:\n• Abrir la app automáticamente cuando suene una alarma\n• Mostrar alarmas incluso cuando la app está cerrada\n• Garantizar que no pierdas ninguna alarma importante\n\n¿Quieres configurar este permiso ahora?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => resolve(false)
            },
            {
              text: 'Configurar',
              onPress: async () => {
                try {
                  // Abrir configuración de permisos especiales
                  await Linking.openSettings();
                  
                  // Mostrar instrucciones adicionales
                  setTimeout(() => {
                    Alert.alert(
                      'Instrucciones de Configuración',
                      'Para conceder el permiso:\n\n1. Busca "Aparecer arriba de las apps" o "Display over other apps"\n2. Encuentra "RecuerdaMed" en la lista\n3. Activa el permiso para esta aplicación\n4. Regresa a la app\n\n¿Ya configuraste el permiso?',
                      [
                        {
                          text: 'No, necesito ayuda',
                          onPress: () => this.showDetailedInstructions()
                        },
                        {
                          text: 'Sí, ya lo configuré',
                          onPress: async () => {
                            const granted = await this.checkOverlayPermission();
                            resolve(granted);
                          }
                        }
                      ]
                    );
                  }, 2000);
                } catch (error) {
                  console.error('[OverlayPermissionService] Error abriendo configuración:', error);
                  resolve(false);
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('[OverlayPermissionService] Error solicitando permiso de overlay:', error);
      return false;
    }
  }

  /**
   * Mostrar instrucciones detalladas para configurar el permiso
   */
  private showDetailedInstructions() {
    Alert.alert(
      'Instrucciones Detalladas',
      'Para configurar "Aparecer arriba de las apps":\n\n' +
      'OPCIÓN 1 - Desde Configuración:\n' +
      '• Configuración → Aplicaciones → RecuerdaMed → Avanzado → "Aparecer arriba de las apps" → Activar\n\n' +
      'OPCIÓN 2 - Desde Configuración de Apps:\n' +
      '• Configuración → Aplicaciones → "Aparecer arriba de las apps" → RecuerdaMed → Activar\n\n' +
      'OPCIÓN 3 - Buscar en Configuración:\n' +
      '• Busca "Display over other apps" o "Overlay" en configuración\n\n' +
      'Una vez configurado, regresa a la app y prueba una alarma.',
      [
        {
          text: 'Abrir Configuración',
          onPress: () => Linking.openSettings()
        },
        {
          text: 'Entendido',
          style: 'cancel'
        }
      ]
    );
  }

  /**
   * Verificar todos los permisos necesarios para apertura automática
   */
  public async checkAllAutoOpenPermissions(): Promise<{
    overlay: boolean;
    notifications: boolean;
    batteryOptimization: boolean;
    allGranted: boolean;
  }> {
    const overlay = await this.checkOverlayPermission();
    
    // Para notificaciones, usar el servicio existente
    const { checkNotificationPermissions } = await import('./notifications');
    const notificationResult = await checkNotificationPermissions();
    
    // Para optimización de batería, asumir que está bien por ahora
    // (esto requeriría una implementación más compleja)
    const batteryOptimization = true; // TODO: Implementar verificación real
    
    const allGranted = overlay && notificationResult.granted && batteryOptimization;
    
    console.log('[OverlayPermissionService] Estado de permisos:', {
      overlay,
      notifications: notificationResult.granted,
      batteryOptimization,
      allGranted
    });
    
    return {
      overlay,
      notifications: notificationResult.granted,
      batteryOptimization,
      allGranted
    };
  }

  /**
   * Solicitar todos los permisos necesarios
   */
  public async requestAllAutoOpenPermissions(): Promise<boolean> {
    console.log('[OverlayPermissionService] Solicitando todos los permisos de apertura automática...');
    
    // Solicitar permiso de overlay
    const overlayGranted = await this.requestOverlayPermission();
    
    // Solicitar permisos de notificación
    const { requestPermissions } = await import('./notifications');
    const notificationGranted = await requestPermissions();
    
    // Verificar estado final
    const finalStatus = await this.checkAllAutoOpenPermissions();
    
    if (finalStatus.allGranted) {
      console.log('[OverlayPermissionService] ✅ Todos los permisos concedidos');
      Alert.alert(
        '¡Perfecto!',
        'Todos los permisos necesarios para la apertura automática de alarmas han sido concedidos.\n\nAhora las alarmas podrán:\n• Abrir la app automáticamente\n• Mostrarse incluso cuando la app está cerrada\n• Funcionar de manera confiable'
      );
      return true;
    } else {
      console.log('[OverlayPermissionService] ⚠️ Algunos permisos faltan');
      this.showMissingPermissionsAlert(finalStatus);
      return false;
    }
  }

  /**
   * Mostrar alerta de permisos faltantes
   */
  private showMissingPermissionsAlert(status: {
    overlay: boolean;
    notifications: boolean;
    batteryOptimization: boolean;
    allGranted: boolean;
  }) {
    const missingPermissions = [];
    if (!status.overlay) missingPermissions.push('"Aparecer arriba de las apps"');
    if (!status.notifications) missingPermissions.push('Notificaciones');
    if (!status.batteryOptimization) missingPermissions.push('Optimización de batería');
    
    Alert.alert(
      'Permisos Faltantes',
      `Para que la apertura automática funcione correctamente, faltan los siguientes permisos:\n\n• ${missingPermissions.join('\n• ')}\n\n¿Quieres configurarlos ahora?`,
      [
        {
          text: 'Más tarde',
          style: 'cancel'
        },
        {
          text: 'Configurar',
          onPress: () => this.requestAllAutoOpenPermissions()
        }
      ]
    );
  }
}

// Exportar instancia singleton
export const overlayPermissionService = OverlayPermissionService.getInstance();
