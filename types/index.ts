// Tipos de usuario
export type UserRole = 'PATIENT' | 'CAREGIVER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Perfil del paciente - VERSIÓN COMPLETA
export interface PatientProfile {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  gender: string;
  weight?: number;
  height?: number;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  chronicDiseases?: string;
  currentConditions?: string;
  reactions?: string;
  doctorName?: string;
  doctorContact?: string;
  hospitalReference?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Perfil del cuidador - VERSIÓN COMPLETA
export interface CaregiverProfile {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  gender: string;
  bloodType?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  relationship?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Perfil del usuario actual
export interface UserProfile {
  id: string;
  userId: string;
  patientProfileId?: string; // Agregado para compatibilidad
  name: string;
  age?: number;
  birthDate?: string;
  dateOfBirth?: string; // Campo del backend
  gender?: string;
  weight?: number;
  height?: number;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  chronicDiseases?: string;
  currentConditions?: string;
  reactions?: string;
  doctorName?: string;
  doctorContact?: string;
  hospitalReference?: string;
  phone?: string;
  relationship?: string;
  photoUrl?: string;
  photoFileId?: string; // ID de la imagen en ImageKit
  role?: string;
  createdAt: string;
  updatedAt: string;
}

// Medicamento
export interface Medication {
  id: string;
  patientProfileId: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isOffline?: boolean;
}

// Cita médica
export interface Appointment {
  id: string;
  patientProfileId: string;
  title: string;
  description?: string;
  dateTime: string;
  location: string;
  doctorName?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  isOffline?: boolean;
}

// Tratamiento médico
export interface Treatment {
  id: string;
  patientProfileId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  frequency?: string;
  notes?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  createdAt: string;
  updatedAt: string;
  isOffline?: boolean;
}

// Evento de ingesta
export interface IntakeEvent {
  id: string;
  patientProfileId: string;
  kind: 'MED' | 'TRT';
  refId: string;
  scheduledFor: string;
  action: 'TAKEN' | 'SNOOZE' | 'SKIPPED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isOffline?: boolean;
}

// Nota
export interface Note {
  id: string;
  patientProfileId: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  isOffline?: boolean;
}

// Notificación del sistema
export interface Notification {
  id: string;
  userId: string;
  type: 'MEDICATION_REMINDER' | 'APPOINTMENT_REMINDER' | 'TREATMENT_REMINDER' | 'SYSTEM' | 'CUSTOM';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  metadata?: Record<string, any>;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Suscripción push
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

// Permiso entre paciente y cuidador
export interface Permission {
  id: string;
  patientId: string;
  caregiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

// Código de invitación
export interface InviteCode {
  id: string;
  patientId: string;
  code: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
}

// Respuesta de la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Paginación
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Filtros para notificaciones
export interface NotificationFilters {
  status?: 'UNREAD' | 'READ' | 'ARCHIVED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// Estadísticas de notificaciones
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byType: Record<string, number>;
  // Nuevos campos del backend
  percentages?: {
    unread: number;
    read: number;
    archived: number;
  };
  lastUpdated?: string;
}

// Respuesta de autenticación
export interface AuthResponse {
  user: User;
  profile: UserProfile;
  token: string;
}

// Datos para registro
export interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
}

// Datos para login
export interface LoginData {
  email: string;
  password: string;
}

// Datos para unirse como cuidador
export interface JoinCaregiverData {
  code: string;
  email: string;
  password: string;
}

// Datos para actualizar perfil
export interface UpdateProfileData {
  name?: string;
  birthDate?: string;
  gender?: string;
  weight?: number;
  height?: number;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  chronicDiseases?: string;
  currentConditions?: string;
  reactions?: string;
  doctorName?: string;
  doctorContact?: string;
  hospitalReference?: string;
  phone?: string;
  relationship?: string;
}

// Datos para crear medicamento
export interface CreateMedicationData {
  patientProfileId: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
}

// Datos para crear cita
export interface CreateAppointmentData {
  patientProfileId: string;
  title: string;
  description?: string;
  dateTime: string;
  location: string;
  doctorName?: string;
}

// Datos para crear tratamiento
export interface CreateTreatmentData {
  patientProfileId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

// Datos para crear evento de ingesta
export interface CreateIntakeEventData {
  patientProfileId: string;
  kind: 'MED' | 'TRT';
  refId: string;
  scheduledFor: string;
  action: 'TAKEN' | 'SNOOZE' | 'SKIPPED';
  notes?: string;
}

// Datos para crear notificación
export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  metadata?: Record<string, any>;
}

// Datos para suscripción push
export interface CreatePushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Estado de la aplicación
export interface AppState {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Estado offline
export interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  medications: Medication[];
  appointments: Appointment[];
  treatments: Treatment[];
  notes: any[];
  intakeEvents: IntakeEvent[];
  pendingSync: Array<{
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    data: any;
  }>;
  lastSync: string | null;
}
