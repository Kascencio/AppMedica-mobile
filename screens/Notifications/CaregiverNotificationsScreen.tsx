import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../store/useNotifications';
import { useNotificationPrefs } from '../../store/useNotificationPrefs';
import { LinearGradient } from 'expo-linear-gradient';

export default function CaregiverNotificationsScreen() {
  const { notifications, loading, error, getNotifications, markAsRead, markAsArchived, deleteNotification, getStats, stats } = useNotifications();
  const prefs = useNotificationPrefs();

  useEffect(() => {
    prefs.load();
    getNotifications().catch(() => {});
    getStats().catch(() => {});
  }, []);

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subtitle}>Cargando notificaciones…</Text>
      </View>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.title}>Error</Text>
        <Text style={styles.subtitle}>{error}</Text>
      </View>
    );
  }

  // Aplicar silencios
  const visible = notifications.filter(n => !prefs.mutedTypes.includes(n.type));

  // Agrupación
  const groups: Record<string, typeof visible> = {};
  if (prefs.grouping === 'byType') {
    visible.forEach(n => {
      const key = n.type || 'OTROS';
      groups[key] = groups[key] || [];
      groups[key].push(n);
    });
  } else if (prefs.grouping === 'byPriority') {
    visible.forEach(n => {
      const key = n.priority || 'LOW';
      groups[key] = groups[key] || [];
      groups[key].push(n);
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Resumen */}
      <LinearGradient colors={["#e0f2fe", "#f0fdfa"]} style={styles.card} start={{x:0, y:0}} end={{x:1, y:1}}>
        <Text style={styles.headerTitle}>Resumen</Text>
        <Text style={styles.statText}>Total: {stats?.total ?? notifications.length}</Text>
        <Text style={styles.statText}>No leídas: {stats?.unread ?? 0}</Text>
        <Text style={styles.statText}>Archivadas: {stats?.archived ?? 0}</Text>
      </LinearGradient>

      {/* Preferencias */}
      <LinearGradient colors={["#e0e7ff", "#f0fdfa"]} style={styles.card} start={{x:0, y:0}} end={{x:1, y:1}}>
        <Text style={styles.headerTitle}>Preferencias</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['MEDICATION_REMINDER','APPOINTMENT_REMINDER','TREATMENT_REMINDER','SYSTEM','CUSTOM'].map(t => (
            <TouchableOpacity key={t} style={[styles.pill, prefs.mutedTypes.includes(t) && styles.pillMuted]} onPress={() => prefs.toggleMute(t)}>
              <Text style={[styles.pillText, prefs.mutedTypes.includes(t) && styles.pillTextMuted]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {[
            { k: 'none', label: 'Sin agrupación' },
            { k: 'byType', label: 'Por tipo' },
            { k: 'byPriority', label: 'Por prioridad' },
          ].map(opt => (
            <TouchableOpacity key={opt.k} style={[styles.groupBtn, (prefs.grouping === (opt.k as any)) && styles.groupBtnActive]} onPress={() => prefs.setGrouping(opt.k as any)}>
              <Text style={[styles.groupText, (prefs.grouping === (opt.k as any)) && styles.groupTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {(prefs.grouping === 'none' ? visible : []).length === 0 && Object.keys(groups).length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay notificaciones.</Text>
        </View>
      ) : (
        <>
          {prefs.grouping === 'none' && visible.map((n) => (
            <LinearGradient key={n.id} colors={["#e0e7ff", "#f0fdfa"]} style={styles.card} start={{x:0, y:0}} end={{x:1, y:1}}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => markAsRead(n.id)}>
                    <Ionicons name="checkmark-done" size={20} color="#22c55e" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => markAsArchived(n.id)}>
                    <Ionicons name="archive" size={20} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => deleteNotification(n.id)}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.message}>{n.message}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Tipo: {n.type}</Text>
                <Text style={styles.metaText}>Prioridad: {n.priority}</Text>
              </View>
            </LinearGradient>
          ))}

          {prefs.grouping !== 'none' && Object.keys(groups).map(groupKey => (
            <LinearGradient key={groupKey} colors={["#f1f5f9", "#f0fdfa"]} style={styles.card} start={{x:0, y:0}} end={{x:1, y:1}}>
              <Text style={styles.headerTitle}>Grupo: {groupKey}</Text>
              {groups[groupKey].map(n => (
                <View key={n.id} style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 }}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{n.title}</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => markAsRead(n.id)}>
                        <Ionicons name="checkmark-done" size={18} color="#22c55e" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => markAsArchived(n.id)}>
                        <Ionicons name="archive" size={18} color="#2563eb" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => deleteNotification(n.id)}>
                        <Ionicons name="trash" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.message}>{n.message}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>Tipo: {n.type}</Text>
                    <Text style={styles.metaText}>Prioridad: {n.priority}</Text>
                  </View>
                </View>
              ))}
            </LinearGradient>
          ))}
        </>
      )}
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  statText: {
    color: '#334155',
    fontSize: 14,
    marginBottom: 2,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.96)'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 16,
  },
  iconBtn: {
    marginLeft: 6,
    backgroundColor: '#e0e7ff',
    padding: 6,
    borderRadius: 8,
  },
  message: {
    color: '#334155',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#64748b',
    fontSize: 13,
  },
  pill: {
    backgroundColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  pillMuted: {
    backgroundColor: '#fee2e2',
  },
  pillText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextMuted: {
    color: '#ef4444',
  },
  groupBtn: {
    backgroundColor: '#e0e7ff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  groupBtnActive: {
    backgroundColor: '#2563eb',
  },
  groupText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  groupTextActive: {
    color: '#fff',
  },
});


