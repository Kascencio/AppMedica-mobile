# 📢 API de Notificaciones y Alarmas - RecuerdaMed

Documentación completa de las APIs disponibles para el sistema de notificaciones y alarmas de la aplicación médica RecuerdaMed.

## 📋 Tabla de Contenidos

- [Autenticación](#autenticación)
- [Endpoints Disponibles](#endpoints-disponibles)
- [Tipos de Notificaciones](#tipos-de-notificaciones)
- [Prioridades](#prioridades)
- [Estados de Notificación](#estados-de-notificación)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Códigos de Error](#códigos-de-error)

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante JWT token en el header:

```http
Authorization: Bearer <tu_token_jwt>
```

## 🚀 Endpoints Disponibles

### 1. Health Check del Sistema

Verifica el estado del sistema de notificaciones.

```http
GET /api/notifications/health
```

**Respuesta exitosa:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalNotifications": 150,
  "message": "Sistema de notificaciones funcionando correctamente"
}
```

**Respuesta con error:**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Error conectando con la base de datos"
}
```

### 2. Obtener Notificaciones del Usuario

Obtiene las notificaciones del usuario autenticado con filtros avanzados.

```http
GET /api/notifications
```

**Parámetros de consulta opcionales:**

| Parámetro | Tipo | Descripción | Valores |
|-----------|------|-------------|---------|
| `status` | string | Estado de la notificación | `UNREAD`, `READ`, `ARCHIVED` |
| `type` | string | Tipo de notificación | Ver [Tipos de Notificaciones](#tipos-de-notificaciones) |
| `priority` | string | Prioridad de la notificación | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `search` | string | Búsqueda en título y mensaje | Texto libre |
| `fromDate` | string | Fecha desde (ISO 8601) | `2024-01-01T00:00:00.000Z` |
| `toDate` | string | Fecha hasta (ISO 8601) | `2024-01-31T23:59:59.000Z` |
| `page` | number | Número de página | `1`, `2`, `3`... |
| `pageSize` | number | Elementos por página (máx 100) | `10`, `20`, `50` |

**Ejemplo de consulta:**
```http
GET /api/notifications?status=UNREAD&type=MEDICATION_REMINDER&priority=HIGH&page=1&pageSize=10
```

**Respuesta:**
```json
{
  "items": [
    {
      "id": "notif_123",
      "type": "MEDICATION_REMINDER",
      "title": "Recordatorio de medicamento",
      "message": "Es hora de tomar tu Paracetamol",
      "priority": "HIGH",
      "status": "UNREAD",
      "metadata": {
        "medicationId": "med_456",
        "dosage": "500mg",
        "frequency": "cada 8 horas"
      },
      "scheduledFor": "2024-01-15T10:00:00.000Z",
      "readAt": null,
      "createdAt": "2024-01-15T09:55:00.000Z",
      "updatedAt": "2024-01-15T09:55:00.000Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  },
  "filters": {
    "status": "UNREAD",
    "type": "MEDICATION_REMINDER",
    "priority": "HIGH"
  }
}
```

### 3. Crear Nueva Notificación

Crea una nueva notificación para un usuario específico.

```http
POST /api/notifications
```

**Body requerido:**
```json
{
  "userId": "user_123",
  "type": "MEDICATION_REMINDER",
  "title": "Recordatorio de medicamento",
  "message": "Es hora de tomar tu medicamento",
  "priority": "HIGH",
  "metadata": {
    "medicationId": "med_456",
    "dosage": "500mg",
    "frequency": "cada 8 horas"
  },
  "scheduledFor": "2024-01-15T10:00:00.000Z"
}
```

**Campos del body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `userId` | string | ✅ | ID del usuario destinatario |
| `type` | string | ✅ | Tipo de notificación |
| `title` | string | ✅ | Título de la notificación (máx 200 chars) |
| `message` | string | ✅ | Mensaje de la notificación (máx 1000 chars) |
| `priority` | string | ❌ | Prioridad (por defecto: MEDIUM) |
| `metadata` | object | ❌ | Datos adicionales en formato JSON |
| `scheduledFor` | string | ❌ | Fecha programada (ISO 8601) |

**Respuesta exitosa (201):**
```json
{
  "id": "notif_789",
  "userId": "user_123",
  "type": "MEDICATION_REMINDER",
  "title": "Recordatorio de medicamento",
  "message": "Es hora de tomar tu medicamento",
  "priority": "HIGH",
  "status": "UNREAD",
  "metadata": {
    "medicationId": "med_456",
    "dosage": "500mg",
    "frequency": "cada 8 horas"
  },
  "scheduledFor": "2024-01-15T10:00:00.000Z",
  "createdAt": "2024-01-15T09:55:00.000Z",
  "updatedAt": "2024-01-15T09:55:00.000Z",
  "message": "Notificación creada exitosamente"
}
```

### 4. Obtener Notificación Específica

Obtiene los detalles de una notificación específica.

```http
GET /api/notifications/:id
```

**Respuesta:**
```json
{
  "id": "notif_123",
  "userId": "user_123",
  "type": "MEDICATION_REMINDER",
  "title": "Recordatorio de medicamento",
  "message": "Es hora de tomar tu medicamento",
  "priority": "HIGH",
  "status": "UNREAD",
  "metadata": {
    "medicationId": "med_456",
    "dosage": "500mg"
  },
  "scheduledFor": "2024-01-15T10:00:00.000Z",
  "readAt": null,
  "createdAt": "2024-01-15T09:55:00.000Z",
  "updatedAt": "2024-01-15T09:55:00.000Z"
}
```

### 5. Marcar Notificación como Leída

Marca una notificación específica como leída.

```http
PATCH /api/notifications/:id/read
```

**Respuesta:**
```json
{
  "id": "notif_123",
  "userId": "user_123",
  "type": "MEDICATION_REMINDER",
  "title": "Recordatorio de medicamento",
  "message": "Es hora de tomar tu medicamento",
  "priority": "HIGH",
  "status": "READ",
  "readAt": "2024-01-15T10:05:00.000Z",
  "createdAt": "2024-01-15T09:55:00.000Z",
  "updatedAt": "2024-01-15T10:05:00.000Z",
  "message": "Notificación marcada como leída exitosamente"
}
```

### 6. Archivar Notificación

Archiva una notificación específica.

```http
PATCH /api/notifications/:id/archive
```

**Respuesta:**
```json
{
  "id": "notif_123",
  "userId": "user_123",
  "type": "MEDICATION_REMINDER",
  "title": "Recordatorio de medicamento",
  "message": "Es hora de tomar tu medicamento",
  "priority": "HIGH",
  "status": "ARCHIVED",
  "createdAt": "2024-01-15T09:55:00.000Z",
  "updatedAt": "2024-01-15T10:10:00.000Z",
  "message": "Notificación archivada exitosamente"
}
```

### 7. Actualizar Notificación

Actualiza los campos de una notificación existente.

```http
PATCH /api/notifications/:id
```

**Body (campos opcionales):**
```json
{
  "title": "Nuevo título actualizado",
  "message": "Nuevo mensaje actualizado",
  "priority": "MEDIUM",
  "metadata": {
    "updated": true,
    "newField": "valor"
  },
  "scheduledFor": "2024-01-15T11:00:00.000Z"
}
```

**Respuesta:**
```json
{
  "id": "notif_123",
  "userId": "user_123",
  "type": "MEDICATION_REMINDER",
  "title": "Nuevo título actualizado",
  "message": "Nuevo mensaje actualizado",
  "priority": "MEDIUM",
  "status": "UNREAD",
  "metadata": {
    "updated": true,
    "newField": "valor"
  },
  "scheduledFor": "2024-01-15T11:00:00.000Z",
  "createdAt": "2024-01-15T09:55:00.000Z",
  "updatedAt": "2024-01-15T10:15:00.000Z",
  "message": "Notificación actualizada exitosamente"
}
```

### 8. Eliminar Notificación

Elimina permanentemente una notificación.

```http
DELETE /api/notifications/:id
```

**Respuesta:** `204 No Content`

### 9. Obtener Estadísticas

Obtiene estadísticas detalladas de las notificaciones del usuario.

```http
GET /api/notifications/stats
```

**Respuesta:**
```json
{
  "total": 150,
  "unread": 25,
  "read": 100,
  "archived": 25,
  "percentages": {
    "unread": 17,
    "read": 67,
    "archived": 17
  },
  "byType": {
    "MEDICATION_REMINDER": 80,
    "APPOINTMENT_REMINDER": 30,
    "TREATMENT_UPDATE": 15,
    "EMERGENCY_ALERT": 5,
    "SYSTEM_MESSAGE": 35,
    "CAREGIVER_REQUEST": 8,
    "PERMISSION_UPDATE": 12,
    "GENERAL_INFO": 25
  },
  "byPriority": {
    "LOW": 20,
    "MEDIUM": 80,
    "HIGH": 40,
    "URGENT": 10
  },
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

### 10. Marcar Múltiples Notificaciones como Leídas

Marca varias notificaciones como leídas en una sola operación.

```http
PATCH /api/notifications/bulk/read
```

**Body:**
```json
{
  "ids": ["notif_123", "notif_456", "notif_789"]
}
```

**Respuesta:**
```json
{
  "message": "Notificaciones marcadas como leídas exitosamente",
  "processed": 3,
  "total": 3
}
```

### 11. Limpiar Notificaciones Antiguas

Elimina notificaciones archivadas de más de 90 días.

```http
DELETE /api/notifications/cleanup/old
```

**Respuesta:**
```json
{
  "message": "Limpieza completada exitosamente",
  "deletedCount": 15,
  "cutoffDate": "2024-10-17T10:30:00.000Z"
}
```

## 📋 Tipos de Notificaciones

| Tipo | Descripción | Uso Típico |
|------|-------------|------------|
| `MEDICATION_REMINDER` | Recordatorios de medicamentos | Alertas para tomar medicamentos |
| `APPOINTMENT_REMINDER` | Recordatorios de citas médicas | Recordatorios de consultas |
| `TREATMENT_UPDATE` | Actualizaciones de tratamientos | Cambios en tratamientos |
| `EMERGENCY_ALERT` | Alertas de emergencia | Situaciones críticas |
| `SYSTEM_MESSAGE` | Mensajes del sistema | Actualizaciones del sistema |
| `CAREGIVER_REQUEST` | Solicitudes de cuidadores | Peticiones de acceso |
| `PERMISSION_UPDATE` | Actualizaciones de permisos | Cambios en permisos |
| `GENERAL_INFO` | Información general | Noticias y avisos |

## ⚡ Prioridades

| Prioridad | Descripción | Color Sugerido |
|-----------|-------------|----------------|
| `LOW` | Baja prioridad | Verde |
| `MEDIUM` | Prioridad media (por defecto) | Amarillo |
| `HIGH` | Alta prioridad | Naranja |
| `URGENT` | Urgente | Rojo |

## 📊 Estados de Notificación

| Estado | Descripción |
|--------|-------------|
| `UNREAD` | No leída |
| `READ` | Leída |
| `ARCHIVED` | Archivada |

## 💡 Ejemplos de Uso

### Ejemplo 1: Crear Recordatorio de Medicamento

```bash
curl -X POST http://72.60.30.129:3001/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "type": "MEDICATION_REMINDER",
    "title": "Hora del medicamento",
    "message": "Es momento de tomar tu Paracetamol 500mg",
    "priority": "HIGH",
    "metadata": {
      "medicationId": "med_456",
      "dosage": "500mg",
      "time": "10:00 AM",
      "frequency": "cada 8 horas"
    },
    "scheduledFor": "2024-01-15T10:00:00.000Z"
  }'
```

### Ejemplo 2: Obtener Notificaciones No Leídas de Alta Prioridad

```bash
curl -X GET "http://72.60.30.129:3001/api/notifications?status=UNREAD&priority=HIGH&page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Ejemplo 3: Marcar Notificación como Leída

```bash
curl -X PATCH http://72.60.30.129:3001/api/notifications/notif_123/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Ejemplo 4: Crear Alerta de Emergencia

```bash
curl -X POST http://72.60.30.129:3001/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "type": "EMERGENCY_ALERT",
    "title": "¡ALERTA MÉDICA!",
    "message": "Se ha detectado una reacción alérgica. Contacta a tu médico inmediatamente.",
    "priority": "URGENT",
    "metadata": {
      "allergen": "Penicilina",
      "severity": "high",
      "action": "contact_doctor",
      "emergencyContact": "555-1234"
    }
  }'
```

### Ejemplo 5: Recordatorio de Cita Médica

```bash
curl -X POST http://72.60.30.129:3001/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "type": "APPOINTMENT_REMINDER",
    "title": "Recordatorio de cita médica",
    "message": "Tienes una cita con el Dr. López mañana a las 9:00 AM",
    "priority": "MEDIUM",
    "metadata": {
      "doctorName": "Dr. López",
      "appointmentDate": "2024-01-16T09:00:00.000Z",
      "location": "Clínica Central",
      "room": "Consultorio 5"
    },
    "scheduledFor": "2024-01-15T20:00:00.000Z"
  }'
```

### Ejemplo 6: Marcar Múltiples Notificaciones como Leídas

```bash
curl -X PATCH http://72.60.30.129:3001/api/notifications/bulk/read \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["notif_123", "notif_456", "notif_789", "notif_101"]
  }'
```

### Ejemplo 7: Obtener Estadísticas

```bash
curl -X GET http://72.60.30.129:3001/api/notifications/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Ejemplo 8: Buscar Notificaciones por Texto

```bash
curl -X GET "http://72.60.30.129:3001/api/notifications?search=paracetamol&status=UNREAD" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ❌ Códigos de Error

| Código | Error | Descripción |
|--------|-------|-------------|
| `400` | `VALIDATION_ERROR` | Datos de entrada inválidos |
| `400` | `INVALID_FILTERS` | Filtros de búsqueda inválidos |
| `403` | `NO_PERMISSION` | Sin permisos para la operación |
| `404` | `NOTIFICATION_NOT_FOUND` | Notificación no encontrada |
| `404` | `USER_NOT_FOUND` | Usuario destinatario no encontrado |
| `404` | `NO_NOTIFICATIONS_FOUND` | No se encontraron notificaciones |
| `500` | `INTERNAL_ERROR` | Error interno del servidor |

### Ejemplo de Respuesta de Error

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Datos de notificación inválidos",
  "details": [
    {
      "code": "invalid_string",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "userId es requerido",
      "path": ["userId"]
    }
  ]
}
```

## 🔒 Consideraciones de Seguridad

- **Autenticación requerida**: Todos los endpoints requieren token JWT válido
- **Autorización**: Los usuarios solo pueden acceder a sus propias notificaciones
- **Cuidadores**: Pueden crear notificaciones para pacientes con permisos apropiados
- **Validación**: Todos los datos de entrada son validados con Zod
- **Logging**: Todas las operaciones son registradas para auditoría

## 📝 Notas Importantes

- Los campos de fecha deben estar en formato ISO 8601
- El campo `metadata` acepta cualquier objeto JSON válido
- Las notificaciones se ordenan por prioridad (descendente) y fecha de creación (descendente)
- El sistema automáticamente limpia notificaciones archivadas de más de 90 días
- Los cuidadores pueden crear notificaciones para pacientes con permisos aceptados
- El campo `scheduledFor` permite programar notificaciones para el futuro

---

**Versión de la API:** 1.0.0  
**Última actualización:** Enero 2024

## 🧪 Ejemplos Reales de Prueba

### Paso 1: Obtener Token de Autenticación

```bash
# Registrar un nuevo usuario
curl -X POST http://72.60.30.129:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456",
    "role": "PATIENT"
  }'

# O hacer login con usuario existente
curl -X POST http://72.60.30.129:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
```

### Paso 2: Verificar el Sistema de Notificaciones

```bash
# Health check del sistema
curl -X GET http://72.60.30.129:3001/api/notifications/health \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Paso 3: Crear y Gestionar Notificaciones

```bash
# Crear una notificación de prueba
curl -X POST http://72.60.30.129:3001/api/notifications \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TU_USER_ID",
    "type": "MEDICATION_REMINDER",
    "title": "Recordatorio de medicamento",
    "message": "Es hora de tomar tu Paracetamol",
    "priority": "HIGH",
    "metadata": {
      "medicationId": "med_123",
      "dosage": "500mg"
    }
  }'

# Obtener notificaciones del usuario
curl -X GET "http://72.60.30.129:3001/api/notifications?status=UNREAD" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"

# Obtener estadísticas
curl -X GET http://72.60.30.129:3001/api/notifications/stats \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Respuestas Reales del Sistema

**Health Check:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-30T16:41:34.220Z",
  "totalNotifications": 0,
  "message": "Sistema de notificaciones funcionando correctamente"
}
```

**Crear Notificación:**
```json
{
  "id": "cmeyhof6b0004jxnlyc5dj4d9",
  "userId": "cmeyho0sw0000jxnl6gjxtjvx",
  "type": "MEDICATION_REMINDER",
  "title": "Recordatorio de medicamento",
  "message": "Es hora de tomar tu Paracetamol",
  "priority": "HIGH",
  "status": "UNREAD",
  "metadata": {
    "dosage": "500mg",
    "medicationId": "med_123"
  },
  "scheduledFor": null,
  "readAt": null,
  "createdAt": "2025-08-30T16:41:45.683Z",
  "updatedAt": "2025-08-30T16:41:45.683Z"
}
```

**Estadísticas:**
```json
{
  "total": 1,
  "unread": 0,
  "read": 1,
  "archived": 0,
  "percentages": {
    "unread": 0,
    "read": 100,
    "archived": 0
  },
  "byType": {
    "MEDICATION_REMINDER": 1
  },
  "byPriority": {
    "HIGH": 1
  },
  "lastUpdated": "2025-08-30T16:42:05.829Z"
}
```
