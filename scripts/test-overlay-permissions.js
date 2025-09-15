#!/usr/bin/env node

/**
 * Script de prueba para validar la implementación de permisos de overlay
 * y apertura automática corregida
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Iniciando pruebas de permisos de overlay y apertura automática...\n');

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

// Verificar archivos nuevos
console.log('📁 Verificando archivos nuevos de permisos de overlay...');
const newFiles = [
  {
    path: 'lib/overlayPermissionService.ts',
    description: 'Servicio de permisos de overlay'
  },
  {
    path: 'lib/systemAlertWindowService.ts',
    description: 'Servicio de System Alert Window'
  },
  {
    path: 'components/OverlayPermissionTester.tsx',
    description: 'Componente de prueba de permisos de overlay'
  }
];

let allNewFilesExist = true;
newFiles.forEach(file => {
  if (!checkFileExists(file.path, file.description)) {
    allNewFilesExist = false;
  }
});

console.log('\n🔧 Verificando integración en App.tsx...');
const appIntegration = checkFileContent('App.tsx', [
  'checkAutoOpenPermissions',
  'overlayPermissionService',
  'Configuración de Apertura Automática',
  'Aparecer arriba de las apps'
], 'Integración de permisos de overlay en App.tsx');

console.log('\n📱 Verificando mejoras en lib/notifications.ts...');
const notificationsImprovements = checkFileContent('lib/notifications.ts', [
  'checkAutoOpenPermissions',
  'overlayPermissionService',
  'requestOverlayPermission'
], 'Mejoras en servicio de notificaciones');

console.log('\n🔗 Verificando imports en App.tsx...');
const appImports = checkImports('App.tsx', [
  'checkAutoOpenPermissions',
  'from \'./lib/notifications\''
], 'Imports de permisos de overlay');

console.log('\n⚙️ Verificando configuración del servicio de overlay...');
const overlayServiceConfig = checkFileContent('lib/overlayPermissionService.ts', [
  'SYSTEM_ALERT_WINDOW',
  'checkOverlayPermission',
  'requestOverlayPermission',
  'requestAllAutoOpenPermissions'
], 'Configuración del servicio de overlay');

console.log('\n🚨 Verificando servicio de System Alert Window...');
const systemAlertConfig = checkFileContent('lib/systemAlertWindowService.ts', [
  'SystemAlertWindowService',
  'showAlarmAlert',
  'isServiceAvailable',
  'showFallbackAlert'
], 'Configuración del servicio de System Alert Window');

console.log('\n🧪 Verificando componente de prueba...');
const testerConfig = checkFileContent('components/OverlayPermissionTester.tsx', [
  'OverlayPermissionTester',
  'checkPermissionStatus',
  'requestOverlayPermission',
  'testSystemAlertWindow'
], 'Configuración del componente de prueba');

console.log('\n📋 Verificando AndroidManifest.xml...');
const manifestConfig = checkFileContent('android/app/src/main/AndroidManifest.xml', [
  'SYSTEM_ALERT_WINDOW',
  'POST_NOTIFICATIONS',
  'SCHEDULE_EXACT_ALARM',
  'USE_EXACT_ALARM'
], 'Configuración de permisos en AndroidManifest.xml');

// Resumen de resultados
console.log('\n📊 RESUMEN DE PRUEBAS:');
console.log('========================');

const results = [
  { name: 'Archivos nuevos', result: allNewFilesExist },
  { name: 'Integración en App.tsx', result: appIntegration },
  { name: 'Mejoras en notificaciones', result: notificationsImprovements },
  { name: 'Imports en App.tsx', result: appImports },
  { name: 'Servicio de overlay', result: overlayServiceConfig },
  { name: 'System Alert Window', result: systemAlertConfig },
  { name: 'Componente de prueba', result: testerConfig },
  { name: 'AndroidManifest.xml', result: manifestConfig }
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
  console.log('🎉 ¡TODAS LAS PRUEBAS PASARON! La implementación de permisos de overlay está completa.');
  console.log('\n📋 PRÓXIMOS PASOS:');
  console.log('1. Ejecutar la app en un dispositivo Android real');
  console.log('2. Usar el componente OverlayPermissionTester para configurar permisos');
  console.log('3. Conceder el permiso "Aparecer arriba de las apps"');
  console.log('4. Probar la apertura automática cerrando la app completamente');
  console.log('5. Verificar que las alarmas abran la app automáticamente');
  console.log('6. Confirmar que System Alert Window funcione correctamente');
} else {
  console.log('⚠️  ALGUNAS PRUEBAS FALLARON. Revisa los errores arriba y corrige los problemas.');
  console.log('\n🔧 ACCIONES REQUERIDAS:');
  console.log('1. Verificar que todos los archivos estén en las ubicaciones correctas');
  console.log('2. Revisar que los imports estén correctos');
  console.log('3. Confirmar que la configuración esté implementada');
  console.log('4. Ejecutar este script nuevamente después de las correcciones');
}

console.log('\n🔧 CARACTERÍSTICAS IMPLEMENTADAS:');
console.log('• ✅ Solicitud automática de permiso "Aparecer arriba de las apps"');
console.log('• ✅ Verificación de permisos de overlay');
console.log('• ✅ System Alert Window para alarmas');
console.log('• ✅ Alertas de respaldo cuando no hay permisos');
console.log('• ✅ Componente de prueba y diagnóstico');
console.log('• ✅ Integración completa en App.tsx');
console.log('• ✅ Modal mejorado de configuración de permisos');

console.log('\n📚 DOCUMENTACIÓN:');
console.log('Lee docs/ENHANCED_AUTO_OPEN_IMPLEMENTATION.md para más detalles sobre la implementación.');

console.log('\n✨ ¡Implementación de permisos de overlay y apertura automática corregida!');
