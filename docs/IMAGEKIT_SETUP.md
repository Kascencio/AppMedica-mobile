# 🖼️ Configuración de ImageKit en RecuerdaMed

## 📋 Requisitos Previos

Para usar ImageKit en RecuerdaMed, necesitas:

1. **Cuenta de ImageKit**: Crear una cuenta en [imagekit.io](https://imagekit.io)
2. **Credenciales de API**: Obtener las claves desde el dashboard
3. **Configuración de carpetas**: Organizar las imágenes por tipo

## 🔧 Configuración Paso a Paso

### 1. Crear Cuenta en ImageKit

1. Ve a [imagekit.io](https://imagekit.io)
2. Regístrate para una cuenta gratuita
3. Crea un nuevo proyecto
4. Anota tu **URL Endpoint**

### 2. Obtener Credenciales

En tu dashboard de ImageKit:

1. Ve a **Settings** → **API Keys**
2. Copia tu **Public Key** y **Private Key**
3. Anota tu **URL Endpoint**

### 3. Configurar el Proyecto

Edita el archivo `constants/imagekit.ts`:

```typescript
export const IMAGEKIT_CONFIG = {
  PUBLIC_KEY: 'tu_public_key_aqui',
  PRIVATE_KEY: 'tu_private_key_aqui', 
  URL_ENDPOINT: 'https://ik.imagekit.io/tu_endpoint',
  FOLDER: '/recuerdamed/profiles',
  API_BASE_URL: 'https://api.imagekit.io/v1',
};
```

### 4. Verificar Configuración

Para verificar que ImageKit funciona correctamente, puedes probar subiendo una imagen desde la pantalla de perfil.

### 4. Estructura de Carpetas Recomendada

```
/recuerdamed/
├── /profiles/          # Fotos de perfil
├── /medications/       # Fotos de medicamentos
├── /documents/         # Documentos médicos
└── /temp/             # Imágenes temporales
```

## 🚀 Funcionalidades Implementadas

### Subida de Imágenes

```typescript
import { useImageUpload } from '../lib/imageUploadService';

const { uploadProfilePhoto } = useImageUpload();

const result = await uploadProfilePhoto(uri, userId);
if (result.success) {
  console.log('URL de imagen:', result.url);
}
```

### Optimización Automática

```typescript
import { OptimizedImage } from '../components/OptimizedImage';

// Avatar optimizado
<OptimizedImage 
  uri={profile.photoUrl} 
  size="avatar" 
  width={80} 
/>

// Thumbnail optimizado
<OptimizedImage 
  uri={imageUrl} 
  size="thumbnail" 
  width={150} 
/>
```

### Eliminación de Imágenes

```typescript
import { imageUploadService } from '../lib/imageUploadService';

const success = await imageUploadService.deleteImage(fileId);
```

## 📱 Uso en Componentes

### ProfileScreen

```typescript
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
  });
  
  if (!result.canceled && result.assets[0]) {
    const { uploadPhoto } = useCurrentUser.getState();
    const uploadedUrl = await uploadPhoto(result.assets[0].uri);
    setForm({ ...form, photoUrl: uploadedUrl });
  }
};
```

### CaregiverProfileScreen

```typescript
const handlePickImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.canceled && result.assets[0]) {
      const { uploadPhoto } = useCurrentUser.getState();
      const uploadedUrl = await uploadPhoto(result.assets[0].uri);
      setPhotoUrl(uploadedUrl);
    }
  } catch (error) {
    Alert.alert('Error', 'No se pudo procesar la imagen');
  }
};
```

## 🔒 Seguridad

### Validaciones Implementadas

- ✅ Tipos de archivo permitidos (JPG, PNG, WebP, GIF)
- ✅ Tamaño máximo de archivo (10MB)
- ✅ Nombres únicos para evitar conflictos
- ✅ Compresión automática de imágenes
- ✅ Validación de permisos de usuario

### Mejores Prácticas

1. **Nunca expongas las claves privadas** en el código del cliente
2. **Usa variables de entorno** para las credenciales
3. **Implementa rate limiting** en el servidor
4. **Valida archivos** antes de subir
5. **Usa HTTPS** para todas las comunicaciones

## 📊 Optimización de Imágenes

### Tamaños Automáticos

- **Avatar**: 200x200px, 85% calidad
- **Thumbnail**: 150x150px, 80% calidad
- **Full**: Original, 100% calidad
- **Custom**: Tamaño personalizado

### Transformaciones Disponibles

```typescript
// Redimensionar
getOptimizedImageUrl(url, 800, 600, 80)

// Thumbnail
getThumbnailUrl(url, 150)

// Avatar
getAvatarUrl(url, 200)
```

## 🐛 Troubleshooting

### Error: "Invalid API Key"

- Verifica que las credenciales sean correctas
- Asegúrate de que la cuenta esté activa
- Revisa los permisos de la API key

### Error: "File too large"

- Reduce la calidad de la imagen
- Comprime la imagen antes de subir
- Usa un formato más eficiente (WebP)

### Error: "Invalid file type"

- Verifica que el archivo sea una imagen válida
- Asegúrate de que la extensión sea correcta
- Usa solo formatos soportados

## 📈 Monitoreo

### Logs Importantes

```typescript
console.log('[ImageKit] Subida iniciada:', uri);
console.log('[ImageKit] Subida exitosa:', result.url);
console.log('[ImageKit] Error en subida:', error);
```

### Métricas a Seguir

- Tiempo de subida promedio
- Tasa de éxito de subidas
- Uso de almacenamiento
- Ancho de banda consumido

## 🔄 Migración desde Sistema Anterior

Si ya tienes imágenes en otro sistema:

1. **Exporta las imágenes** del sistema anterior
2. **Sube a ImageKit** usando el servicio de migración
3. **Actualiza las URLs** en la base de datos
4. **Verifica la funcionalidad** en la app

## 📚 Recursos Adicionales

- [Documentación de ImageKit](https://docs.imagekit.io/)
- [API Reference](https://docs.imagekit.io/api-reference/api-introduction)
- [SDK de JavaScript](https://docs.imagekit.io/api-reference/sdk/sdk-setup)
- [Transformaciones de Imagen](https://docs.imagekit.io/image-transformations)

## 🎯 Próximos Pasos

1. **Configurar credenciales** de ImageKit
2. **Probar subida** de imágenes
3. **Implementar optimización** en todas las pantallas
4. **Configurar monitoreo** y alertas
5. **Documentar casos de uso** específicos
