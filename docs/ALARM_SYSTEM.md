# Sistema de Alarmas Mejorado - RecuerdaMed

## Resumen de Mejoras

El sistema de alarmas ha sido completamente reescrito para resolver los problemas de funcionamiento y proporcionar una experiencia más robusta y confiable.

## Problemas Resueltos

### 1. **Notificaciones Duplicadas**
- **Antes**: Se creaban múltiples notificaciones para el mismo medicamento
- **Ahora**: Se cancelan las notificaciones existentes antes de crear nuevas

### 2. **Gestión de Fechas**
- **Antes**: No se manejaban correctamente las fechas de inicio y fin
- **Ahora**: Se respetan las fechas de inicio/fin y se cancelan automáticamente

### 3. **Frecuencias de Medicamentos**
- **Antes**: Solo soporte básico para frecuencia diaria
- **Ahora**: Soporte completo para diaria, semanal y mensual

### 4. **Persistencia de Notificaciones**
- **Antes**: Las notificaciones se perdían al cerrar la app
- **Ahora**: Se guardan en AsyncStorage y se restauran automáticamente

## Arquitectura del Sistema

### Componentes Principales

#### 1. **lib/notifications.ts**
Sistema central de notificaciones con funciones especializadas:

- `scheduleMedicationReminder()` - Alarmas de medicamentos
- `scheduleAppointmentReminder()` - Alarmas de citas
- `scheduleSnoozeMedication()` - Posponer medicamentos
- `cancelMedicationNotifications()` - Cancelar alarmas de medicamentos
- `cancelAppointmentNotifications()` - Cancelar alarmas de citas

#### 2. **hooks/useAlarms.ts**
Hook personalizado para manejar alarmas desde componentes:

```typescript
const { 
  alarms, 
  stats, 
  scheduleMedicationAlarm, 
  snoozeMedication,
  cancelMedicationAlarm 
} = useAlarms();
```

#### 3. **components/AlarmStatus.tsx**
Componente visual que muestra el estado de las alarmas:

- Contador de alarmas activas
- Próxima alarma programada
- Estadísticas por tipo (medicamentos, citas, pospuestas)

## Funcionalidades Clave

### 1. **Alarmas de Medicamentos**

#### Programación Inteligente
```typescript
await scheduleMedicationReminder({
  id: medication.id,
  name: medication.name,
  dosage: medication.dosage,
  time: medication.time,
  frequency: 'daily', // 'daily' | 'weekly' | 'monthly'
  startDate: new Date(medication.startDate),
  endDate: medication.endDate ? new Date(medication.endDate) : undefined,
  patientProfileId: profile.id
});
```

#### Características
- **Frecuencia Diaria**: Se repite todos los días a la misma hora
- **Frecuencia Semanal**: Se repite cada día de la semana
- **Frecuencia Mensual**: Se repite el mismo día del mes
- **Cancelación Automática**: Se cancelan cuando se alcanza la fecha de fin

### 2. **Alarmas de Citas**

#### Recordatorios Múltiples
```typescript
await scheduleAppointmentReminder({
  id: appointment.id,
  title: appointment.title,
  location: appointment.location,
  dateTime: new Date(appointment.dateTime),
  reminderMinutes: 60, // Recordatorio 1 hora antes
  patientProfileId: profile.id
});
```

#### Características
- **Recordatorio Personalizable**: Configurable en minutos antes de la cita
- **Notificación en el Momento**: Alarma cuando es hora de la cita
- **Información Completa**: Incluye ubicación y detalles de la cita

### 3. **Sistema de Posponer**

#### Posponer Medicamentos
```typescript
await scheduleSnoozeMedication({
  id: medication.id,
  name: medication.name,
  dosage: medication.dosage,
  snoozeMinutes: 10, // Posponer 10 minutos
  patientProfileId: profile.id
});
```

#### Características
- **Tiempo Configurable**: Se puede posponer por cualquier número de minutos
- **Notificación Especial**: Se marca como "pospuesta" para seguimiento
- **Integración con Adherencia**: Se registra en el historial de eventos

## Canales de Notificación (Android)

### 1. **Canal de Medicamentos**
- **Importancia**: ALTA
- **Vibración**: Patrón específico para medicamentos
- **Color**: Verde (#059669)
- **Sonido**: Activado

### 2. **Canal de Citas**
- **Importancia**: ALTA
- **Vibración**: Patrón específico para citas
- **Color**: Azul (#2563eb)
- **Sonido**: Activado

### 3. **Canal por Defecto**
- **Importancia**: MÁXIMA
- **Vibración**: Patrón estándar
- **Sonido**: Activado

## Gestión de Estado

### 1. **Almacenamiento Local**
- **AsyncStorage**: Persistencia de notificaciones programadas
- **Restauración**: Se restauran automáticamente al abrir la app
- **Sincronización**: Se mantienen sincronizadas con el sistema nativo

### 2. **Limpieza Automática**
- **Notificaciones Antiguas**: Se eliminan automáticamente después de 30 días
- **Fechas de Fin**: Se cancelan cuando se alcanza la fecha límite
- **Optimización**: Se ejecuta cada 24 horas en segundo plano

### 3. **Estadísticas en Tiempo Real**
```typescript
const stats = await getNotificationStats();
// {
//   scheduled: 15,        // Notificaciones programadas
//   stored: 15,           // Notificaciones en almacenamiento
//   types: {
//     medications: 8,      // Alarmas de medicamentos
//     appointments: 5,     // Alarmas de citas
//     snooze: 2           // Medicamentos pospuestos
//   }
// }
```

## Uso en Componentes

### 1. **HomeScreen**
```typescript
import { useAlarms } from '../hooks/useAlarms';

export default function HomeScreen() {
  const { snoozeMedication } = useAlarms();
  
  const handleSnooze = async () => {
    await snoozeMedication({
      id: medication.id,
      name: medication.name,
      dosage: medication.dosage,
      snoozeMinutes: 10
    });
  };
}
```

### 2. **MedicationsScreen**
```typescript
import { useAlarms } from '../hooks/useAlarms';

export default function MedicationsScreen() {
  const { scheduleMedicationAlarm, cancelMedicationAlarm } = useAlarms();
  
  const handleCreateMedication = async (medication) => {
    // Programar alarma automáticamente
    await scheduleMedicationAlarm({
      id: medication.id,
      name: medication.name,
      dosage: medication.dosage,
      time: medication.time,
      frequency: medication.frequency,
      startDate: new Date(medication.startDate),
      endDate: medication.endDate ? new Date(medication.endDate) : undefined
    });
  };
}
```

## Manejo de Errores

### 1. **Validaciones**
- **Hora Requerida**: No se programa sin hora especificada
- **Fechas Válidas**: Se verifican fechas de inicio y fin
- **Perfil de Usuario**: Se requiere perfil válido para programar

### 2. **Recuperación de Errores**
- **Fallback**: Si falla la programación, se registra el error
- **Reintentos**: Se pueden reintentar operaciones fallidas
- **Logging**: Se registran todos los errores para debugging

### 3. **Estados de Error**
```typescript
try {
  await scheduleMedicationAlarm(config);
} catch (error) {
  console.error('[Alarms] Error:', error);
  Alert.alert('Error', 'No se pudo programar la alarma');
}
```

## Testing y Debugging

### 1. **Verificar Estado**
```typescript
// Obtener todas las alarmas programadas
const scheduled = await getScheduledNotifications();
console.log('Alarmas programadas:', scheduled);

// Obtener estadísticas
const stats = await getNotificationStats();
console.log('Estadísticas:', stats);
```

### 2. **Limpiar Alarmas**
```typescript
// Cancelar todas las alarmas
await cancelAllNotifications();

// Limpiar alarmas antiguas
await cleanupOldNotifications();
```

### 3. **Logs del Sistema**
- **Programación**: Se registra cada alarma programada
- **Cancelación**: Se registra cada alarma cancelada
- **Errores**: Se registran todos los errores con contexto

## Mejoras Futuras

### 1. **Notificaciones Push**
- Integración con servidor para notificaciones remotas
- Sincronización entre dispositivos
- Notificaciones de emergencia

### 2. **Personalización Avanzada**
- Sonidos personalizados por tipo de alarma
- Patrones de vibración configurables
- Horarios de silencio (modo nocturno)

### 3. **Analytics**
- Seguimiento de adherencia a medicamentos
- Estadísticas de uso de alarmas
- Reportes de efectividad

## Conclusión

El nuevo sistema de alarmas proporciona:

✅ **Confiabilidad**: Manejo robusto de errores y recuperación automática
✅ **Flexibilidad**: Soporte para múltiples frecuencias y tipos de alarmas
✅ **Persistencia**: Las alarmas se mantienen activas entre sesiones
✅ **Integración**: Se integra perfectamente con el sistema de adherencia
✅ **Experiencia de Usuario**: Interfaz clara y feedback inmediato

Este sistema resuelve todos los problemas reportados y proporciona una base sólida para futuras mejoras.
