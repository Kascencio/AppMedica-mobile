import { StyleSheet } from 'react-native';
import COLORS from './colors';

// Estilos globales para toda la aplicación
export const GLOBAL_STYLES = StyleSheet.create({
  // Contenedores principales
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  
  // Contenedores de pantalla
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  
  // Encabezados de sección
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
    marginTop: 8,
  },
  
  // Títulos de sección
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  
  // Subtítulos
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  
  // Texto de cuerpo
  bodyText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  
  // Texto pequeño
  caption: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    lineHeight: 16,
  },
  
  // Tarjetas
  card: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  
  // Botones principales
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  
  // Botones secundarios
  buttonSecondary: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  
  // Botones de texto
  buttonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  buttonTextSecondary: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  buttonSecondaryText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Campos de entrada
  input: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.neutral,
    marginBottom: 16,
  },
  
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  
  // Etiquetas de campos
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  
  // Mensajes de error
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  
  // Mensajes de éxito
  successText: {
    color: COLORS.success,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  
  // Indicadores de carga
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
  },
  
  // Contenedores centrados
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Filas de elementos
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Encabezados
  header: {
    backgroundColor: COLORS.background.primary,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  
  // Secciones
  section: {
    marginBottom: 24,
  },
  

  
  // Espaciado entre elementos
  rowSpaced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Separadores
  separator: {
    height: 1,
    backgroundColor: COLORS.border.neutral,
    marginVertical: 16,
  },
  
  // Badges
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  
  badgeText: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Iconos
  icon: {
    marginRight: 8,
  },
  
  // Sombras
  shadow: {
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Sombras ligeras
  shadowLight: {
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
});

// Estilos específicos para elementos médicos
export const MEDICAL_STYLES = StyleSheet.create({
  // Tarjetas de medicamentos
  medicationCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.medical.medication,
    ...GLOBAL_STYLES.shadowLight,
  },
  
  // Tarjetas de citas
  appointmentCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.medical.appointment,
    ...GLOBAL_STYLES.shadowLight,
  },
  
  // Tarjetas de tratamientos
  treatmentCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.medical.treatment,
    ...GLOBAL_STYLES.shadowLight,
  },
  
  // Tarjetas de notas
  noteCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.medical.note,
    ...GLOBAL_STYLES.shadowLight,
  },
  
  // Botones de acción médica
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    ...GLOBAL_STYLES.shadowLight,
  },
  
  actionButtonText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Estados de salud
  healthStatusGood: {
    backgroundColor: COLORS.success,
    color: COLORS.text.inverse,
  },
  healthStatusWarning: {
    backgroundColor: COLORS.warning,
    color: COLORS.text.inverse,
  },
  healthStatusCritical: {
    backgroundColor: COLORS.error,
    color: COLORS.text.inverse,
  },
});

export default GLOBAL_STYLES;
