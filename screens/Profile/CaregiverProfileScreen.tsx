import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useCurrentUser } from '../../store/useCurrentUser';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const defaultAvatar = require('../../assets/logo.png');

export default function CaregiverProfileScreen() {
  const { profile, updateProfile, loading } = useCurrentUser();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [relationship, setRelationship] = useState(profile?.relationship || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('[CaregiverProfileScreen] Imagen seleccionada:', result.assets[0].uri);
        
        // Subir la imagen usando ImageKit
        const { uploadPhoto } = useCurrentUser.getState();
        const uploadedUrl = await uploadPhoto(result.assets[0].uri);
        
        console.log('[CaregiverProfileScreen] URL de imagen subida:', uploadedUrl);
        setPhotoUrl(uploadedUrl);
      }
    } catch (error) {
      console.error('[CaregiverProfileScreen] Error al seleccionar/subir imagen:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen seleccionada');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name,
        phone,
        relationship,
        photoUrl, // En producción, deberías subir la imagen y guardar la URL
      });
      Alert.alert('Perfil actualizado', 'Los datos se guardaron correctamente');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subtitle}>Cargando perfil…</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.container}>
      <View style={styles.avatarBox}>
        <Image
          source={photoUrl ? { uri: photoUrl } : defaultAvatar}
          style={styles.avatar}
        />
        <TouchableOpacity style={styles.editAvatarBtn} onPress={handlePickImage}>
          <Text style={styles.editAvatarText}>Cambiar foto</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.formBox}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nombre completo"
        />
        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Teléfono"
          keyboardType="phone-pad"
        />
        <Text style={styles.label}>Relación con el paciente</Text>
        <TextInput
          style={styles.input}
          value={relationship}
          onChangeText={setRelationship}
          placeholder="Ej: Hija, Enfermero, etc."
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  avatarBox: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    borderWidth: 3,
    borderColor: '#38bdf8',
  },
  editAvatarBtn: {
    marginTop: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  editAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  formBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    color: '#2563eb',
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  saveBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 18,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
});
