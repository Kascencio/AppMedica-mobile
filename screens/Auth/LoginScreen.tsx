import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as z from 'zod';
import { useAuth } from '../../store/useAuth';
import { useCurrentUser } from '../../store/useCurrentUser';
import logo from '../../assets/logo.webp';

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen({ navigation }: any) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, loading } = useAuth();
  const { fetchProfile, loading: loadingProfile } = useCurrentUser();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    console.log('[LoginScreen] Iniciando proceso de login...');
    setError(null);
    try {
      console.log('[LoginScreen] Llamando a login...');
      await login(data.email, data.password);
      console.log('[LoginScreen] Login exitoso, llamando a fetchProfile...');
      await fetchProfile();
      console.log('[LoginScreen] fetchProfile completado');
      // No navigation.replace ni navigation.reset: el flujo lo maneja App.tsx
    } catch (err: any) {
      console.log('[LoginScreen] Error en login:', err.message);
      setError(err.message || 'Credenciales incorrectas');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Image source={logo} style={{ width: 80, height: 80, borderRadius: 20 }} resizeMode="contain" />
        <Text style={styles.title}>RecuerdaMed</Text>
        <Text style={styles.subtitle}>Para los que cuidan... Y se cuidan.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bienvenido</Text>
        <Text style={styles.cardDescription}>Accede a tu agenda médica inteligente</Text>
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
                  placeholder="••••••••"
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
        {/* Forgot password link */}
        <TouchableOpacity
          style={styles.forgotLink}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotText}>¿Olvidó su contraseña?</Text>
        </TouchableOpacity>
        {/* Submit button */}
        <TouchableOpacity
          style={[styles.button, (loading || loadingProfile) && { opacity: 0.6 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading || loadingProfile}
        >
          {loading || loadingProfile ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
        {/* Register link */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>¿No tienes cuenta? Regístrate</Text>
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
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e293b',
  },
  cardDescription: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
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
  forgotLink: {
    marginBottom: 24,
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 12,
    color: '#2563eb',
    textAlign: 'right',
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
