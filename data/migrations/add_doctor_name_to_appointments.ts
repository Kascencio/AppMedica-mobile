import * as SQLite from 'expo-sqlite';

export async function addDoctorNameToAppointments(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Verificar si la columna doctorName ya existe
    const checkColumnQuery = "PRAGMA table_info(appointments)";
    const columns = await db.getAllAsync(checkColumnQuery);
    const hasDoctorName = columns.some((col: any) => col.name === 'doctorName');
    
    if (!hasDoctorName) {
      // Agregar la columna doctorName
      await db.runAsync('ALTER TABLE appointments ADD COLUMN doctorName TEXT');
      console.log('[Migration] Columna doctorName agregada a la tabla appointments');
    } else {
      console.log('[Migration] Columna doctorName ya existe en la tabla appointments');
    }
  } catch (error) {
    console.error('[Migration] Error agregando columna doctorName:', error);
    // No lanzar error para evitar que la app falle
    // En su lugar, registrar el error y continuar
    console.warn('[Migration] Continuando sin agregar columna doctorName debido a error');
  }
}
