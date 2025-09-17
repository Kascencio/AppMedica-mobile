import React from 'react';
import { Image, ImageProps, StyleSheet, View, ActivityIndicator } from 'react-native';
import { getOptimizedImageUrl, getThumbnailUrl, getAvatarUrl } from '../constants/imagekit';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  size?: 'thumbnail' | 'avatar' | 'full' | 'custom';
  width?: number;
  height?: number;
  quality?: number;
  showLoading?: boolean;
  fallbackSource?: any;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

export default function OptimizedImage({
  uri,
  size = 'full',
  width,
  height,
  quality,
  showLoading = false,
  fallbackSource,
  style,
  onLoadStart,
  onLoadEnd,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  // Generar URL optimizada según el tamaño
  const getOptimizedUri = (): string | undefined => {
    if (!uri) return undefined;

    // Si es base64 o file://, devolver tal cual
    if (uri.startsWith('data:image') || uri.startsWith('file://') || uri.startsWith('content://')) {
      return uri;
    }

    // Si es una URL de ImageKit, optimizarla
    if (uri.includes('imagekit.io')) {
      switch (size) {
        case 'thumbnail':
          return getThumbnailUrl(uri, width || 150);
        case 'avatar':
          return getAvatarUrl(uri, width || 200);
        case 'custom':
          return getOptimizedImageUrl(uri, width, height, quality);
        case 'full':
        default:
          return uri;
      }
    }

    // Si no es ImageKit, devolver la URI original
    return uri;
  };

  const optimizedUri = getOptimizedUri();

  const handleLoadStart = () => {
    setIsLoading(true);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  };

  // Si hay error y tenemos fallback, mostrar fallback
  if (hasError && fallbackSource) {
    return (
      <Image
        source={fallbackSource}
        style={style}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={typeof optimizedUri === 'string' && optimizedUri.length > 0 ? { uri: optimizedUri } : fallbackSource}
        style={[styles.image, style]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
      {showLoading && isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

// Componentes especializados para casos de uso comunes
export const ProfileAvatar = ({ uri, size = 80, ...props }: { uri: string; size?: number } & Omit<OptimizedImageProps, 'uri' | 'size'>) => (
  <OptimizedImage
    uri={uri}
    size="avatar"
    width={size}
    height={size}
    style={{ width: size, height: size, borderRadius: size / 2 }}
    {...props}
  />
);

export const ThumbnailImage = ({ uri, size = 150, ...props }: { uri: string; size?: number } & Omit<OptimizedImageProps, 'uri' | 'size'>) => (
  <OptimizedImage
    uri={uri}
    size="thumbnail"
    width={size}
    height={size}
    style={{ width: size, height: size, borderRadius: 8 }}
    {...props}
  />
);

export const FullImage = ({ uri, ...props }: { uri: string } & Omit<OptimizedImageProps, 'uri' | 'size'>) => (
  <OptimizedImage
    uri={uri}
    size="full"
    style={{ width: '100%', height: '100%' }}
    {...props}
  />
);
