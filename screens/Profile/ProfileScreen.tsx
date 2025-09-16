import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Linking, Button, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCurrentUser } from '../../store/useCurrentUser';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as RNImage } from 'react-native';
import logo from '../../assets/logo.png';
import { useAuth } from '../../store/useAuth';
import { useInviteCodes } from '../../store/useInviteCodes';
import { usePermissions } from '../../store/usePermissions';
import { Clipboard } from 'react-native';
import { UserProfile } from '../../types';
import { scheduleNotification } from '../../lib/notifications';

import SyncStatus from '../../components/SyncStatus';
import AlarmTestCenter from '../../components/AlarmTestCenter';

// === Helpers de normalización ===
const s = (v?: string | null) => {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
};
const i = (v?: string | null) => {
  const t = (v ?? '').trim();
  if (t === '') return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
};
const f = (v?: string | null) => {
  const t = (v ?? '').trim();
  if (t === '') return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
};

export default function ProfileScreen() {
  console.log('[ProfileScreen] Componente montándose/re-renderizando...');
  
  const { profile, updateProfile, loading, fetchProfile, refreshProfile, error: profileError, initialized } = useCurrentUser();
  const { userToken, logout } = useAuth();
  const { inviteCode, loading: inviteLoading, error: inviteError, generateInviteCode, clearError: clearInviteError } = useInviteCodes();
  const { permissions, loading: permissionsLoading, error: permissionsError, getPermissions, updatePermissionStatus, updatePermissionLevel } = usePermissions();
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    gender: '',
    weight: '',
    height: '',
    bloodType: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    allergies: '',
    chronicDiseases: '',
    currentConditions: '',
    reactions: '',
    doctorName: '',
    doctorContact: '',
    hospitalReference: '',
    photoUrl: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSavedProfile, setLastSavedProfile] = useState<UserProfile | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);

  // Cargar perfil cuando se monta la pantalla
  useEffect(() => {
    console.log('[ProfileScreen] useEffect de carga - loading:', loading, 'initialized:', initialized);
    
    // Solo cargar si no está inicializado y no está cargando
    if (!initialized && !loading) {
      console.log('[ProfileScreen] No inicializado, iniciando carga...');
      fetchProfile();
    } else if (loading) {
      console.log('[ProfileScreen] Perfil cargando...');
    } else if (initialized) {
      console.log('[ProfileScreen] Perfil ya inicializado');
    }
  }, [loading, initialized]); // Solo depender de loading e initialized, NO de profile

  // Función para reintentar la carga
  const handleRetry = () => {
    console.log('[ProfileScreen] Reintentando carga del perfil...');
    refreshProfile();
  };

  // Función para forzar recarga completa
  const handleForceReload = () => {
    console.log('[ProfileScreen] Forzando recarga completa del perfil...');
    refreshProfile();
    setFormInitialized(false); // Resetear para que se vuelva a inicializar el formulario
  };

  const handleQuickAlarmTest = async () => {
    try {
      const id = `profile_test_${Date.now()}`;
      const triggerTime = new Date(Date.now() + 5000);
      await scheduleNotification({
        id,
        title: '🧪 Test de Alarma',
        body: 'Se activará en 5 segundos',
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          refId: 'profile_test',
          medicationId: 'profile_test',
          medicationName: 'Prueba rápida',
          scheduledFor: triggerTime.toISOString(),
          time: new Date().toLocaleTimeString(),
          test: true,
        },
        seconds: 5,
        channelId: 'medications'
      });
      Alert.alert('Alarma programada', 'Se activará en 5 segundos. Cierra la app para probar auto-apertura.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo programar la alarma de prueba');
    }
  };

  const handleColdStartTest = async () => {
    try {
      const id = `cold_start_test_${Date.now()}`;
      const triggerTime = new Date(Date.now() + 10000); // 10 segundos para dar tiempo a cerrar la app
      
      await scheduleNotification({
        id,
        title: '🚀 Test de Arranque en Frío',
        body: 'Esta alarma probará la apertura automática desde estado cerrado',
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          refId: 'cold_start_test',
          medicationId: 'cold_start_test',
          medicationName: 'Test de Arranque en Frío',
          dosage: '1 tableta',
          scheduledFor: triggerTime.toISOString(),
          time: new Date().toLocaleTimeString(),
          test: true,
          isColdStartTest: true,
        },
        seconds: 10,
        channelId: 'medications'
      });
      
      Alert.alert(
        'Test de Arranque en Frío Programado', 
        'Se activará en 10 segundos.\n\n📱 INSTRUCCIONES:\n1. Cierra completamente la app\n2. Espera la notificación\n3. Observa si la app se abre automáticamente\n4. Verifica la navegación a AlarmScreen',
        [{ text: 'Entendido' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo programar el test de arranque en frío');
    }
  };

  const handleBackgroundTest = async () => {
    try {
      const id = `background_test_${Date.now()}`;
      const triggerTime = new Date(Date.now() + 8000); // 8 segundos
      
      await scheduleNotification({
        id,
        title: '📱 Test de Segundo Plano',
        body: 'Esta alarma probará la apertura desde segundo plano',
        data: {
          type: 'APPOINTMENT',
          kind: 'APPOINTMENT',
          refId: 'background_test',
          appointmentId: 'background_test',
          appointmentTitle: 'Test de Segundo Plano',
          location: 'Consultorio de Prueba',
          scheduledFor: triggerTime.toISOString(),
          time: new Date().toLocaleTimeString(),
          test: true,
          isBackgroundTest: true,
        },
        seconds: 8,
        channelId: 'appointments'
      });
      
      Alert.alert(
        'Test de Segundo Plano Programado', 
        'Se activará en 8 segundos.\n\n📱 INSTRUCCIONES:\n1. Minimiza la app (no la cierres)\n2. Espera la notificación\n3. Observa si la app vuelve al primer plano\n4. Verifica la navegación correcta',
        [{ text: 'Entendido' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo programar el test de segundo plano');
    }
  };

  const handlePermissionsTest = async () => {
    try {
      const { checkAutoOpenPermissions } = await import('../../lib/notifications');
      const permissions = await checkAutoOpenPermissions();
      
      const statusText = permissions.allGranted ? '✅ Todos los permisos concedidos' : '⚠️ Faltan permisos';
      const detailsText = `Notificaciones: ${permissions.notifications ? '✅' : '❌'}\nOverlay: ${permissions.overlay ? '✅' : '❌'}`;
      
      Alert.alert(
        'Estado de Permisos',
        `${statusText}\n\n${detailsText}\n\n${!permissions.allGranted ? 'Ve a Configuración para conceder los permisos faltantes.' : 'Todo está configurado correctamente.'}`,
        [
          { text: 'Cerrar' },
          ...(permissions.allGranted ? [] : [{ text: 'Configuración', onPress: () => Linking.openSettings() }])
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo verificar los permisos');
    }
  };

  // Sincronizar formulario cuando cambie el perfil (inicialización y actualizaciones)
  useEffect(() => {
    if (profile) {
      console.log('[ProfileScreen] Sincronizando formulario con perfil:', profile);
      
      const newForm = {
        name: profile.name || '',
        birthDate: profile.birthDate || profile.dateOfBirth || '',
        gender: profile.gender || '',
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || '',
        bloodType: profile.bloodType || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactRelation: profile.emergencyContactRelation || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        allergies: profile.allergies || '',
        chronicDiseases: profile.chronicDiseases || '',
        currentConditions: profile.currentConditions || '',
        reactions: profile.reactions || '',
        doctorName: profile.doctorName || '',
        doctorContact: profile.doctorContact || '',
        hospitalReference: profile.hospitalReference || '',
        photoUrl: profile.photoUrl || '',
      };
      
      // Solo actualizar si hay cambios reales para evitar loops
      const hasChanges = Object.keys(newForm).some(key => {
        const formValue = form[key as keyof typeof form];
        const newValue = newForm[key as keyof typeof newForm];
        return formValue !== newValue;
      });
      
      if (hasChanges || !formInitialized) {
        console.log('[ProfileScreen] Actualizando formulario con datos del perfil');
        setForm(newForm);
        setFormInitialized(true);
        setLastSavedProfile(profile);
      }
    }
  }, [profile]); // Solo depende de profile

  // Obtener solicitudes pendientes
  useEffect(() => {
    console.log('[ProfileScreen] useEffect de solicitudes ejecutándose con profile?.id:', profile?.id, 'profile?.role:', profile?.role);
    
    if (!profile?.id || profile?.role !== 'PATIENT') {
      console.log('[ProfileScreen] Saltando fetchRequests - no es paciente o no tiene ID');
      return;
    }
    
    console.log('[ProfileScreen] Cargando permisos para paciente...');
    getPermissions();
  }, [profile?.id, profile?.role]);

  // Aceptar o rechazar solicitud
  const handleRequestAction = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const success = await updatePermissionStatus(id, status);
      if (success) {
        Alert.alert('Solicitud actualizada', status === 'ACCEPTED' ? 'Cuidador aceptado.' : 'Solicitud rechazada.');
        getPermissions();
      } else {
        Alert.alert('Error', 'No se pudo actualizar la solicitud');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar la solicitud');
    }
  };

  const handleChangePermissionLevel = async (id: string, level: 'READ' | 'WRITE') => {
    try {
      const success = await updatePermissionLevel(id, level);
      if (success) {
        Alert.alert('Permiso actualizado', `Nivel cambiado a ${level === 'READ' ? 'solo lectura' : 'lectura y escritura'}.`);
        getPermissions();
      } else {
        Alert.alert('Error', 'No se pudo actualizar el nivel del permiso');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar el nivel del permiso');
    }
  };

  const pickImage = async () => {
    try {
      console.log('[ProfileScreen] 🖼️ Iniciando selección de imagen...');
      
      // Verificar permisos
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permisos requeridos', 'Necesitas conceder permisos para acceder a la galería');
        return;
      }
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8, // Aumentar calidad para mejor resultado
      });
      
      if (result.canceled) {
        console.log('[ProfileScreen] Selección de imagen cancelada por el usuario');
        return;
      }
      
      if (!result.assets || !result.assets[0]) {
        console.log('[ProfileScreen] No se seleccionó ninguna imagen');
        return;
      }
      
      const asset = result.assets[0];
      console.log('[ProfileScreen] ✅ Imagen seleccionada:', asset.uri);
      console.log('[ProfileScreen] 📏 Dimensiones:', asset.width, 'x', asset.height);
      console.log('[ProfileScreen] 💾 Tamaño:', asset.fileSize ? `${(asset.fileSize / 1024).toFixed(1)}KB` : 'Desconocido');
      
      // Verificar que tenemos perfil
      const currentProfile = useCurrentUser.getState().profile;
      if (!currentProfile?.id) {
        console.error('[ProfileScreen] ❌ No hay perfil cargado para subir imagen');
        Alert.alert('Error', 'No se pudo cargar tu perfil. Por favor, recarga la aplicación.');
        return;
      }
      
      console.log('[ProfileScreen] 🚀 Subiendo imagen para perfil ID:', currentProfile.id);
      
      // Mostrar indicador de carga
      Alert.alert('Subiendo imagen', 'Por favor espera mientras se sube tu imagen...', [], { cancelable: false });
      
      // Subir la imagen al servidor
      const { uploadPhoto } = useCurrentUser.getState();
      const uploadedUrl = await uploadPhoto(asset.uri);
      
      console.log('[ProfileScreen] ✅ URL de imagen subida exitosamente:', uploadedUrl);
      
      // Actualizar el formulario con la nueva URL
      setForm({ ...form, photoUrl: uploadedUrl });
      setPhotoVersion((v) => v + 1);

      // Persistir inmediatamente el cambio de foto en el perfil del servidor y local
      try {
        await useCurrentUser.getState().updateProfile({ photoUrl: uploadedUrl });
      } catch (persistError) {
        console.warn('[ProfileScreen] No se pudo persistir foto inmediatamente, se guardará luego:', persistError);
      }
      
      // Mostrar mensaje según el tipo de URL resultante
      const isRemote = /^https?:\/\//.test(uploadedUrl);
      if (isRemote) {
        Alert.alert('Éxito', 'Tu foto de perfil se ha actualizado correctamente');
      } else {
        Alert.alert(
          'Imagen guardada localmente', 
          'Tu foto se ha guardado en tu dispositivo. Se sincronizará con el servidor cuando sea posible.'
        );
      }
      
    } catch (error: any) {
      console.error('[ProfileScreen] ❌ Error al seleccionar/subir imagen:', error);
      
      let errorMessage = 'No se pudo procesar la imagen seleccionada';
      
      // Mensajes de error más específicos
      if (error.message?.includes('No autenticado')) {
        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      } else if (error.message?.includes('Perfil no encontrado')) {
        errorMessage = 'No se pudo encontrar tu perfil. Por favor, recarga la aplicación.';
      } else if (error.message?.includes('tipo de archivo no soportado')) {
        errorMessage = 'El tipo de archivo no es compatible. Usa JPG, PNG, WebP o GIF.';
      } else if (error.message?.includes('demasiado grande')) {
        errorMessage = 'La imagen es demasiado grande. El tamaño máximo es 10MB.';
      } else if (error.message?.includes('no existe')) {
        errorMessage = 'El archivo seleccionado no existe o no se puede acceder.';
      } else if (error.message?.includes('ImageKit')) {
        errorMessage = 'Error al subir la imagen al servidor. Inténtalo de nuevo.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert('Error al subir imagen', errorMessage);
    }
  };

  const handleChange = (key: string, value: string) => {
    setForm(prevForm => ({ ...prevForm, [key]: value }));
  };

  const handleSave = async (): Promise<boolean> => {
    console.log('[ProfileScreen] ========== INICIO handleSave ==========');
    setError(null);
    setSaveError(null);

    // --- Validaciones mínimas ---
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return false;
    }
    if (!form.birthDate.trim()) {
      setError('La fecha de nacimiento es obligatoria.');
      return false;
    }
    if (!form.gender.trim()) {
      setError('El género es obligatorio.');
      return false;
    }

    // Validación de fecha YYYY-MM-DD
    const isISODate = /^\d{4}-\d{2}-\d{2}$/.test(form.birthDate.trim());
    if (!isISODate) {
      setError('La fecha de nacimiento no es válida (formato YYYY-MM-DD).');
      return false;
    }
    if (new Date(form.birthDate) > new Date()) {
      setError('La fecha de nacimiento no puede ser en el futuro.');
      return false;
    }

    // Validaciones numéricas (opcionales)
    if (form.weight?.trim()) {
      const n = parseFloat(form.weight);
      if (!Number.isFinite(n) || n < 0) {
        setError('El peso debe ser un número válido mayor o igual a 0.');
        return false;
      }
    }
    if (form.height?.trim()) {
      const n = parseInt(form.height, 10);
      if (!Number.isFinite(n) || n < 0) {
        setError('La estatura debe ser un número válido mayor o igual a 0.');
        return false;
      }
    }

    setSaving(true);
    try {
      // --- Normaliza y arma SIEMPRE el objeto completo ---
      const dataToSave: Partial<UserProfile> = {
        // Identidad básica
        name: s(form.name) || undefined,
        gender: s(form.gender) || undefined,

        // Fechas (compat)
        birthDate: form.birthDate,           // preferente
        dateOfBirth: form.birthDate,         // compat si el backend/local lo usa

        // Biométricos
        weight: f(form.weight) || undefined,
        height: i(form.height) || undefined,
        bloodType: s(form.bloodType) || undefined,

        // Contacto de emergencia
        emergencyContactName: s(form.emergencyContactName) || undefined,
        emergencyContactRelation: s(form.emergencyContactRelation) || undefined,
        emergencyContactPhone: s(form.emergencyContactPhone) || undefined,

        // Salud
        allergies: s(form.allergies) || undefined,
        chronicDiseases: s(form.chronicDiseases) || undefined,
        currentConditions: s(form.currentConditions) || undefined,
        reactions: s(form.reactions) || undefined,

        // Médico tratante / referencia
        doctorName: s(form.doctorName) || undefined,
        doctorContact: s(form.doctorContact) || undefined,
        hospitalReference: s(form.hospitalReference) || undefined,

        // Foto
        photoUrl: s(form.photoUrl) || undefined,
      };

      // 1) Actualiza store + sincroniza (usa tu flujo existente)
      await useCurrentUser.getState().updateProfile(dataToSave);

      // 2) **Persistencia local COMPLETA** (incluyendo nulls para limpiar campos)
      const { saveProfileLocally } = useCurrentUser.getState();
      const current = useCurrentUser.getState().profile;
      if (current) {
        const mergedLocal: UserProfile = {
          ...current,               // lo que ya hubiera
          ...dataToSave,            // lo nuevo (incluye undefined para "borrar")
          updatedAt: new Date().toISOString(),
        };
        await saveProfileLocally(mergedLocal);
      }

      setRetryCount(0);
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
      return true;
    } catch (e: any) {
      console.error('[ProfileScreen] Error al guardar:', e);
      const msg = e?.message ?? 'Ocurrió un error al guardar el perfil.';
      setError(msg);
      setSaveError(msg);
      // Re-lanzamos para que el wrapper de reintentos lo capte
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWithRetry = async () => {
    const maxRetries = 3;

    try {
      const ok = await handleSave(); // ahora lanza error si falla
      if (ok) return;
    } catch (e) {
      // continúa a la lógica de reintento
    }

    if (retryCount < maxRetries) {
      const next = retryCount + 1;
      setRetryCount(next);
      console.log(`[ProfileScreen] Reintentando guardado (${next}/${maxRetries})`);
      setTimeout(() => handleSaveWithRetry(), 1000 * next); // backoff simple
    } else {
      setSaveError('No se pudo guardar el perfil después de varios intentos');
      Alert.alert('Error', 'No se pudo guardar el perfil después de varios intentos. Por favor, inténtalo de nuevo.');
    }
  };

  // Función para limpiar errores
  const clearErrors = () => {
    setError(null);
    setSaveError(null);
    setRetryCount(0);
  };

  // Función para detectar cambios no guardados
  const hasUnsavedChanges = () => {
    if (!lastSavedProfile) return false;
    
    const currentForm = form;
    const savedProfile = lastSavedProfile;
    
    return (
      currentForm.name !== (savedProfile.name || '') ||
      currentForm.birthDate !== (savedProfile.birthDate || savedProfile.dateOfBirth || '') ||
      currentForm.gender !== (savedProfile.gender || '') ||
      currentForm.weight !== (savedProfile.weight?.toString() || '') ||
      currentForm.height !== (savedProfile.height?.toString() || '') ||
      currentForm.bloodType !== (savedProfile.bloodType || '') ||
      currentForm.emergencyContactName !== (savedProfile.emergencyContactName || '') ||
      currentForm.emergencyContactRelation !== (savedProfile.emergencyContactRelation || '') ||
      currentForm.emergencyContactPhone !== (savedProfile.emergencyContactPhone || '') ||
      currentForm.allergies !== (savedProfile.allergies || '') ||
      currentForm.chronicDiseases !== (savedProfile.chronicDiseases || '') ||
      currentForm.currentConditions !== (savedProfile.currentConditions || '') ||
      currentForm.reactions !== (savedProfile.reactions || '') ||
      currentForm.doctorName !== (savedProfile.doctorName || '') ||
      currentForm.doctorContact !== (savedProfile.doctorContact || '') ||
      currentForm.hospitalReference !== (savedProfile.hospitalReference || '') ||
      currentForm.photoUrl !== (savedProfile.photoUrl || '')
    );
  };

  const handleGenerateInvite = async () => {
    console.log('[ProfileScreen] handleGenerateInvite llamado - generando código de invitación...');
    clearInviteError();
    const result = await generateInviteCode();
    if (result) {
      console.log('[ProfileScreen] Código generado exitosamente:', result);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.containerModern}>
      <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.profileCardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
        <TouchableOpacity style={styles.avatarBoxModern} onPress={pickImage} accessibilityLabel="Cambiar foto de perfil" accessibilityRole="button">
          <View style={styles.avatarOuterModern}>
            {form.photoUrl ? (
              <RNImage key={photoVersion} source={{ uri: `${form.photoUrl}${form.photoUrl.includes('?') ? '&' : '?'}v=${photoVersion}` }} style={styles.avatarModern} resizeMode="cover" />
            ) : (
              <RNImage source={logo} style={styles.avatarModern} resizeMode="contain" />
            )}
          </View>
          <Text style={styles.avatarTextModern}>Cambiar foto</Text>
        </TouchableOpacity>
        <Text style={styles.titleModern}>Mi Perfil</Text>
        
        {/* Indicador de carga */}
        {loading && (
          <View style={styles.loadingBoxModern}>
            <Ionicons name="refresh" size={20} color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={styles.loadingTextModern}>Cargando perfil...</Text>
          </View>
        )}
        
        {/* Indicador de perfil vacío */}
        {!loading && profile && !profile.birthDate && !profile.gender && (
          <View style={styles.emptyProfileBoxModern}>
            <Ionicons name="information-circle" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
            <Text style={styles.emptyProfileTextModern}>
              Completa tu información de perfil para una mejor experiencia
            </Text>
          </View>
        )}
        
        {/* Indicador de perfil cargado exitosamente */}
        {!loading && profile && (profile.birthDate || profile.gender) && (
          <View style={styles.successBoxModern}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={{ marginRight: 8 }} />
            <Text style={styles.successTextModern}>
              Perfil cargado correctamente - {profile.name || 'Usuario'}
            </Text>
          </View>
        )}
        
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

        {/* Mostrar errores de guardado */}
        {saveError && (
          <View style={styles.errorBoxModern}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorTextModern}>{saveError}</Text>
            <TouchableOpacity style={styles.retryBtnModern} onPress={clearErrors}>
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.retryBtnTextModern}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Indicador de reintentos */}
        {retryCount > 0 && (
          <View style={styles.retryBoxModern}>
            <Ionicons name="refresh" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
            <Text style={styles.retryTextModern}>
              Reintentando guardado... ({retryCount}/3)
            </Text>
          </View>
        )}

        {/* Indicador de cambios no guardados */}
        {hasUnsavedChanges() && !saving && (
          <View style={styles.unsavedChangesBoxModern}>
            <Ionicons name="warning" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
            <Text style={styles.unsavedChangesTextModern}>
              Tienes cambios sin guardar
            </Text>
          </View>
        )}
        
        {/* Botón de recarga manual */}
        {!loading && profile && (
          <TouchableOpacity 
            style={styles.reloadBtnModern} 
            onPress={handleForceReload}
            accessibilityLabel="Recargar perfil"
            accessibilityRole="button"
          >
            <Ionicons name="refresh-circle" size={20} color="#2563eb" />
            <Text style={styles.reloadBtnTextModern}>Recargar datos del perfil</Text>
          </TouchableOpacity>
        )}
        
        {/* Estado de sincronización */}
        <SyncStatus />
        
        {/* Test único de notificación (10s) */}
        <View style={{ width: '100%', marginTop: 12, marginBottom: 12 }}>
          <TouchableOpacity 
            onPress={handleColdStartTest}
            style={{ backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            accessibilityLabel="Programar alarma de prueba (10 segundos)"
            accessibilityRole="button"
          >
            <Ionicons name="alarm" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Probar alarma en 10s</Text>
          </TouchableOpacity>
        </View>
        {/* Inputs */}
        <View style={styles.formGroupModern}><Text style={styles.labelModern}>Nombre *</Text><TextInput style={styles.inputModern} value={form.name} onChangeText={v => handleChange('name', v)} placeholder="Nombre completo" autoCapitalize="words" /></View>
        
        {/* Fecha de nacimiento y género */}
        <View style={styles.formRowModern}>
          <View style={[styles.formGroupModern, { flex: 1, marginRight: 8 }] }>
            <Text style={styles.labelModern}>Fecha de nacimiento *</Text>
            <TouchableOpacity 
              style={styles.inputModern} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: form.birthDate ? '#1e293b' : '#9ca3af' }}>
                {form.birthDate ? new Date(form.birthDate).toLocaleDateString('es-ES') : 'Seleccionar fecha'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={form.birthDate ? new Date(form.birthDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()} // No permitir fechas futuras
                onChange={(event: any, selectedDate?: Date) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    // Formatear la fecha como YYYY-MM-DD
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const formattedDate = `${year}-${month}-${day}`;
                    handleChange('birthDate', formattedDate);
                  }
                }}
              />
            )}
          </View>
          <View style={[styles.formGroupModern, { flex: 1, marginLeft: 8 }] }>
            <Text style={styles.labelModern}>Género *</Text>
            <TouchableOpacity 
              style={styles.inputModern}
              onPress={() => {
                Alert.alert(
                  'Seleccionar género',
                  'Elige tu género',
                  [
                    { text: 'Masculino', onPress: () => handleChange('gender', 'Masculino') },
                    { text: 'Femenino', onPress: () => handleChange('gender', 'Femenino') },
                    { text: 'Otro', onPress: () => handleChange('gender', 'Otro') },
                    { text: 'Cancelar', style: 'cancel' }
                  ]
                );
              }}
            >
              <Text style={{ color: form.gender ? '#1e293b' : '#9ca3af' }}>
                {form.gender || 'Seleccionar género'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Peso y altura */}
        <View style={styles.formRowModern}>
          <View style={[styles.formGroupModern, { flex: 1, marginRight: 8 }] }>
            <Text style={styles.labelModern}>Peso (kg)</Text>
            <TextInput style={styles.inputModern} value={form.weight} onChangeText={v => handleChange('weight', v)} placeholder="Peso" keyboardType="numeric" />
          </View>
          <View style={[styles.formGroupModern, { flex: 1, marginLeft: 8 }] }>
            <Text style={styles.labelModern}>Altura (cm)</Text>
            <TextInput style={styles.inputModern} value={form.height} onChangeText={v => handleChange('height', v)} placeholder="Altura" keyboardType="numeric" />
          </View>
        </View>
        
        {/* Tipo de sangre */}
        <View style={styles.formGroupModern}>
          <Text style={styles.labelModern}>Tipo de sangre</Text>
          <TextInput 
            style={styles.inputModern} 
            value={form.bloodType} 
            onChangeText={v => handleChange('bloodType', v)} 
            placeholder="Ej: O+, A-, B+, AB-, etc." 
          />
        </View>
        
        {/* Contacto de emergencia */}
        <View style={styles.formGroupModern}>
          <Text style={styles.labelModern}>Nombre contacto emergencia</Text>
          <TextInput style={styles.inputModern} value={form.emergencyContactName} onChangeText={v => handleChange('emergencyContactName', v)} placeholder="Nombre del contacto de emergencia" />
        </View>
        
        <View style={styles.formRowModern}>
          <View style={[styles.formGroupModern, { flex: 1, marginRight: 8 }] }>
            <Text style={styles.labelModern}>Relación</Text>
            <TextInput style={styles.inputModern} value={form.emergencyContactRelation} onChangeText={v => handleChange('emergencyContactRelation', v)} placeholder="Esposa, Hijo, etc." />
          </View>
          <View style={[styles.formGroupModern, { flex: 1, marginLeft: 8 }] }>
            <Text style={styles.labelModern}>Teléfono emergencia</Text>
            <TextInput style={styles.inputModern} value={form.emergencyContactPhone} onChangeText={v => handleChange('emergencyContactPhone', v)} placeholder="Teléfono" keyboardType="phone-pad" />
          </View>
        </View>
        
        {/* Información médica */}
        <View style={styles.formGroupModern}>
          <Text style={styles.labelModern}>Alergias</Text>
          <TextInput style={styles.inputModern} value={form.allergies} onChangeText={v => handleChange('allergies', v)} placeholder="Alergias conocidas" />
        </View>
        
        <View style={styles.formGroupModern}>
          <Text style={styles.labelModern}>Enfermedades crónicas</Text>
          <TextInput style={styles.inputModern} value={form.chronicDiseases} onChangeText={v => handleChange('chronicDiseases', v)} placeholder="Enfermedades crónicas" />
        </View>
        
        <View style={styles.formGroupModern}>
          <Text style={styles.labelModern}>Condiciones actuales</Text>
          <TextInput style={styles.inputModern} value={form.currentConditions} onChangeText={v => handleChange('currentConditions', v)} placeholder="Condiciones médicas actuales" />
        </View>
        
        <View style={styles.formGroupModern}>
          <Text style={styles.labelModern}>Reacciones</Text>
          <TextInput style={styles.inputModern} value={form.reactions} onChangeText={v => handleChange('reactions', v)} placeholder="Reacciones adversas" />
        </View>
        
        {/* Información del médico */}
        <View style={styles.formGroupModern}>
          <Text style={styles.labelModern}>Médico de cabecera</Text>
          <TextInput style={styles.inputModern} value={form.doctorName} onChangeText={v => handleChange('doctorName', v)} placeholder="Nombre del médico" />
        </View>
        
        <View style={styles.formRowModern}>
          <View style={[styles.formGroupModern, { flex: 1, marginRight: 8 }] }>
            <Text style={styles.labelModern}>Contacto médico</Text>
            <TextInput style={styles.inputModern} value={form.doctorContact} onChangeText={v => handleChange('doctorContact', v)} placeholder="Teléfono o email" keyboardType="default" />
          </View>
          <View style={[styles.formGroupModern, { flex: 1, marginLeft: 8 }] }>
            <Text style={styles.labelModern}>Hospital de referencia</Text>
            <TextInput style={styles.inputModern} value={form.hospitalReference} onChangeText={v => handleChange('hospitalReference', v)} placeholder="Hospital" />
          </View>
        </View>
        {error && <Text style={styles.errorTextModern}>{error}</Text>}
        <TouchableOpacity 
          style={[
            styles.saveBtnModern, 
            saving && styles.saveBtnDisabled,
            hasUnsavedChanges() && !saving && styles.saveBtnWithChanges
          ]} 
          onPress={handleSaveWithRetry} 
          disabled={saving || loading} 
          accessibilityLabel="Guardar perfil" 
          accessibilityRole="button"
        >
          <Ionicons name="save" size={22} color="#fff" />
          <Text style={styles.saveBtnTextModern}>
            {saving ? (retryCount > 0 ? `Reintentando... (${retryCount}/3)` : 'Guardando...') : 
             hasUnsavedChanges() ? 'Guardar cambios' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      
        
        
        {/* Solo mostrar botón de código de invitación para pacientes */}
        {profile?.role === 'PATIENT' && (
          <>
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
            
            {/* Información sobre el flujo de trabajo */}
            <View style={{ marginTop: 12, backgroundColor: '#f0f9ff', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#0ea5e9' }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0c4a6e', marginBottom: 6 }}>
                ¿Cómo funciona?
              </Text>
              <Text style={{ fontSize: 13, color: '#0c4a6e', lineHeight: 18 }}>
                1. Genera un código de 8 caracteres{'\n'}
                2. Compártelo con tu cuidador{'\n'}
                3. El cuidador lo usa para solicitar acceso{'\n'}
                4. Tú apruebas o rechazas la solicitud{'\n'}
                5. El código expira en 24 horas y solo se usa una vez
              </Text>
            </View>
          </>
        )}
        {inviteCode && (
          <View style={{ marginTop: 14, alignItems: 'center', backgroundColor: '#f0fdfa', borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2563eb' }}>Código: {inviteCode.code}</Text>
            <Text style={{ color: '#64748b', marginTop: 4 }}>Expira: {new Date(inviteCode.expiresAt).toLocaleString()}</Text>
            <TouchableOpacity onPress={() => { Clipboard.setString(inviteCode.code); Alert.alert('Copiado', 'Código copiado al portapapeles'); }} style={{ marginTop: 8, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Copiar código</Text>
            </TouchableOpacity>
          </View>
        )}
        {inviteError && <Text style={styles.errorTextModern}>{inviteError}</Text>}
      </LinearGradient>
      {/* Bloque de solicitudes de cuidadores pendientes - Solo para pacientes */}
      {profile?.role === 'PATIENT' && (
        <LinearGradient colors={["#fef9c3", "#fef3c7"]} style={[styles.profileCardModern, { borderColor: '#fde047', borderWidth: 1, marginBottom: 18 }]} start={{x:0, y:0}} end={{x:1, y:1}}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#b45309', marginBottom: 8 }}>Solicitudes de cuidadores pendientes</Text>
          {permissionsLoading ? (
            <Text style={{ color: '#b45309' }}>Cargando solicitudes...</Text>
          ) : permissionsError ? (
            <Text style={{ color: '#ef4444' }}>{permissionsError}</Text>
          ) : permissions.filter(p => p.status === 'PENDING').length === 0 ? (
            <Text style={{ color: '#64748b' }}>No hay solicitudes pendientes.</Text>
          ) : (
            permissions.filter(p => p.status === 'PENDING').map((req) => (
                              <View key={req.id} style={{ backgroundColor: '#fffbe9', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#fde047' }}>
                  <Text style={{ color: '#b45309', fontWeight: 'bold' }}>Cuidador ID: {req.caregiverId}</Text>
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

      {profile?.role === 'PATIENT' && (
        <LinearGradient colors={["#dcfce7", "#f0fdfa"]} style={[styles.profileCardModern, { borderColor: '#86efac', borderWidth: 1, marginBottom: 18 }]} start={{x:0, y:0}} end={{x:1, y:1}}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#166534', marginBottom: 8 }}>Cuidadores aceptados</Text>
          {permissionsLoading ? (
            <Text style={{ color: '#166534' }}>Cargando...</Text>
          ) : permissionsError ? (
            <Text style={{ color: '#ef4444' }}>{permissionsError}</Text>
          ) : permissions.filter(p => p.status === 'ACCEPTED').length === 0 ? (
            <Text style={{ color: '#64748b' }}>No hay cuidadores aceptados.</Text>
          ) : (
            permissions.filter(p => p.status === 'ACCEPTED').map((perm) => (
              <View key={perm.id} style={{ backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#86efac' }}>
                <Text style={{ color: '#065f46', fontWeight: 'bold' }}>Cuidador ID: {perm.caregiverId}</Text>
                <Text style={{ color: '#64748b', marginBottom: 8 }}>Nivel: {perm.level || 'READ'}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => handleChangePermissionLevel(perm.id, 'READ')} style={{ backgroundColor: '#93c5fd', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16, marginRight: 8 }}>
                    <Text style={{ color: '#0c4a6e', fontWeight: 'bold' }}>Solo Lectura</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleChangePermissionLevel(perm.id, 'WRITE')} style={{ backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lectura y Escritura</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </LinearGradient>
      )}

      {/* Botón de Cerrar Sesión */}
      <LinearGradient
        colors={['#fef2f2', '#fee2e2', '#fca5a5']}
        style={{
          margin: 16,
          borderRadius: 16,
          padding: 20,
          borderWidth: 2,
          borderColor: '#fca5a5',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Cerrar Sesión',
              '¿Estás seguro de que quieres cerrar sesión?',
              [
                {
                  text: 'Cancelar',
                  style: 'cancel',
                },
                {
                  text: 'Cerrar Sesión',
                  style: 'destructive',
                  onPress: () => {
                    logout();
                  },
                },
              ]
            );
          }}
          style={{
            backgroundColor: '#dc2626',
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderRadius: 12,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="white" />
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
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
  loadingBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  loadingTextModern: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyProfileBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  emptyProfileTextModern: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  successBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  successTextModern: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  reloadBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  reloadBtnTextModern: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  retryBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  retryTextModern: {
    color: '#b45309',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  saveBtnDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },
  saveBtnWithChanges: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  unsavedChangesBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  unsavedChangesTextModern: {
    color: '#b45309',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});