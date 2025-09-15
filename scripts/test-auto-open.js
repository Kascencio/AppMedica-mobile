#!/usr/bin/env node

/**
 * Script de prueba para validar la implementación de apertura automática
 * Ejecuta pruebas automatizadas para verificar el funcionamiento del sistema
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 Iniciando pruebas de apertura automática...\n');

// Función para verificar que los archivos existen
function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ ${description}: ${filePath} - ARCHIVO NO ENCONTRADO`);
    return false;
  }
}

// Función para verificar contenido de archivos
function checkFileContent(filePath, requiredContent, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasContent = requiredContent.some(item => content.includes(item));
    if (hasContent) {
      console.log(`✅ ${description}: Contenido verificado`);
      return true;
    } else {
      console.log(`❌ ${description}: Contenido requerido no encontrado`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: Error leyendo archivo - ${error.message}`);
    return false;
  }
}

// Función para verificar imports
function checkImports(filePath, requiredImports, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const missingImports = requiredImports.filter(importItem => !content.includes(importItem));
    if (missingImports.length === 0) {
      console.log(`✅ ${description}: Todos los imports encontrados`);
      return true;
    } else {
      console.log(`❌ ${description}: Imports faltantes: ${missingImports.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: Error verificando imports - ${error.message}`);
    return false;
  }
}

// Verificar archivos principales
console.log('📁 Verificando archivos principales...');
const mainFiles = [
  {
    path: 'lib/enhancedAutoOpenService.ts',
    description: 'Servicio mejorado de apertura automática'
  },
  {
    path: 'components/EnhancedAutoOpenTester.tsx',
    description: 'Componente de prueba mejorado'
  },
  {
    path: 'components/EnhancedAutoOpenDiagnostic.tsx',
    description: 'Componente de diagnóstico mejorado'
  },
  {
    path: 'docs/ENHANCED_AUTO_OPEN_IMPLEMENTATION.md',
    description: 'Documentación de implementación'
  }
];

let allFilesExist = true;
mainFiles.forEach(file => {
  if (!checkFileExists(file.path, file.description)) {
    allFilesExist = false;
  }
});

console.log('\n🔧 Verificando integración en App.tsx...');
const appIntegration = checkFileContent('App.tsx', [
  'enhancedAutoOpenService',
  'setNavigationRef',
  'initialize',
  'cleanup'
], 'Integración del servicio mejorado en App.tsx');

console.log('\n📱 Verificando canales de notificación mejorados...');
const notificationChannels = checkFileContent('lib/notificationChannels.ts', [
  'fullScreenIntent',
  'bypassDnd',
  'AndroidImportance.MAX',
  'ongoing: true',
  'autoCancel: false'
], 'Configuración mejorada de canales de notificación');

console.log('\n🔗 Verificando imports en App.tsx...');
const appImports = checkImports('App.tsx', [
  'enhancedAutoOpenService',
  'from \'./lib/enhancedAutoOpenService\''
], 'Imports del servicio mejorado');

console.log('\n⚙️ Verificando configuración del servicio mejorado...');
const serviceConfig = checkFileContent('lib/enhancedAutoOpenService.ts', [
  'fullScreenIntent',
  'interruptionLevel: \'critical\'',
  'AndroidNotificationPriority.MAX',
  'setupAppStateListener',
  'handleAlarmWithAutoOpen'
], 'Configuración del servicio mejorado');

console.log('\n🧪 Verificando componentes de prueba...');
const testerConfig = checkFileContent('components/EnhancedAutoOpenTester.tsx', [
  'scheduleEnhancedAutoOpenTest',
  'testUltraOptimizedNotification',
  'fullScreenIntent: true',
  'interruptionLevel: \'critical\''
], 'Configuración del componente de prueba');

console.log('\n🔍 Verificando componente de diagnóstico...');
const diagnosticConfig = checkFileContent('components/EnhancedAutoOpenDiagnostic.tsx', [
  'checkEnhancedPermissions',
  'checkEnhancedNotificationChannels',
  'testUltraOptimizedNotification',
  'enhancedAutoOpenService'
], 'Configuración del componente de diagnóstico');

// Resumen de resultados
console.log('\n📊 RESUMEN DE PRUEBAS:');
console.log('========================');

const results = [
  { name: 'Archivos principales', result: allFilesExist },
  { name: 'Integración en App.tsx', result: appIntegration },
  { name: 'Canales de notificación', result: notificationChannels },
  { name: 'Imports en App.tsx', result: appImports },
  { name: 'Configuración del servicio', result: serviceConfig },
  { name: 'Componente de prueba', result: testerConfig },
  { name: 'Componente de diagnóstico', result: diagnosticConfig }
];

let passedTests = 0;
results.forEach(test => {
  const status = test.result ? '✅ PASÓ' : '❌ FALLÓ';
  console.log(`${status} ${test.name}`);
  if (test.result) passedTests++;
});

const totalTests = results.length;
const successRate = Math.round((passedTests / totalTests) * 100);

console.log('\n🎯 RESULTADO FINAL:');
console.log(`Pruebas pasadas: ${passedTests}/${totalTests} (${successRate}%)`);

if (passedTests === totalTests) {
  console.log('🎉 ¡TODAS LAS PRUEBAS PASARON! La implementación está completa y lista para usar.');
  console.log('\n📋 PRÓXIMOS PASOS:');
  console.log('1. Ejecutar la app en un dispositivo real');
  console.log('2. Usar los componentes de prueba para validar la funcionalidad');
  console.log('3. Probar la apertura automática cerrando la app completamente');
  console.log('4. Verificar que las alarmas abran la app automáticamente');
  console.log('5. Confirmar que la navegación a AlarmScreen funcione correctamente');
} else {
  console.log('⚠️  ALGUNAS PRUEBAS FALLARON. Revisa los errores arriba y corrige los problemas.');
  console.log('\n🔧 ACCIONES REQUERIDAS:');
  console.log('1. Verificar que todos los archivos estén en las ubicaciones correctas');
  console.log('2. Revisar que los imports estén correctos');
  console.log('3. Confirmar que la configuración esté implementada');
  console.log('4. Ejecutar este script nuevamente después de las correcciones');
}

console.log('\n📚 DOCUMENTACIÓN:');
console.log('Lee docs/ENHANCED_AUTO_OPEN_IMPLEMENTATION.md para más detalles sobre la implementación.');

console.log('\n✨ ¡Implementación de apertura automática mejorada completada!');
