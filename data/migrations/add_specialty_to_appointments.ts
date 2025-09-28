import * as SQLite from 'expo-sqlite';

export async function addSpecialtyToAppointments(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Verificar si la columna specialty ya existe
    const columns = await db.getAllAsync("PRAGMA table_info(appointments)");
    const hasSpecialty = columns.some((col: any) => col.name === 'specialty');

    if (!hasSpecialty) {
      await db.runAsync('ALTER TABLE appointments ADD COLUMN specialty TEXT');
      console.log('[Migration] Columna specialty agregada a la tabla appointments');
    } else {
      console.log('[Migration] Columna specialty ya existe en la tabla appointments');
    }
  } catch (error) {
    console.error('[Migration] Error agregando columna specialty:', error);
    console.warn('[Migration] Continuando sin agregar columna specialty debido a error');
  }
}


