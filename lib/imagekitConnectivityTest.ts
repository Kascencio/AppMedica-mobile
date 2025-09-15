import { IMAGEKIT_CONFIG } from '../constants/imagekit';

export interface ConnectivityTestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

/**
 * Prueba la conectividad y credenciales de ImageKit
 */
export async function testImageKitConnectivity(): Promise<ConnectivityTestResult> {
  try {
    console.log('[ImageKitTest] 🧪 Iniciando prueba de conectividad con ImageKit...');
    
    // Verificar configuración básica
    if (!IMAGEKIT_CONFIG.PRIVATE_KEY || !IMAGEKIT_CONFIG.URL_ENDPOINT) {
      return {
        success: false,
        message: 'Configuración de ImageKit incompleta',
        error: 'Faltan PRIVATE_KEY o URL_ENDPOINT en la configuración'
      };
    }
    
    console.log('[ImageKitTest] ✅ Configuración básica verificada');
    
    // Probar endpoint de autenticación con una consulta simple
    const testUrl = `${IMAGEKIT_CONFIG.API_BASE_URL}/files?limit=1`;
    console.log('[ImageKitTest] 🌐 Probando endpoint:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.PRIVATE_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[ImageKitTest] 📡 Respuesta del servidor:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[ImageKitTest] ✅ Conectividad exitosa');
      
      return {
        success: true,
        message: 'Conectividad con ImageKit exitosa',
        details: {
          status: response.status,
          fileCount: data?.length || 0,
          endpoint: IMAGEKIT_CONFIG.URL_ENDPOINT
        }
      };
    } else {
      const errorText = await response.text();
      console.error('[ImageKitTest] ❌ Error de autenticación:', response.status, errorText);
      
      let errorMessage = 'Error de autenticación con ImageKit';
      if (response.status === 401) {
        errorMessage = 'Credenciales de ImageKit inválidas o expiradas';
      } else if (response.status === 403) {
        errorMessage = 'Permisos insuficientes en ImageKit';
      } else if (response.status >= 500) {
        errorMessage = 'Error del servidor de ImageKit';
      }
      
      return {
        success: false,
        message: errorMessage,
        error: `HTTP ${response.status}: ${errorText}`,
        details: {
          status: response.status,
          statusText: response.statusText
        }
      };
    }
    
  } catch (error: any) {
    console.error('[ImageKitTest] ❌ Error de conectividad:', error);
    
    let errorMessage = 'Error de conectividad con ImageKit';
    if (error.message?.includes('Network request failed')) {
      errorMessage = 'Sin conexión a internet o ImageKit no disponible';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Timeout al conectar con ImageKit';
    } else if (error.message?.includes('CORS')) {
      errorMessage = 'Error de CORS al conectar con ImageKit';
    }
    
    return {
      success: false,
      message: errorMessage,
      error: error.message,
      details: {
        type: error.constructor.name,
        code: error.code
      }
    };
  }
}

/**
 * Prueba la subida de una imagen de prueba a ImageKit
 */
export async function testImageKitUpload(): Promise<ConnectivityTestResult> {
  try {
    console.log('[ImageKitTest] 🚀 Probando subida de imagen de prueba...');
    
    // Crear una imagen de prueba simple (1x1 pixel PNG en base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const testFileName = `test_${Date.now()}.png`;
    
    // Convertir base64 a blob para FormData
    const byteCharacters = atob(testImageBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    // Preparar FormData
    const formData = new FormData();
    formData.append('file', blob, testFileName);
    formData.append('fileName', testFileName);
    formData.append('folder', '/recuerdamed/test');
    formData.append('tags', 'test,connectivity');
    formData.append('useUniqueFileName', 'true');
    
    console.log('[ImageKitTest] 📤 Subiendo imagen de prueba...');
    
    const response = await fetch(`${IMAGEKIT_CONFIG.API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.PRIVATE_KEY + ':')}`,
      },
      body: formData,
    });
    
    console.log('[ImageKitTest] 📡 Respuesta de subida:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('[ImageKitTest] ✅ Subida de prueba exitosa:', result.url);
      
      // Intentar eliminar la imagen de prueba
      try {
        await fetch(`${IMAGEKIT_CONFIG.API_BASE_URL}/files/${result.fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.PRIVATE_KEY + ':')}`,
          },
        });
        console.log('[ImageKitTest] 🗑️ Imagen de prueba eliminada');
      } catch (deleteError) {
        console.warn('[ImageKitTest] ⚠️ No se pudo eliminar imagen de prueba:', deleteError);
      }
      
      return {
        success: true,
        message: 'Subida de prueba a ImageKit exitosa',
        details: {
          fileId: result.fileId,
          url: result.url,
          size: result.size
        }
      };
    } else {
      const errorText = await response.text();
      console.error('[ImageKitTest] ❌ Error en subida de prueba:', response.status, errorText);
      
      return {
        success: false,
        message: 'Error en subida de prueba a ImageKit',
        error: `HTTP ${response.status}: ${errorText}`,
        details: {
          status: response.status,
          statusText: response.statusText
        }
      };
    }
    
  } catch (error: any) {
    console.error('[ImageKitTest] ❌ Error en prueba de subida:', error);
    
    return {
      success: false,
      message: 'Error en prueba de subida a ImageKit',
      error: error.message,
      details: {
        type: error.constructor.name
      }
    };
  }
}

/**
 * Ejecuta todas las pruebas de ImageKit
 */
export async function runImageKitDiagnostics(): Promise<{
  connectivity: ConnectivityTestResult;
  upload: ConnectivityTestResult;
  overall: boolean;
  summary: string;
}> {
  console.log('[ImageKitTest] 🔧 Iniciando diagnóstico completo de ImageKit...');
  
  const connectivity = await testImageKitConnectivity();
  const upload = await testImageKitUpload();
  
  const overall = connectivity.success && upload.success;
  let summary = '';
  
  if (overall) {
    summary = '✅ Todas las pruebas de ImageKit pasaron exitosamente';
  } else if (!connectivity.success) {
    summary = '❌ Error de conectividad con ImageKit - verificar credenciales';
  } else if (!upload.success) {
    summary = '⚠️ Conectividad OK pero error en subida - verificar permisos';
  }
  
  console.log('[ImageKitTest] 📊 Resultado del diagnóstico:', summary);
  
  return {
    connectivity,
    upload,
    overall,
    summary
  };
}