import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Tipos para la base de datos
export interface LocalMedication {
  id: string;
  name: string;
  dosage: string;
  type?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  time?: string;
  patientProfileId: string;
  createdAt: string;
  updatedAt: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface LocalAppointment {
  id: string;
  title: string;
  dateTime: string;
  location?: string;
  description?: string;
  doctorName?: string;
  patientProfileId: string;
  createdAt: string;
  updatedAt: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface LocalTreatment {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  progress?: string;
  patientProfileId: string;
  createdAt: string;
  updatedAt: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface LocalNote {
  id: string;
  title: string;
  content: string;
  date: string;
  patientProfileId: string;
  createdAt: string;
  updatedAt: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface LocalIntakeEvent {
  id: string;
  kind: 'MED' | 'TRT';
  refId: string;
  scheduledFor: string;
  action: 'TAKEN' | 'SNOOZE' | 'SKIPPED';
  at: string;
  meta?: string;
  patientProfileId: string;
  createdAt: string;
  updatedAt: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface SyncQueue {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'medications' | 'appointments' | 'treatments' | 'notes' | 'intakeEvents';
  data: any;
  createdAt: string;
  retryCount: number;
}

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('recuerdamed.db');
      await this.createTables();
      await this.runMigrations();
      console.log('[LocalDatabase] Base de datos inicializada correctamente');
    } catch (error) {
      console.error('[LocalDatabase] Error inicializando base de datos:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const createMedicationsTable = `
      CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        type TEXT,
        frequency TEXT,
        startDate TEXT,
        endDate TEXT,
        notes TEXT,
        time TEXT,
        patientProfileId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isOffline INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'synced'
      );
    `;

    const createAppointmentsTable = `
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        dateTime TEXT NOT NULL,
        location TEXT,
        description TEXT,
        doctorName TEXT,
        patientProfileId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isOffline INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'synced'
      );
    `;

    const createTreatmentsTable = `
      CREATE TABLE IF NOT EXISTS treatments (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        startDate TEXT,
        endDate TEXT,
        progress TEXT,
        patientProfileId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isOffline INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'synced'
      );
    `;

    const createNotesTable = `
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        patientProfileId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isOffline INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'synced'
      );
    `;

    const createIntakeEventsTable = `
      CREATE TABLE IF NOT EXISTS intake_events (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        refId TEXT NOT NULL,
        scheduledFor TEXT NOT NULL,
        action TEXT NOT NULL,
        at TEXT NOT NULL,
        meta TEXT,
        patientProfileId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isOffline INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'synced'
      );
    `;

    const createSyncQueueTable = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0
      );
    `;

          await this.db.execAsync(createMedicationsTable);
      await this.db.execAsync(createAppointmentsTable);
      await this.db.execAsync(createTreatmentsTable);
      await this.db.execAsync(createNotesTable);
      await this.db.execAsync(createIntakeEventsTable);
      await this.db.execAsync(createSyncQueueTable);
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    try {
      // Importar y ejecutar migraciones
      const { addDoctorNameToAppointments } = await import('./migrations/add_doctor_name_to_appointments');
      await addDoctorNameToAppointments(this.db);
    } catch (error) {
      console.error('[LocalDatabase] Error ejecutando migraciones:', error);
      // No lanzar error para evitar que la app falle
    }
  }

  // Métodos para medicamentos
  async saveMedication(medication: LocalMedication): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const query = `
      INSERT OR REPLACE INTO medications 
      (id, name, dosage, type, frequency, startDate, endDate, notes, time, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.runAsync(query, [
      medication.id,
      medication.name,
      medication.dosage,
      medication.type || null,
      medication.frequency || null,
      medication.startDate || null,
      medication.endDate || null,
      medication.notes || null,
      medication.time || null,
      medication.patientProfileId,
      medication.createdAt,
      medication.updatedAt,
      medication.isOffline ? 1 : 0,
      medication.syncStatus
    ]);
  }

  async getMedications(patientProfileId: string): Promise<LocalMedication[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const query = `SELECT * FROM medications WHERE patientProfileId = ? ORDER BY createdAt DESC`;
    const result = await this.db.getAllAsync(query, [patientProfileId]);
    
    return result.map((row: any) => ({
      ...row,
      isOffline: Boolean(row.isOffline)
    }));
  }

  async deleteMedication(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    await this.db.runAsync('DELETE FROM medications WHERE id = ?', [id]);
  }

  // Métodos para citas
  async saveAppointment(appointment: LocalAppointment): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const query = `
      INSERT OR REPLACE INTO appointments 
      (id, title, dateTime, location, description, doctorName, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.runAsync(query, [
      appointment.id,
      appointment.title,
      appointment.dateTime,
      appointment.location || null,
      appointment.description || null,
      appointment.doctorName || null,
      appointment.patientProfileId,
      appointment.createdAt,
      appointment.updatedAt,
      appointment.isOffline ? 1 : 0,
      appointment.syncStatus
    ]);
  }

  async getAppointments(patientProfileId: string): Promise<LocalAppointment[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const query = `SELECT * FROM appointments WHERE patientProfileId = ? ORDER BY dateTime ASC`;
    const result = await this.db.getAllAsync(query, [patientProfileId]);
    
    return result.map((row: any) => ({
      ...row,
      isOffline: Boolean(row.isOffline)
    }));
  }

  async deleteAppointment(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    await this.db.runAsync('DELETE FROM appointments WHERE id = ?', [id]);
  }

  // Métodos para tratamientos
  async saveTreatment(treatment: LocalTreatment): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const query = `
      INSERT OR REPLACE INTO treatments 
      (id, title, description, startDate, endDate, progress, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.runAsync(query, [
      treatment.id,
      treatment.title,
      treatment.description || null,
      treatment.startDate || null,
      treatment.endDate || null,
      treatment.progress || null,
      treatment.patientProfileId,
      treatment.createdAt,
      treatment.updatedAt,
      treatment.isOffline ? 1 : 0,
      treatment.syncStatus
    ]);
  }

  async getTreatments(patientProfileId: string): Promise<LocalTreatment[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const query = `SELECT * FROM treatments WHERE patientProfileId = ? ORDER BY createdAt DESC`;
    const result = await this.db.getAllAsync(query, [patientProfileId]);
    
    return result.map((row: any) => ({
      ...row,
      isOffline: Boolean(row.isOffline)
    }));
  }

  async deleteTreatment(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    await this.db.runAsync('DELETE FROM treatments WHERE id = ?', [id]);
  }

  // Métodos para notes
  async saveNote(note: LocalNote): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const query = `
      INSERT OR REPLACE INTO notes 
      (id, title, content, date, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.runAsync(query, [
      note.id,
      note.title,
      note.content,
      note.date,
      note.patientProfileId,
      note.createdAt,
      note.updatedAt,
      note.isOffline ? 1 : 0,
      note.syncStatus
    ]);
  }

  async getNotes(patientProfileId: string): Promise<LocalNote[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const query = `SELECT * FROM notes WHERE patientProfileId = ? ORDER BY date DESC`;
    const result = await this.db.getAllAsync(query, [patientProfileId]);
    
    return result.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      date: row.date,
      patientProfileId: row.patientProfileId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isOffline: Boolean(row.isOffline),
      syncStatus: row.syncStatus
    }));
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    await this.db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  }

  // Métodos para intake_events
  async saveIntakeEvent(event: LocalIntakeEvent): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const query = `
      INSERT OR REPLACE INTO intake_events 
      (id, kind, refId, scheduledFor, action, at, meta, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.runAsync(query, [
      event.id,
      event.kind,
      event.refId,
      event.scheduledFor,
      event.action,
      event.at,
      event.meta || null,
      event.patientProfileId,
      event.createdAt,
      event.updatedAt,
      event.isOffline ? 1 : 0,
      event.syncStatus
    ]);
  }

  async getIntakeEvents(patientProfileId: string): Promise<LocalIntakeEvent[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const query = `SELECT * FROM intake_events WHERE patientProfileId = ? ORDER BY at DESC`;
    const result = await this.db.getAllAsync(query, [patientProfileId]);
    
    return result.map((row: any) => ({
      id: row.id,
      kind: row.kind,
      refId: row.refId,
      scheduledFor: row.scheduledFor,
      action: row.action,
      at: row.at,
      meta: row.meta,
      patientProfileId: row.patientProfileId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isOffline: Boolean(row.isOffline),
      syncStatus: row.syncStatus
    }));
  }

  async deleteIntakeEvent(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    await this.db.runAsync('DELETE FROM intake_events WHERE id = ?', [id]);
  }

  // Métodos para cola de sincronización
  async addToSyncQueue(item: SyncQueue): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const query = `
      INSERT INTO sync_queue (id, action, entity, data, createdAt, retryCount)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.runAsync(query, [
      item.id,
      item.action,
      item.entity,
      JSON.stringify(item.data),
      item.createdAt,
      item.retryCount
    ]);
  }

  async getSyncQueue(): Promise<SyncQueue[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const query = `SELECT * FROM sync_queue ORDER BY createdAt ASC`;
    const result = await this.db.getAllAsync(query);
    
    return result.map((row: any) => ({
      ...row,
      data: JSON.parse(row.data)
    }));
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    await this.db.runAsync('UPDATE sync_queue SET retryCount = ? WHERE id = ?', [retryCount, id]);
  }

  // Método para limpiar datos antiguos
  async clearOldData(daysOld: number = 30): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffString = cutoffDate.toISOString();

    await this.db.runAsync('DELETE FROM medications WHERE createdAt < ? AND isOffline = 0', [cutoffString]);
    await this.db.runAsync('DELETE FROM appointments WHERE createdAt < ? AND isOffline = 0', [cutoffString]);
    await this.db.runAsync('DELETE FROM treatments WHERE createdAt < ? AND isOffline = 0', [cutoffString]);
  }

  // Método para cerrar la base de datos
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

// Instancia singleton
export const localDB = new LocalDatabase();
