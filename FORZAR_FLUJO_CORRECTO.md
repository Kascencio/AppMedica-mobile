# 🔄 Forzar el Uso del Flujo Correcto de Autenticación

## 📋 Problema Identificado

El perfil sigue teniendo `"userId": undefined` porque la aplicación **sigue usando el flujo antiguo** (`fetchProfile`) en lugar del nuevo flujo correcto (`fetchProfileCorrectFlow`).

### **Evidencia del Problema:**
```
LOG [ProfileScreen] Sincronizando formulario con perfil: { ..., "userId": undefined, ... }
ERROR [useCurrentUser] Error en syncProfileUpdate: Error del servidor: 400 - Error desconocido
```

## 🛠️ Solución Implementada

### **1. Hook de Validación Mejorado (`useProfileValidation.ts`)**

#### **ANTES (No detectaba userId faltante):**
```typescript
useEffect(() => {
  if (isAuthenticated && userToken && !profile) {
    fetchProfileCorrectFlow();
  }
  else if (profile && (!profile.id || !profile.patientProfileId)) {
    validateCurrentProfile();
  }
}, [profile, validateCurrentProfile, fetchProfileCorrectFlow, isAuthenticated, userToken]);
```

#### **DESPUÉS (Detecta userId faltante):**
```typescript
useEffect(() => {
  // Si estamos autenticados pero no tenemos perfil, usar el flujo correcto
  if (isAuthenticated && userToken && !profile) {
    console.log('[useProfileValidation] Usuario autenticado sin perfil, iniciando flujo correcto...');
    fetchProfileCorrectFlow();
  }
  // Si tenemos perfil pero le falta userId (que es crítico), usar el flujo correcto
  else if (profile && !profile.userId) {
    console.log('[useProfileValidation] Perfil sin userId detectado, reiniciando con flujo correcto...');
    fetchProfileCorrectFlow();
  }
  // Si tenemos perfil pero le faltan otros IDs, validar
  else if (profile && (!profile.id || !profile.patientProfileId)) {
    console.log('[useProfileValidation] Detectado perfil sin IDs válidos, validando...');
    validateCurrentProfile();
  }
}, [profile, validateCurrentProfile, fetchProfileCorrectFlow, isAuthenticated, userToken]);
```

### **2. Función `fetchProfileCorrectFlow` Mejorada**

#### **ANTES (Solo funcionaba sin perfil):**
```typescript
// Verificar si ya se inicializó
if (get().profile) {
  console.log('[useCurrentUser] Ya inicializado con perfil, saltando.');
  return;
}
```

#### **DESPUÉS (Funciona con perfil sin userId):**
```typescript
// Verificar si ya se inicializó y tiene userId válido
const currentProfile = get().profile;
if (currentProfile && currentProfile.userId) {
  console.log('[useCurrentUser] Ya inicializado con perfil válido (con userId), saltando.');
  return;
}

if (currentProfile && !currentProfile.userId) {
  console.log('[useCurrentUser] Perfil existente sin userId, reiniciando con flujo correcto...');
}
```

## 🔄 Flujo de Detección y Corrección

### **Paso 1: Detección Automática**
```
1. Usuario autenticado ✅
2. Perfil existe ✅
3. userId es undefined ❌
4. → Trigger: fetchProfileCorrectFlow()
```

### **Paso 2: Flujo Correcto**
```
1. /auth/me → Obtener userId y role
2. /patients/me → Obtener patientId
3. Crear perfil con IDs correctos
4. Guardar localmente
5. ✅ Perfil con userId válido
```

### **Paso 3: Sincronización Exitosa**
```
1. Perfil tiene userId válido ✅
2. syncProfileUpdate funciona ✅
3. No más errores 400 ✅
```

## 🎯 Resultado Esperado

### **ANTES (Con Error):**
```
LOG [ProfileScreen] Sincronizando formulario con perfil: { ..., "userId": undefined, ... }
ERROR [useCurrentUser] Error en syncProfileUpdate: Error del servidor: 400 - Error desconocido
```

### **DESPUÉS (Corregido):**
```
LOG [useProfileValidation] Perfil sin userId detectado, reiniciando con flujo correcto...
LOG [useCurrentUser] PASO 1: Obteniendo datos del usuario desde /auth/me...
LOG [useAuth] Datos del usuario obtenidos: { userId: "cmff20kid0006jxvgh50wmjrh", role: "PATIENT" }
LOG [useCurrentUser] PASO 2: Usuario es paciente, obteniendo perfil desde /patients/me...
LOG [useCurrentUser] Perfil completo creado: { ..., "userId": "cmff20kid0006jxvgh50wmjrh", ... }
LOG [ProfileScreen] Sincronizando formulario con perfil: { ..., "userId": "cmff20kid0006jxvgh50wmjrh", ... }
LOG [useCurrentUser] Sincronización exitosa ✅
```

## 🔍 Verificación

Para verificar que funciona, buscar en los logs:

```
[useProfileValidation] Perfil sin userId detectado, reiniciando con flujo correcto...
[useCurrentUser] PASO 1: Obteniendo datos del usuario desde /auth/me...
[useAuth] Datos del usuario obtenidos: { userId: "cmff20kid0006jxvgh50wmjrh", role: "PATIENT" }
[useCurrentUser] PASO 2: Usuario es paciente, obteniendo perfil desde /patients/me...
[useCurrentUser] Perfil completo creado: { id: "cmff20kid0006jxvgh50wmjrh", userId: "cmff20kid0006jxvgh50wmjrh", patientProfileId: "cmff20kid0006jxvgh50wmjrh", ... }
```

## ✅ Beneficios

1. **Detección Automática**: Detecta automáticamente perfiles sin userId
2. **Corrección Automática**: Reinicia el flujo correcto automáticamente
3. **Sin Intervención Manual**: No requiere reiniciar la aplicación
4. **Robustez**: Funciona tanto para perfiles nuevos como existentes
5. **Logging**: Logs detallados para debugging

**¡Esta corrección debería resolver el problema de userId undefined y permitir la sincronización exitosa!** 🚀
