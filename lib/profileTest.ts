import { useCurrentUser } from '../store/useCurrentUser';
import { useAuth } from '../store/useAuth';

export async function testProfileLoading() {
  console.log('🧪 Iniciando pruebas de carga de perfil...');
  
  try {
    const { profile, loading, error, fetchProfile, refreshProfile } = useCurrentUser.getState();
    const { userToken } = useAuth.getState();
    
    console.log('📊 Estado inicial del perfil:', {
      profile: profile ? {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        hasBirthDate: !!profile.birthDate,
        hasGender: !!profile.gender,
        hasWeight: !!profile.weight,
        hasHeight: !!profile.height,
        fieldsCount: Object.keys(profile).length
      } : null,
      loading,
      error,
      hasToken: !!userToken
    });
    
    if (!userToken) {
      console.log('❌ No hay token de autenticación');
      return {
        success: false,
        error: 'No hay token de autenticación'
      };
    }
    
    // Forzar recarga del perfil
    console.log('🔄 Forzando recarga del perfil...');
    await refreshProfile();
    
    // Esperar un momento para que se actualice
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedState = useCurrentUser.getState();
    console.log('📊 Estado después de la recarga:', {
      profile: updatedState.profile ? {
        id: updatedState.profile.id,
        name: updatedState.profile.name,
        role: updatedState.profile.role,
        hasBirthDate: !!updatedState.profile.birthDate,
        hasGender: !!updatedState.profile.gender,
        hasWeight: !!updatedState.profile.weight,
        hasHeight: !!updatedState.profile.height,
        fieldsCount: Object.keys(updatedState.profile).length,
        allFields: Object.keys(updatedState.profile)
      } : null,
      loading: updatedState.loading,
      error: updatedState.error
    });
    
    if (updatedState.error) {
      console.log('❌ Error cargando perfil:', updatedState.error);
      return {
        success: false,
        error: updatedState.error
      };
    }
    
    if (!updatedState.profile) {
      console.log('❌ No se pudo cargar el perfil');
      return {
        success: false,
        error: 'No se pudo cargar el perfil'
      };
    }
    
    // Verificar campos importantes
    const currentProfile = updatedState.profile;
    const missingFields = [];
    
    if (!currentProfile.name) missingFields.push('name');
    if (!currentProfile.birthDate) missingFields.push('birthDate');
    if (!currentProfile.gender) missingFields.push('gender');
    if (!currentProfile.weight) missingFields.push('weight');
    if (!currentProfile.height) missingFields.push('height');
    
    console.log('📋 Campos faltantes:', missingFields);
    
    if (missingFields.length > 0) {
      console.log('⚠️ Perfil cargado pero faltan campos importantes');
      return {
        success: true,
        warning: `Perfil cargado pero faltan campos: ${missingFields.join(', ')}`,
        profile: {
          id: currentProfile.id,
          name: currentProfile.name,
          role: currentProfile.role,
          hasBirthDate: !!currentProfile.birthDate,
          hasGender: !!currentProfile.gender,
          hasWeight: !!currentProfile.weight,
          hasHeight: !!currentProfile.height,
          fieldsCount: Object.keys(currentProfile).length
        }
      };
    }
    
    console.log('✅ Perfil cargado correctamente con todos los campos');
    return {
      success: true,
      message: 'Perfil cargado correctamente',
      profile: {
        id: currentProfile.id,
        name: currentProfile.name,
        role: currentProfile.role,
        hasBirthDate: !!currentProfile.birthDate,
        hasGender: !!currentProfile.gender,
        hasWeight: !!currentProfile.weight,
        hasHeight: !!currentProfile.height,
        fieldsCount: Object.keys(currentProfile).length
      }
    };
    
  } catch (error: any) {
    console.error('❌ Error en pruebas de perfil:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido'
    };
  }
}

export async function checkProfileFields() {
  console.log('🔍 Verificando campos del perfil...');
  
  try {
    const { profile } = useCurrentUser.getState();
    
    if (!profile) {
      return {
        success: false,
        error: 'No hay perfil cargado'
      };
    }
    
    const fields = {
      basic: {
        id: !!profile.id,
        name: !!profile.name,
        role: !!profile.role,
        userId: !!profile.userId,
        patientProfileId: !!profile.patientProfileId
      },
      personal: {
        birthDate: !!profile.birthDate,
        gender: !!profile.gender,
        weight: !!profile.weight,
        height: !!profile.height,
        bloodType: !!profile.bloodType
      },
      emergency: {
        emergencyContactName: !!profile.emergencyContactName,
        emergencyContactRelation: !!profile.emergencyContactRelation,
        emergencyContactPhone: !!profile.emergencyContactPhone
      },
      medical: {
        allergies: !!profile.allergies,
        chronicDiseases: !!profile.chronicDiseases,
        currentConditions: !!profile.currentConditions,
        reactions: !!profile.reactions
      },
      doctor: {
        doctorName: !!profile.doctorName,
        doctorContact: !!profile.doctorContact,
        hospitalReference: !!profile.hospitalReference
      },
      other: {
        photoUrl: !!profile.photoUrl,
        createdAt: !!profile.createdAt,
        updatedAt: !!profile.updatedAt
      }
    };
    
    const totalFields = Object.values(fields).flatMap(category => Object.values(category));
    const filledFields = totalFields.filter(Boolean).length;
    const totalCount = totalFields.length;
    
    console.log('📊 Campos del perfil:', fields);
    console.log(`📈 Progreso: ${filledFields}/${totalCount} campos llenos (${Math.round(filledFields/totalCount*100)}%)`);
    
    return {
      success: true,
      fields,
      stats: {
        total: totalCount,
        filled: filledFields,
        percentage: Math.round(filledFields/totalCount*100)
      }
    };
    
  } catch (error: any) {
    console.error('❌ Error verificando campos:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido'
    };
  }
}
