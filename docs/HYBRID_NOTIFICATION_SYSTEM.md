# 🔄 Sistema Híbrido de Notificaciones - RecuerdaMed

## 📋 Resumen

Este documento describe el sistema híbrido de notificaciones implementado en RecuerdaMed, que combina la funcionalidad de la API del backend con un sistema local robusto para garantizar el funcionamiento continuo de las notificaciones.

## 🏗️ Arquitectura Híbrida

### **Estrategia de Funcionamiento**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Backend   │◄──►│ Notification     │◄──►│  Local Device   │
│   (Opcional)    │    │ Service          │    │   (Siempre)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Modo Híbrido   │
                       │   (Inteligente)  │
                       └──────────────────┘
```

### **Estados del Sistema**

1. **🟢 API Disponible**: Funcionamiento completo con sincronización
2. **🟡 Modo Local**: API no disponible, funcionamiento local
3. **🔴 Offline**: Sin conexión, funcionamiento local con cola

## 🔧 Funcionalidades Implementadas

### **1. Detección Automática de API**

```typescript
private async checkApiAvailability(): Promise<boolean> {
  // Verifica conectividad de red
  // Verifica autenticación del usuario
  // Prueba endpoint de health
  // Retorna true/false según disponibilidad
}
```

### **2. Fallback Inteligente**

#### **Cuando la API está disponible:**
- ✅ Sincronización inmediata con el backend
- ✅ Almacenamiento local como respaldo
- ✅ Programación automática de notificaciones

#### **Cuando la API no está disponible:**
- ✅ Funcionamiento completo en modo local
- ✅ Almacenamiento en AsyncStorage
- ✅ Cola de sincronización para cuando se reconecte

### **3. Sincronización Bidireccional**

```typescript
// Crear notificación
if (apiAvailable) {
  // Crear en API
  // Programar localmente
} else {
  // Crear localmente
  // Agregar a cola de sincronización
}
```

## 📊 Tipos de Operaciones

### **Operaciones Híbridas Implementadas:**

1. **📝 Crear Notificación**
   - API: `POST /api/notifications`
   - Local: AsyncStorage + programación local

2. **👁️ Marcar como Leída**
   - API: `PATCH /api/notifications/:id/read`
   - Local: Actualizar estado en AsyncStorage

3. **📦 Archivar Notificación**
   - API: `PATCH /api/notifications/:id/archive`
   - Local: Cambiar estado a ARCHIVED

4. **📊 Obtener Estadísticas**
   - API: `GET /api/notifications/stats`
   - Local: Calcular desde notificaciones locales

5. **🔄 Sincronización Múltiple**
   - API: `PATCH /api/notifications/bulk/read`
   - Local: Procesar múltiples notificaciones

6. **🧹 Limpieza**
   - API: `DELETE /api/notifications/cleanup/old`
   - Local: Eliminar notificaciones antiguas

## 🔄 Cola de Sincronización

### **Estructura de la Cola:**

```typescript
interface SyncQueueItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'ARCHIVE';
  data?: any;
  timestamp: number;
  retryCount: number;
}
```

### **Manejo de la Cola:**

1. **Almacenamiento**: AsyncStorage persistente
2. **Reintentos**: Máximo 3 intentos por elemento
3. **Limpieza**: Automática de elementos fallidos
4. **Sincronización**: Cada 5 minutos automáticamente

## 📱 Estados de la Aplicación

### **Indicadores Visuales:**

- **🟢 API Conectada**: Funcionamiento completo
- **🟡 Modo Local**: API no disponible, funcionando localmente
- **🔴 Offline**: Sin conexión, modo local activo

### **Mensajes de Estado:**

```typescript
// API disponible
status: 'healthy'
message: 'Sistema funcionando correctamente'

// API no disponible
status: 'local_only'
message: 'API de notificaciones no disponible - Funcionando en modo local'

// Sin conexión
status: 'offline'
message: 'Sin conexión a internet - Modo local activo'
```

## 🛠️ Implementación Técnica

### **Servicio Principal (`notificationService.ts`)**

#### **Características Clave:**
- ✅ **Detección automática** de disponibilidad de API
- ✅ **Fallback transparente** a modo local
- ✅ **Sincronización inteligente** con cola de reintentos
- ✅ **Almacenamiento persistente** en AsyncStorage
- ✅ **Manejo de errores** robusto

#### **Métodos Principales:**
```typescript
// Verificar salud del sistema
async checkHealth(): Promise<HealthStatus>

// Obtener notificaciones (híbrido)
async getNotifications(filters?: NotificationFilters): Promise<PaginatedResponse>

// Crear notificación (híbrido)
async createNotification(data: CreateNotificationData): Promise<ApiNotification>

// Marcar como leída (híbrido)
async markAsRead(notificationId: string): Promise<ApiNotification>

// Sincronizar cola pendiente
async syncPendingQueue(): Promise<void>
```

### **Hook Mejorado (`useAlarms.ts`)**

#### **Estados Duales:**
```typescript
const [alarms, setAlarms] = useState<any[]>([]);           // Locales
const [apiNotifications, setApiNotifications] = useState<ApiNotification[]>([]); // API
const [stats, setStats] = useState<any>(null);             // Locales
const [apiStats, setApiStats] = useState<ApiNotificationStats | null>(null); // API
```

#### **Sincronización Automática:**
- 🔄 **Cada 5 minutos**: Sincronizar cola pendiente
- 🔄 **Al cargar**: Verificar estado y cargar datos
- 🔄 **Al cambiar red**: Detectar cambios de conectividad

## 🧪 Pruebas y Validación

### **Escenarios de Prueba:**

1. **API Disponible:**
   ```bash
   # Verificar que funciona con API
   curl -X GET https://www.recuerdamed.org/api/notifications/health
   ```

2. **API No Disponible:**
   ```bash
   # Simular API caída
   # Verificar funcionamiento local
   ```

3. **Modo Offline:**
   ```bash
   # Desconectar red
   # Verificar funcionamiento completo
   ```

### **Herramientas de Diagnóstico:**

- **AlarmStatus Component**: Muestra estado del sistema
- **Logs Detallados**: Para debugging
- **Pruebas Automáticas**: Validación del sistema

## 📊 Métricas y Monitoreo

### **Métricas Clave:**

1. **Disponibilidad de API**: Tiempo de respuesta
2. **Tasa de Sincronización**: Éxito de sincronización
3. **Uso de Modo Local**: Frecuencia de fallback
4. **Errores de Red**: Problemas de conectividad

### **Logs de Monitoreo:**

```typescript
console.log('[NotificationService] API no disponible, usando modo local');
console.log('[NotificationService] Sincronizando 5 elementos pendientes');
console.log('[NotificationService] Error programando:', error);
```

## 🔒 Seguridad y Privacidad

### **Autenticación:**
- ✅ **JWT Token** requerido para todas las operaciones de API
- ✅ **Validación local** para operaciones offline
- ✅ **Renovación automática** de tokens

### **Datos Sensibles:**
- ✅ **Sanitización** de datos antes de almacenar
- ✅ **Encriptación** de datos sensibles en AsyncStorage
- ✅ **Limpieza automática** de datos antiguos

## 🚀 Configuración y Despliegue

### **Variables de Entorno:**

```typescript
API_CONFIG = {
  BASE_URL: 'https://www.recuerdamed.org/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  // ...
}
```

### **Inicialización:**

```typescript
// En App.tsx
await notificationService.initialize();
```

## 🎯 Beneficios del Sistema Híbrido

### **Para Usuarios:**
- 📱 **Funcionamiento Continuo**: Nunca se interrumpe el servicio
- 🔄 **Sincronización Transparente**: Sin intervención del usuario
- 📊 **Datos Consistentes**: Misma experiencia en todos los dispositivos
- 🛡️ **Privacidad**: Datos locales cuando no hay conexión

### **Para Desarrolladores:**
- 🔧 **Mantenimiento Simplificado**: Un solo código para ambos modos
- 📊 **Monitoreo Avanzado**: Métricas detalladas del sistema
- 🧪 **Testing Mejorado**: Pruebas para todos los escenarios
- 📚 **Documentación Completa**: Guías para todos los casos

### **Para el Sistema:**
- 🚀 **Escalabilidad**: Funciona con o sin backend
- 🔄 **Resiliencia**: Recuperación automática de errores
- 📈 **Analytics**: Datos de uso en todos los modos
- 🔒 **Seguridad**: Autenticación robusta en todos los casos

## 🔮 Próximas Mejoras

### **Funcionalidades Planificadas:**
- 🔔 **Notificaciones Push**: FCM/APNS con fallback local
- 🤖 **IA Predictiva**: Predicción de horarios óptimos
- 📊 **Analytics Avanzados**: Machine Learning para optimización
- 🔄 **Sincronización en Tiempo Real**: WebSockets cuando esté disponible

### **Optimizaciones Técnicas:**
- ⚡ **Caché Inteligente**: Optimización de rendimiento
- 🔄 **Sincronización Diferencial**: Solo cambios necesarios
- 📱 **Modo Avión Mejorado**: Funcionamiento offline optimizado
- 🔋 **Optimización de Batería**: Menor consumo energético

## 📚 Ejemplos de Uso

### **Uso Básico:**

```typescript
import { useAlarms } from '../hooks/useAlarms';

function MyComponent() {
  const { 
    apiNotifications, 
    loadApiNotifications, 
    markApiNotificationAsRead 
  } = useAlarms();

  useEffect(() => {
    loadApiNotifications(); // Funciona en modo híbrido
  }, []);

  const handleNotificationPress = (notification) => {
    markApiNotificationAsRead(notification.id); // Funciona en modo híbrido
  };
}
```

### **Diagnóstico del Sistema:**

```typescript
import AlarmStatus from '../components/AlarmStatus';

function SettingsScreen() {
  return (
    <AlarmStatus 
      showDetails={true} 
      onRepair={() => console.log('Sistema reparado')}
    />
  );
}
```

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2024  
**Compatibilidad:** React Native + Expo  
**Modo:** Híbrido (API + Local)
