import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTreatments } from '../../store/useTreatments';
import { scheduleNotification, cancelNotification } from '../../lib/notifications';
import { useCurrentUser } from '../../store/useCurrentUser';
import { LinearGradient } from 'expo-linear-gradient';

const treatmentSchema = z.object({
  title: z.string().min(1, 'Obligatorio'),
  description: z.string().optional(),
  startDate: z.date({ required_error: 'Selecciona una fecha' }),
  endDate: z.date().optional(),
  progress: z.string().optional(),
});

type TreatmentForm = z.infer<typeof treatmentSchema>;

export default function TreatmentsScreen() {
  const { treatments, loading, error, getTreatments, createTreatment, updateTreatment, deleteTreatment } = useTreatments();
  const { profile } = useCurrentUser();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [showStartPicker, setShowStartPicker] = React.useState(false);
  const [showEndPicker, setShowEndPicker] = React.useState(false);
  const [editingTreatment, setEditingTreatment] = React.useState<any>(null);
  // Guardar los IDs de notificación en memoria temporal (idealmente en backend o AsyncStorage)
  const notificationIdsRef = React.useRef<{ [trtId: string]: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  // NUEVO: Estado para horas y frecuencia
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'daysOfWeek' | 'everyXHours'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]); // 0=Domingo
  const [everyXHours, setEveryXHours] = useState('8');

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

  const perfilIncompleto = !profile || !profile.name || !profile.age;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TreatmentForm>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: undefined,
      endDate: undefined,
      progress: '',
    },
  });

  useEffect(() => {
    getTreatments();
  }, []);

  const onStartChange = (event: any, date?: Date) => {
    setShowStartPicker(false);
    if (date) setValue('startDate', date);
  };
  const onEndChange = (event: any, date?: Date) => {
    setShowEndPicker(false);
    if (date) setValue('endDate', date);
  };

  const openEditModal = (treatment: any) => {
    setEditingTreatment(treatment);
    setModalVisible(true);
    setValue('title', treatment.title);
    setValue('description', treatment.description || '');
    setValue('startDate', treatment.startDate ? new Date(treatment.startDate) : undefined);
    setValue('endDate', treatment.endDate ? new Date(treatment.endDate) : undefined);
    setValue('progress', treatment.progress || '');
  };
  const openCreateModal = () => {
    setEditingTreatment(null);
    setModalVisible(true);
    reset();
  };
  const scheduleTreatmentNotification = async (trt: any) => {
    if (!trt.startDate) return;
    const date = new Date(trt.startDate);
    // Programar notificación diaria a la hora de startDate
    const id = await scheduleNotification({
      title: `Recuerda tu tratamiento: ${trt.title}`,
      body: trt.description || '',
      data: { trtId: trt.id },
      trigger: {
        hour: date.getHours(),
        minute: date.getMinutes(),
        repeats: true,
      },
    });
    notificationIdsRef.current[trt.id] = id;
  };
  const cancelTreatmentNotification = async (trtId: string) => {
    const notifId = notificationIdsRef.current[trtId];
    if (notifId) {
      await cancelNotification(notifId);
      delete notificationIdsRef.current[trtId];
    }
  };
  // Modifica onSubmit para programar notificaciones según la configuración
  const onSubmit = async (data: TreatmentForm) => {
    setFormError(null);
    try {
      let trtId = editingTreatment?.id;
      if (editingTreatment) {
        await updateTreatment(editingTreatment.id, {
          title: data.title,
          description: data.description,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          progress: data.progress,
        });
        trtId = editingTreatment.id;
        // Cancelar notificaciones anteriores
        await cancelTreatmentNotification(trtId);
      } else {
        await createTreatment({
          title: data.title,
          description: data.description,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          progress: data.progress,
        });
        // Espera a que getTreatments actualice la lista
        await new Promise(res => setTimeout(res, 500));
        // Busca el nuevo tratamiento
        const newTrt = treatments.find(t => t.title === data.title && t.startDate === data.startDate?.toISOString());
        trtId = newTrt?.id;
      }
      // Programar notificaciones según la configuración
      if (trtId) {
        if (frequencyType === 'daily') {
          for (const t of selectedTimes) {
            const now = new Date();
            let firstDate = new Date(now);
            firstDate.setHours(t.getHours(), t.getMinutes(), 0, 0);
            if (firstDate <= now) firstDate.setDate(firstDate.getDate() + 1);
            if ((firstDate - now) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
            const nowLog = new Date();
            console.log('[TRATAMIENTO] Hora actual:', nowLog.toISOString());
            console.log('[TRATAMIENTO] Programando notificación para:', firstDate.toISOString());
            await scheduleNotification({
              title: `Recuerda tu tratamiento: ${data.title}`,
              body: data.description || '',
              data: {
                kind: 'TREATMENT',
                refId: trtId,
                scheduledFor: firstDate.toISOString(),
                name: data.title,
                dosage: '',
                instructions: data.description,
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              trigger: { type: 'date', date: firstDate },
            });
            const id = await scheduleNotification({
              title: `Recuerda tu tratamiento: ${data.title}`,
              body: data.description || '',
              data: {
                kind: 'TREATMENT',
                refId: trtId,
                scheduledFor: t.toISOString(),
                name: data.title,
                dosage: '',
                instructions: data.description,
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              trigger: { hour: t.getHours(), minute: t.getMinutes(), repeats: true },
            });
            notificationIdsRef.current[`${trtId}_${t.getHours()}_${t.getMinutes()}`] = id;
          }
        } else if (frequencyType === 'daysOfWeek') {
          for (const t of selectedTimes) {
            for (const day of daysOfWeek) {
              const now = new Date();
              let firstDate = new Date(now);
              firstDate.setDate(now.getDate() + ((day + 7 - now.getDay()) % 7));
              firstDate.setHours(t.getHours(), t.getMinutes(), 0, 0);
              if (firstDate <= now) firstDate.setDate(firstDate.getDate() + 7);
              if ((firstDate - now) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
              console.log('Programando notificación TRATAMIENTO para:', firstDate.toISOString());
              await scheduleNotification({
                title: `Recuerda tu tratamiento: ${data.title}`,
                body: data.description || '',
                data: {
                  kind: 'TREATMENT',
                  refId: trtId,
                  scheduledFor: firstDate.toISOString(),
                  name: data.title,
                  dosage: '',
                  instructions: data.description,
                  time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                },
                trigger: { type: 'date', date: firstDate },
              });
              const id = await scheduleNotification({
                title: `Recuerda tu tratamiento: ${data.title}`,
                body: data.description || '',
                data: {
                  kind: 'TREATMENT',
                  refId: trtId,
                  scheduledFor: t.toISOString(),
                  name: data.title,
                  dosage: '',
                  instructions: data.description,
                  time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                },
                trigger: { weekday: day + 1, hour: t.getHours(), minute: t.getMinutes(), repeats: true },
              });
              notificationIdsRef.current[`${trtId}_${day}_${t.getHours()}_${t.getMinutes()}`] = id;
            }
          }
        } else if (frequencyType === 'everyXHours') {
          if (selectedTimes.length > 0) {
            const base = selectedTimes[0];
            const interval = parseInt(everyXHours) || 8;
            let firstDate = new Date();
            firstDate.setHours(base.getHours(), base.getMinutes(), 0, 0);
            if (firstDate <= new Date()) firstDate.setTime(firstDate.getTime() + interval * 60 * 60 * 1000);
            if ((firstDate - new Date()) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
            console.log('Programando notificación TRATAMIENTO para:', firstDate.toISOString());
            await scheduleNotification({
              title: `Recuerda tu tratamiento: ${data.title}`,
              body: data.description || '',
              data: {
                kind: 'TREATMENT',
                refId: trtId,
                scheduledFor: firstDate.toISOString(),
                name: data.title,
                dosage: '',
                instructions: data.description,
                time: base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              trigger: { type: 'date', date: firstDate },
            });
            const id = await scheduleNotification({
              title: `Recuerda tu tratamiento: ${data.title}`,
              body: data.description || '',
              data: {
                kind: 'TREATMENT',
                refId: trtId,
                scheduledFor: base.toISOString(),
                name: data.title,
                dosage: '',
                instructions: data.description,
                time: base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              trigger: { hour: base.getHours(), minute: base.getMinutes(), repeats: true, interval: interval * 60 },
            });
            notificationIdsRef.current[`${trtId}_every${interval}h`] = id;
          }
        }
      }
      reset();
      setModalVisible(false);
      setEditingTreatment(null);
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar');
    }
  };
  const onDelete = async (id: string) => {
    Alert.alert(
      'Eliminar tratamiento',
      '¿Seguro que deseas eliminar este tratamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
            await deleteTreatment(id);
            await cancelTreatmentNotification(id);
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <LinearGradient colors={["#f0fdf4", "#f1f5f9"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
      <View style={styles.cardHeaderModern}>
        <MaterialCommunityIcons name="clipboard-list" size={24} color="#4ade80" style={{ marginRight: 10 }} />
        <Text style={styles.cardTitleModern}>{item.title}</Text>
        <View style={styles.cardActionsModern}>
          <TouchableOpacity style={styles.iconBtnModern} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={20} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtnModern} onPress={() => onDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      {item.description ? <Text style={styles.cardInfoModern}>{item.description}</Text> : null}
      <Text style={styles.cardInfoModern}>Inicio: {item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}</Text>
      <Text style={styles.cardInfoModern}>Fin: {item.endDate ? new Date(item.endDate).toLocaleDateString() : '-'}</Text>
      {item.progress ? (
        <View style={styles.progressBoxModern}>
          <Text style={styles.progressTextModern}>Progreso: {item.progress}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Tratamientos</Text>
        <TouchableOpacity style={styles.addBtnModern} onPress={openCreateModal} disabled={perfilIncompleto} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={28} color="#4ade80" />
          <Text style={styles.addBtnTextModern}>Nuevo</Text>
        </TouchableOpacity>
      </View>
      {perfilIncompleto && (
        <Text style={{ color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>
          Completa tu perfil para poder agregar tratamientos.
        </Text>
      )}
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={treatments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay tratamientos registrados</Text>}
        />
      )}
      {/* Modal para crear/editar tratamiento */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setModalVisible(false); setEditingTreatment(null); }}
      >
        <View style={styles.modalOverlayModern}>
          <View style={styles.modalContentModern}>
            <Text style={styles.modalTitle}>{editingTreatment ? 'Editar Tratamiento' : 'Agregar Tratamiento'}</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Título *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Título del tratamiento"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.input, { height: 60 }]}
                    placeholder="Descripción"
                    value={value}
                    onChangeText={onChange}
                    multiline
                  />
                </View>
              )}
            />
            {/* Fecha inicio */}
            <Controller
              control={control}
              name="startDate"
              render={({ field: { value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Fecha de inicio *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowStartPicker(true)}
                  >
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
                  {errors.startDate && <Text style={styles.errorText}>{errors.startDate.message as string}</Text>}
                </View>
              )}
            />
            {/* Fecha fin */}
            <Controller
              control={control}
              name="endDate"
              render={({ field: { value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Fecha de fin</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowEndPicker(true)}
                  >
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
            {/* Progreso */}
            <Controller
              control={control}
              name="progress"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Progreso</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Progreso"
                    value={value}
                    onChangeText={onChange}
                  />
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
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Horas de recordatorio</Text>
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
            <View style={styles.modalActions}>
              {formError && <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 8 }}>{formError}</Text>}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#2563eb' }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || loading}
              >
                <Text style={styles.buttonText}>{editingTreatment ? 'Guardar cambios' : 'Guardar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#64748b' }]}
                onPress={() => { setModalVisible(false); setEditingTreatment(null); reset(); }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
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
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconBtn: {
    marginHorizontal: 2,
    padding: 4,
  },
  cardInfo: {
    color: '#64748b',
    fontSize: 13,
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
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Nuevos estilos modernos
  addBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  addBtnTextModern: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  cardModern: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#4ade80',
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
    color: '#22c55e',
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
  progressBoxModern: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  progressTextModern: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
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
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
});
