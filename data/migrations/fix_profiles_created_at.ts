import { LocalDatabase } from '../db';

/**
 * Migración para corregir perfiles que tienen createdAt nulo
 */
export async function fixProfilesCreatedAt(db: LocalDatabase): Promise<void> {
  try {
    console.log('[Migration] Ejecutando migración: fix_profiles_created_at');
    
    // Obtener todos los perfiles que tienen createdAt nulo o vacío
    const profiles = await db.getDatabase()?.getAllAsync(`
      SELECT id, name, updatedAt FROM profiles 
      WHERE createdAt IS NULL OR createdAt = ''
    `);
    
    if (profiles && profiles.length > 0) {
      console.log(`[Migration] Encontrados ${profiles.length} perfiles con createdAt nulo`);
      
      // Actualizar cada perfil con una fecha de creación basada en updatedAt o fecha actual
      for (const profile of profiles) {
        const createdAt = profile.updatedAt || new Date().toISOString();
        
        await db.getDatabase()?.runAsync(`
          UPDATE profiles 
          SET createdAt = ? 
          WHERE id = ?
        `, [createdAt, profile.id]);
        
        console.log(`[Migration] Corregido perfil: ${profile.name} (${profile.id})`);
      }
      
      console.log('[Migration] ✅ Migración fix_profiles_created_at completada');
    } else {
      console.log('[Migration] No se encontraron perfiles con createdAt nulo');
    }
    
  } catch (error) {
    console.error('[Migration] ❌ Error en migración fix_profiles_created_at:', error);
    throw error;
  }
}
