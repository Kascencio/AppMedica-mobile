import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTreatments } from '../../store/useTreatments';
import { useCaregiver } from '../../store/useCaregiver';
import { useOffline } from '../../store/useOffline';
import { LinearGradient } from 'expo-linear-gradient';
import CaregiverPatientSwitcher from '../../components/CaregiverPatientSwitcher';
import SelectedPatientBanner from '../../components/SelectedPatientBanner';
import DateSelector from '../../components/DateSelector';
import OptionSelector from '../../components/OptionSelector';
import AlarmScheduler from '../../components/AlarmScheduler';
import { getExistingAlarmsForElement } from '../../lib/alarmHelper';

export default function CaregiverTreatmentsScreen() {
  const { treatments, loading, error, getTreatments, createTreatment, updateTreatment, deleteTreatment } = useTreatments();
  const { selectedPatientId } = useCaregiver();
  const { isOnline } = useOffline();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [frequency, setFrequency] = useState('daily');
  const [notes, setNotes] = useState('');
  
  // Estados para configuración de alarmas
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'daysOfWeek' | 'everyXHours'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [everyXHours, setEveryXHours] = useState('8');

  useEffect(() => {
    if (selectedPatientId) getTreatments(selectedPatientId).catch(() => {});
  }, [selectedPatientId]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setStartDate(undefined);
    setEndDate(undefined);
    setFrequency('');
    setNotes('');
    setSelectedTimes([]);
    setFrequencyType('daily');
    setDaysOfWeek([]);
    setEveryXHours('8');
    setModalVisible(true);
  };
  
  const openEdit = async (t: any) => {
    setEditing(t);
    setName(t.name || t.title || '');
    setDescription(t.description || '');
    setStartDate(t.startDate ? new Date(t.startDate) : undefined);
    setEndDate(t.endDate ? new Date(t.endDate) : undefined);
    setFrequency(t.frequency || '');
    setNotes(t.notes || '');
    
    // Cargar alarmas existentes para el tratamiento
    try {
      const existingAlarms = await getExistingAlarmsForElement('treatment', t.id);
      setSelectedTimes(existingAlarms.selectedTimes);
      setFrequencyType(existingAlarms.frequencyType);
      setDaysOfWeek(existingAlarms.daysOfWeek);
      setEveryXHours(existingAlarms.everyXHours);
    } catch (error) {
      console.error('[CUIDADOR-TRATAMIENTOS] Error cargando alarmas existentes:', error);
      // Resetear a valores por defecto si hay error
      setSelectedTimes([]);
      setFrequencyType('daily');
      setDaysOfWeek([]);
      setEveryXHours('8');
    }
    
    setModalVisible(true);
  };

  const onSave = async () => {
    try {
      if (!name.trim()) {
        Alert.alert('Faltan datos', 'Título es obligatorio');
        return;
      }
      // Validaciones de negocio previas al request
      if (endDate && startDate && endDate <= startDate) {
        Alert.alert('Error', 'La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }
      const allowed = ['daily', 'weekly', 'monthly', 'as_needed'];
      if (!allowed.includes((frequency || '').toLowerCase())) {
        Alert.alert('Error', 'La frecuencia debe ser: daily, weekly, monthly o as_needed');
        return;
      }
      if (editing) {
        await updateTreatment(editing.id, {
          name: name.trim(),
          description: description.trim(),
          startDate: startDate ? startDate.toISOString() : undefined,
          endDate: endDate ? endDate.toISOString() : undefined,
          frequency: frequency || undefined,
          notes: notes || undefined,
        });
      } else {
        await createTreatment({
          name: name.trim(),
          description: description.trim(),
          startDate: startDate ? startDate.toISOString() : undefined,
          endDate: endDate ? endDate.toISOString() : undefined,
          frequency: frequency || undefined,
          notes: notes || undefined,
        });
      }
      setModalVisible(false);
      setEditing(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar el tratamiento');
    }
  };

  const onDelete = async (id: string) => {
    Alert.alert('Eliminar', '¿Eliminar este tratamiento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteTreatment(id); } },
    ]);
  };

  if (!selectedPatientId) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="account-heart" size={64} color="#2563eb" />
        <Text style={styles.title}>Selecciona un paciente</Text>
        <Text style={styles.subtitle}>Debes seleccionar un paciente para ver sus tratamientos.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subtitle}>Cargando tratamientos…</Text>
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
        <Text style={styles.headerTitle}>Tratamientos</Text>
        <TouchableOpacity style={[styles.addBtnModern, !isOnline && { opacity: 0.5 }]} onPress={openCreate} activeOpacity={0.85} disabled={!isOnline}>
          <Ionicons name="add-circle" size={28} color="#ffffff" />
          <Text style={styles.addBtnTextModern}>Nuevo</Text>
        </TouchableOpacity>
      </View>
      {!isOnline && (
        <View style={{ backgroundColor: '#fef9c3', borderColor: '#fde047', borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#92400e' }}>Modo sin conexión: visualización habilitada, edición deshabilitada.</Text>
        </View>
      )}

      {(!treatments || treatments.length === 0) ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay tratamientos registrados.</Text>
        </View>
      ) : (
        treatments.map((t) => (
          <LinearGradient key={t.id} colors={["#f0fdf4", "#f1f5f9"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={styles.cardHeaderModern}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="clipboard-list" size={22} color="#4ade80" style={{ marginRight: 10 }} />
                <Text style={styles.cardTitleModern}>{t.title || t.name || 'Sin título'}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={[styles.iconBtnModern, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && openEdit(t)} disabled={!isOnline}>
                  <Ionicons name="create-outline" size={20} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtnModern, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && onDelete(t.id)} disabled={!isOnline}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            {/* Información clave */}
            <View style={{ marginTop: 6 }}>
              <View style={styles.infoRow}> 
                <Text style={styles.infoLabel}>Inicio:</Text>
                <Text style={styles.infoValue}>{t.startDate ? new Date(t.startDate).toLocaleDateString() : '—'}</Text>
              </View>
              <View style={styles.infoRow}> 
                <Text style={styles.infoLabel}>Fin:</Text>
                <Text style={styles.infoValue}>{t.endDate ? new Date(t.endDate).toLocaleDateString() : '—'}</Text>
              </View>
              <View style={styles.infoRow}> 
                <Text style={styles.infoLabel}>Frecuencia:</Text>
                <Text style={[styles.infoValue, styles.frequencyValue]}>
                  {(() => {
                    const freq = (t as any).frequency;
                    if (!freq) return '—';
                    const freqMap: { [key: string]: string } = {
                      'daily': 'Diario',
                      'weekly': 'Semanal', 
                      'monthly': 'Mensual',
                      'as_needed': 'Según necesidad'
                    };
                    return freqMap[freq.toLowerCase()] || freq;
                  })()}
                </Text>
              </View>
              {t.progress ? (
                <View style={styles.progressPill}><Text style={styles.progressText}>{t.progress}</Text></View>
              ) : null}
            </View>

            {t.description ? (
              <View style={styles.notesBoxModern}>
                <Text style={styles.notesTextModern}>{t.description}</Text>
              </View>
            ) : null}
            {(t as any).notes ? (
              <View style={[styles.notesBoxModern, { backgroundColor: '#eef2ff' }]}>
                <Text style={[styles.notesTextModern, { color: '#475569' }]}>{(t as any).notes}</Text>
              </View>
            ) : null}
          </LinearGradient>
        ))
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => { setModalVisible(false); setEditing(null); }}>
        <View style={styles.modalOverlayModern}>
          <View style={styles.modalContentModern}>
            <Text style={styles.headerTitle}>{editing ? 'Editar tratamiento' : 'Agregar tratamiento'}</Text>
            <Text style={styles.inputLabel}>Nombre *</Text>
            <TextInput style={styles.inputModern} value={name} onChangeText={setName} placeholder="Nombre del tratamiento" />
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput style={[styles.inputModern, { height: 64 }]} value={description} onChangeText={setDescription} placeholder="Descripción" multiline />
            <Text style={styles.inputLabel}>Fecha de inicio</Text>
            <DateSelector value={startDate} onDateChange={setStartDate} label="" placeholder="Seleccionar fecha de inicio" />
            <Text style={styles.inputLabel}>Fecha de fin</Text>
            <DateSelector value={endDate} onDateChange={setEndDate} label="" placeholder="Seleccionar fecha de fin (opcional)" minDate={startDate} />
            <OptionSelector
              value={frequency}
              onValueChange={setFrequency}
              label="Frecuencia"
              options={[
                { value: 'daily', label: 'Diario', icon: 'daily' },
                { value: 'weekly', label: 'Semanal', icon: 'weekly' },
                { value: 'monthly', label: 'Mensual', icon: 'monthly' },
                { value: 'as_needed', label: 'Según necesidad', icon: 'custom' }
              ]}
              placeholder="Selecciona la frecuencia"
              required={true}
            />
            <Text style={styles.inputLabel}>Notas</Text>
            <TextInput style={[styles.inputModern, { height: 64 }]} value={notes} onChangeText={setNotes} placeholder="Notas adicionales" multiline />
            
            {/* Configuración de alarmas */}
            <AlarmScheduler
              selectedTimes={selectedTimes}
              setSelectedTimes={setSelectedTimes}
              frequencyType={frequencyType}
              setFrequencyType={setFrequencyType}
              daysOfWeek={daysOfWeek}
              setDaysOfWeek={setDaysOfWeek}
              everyXHours={everyXHours}
              setEveryXHours={setEveryXHours}
              title="Recordatorios de Tratamiento"
              subtitle="Configura cuándo quieres recibir recordatorios para este tratamiento"
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity style={[styles.addBtnModern, { backgroundColor: '#2563eb' }]} onPress={onSave}>
                <Text style={styles.addBtnTextModern}>{editing ? 'Guardar cambios' : 'Guardar'}</Text>
              </TouchableOpacity>
              {editing ? (
                <TouchableOpacity style={[styles.addBtnModern, { backgroundColor: '#f59e0b', marginLeft: 8 }]} onPress={async () => {
                  try {
                    await useTreatments.getState().cancelTreatmentAlarms(editing.id);
                    setSelectedTimes([]);
                    setFrequencyType('daily');
                    setDaysOfWeek([]);
                    setEveryXHours('8');
                    Alert.alert('Listo', 'Se eliminaron las alarmas de este tratamiento');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'No se pudieron eliminar las alarmas');
                  }
                }}>
                  <Text style={styles.addBtnTextModern}>Eliminar alarmas</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={[styles.addBtnModern, { backgroundColor: '#64748b', marginLeft: 8 }]} onPress={() => { setModalVisible(false); setEditing(null); }}>
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
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 56,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnTextModern: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 17,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  progressText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  frequencyValue: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 15,
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
});


