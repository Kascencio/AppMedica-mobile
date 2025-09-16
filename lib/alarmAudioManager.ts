/**
 * Gestor de audio y vibración para alarmas
 */

import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';
import { handleAlarmError } from './alarmErrorHandler';

export class AlarmAudioManager {
  private static instance: AlarmAudioManager;
  private currentSound: Audio.Sound | null = null;
  private vibrationInterval: NodeJS.Timeout | null = null;
  private isPlaying = false;

  public static getInstance(): AlarmAudioManager {
    if (!AlarmAudioManager.instance) {
      AlarmAudioManager.instance = new AlarmAudioManager();
    }
    return AlarmAudioManager.instance;
  }

  /**
   * Configurar audio para alarmas
   */
  public async configureAudio(): Promise<boolean> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('[AlarmAudioManager] Audio configurado correctamente');
      return true;
    } catch (error) {
      handleAlarmError(error, 'configureAudio');
      console.error('[AlarmAudioManager] Error configurando audio:', error);
      return false;
    }
  }

  /**
   * Reproducir sonido de alarma
   */
  public async playAlarmSound(): Promise<boolean> {
    try {
      // Evitar arranques duplicados si ya está reproduciendo
      if (this.isPlaying && this.currentSound) {
        console.log('[AlarmAudioManager] Sonido ya reproduciéndose; evitando duplicado');
        return true;
      }
      // Detener sonido anterior si existe
      await this.stopAlarmSound();

      // Configurar audio
      await this.configureAudio();

      // Cargar y reproducir sonido
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/alarm.mp3'),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );

      this.currentSound = sound;
      this.isPlaying = true;

      // Configurar callback cuando termine el sonido
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isPlaying = false;
        }
      });

      console.log('[AlarmAudioManager] Sonido de alarma iniciado');
      return true;
    } catch (error) {
      handleAlarmError(error, 'playAlarmSound');
      console.error('[AlarmAudioManager] Error reproduciendo sonido:', error);
      
      // Fallback: usar vibración más intensa
      this.startIntensiveVibration();
      return false;
    }
  }

  /**
   * Detener sonido de alarma
   */
  public async stopAlarmSound(): Promise<void> {
    try {
      if (this.currentSound) {
        // Intentar parar antes de descargar para evitar callbacks colgados
        try { await this.currentSound.stopAsync(); } catch {}
        try { await this.currentSound.unloadAsync(); } catch {}
        this.currentSound = null;
      }
      this.isPlaying = false;
      this.stopVibration();
      // Restablecer modo de audio para liberar recursos
      try {
        await Audio.setAudioModeAsync({ staysActiveInBackground: false, allowsRecordingIOS: false });
      } catch {}
      console.log('[AlarmAudioManager] Sonido de alarma detenido');
    } catch (error) {
      handleAlarmError(error, 'stopAlarmSound');
      console.error('[AlarmAudioManager] Error deteniendo sonido:', error);
    }
  }

  /**
   * Iniciar vibración de alarma
   */
  public startAlarmVibration(): void {
    try {
      // Vibración inicial más intensa
      Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
      
      // Configurar vibración continua cada 3 segundos
      this.vibrationInterval = setInterval(() => {
        if (this.isPlaying) {
          Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
        }
      }, 3000);
      
      console.log('[AlarmAudioManager] Vibración de alarma iniciada');
    } catch (error) {
      handleAlarmError(error, 'startAlarmVibration');
      console.error('[AlarmAudioManager] Error iniciando vibración:', error);
    }
  }

  /**
   * Iniciar vibración intensa (fallback)
   */
  public startIntensiveVibration(): void {
    try {
      // Vibración más intensa como fallback
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);
      
      // Configurar vibración continua cada 2 segundos
      this.vibrationInterval = setInterval(() => {
        Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);
      }, 2000);
      
      console.log('[AlarmAudioManager] Vibración intensa iniciada');
    } catch (error) {
      handleAlarmError(error, 'startIntensiveVibration');
      console.error('[AlarmAudioManager] Error iniciando vibración intensa:', error);
    }
  }

  /**
   * Detener vibración
   */
  public stopVibration(): void {
    try {
      if (this.vibrationInterval) {
        clearInterval(this.vibrationInterval);
        this.vibrationInterval = null;
      }
      // Cancelar cualquier vibración en curso a nivel del sistema
      Vibration.cancel();
      console.log('[AlarmAudioManager] Vibración detenida');
    } catch (error) {
      handleAlarmError(error, 'stopVibration');
      console.error('[AlarmAudioManager] Error deteniendo vibración:', error);
    }
  }

  /**
   * Alias para compatibilidad retro: detener vibración de alarma
   */
  public stopAlarmVibration(): void {
    this.stopVibration();
  }

  /**
   * Iniciar alarma completa (sonido + vibración)
   */
  public async startAlarm(): Promise<boolean> {
    try {
      const soundSuccess = await this.playAlarmSound();
      this.startAlarmVibration();
      
      console.log('[AlarmAudioManager] Alarma completa iniciada');
      return soundSuccess;
    } catch (error) {
      handleAlarmError(error, 'startAlarm');
      console.error('[AlarmAudioManager] Error iniciando alarma completa:', error);
      return false;
    }
  }

  /**
   * Detener alarma completa
   */
  public async stopAlarm(): Promise<void> {
    try {
      await this.stopAlarmSound();
      this.stopVibration();
      console.log('[AlarmAudioManager] Alarma completa detenida');
    } catch (error) {
      handleAlarmError(error, 'stopAlarm');
      console.error('[AlarmAudioManager] Error deteniendo alarma completa:', error);
    }
  }

  /**
   * Verificar si la alarma está reproduciéndose
   */
  public isAlarmPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Limpiar recursos
   */
  public cleanup(): void {
    this.stopAlarm();
  }
}

// Instancia singleton
export const alarmAudioManager = AlarmAudioManager.getInstance();
