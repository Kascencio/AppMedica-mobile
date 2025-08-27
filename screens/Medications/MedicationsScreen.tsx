import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Platform, Alert, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMedications } from '../../store/useMedications';
import { scheduleNotification, cancelNotification } from '../../lib/notifications';
import { useCurrentUser } from '../../store/useCurrentUser';
import { LinearGradient } from 'expo-linear-gradient';
import OfflineIndicator from '../../components/OfflineIndicator';
import COLORS from '../../constants/colors';
import { GLOBAL_STYLES, MEDICAL_STYLES } from '../../constants/styles';

export default function MedicationsScreen() {
  const { medications, loading, error, getMedications, createMedication, updateMedication, deleteMedication } = useMedications();
  const { profile } = useCurrentUser();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const isTablet = dimensions.width > 768;
  const isLandscape = dimensions.width > dimensions.height;
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const notificationIdsRef = useRef<{ [medId: string]: string }>({});
  // Estado para horas y frecuencia
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'daysOfWeek' | 'everyXHours'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]); // 0=Domingo
  const [everyXHours, setEveryXHours] = useState('8');

  const perfilIncompleto = !profile?.patientProfileId && !profile?.id;

  const medicationSchema = z.object({
    name: z.string().min(1, 'Obligatorio'),
    dosage: z.string().min(1, 'Obligatorio'),
    type: z.enum(['Oral', 'Inyectable', 'Tópico']).optional(),
    frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
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
      type: 'Oral',
      frequency: 'daily',
      startDate: undefined,
      endDate: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (profile?.patientProfileId) {
      console.log('[MEDICAMENTOS] Cargando medicamentos para perfil:', profile.patientProfileId);
      getMedications().catch((e) => {
        console.log('[MEDICAMENTOS] Error:', e.message || e);
      });
    } else {
      console.log('[MEDICAMENTOS] No hay patientProfileId disponible:', profile);
    }
  }, [profile?.patientProfileId]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const onStartChange = (event: any, date?: Date) => {
    setShowStartPicker(false);
    if (date) setValue('startDate', date);
  };
  const onEndChange = (event: any, date?: Date) => {
    setShowEndPicker(false);
    if (date) setValue('endDate', date);
  };
  // Función para agregar hora
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
    setSelectedTimes(med.times || []);
    setFrequencyType(med.frequencyType || 'daily');
    setDaysOfWeek(med.daysOfWeek || []);
    setEveryXHours(med.everyXHours || '8');
  };
  const openCreateModal = () => {
    setEditingMed(null);
    setModalVisible(true);
    reset();
    setSelectedTimes([]);
    setFrequencyType('daily');
    setDaysOfWeek([]);
    setEveryXHours('8');
  };
  const scheduleMedNotification = async (med: any) => {
    if (!med.startDate) return;
    const date = new Date(med.startDate);
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
  // onSubmit para programar notificaciones según la configuración
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
        });
        medId = editingMed.id;
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
        });
        await new Promise(res => setTimeout(res, 500));
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
            if ((firstDate - now) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
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
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: firstDate },
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
              trigger: { 
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: t.getHours(), 
                minute: t.getMinutes() 
              },
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
              if ((firstDate - now) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
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
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: firstDate },
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
                trigger: { 
                  type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                  weekday: day + 1, 
                  hour: t.getHours(), 
                  minute: t.getMinutes() 
                },
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
            if ((firstDate - new Date()) / 1000 < 60) firstDate.setMinutes(firstDate.getMinutes() + 1);
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
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: firstDate },
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
              trigger: { 
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: interval * 60 * 60 
              },
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
  // onDelete para cancelar notificaciones
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
    <LinearGradient colors={COLORS.gradients.primary as [string, string, string]} style={{ flex: 1 }}>
      <ScrollView 
        style={GLOBAL_STYLES.container}
        contentContainerStyle={{ 
          paddingBottom: 32,
          paddingHorizontal: 16
        }}
      >
      <OfflineIndicator />
      <View style={GLOBAL_STYLES.rowSpaced}>
        <Text style={GLOBAL_STYLES.sectionHeader}>Medicamentos</Text>
        <TouchableOpacity 
          style={[
            GLOBAL_STYLES.buttonPrimary,
            perfilIncompleto && { opacity: 0.6 }
          ]} 
          onPress={openCreateModal} 
          disabled={perfilIncompleto} 
          activeOpacity={0.85}
          accessibilityLabel="Agregar nuevo medicamento"
          accessibilityHint={perfilIncompleto ? "Completa tu perfil primero" : "Abre el formulario para agregar un medicamento"}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.text.inverse} />
          <Text style={GLOBAL_STYLES.buttonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>
      {perfilIncompleto && (
        <View style={[GLOBAL_STYLES.card, { backgroundColor: COLORS.error + '20', borderColor: COLORS.error }]}>
          <Text style={[GLOBAL_STYLES.bodyText, { color: COLORS.error, textAlign: 'center' }]}>
            Completa tu perfil para poder agregar medicamentos.
          </Text>
        </View>
      )}
      {(!medications || medications.length === 0) ? (
        <View style={GLOBAL_STYLES.centered}>
          <Text style={GLOBAL_STYLES.bodyText}>No hay medicamentos registrados.</Text>
        </View>
      ) : (
        medications.map((med) => (
          <View 
            key={med.id} 
            style={MEDICAL_STYLES.medicationCard}
          >
            <View style={GLOBAL_STYLES.rowSpaced}>
              <View style={GLOBAL_STYLES.row}>
                <Ionicons name="medkit" size={24} color={COLORS.medical.medication} style={GLOBAL_STYLES.icon} />
                <Text style={[GLOBAL_STYLES.sectionTitle, { marginBottom: 0 }]}>{med.name}</Text>
              </View>
              <View style={GLOBAL_STYLES.row}>
                <TouchableOpacity 
                  style={MEDICAL_STYLES.actionButton} 
                  onPress={() => openEditModal(med)}
                  accessibilityLabel={`Editar medicamento ${med.name}`}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.text.inverse} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[MEDICAL_STYLES.actionButton, { backgroundColor: COLORS.error }]} 
                  onPress={() => onDelete(med.id)}
                  accessibilityLabel={`Eliminar medicamento ${med.name}`}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.text.inverse} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={GLOBAL_STYLES.rowSpaced}>
              <Text style={GLOBAL_STYLES.bodyText}>Dosis:</Text>
              <Text style={[GLOBAL_STYLES.bodyText, { fontWeight: '600', color: COLORS.text.primary }]}>{med.dosage}</Text>
            </View>
            <View style={GLOBAL_STYLES.rowSpaced}>
              <Text style={GLOBAL_STYLES.bodyText}>Tipo:</Text>
              <Text style={[GLOBAL_STYLES.bodyText, { fontWeight: '600', color: COLORS.text.primary }]}>{med.type}</Text>
            </View>
            <View style={[GLOBAL_STYLES.row, { marginTop: 8 }]}>
              <Ionicons name="time" size={16} color={COLORS.text.secondary} style={GLOBAL_STYLES.icon} />
              <Text style={GLOBAL_STYLES.bodyText}>Inicio: </Text>
              <Text style={[GLOBAL_STYLES.bodyText, { fontWeight: '600' }]}>
                {med.startDate ? new Date(med.startDate).toLocaleDateString() : '—'}
              </Text>
            </View>
            {med.notes ? (
              <View style={[GLOBAL_STYLES.card, { marginTop: 12, marginBottom: 0, padding: 12 }]}>
                <Text style={GLOBAL_STYLES.caption}>{med.notes}</Text>
              </View>
            ) : null}
          </View>
        ))
      )}
      {/* Modal para crear/editar medicamento */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setModalVisible(false); setEditingMed(null); }}
      >
        <View style={GLOBAL_STYLES.loadingContainer}>
          <View style={[GLOBAL_STYLES.card, { width: '95%', maxHeight: '90%', padding: 24 }]}>
            <ScrollView 
              showsVerticalScrollIndicator={true}
              indicatorStyle="black"
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <Text style={GLOBAL_STYLES.sectionHeader}>{editingMed ? 'Editar Medicamento' : 'Agregar Medicamento'}</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text style={GLOBAL_STYLES.inputLabel}>Nombre *</Text>
                  <TextInput
                    style={GLOBAL_STYLES.input}
                    placeholder="Nombre del medicamento"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.name && <Text style={GLOBAL_STYLES.errorText}>{errors.name.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="dosage"
              render={({ field: { onChange, value } }) => (
                <View style={[
                  { marginBottom: isTablet ? 16 : 10 },
                  isTablet && { flex: 1, marginLeft: 8 }
                ]}>
                  <Text style={[
                    { fontWeight: '600', marginBottom: 6, color: '#374151' },
                    isTablet && { fontSize: 16 }
                  ]}>Dosis *</Text>
                  <TextInput
                    style={[
                      styles.inputModern,
                      isTablet && styles.inputTablet
                    ]}
                    placeholder="Dosis"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.dosage && <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 4 }}>{errors.dosage.message}</Text>}
                </View>
              )}
            />
            <View style={[
              { marginBottom: isTablet ? 16 : 10 },
              isTablet && { flexDirection: 'row', gap: 16 }
            ]}>
              <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <View style={[
                    { marginBottom: isTablet ? 0 : 10 },
                    isTablet && { flex: 1 }
                  ]}>
                    <Text style={[
                      { fontWeight: '600', marginBottom: 6, color: '#374151' },
                      isTablet && { fontSize: 16 }
                    ]}>Tipo</Text>
                    <View style={[
                      styles.inputModern,
                      isTablet && styles.inputTablet
                    ]}>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => {
                          Alert.alert(
                            'Seleccionar tipo',
                            'Elige el tipo de medicamento',
                            [
                              { text: 'Oral', onPress: () => onChange('Oral') },
                              { text: 'Inyectable', onPress: () => onChange('Inyectable') },
                              { text: 'Tópico', onPress: () => onChange('Tópico') },
                              { text: 'Cancelar', style: 'cancel' }
                          ]
                          );
                        }}
                      >
                        <Text style={styles.pickerButtonText}>
                          {value || 'Seleccionar tipo'}
                        </Text>
                        <Ionicons name="chevron-down" size={isTablet ? 24 : 20} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              <Controller
                control={control}
                name="frequency"
                render={({ field: { onChange, value } }) => (
                  <View style={[
                    { marginBottom: isTablet ? 0 : 10 },
                    isTablet && { flex: 1 }
                  ]}>
                    <Text style={[
                      { fontWeight: '600', marginBottom: 6, color: '#374151' },
                      isTablet && { fontSize: 16 }
                    ]}>Frecuencia</Text>
                    <View style={[
                      styles.inputModern,
                      isTablet && styles.inputTablet
                    ]}>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => {
                          Alert.alert(
                            'Seleccionar frecuencia',
                            'Elige la frecuencia del medicamento',
                            [
                              { text: 'Diario', onPress: () => onChange('daily') },
                              { text: 'Semanal', onPress: () => onChange('weekly') },
                              { text: 'Personalizado', onPress: () => onChange('custom') },
                              { text: 'Cancelar', style: 'cancel' }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.pickerButtonText}>
                          {value === 'daily' ? 'Diario' : 
                           value === 'weekly' ? 'Semanal' : 
                           value === 'custom' ? 'Personalizado' : 
                           'Seleccionar frecuencia'}
                        </Text>
                        <Ionicons name="chevron-down" size={isTablet ? 24 : 20} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </View>
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
              <View style={{ flexDirection: 'row', marginBottom: 8, gap: 8 }}>
                <TouchableOpacity 
                  onPress={() => setFrequencyType('daily')} 
                  style={[
                    styles.frequencyButton,
                    frequencyType === 'daily' && styles.frequencyButtonActive
                  ]}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    frequencyType === 'daily' && styles.frequencyButtonTextActive
                  ]}>Todos los días</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setFrequencyType('daysOfWeek')} 
                  style={[
                    styles.frequencyButton,
                    frequencyType === 'daysOfWeek' && styles.frequencyButtonActive
                  ]}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    frequencyType === 'daysOfWeek' && styles.frequencyButtonTextActive
                  ]}>Días específicos</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setFrequencyType('everyXHours')}
                  style={[
                    styles.frequencyButton,
                    frequencyType === 'everyXHours' && styles.frequencyButtonActive
                  ]}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    frequencyType === 'everyXHours' && styles.frequencyButtonTextActive
                  ]}>Cada X horas</Text>
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
            </ScrollView>
            {/* Botones de acción fuera del scroll para que siempre sean visibles */}
            <View style={[
              { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
              isTablet && { gap: 16 },
              isLandscape && { gap: 20 }
            ]}>
              <TouchableOpacity
                style={[
                  styles.addBtnModern, 
                  { 
                    backgroundColor: '#10b981',
                    opacity: (isSubmitting || loading) ? 0.6 : 1
                  },
                  isTablet && styles.addBtnTablet,
                  isLandscape && styles.addBtnLandscape
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || loading}
              >
                <Ionicons name="save" size={isTablet ? 24 : 20} color="#ffffff" />
                <Text style={[
                  styles.addBtnTextModern,
                  isTablet && styles.addBtnTextTablet
                ]}>
                  {isSubmitting || loading ? 'Guardando...' : (editingMed ? 'Guardar cambios' : 'Guardar')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addBtnModern, 
                  { 
                    backgroundColor: '#ef4444',
                    marginLeft: isTablet ? 16 : 12,
                    flex: isTablet ? 0 : 1
                  },
                  isTablet && styles.addBtnTablet,
                  isLandscape && styles.addBtnLandscape
                ]}
                onPress={() => { setModalVisible(false); setEditingMed(null); reset(); }}
              >
                <Ionicons name="close" size={isTablet ? 24 : 20} color="#ffffff" />
                <Text style={[
                  styles.addBtnTextModern,
                  isTablet && styles.addBtnTextTablet
                ]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  containerTablet: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  containerLandscape: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  addBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnTextModern: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  addBtnDisabled: {
    opacity: 0.6,
    backgroundColor: '#9ca3af',
  },
  cardModern: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  cardHeaderModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleModern: {
    fontWeight: 'bold',
    color: '#4f46e5',
    fontSize: 18,
  },
  iconBtnModern: {
    marginHorizontal: 3,
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
  },
  cardRowModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  cardLabelModern: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
    marginRight: 6,
  },
  cardValueModern: {
    color: '#111827',
    fontSize: 15,
    fontWeight: 'bold',
  },
  notesBoxModern: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#a5b4fc',
  },
  notesTextModern: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlayModern: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentModern: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '95%',
    maxHeight: '90%',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  inputModern: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    fontSize: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocused: {
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputTablet: {
    padding: 18,
    fontSize: 18,
    borderRadius: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#4f46e5',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  frequencyButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // Estilos responsive para tablets
  headerRowTablet: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitleTablet: {
    fontSize: 32,
  },
  addBtnTablet: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  addBtnTextTablet: {
    fontSize: 18,
    marginLeft: 12,
  },
  cardModernTablet: {
    padding: 28,
    marginBottom: 24,
    borderRadius: 24,
  },
  modalContentTablet: {
    width: '70%',
    maxWidth: 600,
    maxHeight: '85%',
    padding: 32,
  },
  
  // Estilos responsive para landscape
  headerRowLandscape: {
    marginBottom: 20,
  },
  headerTitleLandscape: {
    fontSize: 26,
  },
  addBtnLandscape: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cardModernLandscape: {
    padding: 24,
    marginBottom: 20,
  },
  modalContentLandscape: {
    width: '80%',
    maxHeight: '85%',
    padding: 24,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalScrollIndicator: {
    backgroundColor: '#6366f1',
    borderRadius: 2,
    width: 4,
  },
  
  // Estilos responsive para pantallas pequeñas
  containerSmall: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  headerRowSmall: {
    marginBottom: 16,
  },
  headerTitleSmall: {
    fontSize: 20,
  },
  addBtnSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  addBtnTextSmall: {
    fontSize: 14,
    marginLeft: 6,
  },
});
