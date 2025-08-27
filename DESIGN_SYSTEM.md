# 🎨 Sistema de Diseño - RecuerdaMed

## 🎯 Filosofía del Diseño

Nuestro sistema de diseño está basado en **psicología del color** para aplicaciones médicas, enfocado en generar **confianza**, **calma** y **profesionalismo**.

## 🌈 Paleta de Colores

### **Colores Principales**

#### 🟢 Verde Médico (Primary)
- **`#059669`** - Verde esmeralda principal
- **Psicología**: Confianza, salud, estabilidad, crecimiento
- **Uso**: Botones principales, enlaces, elementos de acción
- **Variantes**: 
  - Light: `#10b981`
  - Dark: `#047857`

#### 🔵 Azul Profesional (Secondary)
- **`#2563eb`** - Azul profesional
- **Psicología**: Profesionalismo, confianza, tecnología
- **Uso**: Elementos secundarios, información, enlaces
- **Variantes**:
  - Light: `#3b82f6`
  - Dark: `#1d4ed8`

#### 🟠 Naranja Cálido (Accent)
- **`#f59e0b`** - Naranja cálido
- **Psicología**: Energía, atención, calidez
- **Uso**: Alertas, elementos importantes, destacados
- **Variantes**:
  - Light: `#fbbf24`
  - Dark: `#d97706`

### **Colores de Estado**

- **✅ Éxito**: `#10b981` (Verde)
- **⚠️ Advertencia**: `#f59e0b` (Naranja)
- **❌ Error**: `#ef4444` (Rojo)
- **ℹ️ Información**: `#3b82f6` (Azul)

### **Colores de Fondo**

- **Primario**: `#fef7ed` (Crema muy claro)
- **Secundario**: `#fef3c7` (Amarillo muy claro)
- **Terciario**: `#ecfdf5` (Verde muy claro)
- **Tarjetas**: `rgba(255, 255, 255, 0.95)` (Blanco translúcido)

### **Colores de Texto**

- **Primario**: `#374151` (Gris oscuro)
- **Secundario**: `#6b7280` (Gris medio)
- **Terciario**: `#9ca3af` (Gris claro)
- **Inverso**: `#ffffff` (Blanco)

## 🏥 Colores Específicos para Medicina

### **Elementos Médicos**
- **Medicamentos**: `#22d3ee` (Azul claro)
- **Citas**: `#34d399` (Verde)
- **Tratamientos**: `#a78bfa` (Púrpura)
- **Notas**: `#fbbf24` (Amarillo)
- **Alertas**: `#f59e0b` (Naranja)
- **Emergencias**: `#ef4444` (Rojo)

## 🎨 Gradientes Predefinidos

### **Gradiente Principal**
```css
background: linear-gradient(135deg, #fef7ed 0%, #fef3c7 50%, #ecfdf5 100%);
```

### **Gradiente de Tarjetas**
```css
background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
```

### **Gradiente de Botones**
```css
background: linear-gradient(135deg, #059669 0%, #047857 100%);
```

## 🔧 Uso en Componentes

### **Botones**
```typescript
// Botón principal
<View style={GLOBAL_STYLES.buttonPrimary}>
  <Text style={GLOBAL_STYLES.buttonText}>Acción</Text>
</View>

// Botón secundario
<View style={GLOBAL_STYLES.buttonSecondary}>
  <Text style={GLOBAL_STYLES.buttonTextSecondary}>Cancelar</Text>
</View>
```

### **Tarjetas**
```typescript
// Tarjeta de medicamento
<View style={MEDICAL_STYLES.medicationCard}>
  <Text>Contenido de la tarjeta</Text>
</View>

// Tarjeta genérica
<View style={GLOBAL_STYLES.card}>
  <Text>Contenido de la tarjeta</Text>
</View>
```

### **Campos de Entrada**
```typescript
<Text style={GLOBAL_STYLES.inputLabel}>Etiqueta</Text>
<TextInput 
  style={GLOBAL_STYLES.input}
  placeholder="Texto de ejemplo"
/>
```

## 📱 Accesibilidad

### **Contraste**
- **Alto contraste**: Negro (`#000000`) para elementos críticos
- **Contraste medio**: Verde principal (`#059669`) para elementos importantes
- **Bajo contraste**: Grises para elementos secundarios

### **Estados de Foco**
- **Color de foco**: Azul (`#3b82f6`)
- **Indicadores visuales**: Bordes y sombras
- **Tamaños mínimos**: 44x44 puntos para elementos táctiles

## 🎯 Guías de Uso

### **1. Jerarquía Visual**
- Usar **verde principal** para acciones principales
- Usar **azul secundario** para información y enlaces
- Usar **naranja acento** para alertas y elementos importantes

### **2. Consistencia**
- Mantener la misma paleta en toda la aplicación
- Usar variantes de color para crear profundidad
- Aplicar sombras y bordes de manera consistente

### **3. Emociones**
- **Verde**: Calma, confianza, salud
- **Azul**: Profesionalismo, tecnología, confianza
- **Naranja**: Energía, atención, calidez
- **Grises**: Neutralidad, legibilidad, elegancia

## 🚀 Implementación

### **Importar Colores**
```typescript
import COLORS from '../constants/colors';
import { GLOBAL_STYLES, MEDICAL_STYLES } from '../constants/styles';
```

### **Usar Colores Directamente**
```typescript
<View style={{ backgroundColor: COLORS.primary }}>
  <Text style={{ color: COLORS.text.inverse }}>Texto</Text>
</View>
```

### **Usar Estilos Predefinidos**
```typescript
<View style={GLOBAL_STYLES.card}>
  <Text style={GLOBAL_STYLES.sectionTitle}>Título</Text>
</View>
```

## 📋 Checklist de Implementación

- [ ] Importar `COLORS` en todos los componentes
- [ ] Reemplazar colores hardcodeados por constantes
- [ ] Usar `GLOBAL_STYLES` para elementos comunes
- [ ] Usar `MEDICAL_STYLES` para elementos médicos
- [ ] Verificar contraste y accesibilidad
- [ ] Probar en diferentes dispositivos y temas
- [ ] Documentar cualquier variación o excepción

## 🔄 Mantenimiento

### **Actualizaciones de Color**
1. Modificar solo el archivo `constants/colors.ts`
2. Los cambios se reflejarán automáticamente en toda la app
3. Probar en diferentes dispositivos
4. Verificar accesibilidad

### **Nuevos Estilos**
1. Agregar a `constants/styles.ts`
2. Seguir la convención de nombres
3. Documentar el uso
4. Probar en diferentes contextos

---

*Este sistema de diseño está diseñado para evolucionar con las necesidades de la aplicación, manteniendo siempre la consistencia visual y la accesibilidad.*
