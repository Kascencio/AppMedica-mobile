// data/migrations/fix_intake_events_created_at.ts
import { LocalDatabase } from '../db';

export async function fixIntakeEventsCreatedAt(db: LocalDatabase): Promise<void> {
  console.log('[Migration] Iniciando corrección de createdAt en intake_events...');
  
  try {
    const database = db.getDatabase();
    if (!database) {
      console.log('[Migration] Base de datos no disponible');
      return;
    }

    // Verificar si hay registros con createdAt NULL
    const checkQuery = 'SELECT COUNT(*) as count FROM intake_events WHERE createdAt IS NULL';
    const checkResult = await database.getFirstAsync(checkQuery);
    const nullCount = checkResult?.count || 0;

    if (nullCount === 0) {
      console.log('[Migration] No hay registros con createdAt NULL en intake_events');
      return;
    }

    console.log(`[Migration] Encontrados ${nullCount} registros con createdAt NULL en intake_events`);

    // Crear tabla temporal con la estructura corregida
    await database.execAsync(`
      CREATE TEMPORARY TABLE intake_events_temp AS 
      SELECT 
        id,
        kind,
        refId,
        scheduledFor,
        action,
        at,
        meta,
        patientProfileId,
        CASE 
          WHEN createdAt IS NULL THEN COALESCE(updatedAt, at, datetime('now'))
          ELSE createdAt 
        END as createdAt,
        CASE 
          WHEN updatedAt IS NULL THEN COALESCE(createdAt, at, datetime('now'))
          ELSE updatedAt 
        END as updatedAt,
        isOffline,
        syncStatus
      FROM intake_events;
    `);

    // Eliminar tabla original
    await database.execAsync('DROP TABLE intake_events;');

    // Recrear tabla original
    await database.execAsync(`
      CREATE TABLE intake_events (
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
    `);

    // Copiar datos de la tabla temporal
    await database.execAsync(`
      INSERT INTO intake_events 
      SELECT * FROM intake_events_temp;
    `);

    // Eliminar tabla temporal
    await database.execAsync('DROP TABLE intake_events_temp;');

    console.log('[Migration] ✅ Corrección de createdAt en intake_events completada exitosamente');
    
  } catch (error) {
    console.error('[Migration] ❌ Error en corrección de createdAt en intake_events:', error);
    throw error;
  }
}
