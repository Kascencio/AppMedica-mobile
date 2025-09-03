import { IMAGEKIT_CONFIG } from '../constants/imagekit';

export async function testImageKitConnectivity() {
  console.log('🧪 Probando conectividad con ImageKit...');
  
  try {
    // Probar endpoint de autenticación
    const response = await fetch(`${IMAGEKIT_CONFIG.API_BASE_URL}/files`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.PRIVATE_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Status de respuesta:', response.status);
    console.log('📡 Status text:', response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Conexión exitosa con ImageKit');
      console.log('📊 Datos de respuesta:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.log('❌ Error de conexión:', errorText);
      return { success: false, error: errorText };
    }

  } catch (error: any) {
    console.error('💥 Error de red:', error.message);
    return { success: false, error: error.message };
  }
}

export async function testImageKitUpload() {
  console.log('🧪 Probando subida de imagen a ImageKit...');
  
  try {
    // Crear un FormData simple para probar
    const formData = new FormData();
    formData.append('fileName', 'test.jpg');
    formData.append('folder', IMAGEKIT_CONFIG.FOLDER);
    formData.append('tags', 'test,connectivity');
    formData.append('useUniqueFileName', 'true');
    formData.append('responseFields', 'fileId,name,url');

    // Crear una imagen de prueba simple (1x1 pixel PNG en base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    formData.append('file', {
      uri: `data:image/png;base64,${testImageBase64}`,
      type: 'image/png',
      name: 'test.png',
    } as any);

    const response = await fetch(`${IMAGEKIT_CONFIG.API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.PRIVATE_KEY + ':')}`,
      },
      body: formData,
    });

    console.log('📡 Status de subida:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Subida exitosa:', data);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.log('❌ Error en subida:', errorText);
      return { success: false, error: errorText };
    }

  } catch (error: any) {
    console.error('💥 Error en subida:', error.message);
    return { success: false, error: error.message };
  }
}

export async function runImageKitTests() {
  console.log('🚀 Iniciando pruebas completas de ImageKit...');
  
  const results = {
    connectivity: null as any,
    upload: null as any,
  };

  // Prueba de conectividad
  console.log('\n1️⃣ Probando conectividad...');
  results.connectivity = await testImageKitConnectivity();

  // Prueba de subida
  console.log('\n2️⃣ Probando subida...');
  results.upload = await testImageKitUpload();

  console.log('\n📊 Resultados de las pruebas:');
  console.log('Conectividad:', results.connectivity.success ? '✅' : '❌');
  console.log('Subida:', results.upload.success ? '✅' : '❌');

  return results;
}
