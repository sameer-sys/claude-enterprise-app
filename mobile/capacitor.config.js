/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.sameer.aiworkspace',
  appName: 'Sameer AI Workspace',
  webDir: 'www',
  server: {
    url: 'https://claude-enterprise-app.vercel.app',
    cleartext: false
  }
};

module.exports = config;
