describe('Basic Smoke Test', () => {
  it('should load the homepage without errors', () => {
    // Visit the app
    cy.visit('/')
    
    // Check that the page loads
    cy.get('body').should('be.visible')
    
    // Check for main heading
    cy.get('h1').should('contain.text', 'Best of Unsplash')
    
    // Check that images load
    cy.get('img', { timeout: 10000 }).should('have.length.greaterThan', 0)
  })
})