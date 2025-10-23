import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Tipos para la base de datos
export interface LocalMedication {
  id: string;
  patientProfileId: string;
  name: string;
  dosage: string;
  type: string;
  frequency: string;
  time?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
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
  specialty?: string;
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

export interface LocalTreatmentMedication {
  id: string;
  treatmentId: string;
  name: string;
  dosage: string;
  frequency?: string;
  type?: string;
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

export interface LocalProfile {
  id: string;
  userId: string;
  patientProfileId?: string;
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
  photoFileId?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueue {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'medications' | 'appointments' | 'treatments' | 'notes' | 'intakeEvents' | 'profile' | 'notifications';
  data: any;
  createdAt: string;
  retryCount: number;
}

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // Si ya está inicializada, retornar inmediatamente
    if (this.db) {
      console.log('[LocalDatabase] init() llamado pero ya inicializada, retornando...');
      return;
    }

    // Si ya está inicializándose, esperar a que termine
    if (this.isInitializing && this.initPromise) {
      console.log('[LocalDatabase] init() llamado pero ya está inicializándose, esperando...');
      return this.initPromise;
    }

    // Iniciar proceso de inicialización
    console.log('[LocalDatabase] 🚀 INICIANDO proceso de inicialización...');
    this.isInitializing = true;
    this.initPromise = this._init();
    
    try {
      await this.initPromise;
      console.log('[LocalDatabase] ✅ init() completado exitosamente');
    } catch (error) {
      console.error('[LocalDatabase] ❌ init() falló con error:', error);
      throw error;
    } finally {
      this.isInitializing = false;
      console.log('[LocalDatabase] isInitializing=false');
    }
  }

  private async _init(): Promise<void> {
    try {
      console.log('[LocalDatabase] _init() - Paso 1: Abriendo base de datos SQLite...');
      this.db = await SQLite.openDatabaseAsync('recuerdamed.db');
      console.log('[LocalDatabase] _init() - Paso 1: ✅ Base de datos abierta');
      
      console.log('[LocalDatabase] _init() - Paso 2: Creando tablas...');
      await this.createTables();
      console.log('[LocalDatabase] _init() - Paso 2: ✅ Tablas creadas');
      
      console.log('[LocalDatabase] _init() - Paso 3: Ejecutando migraciones...');
      await this.runMigrations();
      console.log('[LocalDatabase] _init() - Paso 3: ✅ Migraciones completadas');
      
      console.log('[LocalDatabase] ✅✅✅ Base de datos inicializada correctamente');
    } catch (error) {
      console.error('[LocalDatabase] ❌❌❌ Error en _init():', error);
      this.db = null;
      throw error;
    }
  }

  // Método para verificar si la base de datos está lista
  async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  // Método público para acceder a la base de datos (para migraciones)
  getDatabase(): SQLite.SQLiteDatabase | null {
    return this.db;
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
        specialty TEXT,
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

    const createTreatmentMedicationsTable = `
      CREATE TABLE IF NOT EXISTS treatment_medications (
        id TEXT PRIMARY KEY,
        treatmentId TEXT NOT NULL,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT,
        type TEXT,
        patientProfileId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isOffline INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'synced'
      );
    `;

    const createTreatmentAlarmConfigsTable = `
      CREATE TABLE IF NOT EXISTS treatment_alarm_configs (
        id TEXT PRIMARY KEY,
        elementId TEXT NOT NULL,
        type TEXT NOT NULL,
        frequencyType TEXT,
        timesJson TEXT,
        daysOfWeekJson TEXT,
        everyXHours INTEGER,
        updatedAt TEXT
      );
    `;

      // Tabla de snoozes de alarmas (posposiciones puntuales)
      const createSnoozesTable = `
        CREATE TABLE IF NOT EXISTS snoozes (
          id TEXT PRIMARY KEY,
          elementType TEXT NOT NULL,
          elementId TEXT NOT NULL,
          originalScheduledAt TEXT NOT NULL,
          newScheduledAt TEXT NOT NULL,
          attempts INTEGER DEFAULT 1,
          status TEXT DEFAULT 'scheduled', -- scheduled | fired | cancelled | expired
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `;
      await this.db.execAsync(createSnoozesTable);
      await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_snoozes_element ON snoozes(elementType, elementId);');

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

    const createProfilesTable = `
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        patientProfileId TEXT,
        name TEXT NOT NULL,
        age INTEGER,
        birthDate TEXT,
        dateOfBirth TEXT,
        gender TEXT,
        weight REAL,
        height REAL,
        bloodType TEXT,
        emergencyContactName TEXT,
        emergencyContactRelation TEXT,
        emergencyContactPhone TEXT,
        allergies TEXT,
        chronicDiseases TEXT,
        currentConditions TEXT,
        reactions TEXT,
        doctorName TEXT,
        doctorContact TEXT,
        hospitalReference TEXT,
        phone TEXT,
        relationship TEXT,
        photoUrl TEXT,
        photoFileId TEXT,
        role TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
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
    await this.db.execAsync(createTreatmentMedicationsTable);
  await this.db.execAsync(createTreatmentAlarmConfigsTable);
    await this.db.execAsync(createNotesTable);
    await this.db.execAsync(createIntakeEventsTable);
    await this.db.execAsync(createProfilesTable);
    await this.db.execAsync(createSyncQueueTable);
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    try {
      console.log('[LocalDatabase] runMigrations() - Importando migraciones...');
      
      // Ejecutar cada migración con timeout para evitar bloqueos
      const runWithTimeout = async (name: string, fn: () => Promise<void>, timeoutMs: number = 10000) => {
        console.log(`[LocalDatabase] Ejecutando migración: ${name}...`);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout en migración ${name}`)), timeoutMs)
        );
        try {
          await Promise.race([fn(), timeoutPromise]);
          console.log(`[LocalDatabase] ✅ Migración ${name} completada`);
        } catch (error) {
          console.error(`[LocalDatabase] ❌ Error en migración ${name}:`, error);
          throw error;
        }
      };
      
      // Importar y ejecutar migraciones con timeout
      const { addDoctorNameToAppointments } = await import('./migrations/add_doctor_name_to_appointments');
      await runWithTimeout('addDoctorNameToAppointments', () => addDoctorNameToAppointments(this.db!));
      
      const { addSpecialtyToAppointments } = await import('./migrations/add_specialty_to_appointments');
      await runWithTimeout('addSpecialtyToAppointments', () => addSpecialtyToAppointments(this.db!));
      
      // Ejecutar migración para corregir createdAt en perfiles
      const { fixProfilesCreatedAt } = await import('./migrations/fix_profiles_created_at');
      await runWithTimeout('fixProfilesCreatedAt', () => fixProfilesCreatedAt(this));
      
      // Ejecutar migración para corregir createdAt en intake_events
      const { fixIntakeEventsCreatedAt } = await import('./migrations/fix_intake_events_created_at');
      await runWithTimeout('fixIntakeEventsCreatedAt', () => fixIntakeEventsCreatedAt(this));
      
      console.log('[LocalDatabase] ✅ Todas las migraciones ejecutadas correctamente');
    } catch (error) {
      console.error('[LocalDatabase] ❌ Error ejecutando migraciones:', error);
      // No lanzar error para evitar que la app falle
      // En su lugar, registrar el error y continuar
      console.warn('[LocalDatabase] ⚠️ Continuando sin migraciones debido a error');
    }
  }

  // Métodos para medicamentos
  async saveMedication(medication: LocalMedication): Promise<void> {
    await this.ensureInitialized();

    const query = `
      INSERT OR REPLACE INTO medications 
      (id, name, dosage, type, frequency, startDate, endDate, notes, time, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(query, [
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
    await this.ensureInitialized();

    const query = `SELECT * FROM medications WHERE patientProfileId = ? ORDER BY createdAt DESC`;
    const result = await this.db!.getAllAsync(query, [patientProfileId]);
    
    return result.map((row: any) => ({
      ...row,
      isOffline: Boolean(row.isOffline)
    }));
  }

  async deleteMedication(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync('DELETE FROM medications WHERE id = ?', [id]);
  }

  // Métodos para citas
  async saveAppointment(appointment: LocalAppointment): Promise<void> {
    await this.ensureInitialized();

    const query = `
      INSERT OR REPLACE INTO appointments 
      (id, title, dateTime, location, specialty, description, doctorName, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(query, [
      appointment.id,
      appointment.title,
      appointment.dateTime,
      appointment.location || null,
      appointment.specialty || null,
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
    await this.ensureInitialized();

    const query = `SELECT * FROM appointments WHERE patientProfileId = ? ORDER BY dateTime ASC`;
    const result = await this.db!.getAllAsync(query, [patientProfileId]);
    
    return result.map((row: any) => ({
      ...row,
      isOffline: Boolean(row.isOffline)
    }));
  }

  async deleteAppointment(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync('DELETE FROM appointments WHERE id = ?', [id]);
  }

  // Métodos para tratamientos
  async saveTreatment(treatment: LocalTreatment): Promise<void> {
    await this.ensureInitialized();

    const query = `
      INSERT OR REPLACE INTO treatments 
      (id, title, description, startDate, endDate, progress, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(query, [
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
    await this.ensureInitialized();

    const query = `SELECT * FROM treatments WHERE patientProfileId = ? ORDER BY createdAt DESC`;
    const result = await this.db!.getAllAsync(query, [patientProfileId]);
    
    return result.map((row: any) => ({
      ...row,
      isOffline: Boolean(row.isOffline)
    }));
  }

  async deleteTreatment(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync('DELETE FROM treatments WHERE id = ?', [id]);
  }

  // Métodos para treatment_medications
  async saveTreatmentMedication(medication: LocalTreatmentMedication): Promise<void> {
    await this.ensureInitialized();

    const query = `
      INSERT OR REPLACE INTO treatment_medications 
      (id, treatmentId, name, dosage, frequency, type, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(query, [
      medication.id,
      medication.treatmentId,
      medication.name,
      medication.dosage,
      medication.frequency || null,
      medication.type || null,
      medication.patientProfileId,
      medication.createdAt,
      medication.updatedAt,
      medication.isOffline ? 1 : 0,
      medication.syncStatus
    ]);
  }

  async getTreatmentMedications(patientProfileId: string, treatmentId: string): Promise<LocalTreatmentMedication[]> {
    await this.ensureInitialized();

    const query = `SELECT * FROM treatment_medications WHERE patientProfileId = ? AND treatmentId = ? ORDER BY createdAt DESC`;
    const result = await this.db!.getAllAsync(query, [patientProfileId, treatmentId]);

    return result.map((row: any) => ({
      ...row,
      isOffline: Boolean(row.isOffline)
    }));
  }

  async deleteTreatmentMedication(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync('DELETE FROM treatment_medications WHERE id = ?', [id]);
  }

  // =============================
  // Configuración persistente de alarmas de tratamientos
  // =============================
  async saveTreatmentAlarmConfig(config: {
    elementId: string;
    type: string; // 'treatment'
    frequencyType: 'daily' | 'daysOfWeek' | 'everyXHours';
    times: string[]; // HH:mm
    daysOfWeek: number[];
    everyXHours?: number;
    updatedAt?: string;
  }): Promise<void> {
    await this.ensureInitialized();
    const id = `${config.type}_${config.elementId}`;
    const query = `
      INSERT OR REPLACE INTO treatment_alarm_configs
      (id, elementId, type, frequencyType, timesJson, daysOfWeekJson, everyXHours, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db!.runAsync(query, [
      id,
      config.elementId,
      config.type,
      config.frequencyType,
      JSON.stringify(config.times || []),
      JSON.stringify(config.daysOfWeek || []),
      config.everyXHours ?? null,
      config.updatedAt || new Date().toISOString()
    ]);
  }

  async getTreatmentAlarmConfig(elementId: string, type: string = 'treatment'): Promise<{
    frequencyType: 'daily' | 'daysOfWeek' | 'everyXHours';
    times: string[];
    daysOfWeek: number[];
    everyXHours?: number;
    updatedAt?: string;
  } | null> {
    await this.ensureInitialized();
    const id = `${type}_${elementId}`;
    const row = await this.db!.getFirstAsync('SELECT * FROM treatment_alarm_configs WHERE id = ?', [id]);
    if (!row) return null;
    type TreatmentAlarmConfigRow = {
      id: string;
      elementId: string;
      type: string;
      frequencyType: string;
      timesJson: string;
      daysOfWeekJson: string;
      everyXHours: number | null;
      updatedAt: string;
    };
    const r = row as TreatmentAlarmConfigRow;
    return {
      frequencyType: (r.frequencyType as any) || 'daily',
      times: (() => { try { return JSON.parse(r.timesJson || '[]'); } catch { return []; } })(),
      daysOfWeek: (() => { try { return JSON.parse(r.daysOfWeekJson || '[]'); } catch { return []; } })(),
      everyXHours: r.everyXHours || undefined,
      updatedAt: r.updatedAt,
    };
  }

  async deleteTreatmentAlarmConfig(elementId: string, type: string = 'treatment'): Promise<void> {
    await this.ensureInitialized();
    const id = `${type}_${elementId}`;
    await this.db!.runAsync('DELETE FROM treatment_alarm_configs WHERE id = ?', [id]);
  }

    // =============================
    // Snoozes (posponer una ocurrencia)
    // =============================
    async saveSnoozeRecord(record: {
      id: string;
      elementType: string;
      elementId: string;
      originalScheduledAt: string;
      newScheduledAt: string;
      attempts: number;
      status: string;
      createdAt: string;
      updatedAt: string;
    }): Promise<void> {
      await this.ensureInitialized();
      const q = `INSERT OR REPLACE INTO snoozes (id, elementType, elementId, originalScheduledAt, newScheduledAt, attempts, status, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      await this.db!.runAsync(q, [
        record.id,
        record.elementType,
        record.elementId,
        record.originalScheduledAt,
        record.newScheduledAt,
        record.attempts,
        record.status,
        record.createdAt,
        record.updatedAt
      ]);
    }

    async getSnoozesForElement(elementType: string, elementId: string): Promise<any[]> {
      await this.ensureInitialized();
      return await this.db!.getAllAsync('SELECT * FROM snoozes WHERE elementType = ? AND elementId = ? AND status = "scheduled"', [elementType, elementId]);
    }

    async updateSnoozeStatus(id: string, status: string): Promise<void> {
      await this.ensureInitialized();
      await this.db!.runAsync('UPDATE snoozes SET status = ?, updatedAt = ? WHERE id = ?', [status, new Date().toISOString(), id]);
    }

    async expireOldSnoozes(): Promise<number> {
      await this.ensureInitialized();
      const nowIso = new Date().toISOString();
      // Marcar como expired las snoozes que ya pasaron y no se marcaron fired
      await this.db!.runAsync('UPDATE snoozes SET status = "expired", updatedAt = ? WHERE newScheduledAt < ? AND status = "scheduled"', [nowIso, nowIso]);
      const rows = await this.db!.getAllAsync('SELECT * FROM snoozes WHERE status = "expired"');
      return rows.length;
    }

  // Limpieza de duplicados históricos en treatment_medications
  async cleanupDuplicateTreatmentMedications(): Promise<{ removed: number; kept: number }> {
    await this.ensureInitialized();
    const rows: any[] = await this.db!.getAllAsync('SELECT * FROM treatment_medications');
    const seen = new Map<string, any>();
    const toDelete: string[] = [];
    for (const r of rows) {
      const key = `${(r.name||'').trim().toLowerCase()}|${(r.dosage||'').trim().toLowerCase()}|${(r.type||'').trim().toLowerCase()}|${r.treatmentId}|${r.patientProfileId}`;
      if (!seen.has(key)) {
        seen.set(key, r);
      } else {
        const existing = seen.get(key);
        const existingIsTemp = String(existing.id||'').startsWith('temp_') || existing.syncStatus === 'pending';
        const currentIsTemp = String(r.id||'').startsWith('temp_') || r.syncStatus === 'pending';
        // Mantener el que no sea temporal; si ambos temporales, mantener el más reciente (mayor updatedAt)
        if (existingIsTemp && !currentIsTemp) {
          // Reemplazar en mapa y eliminar el anterior
            toDelete.push(existing.id);
            seen.set(key, r);
        } else if (!existingIsTemp && currentIsTemp) {
          toDelete.push(r.id);
        } else {
          // Ambos mismo tipo (ambos temp o ambos synced) -> mantener el más nuevo
          const exDate = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const curDate = new Date(r.updatedAt || r.createdAt || 0).getTime();
          if (curDate > exDate) {
            toDelete.push(existing.id);
            seen.set(key, r);
          } else {
            toDelete.push(r.id);
          }
        }
      }
    }
    for (const id of toDelete) {
      try {
        await this.db!.runAsync('DELETE FROM treatment_medications WHERE id = ?', [id]);
      } catch {}
    }
    return { removed: toDelete.length, kept: seen.size };
  }

  // Métodos para notes
  async saveNote(note: LocalNote): Promise<void> {
    await this.ensureInitialized();
    
    const query = `
      INSERT OR REPLACE INTO notes 
      (id, title, content, date, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db!.runAsync(query, [
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
    await this.ensureInitialized();
    
    const query = `SELECT * FROM notes WHERE patientProfileId = ? ORDER BY date DESC`;
    const result = await this.db!.getAllAsync(query, [patientProfileId]);
    
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
    await this.ensureInitialized();
    await this.db!.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  }

  // Métodos para intake_events
  async saveIntakeEvent(event: LocalIntakeEvent): Promise<void> {
    await this.ensureInitialized();
    
    const query = `
      INSERT OR REPLACE INTO intake_events 
      (id, kind, refId, scheduledFor, action, at, meta, patientProfileId, createdAt, updatedAt, isOffline, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db!.runAsync(query, [
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
    await this.ensureInitialized();
    
    const query = `SELECT * FROM intake_events WHERE patientProfileId = ? ORDER BY at DESC`;
    const result = await this.db!.getAllAsync(query, [patientProfileId]);
    
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
    await this.ensureInitialized();
    await this.db!.runAsync('DELETE FROM intake_events WHERE id = ?', [id]);
  }

  // Métodos para cola de sincronización
  async addToSyncQueue(item: SyncQueue): Promise<void> {
    await this.ensureInitialized();

    const query = `
      INSERT INTO sync_queue (id, action, entity, data, createdAt, retryCount)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(query, [
      item.id,
      item.action,
      item.entity,
      JSON.stringify(item.data),
      item.createdAt,
      item.retryCount
    ]);
  }

  async getSyncQueue(): Promise<SyncQueue[]> {
    await this.ensureInitialized();

    const query = `SELECT * FROM sync_queue ORDER BY createdAt ASC`;
    const result = await this.db!.getAllAsync(query);
    
    return result.map((row: any) => ({
      ...row,
      data: JSON.parse(row.data)
    }));
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync('UPDATE sync_queue SET retryCount = ? WHERE id = ?', [retryCount, id]);
  }

  // Métodos para manejar perfiles
  async saveProfile(profile: LocalProfile): Promise<void> {
    await this.ensureInitialized();

    const query = `
      INSERT OR REPLACE INTO profiles (
        id, userId, patientProfileId, name, age, birthDate, dateOfBirth,
        gender, weight, height, bloodType, emergencyContactName,
        emergencyContactRelation, emergencyContactPhone, allergies,
        chronicDiseases, currentConditions, reactions, doctorName,
        doctorContact, hospitalReference, phone, relationship,
        photoUrl, photoFileId, role, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(query, [
      profile.id,
      profile.userId,
      profile.patientProfileId || null,
      profile.name,
      profile.age || null,
      profile.birthDate || null,
      profile.dateOfBirth || null,
      profile.gender || null,
      profile.weight || null,
      profile.height || null,
      profile.bloodType || null,
      profile.emergencyContactName || null,
      profile.emergencyContactRelation || null,
      profile.emergencyContactPhone || null,
      profile.allergies || null,
      profile.chronicDiseases || null,
      profile.currentConditions || null,
      profile.reactions || null,
      profile.doctorName || null,
      profile.doctorContact || null,
      profile.hospitalReference || null,
      profile.phone || null,
      profile.relationship || null,
      profile.photoUrl || null,
      profile.photoFileId || null,
      profile.role || null,
      profile.createdAt,
      profile.updatedAt
    ]);
  }

  async getProfile(id: string): Promise<LocalProfile | null> {
    await this.ensureInitialized();

    const query = `SELECT * FROM profiles WHERE id = ?`;
    const result = await this.db!.getFirstAsync(query, [id]);
    
    return result as LocalProfile | null;
  }

  async updateProfile(id: string, updates: Partial<LocalProfile>): Promise<void> {
    await this.ensureInitialized();

    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof LocalProfile]).filter(value => value !== undefined);
    
    const query = `UPDATE profiles SET ${setClause}, updatedAt = ? WHERE id = ?`;
    await this.db!.runAsync(query, [...values, new Date().toISOString(), id]);
  }

  // Método para limpiar datos antiguos
  async clearOldData(daysOld: number = 30): Promise<void> {
    await this.ensureInitialized();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffString = cutoffDate.toISOString();

    await this.db!.runAsync('DELETE FROM medications WHERE createdAt < ? AND isOffline = 0', [cutoffString]);
    await this.db!.runAsync('DELETE FROM appointments WHERE createdAt < ? AND isOffline = 0', [cutoffString]);
    await this.db!.runAsync('DELETE FROM treatments WHERE createdAt < ? AND isOffline = 0', [cutoffString]);
    await this.db!.runAsync('DELETE FROM treatment_medications WHERE createdAt < ? AND isOffline = 0', [cutoffString]);
  }

  // Método para cerrar la base de datos
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
    this.isInitializing = false;
    this.initPromise = null;
  }

  // NUEVO: Limpiar completamente todas las tablas (para logout)
  async clearAll(): Promise<void> {
    try {
      await this.ensureInitialized();
      console.log('[LocalDatabase] Limpiando todas las tablas locales...');
      await this.db!.execAsync('DELETE FROM medications');
      await this.db!.execAsync('DELETE FROM appointments');
      await this.db!.execAsync('DELETE FROM treatments');
      await this.db!.execAsync('DELETE FROM treatment_medications');
      await this.db!.execAsync('DELETE FROM notes');
      await this.db!.execAsync('DELETE FROM intake_events');
      await this.db!.execAsync('DELETE FROM profiles');
      await this.db!.execAsync('DELETE FROM sync_queue');
      console.log('[LocalDatabase] Tablas limpiadas.');
    } catch (error) {
      console.error('[LocalDatabase] Error limpiando tablas:', error);
    }
  }
}

// Instancia singleton
export const localDB = new LocalDatabase();
