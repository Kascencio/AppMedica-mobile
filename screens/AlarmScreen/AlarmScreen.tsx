import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Vibration, ToastAndroid } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useIntakeEvents } from '../../store/useIntakeEvents';
import { useKeepAwake } from 'expo-keep-awake';
import { scheduleNotification } from '../../lib/notifications';
import { Audio } from 'expo-av';

// Mock de datos de alarma
const mockAlarm = {
  name: 'Paracetamol',
  dosage: '500mg',
  instructions: 'Tomar con agua',
  time: '09:00',
};

export default function AlarmScreen({ navigation }: any) {
  useKeepAwake();
  const route = useRoute();
  const { kind, refId, scheduledFor, name, dosage, instructions, time } = route.params || {};
  const { registerEvent } = useIntakeEvents();
  const [loading, setLoading] = React.useState(false);
  const [paramError, setParamError] = React.useState<string | null>(null);

  useEffect(() => {
    console.log('AlarmScreen params:', { kind, refId, scheduledFor, name, dosage, instructions, time });
    if (!kind || !refId || !scheduledFor) {
      setParamError('Faltan datos para registrar el evento. Vuelve a abrir la app desde la notificación.');
    } else {
      setParamError(null);
    }
  }, [kind, refId, scheduledFor]);

  // Vibración y sonido al abrir
  useEffect(() => {
    Vibration.vibrate(1000);
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm.mp3'), // Debes agregar un archivo alarm.mp3 en assets
          { shouldPlay: true }
        );
        // Opcional: sound.unloadAsync() al cerrar
      } catch {}
    })();
  }, []);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    // Para iOS, podrías usar un modal o una librería de toast
  };

  const handleAction = async (action: 'TAKEN' | 'SNOOZE' | 'SKIPPED') => {
    if (!kind || !refId || !scheduledFor) {
      setParamError('Faltan datos para registrar el evento.');
      return;
    }
    setLoading(true);
    try {
      if (action === 'SNOOZE') {
        const snoozeDate = new Date();
        snoozeDate.setMinutes(snoozeDate.getMinutes() + 10);
        await scheduleNotification({
          title: `Recordatorio: ${name || 'Medicamento'}`,
          body: `Dosis: ${dosage || ''}`,
          data: { kind, refId, scheduledFor: snoozeDate.toISOString(), name, dosage, instructions, time: snoozeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          trigger: snoozeDate,
        });
      }
      await registerEvent({
        kind,
        refId,
        scheduledFor,
        action,
        meta: {},
      });
      showToast('Evento registrado');
      navigation.goBack();
    } catch (e) {
      showToast('Error al registrar evento');
      setParamError('Error al registrar evento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="alarm" size={64} color="#2563eb" />
        <Text style={styles.title}>¡Hora de tu medicamento!</Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.medName}>{name || 'Medicamento'}</Text>
        <Text style={styles.dosage}>{dosage || ''}</Text>
        <Text style={styles.instructions}>{instructions || ''}</Text>
        <Text style={styles.time}>{time || (scheduledFor ? new Date(scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</Text>
      </View>
      {paramError && (
        <Text style={{ color: 'red', marginBottom: 12, textAlign: 'center' }}>{paramError}</Text>
      )}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#22c55e', opacity: loading || !!paramError ? 0.6 : 1 }]}
          onPress={() => handleAction('TAKEN')}
          disabled={loading || !!paramError}
          accessibilityLabel="Marcar como tomado"
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-circle" size={36} color="#fff" />
          <Text style={styles.actionText}>{loading ? 'Guardando...' : 'Tomado'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#f59e42', opacity: loading || !!paramError ? 0.6 : 1 }]}
          onPress={() => handleAction('SNOOZE')}
          disabled={loading || !!paramError}
          accessibilityLabel="Posponer 10 minutos"
          accessibilityRole="button"
        >
          <Ionicons name="time" size={36} color="#fff" />
          <Text style={styles.actionText}>{loading ? 'Guardando...' : 'Posponer 10m'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#ef4444', opacity: loading || !!paramError ? 0.6 : 1 }]}
          onPress={() => handleAction('SKIPPED')}
          disabled={loading || !!paramError}
          accessibilityLabel="Saltar toma"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={36} color="#fff" />
          <Text style={styles.actionText}>{loading ? 'Guardando...' : 'Saltar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 12,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  medName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  dosage: {
    fontSize: 20,
    color: '#64748b',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  time: {
    fontSize: 22,
    color: '#22c55e',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 2,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 6,
  },
});
