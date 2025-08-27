import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNotes } from '../../store/useNotes';
import OfflineIndicator from '../../components/OfflineIndicator';

// Mock de notas
const mockNotes = [
  { id: 1, title: 'Nota médica', content: 'Paciente estable.', date: '2024-08-15' },
  { id: 2, title: 'Control de presión', content: 'Presión arterial dentro de rango.', date: '2024-08-10' },
];

const noteSchema = z.object({
  title: z.string().min(1, 'Obligatorio'),
  content: z.string().min(1, 'Obligatorio'),
});

type NoteForm = z.infer<typeof noteSchema>;

type Note = typeof mockNotes[0];

export default function NotesScreen() {
  const { notes, loading, error, getNotes, createNote, updateNote, deleteNote } = useNotes();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  React.useEffect(() => {
    getNotes();
  }, []);

  const openEditModal = (note: any) => {
    setEditingNote(note);
    setModalVisible(true);
    setValue('title', note.title);
    setValue('content', note.content);
  };
  const openCreateModal = () => {
    setEditingNote(null);
    setModalVisible(true);
    reset();
  };
  const onSubmit = async (data: NoteForm) => {
    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          title: data.title,
          content: data.content,
          date: editingNote.date,
        });
      } else {
        await createNote({
          title: data.title,
          content: data.content,
          date: new Date().toISOString().slice(0, 10),
        });
      }
      reset();
      setModalVisible(false);
      setEditingNote(null);
    } catch (e) {}
  };
  const onDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta nota?')) {
      await deleteNote(id);
    }
  };

  // Render de cada nota
  const renderItem = ({ item }: { item: Note }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="file-document" size={20} color="#64748b" style={{ marginRight: 8 }} />
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={20} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardInfo}>{item.content}</Text>
      <Text style={styles.cardDate}>Fecha: {item.date}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notas Médicas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Ionicons name="add-circle" size={28} color="#fff" />
          <Text style={styles.addBtnText}>Nueva nota</Text>
        </TouchableOpacity>
      </View>
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
          data={notes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay notas registradas</Text>}
        />
      )}
      {/* Modal para crear nota */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setModalVisible(false); setEditingNote(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingNote ? 'Editar Nota Médica' : 'Agregar Nota Médica'}</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Título *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Título de la nota"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="content"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contenido *</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    placeholder="Contenido de la nota"
                    value={value}
                    onChangeText={onChange}
                    multiline
                  />
                  {errors.content && <Text style={styles.errorText}>{errors.content.message}</Text>}
                </View>
              )}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#2563eb' }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || loading}
              >
                <Text style={styles.buttonText}>{editingNote ? 'Guardar cambios' : 'Guardar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#64748b' }]}
                onPress={() => { setModalVisible(false); setEditingNote(null); reset(); }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
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
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 16,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconBtn: {
    marginHorizontal: 2,
    padding: 4,
  },
  cardInfo: {
    color: '#64748b',
    fontSize: 13,
  },
  cardDate: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 4,
    color: '#334155',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    fontSize: 15,
    color: '#1e293b',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 5,
    textAlign: 'center',
  },
});
