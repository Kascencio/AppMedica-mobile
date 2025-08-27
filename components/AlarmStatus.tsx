import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../constants/colors';

interface AlarmStatusProps {
  activeAlarms?: number;
  nextAlarm?: {
    time: string;
    medication: string;
  };
  onPress?: () => void;
  compact?: boolean;
}

export default function AlarmStatus({ 
  activeAlarms = 0, 
  nextAlarm, 
  onPress, 
  compact = false 
}: AlarmStatusProps) {
  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.compactIconContainer}>
          <Ionicons 
            name="alarm" 
            size={20} 
            color={activeAlarms > 0 ? COLORS.warning : COLORS.text.tertiary} 
          />
          {activeAlarms > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeAlarms}</Text>
            </View>
          )}
        </View>
        {nextAlarm && (
          <Text style={styles.compactTime}>{nextAlarm.time}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[COLORS.background.card, COLORS.background.tertiary]}
        style={styles.gradientContainer}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="alarm" 
              size={24} 
              color={activeAlarms > 0 ? COLORS.warning : COLORS.text.tertiary} 
            />
            {activeAlarms > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeAlarms}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>
            {activeAlarms > 0 ? 'Alarmas Activas' : 'Sin Alarmas'}
          </Text>
        </View>
        
        {activeAlarms > 0 && nextAlarm ? (
          <View style={styles.nextAlarmContainer}>
            <Text style={styles.nextAlarmLabel}>Próxima alarma:</Text>
            <Text style={styles.nextAlarmTime}>{nextAlarm.time}</Text>
            <Text style={styles.nextAlarmMedication}>{nextAlarm.medication}</Text>
          </View>
        ) : (
          <Text style={styles.noAlarmsText}>
            No tienes alarmas programadas
          </Text>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {activeAlarms > 0 
              ? `${activeAlarms} alarma${activeAlarms > 1 ? 's' : ''} activa${activeAlarms > 1 ? 's' : ''}`
              : 'Todas las alarmas completadas'
            }
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  gradientContainer: {
    padding: 20,
    borderRadius: 16,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.card,
  },
  
  badgeText: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  
  nextAlarmContainer: {
    backgroundColor: COLORS.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  
  nextAlarmLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  
  nextAlarmTime: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  
  nextAlarmMedication: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  
  noAlarmsText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    paddingTop: 12,
  },
  
  footerText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  
  // Estilos compactos
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  compactIconContainer: {
    position: 'relative',
    marginRight: 8,
  },
  
  compactTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});
