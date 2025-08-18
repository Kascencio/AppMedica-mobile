# Contexto del proyecto (Mobile – React Native/Expo) – RecuerdaMed

**Objetivo**: Definir TODAS las pantallas, navegación, estados, componentes, contratos de datos, notificaciones locales y funcionamiento **offline-first** para la app **móvil** (Android/iOS). Soporta roles **Paciente** y **Cuidador**, con CRUD de medicamentos, citas y tratamientos, y una **pantalla de alarma** a pantalla completa.

---

## 1) Lineamientos técnicos (obligatorios)

* **Stack**: React Native + **Expo** (SDK reciente), **TypeScript** estricto.
* **Estado**: **Zustand** (store por feature). Formularios con **react-hook-form** + **Zod**.
* **Persistencia offline**: **expo-sqlite** (o expo-sqlite-next). Capa **Repository/DAO**; sin ORM pesado.
* **Notificaciones locales**: **expo-notifications** (programadas, repetitivas, con categorías/acciones). Sonido/vibración configurables. Soporte `Snooze`.
* **Tareas en 2º plano**: **expo-task-manager** + **expo-background-fetch** para verificación y reprogramación de alarmas, y para recuperar consistencia si el SO mata procesos.
* **Navegación**: **@react-navigation/native** (Stack principal + Bottom Tabs). **Deep links**: `recuerdamed://...` para abrir `AlarmScreen` y rutas de entidad (med/treat/appt).
* **UI**: **nativewind (Tailwind RN)** o **Dripsy**. Evitar `boxShadow` no soportado; usar `elevation` (Android) y `shadow*` (iOS).
* **Medios/Imágenes**: **expo-image** + (opcional) ImageKit SDK HTTP si se usa backend propio.
* **Accesibilidad**: Soporte VoiceOver/TalkBack, tamaños de fuente grandes, `accessibilityLabel` y `pressRetentionOffset`.
* **Calidad**: ESLint/Prettier, tipado estricto, tests unitarios de lógica (schedulers) con Jest.

---

## 2) Modelo de datos (SQLite)

> Guardar **timezone** en entidades que disparan recordatorios. Fechas en ISO string (UTC) + helpers para conversión a local.

* **users** (mínimo local para perfil activo)

  * id (uuid), role ("PATIENT" | "CAREGIVER"), email, created\_at
* **patient\_profiles**

  * id (uuid), user\_id (fk), name, age, weight, height, allergies, reactions, doctor\_name, doctor\_contact, photo\_url, created\_at, updated\_at
* **medications**

  * id (uuid), patient\_profile\_id (fk), name, dosage, type, notes, start\_date, end\_date?, timezone, created\_at, updated\_at
* **medication\_schedules**

  * id (uuid), medication\_id (fk), frequency ("once"|"daily"|"weekly"|"custom"), times (JSON\["HH\:mm"]), days\_of\_week (JSON\[0-6]?) , custom\_rule (JSON?)
* **treatments**

  * id (uuid), patient\_profile\_id (fk), title, description, start\_date, end\_date?, progress, timezone, created\_at, updated\_at
* **treatment\_reminders**

  * id (uuid), treatment\_id (fk), times (JSON), days\_of\_week (JSON?), frequency (enum)
* **appointments**

  * id (uuid), patient\_profile\_id (fk), title (doctor\_name), description (notes+specialty), date\_time (ISO), location, status ("SCHEDULED"|"COMPLETED"|"CANCELLED"), created\_at, updated\_at
* **permissions** (para cuidador → pacientes asignados; puede sincronizarse de backend si aplica)

  * id (uuid), patient\_profile\_id, caregiver\_id, level ("READ"|"WRITE"|"ADMIN"), status ("PENDING"|"ACCEPTED"|"REJECTED")
* **intake\_events** (historial de adherencia)

  * id (uuid), kind ("MED"|"TRT"), ref\_id (fk), scheduled\_for (ISO), action ("TAKEN"|"SNOOZE"|"SKIPPED"), at (ISO), meta (JSON)
* **push\_subscriptions** (si se integra con backend propio)

  * id, device\_token/push\_token, platform, enabled, last\_error

---

## 3) Navegación (Stacks/Tabs + deep links)

```
RootStack
  ├─ OnboardingStack
  │    ├─ Welcome
  │    ├─ Permissions (notificaciones)
  │    └─ ProfileSetup (si PATIENT)
  ├─ AuthStack
  │    ├─ Login
  │    └─ Register
  ├─ AppTabs (role-aware)
  │    ├─ Home
  │    ├─ Medications
  │    ├─ Treatments
  │    ├─ Appointments
  │    └─ Settings
  ├─ CaregiversStack (role-aware)
  │    ├─ CaregiversList
  │    ├─ InviteCode
  │    └─ JoinByCode
  ├─ NotesStack
  │    ├─ Notes
  │    └─ NoteEditor
  ├─ AlarmScreen (full-screen, modalPresentation)
  └─ Error / Offline
```

**Deep links**

* `recuerdamed://alarm?kind=MED&id=<uuid>&at=<ISO>` → abre `AlarmScreen` y carga datos.
* `recuerdamed://medications/<id>` / `.../treatments/<id>` / `.../appointments/<id>`

---

## 4) Pantallas (detalle y componentes)

### 4.1 Onboarding

* **Welcome**: explicación breve, elegir rol, avanzar.
* **Permissions**: solicitar permiso de notificaciones → `expo-notifications` + registro de categorías (acciones: Tomar, Posponer 10m, Abrir).
* **ProfileSetup (Paciente)**: nombre, edad, alergias, médico; guardar en SQLite.

**Componentes**: `<Stepper>`, `<PermissionCard>`, `<ProfileFormMobile>`.

### 4.2 Auth

* **Login**: email, password, botón ingresar, link a registrarse.
* **Register**: email, password, confirmación, rol.

**Componentes**: `<AuthFormMobile>`, `<PasswordField>`.

### 4.3 Home (role-aware)

* **Paciente**: tarjetas de **Próximas tomas hoy**, **Próximas citas**, **Progreso semanal**. Botones rápidos: crear medicamento/cita/tratamiento.
* **Cuidador**: selector de **Paciente asignado** + tarjetas de próximos meds/appts del paciente seleccionado.

**Componentes**: `<StatsRow>`, `<UpcomingListMobile>`, `<PatientPicker>`.

### 4.4 Medicamentos

* **Medications (list)**: lista con búsqueda y filtros (activos, por día). CTA flotante **+**.
* **MedicationForm (create/edit)**: name, dosage, type, frequency, start/end, notes; **ScheduleBuilder** (times, days\_of\_week). Botones: Guardar, Probar notificación.
* **MedicationDetail** (opcional): muestra próximas tomas y historial asociado.

**Componentes**: `<MedicationCard>`, `<ScheduleBuilderMobile>`, `<ConfirmDialog>`.

### 4.5 Tratamientos

* **Treatments (list)**: tratamientos activos/finalizados, progreso.
* **TreatmentForm (create/edit)**: title, description, fechas, recordatorios (times), progreso. Acciones: Guardar, Finalizar.
* **TreatmentDetail** (opcional).

**Componentes**: `<TreatmentCard>`, `<ReminderEditorMobile>`, `<ProgressNotes>`.

### 4.6 Citas

* **Appointments (list)**: próximas y pasadas; estado SCHEDULED/COMPLETED/CANCELLED.
* **AppointmentForm (create/edit)**: doctor (title), description, date\_time, location. Acciones: Guardar, Completar, Cancelar.
* **Calendar** (opcional vista mensual/semana simplificada móvil) con popovers.

**Componentes**: `<AppointmentCard>`, `<AppointmentFormMobile>`, `<MiniCalendarMobile>`.

### 4.7 Notas

* **Notes (list)** y **NoteEditor**: notas médicas simples, etiquetas opcionales.

### 4.8 Cuidadores y permisos (role-aware)

* **CaregiversList (Paciente)**: lista con nivel (READ/WRITE/ADMIN) y estado (PENDING/ACCEPTED/REJECTED). Acciones: cambiar nivel, revocar.
* **InviteCode (Paciente)**: generar y compartir código.
* **JoinByCode (Cuidador)**: ingresar código → crea relación PENDING (o local hasta sync).

**Componentes**: `<InviteCodeCardMobile>`, `<PermissionsListMobile>`.

### 4.9 Settings

* **Settings**: tema, tiempos por defecto de posponer (5/10/15m), preferencias de notificación, info de cuenta (email), cambio de contraseña (si aplica con backend), zona horaria.

**Componentes**: `<ThemeToggleMobile>`, `<NotifPreferencesMobile>`, `<TimeZonePicker>`.

### 4.10 Historial y KPIs

* **History**: lista de `intake_events` con filtros por rango de fechas y tipo (MED/TRT).
* **KPIs**: adherencia diaria/semanal simple.

### 4.11 Offline / Error

* **Offline**: vista amigable cuando no hay red; posibilidad de seguir usando CRUD local.
* **Error**: genérica con reintento.

### 4.12 **AlarmScreen (Full-Screen)** ✅

* Se abre por deep link o `notificationResponse`.
* Muestra **nombre**, **dosis/instrucciones** y hora programada.
* **Botones grandes**: **Tomado**, **Posponer 10m**, **Saltar**.
* Mantiene la pantalla activa (WakeLock API nativa si disponible / mantener despierto con `expo-keep-awake`).
* Respeta modo No Molestar/silencio del SO.

**Componentes**: `<AlarmHeader>`, `<AlarmActions>`, `<Countdown (opcional)>`.

---

## 5) Notificaciones: categorías y flujo

**Categorías**

* `MEDICATION_REMINDER`

  * Actions: `TAKEN`, `SNOOZE_10`, `OPEN`
* `TREATMENT_REMINDER`

  * Actions: `DONE`, `SNOOZE_10`, `OPEN`

**Identificadores**

* Usar patrón: `med:<id>:<YYYY-MM-DDTHH:mm>` / `trt:<id>:<YYYY-MM-DDTHH:mm>` para cancelar/reprogramar con precisión.

**Flujo general**

1. Crear/editar entidad → calcular próximas ocurrencias (helper `nextOccurrences`).
2. Programar notificaciones locales con `expo-notifications.scheduleNotificationAsync`.
3. Usuario interactúa:

   * `TAKEN/DONE` → registrar en `intake_events` y cancelar cualquier duplicado de ese slot.
   * `SNOOZE_10` → reprogramar +10 minutos.
   * `OPEN` → abrir `AlarmScreen` vía deep link con payload (kind, id, scheduled\_for).
4. **BackgroundFetch** diario: revalidar programación futura, ajustar por cambios de zona horaria y DST.

---

## 6) Librerías/utilidades a implementar

* `lib/notifications.ts`

  * `requestPermissions()`
  * `registerNotificationCategories()`
  * `scheduleMedicationNotifications(medicationId)`
  * `scheduleTreatmentNotifications(treatmentId)`
  * `cancelNotificationsByRef(refId)`
  * `handleNotificationResponse(evt)`

* `lib/time.ts`

  * `parseHHmm`, `formatLocal`, `toISOAtTime`, `nextOccurrence(s)` con TZ, DST-safe.

* `data/db.ts` (SQLite) y `data/migrations/*`

* `data/repos/*`

  * `MedicationsRepo`, `MedicationSchedulesRepo`, `TreatmentsRepo`, `TreatmentRemindersRepo`, `AppointmentsRepo`, `PermissionsRepo`, `IntakeRepo`.

* `store/*` (Zustand)

  * `useMedications`, `useTreatments`, `useAppointments`, `useSettings`, `useCurrentUser`, `useCaregiver`.

---

## 7) Componentes UI (móviles)

* Contenedores: `<Screen>`, `<Scroll>`, `<KeyboardAvoiding>`.
* Form: `<TextField>`, `<NumberField>`, `<Select>`, `<TimeChips>` (selector múltiple HH\:mm), `<WeekdayPicker>` (0-6), `<DatePicker>`.
* Tarjetas: `<MedCard>`, `<TreatmentCard>`, `<AppointmentCard>`, `<KPIChip>`.
* Modales: `<BottomSheetModal>` para acciones rápidas.
* Botones: `<FAB>` (flotante +), `<PrimaryButton>`, `<GhostButton>`.

---

## 8) Estados de UI

* **loading** (skeletons), **empty** (mensajes/CTA), **error** (retry), **success** (toasts).
* Indicadores de red (online/offline) opcionales.

---

## 9) Criterios de aceptación (MVP móvil)

* ✅ Puedo crear un **medicamento**, asignar horarios y **recibir notificaciones locales** en esos horarios sin conexión.
* ✅ Al tocar la notificación se abre **AlarmScreen** con los datos correctos y botones **Tomado / Posponer / Saltar**.
* ✅ **intake\_events** registra acciones; historial lista eventos con fecha/hora.
* ✅ Cambiar frecuencia/horarios **recalcula** y **reprograma** notificaciones; BackgroundFetch corrige TZ/DST.
* ✅ CRUD de tratamientos y citas funcionan offline; citas pueden marcarse como **COMPLETED/CANCELLED**.
* ✅ UI accesible y usable con una mano; botones de acción grandes en AlarmScreen.

---

## 10) Roadmap

* **MVP**: Auth + Onboarding, Home (role-aware), Meds (CRUD + notifs), Treatments (CRUD + notifs), Appointments (CRUD), Caregivers (invite/join), Settings (notifs/tema/TZ), AlarmScreen, Offline SQLite, BackgroundFetch.
* **v1**: Historial avanzado + KPIs, exportación CSV, sincronización con backend (pull/push), multi-dispositivo, analíticas de adherencia.

---

## 11) Checklist de implementación

* [ ] Configurar Expo + TypeScript + EAS project.
* [ ] @react-navigation con deep links `recuerdamed://`.
* [ ] expo-notifications: permisos, canales Android, categorías, handlers.
* [ ] expo-task-manager + background-fetch con job diario.
* [ ] SQLite: esquema y migraciones iniciales.
* [ ] Repositorios + stores Zustand.
* [ ] Screens y formularios con RHF + Zod.
* [ ] AlarmScreen full-screen con acciones.
* [ ] Estados loading/empty/error en listas.
* [ ] Accesibilidad y pruebas de lógica de schedulers.

---

## 12) Notas de integración con backend (opcional)

* Si existe backend (Next.js/Prisma): definir endpoints para sync eventual (tokens, perfiles, permisos, meds/appts/trts, push tokens). Mantener **fuente de verdad local** hasta que la sync sea estable.

> Este documento es el **prompt/brief** para implementar la app **móvil** completa, orientada a **offline-first** y **recordatorios** con una **pantalla de alarma** dedicada. Ajusta nombres de componentes según el patrón del repositorio y respeta los contratos de datos.
