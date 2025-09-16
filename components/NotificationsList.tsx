import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlarms } from '../hooks/useAlarms';
import { ApiNotification } from '../lib/notificationService';
import COLORS from '../constants/colors';

interface NotificationsListProps {
  showArchived?: boolean;
  filterType?: string;
  onNotificationPress?: (notification: ApiNotification) => void;
  embedded?: boolean;
  filters?: {
    status?: string;
    type?: string;
  };
}

export default function NotificationsList({ 
  showArchived = false, 
  filterType,
  onNotificationPress,
  embedded = false,
  filters
}: NotificationsListProps) {
  const { 
    apiNotifications, 
    apiLoading, 
    loadApiNotifications, 
    markApiNotificationAsRead, 
    archiveApiNotification,
    markMultipleAsRead
  } = useAlarms();
  
  // Simplificación: sin selección múltiple ni acciones masivas

  useEffect(() => {
    loadNotifications();
  }, [showArchived, filterType, filters]);

  const loadNotifications = async () => {
    try {
      const apiFilters: any = {
        status: filters?.status || (showArchived ? 'ARCHIVED' : 'UNREAD'),
        pageSize: 50
      };
      
      if (filters?.type || filterType) {
        apiFilters.type = filters?.type || filterType;
      }
      
      await loadApiNotifications(apiFilters);
    } catch (error) {
      console.log('[NotificationsList] Error cargando notificaciones:', error);
      // Continuar sin mostrar error, ya que el sistema híbrido maneja esto
    }
  };

  const handleNotificationPress = async (notification: ApiNotification) => {
    // Marcar como leída si no está leída y abrir detalle
    if (notification.status === 'UNREAD') {
      try {
        await markApiNotificationAsRead(notification.id);
      } catch {}
    }
    onNotificationPress?.(notification);
  };

  const handleLongPress = (_notification: ApiNotification) => {};

  const toggleNotificationSelection = (_notificationId: string) => {};

  const handleMarkSelectedAsRead = async () => {};

  const handleArchiveSelected = async () => {};

  const handleCancelSelection = () => {};

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MEDICATION_REMINDER':
        return { name: 'medical', color: COLORS.medical.medication };
      case 'APPOINTMENT_REMINDER':
        return { name: 'calendar', color: COLORS.medical.appointment };
      case 'TREATMENT_UPDATE':
        return { name: 'fitness', color: COLORS.primary };
      case 'EMERGENCY_ALERT':
        return { name: 'warning', color: COLORS.error };
      case 'SYSTEM_MESSAGE':
        return { name: 'settings', color: COLORS.text.secondary };
      case 'CAREGIVER_REQUEST':
        return { name: 'people', color: COLORS.secondary || '#10b981' };
      case 'PERMISSION_UPDATE':
        return { name: 'shield-checkmark', color: COLORS.warning };
      default:
        return { name: 'notifications', color: COLORS.text.secondary };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return COLORS.error;
      case 'HIGH':
        return COLORS.warning;
      case 'MEDIUM':
        return COLORS.primary;
      case 'LOW':
        return COLORS.success;
      default:
        return COLORS.text.secondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else if (diffInHours < 48) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  const renderNotification = ({ item }: { item: ApiNotification }) => {
    const icon = getNotificationIcon(item.type);
    const priorityColor = getPriorityColor(item.priority);
    const isSelected = false;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          item.status === 'UNREAD' && styles.unreadNotification,
          isSelected && styles.selectedNotification
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {/* Modo selección removido */}

        <View style={styles.notificationIcon}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
          {item.status === 'UNREAD' && (
            <View style={[styles.unreadIndicator, { backgroundColor: priorityColor }]} />
          )}
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.notificationMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {item.priority}
                </Text>
              </View>
              <Text style={styles.notificationTime}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={3}>
            {item.message}
          </Text>

          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <View style={styles.metadataContainer}>
              {Object.entries(item.metadata).slice(0, 2).map(([key, value]) => (
                <Text key={key} style={styles.metadataText}>
                  {key}: {value}
                </Text>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={async () => {
            try {
              if (item.status === 'UNREAD') {
                await markApiNotificationAsRead(item.id);
              } else {
                await archiveApiNotification(item.id);
              }
              await loadNotifications();
            } catch {}
          }}
        >
          <Ionicons 
            name={item.status === 'UNREAD' ? 'checkmark-circle' : 'archive'} 
            size={20} 
            color={item.status === 'UNREAD' ? COLORS.success : COLORS.text.secondary} 
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off" size={48} color={COLORS.text.secondary} />
      <Text style={styles.emptyStateTitle}>
        {showArchived ? 'No hay notificaciones archivadas' : 'No hay notificaciones'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {showArchived 
          ? 'Las notificaciones archivadas aparecerán aquí'
          : 'Las notificaciones de medicamentos y citas aparecerán aquí cuando se programen'
        }
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={loadNotifications}
      >
        <Ionicons name="refresh" size={16} color={COLORS.primary} />
        <Text style={styles.refreshButtonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, embedded && styles.embeddedContainer]}>
      {/* Controles avanzados removidos para simplificar */}

      <FlatList
        data={apiNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={apiLoading}
            onRefresh={loadNotifications}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          apiNotifications.length === 0 ? styles.emptyList : undefined,
          embedded && styles.embeddedList
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.neutral,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.background.white,
    borderWidth: 1,
    borderColor: COLORS.border.neutral,
  },
  readButton: {
    borderColor: COLORS.success,
  },
  archiveButton: {
    borderColor: COLORS.text.secondary,
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  cancelButton: {
    padding: 6,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  unreadNotification: {
    backgroundColor: COLORS.primary + '05',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  selectedNotification: {
    backgroundColor: COLORS.primary + '10',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border.neutral,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  notificationIcon: {
    position: 'relative',
    marginRight: 12,
  },
  unreadIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 8,
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metadataText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    backgroundColor: COLORS.background.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyList: {
    flex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  refreshButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});
