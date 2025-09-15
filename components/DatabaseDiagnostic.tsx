import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { localDB } from '../data/db';
import { Ionicons } from '@expo/vector-icons';

export default function DatabaseDiagnostic() {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testDatabaseConnection = async () => {
    setTesting(true);
    addResult('🔌 Probando conexión a la base de datos...');
    
    try {
      await localDB.ensureInitialized();
      addResult('✅ Conexión a la base de datos exitosa');
      
      // Probar una consulta simple
      const db = localDB.getDatabase();
      if (db) {
        const result = await db.getAllAsync('SELECT COUNT(*) as count FROM profiles');
        addResult(`📊 Perfiles en la base de datos: ${result[0]?.count || 0}`);
      }
      
    } catch (error: any) {
      addResult(`❌ Error de conexión: ${error.message}`);
    }
    
    setTesting(false);
  };

  const checkProfileIntegrity = async () => {
    setTesting(true);
    addResult('🔍 Verificando integridad de perfiles...');
    
    try {
      const db = localDB.getDatabase();
      if (!db) {
        addResult('❌ Base de datos no disponible');
        setTesting(false);
        return;
      }
      
      // Verificar perfiles con createdAt nulo
      const profilesWithNullCreatedAt = await db.getAllAsync(`
        SELECT id, name, createdAt, updatedAt FROM profiles 
        WHERE createdAt IS NULL OR createdAt = ''
      `);
      
      if (profilesWithNullCreatedAt.length > 0) {
        addResult(`⚠️ Encontrados ${profilesWithNullCreatedAt.length} perfiles con createdAt nulo`);
        profilesWithNullCreatedAt.forEach(profile => {
          addResult(`   - ${profile.name} (${profile.id}): createdAt=${profile.createdAt}, updatedAt=${profile.updatedAt}`);
        });
      } else {
        addResult('✅ Todos los perfiles tienen createdAt válido');
      }
      
      // Verificar perfiles con updatedAt nulo
      const profilesWithNullUpdatedAt = await db.getAllAsync(`
        SELECT id, name, createdAt, updatedAt FROM profiles 
        WHERE updatedAt IS NULL OR updatedAt = ''
      `);
      
      if (profilesWithNullUpdatedAt.length > 0) {
        addResult(`⚠️ Encontrados ${profilesWithNullUpdatedAt.length} perfiles con updatedAt nulo`);
        profilesWithNullUpdatedAt.forEach(profile => {
          addResult(`   - ${profile.name} (${profile.id}): createdAt=${profile.createdAt}, updatedAt=${profile.updatedAt}`);
        });
      } else {
        addResult('✅ Todos los perfiles tienen updatedAt válido');
      }
      
      // Mostrar todos los perfiles
      const allProfiles = await db.getAllAsync(`
        SELECT id, name, createdAt, updatedAt FROM profiles ORDER BY updatedAt DESC
      `);
      
      addResult(`📋 Total de perfiles: ${allProfiles.length}`);
      allProfiles.forEach((profile, index) => {
        addResult(`   ${index + 1}. ${profile.name}: created=${profile.createdAt?.substring(0, 19)}, updated=${profile.updatedAt?.substring(0, 19)}`);
      });
      
    } catch (error: any) {
      addResult(`❌ Error verificando integridad: ${error.message}`);
    }
    
    setTesting(false);
  };

  const fixProfileIssues = async () => {
    setTesting(true);
    addResult('🔧 Corrigiendo problemas de perfiles...');
    
    try {
      const db = localDB.getDatabase();
      if (!db) {
        addResult('❌ Base de datos no disponible');
        setTesting(false);
        return;
      }
      
      // Corregir perfiles con createdAt nulo
      const profilesWithNullCreatedAt = await db.getAllAsync(`
        SELECT id, name, updatedAt FROM profiles 
        WHERE createdAt IS NULL OR createdAt = ''
      `);
      
      if (profilesWithNullCreatedAt.length > 0) {
        addResult(`🔧 Corrigiendo ${profilesWithNullCreatedAt.length} perfiles con createdAt nulo...`);
        
        for (const profile of profilesWithNullCreatedAt) {
          const createdAt = profile.updatedAt || new Date().toISOString();
          
          await db.runAsync(`
            UPDATE profiles 
            SET createdAt = ? 
            WHERE id = ?
          `, [createdAt, profile.id]);
          
          addResult(`   ✅ Corregido: ${profile.name} (${profile.id})`);
        }
        
        addResult('✅ Corrección de createdAt completada');
      } else {
        addResult('✅ No hay perfiles con createdAt nulo para corregir');
      }
      
      // Corregir perfiles con updatedAt nulo
      const profilesWithNullUpdatedAt = await db.getAllAsync(`
        SELECT id, name FROM profiles 
        WHERE updatedAt IS NULL OR updatedAt = ''
      `);
      
      if (profilesWithNullUpdatedAt.length > 0) {
        addResult(`🔧 Corrigiendo ${profilesWithNullUpdatedAt.length} perfiles con updatedAt nulo...`);
        
        for (const profile of profilesWithNullUpdatedAt) {
          const updatedAt = new Date().toISOString();
          
          await db.runAsync(`
            UPDATE profiles 
            SET updatedAt = ? 
            WHERE id = ?
          `, [updatedAt, profile.id]);
          
          addResult(`   ✅ Corregido: ${profile.name} (${profile.id})`);
        }
        
        addResult('✅ Corrección de updatedAt completada');
      } else {
        addResult('✅ No hay perfiles con updatedAt nulo para corregir');
      }
      
      Alert.alert('Corrección completada', 'Los problemas de perfiles han sido corregidos');
      
    } catch (error: any) {
      addResult(`❌ Error corrigiendo problemas: ${error.message}`);
      Alert.alert('Error', 'Error al corregir problemas de la base de datos');
    }
    
    setTesting(false);
  };

  const clearDatabase = async () => {
    Alert.alert(
      'Limpiar base de datos',
      '¿Estás seguro de que quieres eliminar todos los datos locales? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar todo',
          style: 'destructive',
          onPress: async () => {
            setTesting(true);
            addResult('🗑️ Limpiando base de datos...');
            
            try {
              const db = localDB.getDatabase();
              if (!db) {
                addResult('❌ Base de datos no disponible');
                setTesting(false);
                return;
              }
              
              await db.execAsync(`
                DELETE FROM profiles;
                DELETE FROM medications;
                DELETE FROM appointments;
                DELETE FROM treatments;
                DELETE FROM notes;
                DELETE FROM intake_events;
                DELETE FROM sync_queue;
              `);
              
              addResult('✅ Base de datos limpiada completamente');
              Alert.alert('Completado', 'Base de datos limpiada');
              
            } catch (error: any) {
              addResult(`❌ Error limpiando base de datos: ${error.message}`);
              Alert.alert('Error', 'Error al limpiar la base de datos');
            }
            
            setTesting(false);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗄️ Diagnóstico de Base de Datos</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={testDatabaseConnection}
          disabled={testing}
        >
          <Ionicons name="link" size={20} color="#fff" />
          <Text style={styles.buttonText}>Probar Conexión</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={checkProfileIntegrity}
          disabled={testing}
        >
          <Ionicons name="search" size={20} color="#2563eb" />
          <Text style={[styles.buttonText, { color: '#2563eb' }]}>Verificar Perfiles</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.tertiaryButton]} 
          onPress={fixProfileIssues}
          disabled={testing}
        >
          <Ionicons name="construct" size={20} color="#22c55e" />
          <Text style={[styles.buttonText, { color: '#22c55e' }]}>Corregir Problemas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={clearDatabase}
          disabled={testing}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
          <Text style={[styles.buttonText, { color: '#ef4444' }]}>Limpiar BD</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.warningButton]} 
          onPress={clearResults}
          disabled={testing}
        >
          <Ionicons name="refresh" size={20} color="#f59e0b" />
          <Text style={[styles.buttonText, { color: '#f59e0b' }]}>Limpiar Logs</Text>
        </TouchableOpacity>
      </View>
      
      {testing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Ejecutando pruebas...</Text>
        </View>
      )}
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>📋 Resultados de las Pruebas:</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No hay resultados aún. Ejecuta alguna prueba.</Text>
        ) : (
          testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>{result}</Text>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  tertiaryButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  warningButton: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#2563eb',
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  resultsTitle: {
    color: '#f1f5f9',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noResults: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  resultText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
