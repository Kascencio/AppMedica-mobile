import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { useCurrentUser } from '../store/useCurrentUser';
import { useAuth } from '../store/useAuth';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';

export default function PermissionDiagnostic() {
  const { profile, forceProfileRefresh, loading } = useCurrentUser();
  const { userToken, logout } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    if (userToken) {
      try {
        const payload = JSON.parse(atob(userToken.split('.')[1]));
        setTokenInfo(payload);
      } catch (error) {
        console.error('Error decodificando token:', error);
      }
    }
  }, [userToken]);

  const handleForceRefresh = async () => {
    try {
      await forceProfileRefresh();
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', `Error actualizando perfil: ${error}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Éxito', 'Sesión cerrada correctamente');
    } catch (error) {
      Alert.alert('Error', `Error cerrando sesión: ${error}`);
    }
  };

  const isTokenValid = tokenInfo?.sub === 'cmff28z4y0009jxvgzhi1dxq5';
  const isProfileCorrect = profile?.id === 'cmff28z53000bjxvg0z4smal1';
  const hasCorrectPermissions = isTokenValid && isProfileCorrect;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔐 Diagnóstico de Permisos</Text>
      
      {/* Estado General */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado General</Text>
        <View style={styles.statusRow}>
          <Ionicons 
            name={hasCorrectPermissions ? "checkmark-circle" : "close-circle"} 
            color={hasCorrectPermissions ? COLORS.success : COLORS.error} 
            size={24} 
          />
          <Text style={[styles.statusText, { 
            color: hasCorrectPermissions ? COLORS.success : COLORS.error 
          }]}>
            {hasCorrectPermissions ? 'Permisos Correctos' : 'Problema de Permisos'}
          </Text>
        </View>
      </View>

      {/* Token JWT */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Token JWT</Text>
        <View style={styles.statusRow}>
          <Ionicons 
            name={isTokenValid ? "checkmark-circle" : "close-circle"} 
            color={isTokenValid ? COLORS.success : COLORS.error} 
            size={20} 
          />
          <Text style={styles.statusText}>
            {isTokenValid ? 'Válido' : 'Inválido o Expirado'}
          </Text>
        </View>
        {tokenInfo && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>User ID: {tokenInfo.sub}</Text>
            <Text style={styles.infoText}>Role: {tokenInfo.role}</Text>
            <Text style={styles.infoText}>Exp: {new Date(tokenInfo.exp * 1000).toLocaleString()}</Text>
            <Text style={styles.infoText}>Expected: cmff28z4y0009jxvgzhi1dxq5</Text>
          </View>
        )}
      </View>

      {/* Perfil de Usuario */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perfil de Usuario</Text>
        <View style={styles.statusRow}>
          <Ionicons 
            name={isProfileCorrect ? "checkmark-circle" : "close-circle"} 
            color={isProfileCorrect ? COLORS.success : COLORS.error} 
            size={20} 
          />
          <Text style={styles.statusText}>
            {isProfileCorrect ? 'Correcto' : 'Incorrecto'}
          </Text>
        </View>
        {profile && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>ID: {profile.id}</Text>
            <Text style={styles.infoText}>Patient Profile ID: {profile.patientProfileId}</Text>
            <Text style={styles.infoText}>User ID: {profile.userId}</Text>
            <Text style={styles.infoText}>Expected ID: cmff28z53000bjxvg0z4smal1</Text>
          </View>
        )}
      </View>

      {/* Diagnóstico del Problema */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnóstico del Problema</Text>
        <View style={styles.infoBox}>
          {hasCorrectPermissions ? (
            <Text style={[styles.infoText, { color: COLORS.success }]}>
              ✅ Todo correcto. El usuario puede acceder a los recursos.
            </Text>
          ) : (
            <View>
              <Text style={[styles.infoText, { color: COLORS.error }]}>
                ❌ Problemas detectados:
              </Text>
              {!isTokenValid && (
                <Text style={styles.infoText}>• Token JWT inválido o expirado</Text>
              )}
              {!isProfileCorrect && (
                <Text style={styles.infoText}>• Perfil con ID incorrecto</Text>
              )}
              <Text style={styles.infoText}>
                • Esto causa errores NO_ACCESS (403) en el servidor
              </Text>
              <Text style={styles.infoText}>
                • El token y el perfil deben coincidir para tener permisos
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Soluciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soluciones</Text>
        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Actualizando..." : "🔄 Actualizar Perfil"}
            onPress={handleForceRefresh}
            disabled={loading}
          />
          <View style={styles.buttonSpacer} />
          <Button
            title="🚪 Cerrar Sesión"
            onPress={handleLogout}
            color={COLORS.error}
          />
        </View>
        <Text style={styles.helpText}>
          Si el problema persiste, cierra sesión y vuelve a iniciar sesión con las credenciales correctas.
        </Text>
      </View>

      {/* Información de IDs Correctos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>IDs Correctos</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Token User ID: cmff28z4y0009jxvgzhi1dxq5</Text>
          <Text style={styles.infoText}>Patient Profile ID: cmff28z53000bjxvg0z4smal1</Text>
          <Text style={styles.infoText}>Ambos deben coincidir para tener permisos</Text>
        </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.primary,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  buttonSpacer: {
    width: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
