import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Sin DateTimePicker: usaremos DateSelector como en paciente
import { useMedications } from '../../store/useMedications';
// Eliminado: programación de notificaciones/alarms en cuidador
import { validateMedication } from '../../lib/medicationValidator';
// Eliminado: useCurrentUser no necesario en cuidador
import DateSelector from '../../components/DateSelector';
import OptionSelector from '../../components/OptionSelector';
import { LinearGradient } from 'expo-linear-gradient';
import { useCaregiver } from '../../store/useCaregiver';
import CaregiverPatientSwitcher from '../../components/CaregiverPatientSwitcher';
import SelectedPatientBanner from '../../components/SelectedPatientBanner';
import { useOffline } from '../../store/useOffline';
import AlarmScheduler from '../../components/AlarmScheduler';
import { getExistingAlarmsForElement } from '../../lib/alarmHelper';

export default function CaregiverMedicationsScreen({ navigation }: any) {
  const { medications, loading, error, getMedications, createMedication, updateMedication, deleteMedication } = useMedications();
  const { selectedPatientId, patients } = useCaregiver();
  const { isOnline } = useOffline();
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingMed, setEditingMed] = React.useState<any>(null);
  // Sin pickers nativos, usamos DateSelector
  // Estado de alarmas para el modal
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'daysOfWeek' | 'everyXHours'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [everyXHours, setEveryXHours] = useState('8');

  // En cuidador no se requiere completar perfil; solo seleccionar paciente

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
    } catch { return ''; }
  };

  const medicationSchema = z.object({
    name: z.string().min(1, 'Obligatorio'),
    dosage: z.string().min(1, 'Obligatorio'),
    type: z.string().optional(),
    frequency: z.string().optional(),
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
      type: '',
      frequency: '',
      startDate: undefined,
      endDate: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (selectedPatientId) {
      getMedications(selectedPatientId).catch((e) => {
        console.log('[MEDICAMENTOS] Error:', e.message || e);
      });
    }
  }, [selectedPatientId]);

  // Handlers gestionados por DateSelector

  // NUEVO: Función para agregar hora
  const addTime = (date: Date) => {
    setSelectedTimes((prev) => [...prev, date]);
    setShowTimePicker(false);
  };
  const removeTime = (idx: number) => {
    setSelectedTimes((prev) => prev.filter((_, i) => i !== idx));
  };
  // Eliminado: toggleDay para configuraciones de recordatorio

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
      setSelectedTimes(existingAlarms.selectedTimes);
      setFrequencyType(existingAlarms.frequencyType);
      setDaysOfWeek(existingAlarms.daysOfWeek);
      setEveryXHours(existingAlarms.everyXHours);
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
  };
  const scheduleMedNotification = async (med: any) => {
    if (!med.startDate) return;
    const date = new Date(med.startDate);
    // Programar notificación diaria a la hora de startDate
    const id = await scheduleNotification({
      title: `Toma tu medicamento: ${med.name}`,
      body: `Dosis: ${med.dosage}`,
      data: { 
        type: 'MEDICATION',
        kind: 'MED',
        medId: med.id,
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        instructions: med.notes,
        scheduledFor: date.toISOString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: date.getHours(),
        minute: date.getMinutes(),
      },
    });
    notificationIdsRef.current[med.id] = id;
  };
  const cancelMedNotification = async (medId: string) => {
    // Buscar todas las notificaciones relacionadas con este medicamento
    const keysToDelete: string[] = [];
    
    for (const [key, notificationId] of Object.entries(notificationIdsRef.current)) {
      if (key.includes(medId) || key.startsWith(`med_${medId}`)) {
        await cancelNotification(notificationId);
        keysToDelete.push(key);
      }
    }
    
    // Eliminar las claves del objeto
    keysToDelete.forEach(key => {
      delete notificationIdsRef.current[key];
    });
    
    console.log(`[CaregiverMedicationsScreen] Canceladas ${keysToDelete.length} notificaciones para medicamento ${medId}`);
  };
  // Modifica onSubmit para programar notificaciones según la configuración
  const onSubmit = async (data: MedicationForm) => {
    try {
      // Validar datos usando el validador (sin alarmas)
      // Mapear frecuencia y tipo a valores válidos del backend antes de validar
      const freqMap: Record<string, string> = {
        daily: 'DAILY', diario: 'DAILY',
        weekly: 'WEEKLY', semanal: 'WEEKLY',
        monthly: 'MONTHLY', mensual: 'MONTHLY',
        as_needed: 'AS_NEEDED', asneeded: 'AS_NEEDED', prn: 'AS_NEEDED', segun_necesidad: 'AS_NEEDED',
        interval: 'INTERVAL', custom: 'INTERVAL', personalizado: 'INTERVAL'
      };
      const typeMap: Record<string, string> = {
        oral: 'ORAL',
        inyectable: 'INJECTION', injectable: 'INJECTION', injection: 'INJECTION',
        topico: 'TOPICAL', topical: 'TOPICAL',
        inhalacion: 'INHALATION', inhalation: 'INHALATION',
        sublingual: 'SUBLINGUAL'
      };
      const mappedFrequency = data.frequency
        ? (freqMap[(data.frequency || '').toLowerCase()] || (['DAILY','WEEKLY','MONTHLY','AS_NEEDED','INTERVAL','CUSTOM'].includes((data.frequency || '').toUpperCase()) ? (data.frequency as string).toUpperCase() : 'DAILY'))
        : 'DAILY';
      const mappedType = data.type
        ? (typeMap[(data.type || '').toLowerCase()] || (['ORAL','INJECTION','TOPICAL','INHALATION','SUBLINGUAL'].includes((data.type || '').toUpperCase()) ? (data.type as string).toUpperCase() : 'ORAL'))
        : 'ORAL';

      const validation = validateMedication({ ...data, frequency: mappedFrequency, type: mappedType });
      if (!validation.isValid) {
        Alert.alert('Error de validación', validation.errors.join('\n'));
        return;
      }
      
      let medId = editingMed?.id;
      if (editingMed) {
        await updateMedication(editingMed.id, {
          name: data.name,
          dosage: data.dosage,
          type: mappedType,
          frequency: mappedFrequency,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          notes: data.notes,
        });
        medId = editingMed.id;
        // Cancelar notificaciones anteriores
        await cancelMedNotification(medId);
      } else {
        await createMedication({
          name: data.name,
          dosage: data.dosage,
          type: mappedType,
          frequency: mappedFrequency,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          notes: data.notes,
        });
        // Espera a que getMedications actualice la lista
        await new Promise(res => setTimeout(res, 500));
        // Busca el nuevo medicamento
        const newMed = medications.find(m => m.name === data.name && m.startDate === data.startDate?.toISOString());
        medId = newMed?.id;
      }
      // Sin programación de alarmas en cuidador
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
            <View style={styles.cardRowModern}><Text style={styles.cardLabelModern}>Tipo:</Text><Text style={styles.cardValueModern}>{med.type}</Text></View>
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
