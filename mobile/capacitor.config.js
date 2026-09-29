/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.sameer.aiworkspace',
  appName: 'Sameer AI Workspace',
  webDir: 'www',
  server: {
    url: 'https://claude-enterprise-app.vercel.app',
    cleartext: false,
    allowNavigation: ['claude-enterprise-app.vercel.app']
  }
};

module.exports = config;
