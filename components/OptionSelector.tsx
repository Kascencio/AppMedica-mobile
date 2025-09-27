import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '../constants/colors';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface Option {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

interface OptionSelectorProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: Option[];
  label: string;
  placeholder?: string;
  required?: boolean;
  multiple?: boolean;
  maxSelections?: number;
}

export default function OptionSelector({
  value,
  onValueChange,
  options,
  label,
  placeholder = 'Seleccionar opción',
  required = false,
  multiple = false,
  maxSelections = 3
}: OptionSelectorProps) {
  const [showOptions, setShowOptions] = useState(false);

  const handleOptionPress = (optionValue: string) => {
    if (multiple) {
      // Para selección múltiple (futuro)
      onValueChange(optionValue);
    } else {
      onValueChange(optionValue);
      setShowOptions(false);
    }
  };

  const getSelectedOption = () => {
    return options.find(option => option.value === value);
  };

  const showOptionsModal = () => {
    if (options.length <= 3) {
      setShowOptions(true);
    } else {
      Alert.alert(
        label,
        'Selecciona una opción',
        [
          ...options.map(option => ({
            text: option.label,
            onPress: () => handleOptionPress(option.value)
          })),
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    }
  };

  const getIconName = (iconName: string) => {
    const iconMap: { [key: string]: string } = {
      'pill': 'medical',
      'injection': 'needle',
      'cream': 'tube-cream',
      'daily': 'calendar',
      'weekly': 'calendar-week',
      'monthly': 'calendar-month',
      'custom': 'calendar-edit',
      'oral': 'pill',
      'topical': 'tube-cream',
      'injectable': 'needle',
      'inhalation': 'inhaler',
      'sublingual': 'pill',
      'as_needed': 'clock-alert'
    };
    return iconMap[iconName] || 'circle';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[
          styles.selectorButton,
          !value && styles.selectorButtonEmpty,
          value && styles.selectorButtonFilled
        ]}
        onPress={showOptionsModal}
        accessibilityRole="button"
        accessibilityLabel={value ? `Opción seleccionada: ${getSelectedOption()?.label}` : placeholder}
      >
        <View style={styles.selectorContent}>
          {value && getSelectedOption()?.icon && (
            <MaterialCommunityIcons 
              name={getIconName(getSelectedOption()!.icon) as any} 
              size={isTablet ? 24 : 20} 
              color={COLORS.primary} 
              style={styles.optionIcon}
            />
          )}
          <View style={styles.selectorTextContainer}>
            {value ? (
              <>
                <Text style={styles.selectedText}>{getSelectedOption()?.label}</Text>
                {getSelectedOption()?.description && (
                  <Text style={styles.descriptionText}>{getSelectedOption()?.description}</Text>
                )}
              </>
            ) : (
              <Text style={styles.placeholderText}>{placeholder}</Text>
            )}
          </View>
        </View>
        <Ionicons 
          name="chevron-down" 
          size={isTablet ? 20 : 16} 
          color={COLORS.text.secondary} 
        />
      </TouchableOpacity>

      {showOptions && (
        <View style={styles.optionsContainer}>
          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>{label}</Text>
            <TouchableOpacity
              onPress={() => setShowOptions(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar opciones"
            >
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  value === option.value && styles.optionItemSelected
                ]}
                onPress={() => handleOptionPress(option.value)}
                accessibilityRole="button"
                accessibilityLabel={`${option.label} ${value === option.value ? 'seleccionado' : 'no seleccionado'}`}
              >
                <View style={styles.optionContent}>
                  {option.icon && (
                    <MaterialCommunityIcons 
                      name={getIconName(option.icon) as any} 
                      size={isTablet ? 24 : 20} 
                      color={value === option.value ? COLORS.text.inverse : COLORS.text.secondary} 
                      style={styles.optionIcon}
                    />
                  )}
                  <View style={styles.optionTextContainer}>
                    <Text style={[
                      styles.optionText,
                      value === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={[
                        styles.optionDescription,
                        value === option.value && styles.optionDescriptionSelected
                      ]}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                </View>
                {value === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.text.inverse} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: isTablet ? 20 : 16,
    position: 'relative',
  },
  label: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  selectorButton: {
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
  selectorButtonEmpty: {
    borderColor: COLORS.border.neutral,
    backgroundColor: COLORS.background.tertiary,
  },
  selectorButtonFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectedText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  descriptionText: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  placeholderText: {
    fontSize: isTablet ? 16 : 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.background.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.neutral,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    maxHeight: 300,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.neutral,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  optionsList: {
    maxHeight: 250,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.neutral + '30',
  },
  optionItemSelected: {
    backgroundColor: COLORS.primary,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  optionTextSelected: {
    color: COLORS.text.inverse,
  },
  optionDescription: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: COLORS.text.inverse + '80',
  },
});
