/**
 * Constantes para campos del perfil de usuario
 * Centraliza las claves para evitar olvidos y mantener consistencia
 */

export const PROFILE_FIELDS = [
  // Campos básicos
  'id',
  'userId',
  'patientProfileId',
  'name',
  'role',
  
  // Información personal
  'age',
  'birthDate',
  'dateOfBirth', // Campo del backend
  'gender',
  'weight',
  'height',
  'bloodType',
  
  // Contacto de emergencia
  'emergencyContactName',
  'emergencyContactRelation',
  'emergencyContactPhone',
  
  // Información médica
  'allergies',
  'chronicDiseases',
  'currentConditions',
  'reactions',
  
  // Información del doctor
  'doctorName',
  'doctorContact',
  'hospitalReference',
  
  // Otros
  'phone',
  'relationship',
  'photoUrl',
  'photoFileId',
  
  // Metadatos
  'createdAt',
  'updatedAt'
] as const;

export type ProfileField = typeof PROFILE_FIELDS[number];

/**
 * Campos que se pueden actualizar desde el formulario
 */
export const UPDATABLE_PROFILE_FIELDS = [
  'name',
  'age',
  'birthDate',
  'dateOfBirth',
  'gender',
  'weight',
  'height',
  'bloodType',
  'emergencyContactName',
  'emergencyContactRelation',
  'emergencyContactPhone',
  'allergies',
  'chronicDiseases',
  'currentConditions',
  'reactions',
  'doctorName',
  'doctorContact',
  'hospitalReference',
  'phone',
  'relationship',
  'photoUrl',
  'photoFileId'
] as const;

export type UpdatableProfileField = typeof UPDATABLE_PROFILE_FIELDS[number];

/**
 * Campos obligatorios para el perfil
 */
export const REQUIRED_PROFILE_FIELDS = [
  'id',
  'userId',
  'name'
] as const;

export type RequiredProfileField = typeof REQUIRED_PROFILE_FIELDS[number];
