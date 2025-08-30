import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import COLORS from '../constants/colors';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface DateSelectorProps {
  value: Date | undefined;
  onDateChange: (date: Date) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  mode?: 'date' | 'datetime';
  showTime?: boolean;
}

export default function DateSelector({
  value,
  onDateChange,
  label,
  placeholder = 'Seleccionar fecha',
  required = false,
  minDate,
  maxDate,
  mode = 'date',
  showTime = false
}: DateSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleDatePress = () => {
    setShowPicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  const showQuickDatePresets = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    Alert.alert(
      'Seleccionar Fecha',
      'Elige una fecha predefinida o personalizada',
      [
        { text: 'Hoy', onPress: () => onDateChange(today) },
        { text: 'Mañana', onPress: () => onDateChange(tomorrow) },
        { text: 'En una semana', onPress: () => onDateChange(nextWeek) },
        { text: 'En un mes', onPress: () => onDateChange(nextMonth) },
        { text: 'Personalizada', onPress: () => setShowPicker(true) },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const formatDate = (date: Date) => {
    if (mode === 'datetime' || showTime) {
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRelativeDate = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    if (diffDays > 0) return `En ${diffDays} días`;
    if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`;
    return '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <TouchableOpacity
          style={styles.quickSelectButton}
          onPress={showQuickDatePresets}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar fecha rápida"
        >
          <Ionicons name="calendar" size={16} color={COLORS.primary} />
          <Text style={styles.quickSelectText}>Rápido</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.dateButton,
          !value && styles.dateButtonEmpty,
          value && styles.dateButtonFilled
        ]}
        onPress={handleDatePress}
        accessibilityRole="button"
        accessibilityLabel={value ? `Fecha seleccionada: ${formatDate(value)}` : placeholder}
      >
        <View style={styles.dateContent}>
          <MaterialCommunityIcons 
            name={value ? "calendar-check" : "calendar-plus"} 
            size={isTablet ? 24 : 20} 
            color={value ? COLORS.primary : COLORS.text.secondary} 
          />
          <View style={styles.dateTextContainer}>
            {value ? (
              <>
                <Text style={styles.dateText}>{formatDate(value)}</Text>
                <Text style={styles.relativeDate}>{getRelativeDate(value)}</Text>
              </>
            ) : (
              <Text style={styles.placeholderText}>{placeholder}</Text>
            )}
          </View>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={isTablet ? 20 : 16} 
          color={COLORS.text.secondary} 
        />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display="spinner"
          onChange={handleDateChange}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: isTablet ? 20 : 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  required: {
    color: COLORS.error,
  },
  quickSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickSelectText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.white,
    borderRadius: 12,
    padding: isTablet ? 16 : 14,
    borderWidth: 2,
    borderColor: COLORS.border.neutral,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateButtonEmpty: {
    borderColor: COLORS.border.neutral,
    backgroundColor: COLORS.background.light,
  },
  dateButtonFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  dateText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  relativeDate: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  placeholderText: {
    fontSize: isTablet ? 16 : 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
});
