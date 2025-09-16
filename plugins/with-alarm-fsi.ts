// plugins/with-alarm-fsi.ts
import { AndroidConfig, ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

const withAlarmFSI: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults;

    // Permisos necesarios
    AndroidConfig.Manifest.addUsesPermission(manifest, 'android.permission.SCHEDULE_EXACT_ALARM');
    AndroidConfig.Manifest.addUsesPermission(manifest, 'android.permission.USE_FULL_SCREEN_INTENT');

    const app = manifest.application?.[0];
    if (!app) return c;

    // Asegurar array de actividades
    app.activity = app.activity ?? [];

    // Intentar localizar MainActivity existente para añadir flags de pantalla completa
    const mainActivity = app.activity.find((a: any) => {
      const name = a?.$?.['android:name'] ?? '';
      return name.endsWith('.MainActivity') || name === 'MainActivity' || name.includes('recuerdamedapp.MainActivity');
    });

    if (mainActivity) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
      // Mantener exported/launchMode existentes si ya están definidos
      if (!mainActivity.$['android:launchMode']) {
        mainActivity.$['android:launchMode'] = 'singleTask';
      }
    }

    // No añadimos actividad extra: usaremos la MainActivity existente

    return c;
  });
};

export default withAlarmFSI;


