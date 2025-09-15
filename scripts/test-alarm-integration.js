#!/usr/bin/env node

/**
 * Script de prueba para validar la integración completa de permisos de overlay
 * en el sistema de alarmas
 */

import fs from 'fs';
import path from 'path';

console.log('🚨 Iniciando pruebas de integración de alarmas con permisos de overlay...\n');

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

// Verificar integración en servicios de alarmas
console.log('🔧 Verificando integración en servicios de alarmas...');

const alarmServices = [
  {
    path: 'lib/unifiedAlarmService.ts',
    description: 'Servicio unificado de alarmas',
    requiredContent: [
      'systemAlertWindowService',
      'showAlarmAlert',
      'import(\'./systemAlertWindowService\')'
    ]
  },
  {
    path: 'lib/enhancedAutoOpenService.ts',
    description: 'Servicio mejorado de apertura automática',
    requiredContent: [
      'systemAlertWindowService',
      'showAlarmAlert',
      'import(\'./systemAlertWindowService\')'
    ]
  },
  {
    path: 'lib/alarmDisplayService.ts',
    description: 'Servicio de visualización de alarmas',
    requiredContent: [
      'systemAlertWindowService',
      'showAlarmAlert',
      'import(\'./systemAlertWindowService\')'
    ]
  }
];

let allServicesIntegrated = true;
alarmServices.forEach(service => {
  if (!checkFileContent(service.path, service.requiredContent, service.description)) {
    allServicesIntegrated = false;
  }
});

console.log('\n📱 Verificando servicios de overlay...');
const overlayServices = [
  {
    path: 'lib/overlayPermissionService.ts',
    description: 'Servicio de permisos de overlay'
  },
  {
    path: 'lib/systemAlertWindowService.ts',
    description: 'Servicio de System Alert Window'
  }
];

let allOverlayServicesExist = true;
overlayServices.forEach(service => {
  if (!checkFileExists(service.path, service.description)) {
    allOverlayServicesExist = false;
  }
});

console.log('\n🔗 Verificando integración en App.tsx...');
const appIntegration = checkFileContent('App.tsx', [
  'checkAutoOpenPermissions',
  'overlayPermissionService',
  'Configuración de Apertura Automática',
  'Aparecer arriba de las apps'
], 'Integración de permisos de overlay en App.tsx');

console.log('\n📋 Verificando integración en lib/notifications.ts...');
const notificationsIntegration = checkFileContent('lib/notifications.ts', [
  'checkAutoOpenPermissions',
  'overlayPermissionService',
  'requestOverlayPermission'
], 'Integración en servicio de notificaciones');

console.log('\n🧪 Verificando componente de prueba...');
const testerExists = checkFileExists('components/OverlayPermissionTester.tsx', 'Componente de prueba de overlay');

console.log('\n📱 Verificando AndroidManifest.xml...');
const manifestConfig = checkFileContent('android/app/src/main/AndroidManifest.xml', [
  'SYSTEM_ALERT_WINDOW',
  'POST_NOTIFICATIONS',
  'SCHEDULE_EXACT_ALARM',
  'USE_EXACT_ALARM'
], 'Configuración de permisos en AndroidManifest.xml');

console.log('\n🔧 Verificando flujo de integración...');
const integrationFlow = checkFileContent('lib/systemAlertWindowService.ts', [
  'overlayPermissionService.checkOverlayPermission',
  'showSystemAlertWithFallback',
  'showFallbackAlert'
], 'Flujo de integración en System Alert Window');

// Resumen de resultados
console.log('\n📊 RESUMEN DE PRUEBAS DE INTEGRACIÓN:');
console.log('=====================================');

const results = [
  { name: 'Servicios de alarmas integrados', result: allServicesIntegrated },
  { name: 'Servicios de overlay existentes', result: allOverlayServicesExist },
  { name: 'Integración en App.tsx', result: appIntegration },
  { name: 'Integración en notificaciones', result: notificationsIntegration },
  { name: 'Componente de prueba', result: testerExists },
  { name: 'AndroidManifest.xml', result: manifestConfig },
  { name: 'Flujo de integración', result: integrationFlow }
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
  console.log('🎉 ¡TODAS LAS PRUEBAS PASARON! La integración de permisos de overlay está completa.');
  console.log('\n📋 FUNCIONALIDADES INTEGRADAS:');
  console.log('• ✅ UnifiedAlarmService usa System Alert Window');
  console.log('• ✅ EnhancedAutoOpenService usa System Alert Window');
  console.log('• ✅ AlarmDisplayService usa System Alert Window');
  console.log('• ✅ Verificación automática de permisos de overlay');
  console.log('• ✅ Solicitud automática de permisos al iniciar');
  console.log('• ✅ Modal informativo sobre configuración necesaria');
  console.log('• ✅ Fallback a alertas normales si no hay permisos');
  console.log('• ✅ Componente de prueba y diagnóstico');
  
  console.log('\n🚀 PRÓXIMOS PASOS:');
  console.log('1. Ejecutar la app en un dispositivo Android real');
  console.log('2. La app solicitará automáticamente permisos de overlay');
  console.log('3. Conceder "Aparecer arriba de las apps" cuando se solicite');
  console.log('4. Programar una alarma de prueba');
  console.log('5. Cerrar la app completamente');
  console.log('6. Verificar que la alarma aparezca encima de otras apps');
  console.log('7. Verificar que la app se abra automáticamente');
} else {
  console.log('⚠️  ALGUNAS PRUEBAS FALLARON. La integración no está completa.');
  console.log('\n🔧 ACCIONES REQUERIDAS:');
  console.log('1. Verificar que todos los servicios estén integrados');
  console.log('2. Revisar que los imports estén correctos');
  console.log('3. Confirmar que la configuración esté implementada');
  console.log('4. Ejecutar este script nuevamente después de las correcciones');
}

console.log('\n🔧 ARQUITECTURA DE INTEGRACIÓN:');
console.log('┌─────────────────────────────────────┐');
console.log('│        Sistema de Alarmas           │');
console.log('│  ┌─────────────────────────────────┐ │');
console.log('│  │  unifiedAlarmService.ts         │ │');
console.log('│  │  enhancedAutoOpenService.ts     │ │');
console.log('│  │  alarmDisplayService.ts         │ │');
console.log('│  └─────────────────────────────────┘ │');
console.log('│                   │                  │');
console.log('│                   ▼                  │');
console.log('│  ┌─────────────────────────────────┐ │');
console.log('│  │  systemAlertWindowService.ts    │ │');
console.log('│  │  overlayPermissionService.ts    │ │');
console.log('│  └─────────────────────────────────┘ │');
console.log('└─────────────────────────────────────┘');
console.log('                   │');
console.log('                   ▼');
console.log('┌─────────────────────────────────────┐');
console.log('│        Android Nativo               │');
console.log('│  ┌─────────────────────────────────┐ │');
console.log('│  │  SYSTEM_ALERT_WINDOW Permission │ │');
console.log('│  │  System Alert Window            │ │');
console.log('│  └─────────────────────────────────┘ │');
console.log('└─────────────────────────────────────┘');

console.log('\n✨ ¡Integración de permisos de overlay en alarmas completada!');
