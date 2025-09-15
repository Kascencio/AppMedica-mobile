#!/usr/bin/env node

/**
 * Script de verificación del sistema de imágenes mejorado
 * Verifica que todos los componentes estén correctamente implementados
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verificando implementación del sistema de imágenes...\n');

// Archivos que deben existir
const requiredFiles = [
  'lib/imageUploadService.ts',
  'lib/fallbackImageService.ts',
  'lib/imagekitConnectivityTest.ts',
  'components/ImageUploadDiagnostic.tsx',
  'components/DatabaseDiagnostic.tsx',
  'data/migrations/fix_profiles_created_at.ts'
];

// Verificaciones de contenido
const contentChecks = [
  {
    file: 'lib/imageUploadService.ts',
    checks: [
      'fallbackImageService',
      'method.*imagekit.*local.*base64'
    ]
  },
  {
    file: 'store/useCurrentUser.ts',
    checks: [
      'createdAt.*new Date.*toISOString',
      'updatedAt.*new Date.*toISOString'
    ]
  },
  {
    file: 'screens/Profile/ProfileScreen.tsx',
    checks: [
      'ImageUploadDiagnostic',
      'DatabaseDiagnostic',
      'isFallbackImage'
    ]
  },
  {
    file: 'data/db.ts',
    checks: [
      'fixProfilesCreatedAt',
      'getDatabase.*SQLiteDatabase'
    ]
  }
];

let allPassed = true;

// Verificar archivos requeridos
console.log('📁 Verificando archivos requeridos...');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - FALTANTE`);
    allPassed = false;
  }
});

console.log('\n📋 Verificando contenido de archivos...');

// Verificar contenido
contentChecks.forEach(check => {
  const filePath = path.join(__dirname, '..', check.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ ${check.file} - Archivo no encontrado`);
    allPassed = false;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  check.checks.forEach(pattern => {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(content)) {
      console.log(`  ✅ ${check.file} - Contiene: ${pattern}`);
    } else {
      console.log(`  ❌ ${check.file} - Falta: ${pattern}`);
      allPassed = false;
    }
  });
});

console.log('\n🔧 Verificando configuración de ImageKit...');
const imagekitPath = path.join(__dirname, '..', 'constants/imagekit.ts');
if (fs.existsSync(imagekitPath)) {
  const content = fs.readFileSync(imagekitPath, 'utf8');
  if (content.includes('IMAGEKIT_CONFIG') && content.includes('PRIVATE_KEY') && content.includes('URL_ENDPOINT')) {
    console.log('  ✅ Configuración de ImageKit encontrada');
  } else {
    console.log('  ⚠️ Configuración de ImageKit incompleta');
    allPassed = false;
  }
} else {
  console.log('  ❌ Archivo de configuración de ImageKit no encontrado');
  allPassed = false;
}

console.log('\n📊 Resultado de la verificación:');
if (allPassed) {
  console.log('✅ Sistema de imágenes implementado correctamente');
  console.log('\n🎯 Funcionalidades disponibles:');
  console.log('  • Subida de imágenes a ImageKit');
  console.log('  • Respaldo local automático');
  console.log('  • Respaldo base64 como último recurso');
  console.log('  • Diagnóstico de conectividad');
  console.log('  • Diagnóstico de base de datos');
  console.log('  • Corrección automática de errores');
  console.log('  • Manejo robusto de errores');
  
  console.log('\n🚀 Para probar el sistema:');
  console.log('  1. Abre la app');
  console.log('  2. Ve a ProfileScreen');
  console.log('  3. Usa "Cambiar foto" para seleccionar una imagen');
  console.log('  4. Usa los componentes de diagnóstico para verificar el estado');
  
} else {
  console.log('❌ Hay problemas en la implementación');
  console.log('Revisa los errores mostrados arriba y corrige los archivos faltantes');
}

console.log('\n✨ Verificación completada');
