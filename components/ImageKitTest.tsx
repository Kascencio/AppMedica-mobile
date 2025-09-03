import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCurrentUser } from '../store/useCurrentUser';
import { Ionicons } from '@expo/vector-icons';
import { runImageKitTests } from '../lib/imagekitConnectivityTest';

export default function ImageKitTest() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const { profile } = useCurrentUser();

  const testImageUpload = async () => {
    try {
      setUploading(true);
      
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      // Seleccionar imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('[ImageKitTest] Imagen seleccionada:', result.assets[0].uri);
        
        // Subir imagen usando ImageKit
        const { uploadPhoto } = useCurrentUser.getState();
        const url = await uploadPhoto(result.assets[0].uri);
        
        console.log('[ImageKitTest] URL subida:', url);
        setUploadedUrl(url);
        
        Alert.alert('Éxito', 'Imagen subida correctamente a ImageKit');
      }
      
    } catch (error: any) {
      console.error('[ImageKitTest] Error:', error);
      Alert.alert('Error', error.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const testProfilePhoto = () => {
    if (profile?.photoUrl) {
      Alert.alert(
        'Foto de Perfil Actual',
        `URL: ${profile.photoUrl}\n\n¿Es una URL de ImageKit válida?`,
        [
          { text: 'Sí', onPress: () => console.log('URL válida') },
          { text: 'No', onPress: () => console.log('URL inválida') }
        ]
      );
    } else {
      Alert.alert('Sin Foto', 'No hay foto de perfil configurada');
    }
  };

  const testImageKitConnectivity = async () => {
    try {
      Alert.alert('Prueba de Conectividad', 'Ejecutando pruebas de ImageKit...');
      const results = await runImageKitTests();
      
      const message = `Conectividad: ${results.connectivity.success ? '✅' : '❌'}\nSubida: ${results.upload.success ? '✅' : '❌'}`;
      Alert.alert('Resultados', message);
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error en las pruebas');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Prueba de ImageKit</Text>
      
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>Estado:</Text>
        <Text style={styles.statusText}>
          • Perfil cargado: {profile ? '✅' : '❌'}
        </Text>
        <Text style={styles.statusText}>
          • ID de perfil: {profile?.id || 'No disponible'}
        </Text>
        <Text style={styles.statusText}>
          • Foto actual: {profile?.photoUrl ? '✅' : '❌'}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, uploading && styles.buttonDisabled]}
        onPress={testImageUpload}
        disabled={uploading}
      >
        <Ionicons name="cloud-upload" size={24} color="#fff" />
        <Text style={styles.buttonText}>
          {uploading ? 'Subiendo...' : 'Probar Subida'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.infoButton]}
        onPress={testProfilePhoto}
      >
        <Ionicons name="information-circle" size={24} color="#fff" />
        <Text style={styles.buttonText}>Ver Foto Actual</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.connectivityButton]}
        onPress={testImageKitConnectivity}
      >
        <Ionicons name="wifi" size={24} color="#fff" />
        <Text style={styles.buttonText}>Probar Conectividad</Text>
      </TouchableOpacity>

      {uploadedUrl && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>✅ Imagen Subida:</Text>
          <Text style={styles.resultUrl}>{uploadedUrl}</Text>
          <Image 
            source={{ uri: uploadedUrl }} 
            style={styles.previewImage}
            resizeMode="cover"
          />
        </View>
      )}

      {profile?.photoUrl && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>📸 Foto de Perfil:</Text>
          <Text style={styles.resultUrl}>{profile.photoUrl}</Text>
          <Image 
            source={{ uri: profile.photoUrl }} 
            style={styles.previewImage}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusSection: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  infoButton: {
    backgroundColor: '#06b6d4',
  },
  connectivityButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultSection: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  resultUrl: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 8,
    wordBreak: 'break-all',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#0ea5e9',
  },
});
