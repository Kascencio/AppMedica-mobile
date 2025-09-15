/**
 * Validador de medicamentos
 */

export interface MedicationValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface MedicationData {
  name: string;
  dosage: string | number;
  type?: string;
  frequency?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  notes?: string;
}

/**
 * Validar datos de medicamento
 */
export function validateMedication(data: MedicationData): MedicationValidationResult {
  const errors: string[] = [];

  // Validar nombre
  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre del medicamento debe tener al menos 2 caracteres');
  }

  // Validar dosis
  if (!data.dosage || data.dosage.toString().trim().length === 0) {
    errors.push('La dosis es requerida');
  } else {
    const dosageValue = typeof data.dosage === 'string' ? parseFloat(data.dosage) : data.dosage;
    if (isNaN(dosageValue) || dosageValue <= 0) {
      errors.push('La dosis debe ser un número válido mayor a 0');
    }
  }

  // Validar fechas
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (isNaN(startDate.getTime())) {
      errors.push('La fecha de inicio no es válida');
    }
    
    if (isNaN(endDate.getTime())) {
      errors.push('La fecha de fin no es válida');
    }
    
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate <= startDate) {
      errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }

  // Validar tipo
  if (data.type && !['ORAL', 'INJECTION', 'TOPICAL', 'INHALATION', 'SUBLINGUAL'].includes(data.type.toUpperCase())) {
    errors.push('El tipo de medicamento no es válido');
  }

  // Validar frecuencia
  if (data.frequency && !['DAILY', 'WEEKLY', 'MONTHLY', 'AS_NEEDED'].includes(data.frequency.toUpperCase())) {
    errors.push('La frecuencia no es válida');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formatear datos de medicamento para el servidor
 */
export function formatMedicationForServer(data: MedicationData): any {
  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const endDate = data.endDate ? new Date(data.endDate) : null;

  return {
    ...data,
    // Mantener dosage como string para el servidor
    dosage: data.dosage.toString(),
    // Convertir type a mayúsculas
    type: data.type ? data.type.toUpperCase() : 'ORAL',
    // Convertir frequency a mayúsculas
    frequency: data.frequency ? data.frequency.toUpperCase() : 'DAILY',
    // Formatear startDate como ISO datetime completo
    startDate: startDate.toISOString(),
    // Formatear endDate como ISO datetime completo solo si es válida
    endDate: endDate ? endDate.toISOString() : undefined,
    // Asegurar que notes sea string
    notes: data.notes || '',
  };
}

/**
 * Validar y formatear medicamento en un solo paso
 */
export function validateAndFormatMedication(data: MedicationData): {
  isValid: boolean;
  errors: string[];
  formattedData?: any;
} {
  const validation = validateMedication(data);
  
  if (!validation.isValid) {
    return {
      isValid: false,
      errors: validation.errors,
    };
  }

  return {
    isValid: true,
    errors: [],
    formattedData: formatMedicationForServer(data),
  };
}
