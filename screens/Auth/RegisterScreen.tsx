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
  inviteCode: z.string().optional(),
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
      inviteCode: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      await register(data.email, data.password, data.role);
      await fetchProfile();
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
              <View style={styles.inputRow}>
                <Picker
                  selectedValue={value}
                  style={{ flex: 1 }}
                  onValueChange={onChange}
                  enabled={!loading && !loadingProfile}
                >
                  <Picker.Item label="Paciente" value="PATIENT" />
                  <Picker.Item label="Cuidador/Familiar" value="CAREGIVER" />
                </Picker>
              </View>
            </View>
          )}
        />
        {/* Invite Code (solo si es cuidador) */}
        {selectedRole === 'CAREGIVER' && (
          <Controller
            control={control}
            name="inviteCode"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Código de Invitación</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={20} color="#94a3b8" />
                  <TextInput
                    style={styles.input}
                    placeholder="XXXX-XXXX"
                    autoCapitalize="characters"
                    value={value}
                    onChangeText={onChange}
                    editable={!loading && !loadingProfile}
                  />
                </View>
              </View>
            )}
          />
        )}
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
});
