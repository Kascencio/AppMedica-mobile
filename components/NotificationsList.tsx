import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../store/useNotifications';
import { Notification, NOTIFICATION_STATUSES, NOTIFICATION_PRIORITIES } from '../constants/config';
import COLORS from '../constants/colors';
import { GLOBAL_STYLES } from '../constants/styles';

interface NotificationsListProps {
  filters?: {
    status?: 'UNREAD' | 'READ' | 'ARCHIVED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    type?: string;
    search?: string;
  };
  showActions?: boolean;
  embedded?: boolean;
  onNotificationPress?: (notification: Notification) => void;
}

export default function NotificationsList({ 
  filters = {}, 
  showActions = true,
  embedded = false,
  onNotificationPress 
}: NotificationsListProps) {
  const { 
    notifications, 
    loading, 
    error, 
    pagination,
    getNotifications, 
    markAsRead, 
    markAsArchived, 
    deleteNotification,
    markMultipleAsRead,
    clearError 
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const stableFilters = useMemo(() => filters, [
    filters.status,
    filters.priority,
    filters.type,
    filters.search
  ]);

  useEffect(() => {
    loadNotifications();
  }, [stableFilters]);

  const loadNotifications = async () => {
    // Convertir filtros de estado para que coincidan con el backend
    const backendFilters = {
      ...filters,
            status: filters.status,
      page: 1,
      pageSize: 20
    };
    
    await getNotifications(backendFilters);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    if (onNotificationPress) {
      onNotificationPress(notification);
    } else if (notification.status === NOTIFICATION_STATUSES.UNREAD) {
      markAsRead(notification.id);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAsArchived = async (id: string) => {
    await markAsArchived(id);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Eliminar notificación',
      '¿Estás seguro de que quieres eliminar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteNotification(id)
        }
      ]
    );
  };

  const handleSelectNotification = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const handleMarkMultipleAsRead = async () => {
    if (selectedNotifications.length > 0) {
      await markMultipleAsRead(selectedNotifications);
      setSelectedNotifications([]);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case NOTIFICATION_PRIORITIES.URGENT:
        return COLORS.error;
      case NOTIFICATION_PRIORITIES.HIGH:
        return COLORS.warning;
      case NOTIFICATION_PRIORITIES.MEDIUM:
        return COLORS.info;
      case NOTIFICATION_PRIORITIES.LOW:
        return COLORS.text.tertiary;
      default:
        return COLORS.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case NOTIFICATION_STATUSES.UNREAD:
        return 'mail-unread';
      case NOTIFICATION_STATUSES.READ:
        return 'mail-open';
      case NOTIFICATION_STATUSES.ARCHIVED:
        return 'archive';
      default:
        return 'mail';
    }
  };

  const renderNotification = ({ item: notification }: { item: Notification }) => {
    const isSelected = selectedNotifications.includes(notification.id);
    const isUnread = notification.status === NOTIFICATION_STATUSES.UNREAD;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.unreadNotification,
          isSelected && styles.selectedNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
        onLongPress={() => handleSelectNotification(notification.id)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.notificationInfo}>
            <View style={styles.priorityIndicator}>
              <View 
                style={[
                  styles.priorityDot, 
                  { backgroundColor: getPriorityColor(notification.priority) }
                ]} 
              />
            </View>
            <View style={styles.notificationContent}>
              <Text style={[
                styles.notificationTitle,
                isUnread && styles.unreadTitle
              ]}>
                {notification.title}
              </Text>
              <Text style={styles.notificationMessage} numberOfLines={2}>
                {notification.message}
              </Text>
              <Text style={styles.notificationTime}>
                {new Date(notification.createdAt).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
          
          <View style={styles.notificationActions}>
            <Ionicons 
              name={getStatusIcon(notification.status)} 
              size={20} 
              color={isUnread ? COLORS.primary : COLORS.text.tertiary} 
            />
            
            {showActions && (
              <View style={styles.actionButtons}>
                {notification.status === NOTIFICATION_STATUSES.UNREAD && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMarkAsRead(notification.id)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  </TouchableOpacity>
                )}
                
                {notification.status !== NOTIFICATION_STATUSES.ARCHIVED && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMarkAsArchived(notification.id)}
                  >
                    <Ionicons name="archive" size={16} color={COLORS.info} />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(notification.id)}
                >
                  <Ionicons name="trash" size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        
        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
          <View style={styles.metadataContainer}>
            {Object.entries(notification.metadata).map(([key, value]) => (
              <Text key={key} style={styles.metadataText}>
                {key}: {String(value)}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off" size={48} color={COLORS.text.tertiary} />
      <Text style={styles.emptyStateTitle}>No hay notificaciones</Text>
      <Text style={styles.emptyStateSubtitle}>
        {filters.status === NOTIFICATION_STATUSES.UNREAD 
          ? 'No tienes notificaciones sin leer'
          : filters.status === NOTIFICATION_STATUSES.ARCHIVED
          ? 'No tienes notificaciones archivadas'
          : 'No tienes notificaciones para mostrar'
        }
      </Text>
    </View>
  );

  const renderHeader = () => {
    if (selectedNotifications.length === 0) return null;

    return (
      <View style={styles.selectionHeader}>
        <Text style={styles.selectionText}>
          {selectedNotifications.length} seleccionada{selectedNotifications.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.bulkActionButton}
          onPress={handleMarkMultipleAsRead}
        >
          <Ionicons name="checkmark-circle" size={16} color={COLORS.text.inverse} />
          <Text style={styles.bulkActionText}>Marcar como leídas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelSelectionButton}
          onPress={() => setSelectedNotifications([])}
        >
          <Text style={styles.cancelSelectionText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadNotifications}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          !embedded ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          ) : undefined
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          loading && notifications.length > 0 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando más...</Text>
            </View>
          ) : null
        }
        onEndReached={() => {
          if (pagination.page < pagination.totalPages && !loading) {
            getNotifications({
              ...stableFilters,
              page: pagination.page + 1,
              pageSize: pagination.pageSize
            });
          }
        }}
        onEndReachedThreshold={0.1}
        scrollEnabled={!embedded}
        nestedScrollEnabled={embedded}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  
  selectionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  bulkActionText: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  cancelSelectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  
  cancelSelectionText: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  
  notificationItem: {
    backgroundColor: COLORS.background.card,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.background.tertiary,
  },
  
  selectedNotification: {
    backgroundColor: COLORS.accessibility.selected,
    borderColor: COLORS.primary,
  },
  
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  notificationInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  
  priorityIndicator: {
    marginRight: 12,
    justifyContent: 'center',
  },
  
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  notificationContent: {
    flex: 1,
  },
  
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  
  unreadTitle: {
    fontWeight: '700',
  },
  
  notificationMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  
  notificationTime: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  
  notificationActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  
  metadataContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  
  metadataText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  retryButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
