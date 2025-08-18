import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import logo from '../../assets/logo.webp';
import { Image } from 'react-native';
import { useCaregiver } from '../../store/useCaregiver';
import { useMedications } from '../../store/useMedications';
import { useTreatments } from '../../store/useTreatments';
import { useAppointments } from '../../store/useAppointments';
import { useNotes } from '../../store/useNotes';

export default function CaregiverDashboardScreen() {
  const { patients, loading, error, fetchPatients, joinPatient } = useCaregiver();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Datos del paciente seleccionado
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  // Stores de datos filtrados por paciente
  const medsStore = useMedications();
  const treatmentsStore = useTreatments();
  const appointmentsStore = useAppointments();
  const notesStore = useNotes();

  // Cargar pacientes al montar
  useEffect(() => {
    fetchPatients();
  }, []);

  // Cargar datos del paciente seleccionado
  useEffect(() => {
    if (selectedPatientId) {
      medsStore.getMedications(selectedPatientId);
      treatmentsStore.getTreatments(selectedPatientId);
      appointmentsStore.getAppointments(selectedPatientId);
      notesStore.getNotes(selectedPatientId);
    }
  }, [selectedPatientId]);

  // Seleccionar el primer paciente automáticamente
  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients]);

  const handleJoin = async () => {
    setJoining(true);
    setJoinError(null);
    const ok = await joinPatient(joinCode.trim());
    setJoining(false);
    if (ok) {
      setJoinCode('');
      Alert.alert('¡Éxito!', 'Te has unido al paciente correctamente.');
    } else {
      setJoinError('Código inválido o error al unirse.');
    }
  };

  if (loading && patients.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subtitle}>Cargando panel…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Branding y logo */}
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <Image source={logo} style={{ width: 70, height: 70, borderRadius: 20 }} resizeMode="contain" />
      </View>
      {/* Selector de paciente y unirse por código */}
      <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
        <Text style={styles.sectionTitleModern}>Paciente asignado</Text>
        <Picker
          selectedValue={selectedPatientId}
          onValueChange={(itemValue) => setSelectedPatientId(itemValue)}
          style={styles.pickerModern}
        >
          {patients.map((p) => (
            <Picker.Item key={p.id} label={p.name} value={p.id} />
          ))}
        </Picker>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <TextInput
            style={styles.inputModern}
            placeholder="Código invitación"
            value={joinCode}
            onChangeText={setJoinCode}
          />
          <TouchableOpacity
            style={styles.addBtnModern}
            onPress={handleJoin}
            disabled={joining || !joinCode.trim()}
          >
            <Text style={styles.addBtnTextModern}>{joining ? 'Uniendo...' : 'Unirse'}</Text>
          </TouchableOpacity>
        </View>
        {joinError && <Text style={styles.errorTextModern}>{joinError}</Text>}
        {error && <Text style={styles.errorTextModern}>{error}</Text>}
      </LinearGradient>
      {/* Información básica del paciente */}
      {selectedPatient ? (
        <>
          <LinearGradient colors={["#f0fdf4", "#f1f5f9"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <Text style={styles.sectionTitleModern}>Perfil del paciente</Text>
            <Text style={styles.profileItemModern}><Text style={styles.profileLabelModern}>Nombre:</Text> {selectedPatient.name}</Text>
            <Text style={styles.profileItemModern}><Text style={styles.profileLabelModern}>Edad:</Text> {selectedPatient.age} años</Text>
            <Text style={styles.profileItemModern}><Text style={styles.profileLabelModern}>Peso:</Text> {selectedPatient.weight || '-'} kg</Text>
            <Text style={styles.profileItemModern}><Text style={styles.profileLabelModern}>Altura:</Text> {selectedPatient.height || '-'} cm</Text>
            <Text style={styles.profileItemModern}><Text style={styles.profileLabelModern}>Alergias:</Text> {selectedPatient.allergies || '-'}</Text>
            <Text style={styles.profileItemModern}><Text style={styles.profileLabelModern}>Reacciones:</Text> {selectedPatient.reactions || '-'}</Text>
            <Text style={styles.profileItemModern}><Text style={styles.profileLabelModern}>Médico:</Text> {selectedPatient.doctorName || '-'}</Text>
            <Text style={styles.profileItemModern}><Text style={styles.profileLabelModern}>Contacto médico:</Text> {selectedPatient.doctorContact || '-'}</Text>
          </LinearGradient>
          {/* Medicamentos */}
          <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <Text style={styles.sectionTitleModern}>Medicamentos</Text>
            {medsStore.medications.length === 0 ? (
              <Text style={styles.emptyTextModern}>No hay medicamentos registrados.</Text>
            ) : (
              medsStore.medications.map((med) => (
                <View key={med.id} style={styles.itemRowModern}>
                  <Ionicons name="medkit" size={20} color="#38bdf8" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitleModern}>{med.name}</Text>
                    <Text style={styles.itemInfoModern}>{med.dosage} - {med.type}</Text>
                    <Text style={styles.itemInfoModern}>Frecuencia: {med.frequency}</Text>
                    <Text style={styles.itemInfoModern}>Inicio: {new Date(med.startDate).toLocaleDateString()}</Text>
                    {med.notes && <Text style={styles.itemNotesModern}>{med.notes}</Text>}
                  </View>
                </View>
              ))
            )}
          </LinearGradient>
          {/* Tratamientos */}
          <LinearGradient colors={["#f0fdf4", "#f1f5f9"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <Text style={styles.sectionTitleModern}>Tratamientos</Text>
            {treatmentsStore.treatments.length === 0 ? (
              <Text style={styles.emptyTextModern}>No hay tratamientos registrados.</Text>
            ) : (
              treatmentsStore.treatments.map((t) => (
                <View key={t.id} style={styles.itemRowModern}>
                  <MaterialCommunityIcons name="clipboard-list" size={20} color="#4ade80" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitleModern}>{t.title}</Text>
                    <Text style={styles.itemInfoModern}>{t.description}</Text>
                    <Text style={styles.itemInfoModern}>Inicio: {t.startDate} - Fin: {t.endDate}</Text>
                    <Text style={styles.itemInfoModern}>Progreso: {t.progress}</Text>
                  </View>
                </View>
              ))
            )}
          </LinearGradient>
          {/* Citas */}
          <LinearGradient colors={["#d1fae5", "#f0fdfa"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <Text style={styles.sectionTitleModern}>Citas</Text>
            {appointmentsStore.appointments.length === 0 ? (
              <Text style={styles.emptyTextModern}>No hay citas registradas.</Text>
            ) : (
              appointmentsStore.appointments.map((a) => (
                <View key={a.id} style={styles.itemRowModern}>
                  <MaterialCommunityIcons name="stethoscope" size={20} color="#34d399" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitleModern}>{a.title}</Text>
                    <Text style={styles.itemInfoModern}>{a.location}</Text>
                    <Text style={styles.itemInfoModern}>Fecha: {new Date(a.dateTime).toLocaleString()}</Text>
                    <Text style={styles.itemInfoModern}>{a.description}</Text>
                  </View>
                </View>
              ))
            )}
          </LinearGradient>
          {/* Notas */}
          <LinearGradient colors={["#e0e7ff", "#f0fdfa"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <Text style={styles.sectionTitleModern}>Notas médicas recientes</Text>
            {notesStore.notes.length === 0 ? (
              <Text style={styles.emptyTextModern}>No hay notas disponibles.</Text>
            ) : (
              notesStore.notes.map((n) => (
                <View key={n.id} style={styles.itemRowModern}>
                  <MaterialCommunityIcons name="file-document" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitleModern}>{n.title}</Text>
                    <Text style={styles.itemInfoModern}>{n.content}</Text>
                    <Text style={styles.itemInfoModern}>Fecha: {n.date}</Text>
                  </View>
                </View>
              ))
            )}
          </LinearGradient>
        </>
      ) : (
        <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 24 }}>Selecciona un paciente para ver sus datos.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  addBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 4,
  },
  profileItem: {
    fontSize: 15,
    marginBottom: 2,
  },
  profileLabel: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemTitle: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 15,
  },
  itemInfo: {
    color: '#64748b',
    fontSize: 13,
  },
  itemNotes: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  monthBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginHorizontal: 12,
    textTransform: 'capitalize',
  },
  todayBtn: {
    marginLeft: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 13,
    paddingVertical: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    position: 'relative',
  },
  dayCellInactive: {
    backgroundColor: '#f3f4f6',
    opacity: 0.5,
  },
  dayCellToday: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  eventDotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    position: 'absolute',
    bottom: 10,
    left: '35%',
  },
  eventDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    position: 'absolute',
    bottom: 10,
    right: '35%',
  },
  // Nuevos estilos modernos
  cardModern: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  sectionTitleModern: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
  },
  pickerModern: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputModern: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  addBtnModern: {
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  addBtnTextModern: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 15,
  },
  errorTextModern: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 4,
  },
  profileItemModern: {
    fontSize: 15,
    marginBottom: 2,
  },
  profileLabelModern: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  itemRowModern: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemTitleModern: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 15,
  },
  itemInfoModern: {
    color: '#64748b',
    fontSize: 13,
  },
  itemNotesModern: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  emptyTextModern: {
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 8,
  },
});
