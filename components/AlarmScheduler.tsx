import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import COLORS from '../constants/colors';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface AlarmSchedulerProps {
  selectedTimes: Date[];
  setSelectedTimes: (times: Date[]) => void;
  frequencyType: 'daily' | 'daysOfWeek' | 'everyXHours';
  setFrequencyType: (type: 'daily' | 'daysOfWeek' | 'everyXHours') => void;
  daysOfWeek: number[];
  setDaysOfWeek: (days: number[]) => void;
  everyXHours: string;
  setEveryXHours: (hours: string) => void;
  title?: string;
  subtitle?: string;
}

export default function AlarmScheduler({
  selectedTimes,
  setSelectedTimes,
  frequencyType,
  setFrequencyType,
  daysOfWeek,
  setDaysOfWeek,
  everyXHours,
  setEveryXHours,
  title = "Configurar Recordatorios",
  subtitle = "Selecciona cuándo quieres recibir las notificaciones"
}: AlarmSchedulerProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);

  const addTime = (date: Date) => {
    setSelectedTimes(prev => [...prev, date]);
    setShowTimePicker(false);
    setShowCustomTimeModal(false);
  };

  const removeTime = (idx: number) => {
    setSelectedTimes(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
  };

  const getDayShort = (day: number) => {
    const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return days[day];
  };

  const handleFrequencyChange = (type: 'daily' | 'daysOfWeek' | 'everyXHours') => {
    setFrequencyType(type);
    // Limpiar configuraciones específicas al cambiar tipo
    if (type === 'daily') {
      setDaysOfWeek([]);
      setEveryXHours('8');
    } else if (type === 'daysOfWeek') {
      setEveryXHours('8');
    } else if (type === 'everyXHours') {
      setDaysOfWeek([]);
    }
  };

  const showQuickTimePresets = () => {
    Alert.alert(
      'Horarios Comunes',
      'Selecciona un horario predefinido',
      [
        { text: 'Mañana (8:00)', onPress: () => addTime(new Date(2024, 0, 1, 8, 0)) },
        { text: 'Mediodía (12:00)', onPress: () => addTime(new Date(2024, 0, 1, 12, 0)) },
        { text: 'Tarde (15:00)', onPress: () => addTime(new Date(2024, 0, 1, 15, 0)) },
        { text: 'Noche (20:00)', onPress: () => addTime(new Date(2024, 0, 1, 20, 0)) },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const showCustomTimeSelector = () => {
    setShowCustomTimeModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Título y descripción */}
      <View style={styles.header}>
        <MaterialCommunityIcons 
          name="alarm" 
          size={isTablet ? 28 : 24} 
          color={COLORS.primary} 
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {/* Tipo de frecuencia */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Cuándo quieres recibir recordatorios?</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.frequencyContainer}
        >
          <TouchableOpacity
            style={[
              styles.frequencyCard,
              frequencyType === 'daily' && styles.frequencyCardActive
            ]}
            onPress={() => handleFrequencyChange('daily')}
            accessibilityRole="button"
            accessibilityLabel="Recordatorios diarios"
            accessibilityHint="Selecciona para recibir recordatorios todos los días"
          >
            <Ionicons 
              name="calendar" 
              size={isTablet ? 24 : 20} 
              color={frequencyType === 'daily' ? COLORS.text.inverse : COLORS.text.secondary} 
            />
            <Text style={[
              styles.frequencyText,
              frequencyType === 'daily' && styles.frequencyTextActive
            ]}>
              Todos los días
            </Text>
            <Text style={[
              styles.frequencyDescription,
              frequencyType === 'daily' && styles.frequencyDescriptionActive
            ]}>
              Diario
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.frequencyCard,
              frequencyType === 'daysOfWeek' && styles.frequencyCardActive
            ]}
            onPress={() => handleFrequencyChange('daysOfWeek')}
            accessibilityRole="button"
            accessibilityLabel="Recordatorios en días específicos"
            accessibilityHint="Selecciona para elegir días específicos de la semana"
          >
            <Ionicons 
              name="calendar-outline" 
              size={isTablet ? 24 : 20} 
              color={frequencyType === 'daysOfWeek' ? COLORS.text.inverse : COLORS.text.secondary} 
            />
            <Text style={[
              styles.frequencyText,
              frequencyType === 'daysOfWeek' && styles.frequencyTextActive
            ]}>
              Días específicos
            </Text>
            <Text style={[
              styles.frequencyDescription,
              frequencyType === 'daysOfWeek' && styles.frequencyDescriptionActive
            ]}>
              Personalizado
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.frequencyCard,
              frequencyType === 'everyXHours' && styles.frequencyCardActive
            ]}
            onPress={() => handleFrequencyChange('everyXHours')}
            accessibilityRole="button"
            accessibilityLabel="Recordatorios cada X horas"
            accessibilityHint="Selecciona para recibir recordatorios cada cierto número de horas"
          >
            <Ionicons 
              name="time" 
              size={isTablet ? 24 : 20} 
              color={frequencyType === 'everyXHours' ? COLORS.text.inverse : COLORS.text.secondary} 
            />
            <Text style={[
              styles.frequencyText,
              frequencyType === 'everyXHours' && styles.frequencyTextActive
            ]}>
              Cada X horas
            </Text>
            <Text style={[
              styles.frequencyDescription,
              frequencyType === 'everyXHours' && styles.frequencyDescriptionActive
            ]}>
              Intervalo
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Configuración específica según el tipo */}
      {frequencyType === 'daysOfWeek' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecciona los días de la semana</Text>
          <View style={styles.daysContainer}>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  daysOfWeek.includes(day) && styles.dayButtonActive
                ]}
                onPress={() => toggleDay(day)}
                accessibilityRole="button"
                accessibilityLabel={`${getDayName(day)} ${daysOfWeek.includes(day) ? 'seleccionado' : 'no seleccionado'}`}
              >
                <Text style={[
                  styles.dayButtonText,
                  daysOfWeek.includes(day) && styles.dayButtonTextActive
                ]}>
                  {getDayShort(day)}
                </Text>
                <Text style={[
                  styles.dayButtonLabel,
                  daysOfWeek.includes(day) && styles.dayButtonLabelActive
                ]}>
                  {getDayName(day)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {daysOfWeek.length === 0 && (
            <Text style={styles.helperText}>
              Selecciona al menos un día de la semana
            </Text>
          )}
        </View>
      )}

      {frequencyType === 'everyXHours' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Cada cuántas horas?</Text>
          <View style={styles.intervalContainer}>
            <Text style={styles.intervalLabel}>Cada</Text>
            <TouchableOpacity
              style={styles.intervalInput}
              onPress={() => setShowIntervalPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`Intervalo actual: ${everyXHours} horas`}
            >
              <Text style={styles.intervalValue}>{everyXHours}</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.intervalLabel}>horas</Text>
          </View>
          {showIntervalPicker && (
            <View style={styles.intervalPickerContainer}>
              <Text style={styles.intervalPickerTitle}>Selecciona el intervalo</Text>
              <View style={styles.intervalOptions}>
                {[2, 4, 6, 8, 12, 24].map((hours) => (
                  <TouchableOpacity
                    key={hours}
                    style={[
                      styles.intervalOption,
                      everyXHours === hours.toString() && styles.intervalOptionActive
                    ]}
                    onPress={() => {
                      setEveryXHours(hours.toString());
                      setShowIntervalPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.intervalOptionText,
                      everyXHours === hours.toString() && styles.intervalOptionTextActive
                    ]}>
                      {hours} horas
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.intervalPickerClose}
                onPress={() => setShowIntervalPicker(false)}
              >
                <Text style={styles.intervalPickerCloseText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Horarios */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Horarios de recordatorio</Text>
        </View>
        <View style={styles.timeButtonsContainer}>
          <TouchableOpacity
            style={[styles.addTimeButton, styles.quickTimeButton]}
            onPress={showQuickTimePresets}
            accessibilityRole="button"
            accessibilityLabel="Agregar horario rápido"
          >
            <Ionicons name="time" size={isTablet ? 18 : 16} color={COLORS.text.inverse} />
            <Text style={styles.addTimeButtonText}>Rápido</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addTimeButton, styles.customTimeButton]}
            onPress={showCustomTimeSelector}
            accessibilityRole="button"
            accessibilityLabel="Agregar horario personalizado"
          >
            <Ionicons name="add" size={isTablet ? 18 : 16} color={COLORS.text.inverse} />
            <Text style={styles.addTimeButtonText}>Personalizado</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.timesSection}>
          {selectedTimes.length === 0 ? (
            <View style={styles.emptyTimes}>
              <Ionicons name="time-outline" size={isTablet ? 48 : 40} color={COLORS.text.secondary} />
              <Text style={styles.emptyTimesText}>No hay horarios configurados</Text>
              <Text style={styles.emptyTimesSubtext}>
                Usa "Rápido" para horarios comunes o "Personalizado" para un horario específico
              </Text>
            </View>
          ) : (
            <View style={styles.timesContainer}>
              {selectedTimes.map((time, index) => (
                <View key={index} style={styles.timeChip}>
                  <Ionicons name="time" size={16} color={COLORS.primary} />
                  <Text style={styles.timeChipText}>
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeTime(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar horario ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            display="spinner"
            onChange={(event, date) => {
              if (date) addTime(date);
              setShowTimePicker(false);
            }}
          />
        )}

        {/* Modal para selección de tiempo personalizado */}
        {showCustomTimeModal && (
          <View style={styles.customTimeModal}>
            <View style={styles.customTimeModalContent}>
              <View style={styles.customTimeModalHeader}>
                <Text style={styles.customTimeModalTitle}>Seleccionar Horario Personalizado</Text>
                <TouchableOpacity
                  onPress={() => setShowCustomTimeModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar selector de tiempo"
                >
                  <Ionicons name="close" size={24} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.customTimeModalSubtitle}>
                Selecciona la hora exacta para tu recordatorio
              </Text>
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="spinner"
                onChange={(event, date) => {
                  if (date) addTime(date);
                }}
              />
              <TouchableOpacity
                style={styles.customTimeModalButton}
                onPress={() => setShowCustomTimeModal(false)}
              >
                <Text style={styles.customTimeModalButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Resumen */}
      {selectedTimes.length > 0 && (
        <View style={styles.summary}>
          <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>Resumen de recordatorios</Text>
            <Text style={styles.summaryDescription}>
              {frequencyType === 'daily' && 'Recibirás recordatorios todos los días'}
              {frequencyType === 'daysOfWeek' && `Recibirás recordatorios los ${daysOfWeek.map(d => getDayName(d)).join(', ')}`}
              {frequencyType === 'everyXHours' && `Recibirás recordatorios cada ${everyXHours} horas`}
              {' a las '}
              {selectedTimes.map(t => t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })).join(', ')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.white,
    borderRadius: 16,
    padding: isTablet ? 32 : 24,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isTablet ? 32 : 24,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: isTablet ? 16 : 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: isTablet ? 32 : 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  frequencyContainer: {
    paddingHorizontal: 8,
  },
  frequencyCard: {
    backgroundColor: COLORS.background.white,
    borderRadius: 16,
    padding: isTablet ? 24 : 20,
    marginRight: 16,
    minWidth: isTablet ? 160 : 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border.neutral,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  frequencyCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  frequencyText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  frequencyTextActive: {
    color: COLORS.text.inverse,
  },
  frequencyDescription: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.text.secondary,
    marginTop: 6,
  },
  frequencyDescriptionActive: {
    color: COLORS.text.inverse + '80',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dayButton: {
    backgroundColor: COLORS.background.white,
    borderRadius: 16,
    padding: isTablet ? 20 : 16,
    minWidth: isTablet ? 90 : 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border.neutral,
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  dayButtonTextActive: {
    color: COLORS.text.inverse,
  },
  dayButtonLabel: {
    fontSize: isTablet ? 12 : 10,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  dayButtonLabelActive: {
    color: COLORS.text.inverse + '80',
  },
  helperText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    marginTop: 12,
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  intervalLabel: {
    fontSize: isTablet ? 18 : 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  intervalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: COLORS.border.neutral,
    minWidth: 100,
    justifyContent: 'space-between',
  },
  intervalValue: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  intervalPickerContainer: {
    backgroundColor: COLORS.background.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border.neutral,
  },
  intervalPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  intervalOption: {
    backgroundColor: COLORS.background.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border.neutral,
  },
  intervalOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  intervalOptionText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  intervalOptionTextActive: {
    color: COLORS.text.inverse,
  },
  intervalPickerClose: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  intervalPickerCloseText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  timeButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
    flex: 1,
  },
  quickTimeButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  customTimeButton: {
    backgroundColor: COLORS.secondary || '#10b981',
    shadowColor: COLORS.secondary || '#10b981',
  },
  addTimeButtonText: {
    color: COLORS.text.inverse,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 10,
  },
  emptyTimes: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: COLORS.background.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border.neutral,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyTimesText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: 20,
    textAlign: 'center',
  },
  emptyTimesSubtext: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  timesSection: {
    marginTop: 16,
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    marginBottom: 8,
  },
  timeChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 12,
    marginRight: 16,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  summaryText: {
    marginLeft: 16,
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  summaryDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  customTimeModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  customTimeModalContent: {
    backgroundColor: COLORS.background.white,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  customTimeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customTimeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  customTimeModalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  customTimeModalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  customTimeModalButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
