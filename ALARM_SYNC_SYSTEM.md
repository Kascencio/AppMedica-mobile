# Sistema de Alarmas Sincronizado - RecuerdaMed

## 🎯 Resumen

Se ha implementado un sistema completo de alarmas que sincroniza automáticamente entre la aplicación local (React Native) y el backend del servidor, proporcionando una experiencia unificada y confiable para recordatorios de medicamentos, citas y tratamientos.

## 📁 Arquitectura del Sistema

### Componentes Principales

1. **`alarmApiService.ts`** - Servicio de API REST para comunicación con el backend
2. **`alarmSyncService.ts`** - Servicio de sincronización bidireccional local/backend
3. **`alarmAppInitializer.ts`** - Inicializador del sistema completo
4. **`useSyncedAlarms.ts`** - Hook React para uso fácil en componentes
5. **Stores actualizados** - `useMedications.ts`, `useAppointments.ts`, `useTreatments.ts`

### Flujo de Datos

```
[App Local] ←→ [alarmSyncService] ←→ [alarmApiService] ←→ [Backend REST API]
     ↓
[Notificaciones Locales] + [Efectos de Alarma]
```

## 🚀 Inicialización Automática

El sistema se inicializa automáticamente en `App.tsx` después del login:

```typescript
// Se ejecuta automáticamente al obtener el perfil del usuario
await alarmAppInitializer.initialize();
```

### Pasos de Inicialización:
1. ✅ Configurar sistema de notificaciones local
2. ✅ Verificar permisos y canales
3. 🌐 Sincronizar alarmas desde el backend (si hay conexión)
4. ⏰ Programar alarmas locales
5. 🔄 Configurar sincronización automática cada 30 minutos

## 📱 Uso en Stores

### Medicamentos (`useMedications.ts`)

```typescript
// Al crear medicamento con alarma
const alarmConfig = {
  title: `${medicamento.name} - ${medicamento.dosage}`,
  description: `Tomar medicamento: ${medicamento.name}`,
  scheduledTime: new Date(),
  frequency: 'daily' as const,
  reminderMinutes: 0,
  snoozeDuration: 10,
  maxSnoozes: 3,
};

await alarmSyncService.createSyncedAlarm('medication', medicamento.id, alarmConfig);
```

**Características:**
- ✅ Creación automática en backend y local
- ✅ Fallback a solo local si falla backend
- ✅ Actualización sincronizada
- ✅ Eliminación sincronizada

### Citas y Tratamientos
Similar implementación en `useAppointments.ts` y `useTreatments.ts` con tipos `'appointment'` y `'treatment'`.

## 🎯 Uso en Componentes

### Hook `useSyncedAlarms`

```typescript
import { useSyncedAlarms } from '../hooks/useSyncedAlarms';

function MiComponente() {
  const { 
    isInitialized,
    isOnline,
    upcomingAlarms,
    createAlarm,
    updateAlarm,
    deleteAlarm,
    snoozeAlarm,
    dismissAlarm,
    forceSync
  } = useSyncedAlarms();
  
  // Crear alarma
  const crearAlarma = async () => {
    await createAlarm('medication', 'med-123', {
      title: 'Paracetamol - 500mg',
      scheduledTime: new Date(),
      frequency: 'daily'
    });
  };
  
  return (
    <View>
      <Text>Estado: {isInitialized ? '✅ Listo' : '⏳ Inicializando'}</Text>
      <Text>Conexión: {isOnline ? '🌐 Online' : '📱 Offline'}</Text>
      <Text>Próximas alarmas: {upcomingAlarms.length}</Text>
    </View>
  );
}
```

## ⚡ Acciones de Usuario

### En AlarmScreen.tsx

```typescript
// Al posponer alarma
await alarmSyncService.snoozeAlarm(backendAlarmId);

// Al completar alarma
await alarmSyncService.dismissAlarm(backendAlarmId);
```

**Beneficios:**
- ✅ Acciones sincronizadas en tiempo real
- ✅ Fallback automático si no hay conexión
- ✅ Estado consistente entre dispositivos

## 🔄 Sincronización

### Automática
- **Al iniciar app**: Sincronización completa
- **Cada 30 minutos**: Sincronización de fondo
- **Después de acciones**: Actualización inmediata

### Manual
```typescript
const { forceSync } = useSyncedAlarms();
await forceSync(); // Forzar sincronización
```

## 🌐 Endpoints del Backend

```typescript
// Configuración en constants/config.ts
ALARMS: {
  BASE: '/api/alarms',
  BY_TYPE: '/api/alarms/by-type/:type',
  FROM_MEDICATION: '/api/alarms/from-medication/:medicationId',
  SNOOZE: '/api/alarms/:id/snooze',
  DISMISS: '/api/alarms/:id/dismiss',
  UPCOMING: '/api/alarms/upcoming',
  STATS: '/api/alarms/alarm-stats',
  // ... más endpoints
}
```

## 📊 Tipos de Datos

### BackendAlarm
```typescript
interface BackendAlarm {
  id: string;
  type: 'MEDICATION' | 'APPOINTMENT' | 'TREATMENT';
  referenceId: string; // ID del medicamento/cita/tratamiento
  patientProfileId: string;
  title: string;
  description?: string;
  scheduledTime: string;
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  repeatDays?: number[];
  reminderMinutes?: number;
  snoozeDuration: number;
  maxSnoozes: number;
  snoozeCount: number;
  isActive: boolean;
  isCompleted: boolean;
}
```

## 🔧 Configuración

### Variables de Entorno
```typescript
// constants/config.ts
API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL,
  ENDPOINTS: {
    ALARMS: { /* configuración de endpoints */ }
  }
}
```

## 🛠️ Mantenimiento

### Logs y Debugging
```typescript
// Activar logs detallados
console.log('[AlarmSyncService] 🔄 Iniciando sincronización...');
console.log('[AlarmAppInitializer] ✅ Sistema inicializado');
```

### Estados de Error
- **Sin conexión**: Funciona solo local
- **Backend no disponible**: Fallback a operaciones locales
- **Permisos denegados**: Muestra alertas al usuario

## 📋 Checklist de Migración

Para proyectos existentes que quieran adoptar este sistema:

- [ ] Importar archivos del sistema de alarmas sincronizado
- [ ] Agregar endpoints ALARMS a la configuración de API
- [ ] Actualizar stores para usar `alarmSyncService`
- [ ] Inicializar sistema en `App.tsx`
- [ ] Actualizar componentes de alarma para usar `useSyncedAlarms`
- [ ] Configurar backend REST API con endpoints requeridos

## 🎉 Beneficios

✅ **Sincronización automática** entre dispositivos  
✅ **Trabajo offline** con sincronización posterior  
✅ **Fallback robusto** si falla el backend  
✅ **Inicialización automática** sin configuración manual  
✅ **API simple** con hooks de React  
✅ **Logging completo** para debugging  
✅ **Tipos TypeScript** para mejor DX  

---

## 💡 Próximos Pasos

1. **Integrar con useAppointments y useTreatments**
2. **Implementar resolución de conflictos** para cambios simultáneos
3. **Agregar métricas** de sincronización
4. **Crear tests unitarios** para el sistema
5. **Optimizar sincronización** para grandes volúmenes de alarmas