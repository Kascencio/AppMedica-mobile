import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alert } from 'react-native';
import * as Device from 'expo-device';

/**
 * Función para solicitar permisos de notificación de forma forzada
 */
export async function forceRequestNotificationPermissions() {
  try {
    console.log('[PermissionHelper] Forzando solicitud de permisos...');
    
    // Verificar si es un dispositivo físico
    if (!Device.isDevice) {
      console.log('[PermissionHelper] No es un dispositivo físico, asumiendo permisos concedidos');
      return { granted: true, message: 'Simulador - permisos asumidos' };
    }

    // Verificar estado actual
    const { status: currentStatus } = await Notifications.getPermissionsAsync();
    console.log('[PermissionHelper] Estado actual:', currentStatus);
    
    if (currentStatus === 'granted') {
      return { granted: true, message: 'Permisos ya concedidos' };
    }
    
    // Solicitar permisos
    console.log('[PermissionHelper] Solicitando permisos...');
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        // allowAnnouncements: true, // Propiedad no disponible en esta versión
      },
    });
    
    console.log('[PermissionHelper] Resultado:', status);
    
    if (status === 'granted') {
      // Configurar canales de Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medications', {
          name: 'Medicamentos',
          description: 'Recordatorios de medicamentos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#059669',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
        });
      }
      
      return { granted: true, message: 'Permisos concedidos correctamente' };
    } else {
      return { granted: false, message: 'Permisos denegados por el usuario' };
    }
    
  } catch (error) {
    console.error('[PermissionHelper] Error:', error);
    return { granted: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Verificar estado de permisos
 */
export async function checkNotificationPermissions() {
  try {
    if (!Device.isDevice) {
      return { granted: true, status: 'simulator', message: 'Simulador - permisos asumidos' };
    }
    
    const { status } = await Notifications.getPermissionsAsync();
    return { 
      granted: status === 'granted', 
      status, 
      message: status === 'granted' ? 'Permisos concedidos' : 'Permisos no concedidos' 
    };
  } catch (error) {
    return { granted: false, status: 'error', message: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Mostrar alerta para guiar al usuario a configurar permisos
 */
export function showPermissionAlert() {
  Alert.alert(
    'Permisos de Notificación Requeridos',
    'Para recibir recordatorios de medicamentos, necesitas conceder permisos de notificación.\n\nVe a Configuración > Notificaciones > RecuerdaMed y activa las notificaciones.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Intentar de Nuevo', onPress: forceRequestNotificationPermissions }
    ]
  );
}
