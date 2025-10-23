export interface MedicalSpecialtyOption {
  value: string;
  label: string;
}

export const MEDICAL_SPECIALTIES: MedicalSpecialtyOption[] = [
  { value: '', label: 'Seleccionar especialidad' },
  { value: 'Cardiology', label: 'Cardiología' },
  { value: 'Dermatology', label: 'Dermatología' },
  { value: 'Endocrinology', label: 'Endocrinología' },
  { value: 'Gastroenterology', label: 'Gastroenterología' },
  { value: 'General Medicine', label: 'Medicina General' },
  { value: 'Gynecology', label: 'Ginecología' },
  { value: 'Hematology', label: 'Hematología' },
  { value: 'Infectious Diseases', label: 'Enfermedades Infecciosas' },
  { value: 'Internal Medicine', label: 'Medicina Interna' },
  { value: 'Nephrology', label: 'Nefrología' },
  { value: 'Neurology', label: 'Neurología' },
  { value: 'Oncology', label: 'Oncología' },
  { value: 'Ophthalmology', label: 'Oftalmología' },
  { value: 'Orthopedics', label: 'Ortopedia' },
  { value: 'Otolaryngology', label: 'Otorrinolaringología' },
  { value: 'Pediatrics', label: 'Pediatría' },
  { value: 'Pulmonology', label: 'Neumología' },
  { value: 'Psychiatry', label: 'Psiquiatría' },
  { value: 'Radiology', label: 'Radiología' },
  { value: 'Rheumatology', label: 'Reumatología' },
  { value: 'Urology', label: 'Urología' },
  { value: 'Emergency Medicine', label: 'Medicina de Emergencias' },
  { value: 'Family Medicine', label: 'Medicina Familiar' },
  { value: 'Physical Therapy', label: 'Fisioterapia' },
  { value: 'Nutrition', label: 'Nutrición' },
  { value: 'Psychology', label: 'Psicología' },
  { value: 'Dentistry', label: 'Odontología' },
  { value: 'Other', label: 'Otra especialidad' }
];
