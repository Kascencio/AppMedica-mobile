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
      // Configurar el manejador de notificaciones
      setNotificationHandler();
      
      // Solicitar permisos usando la función del módulo de notificaciones
      const permissionsGranted = await requestPermissions();
      if (permissionsGranted) {
        setNotiPerm('granted');
      } else {
        setNotiPerm('denied');
        setShowPermModal(true);
      }
      
      // Inicializar sistema offline
      await initializeOffline();
      
      // Inicializar servicio de sincronización
      await syncService.init();
    })();
    
    // Listener para respuesta a notificaciones (cuando el usuario toca la notificación)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[App] Notificación tocada:', data);
      
      // Navegar a la pantalla de alarma si es una notificación de medicamento o cita
      if (data && (data.type === 'MEDICATION' || data.kind === 'MED' || data.kind === 'APPOINTMENT')) {
        if (navigationRef.isReady()) {
          navigationRef.navigate('AlarmScreen', { 
            kind: data.kind || 'MED',
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
    
    // Listener para notificaciones recibidas en primer plano
    const fgListener = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      const receivedAt = new Date();
      console.log('[NOTIFICACIÓN RECIBIDA] Hora recibida:', receivedAt.toISOString(), 'Datos:', data);
      
      // Si es una alarma de medicamento o cita, navegar automáticamente a la pantalla de alarma
      if (data && (data.type === 'MEDICATION' || data.kind === 'MED' || data.kind === 'APPOINTMENT')) {
        console.log('[App] Navegando a pantalla de alarma automáticamente');
        if (navigationRef.isReady()) {
          // Navegar inmediatamente para mostrar la alarma
          navigationRef.navigate('AlarmScreen', { 
            kind: data.kind || 'MED',
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
  }, [isAuthenticated, userToken]); // Solo depender de estos dos valores

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
    <>
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
    </>
  );
}
