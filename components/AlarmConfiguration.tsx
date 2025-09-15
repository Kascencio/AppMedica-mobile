// components/AlarmConfiguration.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import COLORS from '../constants/colors';
import { GLOBAL_STYLES } from '../constants/styles';

export interface AlarmConfigurationConfig {
  frequency: 'daily' | 'weekly' | 'interval';
  daysOfWeek?: number[];
  intervalHours?: number;
  reminderMinutes?: number;
  selectedTimes: Date[];
}

interface AlarmConfigurationProps {
  config: AlarmConfigurationConfig;
  onConfigChange: (config: AlarmConfigurationConfig) => void;
  type: 'medication' | 'treatment' | 'appointment';
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  { key: 0, label: 'Dom', short: 'D' },
  { key: 1, label: 'Lun', short: 'L' },
  { key: 2, label: 'Mar', short: 'M' },
  { key: 3, label: 'Mié', short: 'X' },
  { key: 4, label: 'Jue', short: 'J' },
  { key: 5, label: 'Vie', short: 'V' },
  { key: 6, label: 'Sáb', short: 'S' },
];

const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 240, label: '4 horas antes' },
];

export default function AlarmConfiguration({ 
  config, 
  onConfigChange, 
  type, 
  disabled = false 
}: AlarmConfigurationProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const updateConfig = (updates: Partial<AlarmConfigurationConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const addTime = (time: Date) => {
    const newTimes = [...config.selectedTimes, time];
    updateConfig({ selectedTimes: newTimes });
    setShowTimePicker(false);
  };

  const removeTime = (index: number) => {
    const newTimes = config.selectedTimes.filter((_, i) => i !== index);
    updateConfig({ selectedTimes: newTimes });
  };

  const toggleDay = (day: number) => {
    const newDays = config.daysOfWeek?.includes(day)
      ? config.daysOfWeek.filter(d => d !== day)
      : [...(config.daysOfWeek || []), day];
    updateConfig({ daysOfWeek: newDays });
  };

  const setIntervalHours = (hours: string) => {
    const parsedHours = parseInt(hours);
    if (parsedHours > 0 && parsedHours <= 24) {
      updateConfig({ intervalHours: parsedHours });
    }
  };

  const setReminderMinutes = (minutes: number) => {
    updateConfig({ reminderMinutes: minutes });
    setShowReminderPicker(false);
  };

  const getFrequencyLabel = () => {
    switch (config.frequency) {
      case 'daily': return 'Diario';
      case 'weekly': return 'Días específicos';
      case 'interval': return 'Cada X horas';
      default: return 'Diario';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'medication': return 'Medicamento';
      case 'treatment': return 'Tratamiento';
      case 'appointment': return 'Cita';
      default: return 'Elemento';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="alarm-outline" size={20} color={COLORS.primary} />
        <Text style={styles.title}>Configuración de Alarmas</Text>
      </View>

      {/* Frecuencia */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frecuencia</Text>
        <View style={styles.frequencyButtons}>
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              config.frequency === 'daily' && styles.frequencyButtonActive
            ]}
            onPress={() => updateConfig({ frequency: 'daily' })}
            disabled={disabled}
          >
            <Text style={[
              styles.frequencyButtonText,
              config.frequency === 'daily' && styles.frequencyButtonTextActive
            ]}>
              Diario
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              config.frequency === 'weekly' && styles.frequencyButtonActive
            ]}
            onPress={() => updateConfig({ frequency: 'weekly' })}
            disabled={disabled}
          >
            <Text style={[
              styles.frequencyButtonText,
              config.frequency === 'weekly' && styles.frequencyButtonTextActive
            ]}>
              Semanal
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              config.frequency === 'interval' && styles.frequencyButtonActive
            ]}
            onPress={() => updateConfig({ frequency: 'interval' })}
            disabled={disabled}
          >
            <Text style={[
              styles.frequencyButtonText,
              config.frequency === 'interval' && styles.frequencyButtonTextActive
            ]}>
              Intervalos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Días de la semana (solo para frecuencia semanal) */}
      {config.frequency === 'weekly' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Días de la semana</Text>
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.key}
                style={[
                  styles.dayButton,
                  config.daysOfWeek?.includes(day.key) && styles.dayButtonActive
                ]}
                onPress={() => toggleDay(day.key)}
                disabled={disabled}
              >
                <Text style={[
                  styles.dayButtonText,
                  config.daysOfWeek?.includes(day.key) && styles.dayButtonTextActive
                ]}>
                  {day.short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Intervalo en horas (solo para frecuencia por intervalos) */}
      {config.frequency === 'interval' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cada cuántas horas</Text>
          <View style={styles.intervalContainer}>
            <TouchableOpacity
              style={styles.intervalButton}
              onPress={() => {
                Alert.prompt(
                  'Intervalo de horas',
                  'Ingresa cada cuántas horas quieres recibir la alarma:',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'OK', onPress: setIntervalHours }
                  ],
                  'plain-text',
                  config.intervalHours?.toString() || '8'
                );
              }}
              disabled={disabled}
            >
              <Text style={styles.intervalButtonText}>
                Cada {config.intervalHours || 8} horas
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Horas seleccionadas */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Horas de alarma</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowTimePicker(true)}
            disabled={disabled}
          >
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={styles.addButtonText}>Agregar hora</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.timesContainer}>
          {config.selectedTimes.map((time, index) => (
            <View key={index} style={styles.timeItem}>
              <Text style={styles.timeText}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeTime(index)}
                disabled={disabled}
              >
                <Ionicons name="close" size={16} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
          
          {config.selectedTimes.length === 0 && (
            <Text style={styles.emptyText}>
              No hay horas configuradas. Toca "Agregar hora" para comenzar.
            </Text>
          )}
        </View>
      </View>

      {/* Recordatorio para citas */}
      {type === 'appointment' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recordatorio</Text>
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={() => setShowReminderPicker(true)}
            disabled={disabled}
          >
            <Text style={styles.reminderButtonText}>
              {REMINDER_OPTIONS.find(opt => opt.value === config.reminderMinutes)?.label || '1 hora antes'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              addTime(selectedTime);
            }
          }}
        />
      )}

      {/* Reminder Picker Modal */}
      {showReminderPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar recordatorio</Text>
            {REMINDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.reminderOption}
                onPress={() => setReminderMinutes(option.value)}
              >
                <Text style={styles.reminderOptionText}>{option.label}</Text>
                {config.reminderMinutes === option.value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowReminderPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  frequencyButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  frequencyButtonTextActive: {
    color: COLORS.text.inverse,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  dayButtonTextActive: {
    color: COLORS.text.inverse,
  },
  intervalContainer: {
    flexDirection: 'row',
  },
  intervalButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intervalButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  timesContainer: {
    gap: 8,
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  removeButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  reminderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reminderButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  modalOverlay: {
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
  modalContent: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  reminderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderOptionText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
  },
  modalCloseButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
