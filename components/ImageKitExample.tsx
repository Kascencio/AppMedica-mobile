import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import OptimizedImage from './OptimizedImage';
import { useImageUpload } from '../lib/imageUploadService';
import { useCurrentUser } from '../store/useCurrentUser';
import { Ionicons } from '@expo/vector-icons';

export default function ImageKitExample() {
  const [uploading, setUploading] = useState(false);
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const { profile } = useCurrentUser();
  const { uploadProfilePhoto } = useImageUpload();

  const handlePickImage = async () => {
    try {
      setUploading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('[ImageKitExample] Imagen seleccionada:', result.assets[0].uri);
        
        if (profile?.id) {
          const uploadResult = await uploadProfilePhoto(result.assets[0].uri, profile.id);
          
          if (uploadResult.success && uploadResult.url) {
            setTestImageUrl(uploadResult.url);
            Alert.alert('Éxito', 'Imagen subida correctamente a ImageKit');
            console.log('[ImageKitExample] URL de imagen:', uploadResult.url);
          } else {
            Alert.alert('Error', uploadResult.error || 'Error al subir imagen');
          }
        } else {
          Alert.alert('Error', 'Perfil de usuario no encontrado');
        }
      }
    } catch (error) {
      console.error('[ImageKitExample] Error:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ejemplo de ImageKit</Text>
      
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>Imagen de Perfil Actual</Text>
        <OptimizedImage
          uri={profile?.photoUrl || ''} 
          size="avatar"
          width={100}
          height={100}
          style={styles.avatarImage}
          showLoading={true}
          fallbackSource={require('../assets/logo.png')}
        />
      </View>

      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>Imagen de Prueba Subida</Text>
        {testImageUrl ? (
          <OptimizedImage
            uri={testImageUrl}
            size="avatar"
            width={100}
            height={100}
            style={styles.testImage}
            showLoading={true}
            fallbackSource={require('../assets/logo.png')}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
            <Text style={styles.placeholderText}>Sin imagen</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        onPress={handlePickImage}
        disabled={uploading}
      >
        <Ionicons 
          name={uploading ? "cloud-upload" : "camera"} 
          size={24} 
          color="#fff" 
        />
        <Text style={styles.uploadButtonText}>
          {uploading ? 'Subiendo...' : 'Subir Imagen'}
        </Text>
      </TouchableOpacity>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Características de ImageKit:</Text>
        <Text style={styles.infoText}>• Optimización automática de imágenes</Text>
        <Text style={styles.infoText}>• Diferentes tamaños (avatar, thumbnail, full)</Text>
        <Text style={styles.infoText}>• Compresión inteligente</Text>
        <Text style={styles.infoText}>• URLs optimizadas para CDN</Text>
        <Text style={styles.infoText}>• Manejo de errores y fallbacks</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  testImage: {
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  avatarImage: {
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 20,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});
