import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/Home/HomeScreen';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import CaregiverMedicationsScreen from '../screens/Medications/CaregiverMedicationsScreen';
import CaregiverDashboardScreen from '../screens/Caregivers/CaregiverDashboardScreen';
import TreatmentsScreen from '../screens/Treatments/TreatmentsScreen';

import AppointmentsScreen from '../screens/Appointments/AppointmentsScreen';
import NotesScreen from '../screens/Notes/NotesScreen';
import HistoryScreen from '../screens/History/HistoryScreen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import AlarmScreen from '../screens/AlarmScreen/AlarmScreen';
import { useCurrentUser } from '../store/useCurrentUser';
// import MedicationsScreen from '../screens/Medications/MedicationsScreen';
// import AppointmentsScreen from '../screens/Appointments/AppointmentsScreen';
// import SettingsScreen from '../screens/Settings/SettingsScreen';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import CaregiverHomeScreen from '../screens/Home/CaregiverHomeScreen';
import { useAuth } from '../store/useAuth';
import COLORS from '../constants/colors';
// Importar la pantalla de perfil de cuidador
import CaregiverProfileScreen from '../screens/Profile/CaregiverProfileScreen';

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
      <Tab.Screen name="Medications" component={require('../screens/Medications/MedicationsScreen').default} options={{ title: 'Medicamentos' }} />
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
          if (route.name === 'Medications') return <Ionicons name="medkit" size={size} color={color} />;
          if (route.name === 'Treatments') return <Ionicons name="leaf" size={size} color={color} />;
          if (route.name === 'Appointments') return <Ionicons name="calendar" size={size} color={color} />;
          if (route.name === 'Perfil') return <Ionicons name="person-circle" size={size} color={color} />;
          if (route.name === 'Caregiver') return <MaterialCommunityIcons name="account-heart" size={size} color={color} />;
          return <Ionicons name="ellipse" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Inicio"
        component={CaregiverHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Calendario"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Calendario',
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={CaregiverProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
}

// 4. MainTabs: elige tabs según el rol
function MainTabs() {
  const { profile, loading: loadingProfile, error, fetchProfile } = useCurrentUser();
  const { logout } = useAuth();
  const isCaregiver = profile?.role === 'CAREGIVER';
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
        <TouchableOpacity onPress={fetchProfile} style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 12 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={{ backgroundColor: '#e0e7ff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 28 }}>
          <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 15 }}>Cerrar sesión</Text>
        </TouchableOpacity>
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
      {/* <RootStack.Screen name="Home" component={HomeScreen} /> */}
    </RootStack.Navigator>
  );
}
