import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useCurrentUser } from '../store/useCurrentUser';

export default function ProfileDebug() {
  const { profile, loading, error, initialized } = useCurrentUser();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Debug del Perfil</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado General</Text>
        <Text style={styles.info}>Loading: {loading ? '✅ Sí' : '❌ No'}</Text>
        <Text style={styles.info}>Initialized: {initialized ? '✅ Sí' : '❌ No'}</Text>
        <Text style={styles.info}>Error: {error || 'Ninguno'}</Text>
        <Text style={styles.info}>Profile existe: {profile ? '✅ Sí' : '❌ No'}</Text>
      </View>

      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Perfil</Text>
          <Text style={styles.info}>ID: {profile.id || 'No definido'}</Text>
          <Text style={styles.info}>User ID: {profile.userId || 'No definido'}</Text>
          <Text style={styles.info}>Patient Profile ID: {profile.patientProfileId || 'No definido'}</Text>
          <Text style={styles.info}>Nombre: {profile.name || 'No definido'}</Text>
          <Text style={styles.info}>Rol: {profile.role || 'No definido'}</Text>
          <Text style={styles.info}>Edad: {profile.age || 'No definido'}</Text>
          <Text style={styles.info}>Fecha de nacimiento: {profile.birthDate || 'No definido'}</Text>
          <Text style={styles.info}>Género: {profile.gender || 'No definido'}</Text>
          <Text style={styles.info}>Peso: {profile.weight || 'No definido'}</Text>
          <Text style={styles.info}>Altura: {profile.height || 'No definido'}</Text>
          <Text style={styles.info}>Tipo de sangre: {profile.bloodType || 'No definido'}</Text>
          <Text style={styles.info}>Foto URL: {profile.photoUrl ? '✅ Definida' : '❌ No definida'}</Text>
        </View>
      )}

      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Médica</Text>
          <Text style={styles.info}>Alergias: {profile.allergies || 'No definido'}</Text>
          <Text style={styles.info}>Enfermedades crónicas: {profile.chronicDiseases || 'No definido'}</Text>
          <Text style={styles.info}>Condiciones actuales: {profile.currentConditions || 'No definido'}</Text>
          <Text style={styles.info}>Reacciones: {profile.reactions || 'No definido'}</Text>
        </View>
      )}

      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacto de Emergencia</Text>
          <Text style={styles.info}>Nombre: {profile.emergencyContactName || 'No definido'}</Text>
          <Text style={styles.info}>Relación: {profile.emergencyContactRelation || 'No definido'}</Text>
          <Text style={styles.info}>Teléfono: {profile.emergencyContactPhone || 'No definido'}</Text>
        </View>
      )}

      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Médico</Text>
          <Text style={styles.info}>Médico: {profile.doctorName || 'No definido'}</Text>
          <Text style={styles.info}>Contacto médico: {profile.doctorContact || 'No definido'}</Text>
          <Text style={styles.info}>Hospital: {profile.hospitalReference || 'No definido'}</Text>
        </View>
      )}

      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metadatos</Text>
          <Text style={styles.info}>Creado: {profile.createdAt || 'No definido'}</Text>
          <Text style={styles.info}>Actualizado: {profile.updatedAt || 'No definido'}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>JSON Completo del Perfil</Text>
        <Text style={styles.jsonText}>
          {profile ? JSON.stringify(profile, null, 2) : 'No hay perfil'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2563eb',
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
});
