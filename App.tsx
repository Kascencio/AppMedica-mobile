import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './navigation/AuthStack';
import AppTabs from './navigation/AppTabs';
import { useAuth } from './store/useAuth';
import { ActivityIndicator, View, Modal, Linking, Button, Alert, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNavigationContainerRef } from '@react-navigation/native';
import { useCurrentUser } from './store/useCurrentUser';
import { useOffline } from './store/useOffline';
import { useAutoSync } from './hooks/useAutoSync';
import { useProfileValidation } from './hooks/useProfileValidation';
import { Ionicons } from '@expo/vector-icons';
import { requestPermissions, initNotificationSystem, checkAutoOpenPermissions } from './lib/notifications';
import { syncService } from './lib/syncService';
import { notificationService } from './lib/notificationService';
import { DatabaseInitializer } from './components/DatabaseInitializer';
import { unifiedAlarmService } from './lib/unifiedAlarmService';
import { enhancedAutoOpenService } from './lib/enhancedAutoOpenService';
import { overlayPermissionService } from './lib/overlayPermissionService';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { registerBackgroundAlarmTask, ALARM_BACKGROUND_FETCH_TASK } from './lib/alarmTask';
import { AppState } from 'react-native';
import * as LinkingExpo from 'expo-linking';
import { linking } from './lib/linking';
import Constants from 'expo-constants';

export default function App() {
  const { isAuthenticated, loading, loadToken, userToken } = useAuth();
  const { fetchProfile, profile, loading: loadingProfile } = useCurrentUser();
  const { initializeOffline } = useOffline();
  const autoSync = useAutoSync(); // Inicializar sincronización automática
  const validatedProfile = useProfileValidation(); // Validar perfil automáticamente
  const navigationRef = useNavigationContainerRef();
  const [notiPerm, setNotiPerm] = React.useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [showPermModal, setShowPermModal] = React.useState(false);

  // Helper: navegar a AlarmScreen desde data sin deep link
  const navigateToAlarmFromData = React.useCallback((data: any) => {
    if (!data) return;
    const kind = data.kind || (data.type === 'MEDICATION' ? 'MED' : data.type === 'APPOINTMENT' ? 'APPOINTMENT' : data.type === 'TREATMENT' ? 'TREATMENT' : 'ALARM');
    const refId = data.medicationId || data.appointmentId || data.refId || 'unknown';
    const params = {
      kind,
      refId,
      scheduledFor: data.scheduledFor,
      name: data.medicationName || data.appointmentTitle || data.name,
      dosage: data.dosage || '',
      instructions: data.instructions || data.notes || '',
      time: data.time,
      location: data.location || ''
    } as any;
    if (navigationRef.isReady()) {
      navigationRef.navigate('AlarmScreen' as never, params as never);
    }
  }, [navigationRef]);

  // Solicitar permisos y mostrar modal si no están concedidos
  useEffect(() => {
    loadToken();
    
    // Declarar variables de listeners en el scope del useEffect
    let unifiedAlarmListeners: any[] | undefined;
    
    (async () => {
      try {
        // Inicializar sistema de alarmas unificado
        await initNotificationSystem();
        unifiedAlarmService.setNavigationRef(navigationRef);
        console.log('[App] Sistema de alarmas unificado inicializado correctamente');
        
        // Inicializar servicio mejorado de apertura automática
        enhancedAutoOpenService.setNavigationRef(navigationRef);
        await enhancedAutoOpenService.initialize();
        console.log('[App] Servicio de apertura automática mejorado inicializado correctamente');
        
        // Solicitar permisos base de notificaciones
        const permissionsGranted = await requestPermissions();
        
        // Solicitar/Verificar todos los permisos críticos para auto-apertura (overlay + notificaciones)
        const autoOpenPermissions = await overlayPermissionService.checkAllAutoOpenPermissions();
        if (!autoOpenPermissions.allGranted) {
          await overlayPermissionService.requestAllAutoOpenPermissions();
        }
        console.log('[App] Estado de permisos de apertura automática:', autoOpenPermissions);
        
        if (permissionsGranted) {
          setNotiPerm('granted');
          
          // Mostrar instrucciones solo en Android cuando falten permisos de auto-apertura
          if (Platform.OS === 'android' && !autoOpenPermissions.allGranted) {
            console.log('[App] ⚠️ Faltan permisos para apertura automática (Android)');
            setShowPermModal(true);
          } else {
            setShowPermModal(false);
          }
        } else {
          setNotiPerm('denied');
          // Mostrar modal solo en Android; en iOS se puede guiar con otro flujo si es necesario
          setShowPermModal(Platform.OS === 'android');
        }
        
        // Inicializar servicio de sincronización (que incluye la base de datos)
        try {
          await syncService.init();
        } catch (syncError) {
          console.error('[App] Error inicializando syncService:', syncError);
          // Continuar sin sincronización
        }
        
        // Inicializar sistema offline
        try {
          await initializeOffline();
        } catch (offlineError) {
          console.error('[App] Error inicializando sistema offline:', offlineError);
          // Continuar sin modo offline
        }
        
        // Inicializar servicio de notificaciones
        try {
          await notificationService.initialize();
          
          // Configurar canales de notificación después de inicializar
          if (Platform.OS === 'android') {
            try {
              const { setupNotificationChannels } = await import('./lib/notificationChannels');
              await setupNotificationChannels();
              console.log('[App] Canales de notificación configurados correctamente');
            } catch (channelError) {
              console.error('[App] Error configurando canales de notificación:', channelError);
            }
          }
        } catch (notificationError) {
          console.error('[App] Error inicializando notificationService:', notificationError);
          // Continuar sin notificaciones
        }
        
        // Registrar tarea en segundo plano para alarmas
        try {
          console.log('[App] Registrando tarea en segundo plano para alarmas...');
          await registerBackgroundAlarmTask();
          console.log('[App] Tarea en segundo plano registrada exitosamente');
        } catch (backgroundTaskError) {
          console.error('[App] Error registrando tarea en segundo plano:', backgroundTaskError);
          // Continuar sin tarea en segundo plano
        }
      } catch (error) {
        console.error('[App] Error crítico en inicialización:', error);
        // No detener la app por errores de inicialización
      }
    })();
    
    
    // Configurar el estado de la app
    const handleAppStateChange = async (nextAppState: string) => {
      console.log('[App] Estado de la app cambió:', nextAppState);
      // Al volver a primer plano, re-verificar permisos para ocultar el modal si ya se concedieron
      if (nextAppState === 'active') {
        try {
          const autoOpenPermissions = await checkAutoOpenPermissions();
          if (Platform.OS === 'android') {
            setShowPermModal(!autoOpenPermissions.allGranted);
          } else {
            setShowPermModal(false);
          }
        } catch (e) {
          // ignorar
        }
      }
    };
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      unifiedAlarmService.cleanup();
      enhancedAutoOpenService.cleanup();
      appStateSubscription?.remove();
    };
  }, []);

  // Deep link desde notificaciones: frío/background
  useEffect(() => {
    const handleColdStart = async () => {
      let url: string | undefined;

      // Prioridad 1: Notificación que abrió la app (FSI o toque en Expo Go)
      const initialNotification = await Notifications.getInitialNotificationAsync();
      if (initialNotification) {
        url = (initialNotification.request.content.data as any)?.deepLink;
        if (url) {
          LinkingExpo.openURL(url);
          return; // Procesado, salir
        }
        // Fallback si no hay deepLink
        const data = initialNotification.request.content.data as any;
        const looksLikeAlarm = data?.kind === 'MED' || data?.kind === 'APPOINTMENT' || data?.type === 'MEDICATION' || data?.type === 'APPOINTMENT';
        if (looksLikeAlarm) {
          navigateToAlarmFromData(data);
          return;
        }
      }

      // Prioridad 2: Respuesta a notificación que abrió la app (toque del usuario)
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        url = (lastResponse.notification.request.content.data as any)?.deepLink;
        if (url) {
          LinkingExpo.openURL(url);
          return;
        }
        // Fallback si no hay deepLink
        const data = lastResponse.notification.request.content.data as any;
        const looksLikeAlarm2 = data?.kind === 'MED' || data?.kind === 'APPOINTMENT' || data?.type === 'MEDICATION' || data?.type === 'APPOINTMENT';
        if (looksLikeAlarm2) navigateToAlarmFromData(data);
      }
    };

    handleColdStart();

    // Listener para toques en notificaciones con la app en segundo plano
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as any;
      const url = data?.deepLink as string | undefined;
      if (url) {
        LinkingExpo.openURL(url);
      } else {
        const looksLikeAlarm = data?.kind === 'MED' || data?.kind === 'APPOINTMENT' || data?.type === 'MEDICATION' || data?.type === 'APPOINTMENT';
        if (looksLikeAlarm) navigateToAlarmFromData(data);
      }
    });
    return () => sub.remove();
  }, []);

  // Foreground: sonar y abrir UI (single source of truth)
  useEffect(() => {
    const subFg = Notifications.addNotificationReceivedListener((n) => {
      if (AppState.currentState !== 'active') return;
      const data = n.request.content.data as any;
      const looksLikeAlarm = data?.isAlarm === true || data?.kind === 'MED' || data?.kind === 'APPOINTMENT' || data?.type === 'MEDICATION' || data?.type === 'APPOINTMENT';
      if (looksLikeAlarm) {
        unifiedAlarmService.onNotificationReceivedInForeground?.(data);
      }
    });
    return () => subFg.remove();
  }, []);

  // Notifee: manejar full-screen presses y arranque en frío
  useEffect(() => {
    if (Constants.appOwnership === 'expo') return; // Evitar Notifee en Expo Go
    let unsub: any;
    (async () => {
      try {
        const notifeeMod = await import('@notifee/react-native');
        const notifee: any = (notifeeMod as any).default ?? notifeeMod;

        // Arranque en frío
        const initial = await notifee.getInitialNotification();
        const initialUrl: string | undefined = initial?.notification?.data?.deepLink;
        if (initialUrl) {
          LinkingExpo.openURL(initialUrl);
        }

        // Foreground presses
        unsub = notifee.onForegroundEvent(({ type, detail }: any) => {
          const url: string | undefined = detail?.notification?.data?.deepLink;
          if (url) LinkingExpo.openURL(url);
        });
      } catch {
        // Notifee no disponible (Expo Go); ignorar
      }
    })();
    return () => {
      try { unsub && unsub(); } catch {}
    };
  }, []);

  // Cargar perfil automáticamente si hay token y no hay perfil
  useEffect(() => {
    if (isAuthenticated && userToken && !profile && !loadingProfile) {
      console.log('[App] Cargando perfil automáticamente...');
      // Agregar un flag para evitar llamadas repetidas
      const loadProfileOnce = async () => {
        try {
          await fetchProfile();
        } catch (error) {
          console.log('[App] Error cargando perfil:', error);
          // Si hay error, marcar como inicializado para evitar bucle infinito
          console.log('[App] Error cargando perfil, continuando sin perfil');
        }
      };
      loadProfileOnce();
    }
  }, [isAuthenticated, userToken, profile, loadingProfile]); // Incluir todas las dependencias necesarias

  // Función para abrir configuración del sistema
  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <DatabaseInitializer>
      <NavigationContainer ref={navigationRef} linking={linking}>
        {isAuthenticated ? <AppTabs /> : <AuthStack />}
      </NavigationContainer>
      <Modal visible={showPermModal} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#fff', borderRadius:16, padding:28, width:'90%', alignItems:'center' }}>
            <Ionicons name="phone-portrait" size={48} color="#2563eb" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize:18, fontWeight:'bold', color:'#2563eb', marginBottom:8, textAlign:'center' }}>
              Configuración de Apertura Automática
            </Text>
            <Text style={{ color:'#334155', textAlign:'center', marginBottom:16, lineHeight:22 }}>
              Para que las alarmas abran la aplicación automáticamente cuando esté cerrada, necesitas configurar los siguientes permisos:
            </Text>
            
            <View style={{ marginBottom: 20, width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="notifications" size={20} color="#059669" />
                <Text style={{ marginLeft: 8, color: '#334155', flex: 1 }}>
                  Notificaciones habilitadas
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="phone-portrait" size={20} color="#059669" />
                <Text style={{ marginLeft: 8, color: '#334155', flex: 1 }}>
                  "Aparecer arriba de las apps"
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="battery-half" size={20} color="#059669" />
                <Text style={{ marginLeft: 8, color: '#334155', flex: 1 }}>
                  Optimización de batería desactivada
                </Text>
              </View>
            </View>
            
            <Text style={{ color:'#64748b', textAlign:'center', marginBottom:20, fontSize:14 }}>
              Estos permisos garantizan que nunca pierdas una alarma importante.
            </Text>
            
            <Button title="Configurar Permisos" onPress={openSettings} />
            <Button title="Configurar Más Tarde" onPress={() => setShowPermModal(false)} color="#64748b" />
          </View>
        </View>
      </Modal>
    </DatabaseInitializer>
  );
}
