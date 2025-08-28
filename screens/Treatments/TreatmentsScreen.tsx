import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTreatments } from '../../store/useTreatments';
import { useCurrentUser } from '../../store/useCurrentUser';
import OfflineIndicator from '../../components/OfflineIndicator';
import COLORS from '../../constants/colors';
import { GLOBAL_STYLES, MEDICAL_STYLES } from '../../constants/styles';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;
const isLandscape = width > height;

export default function TreatmentsScreen() {
  const { treatments, loading, error, getTreatments, createTreatment, updateTreatment, deleteTreatment } = useTreatments();
  const { profile } = useCurrentUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    frequency: 'daily',
    notes: ''
  });

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
      startDate: '',
      endDate: '',
      frequency: 'daily',
      notes: ''
    });
    setModalVisible(true);
  };

  const openEditModal = (treatment: any) => {
    setEditingTreatment(treatment);
    setFormData({
      name: treatment.name || '',
      description: treatment.description || '',
      startDate: treatment.startDate || '',
      endDate: treatment.endDate || '',
      frequency: treatment.frequency || 'daily',
      notes: treatment.notes || ''
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre del tratamiento es obligatorio');
      return;
    }

    try {
      const treatmentData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate || new Date().toISOString(),
        endDate: formData.endDate || null,
        frequency: formData.frequency,
        notes: formData.notes.trim(),
        patientProfileId: profile?.patientProfileId || profile?.id
      };

      if (editingTreatment) {
        await updateTreatment(editingTreatment.id, {
          ...treatmentData,
          endDate: treatmentData.endDate || undefined
        });
        Alert.alert('Éxito', 'Tratamiento actualizado correctamente');
      } else {
        await createTreatment({
          ...treatmentData,
          endDate: treatmentData.endDate || undefined
        });
        Alert.alert('Éxito', 'Tratamiento creado correctamente');
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
    } catch (error) {
      console.error('[TreatmentsScreen] Error:', error);
      Alert.alert('Error', 'No se pudo guardar el tratamiento');
    }
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
              await deleteTreatment(id);
              Alert.alert('Éxito', 'Tratamiento eliminado correctamente');
            } catch (error) {
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
    <LinearGradient colors={COLORS.gradients.primary as [string, string, string]} style={{ flex: 1 }}>
      <ScrollView 
        style={[
          GLOBAL_STYLES.container,
          isTablet && styles.containerTablet,
          isLandscape && styles.containerLandscape
        ]}
        contentContainerStyle={{
          paddingBottom: isTablet ? 48 : 32,
          paddingHorizontal: isTablet ? 24 : 16
        }}
      >
        <OfflineIndicator />
        
        <View style={[
          GLOBAL_STYLES.rowSpaced,
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
              perfilIncompleto && { opacity: 0.6 },
              isTablet && styles.addButtonTablet,
              isLandscape && styles.addButtonLandscape
            ]} 
            onPress={openCreateModal} 
            disabled={perfilIncompleto} 
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
                  ]}>{treatment.description || 'Sin nombre'}</Text>
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
                    onPress={() => openEditModal(treatment)}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar tratamiento ${treatment.description || 'Sin nombre'}`}
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
                    onPress={() => handleDelete(treatment.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar tratamiento ${treatment.description || 'Sin nombre'}`}
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
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                  />
                </View>
                
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.inputLabel,
                    isTablet && styles.inputLabelTablet
                  ]}>Frecuencia</Text>
                  <View style={[
                    GLOBAL_STYLES.row,
                    isTablet && styles.frequencyButtonsTablet
                  ]}>
                    {['daily', 'weekly', 'monthly'].map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          { 
                            paddingHorizontal: isTablet ? 20 : 16, 
                            paddingVertical: isTablet ? 12 : 8, 
                            borderRadius: 20, 
                            marginRight: isTablet ? 12 : 8,
                            backgroundColor: formData.frequency === freq ? COLORS.primary : COLORS.border.neutral
                          },
                          isTablet && styles.frequencyButtonTablet
                        ]}
                        onPress={() => setFormData({ ...formData, frequency: freq })}
                      >
                        <Text style={[
                          { 
                            color: formData.frequency === freq ? COLORS.text.inverse : COLORS.text.secondary,
                            fontWeight: formData.frequency === freq ? '600' : '400'
                          },
                          isTablet && styles.frequencyButtonTextTablet
                        ]}>
                          {freq === 'daily' ? 'Diario' : freq === 'weekly' ? 'Semanal' : 'Mensual'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.inputLabel,
                    isTablet && styles.inputLabelTablet
                  ]}>Fecha de inicio</Text>
                  <TextInput
                    style={[
                      GLOBAL_STYLES.input,
                      isTablet && styles.inputTablet
                    ]}
                    placeholder="YYYY-MM-DD (opcional)"
                    value={formData.startDate}
                    onChangeText={(text) => setFormData({ ...formData, startDate: text })}
                  />
                </View>
                
                <View style={[
                  { marginBottom: 10 },
                  isTablet && styles.inputGroupTablet
                ]}>
                  <Text style={[
                    GLOBAL_STYLES.inputLabel,
                    isTablet && styles.inputLabelTablet
                  ]}>Fecha de fin</Text>
                  <TextInput
                    style={[
                      GLOBAL_STYLES.input,
                      isTablet && styles.inputTablet
                    ]}
                    placeholder="YYYY-MM-DD (opcional)"
                    value={formData.endDate}
                    onChangeText={(text) => setFormData({ ...formData, endDate: text })}
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
                    isTablet && styles.modalButtonTablet
                  ]}
                  onPress={handleSubmit}
                >
                  <Text style={[
                    GLOBAL_STYLES.buttonText,
                    isTablet && styles.modalButtonTextTablet
                  ]}>
                    {editingTreatment ? 'Guardar cambios' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    GLOBAL_STYLES.buttonSecondary, 
                    { flex: 1, marginLeft: 8 },
                    isTablet && styles.modalButtonTablet
                  ]}
                  onPress={() => { setModalVisible(false); setEditingTreatment(null); }}
                >
                  <Text style={[
                    GLOBAL_STYLES.buttonTextSecondary,
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
