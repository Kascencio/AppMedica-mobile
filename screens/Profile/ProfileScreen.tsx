import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Linking, Button, Alert } from 'react-native';
import { useCurrentUser } from '../../store/useCurrentUser';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as RNImage } from 'react-native';
import logo from '../../assets/logo.webp';
import { useAuth } from '../../store/useAuth';
import { Clipboard } from 'react-native';

export default function ProfileScreen() {
  const { profile, updateProfile, loading } = useCurrentUser();
  const { userToken } = useAuth();
  const [form, setForm] = useState({
    name: profile?.name || '',
    age: profile?.age?.toString() || '',
    weight: profile?.weight?.toString() || '',
    height: profile?.height?.toString() || '',
    allergies: profile?.allergies || '',
    reactions: profile?.reactions || '',
    doctorName: profile?.doctorName || '',
    doctorContact: profile?.doctorContact || '',
    photoUrl: profile?.photoUrl || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setForm({ ...form, photoUrl: result.assets[0].uri });
    }
  };

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    setError(null);
    // Validar solo campos clave
    if (!form.name.trim()) return setError('El nombre es obligatorio');
    if (!form.age.trim()) return setError('La edad es obligatoria');
    setSaving(true);
    try {
      // Limpiar campos vacíos a null
      const cleanForm = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      );
      await updateProfile({
        ...cleanForm,
        age: Number(form.age),
        weight: form.weight ? Number(form.weight) : null,
        height: form.height ? Number(form.height) : null,
      });
      setError(null);
    } catch (e: any) {
      setError(e.message || JSON.stringify(e) || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetch('http://72.60.30.129:3001/api/caregivers/invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al generar código');
      }
      const data = await res.json();
      setInvite(data);
    } catch (e: any) {
      setInviteError(e.message || 'Error al generar código');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.containerModern}>
      <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.profileCardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
        <TouchableOpacity style={styles.avatarBoxModern} onPress={pickImage} accessibilityLabel="Cambiar foto de perfil" accessibilityRole="button">
          <View style={styles.avatarOuterModern}>
            {form.photoUrl ? (
              <RNImage source={{ uri: form.photoUrl }} style={styles.avatarModern} resizeMode="cover" />
            ) : (
              <RNImage source={logo} style={styles.avatarModern} resizeMode="contain" />
            )}
          </View>
          <Text style={styles.avatarTextModern}>Cambiar foto</Text>
        </TouchableOpacity>
        <Text style={styles.titleModern}>Mi Perfil</Text>
        {/* Mensaje explicativo sobre notificaciones y alarmas */}
        <View style={styles.tipBoxModern}>
          <Ionicons name="notifications-outline" size={20} color="#f59e42" style={{ marginRight: 6 }} />
          <Text style={styles.tipTextModern}>
            Para que las alarmas funcionen correctamente, activa los permisos de notificación, sube el volumen y desactiva el modo "No molestar".
          </Text>
        </View>
        {/* Inputs */}
        <View style={styles.formGroupModern}><Text style={styles.labelModern}>Nombre *</Text><TextInput style={styles.inputModern} value={form.name} onChangeText={v => handleChange('name', v)} placeholder="Nombre completo" autoCapitalize="words" /></View>
        <View style={styles.formRowModern}>
          <View style={[styles.formGroupModern, { flex: 1, marginRight: 8 }] }>
            <Text style={styles.labelModern}>Edad *</Text>
            <TextInput style={styles.inputModern} value={form.age} onChangeText={v => handleChange('age', v)} placeholder="Edad" keyboardType="numeric" />
          </View>
          <View style={[styles.formGroupModern, { flex: 1, marginLeft: 8 }] }>
            <Text style={styles.labelModern}>Peso (kg)</Text>
            <TextInput style={styles.inputModern} value={form.weight} onChangeText={v => handleChange('weight', v)} placeholder="Peso" keyboardType="numeric" />
          </View>
        </View>
        <View style={styles.formGroupModern}><Text style={styles.labelModern}>Altura (cm)</Text><TextInput style={styles.inputModern} value={form.height} onChangeText={v => handleChange('height', v)} placeholder="Altura" keyboardType="numeric" /></View>
        <View style={styles.formGroupModern}><Text style={styles.labelModern}>Alergias</Text><TextInput style={styles.inputModern} value={form.allergies} onChangeText={v => handleChange('allergies', v)} placeholder="Alergias conocidas" /></View>
        <View style={styles.formGroupModern}><Text style={styles.labelModern}>Reacciones</Text><TextInput style={styles.inputModern} value={form.reactions} onChangeText={v => handleChange('reactions', v)} placeholder="Reacciones adversas" /></View>
        <View style={styles.formGroupModern}><Text style={styles.labelModern}>Médico de cabecera</Text><TextInput style={styles.inputModern} value={form.doctorName} onChangeText={v => handleChange('doctorName', v)} placeholder="Nombre del médico" /></View>
        <View style={styles.formGroupModern}><Text style={styles.labelModern}>Contacto médico</Text><TextInput style={styles.inputModern} value={form.doctorContact} onChangeText={v => handleChange('doctorContact', v)} placeholder="Teléfono o email" keyboardType="default" /></View>
        {error && <Text style={styles.errorTextModern}>{error}</Text>}
        <TouchableOpacity style={styles.saveBtnModern} onPress={handleSave} disabled={saving || loading} accessibilityLabel="Guardar perfil" accessibilityRole="button">
          <Ionicons name="save" size={22} color="#fff" />
          <Text style={styles.saveBtnTextModern}>{saving || loading ? 'Guardando...' : 'Guardar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtnModern, { backgroundColor: '#22c55e', marginTop: 18 }]}
          onPress={handleGenerateInvite}
          disabled={inviteLoading}
          accessibilityLabel="Generar código de invitación"
          accessibilityRole="button"
        >
          <Ionicons name="key-outline" size={22} color="#fff" />
          <Text style={styles.saveBtnTextModern}>{inviteLoading ? 'Generando...' : 'Generar código de invitación'}</Text>
        </TouchableOpacity>
        {invite && (
          <View style={{ marginTop: 14, alignItems: 'center', backgroundColor: '#f0fdfa', borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2563eb' }}>Código: {invite.code}</Text>
            <Text style={{ color: '#64748b', marginTop: 4 }}>Expira: {new Date(invite.expiresAt).toLocaleString()}</Text>
            <TouchableOpacity onPress={() => { Clipboard.setString(invite.code); Alert.alert('Copiado', 'Código copiado al portapapeles'); }} style={{ marginTop: 8, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Copiar código</Text>
            </TouchableOpacity>
          </View>
        )}
        {inviteError && <Text style={styles.errorTextModern}>{inviteError}</Text>}
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 18,
    textAlign: 'center',
  },
  avatarBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 6,
  },
  avatarText: {
    color: '#2563eb',
    fontSize: 14,
    marginTop: 2,
  },
  formGroup: {
    width: '100%',
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 14,
  },
  label: {
    color: '#334155',
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    backgroundColor: '#f8fafc',
    fontSize: 15,
    color: '#1e293b',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 18,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    marginLeft: 8,
  },
  // Nuevos estilos modernos
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
    textAlign: 'center',
  },
  tipBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  tipTextModern: {
    color: '#b45309',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
  errorTextModern: {
    color: '#ef4444',
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  saveBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 18,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnTextModern: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    marginLeft: 8,
  },
});
