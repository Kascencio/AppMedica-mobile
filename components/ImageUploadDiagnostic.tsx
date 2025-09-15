import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCurrentUser } from '../store/useCurrentUser';
import { imageUploadService } from '../lib/imageUploadService';
import { runImageKitDiagnostics } from '../lib/imagekitConnectivityTest';
import { Ionicons } from '@expo/vector-icons';

export default function ImageUploadDiagnostic() {
  const { profile } = useCurrentUser();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testImageKitCredentials = async () => {
    setTesting(true);
    addResult('🧪 Iniciando diagnóstico completo de ImageKit...');
    
    try {
      const diagnostics = await runImageKitDiagnostics();
      
      // Resultados de conectividad
      addResult(`🌐 Conectividad: ${diagnostics.connectivity.success ? '✅' : '❌'} ${diagnostics.connectivity.message}`);
      if (diagnostics.connectivity.error) {
        addResult(`   Error: ${diagnostics.connectivity.error}`);
      }
      if (diagnostics.connectivity.details) {
        addResult(`   Detalles: ${JSON.stringify(diagnostics.connectivity.details)}`);
      }
      
      // Resultados de subida
      addResult(`📤 Subida: ${diagnostics.upload.success ? '✅' : '❌'} ${diagnostics.upload.message}`);
      if (diagnostics.upload.error) {
        addResult(`   Error: ${diagnostics.upload.error}`);
      }
      if (diagnostics.upload.details) {
        addResult(`   Detalles: ${JSON.stringify(diagnostics.upload.details)}`);
      }
      
      // Resumen general
      addResult(`📊 Resumen: ${diagnostics.summary}`);
      
      // Mostrar alerta con el resultado
      Alert.alert(
        'Diagnóstico de ImageKit',
        diagnostics.summary,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      addResult(`❌ Error en diagnóstico: ${error.message}`);
      Alert.alert('Error', 'Error al ejecutar el diagnóstico de ImageKit');
    }
    
    setTesting(false);
  };

  const testImageUpload = async () => {
    setTesting(true);
    addResult('📷 Iniciando prueba de subida de imagen...');
    
    try {
      // Solicitar permisos
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        addResult('❌ Permisos de galería denegados');
        setTesting(false);
        return;
      }
      addResult('✅ Permisos de galería concedidos');
      
      // Seleccionar imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (result.canceled || !result.assets || !result.assets[0]) {
        addResult('⚠️ Selección de imagen cancelada');
        setTesting(false);
        return;
      }
      
      const asset = result.assets[0];
      addResult(`✅ Imagen seleccionada: ${asset.uri}`);
      addResult(`📏 Dimensiones: ${asset.width}x${asset.height}`);
      addResult(`💾 Tamaño: ${asset.fileSize ? (asset.fileSize / 1024).toFixed(1) + 'KB' : 'Desconocido'}`);
      
      if (!profile?.id) {
        addResult('❌ No hay perfil para subir imagen');
        setTesting(false);
        return;
      }
      
      // Probar subida directa con ImageUploadService
      addResult('🚀 Iniciando subida con ImageUploadService...');
      const uploadResult = await imageUploadService.uploadImage(asset.uri, {
        userId: profile.id,
        folder: '/recuerdamed/profiles',
        tags: ['profile', 'avatar', 'test'],
        useUniqueFileName: true,
        compressImage: true,
      });
      
      if (uploadResult.success) {
        addResult(`✅ Subida exitosa! URL: ${uploadResult.url}`);
        addResult(`🆔 File ID: ${uploadResult.fileId}`);
        if (uploadResult.metadata) {
          addResult(`📊 Metadata: ${uploadResult.metadata.width}x${uploadResult.metadata.height}, ${uploadResult.metadata.size} bytes`);
        }
      } else {
        addResult(`❌ Error en subida: ${uploadResult.error}`);
      }
      
      // Probar subida con useCurrentUser
      addResult('🔄 Probando subida con useCurrentUser.uploadPhoto...');
      try {
        const { uploadPhoto } = useCurrentUser.getState();
        const url = await uploadPhoto(asset.uri);
        addResult(`✅ useCurrentUser.uploadPhoto exitoso: ${url}`);
      } catch (error: any) {
        addResult(`❌ Error en useCurrentUser.uploadPhoto: ${error.message}`);
      }
      
    } catch (error: any) {
      addResult(`❌ Error en prueba de subida: ${error.message}`);
    }
    
    setTesting(false);
  };

  const testProfileSave = async () => {
    if (!profile?.id) {
      addResult('❌ No hay perfil para probar guardado');
      return;
    }
    
    setTesting(true);
    addResult('💾 Probando guardado de perfil con URL de imagen...');
    
    try {
      const { updateProfile } = useCurrentUser.getState();
      
      // Intentar actualizar solo el campo photoUrl
      await updateProfile({
        photoUrl: 'https://ik.imagekit.io/keaf13/test-image.jpg'
      });
      
      addResult('✅ Guardado de perfil exitoso');
      
    } catch (error: any) {
      addResult(`❌ Error en guardado de perfil: ${error.message}`);
    }
    
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Diagnóstico de Subida de Imágenes</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={testImageKitCredentials}
          disabled={testing}
        >
          <Ionicons name="key" size={20} color="#fff" />
          <Text style={styles.buttonText}>Probar Credenciales</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={testImageUpload}
          disabled={testing}
        >
          <Ionicons name="camera" size={20} color="#2563eb" />
          <Text style={[styles.buttonText, { color: '#2563eb' }]}>Probar Subida</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.tertiaryButton]} 
          onPress={testProfileSave}
          disabled={testing}
        >
          <Ionicons name="save" size={20} color="#22c55e" />
          <Text style={[styles.buttonText, { color: '#22c55e' }]}>Probar Guardado</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={clearResults}
          disabled={testing}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
          <Text style={[styles.buttonText, { color: '#ef4444' }]}>Limpiar Logs</Text>
        </TouchableOpacity>
      </View>
      
      {testing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Ejecutando pruebas...</Text>
        </View>
      )}
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>📋 Resultados de las Pruebas:</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No hay resultados aún. Ejecuta alguna prueba.</Text>
        ) : (
          testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>{result}</Text>
          ))
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>ℹ️ Información del Perfil:</Text>
        <Text style={styles.infoText}>ID: {profile?.id || 'No disponible'}</Text>
        <Text style={styles.infoText}>Nombre: {profile?.name || 'No disponible'}</Text>
        <Text style={styles.infoText}>Foto actual: {profile?.photoUrl ? '✅ Sí' : '❌ No'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  tertiaryButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#2563eb',
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 300,
  },
  resultsTitle: {
    color: '#f1f5f9',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noResults: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  resultText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  infoContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  infoTitle: {
    color: '#0c4a6e',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#075985',
    fontSize: 14,
    marginBottom: 4,
  },
});
