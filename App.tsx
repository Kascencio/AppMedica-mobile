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
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function App() {
  const { isAuthenticated, loading, loadToken, userToken } = useAuth();
  const { fetchProfile, profile, loading: loadingProfile } = useCurrentUser();
  const navigationRef = useNavigationContainerRef();
  const [notiPerm, setNotiPerm] = React.useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [showPermModal, setShowPermModal] = React.useState(false);

  // Solicitar permisos y mostrar modal si no están concedidos
  useEffect(() => {
    loadToken();
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotiPerm(status);
      if (status !== 'granted') setShowPermModal(true);
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    })();
    // Listener para respuesta a notificaciones (cuando el usuario toca la notificación)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (navigationRef.isReady()) {
        navigationRef.navigate('AlarmScreen', { ...data });
      }
    });
    // Listener para notificaciones recibidas en primer plano
    const fgListener = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      const receivedAt = new Date();
      console.log('[NOTIFICACIÓN RECIBIDA] Hora recibida:', receivedAt.toISOString(), 'Datos:', data);
      // Si es de tipo alarma, navega automáticamente
      if (data && data.kind && data.refId && data.scheduledFor) {
        if (navigationRef.isReady()) {
          navigationRef.navigate('AlarmScreen', { ...data });
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
      fetchProfile();
    }
  }, [isAuthenticated, userToken, profile, loadingProfile]);

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
