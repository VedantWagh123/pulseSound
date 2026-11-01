const { withAndroidManifest, withDangerousMod, withGradleProperties, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withPulseOverlayManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECORD_AUDIO',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.POST_NOTIFICATIONS',
    ];

    permissions.forEach((perm) => {
      const exists = manifest['uses-permission'].some(
        (p) => p.$['android:name'] === perm
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    const application = manifest.application?.[0];
    if (application) {
      if (!application.service) {
        application.service = [];
      }

      const serviceName = 'com.spotify.mobileapp.PulseFloatingOverlayService';
      const serviceExists = application.service.some(
        (s) => s.$['android:name'] === serviceName || s.$['android:name'] === '.PulseFloatingOverlayService'
      );

      if (!serviceExists) {
        application.service.push({
          $: {
            'android:name': '.PulseFloatingOverlayService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:foregroundServiceType': 'microphone',
          },
        });
      }
    }

    return config;
  });
};

const withPulseOverlayNativeFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidSrcDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'spotify',
        'mobileapp'
      );

      const templatesDir = path.join(projectRoot, 'plugins', 'native-android');

      if (fs.existsSync(templatesDir)) {
        if (!fs.existsSync(androidSrcDir)) {
          fs.mkdirSync(androidSrcDir, { recursive: true });
        }

        const files = [
          'PulseFloatingOverlayService.kt',
          'PulseOverlayModule.kt',
          'PulseOverlayPackage.kt',
        ];

        files.forEach((file) => {
          const src = path.join(templatesDir, file);
          const dest = path.join(androidSrcDir, file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`[withPulseOverlay] Copied ${file} to Android project`);
          }
        });
      }

      return config;
    },
  ]);
};

// Optimize APK File Size by targeting modern physical phone CPUs (arm64-v8a)
// Excludes 30MB+ of unused x86 and x86_64 PC emulator binaries with 0 loss in audio or visual quality
const withPulseOptimizedGradle = (config) => {
  return withGradleProperties(config, (config) => {
    const propertiesToAdd = [
      { type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' },
    ];
    propertiesToAdd.forEach((prop) => {
      const idx = config.modResults.findIndex((item) => item.key === prop.key);
      if (idx >= 0) {
        config.modResults[idx] = prop;
      } else {
        config.modResults.push(prop);
      }
    });
    return config;
  });
};

const withPulseOverlay = (config) => {
  config = withPulseOverlayManifest(config);
  config = withPulseOverlayNativeFiles(config);
  config = withPulseOptimizedGradle(config);
  return config;
};

module.exports = createRunOncePlugin(withPulseOverlay, 'withPulseOverlay', '1.0.0');

