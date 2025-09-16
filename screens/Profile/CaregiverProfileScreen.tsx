import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useCurrentUser } from '../../store/useCurrentUser';
import { useCaregiver } from '../../store/useCaregiver';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const defaultAvatar = require('../../assets/logo.png');

export default function CaregiverProfileScreen() {
  const { profile } = useCurrentUser();
  const { caregiverProfile, profileLoading, fetchCaregiverProfile, updateCaregiverProfile } = useCaregiver();
  const [name, setName] = useState(caregiverProfile?.name || profile?.name || '');
  const [phone, setPhone] = useState(caregiverProfile?.phone || '');
  const [relationship, setRelationship] = useState(caregiverProfile?.relationship || '');
  const [photoUrl, setPhotoUrl] = useState(caregiverProfile?.photoUrl || profile?.photoUrl || '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    fetchCaregiverProfile();
  }, []);

  React.useEffect(() => {
    if (caregiverProfile) {
      setName(caregiverProfile.name || '');
      setPhone(caregiverProfile.phone || '');
      setRelationship(caregiverProfile.relationship || '');
      setPhotoUrl(caregiverProfile.photoUrl || photoUrl);
    }
  }, [caregiverProfile]);

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
      const ok = await updateCaregiverProfile({ name, phone, relationship, photoUrl });
      if (!ok) throw new Error('No se pudo actualizar');
      Alert.alert('Perfil actualizado', 'Los datos se guardaron correctamente');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
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
        {/* Información del usuario (solo lectura) */}
        <View style={{ marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
          <Text style={[styles.label, { marginTop: 0 }]}>Información del usuario</Text>
          <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ color: '#334155', marginBottom: 4 }}>Nombre: <Text style={{ fontWeight: 'bold' }}>{profile?.name || '—'}</Text></Text>
            <Text style={{ color: '#334155', marginBottom: 4 }}>Correo: <Text style={{ fontWeight: 'bold' }}>{(profile as any)?.email || '—'}</Text></Text>
            <Text style={{ color: '#334155', marginBottom: 4 }}>Rol: <Text style={{ fontWeight: 'bold' }}>{profile?.role || '—'}</Text></Text>
            <Text style={{ color: '#334155' }}>ID Usuario: <Text style={{ fontWeight: 'bold' }}>{profile?.userId || '—'}</Text></Text>
          </View>
        </View>
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
