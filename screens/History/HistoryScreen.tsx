import React, { useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIntakeEvents } from '../../store/useIntakeEvents';

export default function HistoryScreen() {
  const { events, loading, error, getEvents } = useIntakeEvents();

  useEffect(() => {
    getEvents();
  }, []);

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name={item.kind === 'MED' ? 'pill' : 'clipboard-list'} size={20} color="#2563eb" style={{ marginRight: 8 }} />
        <Text style={styles.cardTitle}>{item.kind === 'MED' ? 'Medicamento' : 'Tratamiento'}</Text>
        <Text style={styles.cardAction}>{item.action}</Text>
      </View>
      <Text style={styles.cardInfo}>ID ref: {item.refId}</Text>
      <Text style={styles.cardInfo}>Programado: {new Date(item.scheduledFor).toLocaleString()}</Text>
      <Text style={styles.cardInfo}>Registrado: {new Date(item.at).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Historial de Adherencia</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.title}>Error</Text>
          <Text style={styles.subtitle}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay eventos registrados</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 18,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 16,
    flex: 1,
  },
  cardAction: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardInfo: {
    color: '#64748b',
    fontSize: 13,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
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
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
  },
});
