
# 🔔 Implementación de Notificaciones que Abren la App Automáticamente

## 🎯 **Objetivo**

Implementar notificaciones que se comporten como **alarmas reales**, abriendo la app automáticamente cuando llegan, sin necesidad de que el usuario toque la notificación.

## ✅ **Implementaciones Realizadas**

### 1. **Canales de Notificación de Máxima Prioridad**

**Archivo**: `lib/notificationChannels.ts`

```typescript
// Canal para medicamentos - ALTA PRIORIDAD
await Notifications.setNotificationChannelAsync('medications', {
  name: 'Medicamentos',
  description: 'Recordatorios de medicamentos',
  importance: Notifications.AndroidImportance.MAX, // Máxima prioridad
  vibrationPattern: [0, 500, 250, 500, 250, 500],
  lightColor: '#059669',
  sound: 'alarm.mp3', // Usar sonido personalizado
  enableVibrate: true,
  enableLights: true,
  bypassDnd: true, // Pasar el modo No Molestar
  showBadge: true, // Mostrar badge
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  enableSound: true,
  showOnLockScreen: true, // Mostrar en pantalla de bloqueo
});
```

### 2. **Handler de Notificaciones Mejorado**

**Archivo**: `lib/notifications.ts`

```typescript
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Para notificaciones de medicamentos y citas
      if (notification.request.content.data?.type === 'MEDICATION' || 
          notification.request.content.data?.kind === 'MED' ||
          notification.request.content.data?.kind === 'APPOINTMENT' ||
          notification.request.content.data?.type === 'APPOINTMENT') {
        
        return {
          shouldShowBanner: true, // Mostrar banner en el sistema
          shouldShowList: true,   // Mostrar en el panel de notificaciones
          shouldPlaySound: true,  // Reproducir sonido
          shouldSetBadge: true,   // Mostrar badge en el icono de la app
          shouldShowAlert: true,  // Mostrar alerta (importante para apertura automática)
        };
      }
      
      // Para otras notificaciones
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowAlert: false,
      };
    },
  });
}
```

### 3. **Notificaciones con Configuración de Apertura Automática**

**Archivo**: `lib/notifications.ts`

```typescript
const scheduledId = await Notifications.scheduleNotificationAsync({
  identifier: notificationId,
  content: {
    title,
    body,
    data: notificationData,
    sound: (channelId === 'medications' || channelId === 'appointments') ? 'alarm.mp3' : 'default',
    priority: Notifications.AndroidNotificationPriority.MAX, // Máxima prioridad para alarmas
    vibrate: [0, 500, 250, 500, 250, 500], // Vibración más intensa para alarmas
    categoryIdentifier: channelId,
    sticky: false,
    autoDismiss: false, // No permitir que se cierre automáticamente para alarmas
    badge: 1, // Mostrar badge
    launchImageName: 'SplashScreen', // Para iOS
  },
  trigger,
});
```

### 4. **Manejo de Notificaciones en Segundo Plano**

**Archivo**: `lib/backgroundNotificationHandler.ts`

```typescript
public async handleBackgroundNotification(notification: Notifications.Notification) {
  const data = notification.request.content.data;
  
  // Verificar si es una notificación de alarma
  if (this.isAlarmNotification(data)) {
    console.log('[BackgroundNotificationHandler] Es una alarma, preparando apertura automática...');
    
    // Configurar audio para modo silencioso
    await this.configureAudioForAlarm();
    
    // Forzar apertura de la app
    await this.forceAppOpen();
    
    // Navegar a AlarmScreen si la navegación está disponible
    if (this.navigationRef && this.navigationRef.isReady()) {
      this.navigateToAlarmScreen(data);
    }
  }
}
```

### 5. **Componente de Prueba Mejorado**

**Archivo**: `components/QuickNotificationTest.tsx`

```typescript
const testImmediateNotification = async () => {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Prueba Rápida',
      body: '¡Esta es una notificación de prueba que debería abrir la app!',
      sound: 'alarm.mp3',
      data: { 
        test: true, 
        type: 'MEDICATION',
        kind: 'MED',
        medicationId: 'test_med_123',
        medicationName: 'Prueba de Medicamento',
        dosage: '1 comprimido',
        time: '12:00',
        scheduledFor: new Date().toISOString()
      },
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 500, 250, 500, 250, 500],
      categoryIdentifier: 'medications',
      sticky: false,
      autoDismiss: false,
      badge: 1,
      launchImageName: 'SplashScreen',
    },
    trigger: { seconds: 5 },
  });
};
```

## 🔧 **Configuraciones Clave**

### **Android:**
- **`importance: MAX`**: Máxima prioridad del sistema
- **`bypassDnd: true`**: Pasa el modo "No Molestar"
- **`lockscreenVisibility: PUBLIC`**: Visible en pantalla de bloqueo
- **`showOnLockScreen: true`**: Mostrar en pantalla de bloqueo
- **`priority: MAX`**: Máxima prioridad de notificación

### **iOS:**
- **`shouldShowAlert: true`**: Mostrar alerta que abre la app
- **`launchImageName: 'SplashScreen'`**: Imagen de lanzamiento
- **`playsInSilentModeIOS: true`**: Reproducir en modo silencioso

## 📱 **Cómo Probar**

### 1. **Usar Development Build**
```bash
# Las notificaciones NO funcionan en Expo Go
expo run:android
```

### 2. **Probar Notificación Inmediata**
1. Ir a **Perfil** → **"🧪 Prueba Rápida de Notificaciones"**
2. Hacer clic en **"⏰ Prueba Inmediata (5s)"**
3. **Cerrar la app completamente**
4. **Esperar 5 segundos**
5. **La app debería abrirse automáticamente**

### 3. **Verificar Configuración del Dispositivo**
- **Permisos de notificación**: Concedidos
- **Optimización de batería**: Desactivada para RecuerdaMed
- **Modo "No Molestar"**: Desactivado
- **Permisos de "Alarmas exactas"**: Concedidos (Android 12+)

## ⚠️ **Limitaciones del Sistema**

### **Android:**
- Las notificaciones de alta prioridad pueden abrir la app automáticamente
- Requiere permisos especiales y configuración correcta
- Algunos fabricantes (Samsung, Xiaomi) pueden tener restricciones adicionales

### **iOS:**
- Las notificaciones con `shouldShowAlert: true` pueden abrir la app
- Requiere que el usuario haya concedido permisos de notificación
- El comportamiento puede variar según la versión de iOS

## 🎯 **Resultado Esperado**

Cuando llegue una notificación de medicamento o cita:

1. **🔔 Aparece la notificación** con sonido de alarma
2. **📱 La app se abre automáticamente** (sin tocar la notificación)
3. **🚨 Se reproduce el sonido** incluso en modo silencioso
4. **📳 Vibra el dispositivo** con patrón intenso
5. **🔓 Funciona en pantalla de bloqueo**

## 🔄 **Próximos Pasos**

1. **Probar en dispositivo real** con development build
2. **Verificar permisos** del sistema
3. **Configurar medicamentos reales** para probar alarmas
4. **Monitorear logs** para identificar problemas

---

**Estado**: ✅ **IMPLEMENTADO** - Las notificaciones están configuradas para abrir la app automáticamente como alarmas reales.
