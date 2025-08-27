import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Linking, Button, Alert } from 'react-native';
import { useCurrentUser } from '../../store/useCurrentUser';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as RNImage } from 'react-native';
import logo from '../../assets/logo.webp';
import { useAuth } from '../../store/useAuth';
import { Clipboard } from 'react-native';
import { buildApiUrl, API_CONFIG } from '../../constants/config';

export default function ProfileScreen() {
  console.log('[ProfileScreen] Componente montándose/re-renderizando...');
  
  const { profile, updateProfile, loading, fetchProfile, refreshProfile, error: profileError } = useCurrentUser();
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
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Cargar perfil cuando se monta la pantalla
  useEffect(() => {
    if (!profile && !loading) {
      console.log('[ProfileScreen] No hay perfil y no está cargando, iniciando carga...');
      fetchProfile();
    } else if (profile) {
      console.log('[ProfileScreen] Perfil ya cargado:', profile);
    } else if (loading) {
      console.log('[ProfileScreen] Perfil cargando...');
    }
  }, []); // Solo se ejecuta una vez al montar

  // Función para reintentar la carga
  const handleRetry = () => {
    console.log('[ProfileScreen] Reintentando carga del perfil...');
    refreshProfile();
  };

  // Sincronizar formulario cuando cambie el perfil
  useEffect(() => {
    if (profile) {
      console.log('[ProfileScreen] Sincronizando formulario con perfil:', profile);
      setForm({
        name: profile.name || '',
        age: profile.age?.toString() || '',
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || '',
        allergies: profile.allergies || '',
        reactions: profile.reactions || '',
        doctorName: profile.doctorName || '',
        doctorContact: profile.doctorContact || '',
        photoUrl: profile.photoUrl || '',
      });
    }
  }, [profile]);

  // Obtener solicitudes pendientes
  useEffect(() => {
    console.log('[ProfileScreen] useEffect de solicitudes ejecutándose con profile?.id:', profile?.id, 'profile?.role:', profile?.role);
    
    if (!profile?.id || profile?.role !== 'PATIENT') {
      console.log('[ProfileScreen] Saltando fetchRequests - no es paciente o no tiene ID');
      return;
    }
    
    const fetchRequests = async () => {
      console.log('[ProfileScreen] Ejecutando fetchRequests...');
      setLoadingRequests(true);
      setRequestsError(null);
      try {
        // Como no existe el endpoint /permissions/by-patient, usamos un array vacío
        // En el futuro, si se implementa este endpoint, se puede usar aquí
        console.log('[ProfileScreen] Endpoint de permisos no implementado, usando array vacío');
        setPendingRequests([]);
      } catch (e: any) {
        setRequestsError('Endpoint de permisos no implementado');
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchRequests();
  }, [profile?.id, profile?.role]);

  // Aceptar o rechazar solicitud
  const handleRequestAction = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.PERMISSIONS}/${id}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Error al actualizar solicitud');
      // Recargar solicitudes
      setPendingRequests((prev) => prev.filter((p) => p.id !== id));
      Alert.alert('Solicitud actualizada', status === 'ACCEPTED' ? 'Cuidador aceptado.' : 'Solicitud rechazada.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar la solicitud');
    }
  };

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
    console.log('[ProfileScreen] ========== INICIO handleSave ==========');
    console.log('[ProfileScreen] Estado del formulario:', JSON.stringify(form, null, 2));
    
    setError(null);
    // Validar solo campos clave
    if (!form.name.trim()) return setError('El nombre es obligatorio');
    if (!form.age.trim()) return setError('La edad es obligatoria');
    
    setSaving(true);
    try {
      console.log('[ProfileScreen] Iniciando guardado de perfil...');
      
      // Limpiar campos vacíos y convertir tipos correctamente
      const cleanForm = Object.fromEntries(
        Object.entries(form).map(([k, v]) => {
          if (v === '' || v === null || v === undefined) return [k, undefined];
          return [k, v];
        })
      );
      
      // Convertir campos numéricos y limpiar datos
      console.log('[ProfileScreen] Antes de conversión - form.age:', form.age, typeof form.age);
      console.log('[ProfileScreen] Antes de conversión - form.weight:', form.weight, typeof form.weight);
      console.log('[ProfileScreen] Antes de conversión - form.height:', form.height, typeof form.height);
      
      const ageValue = form.age ? parseInt(form.age, 10) : undefined;
      const weightValue = form.weight ? parseFloat(form.weight) : undefined;
      const heightValue = form.height ? parseInt(form.height, 10) : undefined;
      
      console.log('[ProfileScreen] Después de conversión - age:', ageValue, typeof ageValue, 'isNaN:', isNaN(ageValue));
      console.log('[ProfileScreen] Después de conversión - weight:', weightValue, typeof weightValue, 'isNaN:', isNaN(weightValue));
      console.log('[ProfileScreen] Después de conversión - height:', heightValue, typeof heightValue, 'isNaN:', isNaN(heightValue));
      
      const dataToSave = {
        name: cleanForm.name?.trim(),
        age: ageValue,
        weight: weightValue,
        height: heightValue,
        allergies: cleanForm.allergies?.trim() || undefined,
        reactions: cleanForm.reactions?.trim() || undefined,
        doctorName: cleanForm.doctorName?.trim() || undefined,
        doctorContact: cleanForm.doctorContact?.trim() || undefined,
        photoUrl: cleanForm.photoUrl || undefined,
      };
      
      // Filtrar campos undefined y validar números más estrictamente
      const finalData: Record<string, any> = {};
      Object.entries(dataToSave).forEach(([key, value]) => {
        console.log(`[ProfileScreen] Procesando campo ${key}:`, value, typeof value);
        
        if (value === undefined || value === null || value === '') {
          console.log(`[ProfileScreen] Omitiendo campo ${key} (vacío)`);
          return;
        }
        
        if (typeof value === 'number') {
          if (isNaN(value) || !isFinite(value)) {
            console.log(`[ProfileScreen] ⚠️ Omitiendo campo ${key} (NaN o Infinite):`, value);
            return;
          }
        }
        
        if (typeof value === 'string' && value.trim() === '') {
          console.log(`[ProfileScreen] Omitiendo campo ${key} (string vacío)`);
          return;
        }
        
        finalData[key] = value;
        console.log(`[ProfileScreen] ✅ Incluyendo campo ${key}:`, value);
      });
      
      console.log('[ProfileScreen] Datos originales del formulario:', form);
      console.log('[ProfileScreen] Datos convertidos:', dataToSave);
      console.log('[ProfileScreen] Datos finales filtrados:', finalData);
      
      // Validar que los campos numéricos sean válidos y realistas
      if (finalData.age && typeof finalData.age === 'number' && (isNaN(finalData.age) || finalData.age <= 0 || finalData.age > 120)) {
        throw new Error('La edad debe ser un número válido entre 1 y 120 años');
      }
      if (finalData.weight && typeof finalData.weight === 'number' && (isNaN(finalData.weight) || finalData.weight <= 0 || finalData.weight > 500)) {
        throw new Error('El peso debe ser un número válido entre 1 y 500 kg');
      }
      if (finalData.height && typeof finalData.height === 'number' && (isNaN(finalData.height) || finalData.height <= 0 || finalData.height > 300)) {
        throw new Error('La altura debe ser un número válido entre 1 y 300 cm');
      }
      
      console.log('[ProfileScreen] Datos a guardar:', finalData);
      
      await updateProfile(finalData);
      
      console.log('[ProfileScreen] Perfil guardado exitosamente');
      setError(null);
      
      // Mostrar mensaje de éxito
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      
    } catch (e: any) {
      console.log('[ProfileScreen] Error al guardar:', e);
      const errorMessage = e.message || JSON.stringify(e) || 'Error al guardar';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    console.log('[ProfileScreen] handleGenerateInvite llamado - generando código de invitación...');
    setInviteLoading(true);
    setInviteError(null);
    try {
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.CAREGIVERS.INVITE);
      console.log('[ProfileScreen] Llamando a endpoint:', endpoint);
      console.log('[ProfileScreen] Perfil actual:', profile);
      console.log('[ProfileScreen] Token:', userToken ? 'PRESENTE' : 'NO');
      
      // Primero intentar sin cuerpo (algunos endpoints no lo requieren)
      console.log('[ProfileScreen] Intentando sin cuerpo...');
      
      let res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${userToken}` 
        },
      });
      
      // Si falla, intentar con diferentes variaciones de datos
      if (!res.ok) {
        console.log('[ProfileScreen] Falló sin cuerpo, probando con datos...');
        
        const bodyData = {
          // Diferentes opciones para el ID del paciente
          patientId: profile?.id,
          patientProfileId: profile?.patientProfileId || profile?.id,
          userId: profile?.userId,
        };
        
        console.log('[ProfileScreen] Datos a enviar:', bodyData);
        
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            ...API_CONFIG.DEFAULT_HEADERS,
            Authorization: `Bearer ${userToken}` 
          },
          body: JSON.stringify(bodyData),
        });
      }
      
      console.log('[ProfileScreen] Respuesta del endpoint:', res.status, res.ok);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.log('[ProfileScreen] Error en respuesta:', err);
        throw new Error(err.error || 'Error al generar código');
      }
      
      const data = await res.json();
      console.log('[ProfileScreen] Código generado exitosamente:', data);
      setInvite(data);
    } catch (e: any) {
      console.log('[ProfileScreen] Error en handleGenerateInvite:', e.message);
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
        
        {/* Mostrar errores del perfil y botón de reintento */}
        {profileError && (
          <View style={styles.errorBoxModern}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorTextModern}>{profileError}</Text>
            <TouchableOpacity style={styles.retryBtnModern} onPress={handleRetry}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryBtnTextModern}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        
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
      {/* Bloque de solicitudes de cuidadores pendientes */}
      {profile?.role === 'PATIENT' && (
        <LinearGradient colors={["#fef9c3", "#fef3c7"]} style={[styles.profileCardModern, { borderColor: '#fde047', borderWidth: 1, marginBottom: 18 }]} start={{x:0, y:0}} end={{x:1, y:1}}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#b45309', marginBottom: 8 }}>Solicitudes de cuidadores pendientes</Text>
          {loadingRequests ? (
            <Text style={{ color: '#b45309' }}>Cargando solicitudes...</Text>
          ) : requestsError ? (
            <Text style={{ color: '#ef4444' }}>{requestsError}</Text>
          ) : pendingRequests.length === 0 ? (
            <Text style={{ color: '#64748b' }}>No hay solicitudes pendientes.</Text>
          ) : (
            pendingRequests.map((req) => (
              <View key={req.id} style={{ backgroundColor: '#fffbe9', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#fde047' }}>
                <Text style={{ color: '#b45309', fontWeight: 'bold' }}>Cuidador: {req.caregiverName || req.caregiverEmail || req.caregiverId}</Text>
                <Text style={{ color: '#64748b', marginBottom: 6 }}>Estado: {req.status}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => handleRequestAction(req.id, 'ACCEPTED')} style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16, marginRight: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRequestAction(req.id, 'REJECTED')} style={{ backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </LinearGradient>
      )}
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
  errorBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  retryBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  retryBtnTextModern: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
});
