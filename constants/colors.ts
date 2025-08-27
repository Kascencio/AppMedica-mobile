// Paleta de colores médicos profesionales
// Basada en psicología del color para generar confianza y calma

export const COLORS = {
  // Colores principales - Verde médico (confianza, salud, estabilidad)
  primary: '#059669', // Verde esmeralda - color principal
  primaryLight: '#10b981', // Verde más claro
  primaryDark: '#047857', // Verde más oscuro
  
  // Colores secundarios - Azul médico (profesionalismo, confianza)
  secondary: '#2563eb', // Azul profesional
  secondaryLight: '#3b82f6', // Azul más claro
  secondaryDark: '#1d4ed8', // Azul más oscuro
  
  // Colores de acento - Colores cálidos para elementos importantes
  accent: '#f59e0b', // Naranja cálido
  accentLight: '#fbbf24', // Naranja más claro
  accentDark: '#d97706', // Naranja más oscuro
  
  // Colores de estado
  success: '#10b981', // Verde éxito
  warning: '#f59e0b', // Naranja advertencia
  error: '#ef4444', // Rojo error
  info: '#3b82f6', // Azul información
  
  // Colores de fondo - Tonos cálidos y suaves
  background: {
    primary: '#fef7ed', // Crema muy claro
    secondary: '#fef3c7', // Amarillo muy claro
    tertiary: '#ecfdf5', // Verde muy claro
    card: 'rgba(255, 255, 255, 0.95)', // Blanco translúcido
    modal: 'rgba(255, 255, 255, 0.98)', // Blanco casi opaco
  },
  
  // Colores de texto
  text: {
    primary: '#374151', // Gris oscuro principal
    secondary: '#6b7280', // Gris medio secundario
    tertiary: '#9ca3af', // Gris claro terciario
    inverse: '#ffffff', // Blanco para fondos oscuros
    accent: '#059669', // Verde para acentos
  },
  
  // Colores de bordes y separadores
  border: {
    light: 'rgba(5, 150, 105, 0.1)', // Verde muy transparente
    medium: 'rgba(5, 150, 105, 0.2)', // Verde semi-transparente
    dark: 'rgba(5, 150, 105, 0.3)', // Verde más opaco
    neutral: '#e5e7eb', // Gris neutro
  },
  
  // Colores de sombras
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.15)',
  },
  
  // Colores específicos para elementos médicos
  medical: {
    medication: '#22d3ee', // Azul claro para medicamentos
    appointment: '#34d399', // Verde para citas
    treatment: '#a78bfa', // Púrpura para tratamientos
    note: '#fbbf24', // Amarillo para notas
    alert: '#f59e0b', // Naranja para alertas
    emergency: '#ef4444', // Rojo para emergencias
  },
  
  // Gradientes predefinidos
  gradients: {
    primary: ['#fef7ed', '#fef3c7', '#ecfdf5'], // Gradiente principal cálido
    card: ['#ffffff', '#f8fafc'], // Gradiente de tarjetas
    button: ['#059669', '#047857'], // Gradiente de botones
    header: ['#fef7ed', '#fef3c7'], // Gradiente de encabezados
  },
  
  // Colores de accesibilidad
  accessibility: {
    highContrast: '#000000', // Negro para alto contraste
    lowContrast: '#6b7280', // Gris para bajo contraste
    focus: '#3b82f6', // Azul para elementos enfocados
    selected: '#dbeafe', // Azul claro para elementos seleccionados
  }
};

// Función para obtener colores con transparencia
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Si es un color hexadecimal, convertirlo a rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

// Función para obtener variantes de colores
export const getColorVariant = (baseColor: string, variant: 'lighter' | 'darker'): string => {
  const colorMap: Record<string, { lighter: string; darker: string }> = {
    [COLORS.primary]: {
      lighter: COLORS.primaryLight,
      darker: COLORS.primaryDark
    },
    [COLORS.secondary]: {
      lighter: COLORS.secondaryLight,
      darker: COLORS.secondaryDark
    },
    [COLORS.accent]: {
      lighter: COLORS.accentLight,
      darker: COLORS.accentDark
    }
  };
  
  return colorMap[baseColor]?.[variant] || baseColor;
};

export default COLORS;
