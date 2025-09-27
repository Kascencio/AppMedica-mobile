import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Platform, Alert, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMedications } from '../../store/useMedications';
import { cancelNotification } from '../../lib/notifications';
import { validateMedication } from '../../lib/medicationValidator';
import * as Notifications from 'expo-notifications';
import { useCurrentUser } from '../../store/useCurrentUser';
import { LinearGradient } from 'expo-linear-gradient';
import OfflineIndicator from '../../components/OfflineIndicator';
import AlarmScheduler from '../../components/AlarmScheduler';
import DateSelector from '../../components/DateSelector';
import OptionSelector from '../../components/OptionSelector';
import COLORS from '../../constants/colors';
import { GLOBAL_STYLES, MEDICAL_STYLES } from '../../constants/styles';
import { useOffline } from '../../store/useOffline';

export default function MedicationsScreen() {
  const { medications, loading, error, getMedications, createMedication, updateMedication, deleteMedication, scheduleMedicationAlarms, cancelMedicationAlarms, rescheduleMedicationAlarms } = useMedications();
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
  const { isOnline } = useOffline();

  const perfilIncompleto = !profile?.patientProfileId && !profile?.id;

  const getNextDoseEta = (med: any) => {
    try {
      const now = new Date();
      let candidate: Date | null = null;
      if (med.time) {
        const [hh, mm] = String(med.time).split(':').map((n: string) => parseInt(n, 10));
        const base = new Date();
        base.setHours(isNaN(hh) ? 0 : hh, isNaN(mm) ? 0 : mm, 0, 0);
        candidate = base;
      } else if (med.startDate) {
        candidate = new Date(med.startDate);
      }
      if (!candidate) return '';
      // Si la hora ya pasó hoy, asumir próxima ocurrencia mañana (diario)
      if (candidate.getTime() <= now.getTime()) {
        candidate.setDate(candidate.getDate() + 1);
      }
      const diffMs = candidate.getTime() - now.getTime();
      const totalMin = Math.max(0, Math.round(diffMs / 60000));
      const hours = Math.floor(totalMin / 60);
      const minutes = totalMin % 60;
      if (hours <= 0) return `Próxima dosis en ${minutes} min`;
      if (minutes === 0) return `Próxima dosis en ${hours} h`;
      return `Próxima dosis en ${hours} h ${minutes} min`;
    } catch {
      return '';
    }
  };

  const medicationSchema = z.object({
    name: z.string().min(1, 'Obligatorio'),
    dosage: z.string().min(1, 'Obligatorio'),
    type: z.enum(['Oral', 'Inyectable', 'Tópico', 'Inhalación', 'Sublingual']).optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'as_needed', 'custom']).optional(),
    startDate: z.date().refine((date) => date !== undefined, {
      message: 'Selecciona una fecha'
    }),
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
    
    // Mapear type del servidor al formato del formulario
    const typeMapping: { [key: string]: string } = {
      'ORAL': 'Oral',
      'INJECTABLE': 'Inyectable', 
      'TOPICAL': 'Tópico',
      'INHALATION': 'Inhalación',
      'SUBLINGUAL': 'Sublingual'
    };
    setValue('type', typeMapping[med.type] || med.type || 'Oral');
    
    // Mapear frequency del servidor al formato del formulario
    const frequencyMapping: { [key: string]: string } = {
      'DAILY': 'daily',
      'WEEKLY': 'weekly',
      'MONTHLY': 'monthly',
      'AS_NEEDED': 'as_needed',
      'INTERVAL': 'custom',
      'CUSTOM': 'custom'
    };
    setValue('frequency', frequencyMapping[med.frequency] || med.frequency || 'daily');
    
    if (med.startDate) {
      setValue('startDate', new Date(med.startDate));
    }
    if (med.endDate) {
      setValue('endDate', new Date(med.endDate));
    }
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
  // Las funciones de notificaciones se manejan ahora a través del nuevo sistema de alarmas
  // onSubmit para programar notificaciones según la configuración
  const onSubmit = async (data: MedicationForm) => {
    try {
      // Mapear frequency del formulario a valores soportados por el backend/validador
      const mappedFrequency = (data.frequency === 'custom'
        ? (frequencyType === 'everyXHours' ? 'INTERVAL' : frequencyType === 'daysOfWeek' ? 'WEEKLY' : 'DAILY')
        : data.frequency || 'daily');

      // Validar datos usando el validador
      const validation = validateMedication({ ...data, frequency: mappedFrequency });
      if (!validation.isValid) {
        Alert.alert('Error de validación', validation.errors.join('\n'));
        return;
      }
      
      let medId = editingMed?.id;
      if (editingMed) {
        await updateMedication(editingMed.id, {
          name: data.name,
          dosage: data.dosage,
          type: data.type,
          frequency: mappedFrequency,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          notes: data.notes,
          // Incluir la hora principal para que Home muestre "Próxima toma"
          time: selectedTimes.length > 0
            ? selectedTimes[0].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : undefined,
        });
        medId = editingMed.id;
      } else {
        await createMedication({
          name: data.name,
          dosage: data.dosage,
          type: data.type,
          frequency: mappedFrequency,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          notes: data.notes,
          // Incluir la hora principal para que Home muestre "Próxima toma"
          time: selectedTimes.length > 0
            ? selectedTimes[0].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : undefined,
        });
        await new Promise(res => setTimeout(res, 500));
        const newMed = medications.find(m => m.name === data.name && m.startDate === data.startDate?.toISOString());
        medId = newMed?.id;
      }
      // Programar alarmas según la configuración usando el nuevo sistema
      if (medId) {
        const medication = {
          id: medId,
          name: data.name,
          dosage: data.dosage,
          type: data.type,
          frequency: mappedFrequency,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          notes: data.notes,
          time: selectedTimes.length > 0 ? selectedTimes[0].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '09:00',
          patientProfileId: profile?.patientProfileId || profile?.id,
        };

        const alarmConfig = {
          frequency: (frequencyType === 'daily' ? 'daily' : frequencyType === 'daysOfWeek' ? 'weekly' : 'interval') as 'daily' | 'weekly' | 'interval',
          daysOfWeek: frequencyType === 'daysOfWeek' ? daysOfWeek : undefined,
          intervalHours: frequencyType === 'everyXHours' ? parseInt(everyXHours) : undefined,
        };

        try {
          if (editingMed) {
            // Reprogramar alarmas existentes
            await rescheduleMedicationAlarms(medication, alarmConfig);
          } else {
            // Programar nuevas alarmas
            await scheduleMedicationAlarms(medication, alarmConfig);
          }
          console.log('[MedicationsScreen] Alarmas programadas exitosamente');
        } catch (alarmError) {
          console.error('[MedicationsScreen] Error programando alarmas:', alarmError);
          Alert.alert('Advertencia', 'El medicamento se guardó pero hubo un problema programando las alarmas. Puedes configurarlas manualmente después.');
        }
      }
      reset();
      setModalVisible(false);
      setEditingMed(null);
    } catch (e) {}
  };
  // onDelete para cancelar alarmas y eliminar medicamento
  const onDelete = async (id: string) => {
    Alert.alert(
      'Eliminar medicamento',
      '¿Seguro que deseas eliminar este medicamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
            try {
              // Cancelar alarmas primero
              await cancelMedicationAlarms(id);
              // Eliminar medicamento
              await deleteMedication(id);
              console.log('[MedicationsScreen] Medicamento eliminado y alarmas canceladas');
            } catch (error) {
              console.error('[MedicationsScreen] Error eliminando medicamento:', error);
              Alert.alert('Error', 'Hubo un problema eliminando el medicamento. Inténtalo de nuevo.');
            }
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
          paddingHorizontal: 16,
          paddingTop: 40
        }}
      >
      <OfflineIndicator />
      <View style={[GLOBAL_STYLES.rowSpaced, { marginTop: 20 }]}>
        <Text style={GLOBAL_STYLES.sectionHeader}>Medicamentos</Text>
        <TouchableOpacity 
          style={[
            GLOBAL_STYLES.buttonPrimary,
            (perfilIncompleto || !isOnline) && { opacity: 0.6 },
            { marginTop: 20 }
          ]} 
          onPress={openCreateModal} 
          disabled={perfilIncompleto || !isOnline} 
          activeOpacity={0.85}
          accessibilityLabel="Agregar nuevo medicamento"
          accessibilityHint={perfilIncompleto ? "Completa tu perfil primero" : "Abre el formulario para agregar un medicamento"}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.text.inverse} />
          <Text style={GLOBAL_STYLES.buttonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>
      {!isOnline && (
        <View style={[GLOBAL_STYLES.card, { backgroundColor: '#fef9c3', borderColor: '#fde047', borderWidth: 1 }]}>
          <Text style={{ color: '#92400e', textAlign: 'center' }}>Modo sin conexión: visualización habilitada, edición deshabilitada.</Text>
        </View>
      )}
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
                  style={[MEDICAL_STYLES.actionButton, !isOnline && { opacity: 0.5 }]} 
                  onPress={() => isOnline && openEditModal(med)}
                  disabled={!isOnline}
                  accessibilityLabel={`Editar medicamento ${med.name}`}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.text.inverse} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[MEDICAL_STYLES.actionButton, { backgroundColor: COLORS.error }, !isOnline && { opacity: 0.5 }]} 
                  onPress={() => isOnline && onDelete(med.id)}
                  disabled={!isOnline}
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
            <View style={GLOBAL_STYLES.rowSpaced}>
              <Text style={GLOBAL_STYLES.bodyText}>Hora:</Text>
              <Text style={[GLOBAL_STYLES.bodyText, { fontWeight: '600', color: COLORS.text.primary }]}>
                {med.time
                  ? med.time
                  : (med.startDate
                      ? new Date(med.startDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '—')}
              </Text>
            </View>
            {med.frequency ? (
              <View style={GLOBAL_STYLES.rowSpaced}>
                <Text style={GLOBAL_STYLES.bodyText}>Frecuencia:</Text>
                <Text style={[GLOBAL_STYLES.bodyText, { fontWeight: '600', color: COLORS.text.primary }]}>{med.frequency}</Text>
              </View>
            ) : null}
            <View style={[GLOBAL_STYLES.row, { marginTop: 8 }]}>
              <Ionicons name="time" size={16} color={COLORS.text.secondary} style={GLOBAL_STYLES.icon} />
              <Text style={GLOBAL_STYLES.bodyText}>Inicio: </Text>
              <Text style={[GLOBAL_STYLES.bodyText, { fontWeight: '600' }]}>
                {med.startDate ? new Date(med.startDate).toLocaleDateString() : '—'}
              </Text>
            </View>
            {getNextDoseEta(med) ? (
              <View style={[GLOBAL_STYLES.row, { marginTop: 6 }]}>
                <Ionicons name="alarm" size={16} color={COLORS.primary} style={GLOBAL_STYLES.icon} />
                <Text style={[GLOBAL_STYLES.bodyText, { fontWeight: '600', color: COLORS.primary }]}>
                  {getNextDoseEta(med)}
                </Text>
              </View>
            ) : null}
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
                    <OptionSelector
                      value={value}
                      onValueChange={onChange}
                      options={[
                        { value: 'Oral', label: 'Oral', icon: 'oral', description: 'Pastillas, jarabes, etc.' },
                        { value: 'Inyectable', label: 'Inyectable', icon: 'injectable', description: 'Inyecciones, vacunas' },
                        { value: 'Tópico', label: 'Tópico', icon: 'topical', description: 'Cremas, pomadas, etc.' },
                        { value: 'Inhalación', label: 'Inhalación', icon: 'inhalation', description: 'Inhaladores, nebulizadores' },
                        { value: 'Sublingual', label: 'Sublingual', icon: 'sublingual', description: 'Pastillas sublinguales' }
                      ]}
                      label="Tipo de medicamento"
                      placeholder="Seleccionar tipo"
                    />
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
                    <OptionSelector
                      value={value}
                      onValueChange={onChange}
                      options={[
                        { value: 'daily', label: 'Diario', icon: 'daily', description: 'Todos los días' },
                        { value: 'weekly', label: 'Semanal', icon: 'weekly', description: 'Una vez por semana' },
                        { value: 'monthly', label: 'Mensual', icon: 'monthly', description: 'Una vez al mes' },
                        { value: 'as_needed', label: 'Según necesidad', icon: 'as_needed', description: 'Cuando sea necesario' },
                        { value: 'custom', label: 'Personalizado', icon: 'custom', description: 'Horario específico' }
                      ]}
                      label="Frecuencia"
                      placeholder="Seleccionar frecuencia"
                    />
                  </View>
                )}
              />
            </View>
            <Controller
              control={control}
              name="startDate"
              render={({ field: { value, onChange } }) => (
                <DateSelector
                  value={value}
                  onDateChange={onChange}
                  label="Fecha de inicio"
                  placeholder="Seleccionar fecha de inicio"
                  required={true}
                  minDate={new Date()}
                />
              )}
            />
            <Controller
              control={control}
              name="endDate"
              render={({ field: { value, onChange } }) => (
                <DateSelector
                  value={value}
                  onDateChange={onChange}
                  label="Fecha de fin"
                  placeholder="Seleccionar fecha de fin (opcional)"
                  minDate={new Date()}
                />
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
              title="Recordatorios de Medicamento"
              subtitle="Configura cuándo quieres recibir recordatorios para tomar tu medicamento"
            />
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
              {editingMed ? (
                <TouchableOpacity
                  style={[
                    styles.addBtnModern, 
                    { 
                      backgroundColor: '#f59e0b',
                      marginLeft: isTablet ? 16 : 12,
                      flex: isTablet ? 0 : 1
                    },
                    isTablet && styles.addBtnTablet,
                    isLandscape && styles.addBtnLandscape
                  ]}
                  onPress={async () => {
                    try {
                      await cancelMedicationAlarms(editingMed.id);
                      setSelectedTimes([]);
                      setFrequencyType('daily');
                      setDaysOfWeek([]);
                      setEveryXHours('8');
                      Alert.alert('Listo', 'Se eliminaron las alarmas de este medicamento');
                    } catch (e: any) {
                      Alert.alert('Error', e?.message || 'No se pudieron eliminar las alarmas');
                    }
                  }}
                >
                  <Ionicons name="alarm" size={isTablet ? 24 : 20} color="#ffffff" />
                  <Text style={[
                    styles.addBtnTextModern,
                    isTablet && styles.addBtnTextTablet
                  ]}>Eliminar alarmas</Text>
                </TouchableOpacity>
              ) : null}
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
