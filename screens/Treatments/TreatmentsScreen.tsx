import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTreatments } from '../../store/useTreatments';
import { useCurrentUser } from '../../store/useCurrentUser';
import OfflineIndicator from '../../components/OfflineIndicator';
import AlarmScheduler from '../../components/AlarmScheduler';
import DateSelector from '../../components/DateSelector';
import COLORS from '../../constants/colors';
import { GLOBAL_STYLES, MEDICAL_STYLES } from '../../constants/styles';
import { validateTreatment } from '../../lib/treatmentValidator';
import { useOffline } from '../../store/useOffline';
import { getExistingAlarmsForElement } from '../../lib/alarmHelper';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;
const isLandscape = width > height;

export default function TreatmentsScreen() {
  const { treatments, loading, error, getTreatments, createTreatment, updateTreatment, deleteTreatment, scheduleTreatmentAlarms, cancelTreatmentAlarms, rescheduleTreatmentAlarms, getTreatmentMedications, addMedicationToTreatment, updateTreatmentMedication, deleteTreatmentMedication } = useTreatments();
  const { profile } = useCurrentUser();
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

  // Estados para configuración de alarmas
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'daysOfWeek' | 'everyXHours'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [everyXHours, setEveryXHours] = useState('8');
  const { isOnline } = useOffline();

  const perfilIncompleto = !profile?.patientProfileId && !profile?.id;

  useEffect(() => {
    if (profile?.patientProfileId) {
      console.log('[TRATAMIENTOS] Cargando tratamientos para perfil:', profile.patientProfileId);
      getTreatments().catch((e) => {
        console.log('[TRATAMIENTOS] Error:', e.message || e);
      });
    } else {
      console.log('[TRATAMIENTOS] No hay patientProfileId disponible:', profile);
    }
  }, [profile?.patientProfileId]);

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
    setSelectedTimes([]);
    setFrequencyType('daily');
    setDaysOfWeek([]);
    setEveryXHours('8');
    setModalVisible(true);
  };

  const openEditModal = async (treatment: any) => {
    setEditingTreatment(treatment);
    setFormData({
      name: treatment.title || treatment.name || '',
      description: treatment.description || '',
      startDate: treatment.startDate ? new Date(treatment.startDate) : undefined,
      endDate: treatment.endDate ? new Date(treatment.endDate) : undefined,
      frequency: treatment.frequency || 'daily',
      notes: treatment.notes || ''
    });
    
    // Cargar alarmas existentes para el tratamiento
    try {
      let existingAlarms = await getExistingAlarmsForElement('treatment', treatment.id);
      // Fallback al motor de alarmas en memoria si no se encuentra nada
      if (!existingAlarms || existingAlarms.selectedTimes.length === 0) {
        const engine = require('../../lib/alarmHelper');
        const engineAlarms = engine.getExistingAlarmsFromEngine('treatment', treatment.id);
        if (engineAlarms) existingAlarms = engineAlarms;
      }
      setSelectedTimes(existingAlarms.selectedTimes);
      setFrequencyType(existingAlarms.frequencyType);
      setDaysOfWeek(existingAlarms.daysOfWeek);
      setEveryXHours(existingAlarms.everyXHours);
    } catch (error) {
      console.error('[TRATAMIENTOS] Error cargando alarmas existentes:', error);
      // Resetear a valores por defecto si hay error
      setSelectedTimes([]);
      setFrequencyType('daily');
      setDaysOfWeek([]);
      setEveryXHours('8');
    }
    
    // Cargar medicamentos actuales del tratamiento
    try {
      const meds = await getTreatmentMedications(treatment.id);
      const mapped = (meds || []).map((m: any) => ({ id: m.id, name: m.name || '', dosage: m.dosage || '', frequency: m.frequency || '', type: m.type || '' }));
      setMedications(mapped);
      setOriginalMedications(mapped as any);
    } catch (e) {
      console.log('[TRATAMIENTOS] No se pudieron cargar medicamentos:', (e as any)?.message);
      setMedications([]);
      setOriginalMedications([]);
    }

    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const treatmentData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: (formData.startDate || new Date()).toISOString(),
        endDate: formData.endDate ? formData.endDate.toISOString() : undefined,
        frequency: formData.frequency,
        notes: formData.notes.trim(),
        patientProfileId: profile?.patientProfileId || profile?.id
      };

      // Validar datos antes de enviar
      const validation = validateTreatment(treatmentData);
      if (!validation.isValid) {
        Alert.alert('Error de validación', validation.errors.join('\n'));
        return;
      }

      let treatmentId = editingTreatment?.id;
      
      if (editingTreatment) {
        await updateTreatment(editingTreatment.id, {
          ...treatmentData,
          endDate: treatmentData.endDate || undefined
        });
        treatmentId = editingTreatment.id;

        // Sincronizar medicamentos (diff entre originalMedications y medications)
        const byIdOriginal = new Map(originalMedications.filter(m => !!m.id).map(m => [m.id!, m]));
        const currentById = new Map(medications.filter(m => !!m.id).map(m => [m.id!, m]));

        const adds = medications.filter(m => !m.id && m.name.trim());
        const updates = medications.filter(m => m.id && (() => {
          const orig = byIdOriginal.get(m.id!);
          if (!orig) return false;
          return orig.name !== m.name || orig.dosage !== m.dosage || orig.frequency !== m.frequency || (orig as any).type !== m.type;
        })());
        const deletions = [...byIdOriginal.keys()].filter(id => !currentById.has(id));

        try {
          await Promise.all([
            ...adds.map(m => addMedicationToTreatment(editingTreatment.id, { name: m.name.trim(), dosage: m.dosage.trim(), frequency: m.frequency.trim(), type: m.type.trim() })),
            ...updates.map(m => updateTreatmentMedication(editingTreatment.id, m.id!, { name: m.name.trim(), dosage: m.dosage.trim(), frequency: m.frequency.trim(), type: m.type.trim() })),
            ...deletions.map(id => deleteTreatmentMedication(editingTreatment.id, id))
          ]);
        } catch (syncErr: any) {
          console.log('[TreatmentsScreen] Aviso: algunos medicamentos quedaron pendientes de sincronización:', syncErr?.message || syncErr);
          // Ya se guardaron localmente como pendientes y se verán en el editor; evitamos alerta bloqueante.
        }

        Alert.alert('Éxito', 'Tratamiento actualizado correctamente');
      } else {
        // Preparar medicamentos para creación (solo los válidos no vacíos)
        const medsToCreate = medications
          .filter(m => m.name?.trim())
          .map(m => ({ name: m.name.trim(), dosage: (m.dosage || '').trim(), frequency: (m.frequency || '').trim(), type: (m.type || '').trim() }));

        await createTreatment({
          ...treatmentData,
          endDate: treatmentData.endDate || undefined,
          medications: medsToCreate
        } as any);
        // Obtener el ID del tratamiento recién creado
        await new Promise(res => setTimeout(res, 500));
        const newTreatment = treatments.find(t => t.title === treatmentData.name && t.startDate === treatmentData.startDate);
        treatmentId = newTreatment?.id;
        Alert.alert('Éxito', 'Tratamiento creado correctamente');
      }

      // Programar alarmas para el tratamiento
      if (treatmentId) {
        const treatment = {
          id: treatmentId,
          title: treatmentData.name,
          description: treatmentData.description,
          startDate: treatmentData.startDate,
          endDate: treatmentData.endDate,
          frequency: treatmentData.frequency,
          notes: treatmentData.notes,
          patientProfileId: treatmentData.patientProfileId,
        };

        const alarmConfig = {
          frequency: (frequencyType === 'daily' ? 'daily' : frequencyType === 'daysOfWeek' ? 'weekly' : 'interval') as 'daily' | 'weekly' | 'interval',
          daysOfWeek: frequencyType === 'daysOfWeek' ? daysOfWeek : undefined,
          intervalHours: frequencyType === 'everyXHours' ? parseInt(everyXHours) : undefined,
          time: selectedTimes.length > 0 ? selectedTimes[0].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '09:00',
        };

        try {
          if (editingTreatment) {
            // Reprogramar alarmas existentes
            await rescheduleTreatmentAlarms(treatment, alarmConfig);
          } else {
            // Programar nuevas alarmas
            await scheduleTreatmentAlarms(treatment, alarmConfig);
          }
          console.log('[TreatmentsScreen] Alarmas programadas exitosamente');
        } catch (alarmError) {
          console.error('[TreatmentsScreen] Error programando alarmas:', alarmError);
          Alert.alert('Advertencia', 'El tratamiento se guardó pero hubo un problema programando las alarmas. Puedes configurarlas manualmente después.');
        }
      }

      setModalVisible(false);
      setEditingTreatment(null);
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        frequency: 'daily',
        notes: ''
      });
      setMedications([]);
      setOriginalMedications([]);
    } catch (error) {
      console.error('[TreatmentsScreen] Error:', error);
      Alert.alert('Error', 'No se pudo guardar el tratamiento');
    }
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

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Eliminar tratamiento',
      '¿Seguro que deseas eliminar este tratamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Cancelar alarmas primero
              await cancelTreatmentAlarms(id);
              // Eliminar tratamiento
              await deleteTreatment(id);
              Alert.alert('Éxito', 'Tratamiento eliminado correctamente');
              console.log('[TreatmentsScreen] Tratamiento eliminado y alarmas canceladas');
            } catch (error) {
              console.error('[TreatmentsScreen] Error eliminando tratamiento:', error);
              Alert.alert('Error', 'No se pudo eliminar el tratamiento');
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={GLOBAL_STYLES.centered}>
        <Text style={GLOBAL_STYLES.bodyText}>Cargando tratamientos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={GLOBAL_STYLES.centered}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={GLOBAL_STYLES.sectionHeader}>Error</Text>
        <Text style={GLOBAL_STYLES.bodyText}>{error}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradients.primary as [string, string, string]} style={{ flex: 1, marginTop: 20}}>
      <ScrollView 
        style={[
          GLOBAL_STYLES.container,
          isTablet && styles.containerTablet,
          isLandscape && styles.containerLandscape
        ]}
        contentContainerStyle={{
          paddingBottom: isTablet ? 48 : 32,
          paddingHorizontal: isTablet ? 24 : 16,
          paddingTop: 60
        }}
      >
        <OfflineIndicator />
        
        <View style={[
          GLOBAL_STYLES.rowSpaced,
          { marginTop: 20 },
          isTablet && styles.headerRowTablet,
          isLandscape && styles.headerRowLandscape
        ]}>
          <Text style={[
            GLOBAL_STYLES.sectionHeader,
            isTablet && styles.headerTitleTablet,
            isLandscape && styles.headerTitleLandscape
          ]}>Tratamientos</Text>
          <TouchableOpacity 
            style={[
              GLOBAL_STYLES.buttonPrimary,
              (perfilIncompleto || !isOnline) && { opacity: 0.6 },
              isTablet && styles.addButtonTablet,
              isLandscape && styles.addButtonLandscape
            ]} 
            onPress={openCreateModal} 
            disabled={perfilIncompleto || !isOnline} 
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Agregar nuevo tratamiento"
            accessibilityHint={perfilIncompleto ? "Completa tu perfil primero" : "Abre el formulario para agregar un tratamiento"}
          >
            <Ionicons 
              name="add-circle" 
              size={isTablet ? 32 : 28} 
              color={COLORS.text.inverse} 
            />
            <Text style={[
              GLOBAL_STYLES.buttonText,
              isTablet && styles.buttonTextTablet
            ]}>Nuevo</Text>
          </TouchableOpacity>
        </View>

        {perfilIncompleto && (
          <View style={[
            GLOBAL_STYLES.card, 
            { backgroundColor: COLORS.error + '20', borderColor: COLORS.error },
            isTablet && styles.warningCardTablet,
            isLandscape && styles.warningCardLandscape
          ]}>
            <Text style={[
              GLOBAL_STYLES.bodyText, 
              { color: COLORS.error, textAlign: 'center' },
              isTablet && styles.warningTextTablet
            ]}>
              Completa tu perfil para poder agregar tratamientos.
            </Text>
          </View>
        )}

        {(!treatments || treatments.length === 0) ? (
          <View style={[
            GLOBAL_STYLES.centered,
            isTablet && styles.emptyStateTablet,
            isLandscape && styles.emptyStateLandscape
          ]}>
            <Text style={[
              GLOBAL_STYLES.bodyText,
              isTablet && styles.emptyTextTablet
            ]}>No hay tratamientos registrados.</Text>
          </View>
        ) : (
          treatments.map((treatment) => (
            <View 
              key={treatment.id} 
              style={[
                MEDICAL_STYLES.treatmentCard,
                isTablet && styles.treatmentCardTablet,
                isLandscape && styles.treatmentCardLandscape
              ]}
            >
              <View style={[
                GLOBAL_STYLES.rowSpaced,
                isTablet && styles.cardHeaderTablet,
                isLandscape && styles.cardHeaderLandscape
              ]}>
                <View style={GLOBAL_STYLES.row}>
                  <MaterialCommunityIcons 
                    name="medical-bag" 
                    size={isTablet ? 28 : 24} 
                    color={COLORS.medical.treatment} 
                    style={GLOBAL_STYLES.icon} 
                  />
                  <Text style={[
                    GLOBAL_STYLES.sectionTitle, 
                    { marginBottom: 0 },
                    isTablet && styles.treatmentTitleTablet
                  ]}>{treatment.title || treatment.name || 'Sin nombre'}</Text>
                </View>
                <View style={[
                  GLOBAL_STYLES.row,
                  isTablet && styles.actionButtonsTablet
                ]}>
                  <TouchableOpacity 
                    style={[
                      MEDICAL_STYLES.actionButton,
                      isTablet && styles.actionButtonTablet
                    ]} 
                    onPress={() => isOnline && openEditModal(treatment)}
                    disabled={!isOnline}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar tratamiento ${treatment.name || 'Sin nombre'}`}
                  >
                    <Ionicons 
                      name="create-outline" 
                      size={isTablet ? 24 : 20} 
                      color={COLORS.text.inverse} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      MEDICAL_STYLES.actionButton, 
                      { backgroundColor: COLORS.error },
                      isTablet && styles.actionButtonTablet
                    ]} 
                    onPress={() => isOnline && handleDelete(treatment.id)}
                    disabled={!isOnline}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar tratamiento ${treatment.name || 'Sin nombre'}`}
                  >
                    <Ionicons 
                      name="trash-outline" 
                      size={isTablet ? 24 : 20} 
                      color={COLORS.text.inverse} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              {treatment.description && (
                <Text style={[
                  GLOBAL_STYLES.bodyText,
                  isTablet && styles.descriptionTextTablet
                ]}>{treatment.description}</Text>
              )}
              
              <View style={[
                GLOBAL_STYLES.rowSpaced,
                isTablet && styles.infoRowTablet
              ]}>
                <Text style={[
                  GLOBAL_STYLES.bodyText,
                  isTablet && styles.labelTextTablet
                ]}>Frecuencia:</Text>
                <Text style={[
                  GLOBAL_STYLES.bodyText, 
                  { fontWeight: '600', color: COLORS.text.primary },
                  isTablet && styles.valueTextTablet
                ]}>
                                    {'Personalizado'}
                </Text>
              </View>
              
              <View style={[
                GLOBAL_STYLES.rowSpaced,
                isTablet && styles.infoRowTablet
              ]}>
                <Text style={[
                  GLOBAL_STYLES.bodyText,
                  isTablet && styles.labelTextTablet
                ]}>Inicio:</Text>
                <Text style={[
                  GLOBAL_STYLES.bodyText, 
                  { fontWeight: '600', color: COLORS.text.primary },
                  isTablet && styles.valueTextTablet
                ]}>
                  {treatment.startDate ? new Date(treatment.startDate).toLocaleDateString() : '—'}
                </Text>
              </View>
              
              {treatment.endDate && (
                <View style={[
                  GLOBAL_STYLES.rowSpaced,
                  isTablet && styles.infoRowTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.bodyText,
                    isTablet && styles.labelTextTablet
                  ]}>Fin:</Text>
                  <Text style={[
                    GLOBAL_STYLES.bodyText, 
                    { fontWeight: '600', color: COLORS.text.primary },
                    isTablet && styles.valueTextTablet
                  ]}>
                    {new Date(treatment.endDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
              
              {treatment.description && (
                <View style={[
                  GLOBAL_STYLES.card, 
                  { marginTop: 12, marginBottom: 0, padding: 12 },
                  isTablet && styles.notesCardTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.caption,
                    isTablet && styles.notesTextTablet
                  ]}>{treatment.description}</Text>
                </View>
              )}

              {/* Resumen de medicamentos (si el backend devuelve medications en el objeto tratamiento) */}
              {Array.isArray((treatment as any).medications) && (treatment as any).medications.length > 0 ? (
                <View style={[GLOBAL_STYLES.card, { marginTop: 12, padding: 12 }]}>
                  <Text style={[GLOBAL_STYLES.bodyText, { fontWeight: '600', marginBottom: 6 }]}>Medicamentos</Text>
                  {(treatment as any).medications.slice(0, 3).map((m: any) => (
                    <Text key={m.id || m.name} style={GLOBAL_STYLES.caption}>
                      - {m.name} {m.dosage ? `(${m.dosage})` : ''} {m.frequency ? `• ${m.frequency}` : ''}
                    </Text>
                  ))}
                  {(treatment as any).medications.length > 3 ? (
                    <Text style={[GLOBAL_STYLES.caption, { color: COLORS.text.secondary, marginTop: 4 }]}>
                      y {(treatment as any).medications.length - 3} más
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        )}

        {/* Modal para crear/editar tratamiento */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => { setModalVisible(false); setEditingTreatment(null); }}
        >
          <View style={[
            GLOBAL_STYLES.loadingContainer,
            isTablet && styles.modalOverlayTablet
          ]}>
            <View style={[
              GLOBAL_STYLES.card, 
              { 
                width: isTablet ? '70%' : '95%', 
                maxWidth: isTablet ? 600 : undefined,
                maxHeight: '90%', 
                padding: isTablet ? 32 : 24 
              },
              isTablet && styles.modalContentTablet,
              isLandscape && styles.modalContentLandscape
            ]}>
              <ScrollView 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ 
                  paddingBottom: 20,
                  paddingHorizontal: isTablet ? 8 : 0
                }}
              >
                <Text style={[
                  GLOBAL_STYLES.sectionHeader,
                  isTablet && styles.modalTitleTablet,
                  isLandscape && styles.modalTitleLandscape
                ]}>
                  {editingTreatment ? 'Editar Tratamiento' : 'Agregar Tratamiento'}
                </Text>
                
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
                        <TextInput
                          style={[GLOBAL_STYLES.input, { flex: 1 }, isTablet && styles.inputTablet]}
                          placeholder="Frecuencia (ej. cada 12 horas)"
                          placeholderTextColor={COLORS.text.secondary}
                          value={med.frequency}
                          onChangeText={(t) => updateMedicationField(idx, 'frequency', t)}
                        />
                        <TextInput
                          style={[GLOBAL_STYLES.input, { flex: 1 }, isTablet && styles.inputTablet]}
                          placeholder="Tipo (ej. pastilla)"
                          placeholderTextColor={COLORS.text.secondary}
                          value={med.type}
                          onChangeText={(t) => updateMedicationField(idx, 'type', t)}
                        />
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
                  title="Recordatorios de Tratamiento"
                  subtitle="Configura cuándo quieres recibir recordatorios para tu tratamiento"
                />
                
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
                {editingTreatment ? (
                  <TouchableOpacity
                    style={[
                      GLOBAL_STYLES.buttonWarning,
                  { flex: 1, marginHorizontal: 8 },
                  styles.modalButton,
                      isTablet && styles.modalButtonTablet
                    ]}
                    onPress={async () => {
                      try {
                        await cancelTreatmentAlarms(editingTreatment.id);
                        setSelectedTimes([]);
                        setFrequencyType('daily');
                        setDaysOfWeek([]);
                        setEveryXHours('8');
                        Alert.alert('Listo', 'Se eliminaron las alarmas de este tratamiento');
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'No se pudieron eliminar las alarmas');
                      }
                    }}
                  >
                    <Text style={[
                      GLOBAL_STYLES.buttonText,
                      isTablet && styles.modalButtonTextTablet
                    ]}>Eliminar alarmas</Text>
                  </TouchableOpacity>
                ) : null}
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
     </LinearGradient>
   );
 }

const styles = StyleSheet.create({
  // Estilos para tablets
  containerTablet: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  containerLandscape: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Header responsive
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
  
  // Botón agregar responsive
  addButtonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  addButtonLandscape: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonTextTablet: {
    fontSize: 18,
    marginLeft: 12,
  },
  
  // Estado vacío responsive
  emptyStateTablet: {
    paddingVertical: 40,
  },
  emptyStateLandscape: {
    paddingVertical: 30,
  },
  emptyTextTablet: {
    fontSize: 18,
  },
  
  // Tarjetas de tratamiento responsive
  treatmentCardTablet: {
    padding: 24,
    marginBottom: 20,
    borderRadius: 20,
  },
  treatmentCardLandscape: {
    padding: 20,
    marginBottom: 18,
  },
  
  // Encabezado de tarjeta responsive
  cardHeaderTablet: {
    marginBottom: 16,
  },
  cardHeaderLandscape: {
    marginBottom: 14,
  },
  treatmentTitleTablet: {
    fontSize: 20,
  },
  
  // Botones de acción responsive
  actionButtonsTablet: {
    gap: 12,
  },
  actionButtonTablet: {
    padding: 12,
    borderRadius: 12,
  },
  
  // Información de tratamiento responsive
  infoRowTablet: {
    marginBottom: 12,
  },
  labelTextTablet: {
    fontSize: 16,
  },
  valueTextTablet: {
    fontSize: 16,
  },
  
  // Descripción responsive
  descriptionTextTablet: {
    fontSize: 16,
    lineHeight: 24,
  },
  
  // Notas responsive
  notesCardTablet: {
    padding: 16,
    marginTop: 16,
  },
  notesTextTablet: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Modal responsive
  modalOverlayTablet: {
    padding: 20,
  },
  modalContentTablet: {
    borderRadius: 24,
    elevation: 8,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalContentLandscape: {
    width: '85%',
    maxHeight: '80%',
    padding: 20,
  },
  modalTitleTablet: {
    fontSize: 24,
    marginBottom: 24,
  },
  modalTitleLandscape: {
    fontSize: 22,
    marginBottom: 20,
  },
  
  // Campos del formulario responsive
  inputGroupTablet: {
    marginBottom: 16,
  },
  inputLabelTablet: {
    fontSize: 16,
    marginBottom: 8,
  },
  inputTablet: {
    padding: 16,
    fontSize: 16,
    borderRadius: 12,
  },
  
  // Botones de frecuencia responsive
  frequencyButtonsTablet: {
    gap: 16,
    marginTop: 8,
  },
  frequencyButtonTablet: {
    minWidth: 100,
    alignItems: 'center',
  },
  frequencyButtonTextTablet: {
    fontSize: 16,
  },
  
  // Acciones del modal responsive
  modalActionsTablet: {
    marginTop: 24,
    gap: 16,
  },
  modalActionsLandscape: {
    marginTop: 20,
  },
  modalButtonTablet: {
    paddingVertical: 16,
    borderRadius: 12,
  },
  // Botones de modal más grandes
  modalButton: {
    paddingVertical: 18,
    minHeight: 56,
    borderRadius: 14,
  },
  modalButtonText: {
    fontSize: 16,
  },
  modalButtonTextTablet: {
    fontSize: 16,
  },
  
  // Advertencia responsive
  warningCardTablet: {
    padding: 20,
    marginBottom: 16,
  },
  warningCardLandscape: {
    padding: 16,
    marginBottom: 12,
  },
  warningTextTablet: {
    fontSize: 16,
  },
});
