const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/integration/**/*.spec.js',
    supportFile: 'cypress/support/index.js',
  },
  
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
  
  viewportWidth: 1280,
  viewportHeight: 720,
  video: false,
  screenshotOnRunFailure: true,
  pageLoadTimeout: 180000,    // 3 minutes for page loads
  defaultCommandTimeout: 30000,  // 30 seconds for commands
  requestTimeout: 30000,         // 30 seconds for network requests
  responseTimeout: 60000,        // 1 minute for API responses
  
  env: {
    // API endpoint for tests
    API_BASE_URL: 'https://picsum.photos',
  },
})