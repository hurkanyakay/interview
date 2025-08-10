describe('Photo Gallery - Basic Functionality', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load and display photos', () => {
    // Wait for the page to load
    cy.get('h1').should('contain.text', 'Best of Unsplash')
    
    // Wait for photos to load (look for container)
    cy.get('.container.mx-auto', { timeout: 45000 }).should('be.visible')
    
    // Wait for images to appear
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // Verify first image loads successfully
    cy.get('.container img').first().should('be.visible').and(($img) => {
      expect($img[0].naturalWidth).to.be.greaterThan(0)
    })
  })

  it('should display the auto slideshow', () => {
    // Wait for slideshow to load
    cy.get('.overflow-hidden.mb-8', { timeout: 90000 }).should('be.visible')
    
    // Verify slideshow images are present
    cy.get('.overflow-hidden.mb-8 img', { timeout: 90000 }).should('have.length.greaterThan', 0)
  })

  it('should open photo modal when clicking on a photo', () => {
    // Wait for photos to load
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // Click on first gallery photo (skip slideshow images)
    cy.get('.container img').first().click({ force: true })
    
    // Modal should appear
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Should show photo in modal
    cy.get('.fixed.inset-0.z-50 img').should('be.visible')
  })

  it('should close modal when clicking close button', () => {
    // Wait for photos and open modal
    cy.get('.container img', { timeout: 60000 }).first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Click close button
    cy.get('[aria-label="Close"]').click()
    
    // Modal should disappear
    cy.get('.fixed.inset-0.z-50').should('not.exist')
  })

  it('should handle responsive layout', () => {
    // Test mobile viewport
    cy.viewport(375, 667)
    cy.reload()
    
    // Should still load photos
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
    
    // Test tablet viewport
    cy.viewport(768, 1024)
    cy.reload()
    
    // Should still load photos
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
  })
})