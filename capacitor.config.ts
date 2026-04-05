import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.bloomselfcare.bloom',
  appName: 'Bloom',
  webDir: 'www',
  server: {
    // In production, load from the live site so updates deploy instantly
    // Comment this out to use the local bundled copy instead
    url: 'https://bloomselfcare.app',
    cleartext: false
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
