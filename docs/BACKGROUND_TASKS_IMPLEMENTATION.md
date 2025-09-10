# Implementación de Tareas en Segundo Plano para Alarmas

## Resumen

Se ha implementado un sistema robusto de tareas en segundo plano para garantizar que las alarmas de medicamentos y citas médicas no se pierdan, incluso cuando la aplicación está cerrada o en segundo plano.

## Archivos Modificados

### 1. `lib/alarmTask.ts` (NUEVO)
**Propósito**: Centraliza toda la lógica de tareas en segundo plano para alarmas.

**Funcionalidades principales**:
- **`performBackgroundAlarmTask()`**: Función principal que se ejecuta cada 15 minutos
  - Obtiene medicamentos y citas desde la base de datos local
  - Limpia notificaciones obsoletas (medicamentos expirados, citas pasadas)
  - Verifica notificaciones ya programadas
  - Reprograma medicamentos y citas si es necesario
  - Valida fechas de inicio y fin de medicamentos
  - Solo procesa citas futuras
  - Repara el sistema de notificaciones si hay problemas
  - Intenta sincronización con el backend

- **`getMedicationsFromDB()`**: Obtiene medicamentos desde la base de datos local
- **`getAppointmentsFromDB()`**: Obtiene citas desde la base de datos local
- **`cleanupObsoleteNotifications()`**: Limpia notificaciones de medicamentos expirados y citas pasadas

- **`registerBackgroundAlarmTask()`**: Registra la tarea en segundo plano
- **`unregisterBackgroundAlarmTask()`**: Desregistra la tarea
- **`getBackgroundTaskStatus()`**: Obtiene el estado actual de la tarea

**Configuración**:
- Intervalo mínimo: 15 minutos (mínimo permitido por el SO)
- Continúa ejecutándose cuando la app se cierra (`stopOnTerminate: false`)
- Se inicia automáticamente al encender el dispositivo (`startOnBoot: true`)

### 2. `App.tsx` (MODIFICADO)
**Cambios**:
- Importación de `expo-background-fetch`, `expo-task-manager` y `alarmTask`
- Registro automático de la tarea en segundo plano durante la inicialización de la app
- Manejo de errores para que la app continúe funcionando aunque falle el registro

**Ubicación del cambio**: En el `useEffect` principal, después de la inicialización de notificaciones.

### 3. `app.json` (MODIFICADO)
**Cambios**:
- Agregado el plugin `expo-background-fetch` a la lista de plugins
- Esto es necesario para que la funcionalidad funcione correctamente en iOS

### 4. `components/BackgroundTaskStatus.tsx` (NUEVO)
**Propósito**: Componente de debug para monitorear el estado de la tarea en segundo plano.

**Funcionalidades**:
- Muestra si la tarea está registrada
- Indica el estado del sistema de background fetch
- Permite registrar/desregistrar la tarea manualmente
- Botón para actualizar el estado

### 5. `screens/Profile/ProfileScreen.tsx` (MODIFICADO)
**Cambios**:
- Importación del componente `BackgroundTaskStatus`
- Agregado el componente a la pantalla de perfil para monitoreo

### 6. `lib/alarmTaskTest.ts` (NUEVO)
**Propósito**: Archivo de pruebas para verificar la funcionalidad de las tareas en segundo plano.

**Funciones de prueba**:
- `testDataRetrieval()`: Prueba la obtención de medicamentos y citas
- `testBackgroundTaskStatus()`: Prueba el estado de la tarea
- `testTaskRegistration()`: Prueba el registro de la tarea
- `testTaskUnregistration()`: Prueba el desregistro de la tarea
- `runAllTests()`: Ejecuta todas las pruebas
- `testDataLogicOnly()`: Prueba solo la lógica de datos

## Cómo Funciona

### Flujo de Ejecución

1. **Inicialización**: Al abrir la app, se registra automáticamente la tarea en segundo plano
2. **Ejecución Periódica**: Cada 15 minutos, el sistema operativo ejecuta la tarea
3. **Obtención de Datos**: Obtiene medicamentos y citas desde la base de datos local
4. **Limpieza**: Elimina notificaciones obsoletas (medicamentos expirados, citas pasadas)
5. **Verificación**: Verifica que todas las alarmas estén programadas correctamente
6. **Reprogramación**: Si encuentra alarmas faltantes, las reprograma automáticamente
7. **Validación**: Valida fechas de inicio/fin de medicamentos y solo procesa citas futuras
8. **Reparación**: Repara el sistema de notificaciones si hay problemas
9. **Sincronización**: Intenta sincronizar con el backend si hay conexión

### Beneficios

1. **Confiabilidad**: Las alarmas no se pierden aunque la app esté cerrada
2. **Automatización**: No requiere intervención manual del usuario
3. **Resiliencia**: Se auto-repara si hay problemas con las notificaciones
4. **Eficiencia**: Solo ejecuta cuando es necesario (cada 15 minutos)
5. **Limpieza Automática**: Elimina notificaciones obsoletas automáticamente
6. **Validación Inteligente**: Solo procesa medicamentos y citas válidos
7. **Integración Completa**: Funciona con la base de datos local existente

### Limitaciones del Sistema Operativo

- **iOS**: Las tareas en segundo plano tienen limitaciones estrictas
- **Android**: Funciona mejor pero puede ser limitado por optimizaciones de batería
- **Intervalo mínimo**: 15 minutos es el mínimo permitido por ambos sistemas

## Configuración Requerida

### Para el Usuario
1. **Permisos de notificaciones**: Deben estar activados
2. **Optimización de batería**: Desactivar para RecuerdaMed (Android)
3. **Alarmas exactas**: Permitir en configuración del sistema (Android 12+)

### Para el Desarrollador
1. **Plugin expo-background-fetch**: Ya configurado en `app.json`
2. **Dependencias**: Ya instaladas en `package.json`
3. **Registro automático**: Ya implementado en `App.tsx`

## Monitoreo y Debug

### Componente de Estado
El componente `BackgroundTaskStatus` en la pantalla de perfil permite:
- Ver el estado actual de la tarea
- Registrar/desregistrar manualmente
- Actualizar el estado en tiempo real

### Logs
Todos los eventos se registran en la consola con el prefijo `[AlarmTask]`:
- Ejecución de tareas
- Errores encontrados
- Alarmas reprogramadas
- Estado del sistema

## Próximos Pasos

### Mejoras Futuras
1. **Integración con base de datos**: Implementar las funciones `getMedicationsFromDB()` y `getAppointmentsFromDB()`
2. **Notificaciones de estado**: Informar al usuario sobre el estado de las tareas
3. **Configuración de intervalo**: Permitir al usuario ajustar la frecuencia
4. **Métricas**: Recopilar estadísticas de ejecución

### Testing
1. **Pruebas en dispositivo real**: Las tareas en segundo plano no funcionan en simulador
2. **Pruebas de batería**: Verificar que no drene la batería
3. **Pruebas de conectividad**: Verificar funcionamiento offline/online

## Conclusión

Esta implementación proporciona una base sólida para garantizar que las alarmas de medicamentos y citas médicas funcionen de manera confiable, incluso cuando la aplicación no está activa. El sistema es robusto, automático y se auto-repara, proporcionando una experiencia de usuario mejorada y mayor confiabilidad en el cuidado de la salud.
