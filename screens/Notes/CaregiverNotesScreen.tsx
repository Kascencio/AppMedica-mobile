import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotes } from '../../store/useNotes';
import { useCaregiver } from '../../store/useCaregiver';
import { useOffline } from '../../store/useOffline';
import { LinearGradient } from 'expo-linear-gradient';

export default function CaregiverNotesScreen() {
  const { notes, loading, error, getNotes, createNote, updateNote, deleteNote } = useNotes();
  const { selectedPatientId } = useCaregiver();
  const { isOnline } = useOffline();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (selectedPatientId) getNotes(selectedPatientId).catch(() => {});
  }, [selectedPatientId]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setModalVisible(true);
  };
  const openEdit = (n: any) => {
    setEditing(n);
    setTitle(n.title || '');
    setContent(n.content || '');
    setModalVisible(true);
  };

  const onSave = async () => {
    try {
      if (!title || !content) {
        Alert.alert('Faltan datos', 'Título y contenido son obligatorios');
        return;
      }
      if (editing) {
        await updateNote(editing.id, { title, content });
      } else {
        await createNote({ title, content, date: new Date().toISOString() });
      }
      setModalVisible(false);
      setEditing(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar la nota');
    }
  };

  const onDelete = async (id: string) => {
    Alert.alert('Eliminar', '¿Eliminar esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteNote(id); } },
    ]);
  };

  if (!selectedPatientId) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="account-heart" size={64} color="#2563eb" />
        <Text style={styles.title}>Selecciona un paciente</Text>
        <Text style={styles.subtitle}>Debes seleccionar un paciente para ver sus notas.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subtitle}>Cargando notas…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.title}>Error</Text>
        <Text style={styles.subtitle}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notas</Text>
        <TouchableOpacity style={[styles.addBtnModern, !isOnline && { opacity: 0.5 }]} onPress={openCreate} activeOpacity={0.85} disabled={!isOnline}>
          <Ionicons name="add-circle" size={28} color="#64748b" />
          <Text style={styles.addBtnTextModern}>Nueva</Text>
        </TouchableOpacity>
      </View>
      {!isOnline && (
        <View style={{ backgroundColor: '#fef9c3', borderColor: '#fde047', borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#92400e' }}>Modo sin conexión: visualización habilitada, edición deshabilitada.</Text>
        </View>
      )}

      {(!notes || notes.length === 0) ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay notas registradas.</Text>
        </View>
      ) : (
        notes.map((n) => (
          <LinearGradient key={n.id} colors={["#e0e7ff", "#f0fdfa"]} style={styles.cardModern} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={styles.cardHeaderModern}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="file-document" size={22} color="#64748b" style={{ marginRight: 10 }} />
                <Text style={styles.cardTitleModern}>{n.title || 'Sin título'}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={styles.iconBtnModern} onPress={() => openEdit(n)}>
                  <Ionicons name="create-outline" size={20} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtnModern} onPress={() => onDelete(n.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ color: '#64748b', marginBottom: 6 }}>{n.date ? new Date(n.date).toLocaleString() : '—'}</Text>
            {n.content ? (
              <View style={styles.notesBoxModern}>
                <Text style={styles.notesTextModern}>{n.content}</Text>
              </View>
            ) : null}
          </LinearGradient>
        ))
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => { setModalVisible(false); setEditing(null); }}>
        <View style={styles.modalOverlayModern}>
          <View style={styles.modalContentModern}>
            <Text style={styles.headerTitle}>{editing ? 'Editar nota' : 'Agregar nota'}</Text>
            <Text style={styles.inputLabel}>Título *</Text>
            <TextInput style={styles.inputModern} value={title} onChangeText={setTitle} placeholder="Título" />
            <Text style={styles.inputLabel}>Contenido *</Text>
            <TextInput style={[styles.inputModern, { height: 100 }]} value={content} onChangeText={setContent} placeholder="Contenido" multiline />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity style={[styles.addBtnModern, { backgroundColor: '#2563eb' }]} onPress={onSave}>
                <Text style={styles.addBtnTextModern}>{editing ? 'Guardar cambios' : 'Guardar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtnModern, { backgroundColor: '#64748b', marginLeft: 8 }]} onPress={() => { setModalVisible(false); setEditing(null); }}>
                <Text style={styles.addBtnTextModern}>Cancelar</Text>
              </TouchableOpacity>
            </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    flex: 1,
    marginRight: 8,
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
  },
  addBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  addBtnTextModern: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  cardModern: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cardHeaderModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleModern: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 18,
  },
  iconBtnModern: {
    marginHorizontal: 2,
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
  },
  notesBoxModern: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  notesTextModern: {
    color: '#64748b',
    fontSize: 14,
  },
  modalOverlayModern: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentModern: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '95%',
  },
  inputModern: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  inputLabel: {
    color: '#334155',
    fontWeight: '600',
    marginBottom: 6,
  },
});


