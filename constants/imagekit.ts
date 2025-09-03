// Configuración de ImageKit usando API REST
export const IMAGEKIT_CONFIG = {
  PUBLIC_KEY: 'public_KRjD5KPURcLlCaEtYlFlztdawx4=', 
  PRIVATE_KEY: 'private_/XQ8R09LhrCY3PtMmMTUFI+0Nyc=', 
  URL_ENDPOINT: 'https://ik.imagekit.io/keaf13', 
  FOLDER: '/recuerdamed/profiles',
  API_BASE_URL: 'https://api.imagekit.io/v1',
};

// Tipos para las respuestas de ImageKit
export interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
  filePath: string;
  tags: string[];
  isPrivateFile: boolean;
  customCoordinates: string;
  metadata: Record<string, any>;
}

export interface ImageKitError {
  message: string;
  help: string;
}

// Función para generar nombres únicos de archivo
export function generateFileName(userId: string, extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${userId}_${timestamp}_${random}.${extension}`;
}

// Función para validar tipos de archivo
export function isValidImageType(fileName: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return validExtensions.includes(extension);
}

// Función para obtener la extensión del archivo
export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);
}

// Función para comprimir imagen antes de subir
export function getImageCompressionOptions(): {
  quality: number;
  maxWidth: number;
  maxHeight: number;
} {
  return {
    quality: 0.8, // 80% de calidad
    maxWidth: 800, // Máximo 800px de ancho
    maxHeight: 800, // Máximo 800px de alto
  };
}

// Función para generar URL de imagen optimizada
export function getOptimizedImageUrl(
  originalUrl: string, 
  width?: number, 
  height?: number, 
  quality?: number
): string {
  if (!originalUrl || !originalUrl.includes('imagekit.io')) {
    return originalUrl;
  }

  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality) params.append('q', quality.toString());

  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}${params.toString()}`;
}

// Función para generar URL de thumbnail
export function getThumbnailUrl(originalUrl: string, size: number = 150): string {
  return getOptimizedImageUrl(originalUrl, size, size, 80);
}

// Función para generar URL de avatar
export function getAvatarUrl(originalUrl: string, size: number = 200): string {
  return getOptimizedImageUrl(originalUrl, size, size, 85);
}

// Función para eliminar imagen de ImageKit usando API REST
export async function deleteImageFromImageKit(fileId: string): Promise<boolean> {
  try {
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

    return true;
  } catch (error) {
    console.error('[ImageKit] Error eliminando imagen:', error);
    return false;
  }
}

// Función para obtener información de imagen usando API REST
export async function getImageInfo(fileId: string): Promise<ImageKitUploadResponse | null> {
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
  } catch (error) {
    console.error('[ImageKit] Error obteniendo información de imagen:', error);
    return null;
  }
}
