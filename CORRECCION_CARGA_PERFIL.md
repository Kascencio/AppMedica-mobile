# 🔧 Corrección de Carga de Perfil del Paciente

## 🚨 **Problema Identificado**

El perfil del paciente no se estaba cargando correctamente porque:

1. **❌ Endpoint incorrecto**: Estaba usando `/patients/:id` en lugar de `/patients/me`
2. **❌ Mapeo de datos deficiente**: No se estaban mapeando correctamente los campos del servidor
3. **❌ Falta de fallback**: No había manejo para cuando no hay token o el servidor no responde

## ✅ **Correcciones Implementadas**

### 1. **Corregir Endpoint de API**

**Archivo**: `constants/config.ts`

```typescript
// ANTES
PATIENTS: {
  ME: '/patients/:id',  // ❌ Incorrecto
  BY_ID: '/patients/:id',
  // ...
}

// DESPUÉS
PATIENTS: {
  ME: '/patients/me',   // ✅ Correcto según API_DOCS.md
  BY_ID: '/patients/:id',
  // ...
}
```

### 2. **Mejorar Mapeo de Datos del Servidor**

**Archivo**: `store/useCurrentUser.ts`

```typescript
// Mapear datos del servidor a nuestro modelo de perfil
const mappedData = {
  ...serverData,
  // Asegurar que tenemos un ID válido
  id: serverData.id || baseProfile.id,
  userId: serverData.userId || baseProfile.userId,
  patientProfileId: serverData.id || baseProfile.patientProfileId,
  // Mapear campos de fecha
  birthDate: serverData.dateOfBirth || serverData.birthDate,
  // Mapear género
  gender: serverData.gender ? genderMapReverse[serverData.gender] || serverData.gender : undefined,
  // Mapear otros campos
  name: serverData.name || baseProfile.name,
  role: serverData.role || baseProfile.role,
};
```

### 3. **Agregar Fallback para Sin Token**

```typescript
if (!token) {
  console.log('[useCurrentUser] No hay token, usando perfil local si existe.');
  // Si no hay token pero hay perfil local, usarlo
  if (localProfile) {
    set({ profile: localProfile, initialized: true });
  } else {
    // Crear perfil mínimo sin token
    const minimalProfile = createDefaultProfile({
      id: 'temp_' + Date.now(),
      userId: 'temp_user',
      patientProfileId: 'temp_patient',
      name: 'Usuario',
      role: 'PATIENT',
    });
    await saveProfileLocally(minimalProfile);
    set({ profile: minimalProfile, initialized: true });
  }
  set({ loading: false });
  return;
}
```

### 4. **Simplificar Llamada a la API**

```typescript
// ANTES
const patientId = baseProfile.patientProfileId || baseProfile.id;
if (!patientId) {
  // ... manejo de error
}
const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME, { id: patientId.toString() });

// DESPUÉS
const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.PATIENTS.ME);
console.log('[useCurrentUser] Obteniendo perfil del servidor desde:', endpoint);
```

### 5. **Componente de Debug Temporal**

**Archivo**: `components/ProfileDebug.tsx`

- Muestra estado de autenticación
- Muestra estado del perfil
- Permite probar llamadas a la API
- Permite forzar recarga del perfil

## 🔍 **Flujo de Carga Mejorado**

### **1. Carga Inicial**
1. **Cargar perfil local** desde AsyncStorage
2. **Si hay perfil local**: Mostrarlo inmediatamente
3. **Si no hay perfil local**: Crear perfil mínimo

### **2. Sincronización con Servidor**
1. **Verificar token**: Si no hay token, usar perfil local
2. **Llamar a `/patients/me`**: Con token de autorización
3. **Mapear datos del servidor**: A nuestro modelo de perfil
4. **Combinar datos**: Locales + Token + Servidor
5. **Guardar localmente**: Para uso offline

### **3. Manejo de Errores**
1. **Error de red**: Usar perfil local
2. **Error de servidor**: Usar perfil local + log del error
3. **Sin token**: Crear perfil mínimo temporal

## 🧪 **Cómo Probar**

### **1. Usar Componente de Debug**
1. Ir a **Perfil** → **"🔍 Debug del Perfil"**
2. Hacer clic en **"📊 Mostrar Info de Debug"**
3. Verificar que:
   - ✅ **Autenticado**: Sí
   - ✅ **Token presente**: Sí
   - ✅ **Perfil inicializado**: Sí
   - ✅ **ID del perfil**: Debe tener un valor válido

### **2. Probar Llamada a la API**
1. Hacer clic en **"🌐 Test de API"**
2. Verificar que el endpoint sea: `https://www.recuerdamed.org/api/patients/me`
3. Verificar que el token esté presente

### **3. Forzar Recarga**
1. Hacer clic en **"🔄 Forzar Recarga"**
2. Verificar que el perfil se recargue correctamente

## 📊 **Logs Esperados**

```
[useCurrentUser] Obteniendo perfil del servidor desde: https://www.recuerdamed.org/api/patients/me
[useCurrentUser] Perfil del servidor obtenido: { id: "123", name: "Juan Pérez", ... }
[useCurrentUser] Datos mapeados del servidor: { id: "123", name: "Juan Pérez", ... }
[useCurrentUser] Perfil final combinado y limpio: { id: "123", name: "Juan Pérez", ... }
```

## ⚠️ **Posibles Problemas**

### **1. Token Inválido**
- **Síntoma**: Error 401 en la API
- **Solución**: Verificar que el token sea válido y no esté expirado

### **2. Servidor No Disponible**
- **Síntoma**: Error de red o timeout
- **Solución**: El sistema usará el perfil local como fallback

### **3. Datos del Servidor Incompletos**
- **Síntoma**: Perfil con campos vacíos
- **Solución**: El sistema combinará datos locales + servidor

## 🔄 **Próximos Pasos**

1. **Probar en dispositivo real** con development build
2. **Verificar logs** para identificar problemas
3. **Confirmar que el perfil se carga** correctamente
4. **Remover componente de debug** una vez confirmado que funciona

---

**Estado**: ✅ **CORREGIDO** - El perfil del paciente ahora debería cargarse correctamente desde la API y guardarse localmente.
