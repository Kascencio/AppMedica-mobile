# 🔄 Flujo Correcto de Autenticación Implementado

## 📋 Problema Identificado

El error persistía porque estábamos usando **solo el token JWT** para obtener los IDs, pero el flujo correcto requiere **3 llamadas secuenciales**:

1. **Login** → Obtener token
2. **`/auth/me`** → Obtener `userId` y `role`
3. **`/patients/me`** → Obtener `patientId` (si es paciente)

## 🛠️ Solución Implementada

### **1. Store de Autenticación (`useAuth.ts`)**

#### **Nuevos Campos:**
```typescript
interface AuthState {
  userToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  userId: string | null;        // ✅ NUEVO: userId desde /auth/me
  userRole: string | null;      // ✅ NUEVO: role desde /auth/me
  // ... métodos existentes
  fetchUserData: () => Promise<{ userId: string; role: string }>; // ✅ NUEVO
}
```

#### **Nueva Función `fetchUserData`:**
```typescript
fetchUserData: async () => {
  const { userToken } = get();
  if (!userToken) {
    throw new Error('No hay token de autenticación');
  }

  console.log('[useAuth] Obteniendo datos del usuario desde /auth/me...');
  const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME), {
    method: 'GET',
    headers: {
      ...API_CONFIG.DEFAULT_HEADERS,
      'Authorization': `Bearer ${userToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Error al obtener datos del usuario');
  }

  const data = await res.json();
  console.log('[useAuth] Datos del usuario obtenidos:', { userId: data.id, role: data.role });
  
  set({ userId: data.id, userRole: data.role });
  return { userId: data.id, role: data.role };
}
```

### **2. Store de Usuario Actual (`useCurrentUser.ts`)**

#### **Nueva Función `fetchProfileCorrectFlow`:**
```typescript
fetchProfileCorrectFlow: async () => {
  const { userToken } = useAuth.getState();
  if (!userToken) {
    console.log('[useCurrentUser] No hay token, saltando fetchProfileCorrectFlow');
    return;
  }

  console.log('[useCurrentUser] Iniciando flujo correcto de autenticación...');
  
  try {
    // PASO 1: Obtener datos del usuario desde /auth/me
    console.log('[useCurrentUser] PASO 1: Obteniendo datos del usuario desde /auth/me...');
    const { userId, role } = await useAuth.getState().fetchUserData();
    console.log('[useCurrentUser] Datos del usuario obtenidos:', { userId, role });

    // PASO 2: Si es paciente, obtener perfil desde /patients/me
    if (role === 'PATIENT') {
      console.log('[useCurrentUser] PASO 2: Usuario es paciente, obteniendo perfil desde /patients/me...');
      
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME), {
        method: 'GET',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          'Authorization': `Bearer ${userToken}`,
        },
      });
      
      if (res.ok) {
        const patientData = await res.json();
        console.log('[useCurrentUser] Datos del paciente obtenidos:', patientData);
        
        // Crear perfil completo con los datos correctos
        const completeProfile = {
          ...patientData,
          id: patientData.id,           // patientId del servidor
          userId: userId,              // userId del /auth/me
          patientProfileId: patientData.id, // patientId del servidor
          role: role,                  // role del /auth/me
        };
        
        console.log('[useCurrentUser] Perfil completo creado:', completeProfile);
        
        const validatedProfile = get().setProfileWithValidation(completeProfile);
        if (validatedProfile) {
          await get().saveProfileLocally(validatedProfile);
          console.log('[useCurrentUser] Perfil del paciente guardado localmente');
        }
      }
    } else {
      console.log('[useCurrentUser] Usuario no es paciente, creando perfil básico...');
      // Para cuidadores, crear perfil básico
      const basicProfile = {
        id: userId,
        userId: userId,
        patientProfileId: undefined, // Los cuidadores no tienen patientProfileId
        name: 'Usuario',
        role: role,
      };
      
      const completeProfile = createDefaultProfile(basicProfile);
      const validatedProfile = get().setProfileWithValidation(completeProfile);
      if (validatedProfile) {
        await get().saveProfileLocally(validatedProfile);
      }
    }
  } catch (error) {
    console.error('[useCurrentUser] Error en fetchProfileCorrectFlow:', error);
    // ... manejo de errores
  }
}
```

### **3. Hook de Validación (`useProfileValidation.ts`)**

#### **Actualizado para usar el flujo correcto:**
```typescript
export function useProfileValidation() {
  const { profile, validateCurrentProfile, fetchProfileCorrectFlow } = useCurrentUser();
  const { isAuthenticated, userToken } = useAuth();

  useEffect(() => {
    // Si estamos autenticados pero no tenemos perfil, usar el flujo correcto
    if (isAuthenticated && userToken && !profile) {
      console.log('[useProfileValidation] Usuario autenticado sin perfil, iniciando flujo correcto...');
      fetchProfileCorrectFlow();
    }
    // Si tenemos perfil pero le faltan IDs, validar
    else if (profile && (!profile.id || !profile.patientProfileId)) {
      console.log('[useProfileValidation] Detectado perfil sin IDs válidos, validando...');
      validateCurrentProfile();
    }
  }, [profile, validateCurrentProfile, fetchProfileCorrectFlow, isAuthenticated, userToken]);

  return profile;
}
```

## 🔄 Flujo Completo Implementado

### **ANTES (Incorrecto):**
```
Login → Token JWT → Extraer IDs del token → ❌ ERROR
```

### **DESPUÉS (Correcto):**
```
1. Login → Obtener token
2. /auth/me → Obtener userId y role
3. /patients/me → Obtener patientId (si es paciente)
4. Crear perfil con IDs correctos
5. Guardar localmente
6. ✅ ÉXITO
```

## 📊 Estructura de Datos Correcta

### **Para Pacientes:**
```typescript
const completeProfile = {
  ...patientData,           // Datos del /patients/me
  id: patientData.id,       // patientId del servidor
  userId: userId,          // userId del /auth/me
  patientProfileId: patientData.id, // patientId del servidor
  role: role,              // role del /auth/me
};
```

### **Para Cuidadores:**
```typescript
const basicProfile = {
  id: userId,               // userId del /auth/me
  userId: userId,           // userId del /auth/me
  patientProfileId: undefined, // Los cuidadores no tienen patientProfileId
  name: 'Usuario',
  role: role,              // role del /auth/me
};
```

## 🎯 Beneficios de la Implementación

1. **IDs Correctos**: Cada ID viene de su fuente correcta
2. **Flujo Estándar**: Sigue las mejores prácticas de autenticación
3. **Compatibilidad**: Funciona tanto para pacientes como cuidadores
4. **Robustez**: Maneja errores y casos edge
5. **Logging**: Logs detallados para debugging

## 🔍 Verificación

Para verificar que funciona, buscar en los logs:

```
[useCurrentUser] PASO 1: Obteniendo datos del usuario desde /auth/me...
[useAuth] Datos del usuario obtenidos: { userId: "cmff20kid0006jxvgh50wmjrh", role: "PATIENT" }
[useCurrentUser] PASO 2: Usuario es paciente, obteniendo perfil desde /patients/me...
[useCurrentUser] Datos del paciente obtenidos: { id: "cmff20kid0006jxvgh50wmjrh", name: "kevin", ... }
[useCurrentUser] Perfil completo creado: { id: "cmff20kid0006jxvgh50wmjrh", userId: "cmff20kid0006jxvgh50wmjrh", patientProfileId: "cmff20kid0006jxvgh50wmjrh", ... }
```

**¡Este flujo debería resolver completamente el problema de sincronización!** 🚀
