import { buildApiUrl, API_CONFIG } from '../constants/config';

interface EndpointTest {
  name: string;
  method: string;
  path: string;
  description: string;
}

const ENDPOINTS_TO_TEST: EndpointTest[] = [
  // Endpoints de autenticación
  { name: 'Login', method: 'POST', path: '/auth/login', description: 'Autenticación de usuario' },
  { name: 'Register', method: 'POST', path: '/auth/register', description: 'Registro de usuario' },
  
  // Endpoints de perfil
  { name: 'Get Profile', method: 'GET', path: '/profile', description: 'Obtener perfil del usuario' },
  { name: 'Update Profile', method: 'PATCH', path: '/profile', description: 'Actualizar perfil' },
  
  // Endpoints de medicamentos
  { name: 'Get Medications', method: 'GET', path: '/medications', description: 'Obtener medicamentos' },
  { name: 'Create Medication', method: 'POST', path: '/medications', description: 'Crear medicamento' },
  
  // Endpoints de citas
  { name: 'Get Appointments', method: 'GET', path: '/appointments', description: 'Obtener citas' },
  { name: 'Create Appointment', method: 'POST', path: '/appointments', description: 'Crear cita' },
  
  // Endpoints de tratamientos
  { name: 'Get Treatments', method: 'GET', path: '/treatments', description: 'Obtener tratamientos' },
  { name: 'Create Treatment', method: 'POST', path: '/treatments', description: 'Crear tratamiento' },
  
  // Endpoints de notificaciones
  { name: 'Get Notifications', method: 'GET', path: '/notifications', description: 'Obtener notificaciones' },
  { name: 'Create Notification', method: 'POST', path: '/notifications', description: 'Crear notificación' },
  { name: 'Notifications Health', method: 'GET', path: '/notifications/health', description: 'Health check de notificaciones' },
  { name: 'Notifications Stats', method: 'GET', path: '/notifications/stats', description: 'Estadísticas de notificaciones' },
  
  // Endpoints de eventos de adherencia (que no están documentados)
  { name: 'Get Intake Events', method: 'GET', path: '/intake-events', description: 'Obtener eventos de adherencia' },
  { name: 'Create Intake Event', method: 'POST', path: '/intake-events', description: 'Crear evento de adherencia' },
  
  // Endpoints de suscripciones
  { name: 'Subscribe', method: 'POST', path: '/subscribe', description: 'Registrar suscripción push' },
  { name: 'Unsubscribe', method: 'DELETE', path: '/subscribe', description: 'Eliminar suscripción push' },
];

export async function discoverEndpoints(token?: string): Promise<Record<string, any>> {
  console.log('🔍 Descubriendo endpoints disponibles en la API...');
  console.log('URL base:', API_CONFIG.BASE_URL);
  
  const results: Record<string, any> = {};
  
  for (const endpoint of ENDPOINTS_TO_TEST) {
    try {
      const url = buildApiUrl(endpoint.path);
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`\n📡 Probando: ${endpoint.method} ${endpoint.path}`);
      
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        // Para endpoints GET, no enviamos body
        ...(endpoint.method !== 'GET' && {
          body: JSON.stringify({
            // Datos de prueba mínimos
            test: true,
            timestamp: new Date().toISOString()
          })
        })
      });
      
      const result = {
        available: response.status !== 404,
        status: response.status,
        statusText: response.statusText,
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        url: url
      };
      
      if (response.status === 404) {
        result.message = 'Endpoint no encontrado';
      } else if (response.status === 401) {
        result.message = 'Requiere autenticación';
      } else if (response.status === 400) {
        result.message = 'Datos inválidos (esperado para prueba)';
      } else if (response.status === 200 || response.status === 201) {
        result.message = 'Endpoint disponible';
        try {
          const data = await response.json();
          result.data = data;
        } catch (e) {
          result.message = 'Respuesta exitosa (sin JSON)';
        }
      } else {
        result.message = `Respuesta inesperada: ${response.status}`;
      }
      
      results[endpoint.name] = result;
      
      // Log del resultado
      const statusIcon = result.available ? '✅' : '❌';
      console.log(`${statusIcon} ${endpoint.name}: ${result.status} - ${result.message}`);
      
    } catch (error: any) {
      const result = {
        available: false,
        error: error.message,
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        url: buildApiUrl(endpoint.path)
      };
      
      results[endpoint.name] = result;
      console.log(`❌ ${endpoint.name}: Error - ${error.message}`);
    }
  }
  
  return results;
}

export async function testApiConnectivity(): Promise<{
  online: boolean;
  baseUrl: string;
  responseTime: number;
  status: string;
}> {
  console.log('🌐 Probando conectividad con la API...');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(API_CONFIG.BASE_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      online: response.ok,
      baseUrl: API_CONFIG.BASE_URL,
      responseTime,
      status: response.statusText
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      online: false,
      baseUrl: API_CONFIG.BASE_URL,
      responseTime,
      status: error.message
    };
  }
}

export async function getAvailableEndpoints(token?: string): Promise<string[]> {
  const results = await discoverEndpoints(token);
  
  const available = Object.entries(results)
    .filter(([_, result]) => result.available)
    .map(([name, result]) => ({
      name,
      method: result.method,
      path: result.path,
      status: result.status
    }));
  
  console.log('\n📋 Endpoints disponibles:');
  available.forEach(endpoint => {
    console.log(`✅ ${endpoint.method} ${endpoint.path} (${endpoint.status})`);
  });
  
  return available.map(e => e.path);
}

export async function runFullDiscovery(token?: string): Promise<void> {
  console.log('🚀 Iniciando descubrimiento completo de endpoints...\n');
  
  // 1. Probar conectividad básica
  const connectivity = await testApiConnectivity();
  console.log('📡 Conectividad:', connectivity);
  
  // 2. Descubrir endpoints
  const results = await discoverEndpoints(token);
  
  // 3. Resumen
  const total = Object.keys(results).length;
  const available = Object.values(results).filter(r => r.available).length;
  const unavailable = total - available;
  
  console.log('\n📊 Resumen del descubrimiento:');
  console.log(`Total de endpoints probados: ${total}`);
  console.log(`Endpoints disponibles: ${available}`);
  console.log(`Endpoints no disponibles: ${unavailable}`);
  console.log(`Tasa de disponibilidad: ${((available / total) * 100).toFixed(1)}%`);
  
  // 4. Mostrar endpoints no disponibles
  if (unavailable > 0) {
    console.log('\n❌ Endpoints no disponibles:');
    Object.entries(results)
      .filter(([_, result]) => !result.available)
      .forEach(([name, result]) => {
        console.log(`  - ${name}: ${result.method} ${result.path} (${result.status || result.error})`);
      });
  }
  
  // 5. Mostrar endpoints disponibles
  if (available > 0) {
    console.log('\n✅ Endpoints disponibles:');
    Object.entries(results)
      .filter(([_, result]) => result.available)
      .forEach(([name, result]) => {
        console.log(`  - ${name}: ${result.method} ${result.path} (${result.status})`);
      });
  }
}
