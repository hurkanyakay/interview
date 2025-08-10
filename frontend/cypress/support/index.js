// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log for cleaner test output
Cypress.on('window:before:load', (win) => {
  const originalFetch = win.fetch
  
  win.fetch = function(...args) {
    return originalFetch.apply(this, args)
  }
})