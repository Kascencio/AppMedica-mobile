# 🔧 Corrección de Datos Inválidos (NaN)

## 📋 Problema Identificado

El error era muy específico:

```
ERROR [useCurrentUser] Error del servidor: 400 {"error":"Datos inválidos","issues":[{"code":"invalid_type","expected":"number","received":"nan","path":[],"message":"Expected number, received nan"}]}
```

**🔍 Análisis:**
- El servidor esperaba un `number`
- Pero recibió `NaN` (Not a Number)
- Esto causaba el error 400 de validación

## 🛠️ Solución Implementada

### **ANTES (Problemático):**
```typescript
// Mapear y limpiar datos para el backend
const bodyData: Record<string, any> = {};
Object.keys(data).forEach(key => {
  let value = data[key as keyof typeof data];
  if (key === 'birthDate') bodyData['dateOfBirth'] = value;
  else if (key === 'gender') {
    const genderMap: Record<string, string> = { 'Masculino': 'male', 'Femenino': 'female', 'Otro': 'other' };
    bodyData['gender'] = genderMap[value as string] || value;
  }
  else bodyData[key] = value; // ❌ PROBLEMA: Enviaba valores NaN
});
```

### **DESPUÉS (Corregido):**
```typescript
// Mapear y limpiar datos para el backend
const bodyData: Record<string, any> = {};
Object.keys(data).forEach(key => {
  let value = data[key as keyof typeof data];
  
  // CORREGIDO: Filtrar valores inválidos antes de enviar
  if (value === null || value === undefined || value === '') {
    console.log(`[useCurrentUser] Excluyendo campo vacío: ${key} = ${value}`);
    return; // No incluir valores vacíos
  }
  
  // CORREGIDO: Validar números
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    console.log(`[useCurrentUser] Excluyendo número inválido: ${key} = ${value}`);
    return; // No incluir NaN o Infinity
  }
  
  if (key === 'birthDate') bodyData['dateOfBirth'] = value;
  else if (key === 'gender') {
    const genderMap: Record<string, string> = { 'Masculino': 'male', 'Femenino': 'female', 'Otro': 'other' };
    bodyData['gender'] = genderMap[value as string] || value;
  }
  else bodyData[key] = value;
});
```

## 🔍 Validaciones Agregadas

### **1. Valores Vacíos:**
```typescript
if (value === null || value === undefined || value === '') {
  return; // No incluir valores vacíos
}
```

### **2. Números Inválidos:**
```typescript
if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
  return; // No incluir NaN o Infinity
}
```

### **3. Logging Detallado:**
```typescript
console.log(`[useCurrentUser] Excluyendo campo vacío: ${key} = ${value}`);
console.log(`[useCurrentUser] Excluyendo número inválido: ${key} = ${value}`);
```

## 🎯 Resultado Esperado

### **ANTES (Con Error):**
```
[useCurrentUser] Datos a enviar al servidor: {
  "name": "kevin",
  "weight": 110,
  "height": 177,
  "someField": NaN  // ← PROBLEMA
}
ERROR [useCurrentUser] Error del servidor: 400 {"error":"Datos inválidos","issues":[{"code":"invalid_type","expected":"number","received":"nan"}]}
```

### **DESPUÉS (Corregido):**
```
[useCurrentUser] Excluyendo número inválido: someField = NaN
[useCurrentUser] Datos a enviar al servidor: {
  "name": "kevin",
  "weight": 110,
  "height": 177
  // NaN excluido automáticamente
}
LOG [useCurrentUser] Respuesta del servidor: 200 OK
LOG [useCurrentUser] Sincronización de perfil exitosa.
```

## 🔧 Campos que Pueden Causar NaN

### **Campos Numéricos:**
- `weight` - Peso del paciente
- `height` - Altura del paciente
- `emergencyContactPhone` - Teléfono (si se convierte a número)

### **Campos de Fecha:**
- `birthDate` - Fecha de nacimiento
- `createdAt` - Fecha de creación
- `updatedAt` - Fecha de actualización

### **Campos Calculados:**
- Cualquier campo que resulte de operaciones matemáticas
- Campos que se convierten de string a number

## ✅ Beneficios de la Corrección

1. **Validación Robusta**: Filtra automáticamente valores inválidos
2. **Logging Detallado**: Muestra qué campos se excluyen y por qué
3. **Prevención de Errores**: Evita errores 400 del servidor
4. **Datos Limpios**: Solo envía datos válidos al backend
5. **Debugging**: Fácil identificar problemas de datos

## 🔍 Verificación

Para verificar que funciona, buscar en los logs:

```
[useCurrentUser] Excluyendo número inválido: [campo] = NaN
[useCurrentUser] Datos a enviar al servidor: { ... } // Sin NaN
[useCurrentUser] Respuesta del servidor: 200 OK
[useCurrentUser] Sincronización de perfil exitosa.
```

**¡Esta corrección debería resolver definitivamente el error 400 de datos inválidos!** 🚀
