import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlarms } from '../../hooks/useAlarms';
import NotificationsList from '../../components/NotificationsList';
import OfflineIndicator from '../../components/OfflineIndicator';
import COLORS from '../../constants/colors';
import { GLOBAL_STYLES } from '../../constants/styles';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export default function NotificationsScreen() {
  const { 
    apiNotifications, 
    apiLoading,
    loadApiNotifications,
    markApiNotificationAsRead,
    archiveApiNotification,
    markMultipleAsRead
  } = useAlarms();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');

  const loadData = useMemo(() => async () => {
    await loadApiNotifications();
  }, [loadApiNotifications]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderNotificationsTab = () => (
    <View style={GLOBAL_STYLES.section}>
      <View style={GLOBAL_STYLES.rowSpaced}>
        <Text style={GLOBAL_STYLES.sectionHeader}>Filtros</Text>
        <TouchableOpacity 
          style={GLOBAL_STYLES.buttonSecondary}
          onPress={() => loadApiNotifications()}
        >
          <Text style={GLOBAL_STYLES.buttonSecondaryText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContainer}>
        {(['all', 'unread', 'read', 'archived'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === filter && styles.filterButtonTextActive
            ]}>
              {filter === 'all' ? 'Todas' : 
               filter === 'unread' ? 'No Leídas' :
               filter === 'read' ? 'Leídas' : 'Archivadas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <NotificationsList 
        embedded={true}
        filters={{ 
          status: activeFilter === 'all' ? undefined : 
                  activeFilter === 'unread' ? 'UNREAD' :
                  activeFilter === 'read' ? 'READ' : 'ARCHIVED'
        }}
      />
    </View>
  );

  return (
    <LinearGradient colors={COLORS.gradients.primary} style={{ flex: 1 }}>
      <View style={GLOBAL_STYLES.container}>
        <OfflineIndicator />
        
        <View style={GLOBAL_STYLES.header}>
          <Text style={GLOBAL_STYLES.headerTitle}>Notificaciones</Text>
          <Text style={GLOBAL_STYLES.headerSubtitle}>
            Gestiona tus notificaciones y recordatorios
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="notifications" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{apiNotifications.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="mail-unread" size={24} color={COLORS.accent.orange} />
            <Text style={styles.statNumber}>{apiNotifications.filter(n => n.status === 'UNREAD').length}</Text>
            <Text style={styles.statLabel}>No Leídas</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.accent.green} />
            <Text style={styles.statNumber}>{apiNotifications.filter(n => n.status === 'READ').length}</Text>
            <Text style={styles.statLabel}>Leídas</Text>
          </View>
        </View>

        {renderNotificationsTab()}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    padding: 16,
    borderRadius: 12,
    minWidth: 80,
    shadowColor: COLORS.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background.neutral,
    borderWidth: 1,
    borderColor: COLORS.border.neutral,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.background.white,
  },
});
