import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { runFullServerDiagnostic } from '../lib/serverDiagnostic';

export default function ServerDiagnostic() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    
    // Capturar logs de consola
    const originalLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    try {
      await runFullServerDiagnostic();
      
      // Restaurar console.log
      console.log = originalLog;
      
      setResults(logs);
      Alert.alert('Diagnóstico Completado', 'Revisa los resultados en la consola y en esta pantalla');
      
    } catch (error: any) {
      console.log = originalLog;
      setResults([...logs, `Error: ${error.message}`]);
      Alert.alert('Error', 'Hubo un error durante el diagnóstico');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Diagnóstico del Servidor</Text>
      <Text style={styles.subtitle}>
        Esta herramienta probará todos los endpoints de la API para identificar problemas
      </Text>
      
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]} 
        onPress={runDiagnostic}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
        </Text>
      </TouchableOpacity>
      
      {results.length > 0 && (
        <ScrollView style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Resultados:</Text>
          {results.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 15,
    maxHeight: 400,
  },
  resultsTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logText: {
    color: '#d1d5db',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
    lineHeight: 16,
  },
});
