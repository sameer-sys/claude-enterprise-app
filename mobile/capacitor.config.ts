import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sameer.aiworkspace',
  appName: 'Sameer AI Workspace',
  webDir: 'www',
  server: {
    url: 'https://claude-enterprise-app.vercel.app',
    cleartext: false,
    allowNavigation: ['claude-enterprise-app.vercel.app'],
  },
};

export default config;
