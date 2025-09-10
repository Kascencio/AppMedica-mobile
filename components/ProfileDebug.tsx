import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useCurrentUser } from '../store/useCurrentUser';
import { useAuth } from '../store/useAuth';

export function ProfileDebug() {
  const { profile, loading, error, initialized } = useCurrentUser();
  const { userToken, isAuthenticated } = useAuth();

  const showDebugInfo = () => {
    // Decodificar token si está disponible
    let tokenInfo = 'No disponible';
    if (userToken) {
      try {
        const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
        tokenInfo = `Sub: ${tokenPayload.sub || 'N/A'}\n` +
                   `PatientId: ${tokenPayload.patientId || 'N/A'}\n` +
                   `ProfileId: ${tokenPayload.profileId || 'N/A'}\n` +
                   `Role: ${tokenPayload.role || 'N/A'}\n` +
                   `Name: ${tokenPayload.name || tokenPayload.patientName || 'N/A'}`;
      } catch (e) {
        tokenInfo = 'Error decodificando token';
      }
    }

    const debugInfo = {
      'Autenticado': isAuthenticated ? 'Sí' : 'No',
      'Token presente': userToken ? 'Sí' : 'No',
      'Perfil cargando': loading ? 'Sí' : 'No',
      'Perfil inicializado': initialized ? 'Sí' : 'No',
      'Error': error || 'Ninguno',
      'ID del perfil': profile?.id || 'No disponible',
      'ID del usuario': profile?.userId || 'No disponible',
      'ID del paciente': profile?.patientProfileId || 'No disponible',
      'Nombre': profile?.name || 'No disponible',
      'Rol': profile?.role || 'No disponible',
      'Token Info': tokenInfo,
    };

    const infoText = Object.entries(debugInfo)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    Alert.alert('🔍 Debug del Perfil', infoText);
  };

  const testApiCall = async () => {
    try {
      const { buildApiUrl, API_CONFIG } = await import('../constants/config');
      const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
      
      Alert.alert(
        '🌐 Test de API', 
        `Endpoint: ${endpoint}\n` +
        `Token: ${userToken ? 'Presente' : 'No disponible'}\n` +
        `Base URL: ${API_CONFIG.BASE_URL}`
      );
    } catch (error) {
      Alert.alert('❌ Error', `Error: ${error}`);
    }
  };

  const forceRefresh = async () => {
    try {
      const { refreshProfile } = useCurrentUser.getState();
      await refreshProfile();
      Alert.alert('✅ Éxito', 'Perfil refrescado');
    } catch (error) {
      Alert.alert('❌ Error', `Error: ${error}`);
    }
  };

  const testTokenDecoding = () => {
    if (!userToken) {
      Alert.alert('❌ Error', 'No hay token disponible');
      return;
    }

    try {
      const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
      const tokenInfo = {
        'Sub (subject)': tokenPayload.sub || 'N/A',
        'PatientId': tokenPayload.patientId || 'N/A',
        'ProfileId': tokenPayload.profileId || 'N/A',
        'PatientProfileId': tokenPayload.patientProfileId || 'N/A',
        'Role': tokenPayload.role || 'N/A',
        'Name': tokenPayload.name || 'N/A',
        'PatientName': tokenPayload.patientName || 'N/A',
        'UserId': tokenPayload.userId || 'N/A',
        'Exp': new Date(tokenPayload.exp * 1000).toLocaleString(),
        'Iat': new Date(tokenPayload.iat * 1000).toLocaleString(),
      };

      const infoText = Object.entries(tokenInfo)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      Alert.alert('🔑 Información del Token', infoText);
    } catch (error) {
      Alert.alert('❌ Error', `Error decodificando token: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Debug del Perfil</Text>
      
      <TouchableOpacity style={styles.button} onPress={showDebugInfo}>
        <Text style={styles.buttonText}>📊 Mostrar Info de Debug</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testApiCall}>
        <Text style={styles.buttonText}>🌐 Test de API</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={forceRefresh}>
        <Text style={styles.buttonText}>🔄 Forzar Recarga</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testTokenDecoding}>
        <Text style={styles.buttonText}>🔑 Ver Token</Text>
      </TouchableOpacity>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Estado: {loading ? 'Cargando...' : initialized ? 'Inicializado' : 'No inicializado'}
        </Text>
        {error && <Text style={styles.errorText}>Error: {error}</Text>}
        {profile?.id && <Text style={styles.successText}>ID: {profile.id}</Text>}
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#475569',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    color: '#059669',
    marginTop: 4,
  },
});