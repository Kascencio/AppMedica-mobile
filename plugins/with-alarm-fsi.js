// plugins/with-alarm-fsi.js
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const withAlarmFSI = (config) => {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults;

    // Permisos necesarios
    AndroidConfig.Manifest.addUsesPermission(manifest, 'android.permission.SCHEDULE_EXACT_ALARM');
    AndroidConfig.Manifest.addUsesPermission(manifest, 'android.permission.USE_FULL_SCREEN_INTENT');

    const app = manifest.application?.[0];
    if (!app) return c;

    // Asegurar array de actividades
    app.activity = app.activity ?? [];

    // Localizar MainActivity y añadir flags de pantalla completa
    const mainActivity = app.activity.find((a) => {
      const name = (a && a.$ && a.$['android:name']) ? a.$['android:name'] : '';
      return name.endsWith('.MainActivity') || name === 'MainActivity' || name.includes('recuerdamedapp.MainActivity');
    });

    if (mainActivity && mainActivity.$) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
      if (!mainActivity.$['android:launchMode']) {
        mainActivity.$['android:launchMode'] = 'singleTask';
      }
    }

    return c;
  });
};

module.exports = withAlarmFSI;


