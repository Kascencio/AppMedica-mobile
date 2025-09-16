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
        
        // Solicitar permisos usando la función del módulo de notificaciones
        const permissionsGranted = await requestPermissions();
        
        // Verificar estado completo de permisos para apertura automática
        const autoOpenPermissions = await checkAutoOpenPermissions();
        console.log('[App] Estado de permisos de apertura automática:', autoOpenPermissions);
        
        if (permissionsGranted) {
          setNotiPerm('granted');
          
          // Si no todos los permisos de apertura automática están concedidos, mostrar modal
          if (!autoOpenPermissions.allGranted) {
            console.log('[App] ⚠️ Faltan permisos para apertura automática');
            setShowPermModal(true);
          }
        } else {
          setNotiPerm('denied');
          setShowPermModal(true);
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
    const handleAppStateChange = (nextAppState: string) => {
      console.log('[App] Estado de la app cambió:', nextAppState);
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
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) {
          const url = (last.notification.request.content.data as any)?.deepLink as string | undefined;
          if (url) {
            LinkingExpo.openURL(url);
          }
        }
      } catch {}
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const url = (res.notification.request.content.data as any)?.deepLink as string | undefined;
      if (url) {
        LinkingExpo.openURL(url);
      }
    });
    return () => sub.remove();
  }, []);

  // Foreground: sonar y abrir UI (single source of truth)
  useEffect(() => {
    const subFg = Notifications.addNotificationReceivedListener((n) => {
      if (AppState.currentState === 'active') {
        const data = n.request.content.data as any;
        // Evitar doble disparo si viene de deep link inmediato
        if (data?.isAlarm) {
          unifiedAlarmService.onNotificationReceivedInForeground?.(data);
        }
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
