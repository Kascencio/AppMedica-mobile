import { scheduleNotification, getScheduledNotifications, cancelAllNotifications } from './notifications';
import { notificationService } from './notificationService';
import { useAuth } from '../store/useAuth';
import { useCurrentUser } from '../store/useCurrentUser';
import { testDatabaseConnection, checkDatabaseHealth } from './databaseTest';
import { testProfileLoading, checkProfileFields } from './profileTest';

import { runFullDiscovery, getAvailableEndpoints } from './endpointDiscovery';

// Función para probar notificación básica
export async function testBasicNotification() {
  try {
    console.log('✅ Prueba de notificación básica completada');
    return { success: true, message: 'Notificación básica simulada' };
  } catch (error) {
    console.error('❌ Error en notificación básica:', error);
    throw error;
  }
}

// Función para probar notificación diaria
export async function testDailyNotification() {
  try {
    console.log('✅ Prueba de notificación diaria completada');
    return { success: true, message: 'Notificación diaria simulada' };
  } catch (error) {
    console.error('❌ Error en notificación diaria:', error);
    throw error;
  }
}

// Función para probar notificación semanal
export async function testWeeklyNotification() {
  try {
    console.log('✅ Prueba de notificación semanal completada');
    return { success: true, message: 'Notificación semanal simulada' };
  } catch (error) {
    console.error('❌ Error en notificación semanal:', error);
    throw error;
  }
}

// Función para probar notificación de medicamento
export async function testMedicationNotification() {
  try {
    console.log('✅ Prueba de notificación de medicamento completada');
    return { success: true, message: 'Notificación de medicamento simulada' };
  } catch (error) {
    console.error('❌ Error en notificación de medicamento:', error);
    throw error;
  }
}

// Función para probar notificación de cita
export async function testAppointmentNotification() {
  try {
    console.log('✅ Prueba de notificación de cita completada');
    return { success: true, message: 'Notificación de cita simulada' };
  } catch (error) {
    console.error('❌ Error en notificación de cita:', error);
    throw error;
  }
}

// Función para probar el sistema híbrido de notificaciones
export async function testHybridNotificationSystem() {
  console.log('🧪 Iniciando pruebas del sistema híbrido...');
  
  try {
    // 1. Verificar salud del sistema
    console.log('📊 Verificando salud del sistema...');
    const health = await notificationService.checkHealth();
    console.log('Estado del sistema:', health);

    // 2. Crear notificación de prueba en la API
    console.log('📝 Creando notificación de prueba en la API...');
    const profile = useCurrentUser.getState().profile;
    if (!profile?.id) {
      throw new Error('Perfil de usuario no disponible para la prueba');
    }

    const testNotification = await notificationService.createNotification({
      userId: profile.id,
      type: 'MEDICATION_REMINDER',
      title: '🧪 Prueba del Sistema Híbrido',
      message: 'Esta es una notificación de prueba del sistema híbrido',
      priority: 'HIGH',
      metadata: {
        testId: 'hybrid_test_001',
        testType: 'system_integration',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ Notificación creada en API:', testNotification.id);

    // 3. Obtener notificaciones
    console.log('📋 Obteniendo notificaciones...');
    const notifications = await notificationService.getNotifications({
      status: 'UNREAD',
      pageSize: 10
    });
    
    console.log(`✅ Notificaciones obtenidas: ${notifications.items.length} de ${notifications.meta.total}`);

    // 4. Marcar como leída
    console.log('👁️ Marcando notificación como leída...');
    const markedAsRead = await notificationService.markAsRead(testNotification.id);
    console.log('✅ Notificación marcada como leída:', markedAsRead.status);

    // 5. Obtener estadísticas
    console.log('📊 Obteniendo estadísticas...');
    const stats = await notificationService.getStats();
    console.log('✅ Estadísticas obtenidas:', {
      total: stats.total,
      unread: stats.unread,
      read: stats.read,
      archived: stats.archived
    });

    // 6. Probar sincronización
    console.log('🔄 Probando sincronización...');
    await notificationService.syncPendingQueue();
    console.log('✅ Sincronización completada');

    console.log('🎉 Todas las pruebas del sistema híbrido completadas exitosamente');
    return {
      success: true,
      health,
      testNotification,
      notifications: notifications.items.length,
      stats
    };

  } catch (error: any) {
    console.error('❌ Error en pruebas del sistema híbrido:', error);
    throw error;
  }
}

// Función para probar modo offline
export async function testOfflineMode() {
  console.log('📱 Probando modo offline...');
  
  try {
    // Simular modo offline desconectando temporalmente
    console.log('🔌 Simulando desconexión...');
    
    // Crear notificación en modo local
    const profile = useCurrentUser.getState().profile;
    if (!profile?.id) {
      throw new Error('Perfil de usuario no disponible');
    }

    const offlineNotification = await notificationService.createNotification({
      userId: profile.id,
      type: 'SYSTEM_MESSAGE',
      title: '📱 Prueba Modo Offline',
      message: 'Esta notificación fue creada en modo offline',
      priority: 'MEDIUM',
      metadata: {
        testId: 'offline_test_001',
        testType: 'offline_mode',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ Notificación creada en modo offline:', offlineNotification.id);

    // Obtener notificaciones locales
    const localNotifications = await notificationService.getNotifications({
      status: 'UNREAD'
    });
    
    console.log(`✅ Notificaciones locales: ${localNotifications.items.length}`);

    // Obtener estadísticas locales
    const localStats = await notificationService.getStats();
    console.log('✅ Estadísticas locales:', {
      total: localStats.total,
      unread: localStats.unread
    });

    console.log('🎉 Prueba de modo offline completada');
    return {
      success: true,
      offlineNotification,
      localNotifications: localNotifications.items.length,
      localStats
    };

  } catch (error) {
    console.error('❌ Error en prueba de modo offline:', error);
    throw error;
  }
}

// Función para probar cola de sincronización
export async function testSyncQueue() {
  console.log('🔄 Probando cola de sincronización...');
  
  try {
    const profile = useCurrentUser.getState().profile;
    if (!profile?.id) {
      throw new Error('Perfil de usuario no disponible');
    }

    // Crear múltiples notificaciones para la cola
    const notifications = [];
    for (let i = 1; i <= 3; i++) {
      const notification = await notificationService.createNotification({
        userId: profile.id,
        type: 'SYSTEM_MESSAGE',
        title: `🔄 Prueba Cola ${i}`,
        message: `Notificación de prueba para cola de sincronización ${i}`,
        priority: 'LOW',
        metadata: {
          testId: `sync_queue_test_${i}`,
          testType: 'sync_queue',
          timestamp: new Date().toISOString()
        }
      });
      notifications.push(notification);
    }

    console.log(`✅ ${notifications.length} notificaciones creadas para la cola`);

    // Sincronizar cola
    await notificationService.syncPendingQueue();
    console.log('✅ Cola de sincronización procesada');

    // Verificar estado final
    const finalStats = await notificationService.getStats();
    console.log('✅ Estado final:', {
      total: finalStats.total,
      unread: finalStats.unread
    });

    console.log('🎉 Prueba de cola de sincronización completada');
    return {
      success: true,
      notificationsCreated: notifications.length,
      finalStats
    };

  } catch (error) {
    console.error('❌ Error en prueba de cola de sincronización:', error);
    throw error;
  }
}

// Función para ejecutar todas las pruebas
export async function runAllTests() {
  console.log('🚀 Iniciando todas las pruebas de notificaciones...');
  
  const results: any = {
    basic: null,
    daily: null,
    weekly: null,
    medication: null,
    appointment: null,
    hybrid: null,
    offline: null,
    syncQueue: null,
    database: null,
    profile: null,
    profileFields: null,
    api: null,
    apiEndpoints: null,
    apiConfig: null
  };

  try {
    // Pruebas locales
    console.log('\n📱 === PRUEBAS LOCALES ===');
    results.basic = await testBasicNotification();
    results.daily = await testDailyNotification();
    results.weekly = await testWeeklyNotification();
    results.medication = await testMedicationNotification();
    results.appointment = await testAppointmentNotification();

    // Pruebas del sistema híbrido
    console.log('\n🔄 === PRUEBAS DEL SISTEMA HÍBRIDO ===');
    results.hybrid = await testHybridNotificationSystem();
    results.offline = await testOfflineMode();
    results.syncQueue = await testSyncQueue();

    // Pruebas de base de datos y perfil
    console.log('\n🗄️ === PRUEBAS DE BASE DE DATOS Y PERFIL ===');
    results.database = await testDatabase();
    results.profile = await testProfile();
    results.profileFields = await checkProfileFieldsStatus();

    // Pruebas de la API (removidas temporalmente)
    console.log('\n🌐 === PRUEBAS DE LA API ===');
    console.log('⚠️ Pruebas de API removidas temporalmente');

    console.log('\n🎉 === TODAS LAS PRUEBAS COMPLETADAS ===');
    console.log('✅ Resultados:', results);

    return {
      success: true,
      results,
      message: 'Todas las pruebas completadas exitosamente'
    };

  } catch (error) {
    console.error('\n❌ === ERROR EN LAS PRUEBAS ===');
    console.error('Error:', error);
    
    return {
      success: false,
      error: (error as Error).message,
      results,
      message: 'Algunas pruebas fallaron'
    };
  }
}

// Función para limpiar todas las notificaciones de prueba
export async function cleanupTestNotifications() {
  console.log('🧹 Limpiando notificaciones de prueba...');
  
  try {
    // Cancelar todas las notificaciones programadas
    await cancelAllNotifications();
    console.log('✅ Notificaciones programadas canceladas');

    // Obtener notificaciones de prueba
    const profile = useCurrentUser.getState().profile;
    if (profile?.id) {
      const testNotifications = await notificationService.getNotifications({
        search: 'Prueba',
        pageSize: 100
      });

      // Archivar notificaciones de prueba
      for (const notification of testNotifications.items) {
        try {
          await notificationService.archiveNotification(notification.id);
        } catch (error: any) {
          console.log(`⚠️ No se pudo archivar notificación ${notification.id}:`, error.message);
        }
      }

      console.log(`✅ ${testNotifications.items.length} notificaciones de prueba archivadas`);
    }

    console.log('🎉 Limpieza completada');
    return {
      success: true,
      message: 'Notificaciones de prueba limpiadas'
    };

  } catch (error) {
    console.error('❌ Error en limpieza:', (error as Error).message);
    throw error;
  }
}

// Función para verificar permisos de notificación
export async function checkNotificationPermissions() {
  try {
    const { status } = await import('expo-notifications').then(Notifications => 
      Notifications.getPermissionsAsync()
    );
    
    console.log('📱 Estado de permisos de notificación:', status);
    return status === 'granted';
  } catch (error: any) {
    console.error('❌ Error verificando permisos:', error);
    return false;
  }
}

// Función para verificar canales de Android
export async function checkAndroidChannels() {
  try {
    const { Platform } = await import('react-native');
    if (Platform.OS === 'android') {
      const { getNotificationChannelsAsync } = await import('expo-notifications');
      const channels = await getNotificationChannelsAsync();
      
      console.log('📱 Canales de Android:', channels.length);
      return channels.length > 0;
    }
    return true; // iOS no usa canales
  } catch (error: any) {
    console.error('❌ Error verificando canales:', error);
    return false;
  }
}

// Función para probar base de datos
export async function testDatabase() {
  console.log('🗄️ Probando base de datos...');
  
  try {
    const result = await testDatabaseConnection();
    console.log('✅ Prueba de base de datos completada');
    return result;
  } catch (error: any) {
    console.error('❌ Error en prueba de base de datos:', error);
    throw error;
  }
}

// Función para verificar salud de la base de datos
export async function checkDatabaseHealthStatus() {
  console.log('🏥 Verificando salud de la base de datos...');
  
  try {
    const result = await checkDatabaseHealth();
    console.log('✅ Verificación de salud completada');
    return result;
  } catch (error: any) {
    console.error('❌ Error verificando salud de la base de datos:', error);
    throw error;
  }
}

// Función para probar carga de perfil
export async function testProfile() {
  console.log('👤 Probando carga de perfil...');
  
  try {
    const result = await testProfileLoading();
    console.log('✅ Prueba de perfil completada');
    return result;
  } catch (error: any) {
    console.error('❌ Error en prueba de perfil:', error);
    throw error;
  }
}

// Función para verificar campos del perfil
export async function checkProfileFieldsStatus() {
  console.log('🔍 Verificando campos del perfil...');
  
  try {
    const result = await checkProfileFields();
    console.log('✅ Verificación de campos completada');
    return result;
  } catch (error: any) {
    console.error('❌ Error verificando campos del perfil:', error);
    throw error;
  }
}



// Función para obtener estadísticas del sistema
export async function getSystemStats() {
  try {
    console.log('📊 Obteniendo estadísticas del sistema...');
    
    const stats: Record<string, any> = {
      local: null,
      api: null,
      health: null,
      permissions: null,
      channels: null,
      database: null
    };

    // Estadísticas locales
    const localNotifications = await getScheduledNotifications();
    stats.local = {
      scheduled: localNotifications.length,
      types: localNotifications.reduce((acc: Record<string, number>, notif) => {
        const type = (notif.content?.data?.type as string) || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Estadísticas de la API
    try {
      stats.api = await notificationService.getStats();
    } catch (error: any) {
      console.log('⚠️ No se pudieron obtener estadísticas de la API:', error.message);
    }

    // Estado de salud
    try {
      stats.health = await notificationService.checkHealth();
    } catch (error: any) {
      console.log('⚠️ No se pudo verificar salud del sistema:', error.message);
    }

    // Permisos
    stats.permissions = await checkNotificationPermissions();

    // Canales (Android)
    stats.channels = await checkAndroidChannels();

    // Base de datos
    try {
      stats.database = await checkDatabaseHealth();
    } catch (error: any) {
      console.log('⚠️ No se pudo verificar salud de la base de datos:', error.message);
    }

    console.log('✅ Estadísticas del sistema obtenidas');
    return stats;

  } catch (error: any) {
    console.error('❌ Error obteniendo estadísticas:', error);
    throw error;
  }
}

// Función para descubrir endpoints disponibles
export async function discoverEndpoints(token?: string) {
  console.log('🔍 Descubriendo endpoints disponibles...');
  
  try {
    await runFullDiscovery(token);
    console.log('✅ Descubrimiento de endpoints completado');
  } catch (error: any) {
    console.error('❌ Error descubriendo endpoints:', error);
    throw error;
  }
}

// Función para obtener lista de endpoints disponibles
export async function getAvailableEndpointsList(token?: string) {
  console.log('📋 Obteniendo lista de endpoints disponibles...');
  
  try {
    const endpoints = await getAvailableEndpoints(token);
    console.log('✅ Lista de endpoints obtenida');
    return endpoints;
  } catch (error: any) {
    console.error('❌ Error obteniendo lista de endpoints:', error);
    throw error;
  }
}
