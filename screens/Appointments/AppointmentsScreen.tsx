import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator, Platform, Alert, Dimensions, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppointments } from '../../store/useAppointments';
import { useCurrentUser } from '../../store/useCurrentUser';
import { useState } from 'react';
import { scheduleNotification, cancelNotification, cancelAppointmentNotifications } from '../../lib/notifications';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useCaregiver } from '../../store/useCaregiver';
import OfflineIndicator from '../../components/OfflineIndicator';
import AlarmScheduler from '../../components/AlarmScheduler';
import COLORS from '../../constants/colors';
import { GLOBAL_STYLES, MEDICAL_STYLES } from '../../constants/styles';

const appointmentSchema = z.object({
  doctorName: z.string().min(1, 'Obligatorio'),
  specialty: z.string().optional(),
  location: z.string().min(1, 'Obligatorio'),
  date: z.date().refine((date) => date !== undefined, {
    message: 'Selecciona una fecha'
  }),
  time: z.string().min(1, 'Obligatorio'),
  notes: z.string().optional(),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

export default function AppointmentsScreen() {
  const { appointments, loading, error, getAppointments, createAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { profile } = useCurrentUser();
  const { selectedPatientId, patients } = useCaregiver();
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;
  
  // Sistema responsive
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const isTablet = dimensions.width > 768;
  const isLandscape = dimensions.width > dimensions.height;
  const [modalVisible, setModalVisible] = React.useState(false);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [editingAppointment, setEditingAppointment] = React.useState<any>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // NUEVO: Estado para horas y frecuencia
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'daysOfWeek' | 'everyXHours'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]); // 0=Domingo
  const [everyXHours, setEveryXHours] = useState('8');
  const notificationIdsRef = React.useRef<{ [apptId: string]: string }>({});

  const perfilIncompleto = !profile?.patientProfileId && !profile?.id;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      doctorName: '',
      specialty: '',
      location: '',
      date: undefined,
      time: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (profile?.patientProfileId) {
      console.log('[CITAS] Cargando citas para perfil:', profile.patientProfileId);
      getAppointments().catch((e) => {
        console.log('[CITAS] Error:', e.message || e);
      });
    } else {
      console.log('[CITAS] No hay patientProfileId disponible:', profile);
    }
  }, [profile?.patientProfileId]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Handlers para fecha y hora
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setValue('date', date);
      setSelectedDate(date);
    }
  };
  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      const hh = time.getHours().toString().padStart(2, '0');
      const mm = time.getMinutes().toString().padStart(2, '0');
      setValue('time', `${hh}:${mm}`);
    }
  };

  // NUEVO: Función para agregar hora
  const addTime = (date: Date) => {
    setSelectedTimes((prev) => [...prev, date]);
    setShowCustomTimePicker(false);
  };
  const removeTime = (idx: number) => {
    setSelectedTimes((prev) => prev.filter((_, i) => i !== idx));
  };
  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const openEditModal = (appt: any) => {
    setEditingAppointment(appt);
    setModalVisible(true);
    setValue('doctorName', appt.title);
    setValue('specialty', appt.specialty || '');
    setValue('location', appt.location);
    if (appt.dateTime) {
      setValue('date', new Date(appt.dateTime));
    }
    setValue('time', appt.dateTime ? new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    setValue('notes', appt.description || '');
  };
  const openCreateModal = () => {
    setEditingAppointment(null);
    setModalVisible(true);
    reset();
  };
  // Modifica onSubmit para programar notificaciones según la configuración
  const onSubmit = async (data: AppointmentForm) => {
    setFormError(null);
    try {
      let apptId = editingAppointment?.id;
      const [h, m] = data.time.split(':').map(Number);
      const date = new Date(data.date);
      date.setHours(h, m, 0, 0);
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, {
          title: data.doctorName,
          dateTime: date.toISOString(),
          location: data.location,
          description: data.notes,
        });
        apptId = editingAppointment.id;
        // Cancelar notificaciones anteriores usando el ID de la cita
        await cancelAppointmentNotifications(apptId);
      } else {
        await createAppointment({
          title: data.doctorName,
          dateTime: date.toISOString(),
          location: data.location,
          description: data.notes,
        });
        // Espera a que getAppointments actualice la lista
        await new Promise(res => setTimeout(res, 500));
        // Busca la nueva cita
        const newAppt = appointments.find(a => a.title === data.doctorName && a.dateTime === date.toISOString());
        apptId = newAppt?.id;
      }
      // Programar notificaciones según la configuración
      if (apptId) {
        if (frequencyType === 'daily') {
          for (const t of selectedTimes) {
            const now = new Date();
            let firstDate = new Date(now);
            firstDate.setHours(t.getHours(), t.getMinutes(), 0, 0);
            if (firstDate <= now) firstDate.setDate(firstDate.getDate() + 1);
            if ((firstDate.getTime() - now.getTime()) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
            const nowLog = new Date();
            console.log('[CITA] Hora actual:', nowLog.toISOString());
            console.log('[CITA] Programando notificación para:', firstDate.toISOString());
            await scheduleNotification({
              title: `Recordatorio de cita: ${data.doctorName}`,
              body: `Ubicación: ${data.location}`,
              data: {
                kind: 'APPOINTMENT',
                refId: apptId,
                scheduledFor: firstDate.toISOString(),
                name: data.doctorName,
                dosage: '',
                instructions: data.notes,
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                patientProfileId: profile?.patientProfileId || profile?.id,
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: firstDate },
            });
            const id = await scheduleNotification({
              title: `Recordatorio de cita: ${data.doctorName}`,
              body: `Ubicación: ${data.location}`,
              data: {
                kind: 'APPOINTMENT',
                refId: apptId,
                scheduledFor: t.toISOString(),
                name: data.doctorName,
                dosage: '',
                instructions: data.notes,
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                patientProfileId: profile?.patientProfileId || profile?.id,
              },
              trigger: { 
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: t.getHours(), 
                minute: t.getMinutes() 
              },
            });
            // Guardar tanto la notificación inicial como la repetitiva
            const firstNotificationId = `appt_${apptId}_first_${t.getHours()}_${t.getMinutes()}`;
            notificationIdsRef.current[firstNotificationId] = id;
            notificationIdsRef.current[`${apptId}_${t.getHours()}_${t.getMinutes()}`] = id;
          }
        } else if (frequencyType === 'daysOfWeek') {
          for (const t of selectedTimes) {
            for (const day of daysOfWeek) {
              const now = new Date();
              let firstDate = new Date(now);
              firstDate.setDate(now.getDate() + ((day + 7 - now.getDay()) % 7));
              firstDate.setHours(t.getHours(), t.getMinutes(), 0, 0);
              if (firstDate <= now) firstDate.setDate(firstDate.getDate() + 7);
              if ((firstDate.getTime() - now.getTime()) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
              console.log('Programando notificación CITA para:', firstDate.toISOString());
              await scheduleNotification({
                title: `Recordatorio de cita: ${data.doctorName}`,
                body: `Ubicación: ${data.location}`,
              data: {
                kind: 'APPOINTMENT',
                refId: apptId,
                scheduledFor: firstDate.toISOString(),
                name: data.doctorName,
                dosage: '',
                instructions: data.notes,
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                patientProfileId: profile?.patientProfileId || profile?.id,
              },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: firstDate },
              });
              const id = await scheduleNotification({
                title: `Recordatorio de cita: ${data.doctorName}`,
                body: `Ubicación: ${data.location}`,
              data: {
                kind: 'APPOINTMENT',
                refId: apptId,
                scheduledFor: t.toISOString(),
                name: data.doctorName,
                dosage: '',
                instructions: data.notes,
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                patientProfileId: profile?.patientProfileId || profile?.id,
              },
                trigger: { 
                  type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                  weekday: day + 1, 
                  hour: t.getHours(), 
                  minute: t.getMinutes() 
                },
              });
              // Guardar tanto la notificación inicial como la repetitiva
              const firstNotificationId = `appt_${apptId}_first_${day}_${t.getHours()}_${t.getMinutes()}`;
              notificationIdsRef.current[firstNotificationId] = id;
              notificationIdsRef.current[`${apptId}_${day}_${t.getHours()}_${t.getMinutes()}`] = id;
            }
          }
        } else if (frequencyType === 'everyXHours') {
          if (selectedTimes.length > 0) {
            const base = selectedTimes[0];
            const interval = parseInt(everyXHours) || 8;
            let firstDate = new Date();
            firstDate.setHours(base.getHours(), base.getMinutes(), 0, 0);
            if (firstDate <= new Date()) firstDate.setTime(firstDate.getTime() + interval * 60 * 60 * 1000);
            if ((firstDate.getTime() - new Date().getTime()) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
            console.log('Programando notificación CITA para:', firstDate.toISOString());
            await scheduleNotification({
              title: `Recordatorio de cita: ${data.doctorName}`,
              body: `Ubicación: ${data.location}`,
              data: {
                kind: 'APPOINTMENT',
                refId: apptId,
                scheduledFor: firstDate.toISOString(),
                name: data.doctorName,
                dosage: '',
                instructions: data.notes,
                time: base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                patientProfileId: profile?.patientProfileId || profile?.id,
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: firstDate },
            });
            const id = await scheduleNotification({
              title: `Recordatorio de cita: ${data.doctorName}`,
              body: `Ubicación: ${data.location}`,
              data: {
                kind: 'APPOINTMENT',
                refId: apptId,
                scheduledFor: base.toISOString(),
                name: data.doctorName,
                dosage: '',
                instructions: data.notes,
                time: base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                patientProfileId: profile?.patientProfileId || profile?.id,
              },
              trigger: { 
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: interval * 60 * 60,
                repeats: true
              },
            });
            notificationIdsRef.current[`${apptId}_every${interval}h`] = id;
          }
        }
      }
      reset();
      setModalVisible(false);
      setEditingAppointment(null);
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar');
    }
  };
  const onDelete = async (id: string) => {
    Alert.alert(
      'Eliminar cita',
      '¿Seguro que deseas eliminar esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
            await deleteAppointment(id);
            // Cancelar todas las notificaciones de esta cita
            await cancelAppointmentNotifications(id);
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={MEDICAL_STYLES.appointmentCard}>
      <View style={GLOBAL_STYLES.rowSpaced}>
        <View style={GLOBAL_STYLES.row}>
          <MaterialIcons name="event" size={15} color={COLORS.medical.appointment} style={GLOBAL_STYLES.icon} />
          <Text style={[GLOBAL_STYLES.sectionTitle, { marginBottom: 0 }]}>{item.title}</Text>
        </View>
        <View style={GLOBAL_STYLES.row}>
          <TouchableOpacity 
            style={MEDICAL_STYLES.actionButton} 
            onPress={() => openEditModal(item)}
            accessibilityRole="button"
            accessibilityLabel={`Editar cita con ${item.title}`}
          >
            <MaterialIcons name="edit" size={20} color={COLORS.text.inverse} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[MEDICAL_STYLES.actionButton, { backgroundColor: COLORS.error }]} 
            onPress={() => onDelete(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar cita con ${item.title}`}
          >
            <MaterialIcons name="delete" size={20} color={COLORS.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[GLOBAL_STYLES.row, { marginTop: 8 }]}>
        <MaterialIcons name="location-on" size={16} color={COLORS.text.secondary} style={GLOBAL_STYLES.icon} />
        <Text style={GLOBAL_STYLES.bodyText}>{item.location}</Text>
      </View>
      <View style={GLOBAL_STYLES.row}>
        <MaterialIcons name="schedule" size={16} color={COLORS.text.secondary} style={GLOBAL_STYLES.icon} />
        <Text style={GLOBAL_STYLES.bodyText}>
          {item.dateTime ? new Date(item.dateTime).toLocaleString() : '-'}
        </Text>
      </View>
      {item.description && (
        <View style={[GLOBAL_STYLES.card, { marginTop: 12, marginBottom: 0, padding: 12 }]}>
          <Text style={GLOBAL_STYLES.caption}>{item.description}</Text>
        </View>
      )}
    </View>
  );

  if (perfilIncompleto) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="favorite" size={64} color="#2563eb" />
        <Text style={styles.title}>Completa tu perfil</Text>
        <Text style={styles.subtitle}>Por favor, completa tu perfil para poder agregar citas.</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error" size={64} color="#ef4444" />
        <Text style={styles.title}>Error</Text>
        <Text style={styles.subtitle}>{error}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradients.primary as [string, string, string]} style={{ flex: 1 }}>
      <View style={GLOBAL_STYLES.screenContainer}>
        <OfflineIndicator />
        <View style={GLOBAL_STYLES.rowSpaced}>
          <Text style={GLOBAL_STYLES.sectionHeader}>Mis Citas</Text>
          <TouchableOpacity 
            style={[
              GLOBAL_STYLES.buttonPrimary, 
              perfilIncompleto && { opacity: 0.6 },
              { marginTop: 10 }
            ]} 
            onPress={openCreateModal} 
            disabled={perfilIncompleto} 
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Agregar nueva cita"
            accessibilityHint={perfilIncompleto ? "Completa tu perfil primero" : "Abre el formulario para agregar una cita"}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.text.inverse} />
            <Text style={GLOBAL_STYLES.buttonText}>Nueva cita</Text>
          </TouchableOpacity>
        </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay citas programadas</Text>}
        />
      )}
      {/* Modal para crear/editar cita */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setModalVisible(false); setEditingAppointment(null); }}
      >
        <View style={styles.modalOverlayModern}>
          <View style={[
            styles.modalContentModern,
            isTablet && styles.modalContentTablet,
            isLandscape && styles.modalContentLandscape
          ]}>
            <ScrollView 
              showsVerticalScrollIndicator={true}
              indicatorStyle="black"
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <Text style={[
                styles.modalTitle,
                isTablet && styles.modalTitleTablet,
                isLandscape && styles.modalTitleLandscape
              ]}>{editingAppointment ? 'Editar Cita Médica' : 'Agregar Cita Médica'}</Text>
            <Controller
              control={control}
              name="doctorName"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Doctor *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre del doctor"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.doctorName && <Text style={styles.errorText}>{errors.doctorName.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="specialty"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Especialidad</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Especialidad"
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ubicación *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ubicación"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.location && <Text style={styles.errorText}>{errors.location.message}</Text>}
                </View>
              )}
            />
            {/* Fecha */}
            <Controller
              control={control}
              name="date"
              render={({ field: { value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Fecha *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text>{value ? value.toLocaleDateString() : 'Seleccionar fecha'}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={value || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                    />
                  )}
                  {errors.date && <Text style={styles.errorText}>{errors.date.message as string}</Text>}
                </View>
              )}
            />
            {/* Hora */}
            <Controller
              control={control}
              name="time"
              render={({ field: { value, onChange } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hora *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text>{value ? value : 'Seleccionar hora'}</Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={selectedDate || new Date()}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onTimeChange}
                    />
                  )}
                  {errors.time && <Text style={styles.errorText}>{errors.time.message as string}</Text>}
                </View>
              )}
            />
            {/* Configuración de alarmas mejorada */}
            <AlarmScheduler
              selectedTimes={selectedTimes}
              setSelectedTimes={setSelectedTimes}
              frequencyType={frequencyType}
              setFrequencyType={setFrequencyType}
              daysOfWeek={daysOfWeek}
              setDaysOfWeek={setDaysOfWeek}
              everyXHours={everyXHours}
              setEveryXHours={setEveryXHours}
              title="Recordatorios de Cita"
              subtitle="Configura cuándo quieres recibir recordatorios para tu cita médica"
            />
            {/* Notas */}
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notas</Text>
                  <TextInput
                    style={[styles.input, { height: 60 }]}
                    placeholder="Notas adicionales"
                    value={value}
                    onChangeText={onChange}
                    multiline
                  />
                </View>
              )}
            />
            </ScrollView>
            {/* Botones de acción fuera del scroll para que siempre sean visibles */}
            <View style={[
              styles.modalActions,
              isTablet && styles.modalActionsTablet,
              isLandscape && styles.modalActionsLandscape
            ]}>
              {formError && <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 8 }}>{formError}</Text>}
              <TouchableOpacity
                style={[
                  styles.button, 
                  { backgroundColor: '#10b981' },
                  isTablet && styles.buttonTablet,
                  isLandscape && styles.buttonLandscape
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || loading}
              >
                <Text style={[
                  styles.buttonText,
                  isTablet && styles.buttonTextTablet
                ]}>{editingAppointment ? 'Guardar cambios' : 'Guardar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button, 
                  { backgroundColor: '#ef4444' },
                  isTablet && styles.buttonTablet,
                  isLandscape && styles.buttonLandscape
                ]}
                onPress={() => { setModalVisible(false); setEditingAppointment(null); reset(); }}
              >
                <Text style={[
                  styles.buttonText,
                  isTablet && styles.buttonTextTablet
                ]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
  },
  card: {
    flexDirection: 'column',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    marginTop: 40,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#22c55e',
    fontSize: 16,
    flex: 1,
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 13,
  },
  cardInfo: {
    color: '#64748b',
    fontSize: 13,
  },
  cardNotes: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  cardStatus: {
    color: '#2563eb',
    fontSize: 12,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconBtn: {
    marginHorizontal: 2,
    padding: 4,
  },
  progressBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  progressText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    width: '92%',
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 4,
    color: '#334155',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    fontSize: 15,
    color: '#1e293b',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalActionsTablet: {
    marginTop: 16,
    gap: 16,
  },
  modalActionsLandscape: {
    marginTop: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  buttonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonLandscape: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  buttonTextTablet: {
    fontSize: 17,
  },
  // Nuevos estilos modernos
  addBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  addBtnTextModern: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  cardModern: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
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
    color: '#059669',
    fontSize: 18,
    flex: 1,
  },
  cardActionsModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconBtnModern: {
    marginHorizontal: 2,
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
  },
  cardInfoModern: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 2,
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
    elevation: 6,
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  modalContentTablet: {
    width: '70%',
    maxWidth: 600,
    maxHeight: '85%',
    padding: 32,
  },
  modalContentLandscape: {
    width: '80%',
    maxHeight: '85%',
    padding: 20,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalTitleTablet: {
    fontSize: 24,
    marginBottom: 20,
  },
  modalTitleLandscape: {
    fontSize: 22,
    marginBottom: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 5,
  },
});
