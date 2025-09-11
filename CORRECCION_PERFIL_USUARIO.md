# 🔧 Corrección del Problema de ID de Paciente

## 📋 Problema Identificado

El error `ID de paciente no encontrado` se producía cuando se actualizaba el perfil del usuario porque:

1. **IDs perdidos en actualización**: Al actualizar el perfil localmente, se perdían los campos `id` y `patientProfileId`
2. **Sincronización fallida**: La función `syncProfileUpdate` no podía encontrar el ID del paciente
3. **Inconsistencia de datos**: Los IDs no se preservaban correctamente entre operaciones

## 🛠️ Correcciones Implementadas

### 1. **Preservación de IDs en `updateProfile`**

**ANTES:**
```typescript
const updatedProfile = { ...profile, ...cleanedData, updatedAt: new Date().toISOString() };
```

**DESPUÉS:**
```typescript
const updatedProfile = { 
  ...profile, 
  ...cleanedData, 
  // Asegurar que los IDs críticos se preserven
  id: profile.id,
  userId: profile.userId,
  patientProfileId: profile.patientProfileId || profile.id,
  updatedAt: new Date().toISOString() 
};
```

### 2. **Mejora en `syncProfileUpdate`**

**ANTES:**
```typescript
const patientId = profile.patientProfileId || profile.id;
if (!patientId) throw new Error('ID de paciente no encontrado');
```

**DESPUÉS:**
```typescript
// MEJORADO: Buscar ID de paciente de múltiples fuentes
const patientId = profile.patientProfileId || 
                 profile.id || 
                 profile.userId;

console.log('[useCurrentUser] IDs disponibles:', {
  patientProfileId: profile.patientProfileId,
  id: profile.id,
  userId: profile.userId,
  selectedPatientId: patientId
});

if (!patientId) {
  console.error('[useCurrentUser] Perfil completo:', JSON.stringify(profile, null, 2));
  throw new Error('ID de paciente no encontrado');
}
```

### 3. **Función de Validación Centralizada**

Se creó `validateAndFixProfileIds()` para corregir automáticamente IDs faltantes:

```typescript
const validateAndFixProfileIds = (profile: UserProfile): UserProfile => {
  if (!profile.id && !profile.patientProfileId) {
    console.warn('[useCurrentUser] Perfil sin IDs válidos detectado, intentando recuperar...');
    
    const token = useAuth.getState().userToken;
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const patientId = tokenPayload.patientId || 
                         tokenPayload.patientProfileId || 
                         tokenPayload.profileId || 
                         tokenPayload.sub;
        
        if (patientId) {
          profile.id = patientId;
          profile.patientProfileId = patientId;
          profile.userId = tokenPayload.sub || tokenPayload.userId || patientId;
          console.log('[useCurrentUser] IDs corregidos desde token:', { id: profile.id, patientProfileId: profile.patientProfileId });
        }
      } catch (tokenError) {
        console.error('[useCurrentUser] Error procesando token para corregir IDs:', tokenError);
      }
    }
  }
  
  // Asegurar consistencia entre id y patientProfileId
  if (profile.id && !profile.patientProfileId) {
    profile.patientProfileId = profile.id;
  } else if (profile.patientProfileId && !profile.id) {
    profile.id = profile.patientProfileId;
  }
  
  return profile;
};
```

### 4. **Mejora en `createDefaultProfile`**

**ANTES:**
```typescript
const createDefaultProfile = (base: Partial<UserProfile>): UserProfile => ({
  id: '',
  userId: '',
  patientProfileId: '',
  // ... otros campos
  ...base,
});
```

**DESPUÉS:**
```typescript
const createDefaultProfile = (base: Partial<UserProfile>): UserProfile => {
  const defaultProfile = {
    id: '',
    userId: '',
    patientProfileId: '',
    // ... otros campos
    ...base,
  };
  
  // Asegurar que si tenemos un ID, también lo asignemos a patientProfileId
  if (defaultProfile.id && !defaultProfile.patientProfileId) {
    defaultProfile.patientProfileId = defaultProfile.id;
  }
  
  return defaultProfile;
};
```

### 5. **Mejora en `loadProfileLocally`**

Ahora usa la función de validación centralizada:

```typescript
const profile: UserProfile = JSON.parse(storedProfile);

// MEJORADO: Validar y corregir IDs usando función centralizada
const validatedProfile = validateAndFixProfileIds(profile);

console.log('[useCurrentUser] Perfil cargado localmente con éxito.');
return validatedProfile;
```

### 6. **Mejora en `fetchProfile`**

Mejor manejo de IDs con múltiples fallbacks:

```typescript
// MEJORADO: Asegurar que tenemos IDs válidos con múltiples fallbacks
id: serverData.id || baseProfile.id || patientId,
userId: serverData.userId || baseProfile.userId || tokenPayload.sub,
patientProfileId: serverData.id || baseProfile.patientProfileId || patientId,
```

## 🎯 Beneficios de las Correcciones

### ✅ **Robustez**
- **Múltiples fallbacks**: Si un ID falla, se intenta con otros
- **Recuperación automática**: IDs se recuperan desde el token JWT
- **Validación centralizada**: Una función maneja toda la lógica de validación

### ✅ **Consistencia**
- **IDs sincronizados**: `id` y `patientProfileId` siempre están alineados
- **Preservación garantizada**: Los IDs se preservan en todas las operaciones
- **Logging mejorado**: Mejor visibilidad de qué IDs están disponibles

### ✅ **Mantenibilidad**
- **Función centralizada**: `validateAndFixProfileIds()` maneja toda la lógica
- **Código limpio**: Menos duplicación de lógica de validación
- **Fácil debugging**: Logs detallados para identificar problemas

## 🧪 Casos de Prueba

### **Caso 1: Actualización de Perfil**
1. Usuario actualiza su perfil
2. Los IDs se preservan correctamente
3. La sincronización funciona sin errores

### **Caso 2: Carga Local**
1. App se inicia sin conexión
2. Perfil se carga desde almacenamiento local
3. IDs se validan y corrigen automáticamente

### **Caso 3: Recuperación desde Token**
1. Perfil se corrompe o pierde IDs
2. Función de validación recupera IDs desde JWT
3. Perfil se restaura correctamente

## 📊 Resultado Esperado

Después de estas correcciones:

- ✅ **No más errores** de "ID de paciente no encontrado"
- ✅ **Sincronización exitosa** del perfil con el servidor
- ✅ **Preservación de datos** en todas las operaciones
- ✅ **Recuperación automática** de IDs perdidos
- ✅ **Mejor experiencia de usuario** sin interrupciones

## 🔍 Monitoreo

Para verificar que las correcciones funcionan:

1. **Logs de consola**: Buscar mensajes de validación de IDs
2. **Operaciones de perfil**: Verificar que no hay errores de sincronización
3. **Almacenamiento local**: Confirmar que los IDs se preservan
4. **Sincronización**: Verificar que las actualizaciones llegan al servidor

---

## 🔧 Correcciones Adicionales Implementadas

### **Problema Persistente Detectado**

A pesar de las correcciones iniciales, el problema persistía porque:
- El perfil se cargaba sin ningún ID (`id`, `patientProfileId`, `userId` todos `undefined`)
- La función de validación no se ejecutaba automáticamente
- No había un mecanismo de recuperación automática

### **Nuevas Correcciones Implementadas**

#### **1. Logging Mejorado en `validateAndFixProfileIds`**

```typescript
const validateAndFixProfileIds = (profile: UserProfile): UserProfile => {
  console.log('[useCurrentUser] Validando IDs del perfil:', { 
    id: profile.id, 
    patientProfileId: profile.patientProfileId, 
    userId: profile.userId 
  });
  
  // ... lógica de validación con logging detallado
  
  console.log('[useCurrentUser] Perfil final después de validación:', { 
    id: profile.id, 
    patientProfileId: profile.patientProfileId, 
    userId: profile.userId 
  });
  
  return profile;
};
```

#### **2. Función Helper `setProfileWithValidation`**

```typescript
setProfileWithValidation: (profile: UserProfile | null) => {
  if (profile) {
    const validatedProfile = validateAndFixProfileIds(profile);
    set({ profile: validatedProfile });
    return validatedProfile;
  } else {
    set({ profile: null });
    return null;
  }
}
```

#### **3. Función de Validación del Perfil Actual**

```typescript
validateCurrentProfile: () => {
  const { profile } = get();
  if (profile && (!profile.id || !profile.patientProfileId)) {
    console.log('[useCurrentUser] Validando perfil actual que tiene IDs faltantes...');
    const validatedProfile = validateAndFixProfileIds(profile);
    set({ profile: validatedProfile });
    return validatedProfile;
  }
  return profile;
}
```

#### **4. Hook de Validación Automática**

**Archivo**: `hooks/useProfileValidation.ts`

```typescript
export function useProfileValidation() {
  const { profile, validateCurrentProfile } = useCurrentUser();

  useEffect(() => {
    if (profile && (!profile.id || !profile.patientProfileId)) {
      console.log('[useProfileValidation] Detectado perfil sin IDs válidos, validando...');
      validateCurrentProfile();
    }
  }, [profile, validateCurrentProfile]);

  return profile;
}
```

#### **5. Integración en App.tsx**

```typescript
export default function App() {
  // ... otros hooks
  const validatedProfile = useProfileValidation(); // Validar perfil automáticamente
  // ...
}
```

### **🎯 Beneficios de las Correcciones Adicionales**

#### ✅ **Validación Automática**
- **Hook reactivo**: Se ejecuta automáticamente cuando el perfil cambia
- **Detección proactiva**: Identifica perfiles sin IDs válidos
- **Corrección inmediata**: Aplica la validación sin intervención manual

#### ✅ **Logging Detallado**
- **Visibilidad completa**: Logs de todos los pasos de validación
- **Debugging facilitado**: Fácil identificación de problemas
- **Monitoreo en tiempo real**: Seguimiento del estado de los IDs

#### ✅ **Robustez Mejorada**
- **Múltiples puntos de validación**: En carga, actualización y validación automática
- **Recuperación automática**: IDs se recuperan desde el token JWT
- **Prevención de errores**: Validación antes de operaciones críticas

### **📊 Flujo de Validación Completo**

1. **Carga inicial**: `fetchProfile()` → `setProfileWithValidation()`
2. **Validación automática**: `useProfileValidation()` → `validateCurrentProfile()`
3. **Actualización**: `updateProfile()` → preserva IDs críticos
4. **Sincronización**: `syncProfileUpdate()` → múltiples fallbacks para IDs

### **🔍 Monitoreo Mejorado**

Para verificar que las correcciones funcionan, buscar en los logs:

```
[useCurrentUser] Validando IDs del perfil: { id: undefined, patientProfileId: undefined, userId: undefined }
[useCurrentUser] Token disponible: SÍ
[useCurrentUser] Token payload completo: { ... }
[useCurrentUser] ID extraído del token: "patient-123"
[useCurrentUser] IDs corregidos desde token: { id: "patient-123", patientProfileId: "patient-123", userId: "user-456" }
[useCurrentUser] Perfil final después de validación: { id: "patient-123", patientProfileId: "patient-123", userId: "user-456" }
```

### **🚀 Resultado Esperado**

Después de estas correcciones adicionales:

- ✅ **Validación automática** del perfil en tiempo real
- ✅ **Recuperación automática** de IDs perdidos
- ✅ **Logging detallado** para debugging
- ✅ **Prevención proactiva** de errores de sincronización
- ✅ **Experiencia de usuario** sin interrupciones

---

**¡Las correcciones adicionales están implementadas y listas para probar!** 🚀
