import { buildApiUrl, API_CONFIG } from '../constants/config';
import { useAuth } from '../store/useAuth';

export async function quickEndpointTest() {
  console.log('🚀 Iniciando prueba rápida de endpoints...');
  console.log('URL base:', API_CONFIG.BASE_URL);
  
  const results: Record<string, any> = {};
  
  // Endpoints críticos para probar
  const criticalEndpoints = [
    { name: 'Health Check', method: 'GET', path: '/notifications/health' },
    { name: 'Notifications', method: 'GET', path: '/notifications' },
    { name: 'Profile', method: 'GET', path: '/profile' },
    { name: 'Medications', method: 'GET', path: '/medications' },
    { name: 'Appointments', method: 'GET', path: '/appointments' },
    { name: 'Intake Events', method: 'GET', path: '/intake-events' },
  ];
  
  // Obtener token si está disponible
  const token = useAuth.getState().userToken;
  
  for (const endpoint of criticalEndpoints) {
    try {
      const url = buildApiUrl(endpoint.path);
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`\n📡 Probando: ${endpoint.method} ${endpoint.path}`);
      
      const response = await fetch(url, {
        method: endpoint.method,
        headers
      });
      
      const result = {
        available: response.status !== 404,
        status: response.status,
        statusText: response.statusText,
        method: endpoint.method,
        path: endpoint.path,
        url: url
      };
      
      if (response.status === 404) {
        result.message = '❌ Endpoint no encontrado';
      } else if (response.status === 401) {
        result.message = '🔒 Requiere autenticación';
      } else if (response.status === 200 || response.status === 201) {
        result.message = '✅ Endpoint disponible';
        try {
          const data = await response.json();
          result.data = data;
        } catch (e) {
          result.message = '✅ Respuesta exitosa (sin JSON)';
        }
      } else {
        result.message = `⚠️ Respuesta inesperada: ${response.status}`;
      }
      
      results[endpoint.name] = result;
      console.log(`${result.message} (${response.status})`);
      
    } catch (error: any) {
      const result = {
        available: false,
        error: error.message,
        method: endpoint.method,
        path: endpoint.path,
        url: buildApiUrl(endpoint.path)
      };
      
      results[endpoint.name] = result;
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  // Resumen
  const total = Object.keys(results).length;
  const available = Object.values(results).filter(r => r.available).length;
  
  console.log('\n📊 Resumen de la prueba rápida:');
  console.log(`Total de endpoints probados: ${total}`);
  console.log(`Endpoints disponibles: ${available}`);
  console.log(`Endpoints no disponibles: ${total - available}`);
  
  // Mostrar endpoints no disponibles
  const unavailable = Object.entries(results).filter(([_, result]) => !result.available);
  if (unavailable.length > 0) {
    console.log('\n❌ Endpoints no disponibles:');
    unavailable.forEach(([name, result]) => {
      console.log(`  - ${name}: ${result.method} ${result.path} (${result.status || result.error})`);
    });
  }
  
  // Mostrar endpoints disponibles
  const availableEndpoints = Object.entries(results).filter(([_, result]) => result.available);
  if (availableEndpoints.length > 0) {
    console.log('\n✅ Endpoints disponibles:');
    availableEndpoints.forEach(([name, result]) => {
      console.log(`  - ${name}: ${result.method} ${result.path} (${result.status})`);
    });
  }
  
  return results;
}

export async function testIntakeEventsEndpoint() {
  console.log('🔍 Probando específicamente el endpoint de intake-events...');
  
  const token = useAuth.getState().userToken;
  
  if (!token) {
    console.log('⚠️ No hay token disponible para la prueba');
    return { available: false, error: 'No token available' };
  }
  
  try {
    const url = buildApiUrl('/intake-events');
    console.log('URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Endpoint disponible - Datos:', data);
      return { available: true, data };
    } else if (response.status === 404) {
      console.log('❌ Endpoint no encontrado (404)');
      return { available: false, status: 404, message: 'Endpoint not found' };
    } else {
      const errorText = await response.text();
      console.log('⚠️ Respuesta inesperada:', response.status, errorText);
      return { available: false, status: response.status, message: errorText };
    }
    
  } catch (error: any) {
    console.log('❌ Error de conexión:', error.message);
    return { available: false, error: error.message };
  }
}
