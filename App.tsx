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
import { setNotificationHandler, requestPermissions } from './lib/notifications';
import { syncService } from './lib/syncService';
import { notificationService } from './lib/notificationService';
import { DatabaseInitializer } from './components/DatabaseInitializer';
import { backgroundNotificationHandler } from './lib/backgroundNotificationHandler';
import { backgroundAlarmHandler } from './lib/backgroundAlarmHandler';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { registerBackgroundAlarmTask, ALARM_BACKGROUND_FETCH_TASK } from './lib/alarmTask';
import { AppState } from 'react-native';

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
    let backgroundAlarmListeners: any;
    
    (async () => {
      try {
        // Configurar el manejador de notificaciones
        setNotificationHandler();
        
        // Configurar listeners de respuesta a notificaciones (CRÍTICO para app cerrada)
        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('[App] Respuesta a notificación recibida:', response);
          const data = response.notification.request.content.data;
          
          // Verificar si es una alarma
          if (data?.type === 'MEDICATION' || data?.kind === 'MED' || 
              data?.type === 'APPOINTMENT' || data?.kind === 'APPOINTMENT') {
            console.log('[App] Alarma detectada en respuesta, navegando a AlarmScreen...');
            
            // Navegar a AlarmScreen cuando se toca la notificación
            setTimeout(() => {
              if (navigationRef && navigationRef.isReady()) {
                (navigationRef as any).navigate('AlarmScreen', {
                  kind: data.kind || data.type,
                  refId: data.medicationId || data.appointmentId,
                  scheduledFor: data.scheduledFor,
                  medicationName: data.medicationName,
                  dosage: data.dosage,
                  instructions: data.instructions,
                  time: data.time,
                  location: data.location,
                });
              }
            }, 500);
          }
        });
        
        // Configurar el manejador de alarmas en segundo plano (CRÍTICO para app cerrada)
        backgroundAlarmHandler.setNavigationRef(navigationRef);
        backgroundAlarmListeners = backgroundAlarmHandler.setupNotificationListeners();
        
        // Solicitar permisos usando la función del módulo de notificaciones
        const permissionsGranted = await requestPermissions();
        if (permissionsGranted) {
          setNotiPerm('granted');
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
    
    // Configurar el manejador de notificaciones en segundo plano
    backgroundNotificationHandler.setNavigationRef(navigationRef);
    const backgroundListeners = backgroundNotificationHandler.setupNotificationListeners();
    
    // Configurar el estado de la app
    const handleAppStateChange = (nextAppState: string) => {
      console.log('[App] Estado de la app cambió:', nextAppState);
    };
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      backgroundNotificationHandler.cleanup(backgroundListeners);
      backgroundAlarmHandler.cleanup(backgroundAlarmListeners);
      appStateSubscription?.remove();
      // El responseListener se limpia automáticamente cuando se desmonta el componente
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
      <NavigationContainer ref={navigationRef}>
        {isAuthenticated ? <AppTabs /> : <AuthStack />}
      </NavigationContainer>
      <Modal visible={showPermModal} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#fff', borderRadius:16, padding:28, width:'85%', alignItems:'center' }}>
            <Ionicons name="notifications-off" size={48} color="#ef4444" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize:18, fontWeight:'bold', color:'#ef4444', marginBottom:8 }}>Permiso de notificaciones requerido</Text>
            <Text style={{ color:'#334155', textAlign:'center', marginBottom:16 }}>
              Para que las alarmas funcionen correctamente, activa las notificaciones para esta app en la configuración del sistema.
            </Text>
            <Button title="Abrir configuración" onPress={openSettings} />
            <Button title="Cerrar" onPress={() => setShowPermModal(false)} color="#64748b" />
          </View>
        </View>
      </Modal>
    </DatabaseInitializer>
  );
}
