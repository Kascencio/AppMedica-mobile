// plugins/with-alarm-fsi.cjs
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin: habilita permisos y flags para full-screen intent en MainActivity
 */
function withAlarmFSI(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults;

    // Permisos necesarios
    // Añadir permisos usando API de Permissions
    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_FULL_SCREEN_INTENT'
    ]);

    const app = manifest.application && manifest.application[0];
    if (!app) return c;

    // Asegurar array de actividades
    app.activity = app.activity || [];

    // Localizar MainActivity y añadir flags
    const mainActivity = app.activity.find((a) => {
      const name = a && a.$ && a.$['android:name'] ? a.$['android:name'] : '';
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
}

module.exports = withAlarmFSI;


