# Documentación de APIs - RecuerdaMed App

## Resumen General

La aplicación RecuerdaMed utiliza una arquitectura híbrida que combina:
- **Modo Online**: Sincronización directa con el servidor
- **Modo Offline**: Almacenamiento local con cola de sincronización
- **Base de datos local**: SQLite para persistencia offline

## Configuración Base

### URL Base
```
https://www.recuerdamed.org/api
```

### Headers por Defecto
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer <token>"
}
```

### Configuración de Timeout
- **Timeout**: 10 segundos
- **Reintentos**: 3 intentos
- **Delay entre reintentos**: 1 segundo

---

## 1. Autenticación

### 1.1 Login
**Endpoint**: `POST /auth/login`

**Datos enviados**:
```json
{
  "email": "usuario@demo.com",
  "password": "123456"
}
```

**Datos esperados**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.2 Registro
**Endpoint**: `POST /auth/register`

**Datos enviados**:
```json
{
  "email": "usuario@demo.com",
  "password": "123456",
  "role": "PATIENT", // o "CAREGIVER"
  "inviteCode": "ABC123" // opcional para cuidadores
}
```

**Datos esperados**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.3 Obtener Perfil
**Endpoint**: `GET /auth/me`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
{
  "id": "patient-123",
  "userId": "user-456",
  "name": "Juan Pérez",
  "birthDate": "1955-03-15",
  "gender": "M",
  "weight": 70,
  "height": 170,
  "bloodType": "O+",
  "allergies": "Penicilina",
  "doctorName": "Dr. López",
  "doctorContact": "555-1234",
  "photoUrl": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 2. Medicamentos

### 2.1 Obtener Medicamentos
**Endpoint**: `GET /medications?patientProfileId=<id>`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
{
  "items": [
    {
      "id": "med-123",
      "patientProfileId": "patient-123",
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "daily",
      "instructions": "Tomar con comida",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

### 2.2 Crear Medicamento
**Endpoint**: `POST /medications`

**Headers**: `Authorization: Bearer <token>`

**Datos enviados**:
```json
{
  "patientProfileId": "patient-123",
  "name": "Ibuprofeno",
  "dosage": "400mg",
  "frequency": "twice daily",
  "instructions": "Tomar con agua",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z"
}
```

**Datos esperados**:
```json
{
  "id": "med-456",
  "patientProfileId": "patient-123",
  "name": "Ibuprofeno",
  "dosage": "400mg",
  "frequency": "twice daily",
  "instructions": "Tomar con agua",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2.3 Actualizar Medicamento
**Endpoint**: `PUT /medications/:id`

**Headers**: `Authorization: Bearer <token>`

**Datos enviados**:
```json
{
  "patientProfileId": "patient-123",
  "name": "Ibuprofeno Actualizado",
  "dosage": "600mg"
}
```

### 2.4 Eliminar Medicamento
**Endpoint**: `DELETE /medications/:id?patientProfileId=<id>`

**Headers**: `Authorization: Bearer <token>`

---

## 3. Citas Médicas

### 3.1 Obtener Citas
**Endpoint**: `GET /appointments?patientProfileId=<id>`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
{
  "items": [
    {
      "id": "appt-123",
      "patientProfileId": "patient-123",
      "title": "Consulta General",
      "description": "Revisión de rutina",
      "dateTime": "2024-02-15T10:00:00.000Z",
      "location": "Clínica San José",
      "doctorName": "Dr. García",
      "status": "SCHEDULED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

### 3.2 Crear Cita
**Endpoint**: `POST /appointments`

**Headers**: `Authorization: Bearer <token>`

**Datos enviados**:
```json
{
  "patientProfileId": "patient-123",
  "title": "Consulta de Cardiología",
  "description": "Revisión cardiológica",
  "dateTime": "2024-02-20T14:30:00.000Z",
  "location": "Hospital Central",
  "doctorName": "Dr. Martínez"
}
```

---

## 4. Tratamientos

### 4.1 Obtener Tratamientos
**Endpoint**: `GET /treatments?patientProfileId=<id>`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
[
  {
    "id": "treat-123",
    "patientProfileId": "patient-123",
    "name": "Fisioterapia",
    "description": "Rehabilitación de rodilla",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-06-30T23:59:59.000Z",
    "frequency": "3 veces por semana",
    "notes": "Ejercicios de fortalecimiento",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 4.2 Crear Tratamiento
**Endpoint**: `POST /treatments`

**Headers**: `Authorization: Bearer <token>`

**Datos enviados**:
```json
{
  "patientProfileId": "patient-123",
  "name": "Terapia Respiratoria",
  "description": "Ejercicios de respiración",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-03-31T23:59:59.000Z",
  "frequency": "Diario",
  "notes": "Realizar por la mañana"
}
```

---

## 5. Eventos de Adherencia (Intake Events)

### 5.1 Obtener Eventos
**Endpoint**: `GET /intake-events?patientProfileId=<id>`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
[
  {
    "id": "intake-123",
    "patientProfileId": "patient-123",
    "kind": "MED", // "MED" o "TRT"
    "refId": "med-456", // ID del medicamento o tratamiento
    "scheduledFor": "2024-01-15T08:00:00.000Z",
    "action": "TAKEN", // "TAKEN", "SNOOZE", "SKIPPED"
    "notes": "Tomado con desayuno",
    "createdAt": "2024-01-15T08:05:00.000Z",
    "updatedAt": "2024-01-15T08:05:00.000Z"
  }
]
```

### 5.2 Registrar Evento
**Endpoint**: `POST /intake-events`

**Headers**: `Authorization: Bearer <token>`

**Datos enviados**:
```json
{
  "patientProfileId": "patient-123",
  "kind": "MED",
  "refId": "med-456",
  "scheduledFor": "2024-01-15T08:00:00.000Z",
  "action": "TAKEN",
  "notes": "Tomado con agua",
  "at": "2024-01-15T08:05:00.000Z"
}
```

---

## 6. Notas

### 6.1 Obtener Notas
**Endpoint**: `GET /notes?patientProfileId=<id>`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
[
  {
    "id": "note-123",
    "patientProfileId": "patient-123",
    "title": "Síntomas de hoy",
    "content": "Dolor de cabeza leve por la mañana",
    "date": "2024-01-15T00:00:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### 6.2 Crear Nota
**Endpoint**: `POST /notes`

**Headers**: `Authorization: Bearer <token>`

**Datos enviados**:
```json
{
  "patientProfileId": "patient-123",
  "title": "Consulta con doctor",
  "content": "El doctor recomendó aumentar la dosis",
  "date": "2024-01-15T00:00:00.000Z"
}
```

---

## 7. Notificaciones

### 7.1 Obtener Notificaciones
**Endpoint**: `GET /notifications`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page`: Número de página (default: 1)
- `pageSize`: Elementos por página (default: 20)
- `status`: `UNREAD`, `READ`, `ARCHIVED`
- `priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `type`: Tipo de notificación
- `search`: Búsqueda por texto

**Datos esperados**:
```json
{
  "data": [
    {
      "id": "notif-123",
      "userId": "user-456",
      "type": "MEDICATION_REMINDER",
      "title": "Hora de tomar medicamento",
      "message": "Es hora de tomar Paracetamol 500mg",
      "priority": "MEDIUM",
      "status": "UNREAD",
      "metadata": {
        "medicationId": "med-456",
        "scheduledTime": "2024-01-15T08:00:00.000Z"
      },
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-15T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 7.2 Marcar como Leída
**Endpoint**: `PATCH /notifications/:id/read`

**Headers**: `Authorization: Bearer <token>`

### 7.3 Estadísticas de Notificaciones
**Endpoint**: `GET /notifications/stats`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
{
  "total": 25,
  "unread": 5,
  "read": 18,
  "archived": 2,
  "percentages": {
    "unread": 20,
    "read": 72,
    "archived": 8
  },
  "byType": {
    "MEDICATION_REMINDER": 15,
    "APPOINTMENT_REMINDER": 8,
    "SYSTEM": 2
  },
  "byPriority": {
    "LOW": 10,
    "MEDIUM": 12,
    "HIGH": 3,
    "URGENT": 0
  },
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

---

## 8. Cuidadores y Permisos

### 8.1 Obtener Pacientes del Cuidador
**Endpoint**: `GET /caregivers/patients`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
[
  {
    "id": "patient-123",
    "name": "María García",
    "relationship": "Madre",
    "photoUrl": "https://...",
    "lastActivity": "2024-01-15T10:30:00.000Z"
  }
]
```

### 8.2 Generar Código de Invitación
**Endpoint**: `POST /caregivers/invite`

**Headers**: `Authorization: Bearer <token>`

**Datos esperados**:
```json
{
  "code": "ABC123",
  "expiresAt": "2024-02-15T00:00:00.000Z"
}
```

---

## 9. Sistema de Sincronización

### 9.1 Modo Online
- **Prioridad**: Servidor primero
- **Fallback**: Base de datos local si falla el servidor
- **Validación**: Requiere conexión para crear nuevos elementos

### 9.2 Modo Offline
- **Almacenamiento**: Base de datos local SQLite
- **Cola de sincronización**: Operaciones pendientes
- **Sincronización automática**: Al recuperar conexión

### 9.3 Estados de Sincronización
- `synced`: Sincronizado con el servidor
- `pending`: Pendiente de sincronización
- `failed`: Error en sincronización
- `isOffline`: Creado en modo offline

---

## 10. Manejo de Errores

### 10.1 Códigos de Estado HTTP
- `200`: Operación exitosa
- `201`: Recurso creado exitosamente
- `400`: Error en datos enviados
- `401`: No autenticado
- `403`: Sin permisos
- `404`: Recurso no encontrado
- `500`: Error interno del servidor

### 10.2 Estructura de Error
```json
{
  "error": "Mensaje de error",
  "message": "Descripción detallada",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

## 11. Consideraciones de Seguridad

### 11.1 Autenticación
- **JWT Tokens**: Para autenticación
- **Expiración**: Tokens con tiempo de vida limitado
- **Refresh**: Renovación automática de tokens

### 11.2 Validación
- **Datos de entrada**: Validación en cliente y servidor
- **Sanitización**: Limpieza de datos antes de procesar
- **Autorización**: Verificación de permisos por recurso

### 11.3 Privacidad
- **Datos médicos**: Encriptación en tránsito y reposo
- **Acceso**: Solo usuarios autorizados
- **Auditoría**: Registro de accesos y modificaciones

---

## 12. Optimizaciones de Rendimiento

### 12.1 Caché Local
- **SQLite**: Base de datos local para acceso rápido
- **Invalidación**: Actualización automática de caché
- **Compresión**: Optimización de datos almacenados

### 12.2 Paginación
- **Límites**: Máximo 20 elementos por página
- **Navegación**: Sistema de páginas eficiente
- **Filtros**: Reducción de datos transferidos

### 12.3 Sincronización Inteligente
- **Delta sync**: Solo cambios desde última sincronización
- **Batch operations**: Operaciones en lote
- **Retry logic**: Reintentos automáticos con backoff

---

## 13. Cambios Implementados para Compatibilidad con Backend

### 13.1 Estructura de Respuesta Actualizada

**ANTES (Estructura anterior):**
```json
{
  "data": [...],
  "pagination": {...}
}
```

**DESPUÉS (Nueva estructura del backend):**
```json
{
  "items": [...],
  "meta": {...}
}
```

### 13.2 Cambios en Stores

Todos los stores han sido actualizados para manejar ambas estructuras de respuesta:

- **useMedications**: Maneja `response.items` y `response.meta`
- **useAppointments**: Maneja `response.items` y `response.meta`
- **useTreatments**: Maneja `response.items` y `response.meta`
- **useIntakeEvents**: Maneja `response.items` y `response.meta`
- **useNotes**: Maneja `response.items` y `response.meta`
- **useNotifications**: Maneja `response.items` y `response.meta` + nuevas estadísticas
- **useCaregiver**: Maneja `response.items` y `response.meta`

### 13.3 Estadísticas de Notificaciones Mejoradas

**Nuevos campos agregados:**
- `percentages`: Porcentajes de notificaciones por estado
- `lastUpdated`: Timestamp de última actualización
- `byPriority`: Prioridades en formato UPPERCASE (LOW, MEDIUM, HIGH, URGENT)

### 13.4 Función Utilitaria

Se agregó `handleApiResponse()` en `constants/config.ts` para manejar respuestas de forma consistente:

```typescript
export function handleApiResponse<T>(response: any): {
  data: T[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### 13.5 Compatibilidad Retroactiva

Los cambios implementados mantienen compatibilidad con la estructura anterior mientras soportan la nueva estructura del backend, asegurando que la aplicación funcione correctamente en ambos casos.

---

Esta documentación proporciona una visión completa de cómo la aplicación RecuerdaMed interactúa con las APIs, qué datos envía y recibe, y cómo maneja los diferentes escenarios de conectividad.
