/**
 * Validador centralizado para tratamientos
 * Maneja validación y formateo de datos de tratamientos
 */

export interface TreatmentData {
  name: string;
  title?: string; // Campo requerido por el servidor
  description?: string;
  startDate: string;
  endDate?: string;
  frequency: string;
  notes?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  formattedData?: any;
}

/**
 * Validar datos de tratamiento en el cliente
 */
export function validateTreatment(data: Partial<TreatmentData>): ValidationResult {
  const errors: string[] = [];

  // Validar nombre
  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre del tratamiento debe tener al menos 2 caracteres');
  }

  // Validar fechas
  if (data.startDate) {
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push('La fecha de inicio no es válida');
    }
  }

  if (data.endDate) {
    const endDate = new Date(data.endDate);
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    
    if (isNaN(endDate.getTime())) {
      errors.push('La fecha de fin no es válida');
    } else if (endDate <= startDate) {
      errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }

  // Validar frecuencia
  const validFrequencies = ['daily', 'weekly', 'monthly', 'as_needed'];
  if (data.frequency && !validFrequencies.includes(data.frequency.toLowerCase())) {
    errors.push('La frecuencia debe ser: daily, weekly, monthly o as_needed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formatear datos de tratamiento para el servidor
 */
export function formatTreatmentForServer(data: TreatmentData): any {
  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const endDate = data.endDate ? new Date(data.endDate) : null;

  return {
    ...data,
    // El servidor espera 'title' en lugar de 'name'
    title: data.name, // Mapear name a title para el servidor
    // Convertir frequency a mayúsculas
    frequency: data.frequency ? data.frequency.toUpperCase() : 'DAILY',
    // Formatear startDate como ISO datetime completo
    startDate: startDate.toISOString(),
    // Formatear endDate como ISO datetime completo solo si es válida
    endDate: endDate ? endDate.toISOString() : undefined,
    // Asegurar que description y notes sean strings
    description: data.description || '',
    notes: data.notes || '',
  };
}

/**
 * Validar y formatear tratamiento en un solo paso
 */
export function validateAndFormatTreatment(data: TreatmentData): ValidationResult {
  const validation = validateTreatment(data);
  
  if (!validation.isValid) {
    return validation;
  }

  const formattedData = formatTreatmentForServer(data);
  
  return {
    isValid: true,
    errors: [],
    formattedData
  };
}
