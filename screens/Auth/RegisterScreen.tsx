import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as z from 'zod';
import { useAuth } from '../../store/useAuth';
import { useCurrentUser } from '../../store/useCurrentUser';
import { Picker } from '@react-native-picker/picker';

const registerSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirma tu contraseña'),
  role: z.enum(['PATIENT', 'CAREGIVER']),
  // inviteCode se elimina del flujo de registro
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen({ navigation }: any) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, loading } = useAuth();
  const { fetchProfile, loading: loadingProfile } = useCurrentUser();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'PATIENT',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      await register(data.email, data.password, data.role);
      await useCurrentUser.getState().fetchProfileCorrectFlow();
      // No navigation.replace ni navigation.reset: el flujo lo maneja App.tsx
    } catch (err: any) {
      setError(err.message || 'No se pudo completar el registro');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons name="person-add" size={64} color="#2563eb" />
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Regístrate para comenzar a usar RecuerdaMed</Text>
      </View>
      <View style={styles.card}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {/* Email */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="usuario@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={value}
                  onChangeText={onChange}
                  editable={!loading && !loadingProfile}
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>
          )}
        />
        {/* Password */}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="Crea una contraseña segura"
                  secureTextEntry={!showPassword}
                  value={value}
                  onChangeText={onChange}
                  editable={!loading && !loadingProfile}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  accessibilityLabel="Mostrar/ocultar contraseña"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>
          )}
        />
        {/* Confirm Password */}
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="Confirma tu contraseña"
                  secureTextEntry={!showConfirm}
                  value={value}
                  onChangeText={onChange}
                  editable={!loading && !loadingProfile}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm((s) => !s)}
                  accessibilityLabel="Mostrar/ocultar confirmación"
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
              )}
            </View>
          )}
        />
        {/* Role */}
        <Controller
          control={control}
          name="role"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tipo de Usuario</Text>
              <View style={styles.roleSelectorContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    value === 'PATIENT' && styles.roleButtonSelected,
                    (loading || loadingProfile) && styles.roleButtonDisabled
                  ]}
                  onPress={() => onChange('PATIENT')}
                  disabled={loading || loadingProfile}
                >
                  <View style={styles.roleButtonContent}>
                    <Ionicons 
                      name="person-outline" 
                      size={24} 
                      color={value === 'PATIENT' ? '#fff' : '#2563eb'} 
                    />
                    <Text style={[
                      styles.roleButtonText,
                      value === 'PATIENT' && styles.roleButtonTextSelected
                    ]}>
                      Paciente
                    </Text>
                  </View>
                  <Text style={[
                    styles.roleButtonSubtext,
                    value === 'PATIENT' && styles.roleButtonSubtextSelected
                  ]}>
                    Soy quien toma medicamentos
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    value === 'CAREGIVER' && styles.roleButtonSelected,
                    (loading || loadingProfile) && styles.roleButtonDisabled
                  ]}
                  onPress={() => onChange('CAREGIVER')}
                  disabled={loading || loadingProfile}
                >
                  <View style={styles.roleButtonContent}>
                    <Ionicons 
                      name="people-outline" 
                      size={24} 
                      color={value === 'CAREGIVER' ? '#fff' : '#059669'} 
                    />
                    <Text style={[
                      styles.roleButtonText,
                      value === 'CAREGIVER' && styles.roleButtonTextSelected
                    ]}>
                      Cuidador/Familiar
                    </Text>
                  </View>
                  <Text style={[
                    styles.roleButtonSubtext,
                    value === 'CAREGIVER' && styles.roleButtonSubtextSelected
                  ]}>
                    Ayudo a alguien con medicamentos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
        {/* El código de invitación ya no se solicita en registro para cuidadores */}
        {/* Submit button */}
        <TouchableOpacity
          style={[styles.button, (loading || loadingProfile) && { opacity: 0.6 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading || loadingProfile}
        >
          {loading || loadingProfile ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Registrarse</Text>
          )}
        </TouchableOpacity>
        {/* Login link */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.registerText}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 4,
    color: '#334155',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 16,
    color: '#1e293b',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerLink: {
    marginTop: 8,
  },
  registerText: {
    textAlign: 'center',
    color: '#2563eb',
    fontSize: 15,
  },
  roleSelectorContainer: {
    gap: 12,
  },
  roleButton: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  roleButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#334155',
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  roleButtonSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  roleButtonSubtextSelected: {
    color: '#e2e8f0',
  },
});
