import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Platform, Alert, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useAppointments } from '../../store/useAppointments';
import { useCaregiver } from '../../store/useCaregiver';
import { useOffline } from '../../store/useOffline';
import { LinearGradient } from 'expo-linear-gradient';
import CaregiverPatientSwitcher from '../../components/CaregiverPatientSwitcher';
import SelectedPatientBanner from '../../components/SelectedPatientBanner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import COLORS from '../../constants/colors';
import { GLOBAL_STYLES, MEDICAL_STYLES } from '../../constants/styles';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;
const isLandscape = width > height;

const appointmentSchema = z.object({
  doctorName: z.string().min(1, 'Obligatorio'),
  specialty: z.string().optional(),
  location: z.string().min(1, 'Obligatorio'),
  date: z.date().refine((date) => date !== undefined, { message: 'Selecciona una fecha' }),
  time: z.string().min(1, 'Obligatorio'),
  notes: z.string().optional(),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

// Opciones de especialidades médicas
const MEDICAL_SPECIALTIES = [
  { value: '', label: 'Seleccionar especialidad' },
  { value: 'Cardiology', label: 'Cardiología' },
  { value: 'Dermatology', label: 'Dermatología' },
  { value: 'Endocrinology', label: 'Endocrinología' },
  { value: 'Gastroenterology', label: 'Gastroenterología' },
  { value: 'General Medicine', label: 'Medicina General' },
  { value: 'Gynecology', label: 'Ginecología' },
  { value: 'Hematology', label: 'Hematología' },
  { value: 'Infectious Diseases', label: 'Enfermedades Infecciosas' },
  { value: 'Internal Medicine', label: 'Medicina Interna' },
  { value: 'Nephrology', label: 'Nefrología' },
  { value: 'Neurology', label: 'Neurología' },
  { value: 'Oncology', label: 'Oncología' },
  { value: 'Ophthalmology', label: 'Oftalmología' },
  { value: 'Orthopedics', label: 'Ortopedia' },
  { value: 'Otolaryngology', label: 'Otorrinolaringología' },
  { value: 'Pediatrics', label: 'Pediatría' },
  { value: 'Pulmonology', label: 'Neumología' },
  { value: 'Psychiatry', label: 'Psiquiatría' },
  { value: 'Radiology', label: 'Radiología' },
  { value: 'Rheumatology', label: 'Reumatología' },
  { value: 'Urology', label: 'Urología' },
  { value: 'Emergency Medicine', label: 'Medicina de Emergencias' },
  { value: 'Family Medicine', label: 'Medicina Familiar' },
  { value: 'Physical Therapy', label: 'Fisioterapia' },
  { value: 'Nutrition', label: 'Nutrición' },
  { value: 'Psychology', label: 'Psicología' },
  { value: 'Dentistry', label: 'Odontología' },
  { value: 'Other', label: 'Otra especialidad' }
];

export default function CaregiverAppointmentsScreen() {
  const { appointments, loading, error, getAppointments, createAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { selectedPatientId } = useCaregiver();
  const { isOnline } = useOffline();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { doctorName: '', specialty: '', location: '', date: undefined, time: '', notes: '' },
  });

  useEffect(() => {
    if (selectedPatientId) getAppointments(selectedPatientId).catch(() => {});
  }, [selectedPatientId]);

  const openCreateModal = () => {
    setEditingAppointment(null);
    reset();
    setSelectedDate(undefined);
    setModalVisible(true);
  };
  
  const openEditModal = async (apt: any) => {
    setEditingAppointment(apt);
    setValue('doctorName', apt.title || '');
    setValue('specialty', apt.specialty || '');
    setValue('location', apt.location || '');
    const d = apt.dateTime ? new Date(apt.dateTime) : undefined;
    setValue('date', d);
    setSelectedDate(d);
    setValue('time', apt.dateTime ? new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    setValue('notes', apt.description || '');
    
    setModalVisible(true);
  };

  const onSubmit = async (data: AppointmentForm) => {
    try {
      const [h, m] = data.time.split(':').map((n) => parseInt(n, 10));
      const d = new Date(data.date);
      d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
      
      const appointmentData = {
        title: data.doctorName.trim(),
        specialty: data.specialty?.trim() || undefined,
        location: data.location.trim(),
        dateTime: d.toISOString(),
        description: data.notes?.trim() || undefined,
        patientProfileId: selectedPatientId
      };

      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, appointmentData);
      } else {
        await createAppointment(appointmentData);
      }
      
      reset();
      setSelectedDate(undefined);
      setModalVisible(false);
      setEditingAppointment(null);
      
      // Recargar la lista de citas para mostrar los cambios
      if (selectedPatientId) {
        await getAppointments(selectedPatientId);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar la cita');
    }
  };

  const onDelete = async (id: string) => {
    Alert.alert('Eliminar', '¿Eliminar esta cita?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteAppointment(id); } },
    ]);
  };

  if (!selectedPatientId) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="account-heart" size={64} color="#2563eb" />
        <Text style={styles.title}>Selecciona un paciente</Text>
        <Text style={styles.subtitle}>Debes seleccionar un paciente para ver sus citas.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subtitle}>Cargando citas…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.title}>Error</Text>
        <Text style={styles.subtitle}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <CaregiverPatientSwitcher />
      <SelectedPatientBanner onChange={() => {}} />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Citas</Text>
        <TouchableOpacity style={[styles.addBtnModern, !isOnline && { opacity: 0.5 }]} onPress={openCreateModal} activeOpacity={0.85} disabled={!isOnline}>
          <Ionicons name="add-circle" size={28} color="#ffffff" />
          <Text style={styles.addBtnTextModern}>Nueva</Text>
        </TouchableOpacity>
      </View>
      {!isOnline && (
        <View style={{ backgroundColor: '#fef9c3', borderColor: '#fde047', borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#92400e' }}>Modo sin conexión: visualización habilitada, edición deshabilitada.</Text>
        </View>
      )}

      {(!appointments || appointments.length === 0) ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay citas registradas.</Text>
        </View>
      ) : (
        appointments.map((a) => (
          <LinearGradient key={a.id} colors={["#d1fae5", "#f0fdfa"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={styles.cardHeaderModern}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="stethoscope" size={22} color="#34d399" style={{ marginRight: 10 }} />
                <Text style={styles.cardTitleModern}>{a.title || 'Sin título'}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={[styles.iconBtnModern, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && openEditModal(a)} disabled={!isOnline}>
                  <Ionicons name="create-outline" size={20} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtnModern, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && onDelete(a.id)} disabled={!isOnline}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Fecha:</Text><Text style={styles.cardValueModern}>{a.dateTime ? new Date(a.dateTime).toLocaleString() : '—'}</Text></View>
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Lugar:</Text><Text style={styles.cardValueModern}>{a.location || '—'}</Text></View>
            {(a as any).specialty && (
              <View style={styles.cardRowModern}>
                <Text style={styles.cardLabelModern}>Especialidad:</Text>
                <Text style={styles.cardValueModern}>
                  {MEDICAL_SPECIALTIES.find(s => s.value === (a as any).specialty)?.label || (a as any).specialty}
                </Text>
              </View>
            )}
            {a.description ? (
              <View style={styles.notesBoxModern}>
                <Text style={styles.notesTextModern}>{a.description}</Text>
              </View>
            ) : null}
          </LinearGradient>
        ))
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => { setModalVisible(false); setEditingAppointment(null); }}>
        <View style={styles.modalOverlayModern}>
          <View style={styles.modalContentModern}>
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
              <Text style={styles.headerTitle}>{editingAppointment ? 'Editar cita' : 'Agregar cita'}</Text>
              <Text style={styles.inputLabel}>Doctor *</Text>
              <Controller control={control} name="doctorName" render={({ field: { onChange, value } }) => (
                <TextInput style={styles.inputModern} value={value} onChangeText={onChange} placeholder="Nombre del doctor" />
              )} />
              {errors.doctorName && <Text style={{ color: '#ef4444' }}>{errors.doctorName.message}</Text>}
              <Text style={styles.inputLabel}>Especialidad</Text>
              <Controller control={control} name="specialty" render={({ field: { onChange, value } }) => (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={value || ''}
                    onValueChange={onChange}
                    mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                    dropdownIconColor={Platform.OS === 'android' ? COLORS.text.secondary : undefined}
                    style={[styles.picker, isTablet && styles.pickerTablet]}
                  >
                    {MEDICAL_SPECIALTIES.map((specialty) => (
                      <Picker.Item key={specialty.value} label={specialty.label} value={specialty.value} />
                    ))}
                  </Picker>
                </View>
              )} />
              <Text style={styles.inputLabel}>Ubicación *</Text>
              <Controller control={control} name="location" render={({ field: { onChange, value } }) => (
                <TextInput style={styles.inputModern} value={value} onChangeText={onChange} placeholder="Ubicación" />
              )} />
              {errors.location && <Text style={{ color: '#ef4444' }}>{errors.location.message}</Text>}
              <Text style={styles.inputLabel}>Fecha *</Text>
              <Controller control={control} name="date" render={({ field: { value } }) => (
                <TouchableOpacity style={styles.inputModern} onPress={() => setShowDatePicker(true)}>
                  <Text>{value ? value.toLocaleDateString() : 'Seleccionar fecha'}</Text>
                </TouchableOpacity>
              )} />
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => { setShowDatePicker(false); if (d) { setSelectedDate(d); setValue('date', d); } }}
                />
              )}
              {errors.date && <Text style={{ color: '#ef4444' }}>{errors.date.message as string}</Text>}
              <Text style={styles.inputLabel}>Hora *</Text>
              <Controller control={control} name="time" render={({ field: { value } }) => (
                <TouchableOpacity style={styles.inputModern} onPress={() => setShowTimePicker(true)}>
                  <Text>{value ? value : 'Seleccionar hora'}</Text>
                </TouchableOpacity>
              )} />
              {showTimePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => { setShowTimePicker(false); if (d) { const hh = d.getHours().toString().padStart(2, '0'); const mm = d.getMinutes().toString().padStart(2, '0'); setValue('time', `${hh}:${mm}`); } }}
                />
              )}
              <Text style={styles.inputLabel}>Notas</Text>
              <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
                <TextInput style={[styles.inputModern, { height: 64 }]} value={value || ''} onChangeText={onChange} placeholder="Notas" multiline />
              )} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 20 }}>
                <TouchableOpacity style={[styles.addBtnModern, { backgroundColor: '#2563eb' }]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
                  <Text style={styles.addBtnTextModern}>{editingAppointment ? 'Guardar cambios' : 'Guardar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtnModern, { backgroundColor: '#64748b', marginLeft: 8 }]} onPress={() => { setModalVisible(false); setEditingAppointment(null); }}>
                  <Text style={styles.addBtnTextModern}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  addBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnTextModern: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  cardModern: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cardHeaderModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleModern: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 18,
  },
  iconBtnModern: {
    marginHorizontal: 2,
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
  },
  cardRowModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 6,
  },
  cardLabelModern: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
    marginRight: 4,
  },
  cardValueModern: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: 'bold',
  },
  notesBoxModern: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  notesTextModern: {
    color: '#64748b',
    fontSize: 14,
  },
  modalOverlayModern: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentModern: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '95%',
    maxHeight: '90%',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  inputModern: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  inputLabel: {
    color: '#334155',
    fontWeight: '600',
    marginBottom: 6,
  },
  
  // Estilos para picker de especialidad
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
    marginBottom: 10,
  },
  picker: {
    color: '#1e293b',
    fontSize: 15,
  },
  pickerTablet: {
    fontSize: 16,
  },
});


