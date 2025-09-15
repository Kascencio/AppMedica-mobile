import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useCurrentUser } from '../store/useCurrentUser';
import { useAuth } from '../store/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileDataDiagnostic() {
  const { profile, loading, error, initialized, fetchProfile, refreshProfile } = useCurrentUser();
  const { forceRefreshFromServer } = useCurrentUser.getState();
  const { userToken } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const checkProfileData = async () => {
    setTesting(true);
    addResult('🔍 Verificando datos del perfil...');
    
    try {
      // Estado actual
      addResult(`📊 Estado actual:`);
      addResult(`  - Loading: ${loading}`);
      addResult(`  - Initialized: ${initialized}`);
      addResult(`  - Error: ${error || 'Ninguno'}`);
      addResult(`  - Token: ${userToken ? 'Presente' : 'Ausente'}`);
      
      // Verificar perfil
      if (profile) {
        addResult(`✅ Perfil encontrado:`);
        addResult(`  - ID: ${profile.id}`);
        addResult(`  - Nombre: ${profile.name || 'No definido'}`);
        addResult(`  - Role: ${profile.role || 'No definido'}`);
        addResult(`  - UserId: ${profile.userId || 'No definido'}`);
        addResult(`  - PatientProfileId: ${profile.patientProfileId || 'No definido'}`);
        addResult(`  - BirthDate: ${profile.birthDate || 'No definido'}`);
        addResult(`  - Gender: ${profile.gender || 'No definido'}`);
        addResult(`  - Weight: ${profile.weight || 'No definido'}`);
        addResult(`  - Height: ${profile.height || 'No definido'}`);
        addResult(`  - PhotoUrl: ${profile.photoUrl || 'No definido'}`);
        addResult(`  - CreatedAt: ${profile.createdAt || 'No definido'}`);
        addResult(`  - UpdatedAt: ${profile.updatedAt || 'No definido'}`);
        
        // Verificar campos críticos
        const criticalFields = ['id', 'name', 'role'];
        const missingFields = criticalFields.filter(field => !profile[field as keyof typeof profile]);
        
        if (missingFields.length > 0) {
          addResult(`⚠️ Campos críticos faltantes: ${missingFields.join(', ')}`);
        } else {
          addResult(`✅ Todos los campos críticos están presentes`);
        }
        
      } else {
        addResult(`❌ No hay perfil cargado`);
      }
      
    } catch (error: any) {
      addResult(`❌ Error verificando perfil: ${error.message}`);
    }
    
    setTesting(false);
  };

  const forceReloadProfile = async () => {
    setTesting(true);
    addResult('🔄 Forzando recarga del perfil...');
    
    try {
      await refreshProfile();
      addResult('✅ Recarga forzada completada');
      
      // Verificar resultado
      setTimeout(() => {
        const newProfile = useCurrentUser.getState().profile;
        if (newProfile) {
          addResult(`✅ Nuevo perfil cargado: ${newProfile.name || 'Sin nombre'} (${newProfile.id})`);
        } else {
          addResult(`❌ No se pudo cargar el perfil después de la recarga`);
        }
      }, 1000);
      
    } catch (error: any) {
      addResult(`❌ Error en recarga forzada: ${error.message}`);
    }
    
    setTesting(false);
  };

  const forceReloadFromServer = async () => {
    setTesting(true);
    addResult('🌐 Forzando recarga desde el servidor...');
    
    try {
      const newProfile = await forceRefreshFromServer();
      if (newProfile) {
        addResult(`✅ Perfil recargado desde servidor: ${newProfile.name || 'Sin nombre'} (${newProfile.id})`);
        Alert.alert('Éxito', 'Perfil recargado desde el servidor correctamente');
      } else {
        addResult(`❌ No se pudo recargar el perfil desde el servidor`);
        Alert.alert('Error', 'No se pudo recargar el perfil desde el servidor');
      }
      
    } catch (error: any) {
      addResult(`❌ Error en recarga desde servidor: ${error.message}`);
      Alert.alert('Error', `Error al recargar desde el servidor: ${error.message}`);
    }
    
    setTesting(false);
  };

  const checkToken = async () => {
    setTesting(true);
    addResult('🔑 Verificando token de autenticación...');
    
    try {
      if (!userToken) {
        addResult('❌ No hay token de autenticación');
        setTesting(false);
        return;
      }
      
      addResult(`✅ Token encontrado: ${userToken.substring(0, 20)}...`);
      
      // Decodificar token
      try {
        const payload = JSON.parse(atob(userToken.split('.')[1]));
        addResult(`📋 Payload del token:`);
        addResult(`  - ID: ${payload.id || 'No definido'}`);
        addResult(`  - Sub: ${payload.sub || 'No definido'}`);
        addResult(`  - Role: ${payload.role || 'No definido'}`);
        addResult(`  - PatientId: ${payload.patientId || 'No definido'}`);
        addResult(`  - PatientName: ${payload.patientName || 'No definido'}`);
        addResult(`  - Exp: ${new Date(payload.exp * 1000).toLocaleString()}`);
        
        // Verificar expiración
        const now = Date.now() / 1000;
        if (payload.exp < now) {
          addResult(`⚠️ Token expirado hace ${Math.round((now - payload.exp) / 60)} minutos`);
        } else {
          addResult(`✅ Token válido por ${Math.round((payload.exp - now) / 60)} minutos más`);
        }
        
      } catch (decodeError) {
        addResult(`❌ Error decodificando token: ${decodeError}`);
      }
      
    } catch (error: any) {
      addResult(`❌ Error verificando token: ${error.message}`);
    }
    
    setTesting(false);
  };

  const clearProfileCache = async () => {
    Alert.alert(
      'Limpiar caché del perfil',
      '¿Estás seguro de que quieres limpiar el caché del perfil? Esto forzará una recarga completa desde el servidor.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          onPress: async () => {
            setTesting(true);
            addResult('🧹 Limpiando caché del perfil...');
            
            try {
              // Resetear estado
              useCurrentUser.getState().resetProfile();
              addResult('✅ Estado del perfil reseteado');
              
              // Recargar
              await fetchProfile();
              addResult('✅ Perfil recargado desde el servidor');
              
              Alert.alert('Completado', 'Caché del perfil limpiado y recargado');
              
            } catch (error: any) {
              addResult(`❌ Error limpiando caché: ${error.message}`);
              Alert.alert('Error', 'Error al limpiar el caché del perfil');
            }
            
            setTesting(false);
          }
        }
      ]
    );
  };

  const exportProfileData = () => {
    if (!profile) {
      Alert.alert('Error', 'No hay datos de perfil para exportar');
      return;
    }
    
    const profileData = JSON.stringify(profile, null, 2);
    addResult('📤 Datos del perfil exportados (ver logs)');
    console.log('[ProfileDataDiagnostic] Datos del perfil:', profileData);
    
    Alert.alert(
      'Datos exportados',
      'Los datos del perfil se han exportado a la consola. Revisa los logs para ver el JSON completo.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Diagnóstico de Datos del Perfil</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={checkProfileData}
          disabled={testing}
        >
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.buttonText}>Verificar Datos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={forceReloadProfile}
          disabled={testing}
        >
          <Ionicons name="refresh" size={20} color="#2563eb" />
          <Text style={[styles.buttonText, { color: '#2563eb' }]}>Recargar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.infoButton]} 
          onPress={forceReloadFromServer}
          disabled={testing}
        >
          <Ionicons name="cloud-download" size={20} color="#0ea5e9" />
          <Text style={[styles.buttonText, { color: '#0ea5e9' }]}>Desde Servidor</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.tertiaryButton]} 
          onPress={checkToken}
          disabled={testing}
        >
          <Ionicons name="key" size={20} color="#22c55e" />
          <Text style={[styles.buttonText, { color: '#22c55e' }]}>Verificar Token</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.warningButton]} 
          onPress={clearProfileCache}
          disabled={testing}
        >
          <Ionicons name="trash" size={20} color="#f59e0b" />
          <Text style={[styles.buttonText, { color: '#f59e0b' }]}>Limpiar Caché</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.infoButton]} 
          onPress={exportProfileData}
          disabled={testing}
        >
          <Ionicons name="download" size={20} color="#0ea5e9" />
          <Text style={[styles.buttonText, { color: '#0ea5e9' }]}>Exportar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={clearResults}
          disabled={testing}
        >
          <Ionicons name="close" size={20} color="#ef4444" />
          <Text style={[styles.buttonText, { color: '#ef4444' }]}>Limpiar</Text>
        </TouchableOpacity>
      </View>
      
      {testing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Ejecutando diagnóstico...</Text>
        </View>
      )}
      
      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={true}>
        <Text style={styles.resultsTitle}>📋 Resultados del Diagnóstico:</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No hay resultados aún. Ejecuta alguna prueba.</Text>
        ) : (
          testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>{result}</Text>
          ))
        )}
      </ScrollView>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>📊 Estado Actual:</Text>
        <Text style={styles.statusText}>
          Perfil: {profile ? `✅ ${profile.name || 'Sin nombre'}` : '❌ No cargado'}
        </Text>
        <Text style={styles.statusText}>
          Estado: {loading ? '⏳ Cargando' : initialized ? '✅ Inicializado' : '❌ No inicializado'}
        </Text>
        <Text style={styles.statusText}>
          Error: {error || '✅ Ninguno'}
        </Text>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  tertiaryButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  warningButton: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  infoButton: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#2563eb',
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    marginBottom: 16,
  },
  resultsTitle: {
    color: '#f1f5f9',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noResults: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  resultText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  statusContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  statusTitle: {
    color: '#0c4a6e',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    color: '#075985',
    fontSize: 14,
    marginBottom: 4,
  },
});
