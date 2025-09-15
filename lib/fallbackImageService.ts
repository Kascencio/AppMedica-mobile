import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FallbackImageResult {
  success: boolean;
  url?: string;
  error?: string;
  method: 'imagekit' | 'local' | 'base64';
}

/**
 * Servicio de respaldo para imágenes cuando ImageKit no está disponible
 */
class FallbackImageService {
  private static instance: FallbackImageService;
  
  private constructor() {}
  
  public static getInstance(): FallbackImageService {
    if (!FallbackImageService.instance) {
      FallbackImageService.instance = new FallbackImageService();
    }
    return FallbackImageService.instance;
  }

  /**
   * Guarda una imagen localmente como respaldo
   */
  async saveImageLocally(
    uri: string, 
    userId: string, 
    folder: string = 'profiles'
  ): Promise<FallbackImageResult> {
    try {
      console.log('[FallbackImageService] 💾 Guardando imagen localmente...');
      
      // Crear directorio si no existe
      const localDir = `${FileSystem.documentDirectory}images/${folder}/`;
      const dirInfo = await FileSystem.getInfoAsync(localDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
        console.log('[FallbackImageService] 📁 Directorio creado:', localDir);
      }
      
      // Generar nombre único
      const timestamp = Date.now();
      const extension = uri.split('.').pop() || 'jpg';
      const fileName = `${userId}_${timestamp}.${extension}`;
      const localPath = `${localDir}${fileName}`;
      
      // Copiar imagen al directorio local
      await FileSystem.copyAsync({
        from: uri,
        to: localPath
      });
      
      console.log('[FallbackImageService] ✅ Imagen guardada localmente:', localPath);
      
      return {
        success: true,
        url: localPath,
        method: 'local'
      };
      
    } catch (error: any) {
      console.error('[FallbackImageService] ❌ Error guardando imagen localmente:', error);
      return {
        success: false,
        error: error.message || 'Error al guardar imagen localmente',
        method: 'local'
      };
    }
  }

  /**
   * Guarda una imagen como base64 en AsyncStorage
   */
  async saveImageAsBase64(
    uri: string, 
    userId: string, 
    key: string = 'profile_photo'
  ): Promise<FallbackImageResult> {
    try {
      console.log('[FallbackImageService] 📝 Guardando imagen como base64...');
      
      // Leer imagen como base64
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Crear clave única
      const storageKey = `${key}_${userId}_${Date.now()}`;
      
      // Guardar en AsyncStorage
      await AsyncStorage.setItem(storageKey, base64Data);
      
      // También guardar la clave para referencia
      const keysKey = `${key}_keys_${userId}`;
      const existingKeys = await AsyncStorage.getItem(keysKey);
      const keys = existingKeys ? JSON.parse(existingKeys) : [];
      keys.push(storageKey);
      await AsyncStorage.setItem(keysKey, JSON.stringify(keys));
      
      console.log('[FallbackImageService] ✅ Imagen guardada como base64:', storageKey);
      
      return {
        success: true,
        url: storageKey, // Usar la clave como "URL"
        method: 'base64'
      };
      
    } catch (error: any) {
      console.error('[FallbackImageService] ❌ Error guardando imagen como base64:', error);
      return {
        success: false,
        error: error.message || 'Error al guardar imagen como base64',
        method: 'base64'
      };
    }
  }

  /**
   * Carga una imagen desde AsyncStorage
   */
  async loadImageFromStorage(storageKey: string): Promise<string | null> {
    try {
      const base64Data = await AsyncStorage.getItem(storageKey);
      if (base64Data) {
        return `data:image/jpeg;base64,${base64Data}`;
      }
      return null;
    } catch (error) {
      console.error('[FallbackImageService] Error cargando imagen desde storage:', error);
      return null;
    }
  }

  /**
   * Elimina imágenes antiguas para liberar espacio
   */
  async cleanupOldImages(userId: string, key: string = 'profile_photo'): Promise<void> {
    try {
      console.log('[FallbackImageService] 🧹 Limpiando imágenes antiguas...');
      
      const keysKey = `${key}_keys_${userId}`;
      const existingKeys = await AsyncStorage.getItem(keysKey);
      
      if (existingKeys) {
        const keys = JSON.parse(existingKeys);
        
        // Mantener solo las últimas 3 imágenes
        if (keys.length > 3) {
          const keysToDelete = keys.slice(0, keys.length - 3);
          const keysToKeep = keys.slice(-3);
          
          // Eliminar imágenes antiguas
          for (const keyToDelete of keysToDelete) {
            await AsyncStorage.removeItem(keyToDelete);
          }
          
          // Actualizar lista de claves
          await AsyncStorage.setItem(keysKey, JSON.stringify(keysToKeep));
          
          console.log('[FallbackImageService] ✅ Eliminadas', keysToDelete.length, 'imágenes antiguas');
        }
      }
      
    } catch (error) {
      console.error('[FallbackImageService] Error en limpieza:', error);
    }
  }

  /**
   * Obtiene la imagen de perfil actual del usuario
   */
  async getCurrentProfileImage(userId: string): Promise<string | null> {
    try {
      const keysKey = `profile_photo_keys_${userId}`;
      const existingKeys = await AsyncStorage.getItem(keysKey);
      
      if (existingKeys) {
        const keys = JSON.parse(existingKeys);
        if (keys.length > 0) {
          // Obtener la imagen más reciente
          const latestKey = keys[keys.length - 1];
          return await this.loadImageFromStorage(latestKey);
        }
      }
      
      return null;
    } catch (error) {
      console.error('[FallbackImageService] Error obteniendo imagen actual:', error);
      return null;
    }
  }

  /**
   * Verifica si una URL es una imagen local o base64
   */
  isFallbackImage(url: string): boolean {
    return url.startsWith('file://') || 
           url.startsWith('data:image/') || 
           url.includes('_profile_photo_');
  }
}

// Instancia singleton
export const fallbackImageService = FallbackImageService.getInstance();

/**
 * Hook para usar el servicio de respaldo
 */
export const useFallbackImage = () => {
  const saveProfileImage = async (uri: string, userId: string): Promise<FallbackImageResult> => {
    // Intentar guardar localmente primero
    const localResult = await fallbackImageService.saveImageLocally(uri, userId);
    
    if (localResult.success) {
      return localResult;
    }
    
    // Si falla, intentar como base64
    const base64Result = await fallbackImageService.saveImageAsBase64(uri, userId);
    
    if (base64Result.success) {
      // Limpiar imágenes antiguas
      await fallbackImageService.cleanupOldImages(userId);
    }
    
    return base64Result;
  };

  const getProfileImage = async (userId: string): Promise<string | null> => {
    return await fallbackImageService.getCurrentProfileImage(userId);
  };

  const isFallback = (url: string): boolean => {
    return fallbackImageService.isFallbackImage(url);
  };

  return {
    saveProfileImage,
    getProfileImage,
    isFallback,
    loadImageFromStorage: fallbackImageService.loadImageFromStorage.bind(fallbackImageService),
  };
};
