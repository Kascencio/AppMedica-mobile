import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { 
  generateFileName, 
  isValidImageType, 
  getFileExtension,
  getImageCompressionOptions,
  ImageKitUploadResponse,
  IMAGEKIT_CONFIG 
} from '../constants/imagekit';
import { useAuth } from '../store/useAuth';

// Interfaz para las opciones de subida
export interface UploadOptions {
  userId: string;
  folder?: string;
  tags?: string[];
  useUniqueFileName?: boolean;
  compressImage?: boolean;
}

// Interfaz para el resultado de la subida
export interface UploadResult {
  success: boolean;
  url?: string;
  fileId?: string;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

class ImageUploadService {
  private static instance: ImageUploadService;
  
  private constructor() {}
  
  public static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  /**
   * Sube una imagen a ImageKit
   */
  async uploadImage(
    uri: string, 
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      console.log('[ImageUploadService] Iniciando subida de imagen:', uri);
      
      // Validar que la URI existe
      if (!uri) {
        throw new Error('URI de imagen no válida');
      }

      // Validar tipo de archivo
      const fileName = uri.split('/').pop() || 'image.jpg';
      if (!isValidImageType(fileName)) {
        throw new Error('Tipo de archivo no soportado. Use JPG, PNG, WebP o GIF');
      }

      // Obtener información del archivo
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('El archivo no existe');
      }

      // Validar tamaño del archivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileInfo.size && fileInfo.size > maxSize) {
        throw new Error('El archivo es demasiado grande. Máximo 10MB');
      }

      // Generar nombre único si es necesario
      const extension = getFileExtension(fileName);
      const finalFileName = options.useUniqueFileName 
        ? generateFileName(options.userId, extension)
        : fileName;

      // Preparar carpeta
      const folder = options.folder || IMAGEKIT_CONFIG.FOLDER;

      // Leer el archivo como base64
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Preparar datos para ImageKit usando API REST
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${extension}`,
        name: finalFileName,
      } as any);
      formData.append('fileName', finalFileName);
      formData.append('folder', folder);
      formData.append('tags', (options.tags || ['profile', 'recuerdamed']).join(','));
      formData.append('useUniqueFileName', 'true');
      formData.append('responseFields', 'fileId,name,url,thumbnailUrl,height,width,size');

      console.log('[ImageUploadService] Subiendo a ImageKit...');
      
      // Subir a ImageKit usando API REST
      const response = await fetch(`${IMAGEKIT_CONFIG.API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.PRIVATE_KEY + ':')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json() as ImageKitUploadResponse;
      
      console.log('[ImageUploadService] Imagen subida exitosamente:', result.url);

      return {
        success: true,
        url: result.url,
        fileId: result.fileId,
        metadata: {
          width: result.width,
          height: result.height,
          size: result.size,
          format: extension,
        },
      };

    } catch (error: any) {
      console.error('[ImageUploadService] Error en subida:', error);
      
      return {
        success: false,
        error: error.message || 'Error desconocido al subir imagen',
      };
    }
  }

  /**
   * Sube imagen desde la galería o cámara
   */
  async uploadFromPicker(
    pickerResult: any, 
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      if (pickerResult.canceled || !pickerResult.assets || !pickerResult.assets[0]) {
        return {
          success: false,
          error: 'No se seleccionó ninguna imagen',
        };
      }

      const asset = pickerResult.assets[0];
      console.log('[ImageUploadService] Imagen seleccionada:', asset.uri);

      return await this.uploadImage(asset.uri, options);

    } catch (error: any) {
      console.error('[ImageUploadService] Error procesando imagen del picker:', error);
      
      return {
        success: false,
        error: error.message || 'Error procesando imagen seleccionada',
      };
    }
  }

  /**
   * Elimina una imagen de ImageKit usando API REST
   */
  async deleteImage(fileId: string): Promise<boolean> {
    try {
      console.log('[ImageUploadService] Eliminando imagen:', fileId);
      
      const response = await fetch(`${IMAGEKIT_CONFIG.API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.PRIVATE_KEY + ':')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('[ImageUploadService] Imagen eliminada exitosamente');
      return true;

    } catch (error: any) {
      console.error('[ImageUploadService] Error eliminando imagen:', error);
      return false;
    }
  }

  /**
   * Obtiene información de una imagen usando API REST
   */
  async getImageInfo(fileId: string): Promise<ImageKitUploadResponse | null> {
    try {
      const response = await fetch(`${IMAGEKIT_CONFIG.API_BASE_URL}/files/${fileId}/details`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.PRIVATE_KEY + ':')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[ImageUploadService] Error obteniendo información:', error);
      return null;
    }
  }

  /**
   * Valida si una URL es de ImageKit
   */
  isImageKitUrl(url: string): boolean {
    return url && url.includes('imagekit.io');
  }

  /**
   * Obtiene el fileId de una URL de ImageKit
   */
  getFileIdFromUrl(url: string): string | null {
    if (!this.isImageKitUrl(url)) return null;
    
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      return fileName.split('?')[0]; // Remover query parameters
    } catch {
      return null;
    }
  }
}

// Instancia singleton
export const imageUploadService = ImageUploadService.getInstance();

// Hook para usar el servicio en componentes
export const useImageUpload = () => {
  const { userToken } = useAuth();
  
  const uploadProfilePhoto = async (uri: string, userId: string): Promise<UploadResult> => {
    return await imageUploadService.uploadImage(uri, {
      userId,
      folder: '/recuerdamed/profiles',
      tags: ['profile', 'avatar'],
      useUniqueFileName: true,
      compressImage: true,
    });
  };

  const uploadFromPicker = async (pickerResult: any, userId: string): Promise<UploadResult> => {
    return await imageUploadService.uploadFromPicker(pickerResult, {
      userId,
      folder: '/recuerdamed/profiles',
      tags: ['profile', 'avatar'],
      useUniqueFileName: true,
      compressImage: true,
    });
  };

  return {
    uploadProfilePhoto,
    uploadFromPicker,
    deleteImage: imageUploadService.deleteImage.bind(imageUploadService),
    getImageInfo: imageUploadService.getImageInfo.bind(imageUploadService),
    isImageKitUrl: imageUploadService.isImageKitUrl.bind(imageUploadService),
  };
};
