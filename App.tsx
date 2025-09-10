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
import { Ionicons } from '@expo/vector-icons';
import { setNotificationHandler, requestPermissions } from './lib/notifications';
import { syncService } from './lib/syncService';
import { notificationService } from './lib/notificationService';
import { DatabaseInitializer } from './components/DatabaseInitializer';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { ALARM_BACKGROUND_FETCH_TASK, registerBackgroundFetchAsync } from './lib/alarmTask';

// Función para verificar y registrar la tarea en segundo plano
const checkStatusAsync = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(ALARM_BACKGROUND_FETCH_TASK);
  if (isRegistered) {
    console.log('[App] La tarea en segundo plano ya está registrada.');
    return;
  }

  console.log('[App] Registrando la tarea en segundo plano...');
  await registerBackgroundFetchAsync();
};

export default function App() {
  const { isAuthenticated, loading, loadToken, userToken } = useAuth();
  const { fetchProfile, profile, loading: loadingProfile } = useCurrentUser();
  const { initializeOffline } = useOffline();
  const autoSync = useAutoSync(); // Inicializar sincronización automática
  const navigationRef = useNavigationContainerRef();
  const [notiPerm, setNotiPerm] = React.useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [showPermModal, setShowPermModal] = React.useState(false);

  // Solicitar permisos y mostrar modal si no están concedidos
  useEffect(() => {
    loadToken();
    (async () => {
      try {
        // Configurar el manejador de notificaciones
        setNotificationHandler();
        
        // Solicitar permisos usando la función del módulo de notificaciones
        const permissionsGranted = await requestPermissions();
        if (permissionsGranted) {
          setNotiPerm('granted');
          // Si los permisos están concedidos, registrar la tarea en segundo plano
          await checkStatusAsync();
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
        } catch (notificationError) {
          console.error('[App] Error inicializando notificationService:', notificationError);
          // Continuar sin notificaciones
        }
      } catch (error) {
        console.error('[App] Error crítico en inicialización:', error);
        // No detener la app por errores de inicialización
      }
    })();
    
    // Listener para respuesta a notificaciones (cuando el usuario toca la notificación)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[App] Notificación tocada:', data);
      
      // Navegar a la pantalla de alarma si es una notificación de medicamento o cita
      if (data && (data.type === 'MEDICATION' || data.type === 'APPOINTMENT' || data.kind === 'MED' || data.kind === 'APPOINTMENT')) {
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate('AlarmScreen', { 
            kind: data.kind || data.type === 'MEDICATION' ? 'MED' : 'APPOINTMENT',
            refId: data.medicationId || data.appointmentId || data.refId,
            scheduledFor: data.scheduledFor,
            name: data.medicationName || data.doctorName || data.name,
            dosage: data.dosage || '',
            instructions: data.instructions || data.notes || '',
            time: data.time,
            location: data.location || ''
          });
        }
      }
    });
    
    // Listener para notificaciones recibidas en primer plano (solo para alarmas activas)
    const fgListener = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      const receivedAt = new Date();
      console.log('[NOTIFICACIÓN RECIBIDA] Hora recibida:', receivedAt.toISOString(), 'Datos:', data);
      
      // Solo navegar automáticamente si es una alarma de medicamento o cita y la app está en primer plano
      if (data && (data.type === 'MEDICATION' || data.type === 'APPOINTMENT' || data.kind === 'MED' || data.kind === 'APPOINTMENT')) {
        console.log('[App] Navegando a pantalla de alarma automáticamente');
        if (navigationRef.isReady()) {
          // Navegar inmediatamente para mostrar la alarma
          (navigationRef as any).navigate('AlarmScreen', { 
            kind: data.kind || (data.type === 'MEDICATION' ? 'MED' : 'APPOINTMENT'),
            refId: data.medicationId || data.appointmentId || data.refId,
            scheduledFor: data.scheduledFor,
            name: data.medicationName || data.doctorName || data.name,
            dosage: data.dosage || '',
            instructions: data.instructions || data.notes || '',
            time: data.time,
            location: data.location || ''
          });
        }
      }
    });
    
    return () => {
      subscription.remove();
      fgListener.remove();
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
