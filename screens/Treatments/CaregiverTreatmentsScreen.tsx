import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert, Dimensions, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTreatments } from '../../store/useTreatments';
import { useCaregiver } from '../../store/useCaregiver';
import { useOffline } from '../../store/useOffline';
import { LinearGradient } from 'expo-linear-gradient';
import CaregiverPatientSwitcher from '../../components/CaregiverPatientSwitcher';
import SelectedPatientBanner from '../../components/SelectedPatientBanner';
import DateSelector from '../../components/DateSelector';
import COLORS from '../../constants/colors';
import { GLOBAL_STYLES, MEDICAL_STYLES } from '../../constants/styles';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;
const isLandscape = width > height;

// Función para traducir frecuencias al español
const translateFrequency = (frequency: string): string => {
  const frequencyMap: Record<string, string> = {
    'DAILY': 'Diario',
    'daily': 'Diario',
    'WEEKLY': 'Semanal',
    'weekly': 'Semanal',
    'MONTHLY': 'Mensual',
    'monthly': 'Mensual',
    'AS_NEEDED': 'Según necesidad',
    'as_needed': 'Según necesidad',
    'as-needed': 'Según necesidad',
    'CUSTOM': 'Personalizado',
    'custom': 'Personalizado'
  };
  
  return frequencyMap[frequency] || frequency || 'Personalizado';
};

// Opciones para frecuencia de medicamentos
const MEDICATION_FREQUENCIES = [
  { value: '', label: 'Seleccionar frecuencia' },
  { value: 'cada 8 horas', label: 'Cada 8 horas' },
  { value: 'cada 12 horas', label: 'Cada 12 horas' },
  { value: 'cada 24 horas', label: 'Cada 24 horas' },
  { value: 'dos veces al día', label: 'Dos veces al día' },
  { value: 'tres veces al día', label: 'Tres veces al día' },
  { value: 'cuatro veces al día', label: 'Cuatro veces al día' },
  { value: 'antes de las comidas', label: 'Antes de las comidas' },
  { value: 'después de las comidas', label: 'Después de las comidas' },
  { value: 'con las comidas', label: 'Con las comidas' },
  { value: 'en ayunas', label: 'En ayunas' },
  { value: 'según necesidad', label: 'Según necesidad' },
  { value: 'una vez al día', label: 'Una vez al día' },
  { value: 'cada 6 horas', label: 'Cada 6 horas' },
  { value: 'cada 4 horas', label: 'Cada 4 horas' }
];

// Opciones para tipo de medicamento
const MEDICATION_TYPES = [
  { value: '', label: 'Seleccionar tipo' },
  { value: 'pastilla', label: 'Pastilla' },
  { value: 'tableta', label: 'Tableta' },
  { value: 'cápsula', label: 'Cápsula' },
  { value: 'comprimido', label: 'Comprimido' },
  { value: 'jarabe', label: 'Jarabe' },
  { value: 'suspensión', label: 'Suspensión' },
  { value: 'inyección', label: 'Inyección' },
  { value: 'parche', label: 'Parche' },
  { value: 'crema', label: 'Crema' },
  { value: 'pomada', label: 'Pomada' },
  { value: 'gel', label: 'Gel' },
  { value: 'gotas', label: 'Gotas' },
  { value: 'spray', label: 'Spray' },
  { value: 'inhalador', label: 'Inhalador' },
  { value: 'supositorio', label: 'Supositorio' },
  { value: 'polvo', label: 'Polvo' },
  { value: 'granulado', label: 'Granulado' }
];

export default function CaregiverTreatmentsScreen() {
  const { treatments, loading, error, getTreatments, createTreatment, updateTreatment, deleteTreatment, getTreatmentMedications, addMedicationToTreatment, updateTreatmentMedication, deleteTreatmentMedication } = useTreatments();
  const { selectedPatientId } = useCaregiver();
  const { isOnline } = useOffline();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    frequency: 'daily',
    notes: ''
  });

  // Lista de medicamentos (para crear/editar)
  const [medications, setMedications] = useState<Array<{ id?: string; name: string; dosage: string; frequency: string; type: string }>>([]);
  const [originalMedications, setOriginalMedications] = useState<Array<{ id: string; name: string; dosage: string; frequency: string; type: string }>>([]);

  useEffect(() => {
    if (selectedPatientId) getTreatments(selectedPatientId).catch(() => {});
  }, [selectedPatientId]);

    const openCreateModal = () => {
    setEditingTreatment(null);
    setFormData({
      name: '',
      description: '',
      startDate: undefined,
      endDate: undefined,
      frequency: 'daily',
      notes: ''
    });
    setMedications([]);
    setOriginalMedications([]);
    setModalVisible(true);
  };
  
  const openEditModal = async (treatment: any) => {
    setEditingTreatment(treatment);
    setFormData({
      name: treatment.name || treatment.title || '',
      description: treatment.description || '',
      startDate: treatment.startDate ? new Date(treatment.startDate) : undefined,
      endDate: treatment.endDate ? new Date(treatment.endDate) : undefined,
      frequency: treatment.frequency || 'daily',
      notes: treatment.notes || ''
    });
    
    // Cargar medicamentos actuales del tratamiento
    try {
      const meds = await getTreatmentMedications(treatment.id);
      const mapped = (meds || []).map((m: any) => ({ id: m.id, name: m.name || '', dosage: m.dosage || '', frequency: m.frequency || '', type: m.type || '' }));
      setMedications(mapped);
      setOriginalMedications(mapped as any);
    } catch (e) {
      console.error('[CUIDADOR-TRATAMIENTOS] Error cargando medicamentos:', e);
      setMedications([]);
      setOriginalMedications([]);
    }
    
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        Alert.alert('Faltan datos', 'Nombre es obligatorio');
        return;
      }

      // Validaciones de negocio previas al request
      if (formData.endDate && formData.startDate && formData.endDate <= formData.startDate) {
        Alert.alert('Error', 'La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }

      const treatmentData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: (formData.startDate || new Date()).toISOString(),
        endDate: formData.endDate ? formData.endDate.toISOString() : undefined,
        frequency: formData.frequency,
        notes: formData.notes.trim(),
        patientProfileId: selectedPatientId
      };

      if (editingTreatment) {
        // Actualizar tratamiento existente
        await updateTreatment(editingTreatment.id, treatmentData);

        // Manejar medicamentos para edición
        const currentById = new Map(medications.filter(m => m.id).map(m => [m.id!, m]));
        const byIdOriginal = new Map(originalMedications.map(m => [m.id, m]));

        const adds = medications.filter(m => !m.id && m.name?.trim());
        const updates = medications.filter(m => m.id && (() => {
          const orig = byIdOriginal.get(m.id!);
          if (!orig) return false;
          return orig.name !== m.name || orig.dosage !== m.dosage || orig.frequency !== m.frequency || (orig as any).type !== m.type;
        })());
        const deletions = [...byIdOriginal.keys()].filter(id => !currentById.has(id));

        try {
          // Validar medicamentos antes de sincronizar
          const validAdds = adds.filter(m => {
            const isValid = m.name?.trim() && m.dosage?.trim() && m.frequency?.trim() && m.type?.trim();
            if (!isValid) {
              console.warn('[CUIDADOR-TRATAMIENTOS] Medicamento omitido por campos incompletos:', m);
            }
            return isValid;
          });
          
          const validUpdates = updates.filter(m => {
            const isValid = m.name?.trim() && m.dosage?.trim() && m.frequency?.trim() && m.type?.trim();
            if (!isValid) {
              console.warn('[CUIDADOR-TRATAMIENTOS] Actualización de medicamento omitida por campos incompletos:', m);
            }
            return isValid;
          });

          await Promise.all([
            ...validAdds.map(m => addMedicationToTreatment(editingTreatment.id, { 
              name: m.name.trim(), 
              dosage: m.dosage.trim(), 
              frequency: m.frequency.trim(), 
              type: m.type.trim() 
            })),
            ...validUpdates.map(m => updateTreatmentMedication(editingTreatment.id, m.id!, { 
              name: m.name.trim(), 
              dosage: m.dosage.trim(), 
              frequency: m.frequency.trim(), 
              type: m.type.trim() 
            })),
            ...deletions.map(id => deleteTreatmentMedication(editingTreatment.id, id))
          ]);
        } catch (syncErr: any) {
          console.error('[CUIDADOR-TRATAMIENTOS] Error sincronizando medicamentos:', syncErr);
          
          // Determinar el tipo de error y mostrar mensaje apropiado
          let errorMessage = 'El tratamiento se guardó correctamente, pero algunos medicamentos no se pudieron sincronizar. Se reintentará automáticamente cuando haya conexión.';
          
          if (syncErr.message?.includes('permisos')) {
            errorMessage = 'El tratamiento se guardó correctamente, pero no tienes permisos para modificar algunos medicamentos. Contacta al administrador.';
          } else if (syncErr.message?.includes('no fue encontrado')) {
            errorMessage = 'El tratamiento se guardó correctamente, pero algunos medicamentos ya no existen. Se actualizará la lista automáticamente.';
          } else if (syncErr.message?.includes('no son válidos')) {
            errorMessage = 'El tratamiento se guardó correctamente, pero algunos medicamentos tienen datos incompletos. Revisa los campos requeridos.';
          }
          
          Alert.alert('Advertencia', errorMessage, [{ text: 'Entendido' }]);
        }
      } else {
        // Crear nuevo tratamiento
        // Preparar medicamentos para creación (solo los válidos no vacíos)
        const medsToCreate = medications
          .filter(m => m.name?.trim())
          .map(m => ({ name: m.name.trim(), dosage: (m.dosage || '').trim(), frequency: (m.frequency || '').trim(), type: (m.type || '').trim() }));

        await createTreatment({
          ...treatmentData,
          medications: medsToCreate
        });
      }

      // Resetear formulario
      setFormData({
        name: '',
        description: '',
        startDate: undefined,
        endDate: undefined,
        frequency: 'daily',
        notes: ''
      });
      setMedications([]);
      setOriginalMedications([]);
      setModalVisible(false);
      setEditingTreatment(null);
      
      // Mostrar mensaje de éxito
      Alert.alert('Éxito', editingTreatment ? 'Tratamiento actualizado correctamente' : 'Tratamiento creado correctamente');
    } catch (e: any) {
      console.error('[CUIDADOR-TRATAMIENTOS] Error general:', e);
      Alert.alert('Error', e.message || 'No se pudo guardar el tratamiento');
    }
  };

  const onDelete = async (id: string) => {
    Alert.alert('Eliminar', '¿Eliminar este tratamiento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteTreatment(id); } },
    ]);
  };

  // Helpers UI medicamentos
  const addMedicationRow = () => {
    setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', type: '' }]);
  };
  const updateMedicationField = (index: number, field: 'name' | 'dosage' | 'frequency' | 'type', value: string) => {
    setMedications(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };
  const removeMedicationRow = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
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
        <TouchableOpacity style={[styles.addBtnModern, !isOnline && { opacity: 0.5 }]} onPress={openCreateModal} activeOpacity={0.85} disabled={!isOnline}>
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
                <TouchableOpacity style={[styles.iconBtnModern, !isOnline && { opacity: 0.5 }]} onPress={() => isOnline && openEditModal(t)} disabled={!isOnline}>
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
                  {translateFrequency((t as any).frequency)}
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

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => { setModalVisible(false); setEditingTreatment(null); }}>
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
              ]}>{editingTreatment ? 'Editar Tratamiento' : 'Agregar Tratamiento'}</Text>
                
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.inputLabel,
                    isTablet && styles.inputLabelTablet
                  ]}>Nombre *</Text>
                  <TextInput
                    style={[
                      GLOBAL_STYLES.input,
                      isTablet && styles.inputTablet
                    ]}
                    placeholder="Nombre del tratamiento"
                    placeholderTextColor={COLORS.text.secondary}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>
                
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.inputLabel,
                    isTablet && styles.inputLabelTablet
                  ]}>Descripción</Text>
                  <TextInput
                    style={[
                      GLOBAL_STYLES.input, 
                      { height: isTablet ? 80 : 60 },
                      isTablet && styles.inputTablet
                    ]}
                    placeholder="Descripción del tratamiento"
                    placeholderTextColor={COLORS.text.secondary}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                  />
                </View>
                
                {/* Lista de medicamentos */}
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.inputLabel,
                    isTablet && styles.inputLabelTablet
                  ]}>Medicamentos</Text>

                  {medications.length === 0 ? (
                    <Text style={[GLOBAL_STYLES.caption, { marginBottom: 8 }]}>No hay medicamentos. Agrega uno con el botón +</Text>
                  ) : null}

                  {medications.map((med, idx) => (
                    <View key={med.id || idx} style={{ marginBottom: 8 }}>
                      <View style={[GLOBAL_STYLES.row, { gap: 8 }]}>
                        <TextInput
                          style={[GLOBAL_STYLES.input, { flex: 1 }, isTablet && styles.inputTablet]}
                          placeholder="Nombre"
                          placeholderTextColor={COLORS.text.secondary}
                          value={med.name}
                          onChangeText={(t) => updateMedicationField(idx, 'name', t)}
                        />
                        <TextInput
                          style={[GLOBAL_STYLES.input, { flex: 1 }, isTablet && styles.inputTablet]}
                          placeholder="Dosis (ej. 10mg)"
                          placeholderTextColor={COLORS.text.secondary}
                          value={med.dosage}
                          onChangeText={(t) => updateMedicationField(idx, 'dosage', t)}
                        />
                      </View>
                      <View style={[GLOBAL_STYLES.row, { gap: 8, marginTop: 6 }]}>
                        <View style={[styles.pickerContainer, { flex: 1 }]}>
                          <Picker
                            selectedValue={med.frequency || ''}
                            onValueChange={(value) => updateMedicationField(idx, 'frequency', value)}
                            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                            dropdownIconColor={Platform.OS === 'android' ? COLORS.text.secondary : undefined}
                            style={[styles.picker, isTablet && styles.pickerTablet]}
                          >
                            {MEDICATION_FREQUENCIES.map((freq) => (
                              <Picker.Item key={freq.value} label={freq.label} value={freq.value} />
                            ))}
                          </Picker>
                        </View>
                        <View style={[styles.pickerContainer, { flex: 1 }]}>
                          <Picker
                            selectedValue={med.type || ''}
                            onValueChange={(value) => updateMedicationField(idx, 'type', value)}
                            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                            dropdownIconColor={Platform.OS === 'android' ? COLORS.text.secondary : undefined}
                            style={[styles.picker, isTablet && styles.pickerTablet]}
                          >
                            {MEDICATION_TYPES.map((type) => (
                              <Picker.Item key={type.value} label={type.label} value={type.value} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      <View style={[GLOBAL_STYLES.row, { justifyContent: 'flex-end', marginTop: 6 }]}>
                        <TouchableOpacity
                          onPress={() => removeMedicationRow(idx)}
                          style={[MEDICAL_STYLES.actionButton, { backgroundColor: COLORS.error }]}>
                          <Ionicons name="remove-circle-outline" size={20} color={COLORS.text.inverse} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={addMedicationRow}
                    style={[GLOBAL_STYLES.buttonSecondary, { alignSelf: 'flex-start', marginTop: 8 }]}>
                    <Text style={GLOBAL_STYLES.buttonTextSecondary}>+ Agregar medicamento</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <DateSelector
                    value={formData.startDate}
                    onDateChange={(date) => setFormData({ ...formData, startDate: date })}
                    label="Fecha de inicio"
                    placeholder="Seleccionar fecha de inicio"
                    required={false}
                    minDate={undefined}
                  />
                </View>
                
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <DateSelector
                    value={formData.endDate}
                    onDateChange={(date) => setFormData({ ...formData, endDate: date })}
                    label="Fecha de fin"
                    placeholder="Seleccionar fecha de fin (opcional)"
                    required={false}
                    minDate={formData.startDate}
                  />
                </View>
                
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.inputLabel,
                    isTablet && styles.inputLabelTablet
                  ]}>Notas</Text>
                  <TextInput
                    style={[
                      GLOBAL_STYLES.input, 
                      { height: isTablet ? 80 : 60 },
                      isTablet && styles.inputTablet
                    ]}
                    placeholder="Notas adicionales"
                    value={formData.notes}
                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                    multiline
                  />
                </View>
              </ScrollView>
              
              <View style={[
                GLOBAL_STYLES.rowSpaced,
                isTablet && styles.modalActionsTablet,
                isLandscape && styles.modalActionsLandscape
              ]}>
                <TouchableOpacity
                  style={[
                  GLOBAL_STYLES.buttonPrimary, 
                  { flex: 1, marginRight: 8 },
                  styles.modalButton,
                    isTablet && styles.modalButtonTablet
                  ]}
                  onPress={handleSubmit}
                >
                  <Text style={[
                  GLOBAL_STYLES.buttonText,
                  styles.modalButtonText,
                    isTablet && styles.modalButtonTextTablet
                  ]}>
                    {editingTreatment ? 'Guardar cambios' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                  GLOBAL_STYLES.buttonSecondary, 
                  { flex: 1, marginLeft: 8 },
                  styles.modalButton,
                    isTablet && styles.modalButtonTablet
                  ]}
                  onPress={() => { setModalVisible(false); setEditingTreatment(null); }}
                >
                  <Text style={[
                  GLOBAL_STYLES.buttonTextSecondary,
                  styles.modalButtonText,
                    isTablet && styles.modalButtonTextTablet
                  ]}>Cancelar</Text>
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
    maxHeight: '90%',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Estilos responsive para tablets
  containerTablet: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  containerLandscape: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerRowTablet: {
    marginBottom: 24,
  },
  headerRowLandscape: {
    marginBottom: 20,
  },
  headerTitleTablet: {
    fontSize: 28,
  },
  headerTitleLandscape: {
    fontSize: 24,
  },
  modalContentTablet: {
    width: '90%',
    maxHeight: '85%',
    padding: 32,
  },
  modalContentLandscape: {
    width: '95%',
    maxHeight: '90%',
    padding: 24,
  },
  modalTitleTablet: {
    fontSize: 24,
    marginBottom: 24,
  },
  modalTitleLandscape: {
    fontSize: 22,
    marginBottom: 20,
  },
  modalActionsTablet: {
    paddingTop: 24,
    gap: 16,
  },
  modalActionsLandscape: {
    paddingTop: 20,
    gap: 12,
  },
  modalButtonTablet: {
    paddingVertical: 16,
    borderRadius: 16,
  },
  modalButtonTextTablet: {
    fontSize: 18,
  },
  inputGroupTablet: {
    marginBottom: 16,
  },
  inputLabelTablet: {
    fontSize: 16,
    marginBottom: 8,
  },
  inputTablet: {
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
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
  
  // Estilos para pickers de medicamentos
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  picker: {
    color: '#1e293b',
    fontSize: 15,
  },
  pickerTablet: {
    fontSize: 16,
  },
});


