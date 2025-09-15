import { buildApiUrl, API_CONFIG } from '../constants/config';
import { useAuth } from '../store/useAuth';

export interface DiagnosticResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
  data?: any;
}

export async function diagnoseServerIssues(): Promise<DiagnosticResult[]> {
  console.log('🔍 Iniciando diagnóstico del servidor...');
  
  const results: DiagnosticResult[] = [];
  const token = useAuth.getState().userToken;
  
  if (!token) {
    console.log('❌ No hay token de autenticación disponible');
    return results;
  }

  // Endpoints a probar
  const endpointsToTest = [
    {
      name: 'Health Check',
      url: buildApiUrl('/health'),
      method: 'GET',
      requiresAuth: false
    },
    {
      name: 'Auth Me',
      url: buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME),
      method: 'GET',
      requiresAuth: true
    },
    {
      name: 'Patients Me',
      url: buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME),
      method: 'GET',
      requiresAuth: true
    },
    {
      name: 'Medications',
      url: buildApiUrl(API_CONFIG.ENDPOINTS.MEDICATIONS.BASE),
      method: 'GET',
      requiresAuth: true
    },
    {
      name: 'Treatments',
      url: buildApiUrl(API_CONFIG.ENDPOINTS.TREATMENTS.BASE),
      method: 'GET',
      requiresAuth: true
    },
    {
      name: 'Appointments',
      url: buildApiUrl(API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE),
      method: 'GET',
      requiresAuth: true
    }
  ];

  for (const endpoint of endpointsToTest) {
    console.log(`🧪 Probando ${endpoint.name}: ${endpoint.url}`);
    
    const startTime = Date.now();
    
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (endpoint.requiresAuth) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers,
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
      
      const result: DiagnosticResult = {
        endpoint: endpoint.name,
        method: endpoint.method,
        status: response.status,
        success: response.ok,
        responseTime,
        data: response.ok ? data : undefined,
        error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : undefined
      };
      
      results.push(result);
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name}: OK (${response.status}) - ${responseTime}ms`);
      } else {
        console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText} - ${responseTime}ms`);
        console.log(`📄 Respuesta:`, data);
      }
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      const result: DiagnosticResult = {
        endpoint: endpoint.name,
        method: endpoint.method,
        status: 0,
        success: false,
        responseTime,
        error: error.message
      };
      
      results.push(result);
      console.log(`💥 ${endpoint.name}: Error de conexión - ${error.message}`);
    }
  }
  
  // Resumen del diagnóstico
  console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Exitosos: ${successful.length}/${results.length}`);
  console.log(`❌ Fallidos: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n🚨 ENDPOINTS CON PROBLEMAS:');
    failed.forEach(result => {
      console.log(`- ${result.endpoint}: ${result.error}`);
    });
  }
  
  return results;
}

export async function testSpecificPatientId(patientId: string): Promise<DiagnosticResult[]> {
  console.log(`🔍 Probando endpoints específicos para paciente: ${patientId}`);
  
  const results: DiagnosticResult[] = [];
  const token = useAuth.getState().userToken;
  
  if (!token) {
    console.log('❌ No hay token de autenticación disponible');
    return results;
  }

  // Probar endpoints que requieren patientProfileId
  const endpointsWithPatientId = [
    {
      name: 'Medications con PatientId',
      url: `${buildApiUrl(API_CONFIG.ENDPOINTS.MEDICATIONS.BASE)}?patientProfileId=${patientId}`,
      method: 'GET'
    },
    {
      name: 'Treatments con PatientId',
      url: `${buildApiUrl(API_CONFIG.ENDPOINTS.TREATMENTS.BASE)}?patientProfileId=${patientId}`,
      method: 'GET'
    },
    {
      name: 'Appointments con PatientId',
      url: `${buildApiUrl(API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE)}?patientProfileId=${patientId}`,
      method: 'GET'
    }
  ];

  for (const endpoint of endpointsWithPatientId) {
    console.log(`🧪 Probando ${endpoint.name}: ${endpoint.url}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(10000)
      });
      
      const responseTime = Date.now() - startTime;
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
      
      const result: DiagnosticResult = {
        endpoint: endpoint.name,
        method: endpoint.method,
        status: response.status,
        success: response.ok,
        responseTime,
        data: response.ok ? data : undefined,
        error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : undefined
      };
      
      results.push(result);
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name}: OK (${response.status}) - ${responseTime}ms`);
      } else {
        console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText} - ${responseTime}ms`);
        console.log(`📄 Respuesta:`, data);
      }
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      const result: DiagnosticResult = {
        endpoint: endpoint.name,
        method: endpoint.method,
        status: 0,
        success: false,
        responseTime,
        error: error.message
      };
      
      results.push(result);
      console.log(`💥 ${endpoint.name}: Error de conexión - ${error.message}`);
    }
  }
  
  return results;
}

export async function runFullServerDiagnostic(): Promise<void> {
  console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO DEL SERVIDOR');
  console.log('='.repeat(60));
  
  // 1. Diagnóstico general
  const generalResults = await diagnoseServerIssues();
  
  // 2. Obtener patientId del token si está disponible
  const token = useAuth.getState().userToken;
  let patientId: string | null = null;
  
  if (token) {
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      patientId = tokenPayload.id || tokenPayload.patientId || tokenPayload.patientProfileId;
      console.log(`\n🔑 PatientId extraído del token: ${patientId}`);
    } catch (error) {
      console.log('❌ Error extrayendo patientId del token:', error);
    }
  }
  
  // 3. Si tenemos patientId, probar endpoints específicos
  if (patientId) {
    console.log('\n🎯 PROBANDO ENDPOINTS ESPECÍFICOS DEL PACIENTE');
    console.log('-'.repeat(50));
    const specificResults = await testSpecificPatientId(patientId);
    
    // Combinar resultados
    const allResults = [...generalResults, ...specificResults];
    
    // Análisis final
    console.log('\n📈 ANÁLISIS FINAL');
    console.log('='.repeat(60));
    
    const successful = allResults.filter(r => r.success);
    const failed = allResults.filter(r => !r.success);
    
    console.log(`✅ Total exitosos: ${successful.length}/${allResults.length}`);
    console.log(`❌ Total fallidos: ${failed.length}/${allResults.length}`);
    
    if (failed.length > 0) {
      console.log('\n🚨 PROBLEMAS DETECTADOS:');
      failed.forEach(result => {
        console.log(`- ${result.endpoint}: ${result.error}`);
      });
      
      // Determinar si es problema del servidor o del cliente
      const serverErrors = failed.filter(r => r.status >= 500);
      const clientErrors = failed.filter(r => r.status >= 400 && r.status < 500);
      const networkErrors = failed.filter(r => r.status === 0);
      
      console.log('\n🔍 CLASIFICACIÓN DE ERRORES:');
      console.log(`- Errores del servidor (5xx): ${serverErrors.length}`);
      console.log(`- Errores del cliente (4xx): ${clientErrors.length}`);
      console.log(`- Errores de red (0xx): ${networkErrors.length}`);
      
      if (serverErrors.length > 0) {
        console.log('\n🚨 CONCLUSIÓN: El problema está en el SERVIDOR');
        console.log('Los errores 5xx indican problemas internos del servidor');
      } else if (clientErrors.length > 0) {
        console.log('\n⚠️ CONCLUSIÓN: El problema está en el CLIENTE');
        console.log('Los errores 4xx indican problemas con la solicitud (datos inválidos, permisos, etc.)');
      } else if (networkErrors.length > 0) {
        console.log('\n🌐 CONCLUSIÓN: El problema está en la CONECTIVIDAD');
        console.log('Los errores de red indican problemas de conexión');
      }
    } else {
      console.log('\n✅ CONCLUSIÓN: El servidor está funcionando correctamente');
    }
  } else {
    console.log('\n⚠️ No se pudo obtener patientId del token para pruebas específicas');
  }
}
