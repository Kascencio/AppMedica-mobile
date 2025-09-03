import { useIntakeEvents } from '../store/useIntakeEvents';
import { useCurrentUser } from '../store/useCurrentUser';
import { useAuth } from '../store/useAuth';
import { testIntakeEventsEndpoint } from './quickEndpointTest';

export async function testIntakeEventsSystem() {
  console.log('🧪 Probando sistema de eventos de adherencia...');
  
  try {
    // 1. Verificar estado de autenticación
    const token = useAuth.getState().userToken;
    const profile = useCurrentUser.getState().profile;
    
    console.log('🔐 Estado de autenticación:');
    console.log('  - Token disponible:', !!token);
    console.log('  - Perfil disponible:', !!profile);
    console.log('  - ID del perfil:', profile?.id);
    
    if (!token || !profile?.id) {
      console.log('❌ No hay token o perfil disponible para la prueba');
      return { success: false, error: 'No authentication data' };
    }
    
    // 2. Probar endpoint de intake-events
    console.log('\n🔍 Probando endpoint de intake-events...');
    const endpointTest = await testIntakeEventsEndpoint();
    console.log('Resultado del endpoint:', endpointTest);
    
    // 3. Probar registro de evento
    console.log('\n📝 Probando registro de evento...');
    
    const testEvent = {
      kind: 'MED' as const,
      refId: 'test_med_123',
      scheduledFor: new Date().toISOString(),
      action: 'TAKEN' as const,
      patientProfileId: profile.id
    };
    
    console.log('Evento de prueba:', testEvent);
    
    try {
      await useIntakeEvents.getState().registerEvent(testEvent);
      console.log('✅ Evento registrado exitosamente');
      
      // 4. Obtener eventos
      console.log('\n📋 Obteniendo eventos...');
      await useIntakeEvents.getState().getEvents();
      
      const events = useIntakeEvents.getState().events;
      console.log('Eventos encontrados:', events.length);
      
      if (events.length > 0) {
        console.log('Último evento:', events[0]);
      }
      
      return {
        success: true,
        endpointAvailable: endpointTest.available,
        eventsCount: events.length,
        lastEvent: events[0] || null
      };
      
    } catch (error: any) {
      console.log('❌ Error registrando evento:', error.message);
      return {
        success: false,
        error: error.message,
        endpointAvailable: endpointTest.available
      };
    }
    
  } catch (error: any) {
    console.log('❌ Error en prueba del sistema:', error.message);
    return { success: false, error: error.message };
  }
}

export async function testMultipleIntakeEvents() {
  console.log('🧪 Probando múltiples eventos de adherencia...');
  
  const profile = useCurrentUser.getState().profile;
  if (!profile?.id) {
    console.log('❌ No hay perfil disponible');
    return;
  }
  
  const testEvents = [
    {
      kind: 'MED' as const,
      refId: 'med_1',
      scheduledFor: new Date().toISOString(),
      action: 'TAKEN' as const,
      patientProfileId: profile.id
    },
    {
      kind: 'MED' as const,
      refId: 'med_2',
      scheduledFor: new Date().toISOString(),
      action: 'SKIPPED' as const,
      patientProfileId: profile.id
    },
    {
      kind: 'TRT' as const,
      refId: 'trt_1',
      scheduledFor: new Date().toISOString(),
      action: 'TAKEN' as const,
      patientProfileId: profile.id
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < testEvents.length; i++) {
    const event = testEvents[i];
    console.log(`\n📝 Registrando evento ${i + 1}/${testEvents.length}:`, event.action);
    
    try {
      await useIntakeEvents.getState().registerEvent(event);
      console.log(`✅ Evento ${i + 1} registrado exitosamente`);
      results.push({ success: true, event: event.action });
    } catch (error: any) {
      console.log(`❌ Error en evento ${i + 1}:`, error.message);
      results.push({ success: false, error: error.message, event: event.action });
    }
    
    // Esperar un poco entre eventos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Obtener todos los eventos
  console.log('\n📋 Obteniendo todos los eventos...');
  await useIntakeEvents.getState().getEvents();
  const allEvents = useIntakeEvents.getState().events;
  
  console.log('Total de eventos:', allEvents.length);
  console.log('Resumen de resultados:', results);
  
  return {
    results,
    totalEvents: allEvents.length,
    successCount: results.filter(r => r.success).length,
    errorCount: results.filter(r => !r.success).length
  };
}
