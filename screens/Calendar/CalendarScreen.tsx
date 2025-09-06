import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMedications } from '../../store/useMedications';
import { useTreatments } from '../../store/useTreatments';
import { useAppointments } from '../../store/useAppointments';

// Mock de usuario y eventos
const mockUser = { profileId: 1, name: 'Kevin' };
const mockEvents = {
  '2024-08-16': {
    medications: [
      { id: 1, name: 'Paracetamol', time: '09:00', dose: '500mg', type: 'Tableta' },
    ],
    appointments: [
      { id: 1, title: 'Dr. Pérez', time: '10:30', location: 'Clínica Central', status: 'SCHEDULED' },
    ],
  },
  '2024-08-18': {
    medications: [
      { id: 2, name: 'Ibuprofeno', time: '14:00', dose: '200mg', type: 'Cápsula' },
    ],
    appointments: [],
  },
};

function getDaysInMonth(month: number, year: number) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function CalendarScreen() {
  const { medications } = useMedications();
  const { treatments } = useTreatments();
  const { appointments } = useAppointments();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user] = useState(mockUser);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const days = useMemo(() => getDaysInMonth(month, year), [month, year]);
  const today = new Date();

  // Helpers para grid
  const getKey = (d: Date) => d.toISOString().slice(0, 10);
  // Mapeo de eventos reales por fecha
  const eventsByDate: Record<string, { medications: any[]; treatments: any[]; appointments: any[] }> = {};
  medications.forEach(med => {
    if (med.startDate) {
      const key = med.startDate.slice(0, 10);
      if (!eventsByDate[key]) eventsByDate[key] = { medications: [], treatments: [], appointments: [] };
      eventsByDate[key].medications.push(med);
    }
  });
  treatments.forEach(trt => {
    if (trt.startDate) {
      const key = trt.startDate.slice(0, 10);
      if (!eventsByDate[key]) eventsByDate[key] = { medications: [], treatments: [], appointments: [] };
      eventsByDate[key].treatments.push(trt);
    }
  });
  appointments.forEach(appt => {
    if (appt.dateTime) {
      const key = appt.dateTime.slice(0, 10);
      if (!eventsByDate[key]) eventsByDate[key] = { medications: [], treatments: [], appointments: [] };
      eventsByDate[key].appointments.push(appt);
    }
  });
  const getEvents = (d: Date) => eventsByDate[getKey(d)] || { medications: [], treatments: [], appointments: [] };

  // Navegación de meses
  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };
  const goToToday = () => {
    setMonth(today.getMonth());
    setYear(today.getFullYear());
    setSelectedDay(today);
  };

  // Loading y error/perfil
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subtitle}>Cargando calendario…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (!user?.profileId) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="account-alert" size={64} color="#ef4444" />
        <Text style={styles.title}>Error</Text>
        <Text style={styles.subtitle}>Este usuario aún no tiene un perfil de paciente asignado.</Text>
      </View>
    );
  }

  // Render principal
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.headerTitle}>Calendario</Text>
      {/* Navegación de mes */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.monthBtn} onPress={goToPrevMonth}>
          <Ionicons name="chevron-back" size={22} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {new Date(year, month).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity style={styles.monthBtn} onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={22} color="#2563eb" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
          <Text style={styles.todayBtnText}>Hoy</Text>
        </TouchableOpacity>
      </View>
      {/* Días de la semana */}
      <View style={styles.weekRow}>
        {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>
      {/* Grid de días */}
      <View style={styles.daysGridModern}>
        {days.map((d, idx) => {
          const key = getKey(d);
          const events = getEvents(d);
          const isCurrentMonth = d.getMonth() === month;
          const isToday = d.toDateString() === today.toDateString();
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.dayCellModern,
                !isCurrentMonth && styles.dayCellInactive,
                isToday && styles.dayCellToday,
                events.appointments.length + events.medications.length + events.treatments.length > 0 && styles.dayCellWithEvent
              ]}
              onPress={() => { setSelectedDay(d); setModalVisible(true); }}
              activeOpacity={0.85}
            >
              <Text style={styles.dayNumber}>{d.getDate()}</Text>
              {/* Indicadores de eventos */}
              <View style={styles.eventDotsRow}>
                {events.appointments.length > 0 && <View style={styles.eventDotBlue} />}
                {events.medications.length > 0 && <View style={styles.eventDotGreen} />}
                {events.treatments.length > 0 && <View style={styles.eventDotOrange} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Modal de eventos del día */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentModern}>
            <Text style={styles.modalTitle}>
              {selectedDay ? selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </Text>
            {selectedDay && (() => {
              const events = getEvents(selectedDay);
              return (
                <>
                  <Text style={styles.modalSection}>Citas</Text>
                  {events.appointments.length > 0 ? events.appointments.map((a) => (
                    <View key={a.id} style={styles.eventCardModern}>
                      <Ionicons name="calendar" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                      <View>
                        <Text style={styles.eventTitle}>{a.title}</Text>
                        <Text style={styles.eventInfo}>{a.dateTime ? new Date(a.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}{a.location ? ` - ${a.location}` : ''}</Text>
                        <Text style={styles.eventStatus}>{a.status === 'SCHEDULED' ? 'Programada' : a.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}</Text>
                      </View>
                    </View>
                  )) : <Text style={styles.emptyText}>No hay citas</Text>}
                  <Text style={styles.modalSection}>Medicamentos</Text>
                  {events.medications.length > 0 ? events.medications.map((m) => (
                    <View key={m.id} style={styles.eventCardModern}>
                      <Ionicons name="medkit" size={18} color="#22c55e" style={{ marginRight: 8 }} />
                      <View>
                        <Text style={styles.eventTitle}>{m.name}</Text>
                        <Text style={styles.eventInfo}>{m.dosage} {m.type ? `– ${m.type}` : ''}</Text>
                      </View>
                    </View>
                  )) : <Text style={styles.emptyText}>No hay medicamentos</Text>}
                  <Text style={styles.modalSection}>Tratamientos</Text>
                  {events.treatments.length > 0 ? events.treatments.map((t) => (
                    <View key={t.id} style={styles.eventCardModern}>
                      <Ionicons name="list" size={18} color="#f59e42" style={{ marginRight: 8 }} />
                      <View>
                        <Text style={styles.eventTitle}>{t.title}</Text>
                        <Text style={styles.eventInfo}>{t.description}</Text>
                      </View>
                    </View>
                  )) : <Text style={styles.emptyText}>No hay tratamientos</Text>}
                </>
              );
            })()}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
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
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 18,
    textAlign: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  monthBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginHorizontal: 12,
    textTransform: 'capitalize',
  },
  todayBtn: {
    marginLeft: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 13,
    paddingVertical: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginBottom: 18,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    position: 'relative',
  },
  dayCellInactive: {
    backgroundColor: '#f3f4f6',
    opacity: 0.5,
  },
  dayCellToday: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  eventDotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    position: 'absolute',
    bottom: 10,
    left: '35%',
  },
  eventDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    position: 'absolute',
    bottom: 10,
    right: '35%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    width: '92%',
    elevation: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSection: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 10,
    marginBottom: 4,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  eventTitle: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 14,
  },
  eventInfo: {
    color: '#64748b',
    fontSize: 13,
  },
  eventStatus: {
    color: '#2563eb',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
  },
  closeBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 8,
  },
  title: {
    fontSize: 24,
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
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  // Nuevos estilos para el rediseño moderno
  daysGridModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 18,
    padding: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dayCellModern: {
    width: `${100 / 7}%`,
    aspectRatio: 1.15, // Más alto
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14, // Más redondeado
    margin: 3,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    position: 'relative',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  dayCellWithEvent: {
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8',
  },
  eventDotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },

  eventDotOrange: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f59e42',
  },
  modalContentModern: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    width: '92%',
    elevation: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  eventCardModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
});
