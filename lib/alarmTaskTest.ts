// Archivo de prueba para verificar la funcionalidad de alarmTask
// Este archivo se puede usar para probar las funciones sin ejecutar la tarea completa

import { 
  getMedicationsFromDB, 
  getAppointmentsFromDB, 
  getBackgroundTaskStatus,
  registerBackgroundAlarmTask,
  unregisterBackgroundAlarmTask 
} from './alarmTask';

// Función para probar la obtención de datos
export async function testDataRetrieval() {
  console.log('[AlarmTaskTest] Iniciando prueba de obtención de datos...');
  
  try {
    // Probar obtención de medicamentos
    console.log('[AlarmTaskTest] Probando obtención de medicamentos...');
    const medications = await getMedicationsFromDB();
    console.log(`[AlarmTaskTest] Medicamentos obtenidos: ${medications.length}`);
    
    medications.forEach((med, index) => {
      console.log(`[AlarmTaskTest] Medicamento ${index + 1}:`, {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        time: med.time,
        frequency: med.frequency,
        startDate: med.startDate,
        endDate: med.endDate
      });
    });
    
    // Probar obtención de citas
    console.log('[AlarmTaskTest] Probando obtención de citas...');
    const appointments = await getAppointmentsFromDB();
    console.log(`[AlarmTaskTest] Citas obtenidas: ${appointments.length}`);
    
    appointments.forEach((apt, index) => {
      console.log(`[AlarmTaskTest] Cita ${index + 1}:`, {
        id: apt.id,
        title: apt.title,
        dateTime: apt.dateTime,
        location: apt.location,
        doctorName: apt.doctorName
      });
    });
    
    return { medications, appointments };
  } catch (error) {
    console.error('[AlarmTaskTest] Error en prueba de obtención de datos:', error);
    throw error;
  }
}

// Función para probar el estado de la tarea en segundo plano
export async function testBackgroundTaskStatus() {
  console.log('[AlarmTaskTest] Probando estado de tarea en segundo plano...');
  
  try {
    const status = await getBackgroundTaskStatus();
    console.log('[AlarmTaskTest] Estado de la tarea:', status);
    return status;
  } catch (error) {
    console.error('[AlarmTaskTest] Error obteniendo estado de tarea:', error);
    throw error;
  }
}

// Función para probar el registro de la tarea
export async function testTaskRegistration() {
  console.log('[AlarmTaskTest] Probando registro de tarea...');
  
  try {
    // Registrar la tarea
    console.log('[AlarmTaskTest] Registrando tarea...');
    const registerResult = await registerBackgroundAlarmTask();
    console.log('[AlarmTaskTest] Resultado del registro:', registerResult);
    
    // Verificar estado después del registro
    const status = await getBackgroundTaskStatus();
    console.log('[AlarmTaskTest] Estado después del registro:', status);
    
    return { registerResult, status };
  } catch (error) {
    console.error('[AlarmTaskTest] Error en prueba de registro:', error);
    throw error;
  }
}

// Función para probar el desregistro de la tarea
export async function testTaskUnregistration() {
  console.log('[AlarmTaskTest] Probando desregistro de tarea...');
  
  try {
    // Desregistrar la tarea
    console.log('[AlarmTaskTest] Desregistrando tarea...');
    const unregisterResult = await unregisterBackgroundAlarmTask();
    console.log('[AlarmTaskTest] Resultado del desregistro:', unregisterResult);
    
    // Verificar estado después del desregistro
    const status = await getBackgroundTaskStatus();
    console.log('[AlarmTaskTest] Estado después del desregistro:', status);
    
    return { unregisterResult, status };
  } catch (error) {
    console.error('[AlarmTaskTest] Error en prueba de desregistro:', error);
    throw error;
  }
}

// Función para ejecutar todas las pruebas
export async function runAllTests() {
  console.log('[AlarmTaskTest] ========== INICIANDO PRUEBAS COMPLETAS ==========');
  
  try {
    // Prueba 1: Obtención de datos
    console.log('\n[AlarmTaskTest] --- PRUEBA 1: Obtención de datos ---');
    const data = await testDataRetrieval();
    
    // Prueba 2: Estado de la tarea
    console.log('\n[AlarmTaskTest] --- PRUEBA 2: Estado de la tarea ---');
    const initialStatus = await testBackgroundTaskStatus();
    
    // Prueba 3: Registro de la tarea
    console.log('\n[AlarmTaskTest] --- PRUEBA 3: Registro de la tarea ---');
    const registration = await testTaskRegistration();
    
    // Prueba 4: Desregistro de la tarea
    console.log('\n[AlarmTaskTest] --- PRUEBA 4: Desregistro de la tarea ---');
    const unregistration = await testTaskUnregistration();
    
    console.log('\n[AlarmTaskTest] ========== PRUEBAS COMPLETADAS EXITOSAMENTE ==========');
    
    return {
      data,
      initialStatus,
      registration,
      unregistration
    };
  } catch (error) {
    console.error('[AlarmTaskTest] ========== ERROR EN LAS PRUEBAS ==========', error);
    throw error;
  }
}

// Función para probar solo la lógica de datos (sin registro de tarea)
export async function testDataLogicOnly() {
  console.log('[AlarmTaskTest] Probando solo la lógica de datos...');
  
  try {
    const data = await testDataRetrieval();
    
    // Analizar los datos obtenidos
    const medicationsWithTime = data.medications.filter(med => med.time);
    const activeMedications = medicationsWithTime.filter(med => {
      const now = new Date();
      const startDate = med.startDate ? new Date(med.startDate) : null;
      const endDate = med.endDate ? new Date(med.endDate) : null;
      
      return (!startDate || startDate <= now) && (!endDate || endDate > now);
    });
    
    const futureAppointments = data.appointments.filter(apt => {
      return apt.dateTime && new Date(apt.dateTime) > new Date();
    });
    
    console.log('[AlarmTaskTest] Análisis de datos:');
    console.log(`- Total medicamentos: ${data.medications.length}`);
    console.log(`- Medicamentos con tiempo: ${medicationsWithTime.length}`);
    console.log(`- Medicamentos activos: ${activeMedications.length}`);
    console.log(`- Total citas: ${data.appointments.length}`);
    console.log(`- Citas futuras: ${futureAppointments.length}`);
    
    return {
      ...data,
      analysis: {
        medicationsWithTime,
        activeMedications,
        futureAppointments
      }
    };
  } catch (error) {
    console.error('[AlarmTaskTest] Error en prueba de lógica de datos:', error);
    throw error;
  }
}
