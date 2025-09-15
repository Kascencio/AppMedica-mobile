import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AlarmTestSuite from './AlarmTestSuite';
import MedicationAlarmTester from './MedicationAlarmTester';
import AppointmentAlarmTester from './AppointmentAlarmTester';
import AlarmSystemDiagnostic from './AlarmSystemDiagnostic';
import AutoOpenAlarmTester from './AutoOpenAlarmTester';
import AutoOpenDiagnostic from './AutoOpenDiagnostic';
import { unifiedAlarmService } from '../lib/unifiedAlarmService';

type TestSection = 'overview' | 'suite' | 'medications' | 'appointments' | 'diagnostic' | 'autoOpen' | 'autoOpenDiagnostic';

export default function AlarmTestCenter() {
  const [activeSection, setActiveSection] = useState<TestSection>('overview');

  // Funciones de acciones rápidas
  const handleQuickImmediateTest = async () => {
    try {
      await unifiedAlarmService.scheduleAlarm({
        id: 'quick_test_' + Date.now(),
        title: '🧪 Test Rápido',
        body: 'Esta es una notificación de prueba inmediata',
        data: { 
          test: true, 
          type: 'MEDICATION',
          kind: 'MED',
          refId: 'test_medication_001',
          medicationName: 'Medicamento de Prueba',
          dosage: '1 tableta',
          scheduledFor: new Date().toISOString()
        },
        triggerDate: new Date(Date.now() + 5000)
      });
      
      Alert.alert('Test Enviado', 'Se envió una notificación de prueba inmediata');
    } catch (error: any) {
      Alert.alert('Error', `Error en test inmediato: ${error.message}`);
    }
  };

  const handleQuickScheduledTest = async () => {
    try {
      const triggerTime = new Date(Date.now() + 5000); // 5 segundos
      
      await unifiedAlarmService.scheduleAlarm({
        id: 'scheduled_test_' + Date.now(),
        title: '⏰ Test Programado',
        body: 'Esta alarma se activará en 5 segundos',
        data: { 
          test: true, 
          type: 'MEDICATION',
          kind: 'MED',
          refId: 'test_medication_002',
          medicationName: 'Medicamento Programado',
          dosage: '2 tabletas',
          scheduledFor: triggerTime.toISOString()
        },
        triggerDate: triggerTime
      });
      
      Alert.alert('Test Programado', 'Se programó una alarma para 5 segundos');
    } catch (error: any) {
      Alert.alert('Error', `Error en test programado: ${error.message}`);
    }
  };

  const handleQuickPermissionsTest = async () => {
    try {
      const { requestPermissions } = await import('../lib/notifications');
      const granted = await requestPermissions();
      
      Alert.alert(
        'Permisos', 
        granted ? 'Permisos concedidos ✅' : 'Permisos denegados ❌'
      );
    } catch (error: any) {
      Alert.alert('Error', `Error verificando permisos: ${error.message}`);
    }
  };

  const handleQuickClearAll = async () => {
    Alert.alert(
      'Limpiar Todo',
      '¿Estás seguro de que quieres cancelar todas las notificaciones?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              await unifiedAlarmService.cancelAllAlarms();
              Alert.alert('Limpiado', 'Todas las notificaciones han sido canceladas');
            } catch (error: any) {
              Alert.alert('Error', `Error limpiando: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'suite':
        return <AlarmTestSuite />;
      case 'medications':
        return <MedicationAlarmTester />;
      case 'appointments':
        return <AppointmentAlarmTester />;
      case 'autoOpen':
        return <AutoOpenAlarmTester />;
      case 'autoOpenDiagnostic':
        return <AutoOpenDiagnostic />;
      case 'diagnostic':
        return <AlarmSystemDiagnostic />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.overviewContainer}>
      <View style={styles.welcomeCard}>
        <Ionicons name="flask" size={48} color="#2563eb" />
        <Text style={styles.welcomeTitle}>Centro de Tests de Alarmas</Text>
        <Text style={styles.welcomeSubtitle}>
          Herramientas completas para probar y diagnosticar el sistema de alarmas
        </Text>
      </View>

      <View style={styles.sectionsGrid}>
        <TouchableOpacity 
          style={[styles.sectionCard, styles.primaryCard]} 
          onPress={() => setActiveSection('suite')}
        >
          <Ionicons name="play-circle" size={32} color="#fff" />
          <Text style={styles.sectionTitle}>Suite de Tests</Text>
          <Text style={styles.sectionDescription}>
            Tests completos del sistema de alarmas, permisos, canales y funcionalidades básicas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sectionCard, styles.medicationCard]} 
          onPress={() => setActiveSection('medications')}
        >
          <Ionicons name="medical" size={32} color="#fff" />
          <Text style={styles.sectionTitle}>Alarmas de Medicamentos</Text>
          <Text style={styles.sectionDescription}>
            Prueba alarmas específicas para recordatorios de medicamentos y dosis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sectionCard, styles.appointmentCard]} 
          onPress={() => setActiveSection('appointments')}
        >
          <Ionicons name="calendar" size={32} color="#fff" />
          <Text style={styles.sectionTitle}>Alarmas de Citas</Text>
          <Text style={styles.sectionDescription}>
            Prueba recordatorios de citas médicas y consultas programadas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sectionCard, styles.autoOpenCard]} 
          onPress={() => setActiveSection('autoOpen')}
        >
          <Ionicons name="phone-portrait" size={32} color="#fff" />
          <Text style={styles.sectionTitle}>Apertura Automática</Text>
          <Text style={styles.sectionDescription}>
            Prueba que las alarmas abran la app cuando esté cerrada o en segundo plano
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sectionCard, styles.autoOpenDiagnosticCard]} 
          onPress={() => setActiveSection('autoOpenDiagnostic')}
        >
          <Ionicons name="bug" size={32} color="#fff" />
          <Text style={styles.sectionTitle}>Diagnóstico Auto-Apertura</Text>
          <Text style={styles.sectionDescription}>
            Diagnostica y corrige problemas de apertura automática
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sectionCard, styles.diagnosticCard]} 
          onPress={() => setActiveSection('diagnostic')}
        >
          <Ionicons name="search" size={32} color="#fff" />
          <Text style={styles.sectionTitle}>Diagnóstico Avanzado</Text>
          <Text style={styles.sectionDescription}>
            Herramientas avanzadas para diagnosticar problemas del sistema de alarmas
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>⚡ Acciones Rápidas</Text>
        
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleQuickImmediateTest}>
            <Ionicons name="notifications" size={24} color="#2563eb" />
            <Text style={styles.quickActionText}>Test Inmediato</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={handleQuickScheduledTest}>
            <Ionicons name="alarm" size={24} color="#2563eb" />
            <Text style={styles.quickActionText}>Test Programado</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={handleQuickPermissionsTest}>
            <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
            <Text style={styles.quickActionText}>Verificar Permisos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={handleQuickClearAll}>
            <Ionicons name="trash" size={24} color="#ef4444" />
            <Text style={styles.quickActionText}>Limpiar Todo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Información del Sistema</Text>
        <Text style={styles.infoText}>
          • Todas las pruebas se ejecutan en modo seguro
        </Text>
        <Text style={styles.infoText}>
          • Las alarmas de prueba se pueden cancelar en cualquier momento
        </Text>
        <Text style={styles.infoText}>
          • Los tests no afectan las alarmas reales del usuario
        </Text>
        <Text style={styles.infoText}>
          • Se recomienda probar en un entorno controlado
        </Text>
      </View>
    </ScrollView>
  );

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'suite': return 'Suite de Tests de Alarmas';
      case 'medications': return 'Tests de Medicamentos';
      case 'appointments': return 'Tests de Citas Médicas';
      case 'autoOpen': return 'Test de Apertura Automática';
      case 'autoOpenDiagnostic': return 'Diagnóstico de Apertura Automática';
      case 'diagnostic': return 'Diagnóstico Avanzado';
      default: return 'Centro de Tests de Alarmas';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {activeSection !== 'overview' && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setActiveSection('overview')}
          >
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{getSectionTitle()}</Text>
        {activeSection !== 'overview' && (
          <TouchableOpacity 
            style={styles.overviewButton} 
            onPress={() => setActiveSection('overview')}
          >
            <Ionicons name="home" size={24} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeSection === 'overview' && styles.activeTab]} 
          onPress={() => setActiveSection('overview')}
        >
          <Ionicons name="grid" size={20} color={activeSection === 'overview' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, activeSection === 'overview' && styles.activeTabText]}>
            Inicio
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeSection === 'suite' && styles.activeTab]} 
          onPress={() => setActiveSection('suite')}
        >
          <Ionicons name="play" size={20} color={activeSection === 'suite' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, activeSection === 'suite' && styles.activeTabText]}>
            Tests
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeSection === 'medications' && styles.activeTab]} 
          onPress={() => setActiveSection('medications')}
        >
          <Ionicons name="medical" size={20} color={activeSection === 'medications' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, activeSection === 'medications' && styles.activeTabText]}>
            Medicamentos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeSection === 'appointments' && styles.activeTab]} 
          onPress={() => setActiveSection('appointments')}
        >
          <Ionicons name="calendar" size={20} color={activeSection === 'appointments' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, activeSection === 'appointments' && styles.activeTabText]}>
            Citas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeSection === 'autoOpen' && styles.activeTab]} 
          onPress={() => setActiveSection('autoOpen')}
        >
          <Ionicons name="phone-portrait" size={20} color={activeSection === 'autoOpen' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, activeSection === 'autoOpen' && styles.activeTabText]}>
            Auto-Apertura
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeSection === 'autoOpenDiagnostic' && styles.activeTab]} 
          onPress={() => setActiveSection('autoOpenDiagnostic')}
        >
          <Ionicons name="bug" size={20} color={activeSection === 'autoOpenDiagnostic' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, activeSection === 'autoOpenDiagnostic' && styles.activeTabText]}>
            Diagnóstico
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeSection === 'diagnostic' && styles.activeTab]} 
          onPress={() => setActiveSection('diagnostic')}
        >
          <Ionicons name="search" size={20} color={activeSection === 'diagnostic' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, activeSection === 'diagnostic' && styles.activeTabText]}>
            Sistema
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderSection()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  overviewButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionsGrid: {
    gap: 16,
    marginBottom: 20,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: '#2563eb',
  },
  medicationCard: {
    backgroundColor: '#22c55e',
  },
  appointmentCard: {
    backgroundColor: '#f59e0b',
  },
  autoOpenCard: {
    backgroundColor: '#ef4444',
  },
  autoOpenDiagnosticCard: {
    backgroundColor: '#f59e0b',
  },
  diagnosticCard: {
    backgroundColor: '#8b5cf6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  },
  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#075985',
    marginBottom: 6,
    lineHeight: 20,
  },
});
