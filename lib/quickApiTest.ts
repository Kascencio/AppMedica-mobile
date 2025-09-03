import { buildApiUrl, API_CONFIG } from '../constants/config';

export async function quickApiTest() {
  console.log('🚀 Prueba rápida de la API...');
  console.log('📍 URL base:', API_CONFIG.BASE_URL);
  
  try {
    // Probar el endpoint de health
    const healthUrl = buildApiUrl('/health');
    console.log('🔍 Probando:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('📊 Respuesta:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    if (response.ok) {
      const data = await response.json().catch(() => 'No JSON');
      console.log('✅ API funcionando correctamente');
      console.log('📄 Datos:', data);
      return {
        success: true,
        message: 'API funcionando correctamente',
        url: healthUrl,
        status: response.status,
        data
      };
    } else {
      console.log('⚠️ API respondió pero con error');
      return {
        success: false,
        message: `API respondió con error: ${response.status}`,
        url: healthUrl,
        status: response.status,
        statusText: response.statusText
      };
    }
    
  } catch (error: any) {
    console.log('❌ Error conectando a la API:', error.message);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`,
      error: error.message
    };
  }
}

export async function testAllEndpoints() {
  console.log('🔗 Probando todos los endpoints principales...');
  
  const endpoints = [
    '/health',
    '/auth/me',
    '/patients/me',
    '/notifications/health',
    '/notifications/stats'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const url = buildApiUrl(endpoint);
      console.log(`\n🔍 ${endpoint}:`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const result = {
        endpoint,
        url,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      };
      
      results.push(result);
      
      if (response.ok) {
        console.log(`   ✅ ${response.status}`);
      } else {
        console.log(`   ⚠️ ${response.status} - ${response.statusText}`);
      }
      
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        endpoint,
        url: buildApiUrl(endpoint),
        status: 0,
        ok: false,
        statusText: error.message
      });
    }
  }
  
  const working = results.filter(r => r.ok).length;
  const total = results.length;
  
  console.log(`\n📊 Resumen: ${working}/${total} endpoints funcionando`);
  
  return {
    success: working > 0,
    results,
    summary: {
      total,
      working,
      percentage: Math.round(working / total * 100)
    }
  };
}
