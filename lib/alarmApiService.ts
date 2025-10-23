// lib/alarmApiService.ts
import { buildApiUrl, API_CONFIG } from '../constants/config';
import { useAuth } from '../store/useAuth';
import { useCurrentUser } from '../store/useCurrentUser';
import { useCaregiver } from '../store/useCaregiver';

/**
 * Servicio para manejar la API de alarmas del backend
 */
export interface BackendAlarm {
  id: string;
  patientProfileId: string;
  type: 'MEDICATION' | 'APPOINTMENT' | 'TREATMENT';
  referenceId: string; // ID del medicamento/cita/tratamiento
  title: string;
  description?: string;
  scheduledTime: string; // ISO string
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  repeatDays?: number[]; // [1,2,3,4,5] para días de la semana
  reminderMinutes?: number; // minutos antes del evento (para citas)
  snoozeDuration: number; // minutos de snooze
  maxSnoozes: number;
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: string;
  snoozeCount: number;
  lastSnoozedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlarmRequest {
  type: 'MEDICATION' | 'APPOINTMENT' | 'TREATMENT';
  referenceId: string;
  title: string;
  description?: string;
  scheduledTime: string;
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  repeatDays?: number[];
  reminderMinutes?: number;
  snoozeDuration?: number;
  maxSnoozes?: number;
}

export interface UpdateAlarmRequest {
  title?: string;
  description?: string;
  scheduledTime?: string;
  frequency?: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  repeatDays?: number[];
  reminderMinutes?: number;
  snoozeDuration?: number;
  maxSnoozes?: number;
  isActive?: boolean;
}

class AlarmApiService {
  private getHeaders() {
    const token = useAuth.getState().userToken;
    return {
      ...API_CONFIG.DEFAULT_HEADERS,
      Authorization: `Bearer ${token}`,
    };
  }

  private getPatientId(): string {
    const profile = useCurrentUser.getState().profile;
    const caregiverSelectedId = useCaregiver.getState().selectedPatientId;
    const patientId = profile?.role === 'CAREGIVER' ? caregiverSelectedId : profile?.patientProfileId;
    return patientId || '';
  }

  /**
   * Listar todas las alarmas del paciente
   */
  async getAllAlarms(): Promise<BackendAlarm[]> {
    try {
      const patientId = this.getPatientId();
      if (!patientId) throw new Error('ID de paciente no disponible');

      const response = await fetch(
        buildApiUrl(`${API_CONFIG.ENDPOINTS.ALARMS.BASE}?patientProfileId=${patientId}`),
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return data.items || data.alarms || data || [];
    } catch (error) {
      console.error('[AlarmApiService] Error obteniendo alarmas:', error);
      throw error;
    }
  }

  /**
   * Listar alarmas por tipo
   */
  async getAlarmsByType(type: 'MEDICATION' | 'APPOINTMENT' | 'TREATMENT'): Promise<BackendAlarm[]> {
    try {
      const patientId = this.getPatientId();
      if (!patientId) throw new Error('ID de paciente no disponible');

      const response = await fetch(
        buildApiUrl(`${API_CONFIG.ENDPOINTS.ALARMS.BY_TYPE.replace(':type', type)}?patientProfileId=${patientId}`),
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return data.items || data.alarms || data || [];
    } catch (error) {
      console.error('[AlarmApiService] Error obteniendo alarmas por tipo:', error);
      throw error;
    }
  }

  /**
   * Crear nueva alarma
   */
  async createAlarm(alarmData: CreateAlarmRequest): Promise<BackendAlarm> {
    try {
      const patientId = this.getPatientId();
      if (!patientId) throw new Error('ID de paciente no disponible');

      const payload = {
        ...alarmData,
        patientProfileId: patientId,
        snoozeDuration: alarmData.snoozeDuration || 10,
        maxSnoozes: alarmData.maxSnoozes || 3,
      };

      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.BASE),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error creando alarma:', error);
      throw error;
    }
  }

  /**
   * Actualizar alarma
   */
  async updateAlarm(alarmId: string, updates: UpdateAlarmRequest): Promise<BackendAlarm> {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.BY_ID.replace(':id', alarmId)),
        {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error actualizando alarma:', error);
      throw error;
    }
  }

  /**
   * Eliminar alarma
   */
  async deleteAlarm(alarmId: string): Promise<void> {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.BY_ID.replace(':id', alarmId)),
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('[AlarmApiService] Error eliminando alarma:', error);
      throw error;
    }
  }

  /**
   * Activar/desactivar alarma
   */
  async toggleAlarm(alarmId: string): Promise<BackendAlarm> {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.TOGGLE.replace(':id', alarmId)),
        {
          method: 'PATCH',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error alternando alarma:', error);
      throw error;
    }
  }

  /**
   * Obtener alarmas próximas (24 horas)
   */
  async getUpcomingAlarms(): Promise<BackendAlarm[]> {
    try {
      const patientId = this.getPatientId();
      if (!patientId) throw new Error('ID de paciente no disponible');

      const response = await fetch(
        buildApiUrl(`${API_CONFIG.ENDPOINTS.ALARMS.UPCOMING}?patientProfileId=${patientId}`),
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return data.items || data.alarms || data || [];
    } catch (error) {
      console.error('[AlarmApiService] Error obteniendo alarmas próximas:', error);
      throw error;
    }
  }

  /**
   * Crear alarma desde medicamento
   */
  async createAlarmFromMedication(medicationId: string, alarmConfig: {
    scheduledTime: string;
    frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
    repeatDays?: number[];
    snoozeDuration?: number;
    maxSnoozes?: number;
  }): Promise<BackendAlarm> {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.FROM_MEDICATION.replace(':medicationId', medicationId)),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(alarmConfig),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error creando alarma desde medicamento:', error);
      throw error;
    }
  }

  /**
   * Crear alarma desde cita
   */
  async createAlarmFromAppointment(appointmentId: string, alarmConfig: {
    reminderMinutes: number;
    snoozeDuration?: number;
    maxSnoozes?: number;
  }): Promise<BackendAlarm> {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.FROM_APPOINTMENT.replace(':appointmentId', appointmentId)),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(alarmConfig),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error creando alarma desde cita:', error);
      throw error;
    }
  }

  /**
   * Crear alarma desde tratamiento
   */
  async createAlarmFromTreatment(treatmentId: string, alarmConfig: {
    scheduledTime: string;
    frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
    repeatDays?: number[];
    snoozeDuration?: number;
    maxSnoozes?: number;
  }): Promise<BackendAlarm> {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.FROM_TREATMENT.replace(':treatmentId', treatmentId)),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(alarmConfig),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error creando alarma desde tratamiento:', error);
      throw error;
    }
  }

  /**
   * Posponer alarma
   */
  async snoozeAlarm(alarmId: string): Promise<BackendAlarm> {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.SNOOZE.replace(':id', alarmId)),
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error posponiendo alarma:', error);
      throw error;
    }
  }

  /**
   * Desactivar/completar alarma
   */
  async dismissAlarm(alarmId: string): Promise<BackendAlarm> {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.ALARMS.DISMISS.replace(':id', alarmId)),
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error desactivando alarma:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de alarmas
   */
  async getAlarmStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    overdue: number;
    upcoming24h: number;
    byType: {
      MEDICATION: number;
      APPOINTMENT: number;
      TREATMENT: number;
    };
  }> {
    try {
      const patientId = this.getPatientId();
      if (!patientId) throw new Error('ID de paciente no disponible');

      const response = await fetch(
        buildApiUrl(`${API_CONFIG.ENDPOINTS.ALARMS.STATS}?patientProfileId=${patientId}`),
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlarmApiService] Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

// Instancia singleton
export const alarmApiService = new AlarmApiService();