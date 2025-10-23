import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { validateMedication } from '../../lib/medicationValidator';
import DateSelector from '../../components/DateSelector';
import OptionSelector from '../../components/OptionSelector';
import { LinearGradient } from 'expo-linear-gradient';
import { useCaregiver } from '../../store/useCaregiver';
import CaregiverPatientSwitcher from '../../components/CaregiverPatientSwitcher';
import SelectedPatientBanner from '../../components/SelectedPatientBanner';
import { useOffline } from '../../store/useOffline';
import AlarmScheduler from '../../components/AlarmScheduler';
import { getExistingAlarmsForElement, cancelAlarmsForElement } from '../../lib/alarmHelper';
import { useMedications } from '../../store/useMedications';

const typeDisplayMap: Record<string, string> = {
  ORAL: 'Oral',
  INJECTION: 'Inyectable',
  TOPICAL: 'Tópico',
  INHALATION: 'Inhalación',
  SUBLINGUAL: 'Sublingual',
};

const frequencyDisplayMap: Record<string, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  AS_NEEDED: 'Según necesidad',
  INTERVAL: 'Personalizado', // Mapeado desde INTERVAL y CUSTOM
  CUSTOM: 'Personalizado',
};

// Define el tipo para el formulario de medicamentos
interface MedicationForm {
  name: string;
  dosage: string;
  type: string;
  frequency: string;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
}

export default function CaregiverMedicationsScreen({ navigation }: any) {
  const { medications, loading, error, getMedications, createMedication, updateMedication, deleteMedication } = useMedications();
  const { selectedPatientId, patients } = useCaregiver();
  const { isOnline } = useOffline();
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  
  // Estado de alarmas para el modal
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'daysOfWeek' | 'everyXHours'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [everyXHours, setEveryXHours] = useState<string>('8');

  const { control, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<MedicationForm>({
    defaultValues: {
      name: '',
      dosage: '',
      type: 'ORAL',
      frequency: 'DAILY',
      notes: '',
    },
  });

  useEffect(() => {
    if (selectedPatientId) {
      getMedications(selectedPatientId).catch((e) => {
        console.log('[MEDICAMENTOS] Error:', e.message || e);
      });
    }
  }, [selectedPatientId, getMedications]);

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este medicamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAlarmsForElement('medication', id);
              await deleteMedication(id);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo eliminar el medicamento.');
            }
          },
        },
      ]
    );
  };

  const openEditModal = async (med: any) => {
    setEditingMed(med);
    setModalVisible(true);
    setValue('name', med.name);
    setValue('dosage', med.dosage);
    setValue('type', med.type || '');
    setValue('frequency', med.frequency || '');
    if (med.startDate) {
      setValue('startDate', new Date(med.startDate));
    }
    if (med.endDate) {
      setValue('endDate', new Date(med.endDate));
    }
    setValue('notes', med.notes || '');
    // Cargar alarmas existentes programadas para este medicamento
    try {
      const existingAlarms = await getExistingAlarmsForElement('medication', med.id);
      const timesAsDates = (existingAlarms.selectedTimes || []).map(t => new Date(t));
      setSelectedTimes(timesAsDates);
      const freqType = existingAlarms.frequencyType;
      if (freqType === 'daily' || freqType === 'daysOfWeek' || freqType === 'everyXHours') {
        setFrequencyType(freqType);
      } else {
        setFrequencyType('daily');
      }
      setDaysOfWeek(existingAlarms.daysOfWeek || []);
      setEveryXHours(existingAlarms.everyXHours || '8');
    } catch (error) {
      console.error('[CUIDADOR-MEDICAMENTOS] Error cargando alarmas existentes:', error);
      setSelectedTimes([]);
      setFrequencyType('daily');
      setDaysOfWeek([]);
      setEveryXHours('8');
    }
  };
  const openCreateModal = () => {
    setEditingMed(null);
    setModalVisible(true);
    reset();
    // Reset alarm state for new medication
    setSelectedTimes([]);
    setFrequencyType('daily');
    setDaysOfWeek([]);
    setEveryXHours('8');
  };

  const onSubmit = async (data: MedicationForm) => {
    try {
      const alarmConfig = {
        selectedTimes,
        frequencyType,
        daysOfWeek,
        everyXHours,
      };

      // Determine frequency from alarm config
      let calculatedFrequency = 'DAILY'; // Default
      if (frequencyType === 'daysOfWeek' && daysOfWeek.length > 0 && daysOfWeek.length < 7) {
        calculatedFrequency = 'WEEKLY';
      } else if (frequencyType === 'everyXHours') {
        calculatedFrequency = 'INTERVAL';
      }
      
      const typeMap: Record<string, string> = {
        oral: 'ORAL',
        inyectable: 'INJECTION', injectable: 'INJECTION', injection: 'INJECTION',
        topico: 'TOPICAL', topical: 'TOPICAL',
        inhalacion: 'INHALATION', inhalation: 'INHALATION',
        sublingual: 'SUBLINGUAL'
      };
      const mappedType = data.type
        ? (typeMap[(data.type || '').toLowerCase()] || (['ORAL','INJECTION','TOPICAL','INHALATION','SUBLINGUAL'].includes((data.type || '').toUpperCase()) ? (data.type as string).toUpperCase() : 'ORAL'))
        : 'ORAL';

      const validation = validateMedication({ ...data, frequency: calculatedFrequency, type: mappedType });
      if (!validation.isValid) {
        Alert.alert('Error de validación', validation.errors.join('\n'));
        return;
      }
      
      const medicationData: Partial<any> = {
        name: data.name,
        dosage: data.dosage,
        type: mappedType,
        frequency: calculatedFrequency,
        startDate: data.startDate?.toISOString(),
        endDate: data.endDate?.toISOString(),
        notes: data.notes,
        alarm_config: alarmConfig,
        // Ensure time is correctly formatted from the first selected time
        time: selectedTimes.length > 0 
          ? new Date(selectedTimes[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          : undefined,
      };

      if (editingMed) {
        await updateMedication(editingMed.id, medicationData);
      } else {
        await createMedication(medicationData);
      }
      
      reset();
      setModalVisible(false);
      setEditingMed(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar el medicamento.');
    }
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
            await cancelAlarmsForElement('medication', id);
          }
        },
      ]
    );
  };

  if (!selectedPatientId) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="account-heart" size={64} color="#2563eb" />
        <Text style={styles.title}>Selecciona un paciente</Text>
        <Text style={styles.subtitle}>Debes seleccionar un paciente asignado para ver sus medicamentos.</Text>
      </View>
    );
  }

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
      <CaregiverPatientSwitcher />
      <SelectedPatientBanner onChange={() => { /* abriría switcher si fuera modal */ }} />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Medicamentos</Text>
        <TouchableOpacity style={styles.addBtnModern} onPress={openCreateModal} disabled={!selectedPatient || !isOnline} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={28} color="#ffffff" />
          <Text style={styles.addBtnTextModern}>Nuevo</Text>
        </TouchableOpacity>
      </View>
      {!isOnline && (
        <View style={{ backgroundColor: '#fef9c3', borderColor: '#fde047', borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#92400e' }}>Modo sin conexión: visualización habilitada, edición deshabilitada.</Text>
        </View>
      )}
      {!selectedPatient && (
        <Text style={{ color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>
          Selecciona un paciente para poder agregar medicamentos.
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
                <TouchableOpacity style={[styles.iconBtnModern, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && openEditModal(med)} disabled={!isOnline}>
                  <Ionicons name="create-outline" size={20} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtnModern, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && onDelete(med.id)} disabled={!isOnline}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Dosis:</Text><Text style={styles.cardValueModern}>{med.dosage}</Text></View>
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Tipo:</Text><Text style={styles.cardValueModern}>{typeDisplayMap[med.type] || med.type}</Text></View>
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Frecuencia:</Text><Text style={styles.cardValueModern}>{frequencyDisplayMap[med.frequency] || med.frequency}</Text></View>
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Hora:</Text><Text style={styles.cardValueModern}>{med.time ? med.time : (med.startDate ? new Date(med.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—')}</Text></View>
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
          <View style={[styles.modalContentModern, { maxHeight: '90%' }]}>
            <ScrollView
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
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
                  <OptionSelector
                    value={value}
                    onValueChange={onChange}
                    options={[
                      { value: 'Oral', label: 'Oral', icon: 'oral', description: 'Pastillas, jarabes, etc.' },
                      { value: 'Inyectable', label: 'Inyectable', icon: 'injectable', description: 'Inyecciones, vacunas' },
                      { value: 'Tópico', label: 'Tópico', icon: 'topical', description: 'Cremas, pomadas, etc.' }
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
            {/* Frecuencia */}
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Frecuencia</Text>
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                <Text style={{ color: '#64748b' }}>Describe la frecuencia en notas si es necesario.</Text>
              </View>
              {/* En cuidador no se configuran variantes de recordatorio */}
            </View>
            {/* Configuración de alarmas (visualización y edición) */}
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
              subtitle="Configura cuándo quieres recibir recordatorios para este medicamento"
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
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#1d4ed8',
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
