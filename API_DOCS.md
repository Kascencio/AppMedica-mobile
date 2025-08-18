# RecuerdaMed API – Documentación de Endpoints

## Autenticación

### Registro de usuario
**POST** `/api/auth/register`

Body:
```json
{
  "email": "usuario@demo.com",
  "password": "123456",
  "role": "PATIENT" // o "CAREGIVER"
}
```
Respuesta:
```json
{ "token": "<jwt>" }
```

### Login
**POST** `/api/auth/login`

Body:
```json
{
  "email": "usuario@demo.com",
  "password": "123456"
}
```
Respuesta:
```json
{ "token": "<jwt>" }
```

---

## Pacientes

### Obtener perfil de paciente
**GET** `/api/patients/me`

Headers:
- `Authorization: Bearer <token>`

### Actualizar perfil de paciente
**PUT** `/api/patients/me`

Body (ejemplo):
```json
{
  "name": "Juan Pérez",
  "age": 65,
  "weight": 70,
  "height": 170,
  "allergies": "Penicilina",
  "reactions": "Rash",
  "doctorName": "Dr. López",
  "doctorContact": "555-1234",
  "photoUrl": "https://..."
}
```

---

## Medicamentos

### Listar medicamentos
**GET** `/api/medications?patientProfileId=<id>`

Headers:
- `Authorization: Bearer <token>`

### Crear medicamento
**POST** `/api/medications`

Body:
```json
{
  "patientProfileId": "<id>",
  "name": "Paracetamol",
  "dosage": "500mg",
  "frequency": "daily",
  "startDate": "2024-08-17T10:00:00.000Z"
}
```

### Actualizar medicamento
**PATCH** `/api/medications/:id`

Body (solo los campos a actualizar):
```json
{
  "patientProfileId": "<id>",
  "name": "Ibuprofeno"
}
```

### Eliminar medicamento
**DELETE** `/api/medications/:id?patientProfileId=<id>`

---

## Citas

### Listar citas
**GET** `/api/appointments?patientProfileId=<id>`

### Crear cita
**POST** `/api/appointments`

Body:
```json
{
  "patientProfileId": "<id>",
  "title": "Consulta general",
  "dateTime": "2024-08-18T09:00:00.000Z"
}
```

### Actualizar cita
**PATCH** `/api/appointments/:id`

### Eliminar cita
**DELETE** `/api/appointments/:id?patientProfileId=<id>`

---

## Tratamientos

### Listar tratamientos
**GET** `/api/treatments?patientProfileId=<id>`

### Crear tratamiento
**POST** `/api/treatments`

Body:
```json
{
  "patientProfileId": "<id>",
  "title": "Fisioterapia",
  "startDate": "2024-08-17T10:00:00.000Z"
}
```

### Actualizar tratamiento
**PATCH** `/api/treatments/:id`

### Eliminar tratamiento
**DELETE** `/api/treatments/:id?patientProfileId=<id>`

---

## Eventos de adherencia

### Listar eventos
**GET** `/api/intake-events?patientProfileId=<id>`

### Registrar evento
**POST** `/api/intake-events`

Body:
```json
{
  "patientProfileId": "<id>",
  "kind": "MED",
  "refId": "<id de medicamento o tratamiento>",
  "scheduledFor": "2024-08-17T10:00:00.000Z",
  "action": "TAKEN"
}
```

---

## Suscripciones push

### Registrar suscripción
**POST** `/api/subscribe`

Body:
```json
{
  "endpoint": "https://...",
  "p256dh": "...",
  "auth": "..."
}
```

### Eliminar suscripción
**DELETE** `/api/subscribe?endpoint=<url>`

---

## Notas
- Todos los endpoints protegidos requieren el header `Authorization: Bearer <token>`.
- Usa los IDs reales obtenidos de los endpoints de perfil, medicamentos, etc.
- Los campos de fechas deben estar en formato ISO 8601.
- Los errores se devuelven en formato JSON con campos `error` y `message`.
