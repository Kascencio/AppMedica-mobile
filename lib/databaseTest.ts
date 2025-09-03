import { localDB } from '../data/db';

export async function testDatabaseConnection() {
  console.log('🧪 Iniciando pruebas de base de datos...');
  
  try {
    // 1. Inicializar base de datos
    console.log('📊 Inicializando base de datos...');
    await localDB.init();
    console.log('✅ Base de datos inicializada correctamente');

    // 2. Probar operaciones básicas
    console.log('📝 Probando operaciones básicas...');
    
    // Crear una cita de prueba
    const testAppointment = {
      id: 'test-appointment-001',
      title: 'Cita de Prueba',
      dateTime: new Date().toISOString(),
      location: 'Consultorio de Prueba',
      description: 'Esta es una cita de prueba para verificar la base de datos',
      doctorName: 'Dr. Prueba',
      patientProfileId: 'test-patient-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOffline: true,
      syncStatus: 'synced' as const
    };

    // Guardar cita
    await localDB.saveAppointment(testAppointment);
    console.log('✅ Cita guardada correctamente');

    // Obtener citas
    const appointments = await localDB.getAppointments('test-patient-001');
    console.log(`✅ Citas obtenidas: ${appointments.length}`);

    // Verificar que la cita se guardó correctamente
    const savedAppointment = appointments.find(apt => apt.id === 'test-appointment-001');
    if (savedAppointment) {
      console.log('✅ Cita encontrada en la base de datos');
      console.log('📋 Detalles de la cita:', {
        id: savedAppointment.id,
        title: savedAppointment.title,
        doctorName: savedAppointment.doctorName,
        dateTime: savedAppointment.dateTime
      });
    } else {
      throw new Error('La cita no se encontró en la base de datos');
    }

    // 3. Probar cola de sincronización
    console.log('🔄 Probando cola de sincronización...');
    
    const syncItem = {
      id: 'test-sync-001',
      action: 'CREATE' as const,
      entity: 'appointments' as const,
      data: testAppointment,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    await localDB.addToSyncQueue(syncItem);
    console.log('✅ Item agregado a la cola de sincronización');

    const syncQueue = await localDB.getSyncQueue();
    console.log(`✅ Cola de sincronización: ${syncQueue.length} items`);

    // 4. Limpiar datos de prueba
    console.log('🧹 Limpiando datos de prueba...');
    await localDB.deleteAppointment('test-appointment-001');
    await localDB.removeFromSyncQueue('test-sync-001');
    console.log('✅ Datos de prueba limpiados');

    console.log('🎉 Todas las pruebas de base de datos completadas exitosamente');
    return {
      success: true,
      message: 'Base de datos funcionando correctamente'
    };

  } catch (error) {
    console.error('❌ Error en pruebas de base de datos:', error);
    throw error;
  }
}

export async function checkDatabaseHealth() {
  try {
    console.log('🏥 Verificando salud de la base de datos...');
    
    // Verificar que la base de datos esté inicializada
    await localDB.ensureInitialized();
    console.log('✅ Base de datos inicializada');

    // Obtener estadísticas básicas
    const testPatientId = 'health-check-patient';
    
    const medications = await localDB.getMedications(testPatientId);
    const appointments = await localDB.getAppointments(testPatientId);
    const treatments = await localDB.getTreatments(testPatientId);
    const notes = await localDB.getNotes(testPatientId);
    const intakeEvents = await localDB.getIntakeEvents(testPatientId);
    const syncQueue = await localDB.getSyncQueue();

    const stats = {
      medications: medications.length,
      appointments: appointments.length,
      treatments: treatments.length,
      notes: notes.length,
      intakeEvents: intakeEvents.length,
      syncQueue: syncQueue.length
    };

    console.log('📊 Estadísticas de la base de datos:', stats);
    
    return {
      success: true,
      stats,
      message: 'Base de datos saludable'
    };

  } catch (error) {
    console.error('❌ Error verificando salud de la base de datos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      message: 'Problemas con la base de datos'
    };
  }
}
