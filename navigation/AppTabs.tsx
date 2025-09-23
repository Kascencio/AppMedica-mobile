import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/Home/HomeScreen';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import CaregiverMedicationsScreen from '../screens/Medications/CaregiverMedicationsScreen';
import CaregiverDashboardScreen from '../screens/Caregivers/CaregiverDashboardScreen';
import TreatmentsScreen from '../screens/Treatments/TreatmentsScreen';
import MedicationsScreen from '../screens/Medications/MedicationsScreen';
import AppointmentsScreen from '../screens/Appointments/AppointmentsScreen';
import NotesScreen from '../screens/Notes/NotesScreen';
import HistoryScreen from '../screens/History/HistoryScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import AlarmScreen from '../screens/AlarmScreen/AlarmScreen';
import { useCurrentUser } from '../store/useCurrentUser';
// import MedicationsScreen from '../screens/Medications/MedicationsScreen';
// import AppointmentsScreen from '../screens/Appointments/AppointmentsScreen';
// import SettingsScreen from '../screens/Settings/SettingsScreen';
import { View, Text, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import CaregiverHomeScreen from '../screens/Home/CaregiverHomeScreen';
import { useAuth } from '../store/useAuth';
import { useCaregiver } from '../store/useCaregiver';
import { usePermissions } from '../store/usePermissions';
import { useInviteCodes } from '../store/useInviteCodes';
import COLORS from '../constants/colors';
// Importar la pantalla de perfil de cuidador
import CaregiverProfileScreen from '../screens/Profile/CaregiverProfileScreen';
import CaregiverPatientsScreen from '../screens/Caregivers/CaregiverPatientsScreen';
import CaregiverAppointmentsScreen from '../screens/Appointments/CaregiverAppointmentsScreen';
import CaregiverTreatmentsScreen from '../screens/Treatments/CaregiverTreatmentsScreen';
// Eliminado: Notas y Notificaciones para cuidador

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// 2. NUEVO: Tabs para PACIENTE - Simplificado a 5 tabs principales
function PatientTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text.tertiary,
        tabBarStyle: { 
          paddingBottom: 4, 
          height: 60,
          backgroundColor: COLORS.background.card,
          borderTopColor: COLORS.border.neutral,
          borderTopWidth: 1,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Medications') iconName = 'medkit';
          else if (route.name === 'Calendar') iconName = 'calendar';
          else if (route.name === 'Treatments') iconName = 'leaf';
          else if (route.name === 'Appointments') iconName = 'medical';
          else if (route.name === 'Profile') iconName = 'person-circle';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Medications" component={MedicationsScreen} options={{ title: 'Medicamentos' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendario' }} />
      <Tab.Screen name="Treatments" component={TreatmentsScreen} options={{ title: 'Tratamientos' }} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ title: 'Citas' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

// 3. NUEVO: Tabs para CUIDADOR
function CaregiverTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { paddingBottom: 4, height: 60 },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Inicio') return <Ionicons name="home" size={size} color={color} />;
          if (route.name === 'Calendario') return <Ionicons name="calendar" size={size} color={color} />;
          if (route.name === 'Medicamentos') return <Ionicons name="medkit" size={size} color={color} />;
          if (route.name === 'Tratamientos') return <Ionicons name="leaf" size={size} color={color} />;
          if (route.name === 'Citas') return <Ionicons name="calendar" size={size} color={color} />;
          if (route.name === 'Perfil') return <Ionicons name="person-circle" size={size} color={color} />;
          // if (route.name === 'Pacientes') return <MaterialCommunityIcons name="account-heart" size={size} color={color} />;
          if (route.name === 'Notas') return <MaterialCommunityIcons name="note-text" size={size} color={color} />;
          if (route.name === 'Notificaciones') return <Ionicons name="notifications" size={size} color={color} />;
          return <Ionicons name="ellipse" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={CaregiverHomeScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="home-outline" size={size} color={color} />), tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Calendario" component={CalendarScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="calendar-outline" size={size} color={color} />), tabBarLabel: 'Calendario' }} />
      {/* <Tab.Screen name="Pacientes" component={CaregiverPatientsScreen} options={{ tabBarIcon: ({ color, size }) => (<MaterialCommunityIcons name="account-heart" size={size} color={color} />), tabBarLabel: 'Pacientes' }} /> */}
      <Tab.Screen name="Tratamientos" component={CaregiverTreatmentsScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="leaf-outline" size={size} color={color} />), tabBarLabel: 'Tratamientos' }} />
      <Tab.Screen name="Citas" component={CaregiverAppointmentsScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="calendar-outline" size={size} color={color} />), tabBarLabel: 'Citas' }} />
      <Tab.Screen name="Medicamentos" component={CaregiverMedicationsScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="medkit-outline" size={size} color={color} />), tabBarLabel: 'Medicamentos' }} />
      <Tab.Screen name="Perfil" component={CaregiverProfileScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="person-circle-outline" size={size} color={color} />), tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}

// 4. MainTabs: elige tabs según el rol
function MainTabs() {
  const { profile, loading: loadingProfile, error, fetchProfileCorrectFlow } = useCurrentUser();
  const { logout } = useAuth();
  const isCaregiver = profile?.role === 'CAREGIVER';
  const { items, loading: permsLoading, error: permsError, getCaregiverPermissions } = usePermissions();
  const { joinAsCaregiver, loading: joinLoading, error: joinError, clearError } = useInviteCodes();
  const [code, setCode] = React.useState('');
  const [justJoined, setJustJoined] = React.useState(false);
  const { patients, fetchPatients } = useCaregiver();

  // Cargar permisos del cuidador para saber si hay alguno ACCEPTED
  React.useEffect(() => {
    if (isCaregiver) {
      getCaregiverPermissions();
      fetchPatients();
    }
  }, [isCaregiver]);

  const hasAccepted = isCaregiver ? (items.some(i => i.status === 'ACCEPTED') || (patients?.length ?? 0) > 0) : false;
  const hasPending = isCaregiver ? items.some(i => i.status === 'PENDING') : false;

  // Sondear periódicamente los permisos mientras no estén aceptados
  React.useEffect(() => {
    if (!isCaregiver) return;
    if (hasAccepted) return;
    const id = setInterval(() => {
      getCaregiverPermissions();
      fetchPatients();
    }, 5000);
    return () => clearInterval(id);
  }, [isCaregiver, hasAccepted]);
  if (loadingProfile || (!profile && !error)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: '#2563eb', marginTop: 12 }}>Cargando perfil...</Text>
      </View>
    );
  }
  if (error && !profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 32 }}>
        <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Error al cargar perfil</Text>
        <Text style={{ color: '#64748b', fontSize: 15, marginBottom: 18, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity onPress={fetchProfileCorrectFlow} style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 12 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={{ backgroundColor: '#e0e7ff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 28 }}>
          <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 15 }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // Si es cuidador pero aún no tiene permisos ACCEPTED, bloquear panel con una pantalla dedicada
  if (isCaregiver && !hasAccepted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 }}>
        {permsLoading ? (
          <>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={{ color: '#2563eb', marginTop: 12 }}>Verificando estado de tu solicitud...</Text>
          </>
        ) : (hasPending || justJoined) ? (
          <>
            <Ionicons name="time" size={48} color="#2563eb" />
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
              Tu solicitud ha sido enviada
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Espera a que el paciente apruebe tu acceso. Te avisaremos cuando sea aceptada.
            </Text>
            <TouchableOpacity onPress={getCaregiverPermissions} style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Actualizar estado</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={{ backgroundColor: '#e2e8f0', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 10 }}>
              <Text style={{ color: '#0f172a', fontWeight: '600' }}>Cerrar sesión</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="key-outline" size={48} color="#2563eb" />
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
              Únete con un código de invitación
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Pide al paciente que te comparta su código y escríbelo a continuación.
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 14, alignItems: 'center' }}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="XXXX-XXXX"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                keyboardType="default"
                maxLength={8}
                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, width: 220, backgroundColor: '#f8fafc', color: '#0f172a' }}
              />
            </View>
            {/* Botones simples para simular input debido a limitaciones aquí; en UI real usa TextInput */}
            <TouchableOpacity onPress={async () => { clearError(); const ok = await joinAsCaregiver(code); if (ok) { setJustJoined(true); setCode(''); getCaregiverPermissions(); fetchPatients(); } }} disabled={joinLoading || (code || '').trim().length !== 8} style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 12, opacity: joinLoading || (code || '').trim().length !== 8 ? 0.6 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{joinLoading ? 'Uniendo...' : 'Unirme'}</Text>
            </TouchableOpacity>
            {joinError ? (
              <Text style={{ color: '#ef4444', marginTop: 8 }}>{joinError}</Text>
            ) : null}
            <TouchableOpacity onPress={logout} style={{ backgroundColor: '#e2e8f0', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 10 }}>
              <Text style={{ color: '#0f172a', fontWeight: '600' }}>Cerrar sesión</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  // Renderiza tabs según el rol
  return isCaregiver ? <CaregiverTabs /> : <PatientTabs />;
}

export default function AppTabs() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="AlarmScreen" component={AlarmScreen} />
      <RootStack.Screen name="CaregiverDashboardScreen" component={CaregiverDashboardScreen} />
      <RootStack.Screen name="Notes" component={NotesScreen} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
      {/* <RootStack.Screen name="Home" component={HomeScreen} /> */}
    </RootStack.Navigator>
  );
}
