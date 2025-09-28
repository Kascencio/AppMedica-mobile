import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import OptimizedImage from '../../components/OptimizedImage';
import logo from '../../assets/logo.png';
import { useCurrentUser } from '../../store/useCurrentUser';
import { useCaregiver } from '../../store/useCaregiver';
import { useOffline } from '../../store/useOffline';
import SyncStatus from '../../components/SyncStatus';

export default function CaregiverProfileScreen() {
  const { profile } = useCurrentUser();
  const { caregiverProfile, profileLoading, profileError, fetchCaregiverProfile, updateCaregiverProfile } = useCaregiver();
  const { isOnline } = useOffline();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    relationship: '',
    photoUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCaregiverProfile();
  }, []);

  useEffect(() => {
    if (caregiverProfile) {
      setForm({
        name: caregiverProfile.name || profile?.name || '',
        phone: caregiverProfile.phone || '',
        relationship: caregiverProfile.relationship || '',
        photoUrl: caregiverProfile.photoUrl || profile?.photoUrl || '',
      });
    }
  }, [caregiverProfile]);

  const handleChange = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisos requeridos', 'Necesitas conceder acceso a tus fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const { uploadPhoto } = useCurrentUser.getState();
      const uploadedUrl = await uploadPhoto(result.assets[0].uri);
      setForm(prev => ({ ...prev, photoUrl: uploadedUrl }));
      setPhotoVersion(v => v + 1);

      // Persistir foto inmediatamente si es posible
      try { await updateCaregiverProfile({ photoUrl: uploadedUrl }); } catch {}
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo procesar la imagen');
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!isOnline) {
      Alert.alert('Sin conexión', 'No puedes guardar cambios en modo offline.');
      return;
    }
    setSaving(true);
    try {
      const ok = await updateCaregiverProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        relationship: form.relationship.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
      });
      if (!ok) throw new Error('No se pudo actualizar');
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar el perfil');
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
    <ScrollView contentContainerStyle={styles.containerModern}>
      <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.profileCardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
        <TouchableOpacity style={styles.avatarBoxModern} onPress={pickImage} accessibilityLabel="Cambiar foto de perfil" accessibilityRole="button">
          <View style={styles.avatarOuterModern}>
            {(() => {
              const u = form.photoUrl;
              const isHttp = /^https?:\/\//i.test(u);
              const uri = u ? (isHttp ? `${u}${u.includes('?') ? '&' : '?'}v=${photoVersion}` : u) : '';
              return (
                <OptimizedImage
                  uri={uri}
                  size="avatar"
                  width={140}
                  height={140}
                  fallbackSource={logo}
                  showLoading
                  style={styles.avatarModern}
                  resizeMode="cover"
                />
              );
            })()}
          </View>
          <Text style={styles.avatarTextModern}>Cambiar foto</Text>
        </TouchableOpacity>
        <Text style={styles.titleModern}>Mi Perfil (Cuidador)</Text>

        {/* Estado de sincronización */}
        <SyncStatus />

        {/* Mensajes */}
        {profileError && (
          <View style={styles.errorBoxModern}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorTextModern}>{profileError}</Text>
          </View>
        )}
        {!isOnline && (
          <View style={styles.tipBoxModern}>
            <MaterialCommunityIcons name="cloud-off-outline" size={18} color="#b45309" style={{ marginRight: 6 }} />
            <Text style={styles.tipTextModern}>Modo sin conexión: los cambios se deshabilitan hasta reconectar.</Text>
          </View>
        )}
        {error && <Text style={styles.errorTextModern}>{error}</Text>}

        {/* Inputs */}
        <View style={styles.formGroupModern}><Text style={styles.labelModern}>Nombre *</Text><TextInput style={styles.inputModern} value={form.name} onChangeText={v => handleChange('name', v)} placeholder="Nombre completo" autoCapitalize="words" /></View>
        <View style={styles.formRowModern}>
          <View style={[styles.formGroupModern, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.labelModern}>Teléfono</Text>
            <TextInput style={styles.inputModern} value={form.phone} onChangeText={v => handleChange('phone', v)} placeholder="Teléfono" keyboardType="phone-pad" />
          </View>
          <View style={[styles.formGroupModern, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.labelModern}>Relación</Text>
            <TextInput style={styles.inputModern} value={form.relationship} onChangeText={v => handleChange('relationship', v)} placeholder="Hija, Enfermero, etc." />
          </View>
        </View>

        {/* Información del usuario (solo lectura) */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Información del usuario</Text>
          <View style={styles.infoInner}>
            <Text style={styles.infoText}>Nombre: <Text style={styles.infoBold}>{profile?.name || '—'}</Text></Text>
            <Text style={styles.infoText}>Correo: <Text style={styles.infoBold}>{(profile as any)?.email || (profile as any)?.username || (profile as any)?.user?.email || '—'}</Text></Text>
            <Text style={styles.infoText}>Rol: <Text style={styles.infoBold}>{profile?.role || '—'}</Text></Text>
            <Text style={styles.infoText}>ID Usuario: <Text style={styles.infoBold}>{profile?.userId || '—'}</Text></Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtnModern, (!isOnline || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !isOnline}
          accessibilityLabel="Guardar perfil"
          accessibilityRole="button"
        >
          <Ionicons name="save" size={20} color="#fff" />
          <Text style={styles.saveBtnTextModern}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  // Modern styles (alineado con ProfileScreen)
  containerModern: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f8fafc',
  },
  profileCardModern: {
    width: '96%',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  avatarBoxModern: {
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 6,
    justifyContent: 'center',
  },
  avatarOuterModern: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 8,
  },
  avatarModern: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fff',
  },
  avatarTextModern: {
    color: '#2563eb',
    fontSize: 15,
    marginTop: 2,
    fontWeight: 'bold',
  },
  titleModern: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
    textAlign: 'center',
  },
  formGroupModern: {
    width: '100%',
    marginBottom: 12,
  },
  formRowModern: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
  },
  labelModern: {
    color: '#334155',
    fontWeight: '500',
    marginBottom: 4,
    fontSize: 14,
  },
  inputModern: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    backgroundColor: '#f9fafb',
    fontSize: 16,
    color: '#1e293b',
  },
  tipBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  tipTextModern: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  errorBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorTextModern: {
    color: '#ef4444',
    fontSize: 14,
    flex: 1,
  },
  saveBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveBtnTextModern: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  infoBox: {
    width: '100%',
    marginTop: 8,
  },
  infoTitle: {
    color: '#2563eb',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  infoInner: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoText: {
    color: '#334155',
    marginBottom: 4,
  },
  infoBold: {
    fontWeight: 'bold',
  },
});
