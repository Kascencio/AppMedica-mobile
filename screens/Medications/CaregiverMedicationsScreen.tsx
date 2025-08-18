import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Platform, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMedications } from '../../store/useMedications';
import { scheduleNotification, cancelNotification } from '../../lib/notifications';
import { useCurrentUser } from '../../store/useCurrentUser';
import { LinearGradient } from 'expo-linear-gradient';

export default function CaregiverMedicationsScreen({ navigation }: any) {
  const { medications, loading, error, getMedications, createMedication, updateMedication, deleteMedication } = useMedications();
  const { profile } = useCurrentUser();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingMed, setEditingMed] = React.useState<any>(null);
  const [showStartPicker, setShowStartPicker] = React.useState(false);
  const [showEndPicker, setShowEndPicker] = React.useState(false);
  // Guardar los IDs de notificación en memoria temporal (idealmente en backend o AsyncStorage)
  const notificationIdsRef = React.useRef<{ [medId: string]: string }>({});

  // NUEVO: Estado para horas y frecuencia
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'daysOfWeek' | 'everyXHours'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]); // 0=Domingo
  const [everyXHours, setEveryXHours] = useState('8');

  const perfilIncompleto = !profile || !profile.name || !profile.age;

  const medicationSchema = z.object({
    name: z.string().min(1, 'Obligatorio'),
    dosage: z.string().min(1, 'Obligatorio'),
    type: z.string().optional(),
    frequency: z.string().optional(),
    startDate: z.date({ required_error: 'Selecciona una fecha' }),
    endDate: z.date().optional(),
    notes: z.string().optional(),
  });
  type MedicationForm = z.infer<typeof medicationSchema>;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MedicationForm>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: '',
      dosage: '',
      type: '',
      frequency: '',
      startDate: undefined,
      endDate: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    getMedications();
  }, []);

  const onStartChange = (event: any, date?: Date) => {
    setShowStartPicker(false);
    if (date) setValue('startDate', date);
  };
  const onEndChange = (event: any, date?: Date) => {
    setShowEndPicker(false);
    if (date) setValue('endDate', date);
  };

  // NUEVO: Función para agregar hora
  const addTime = (date: Date) => {
    setSelectedTimes((prev) => [...prev, date]);
    setShowTimePicker(false);
  };
  const removeTime = (idx: number) => {
    setSelectedTimes((prev) => prev.filter((_, i) => i !== idx));
  };
  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const openEditModal = (med: any) => {
    setEditingMed(med);
    setModalVisible(true);
    setValue('name', med.name);
    setValue('dosage', med.dosage);
    setValue('type', med.type || '');
    setValue('frequency', med.frequency || '');
    setValue('startDate', med.startDate ? new Date(med.startDate) : undefined);
    setValue('endDate', med.endDate ? new Date(med.endDate) : undefined);
    setValue('notes', med.notes || '');
    // Restaurar la configuración de recordatorio al editar
    setSelectedTimes(med.times || []);
    setFrequencyType(med.frequencyType || 'daily');
    setDaysOfWeek(med.daysOfWeek || []);
    setEveryXHours(med.everyXHours || '8');
  };
  const openCreateModal = () => {
    setEditingMed(null);
    setModalVisible(true);
    reset();
    // Resetear la configuración de recordatorio al crear
    setSelectedTimes([]);
    setFrequencyType('daily');
    setDaysOfWeek([]);
    setEveryXHours('8');
  };
  const scheduleMedNotification = async (med: any) => {
    if (!med.startDate) return;
    const date = new Date(med.startDate);
    // Programar notificación diaria a la hora de startDate
    const id = await scheduleNotification({
      title: `Toma tu medicamento: ${med.name}`,
      body: `Dosis: ${med.dosage}`,
      data: { medId: med.id },
      trigger: {
        hour: date.getHours(),
        minute: date.getMinutes(),
        repeats: true,
      },
    });
    notificationIdsRef.current[med.id] = id;
  };
  const cancelMedNotification = async (medId: string) => {
    const notifId = notificationIdsRef.current[medId];
    if (notifId) {
      await cancelNotification(notifId);
      delete notificationIdsRef.current[medId];
    }
  };
  // Modifica onSubmit para programar notificaciones según la configuración
  const onSubmit = async (data: MedicationForm) => {
    try {
      let medId = editingMed?.id;
      if (editingMed) {
        await updateMedication(editingMed.id, {
          name: data.name,
          dosage: data.dosage,
          type: data.type,
          frequency: data.frequency,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          notes: data.notes,
          // Opcional: puedes guardar la config de recordatorio en el backend si lo soporta
        });
        medId = editingMed.id;
        // Cancelar notificaciones anteriores
        await cancelMedNotification(medId);
      } else {
        await createMedication({
          name: data.name,
          dosage: data.dosage,
          type: data.type,
          frequency: data.frequency,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          notes: data.notes,
          // Opcional: puedes guardar la config de recordatorio en el backend si lo soporta
        });
        // Espera a que getMedications actualice la lista
        await new Promise(res => setTimeout(res, 500));
        // Busca el nuevo medicamento
        const newMed = medications.find(m => m.name === data.name && m.startDate === data.startDate?.toISOString());
        medId = newMed?.id;
      }
      // Programar notificaciones según la configuración
      if (medId) {
        if (frequencyType === 'daily') {
          for (const t of selectedTimes) {
            const now = new Date();
            let firstDate = new Date(now);
            firstDate.setHours(t.getHours(), t.getMinutes(), 0, 0);
            if (firstDate <= now) firstDate.setDate(firstDate.getDate() + 1);
            // Margen de seguridad de 1 minuto
            if ((firstDate - now) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
            const nowLog = new Date();
            console.log('[MEDICAMENTO] Hora actual:', nowLog.toISOString());
            console.log('[MEDICAMENTO] Programando notificación para:', firstDate.toISOString());
            await scheduleNotification({
              title: `Toma tu medicamento: ${data.name}`,
              body: `Dosis: ${data.dosage}`,
              data: {
                kind: 'MEDICATION',
                refId: medId,
                scheduledFor: firstDate.toISOString(),
                name: data.name,
                dosage: data.dosage,
                instructions: data.notes,
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              trigger: { type: 'date', date: firstDate },
            });
            const id = await scheduleNotification({
              title: `Toma tu medicamento: ${data.name}`,
              body: `Dosis: ${data.dosage}`,
              data: {
                kind: 'MEDICATION',
                refId: medId,
                scheduledFor: t.toISOString(),
                name: data.name,
                dosage: data.dosage,
                instructions: data.notes,
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              trigger: { hour: t.getHours(), minute: t.getMinutes(), repeats: true },
            });
            notificationIdsRef.current[`${medId}_${t.getHours()}_${t.getMinutes()}`] = id;
          }
        } else if (frequencyType === 'daysOfWeek') {
          for (const t of selectedTimes) {
            for (const day of daysOfWeek) {
              const now = new Date();
              let firstDate = new Date(now);
              firstDate.setDate(now.getDate() + ((day + 7 - now.getDay()) % 7));
              firstDate.setHours(t.getHours(), t.getMinutes(), 0, 0);
              if (firstDate <= now) firstDate.setDate(firstDate.getDate() + 7);
              // Margen de seguridad de 1 minuto
              if ((firstDate - now) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
              console.log('Programando notificación MEDICAMENTO para:', firstDate.toISOString());
              await scheduleNotification({
                title: `Toma tu medicamento: ${data.name}`,
                body: `Dosis: ${data.dosage}`,
                data: {
                  kind: 'MEDICATION',
                  refId: medId,
                  scheduledFor: firstDate.toISOString(),
                  name: data.name,
                  dosage: data.dosage,
                  instructions: data.notes,
                  time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                },
                trigger: { type: 'date', date: firstDate },
              });
              const id = await scheduleNotification({
                title: `Toma tu medicamento: ${data.name}`,
                body: `Dosis: ${data.dosage}`,
                data: {
                  kind: 'MEDICATION',
                  refId: medId,
                  scheduledFor: t.toISOString(),
                  name: data.name,
                  dosage: data.dosage,
                  instructions: data.notes,
                  time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                },
                trigger: { weekday: day + 1, hour: t.getHours(), minute: t.getMinutes(), repeats: true },
              });
              notificationIdsRef.current[`${medId}_${day}_${t.getHours()}_${t.getMinutes()}`] = id;
            }
          }
        } else if (frequencyType === 'everyXHours') {
          if (selectedTimes.length > 0) {
            const base = selectedTimes[0];
            const interval = parseInt(everyXHours) || 8;
            let firstDate = new Date();
            firstDate.setHours(base.getHours(), base.getMinutes(), 0, 0);
            if (firstDate <= new Date()) firstDate.setTime(firstDate.getTime() + interval * 60 * 60 * 1000);
            // Margen de seguridad de 1 minuto
            if ((firstDate - new Date()) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
            console.log('Programando notificación MEDICAMENTO para:', firstDate.toISOString());
            await scheduleNotification({
              title: `Toma tu medicamento: ${data.name}`,
              body: `Dosis: ${data.dosage}`,
              data: {
                kind: 'MEDICATION',
                refId: medId,
                scheduledFor: firstDate.toISOString(),
                name: data.name,
                dosage: data.dosage,
                instructions: data.notes,
                time: base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              trigger: { type: 'date', date: firstDate },
            });
            const id = await scheduleNotification({
              title: `Toma tu medicamento: ${data.name}`,
              body: `Dosis: ${data.dosage}`,
              data: {
                kind: 'MEDICATION',
                refId: medId,
                scheduledFor: base.toISOString(),
                name: data.name,
                dosage: data.dosage,
                instructions: data.notes,
                time: base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              trigger: { hour: base.getHours(), minute: base.getMinutes(), repeats: true, interval: interval * 60 },
            });
            notificationIdsRef.current[`${medId}_every${interval}h`] = id;
          }
        }
      }
      reset();
      setModalVisible(false);
      setEditingMed(null);
    } catch (e) {}
  };

  // Modifica onDelete para cancelar notificaciones
  const onDelete = async (id: string) => {
    Alert.alert(
      'Eliminar medicamento',
      '¿Seguro que deseas eliminar este medicamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
            await deleteMedication(id);
            await cancelMedNotification(id);
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subtitle}>Cargando medicamentos…</Text>
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
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Medicamentos</Text>
        <TouchableOpacity style={styles.addBtnModern} onPress={openCreateModal} disabled={perfilIncompleto} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={28} color="#38bdf8" />
          <Text style={styles.addBtnTextModern}>Nuevo</Text>
        </TouchableOpacity>
      </View>
      {perfilIncompleto && (
        <Text style={{ color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>
          Completa tu perfil para poder agregar medicamentos.
        </Text>
      )}
      {(!medications || medications.length === 0) ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay medicamentos registrados.</Text>
        </View>
      ) : (
        medications.map((med) => (
          <LinearGradient key={med.id} colors={["#e0f2fe", "#f0fdfa"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={styles.cardHeaderModern}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="medkit" size={24} color="#38bdf8" style={{ marginRight: 10 }} />
                <Text style={styles.cardTitleModern}>{med.name}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={styles.iconBtnModern} onPress={() => openEditModal(med)}>
                  <Ionicons name="create-outline" size={20} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtnModern} onPress={() => onDelete(med.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Dosis:</Text><Text style={styles.cardValueModern}>{med.dosage}</Text></View>
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Tipo:</Text><Text style={styles.cardValueModern}>{med.type}</Text></View>
            <View style={[styles.cardRowModern, { alignItems: 'center', marginTop: 6 }] }>
              <Ionicons name="time" size={16} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.cardLabelModern}>Inicio:</Text>
              <Text style={styles.cardValueModern}>{med.startDate ? new Date(med.startDate).toLocaleString() : '—'}</Text>
            </View>
            {med.notes ? (
              <View style={styles.notesBoxModern}>
                <Text style={styles.notesTextModern}>{med.notes}</Text>
              </View>
            ) : null}
          </LinearGradient>
        ))
      )}
      {/* Modal para crear/editar medicamento */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setModalVisible(false); setEditingMed(null); }}
      >
        <View style={styles.modalOverlayModern}>
          <View style={styles.modalContentModern}>
            <Text style={styles.headerTitle}>{editingMed ? 'Editar Medicamento' : 'Agregar Medicamento'}</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text>Nombre *</Text>
                  <TextInput
                    style={styles.inputModern}
                    placeholder="Nombre del medicamento"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.name && <Text style={{ color: 'red' }}>{errors.name.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="dosage"
              render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text>Dosis *</Text>
                  <TextInput
                    style={styles.inputModern}
                    placeholder="Dosis"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.dosage && <Text style={{ color: 'red' }}>{errors.dosage.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text>Tipo</Text>
                  <TextInput
                    style={styles.inputModern}
                    placeholder="Tipo (tableta, jarabe, etc.)"
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
            <Controller
              control={control}
              name="frequency"
              render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text>Frecuencia</Text>
                  <TextInput
                    style={styles.inputModern}
                    placeholder="Frecuencia (ej: 1 vez al día)"
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
            <Controller
              control={control}
              name="startDate"
              render={({ field: { value } }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text>Fecha de inicio *</Text>
                  <TouchableOpacity style={styles.inputModern} onPress={() => setShowStartPicker(true)}>
                    <Text>{value ? value.toLocaleDateString() : 'Seleccionar fecha'}</Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={value || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onStartChange}
                    />
                  )}
                  {errors.startDate && <Text style={{ color: 'red' }}>{errors.startDate.message as string}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="endDate"
              render={({ field: { value } }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text>Fecha de fin</Text>
                  <TouchableOpacity style={styles.inputModern} onPress={() => setShowEndPicker(true)}>
                    <Text>{value ? value.toLocaleDateString() : 'Seleccionar fecha'}</Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={value || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onEndChange}
                    />
                  )}
                </View>
              )}
            />
            {/* Frecuencia */}
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Frecuencia de recordatorio</Text>
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                <TouchableOpacity onPress={() => setFrequencyType('daily')} style={{ marginRight: 12 }}>
                  <Text style={{ color: frequencyType === 'daily' ? '#2563eb' : '#64748b', fontWeight: frequencyType === 'daily' ? 'bold' : 'normal' }}>Todos los días</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFrequencyType('daysOfWeek')} style={{ marginRight: 12 }}>
                  <Text style={{ color: frequencyType === 'daysOfWeek' ? '#2563eb' : '#64748b', fontWeight: frequencyType === 'daysOfWeek' ? 'bold' : 'normal' }}>Días específicos</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFrequencyType('everyXHours')}>
                  <Text style={{ color: frequencyType === 'everyXHours' ? '#2563eb' : '#64748b', fontWeight: frequencyType === 'everyXHours' ? 'bold' : 'normal' }}>Cada X horas</Text>
                </TouchableOpacity>
              </View>
              {frequencyType === 'daysOfWeek' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                  {["D","L","M","M","J","V","S"].map((d, i) => (
                    <TouchableOpacity key={i} onPress={() => toggleDay(i)} style={{ backgroundColor: daysOfWeek.includes(i) ? '#2563eb' : '#e5e7eb', borderRadius: 6, padding: 6, marginRight: 4, marginBottom: 4 }}>
                      <Text style={{ color: daysOfWeek.includes(i) ? '#fff' : '#334155', fontWeight: 'bold' }}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {frequencyType === 'everyXHours' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text>Cada </Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, width: 40, marginHorizontal: 4, textAlign: 'center', backgroundColor: '#fff' }}
                    value={everyXHours}
                    onChangeText={setEveryXHours}
                    keyboardType="numeric"
                  />
                  <Text> horas</Text>
                </View>
              )}
            </View>
            {/* Horas */}
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Horas de toma</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                {selectedTimes.map((t, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 4 }}>
                    <Text style={{ color: '#3730a3', fontWeight: 'bold', marginRight: 4 }}>{t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    <TouchableOpacity onPress={() => removeTime(idx)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={{ backgroundColor: '#2563eb', borderRadius: 6, padding: 8 }}>
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              {showTimePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => { if (date) addTime(date); else setShowTimePicker(false); }}
                />
              )}
            </View>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text>Notas</Text>
                  <TextInput
                    style={[styles.inputModern, { height: 60 }]}
                    placeholder="Notas adicionales"
                    value={value}
                    onChangeText={onChange}
                    multiline
                  />
                </View>
              )}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.addBtnModern, { backgroundColor: '#2563eb' }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || loading}
              >
                <Text style={styles.addBtnTextModern}>{editingMed ? 'Guardar cambios' : 'Guardar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtnModern, { backgroundColor: '#64748b', marginLeft: 8 }]}
                onPress={() => { setModalVisible(false); setEditingMed(null); reset(); }}
              >
                <Text style={styles.addBtnTextModern}>Cancelar</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 24,
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
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 16,
  },
  badge: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  cardValue: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notesBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  notesText: {
    color: '#64748b',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  // Nuevos estilos modernos
  addBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  addBtnTextModern: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
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
    elevation: 6,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  inputModern: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
});
