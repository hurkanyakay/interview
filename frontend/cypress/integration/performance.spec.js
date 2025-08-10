describe('Performance and User Experience', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load initial page quickly', () => {
    // Page should load within reasonable time
    cy.get('h1', { timeout: 3000 }).should('contain.text', 'Best of Unsplash')
    
    // Initial content should appear quickly
    cy.get('body').should('be.visible')
  })

  it('should show loading indicators during image loading', () => {
    // Should show loading spinners while images load
    cy.get('.animate-spin', { timeout: 30000 }).should('exist')
    
    // Wait for images to load
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
  })

  it('should implement lazy loading for images', () => {
    // Wait for initial images to load
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // Count initial images
    cy.get('img').then($images => {
      const initialCount = $images.length
      
      // Scroll down to trigger lazy loading
      cy.scrollTo('bottom')
      cy.wait(2000)
      
      // Should have more images loaded
      cy.get('img').should('have.length.greaterThan', initialCount)
    })
  })

  it('should handle network errors gracefully', () => {
    // Test that app doesn't crash when network is slow/unstable
    cy.visit('/')
    
    // Should handle loading states gracefully
    cy.get('body').should('be.visible')
    cy.get('h1').should('contain.text', 'Best of Unsplash')
    
    // Should show loading indicators or fallback gracefully
    cy.get('.container.mx-auto', { timeout: 60000 }).should('be.visible')
  })

  it('should cache images for better performance', () => {
    cy.waitForPhotoGallery()
    
    // Open modal to trigger HD image loading (target gallery images specifically)
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Close modal
    cy.get('[aria-label="Close"]').click()
    
    // Open same modal again - should be faster due to caching
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
  })

  it('should handle large numbers of images without performance issues', () => {
    // Load many pages of images
    for (let i = 0; i < 3; i++) {
      cy.scrollTo('bottom')
      cy.wait(1000)
    }
    
    // Should have many images loaded
    cy.get('.container img').should('have.length.greaterThan', 30)
    
    // Page should still be responsive
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
  })

  it('should maintain slideshow animation performance', () => {
    cy.waitForSlideshow()
    
    // Slideshow animation should be smooth
    cy.get('.overflow-hidden.mb-8 .flex').should('have.css', 'animation-name', 'slideLeft')
    
    // Should continue animating after interaction
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').first().trigger('mouseover')
    cy.wait(1000)
    cy.get('.overflow-hidden.mb-8 .flex').should('have.css', 'animation-name', 'slideLeft')
  })

  it('should handle image load failures gracefully', () => {
    // Mock some image failures
    cy.intercept('GET', '**/picsum.photos/id/*/300/200', { 
      statusCode: 404,
      body: 'Not found'
    }).as('imageLoadError')
    
    cy.waitForPhotoGallery()
    
    // Should handle failed images without breaking layout
    cy.get('.container.mx-auto').should('be.visible')
    
    // Should show available images
    cy.get('.container img').should('have.length.greaterThan', 0)
  })

  it('should provide good user feedback during interactions', () => {
    cy.waitForPhotoGallery()
    
    // Hover feedback on gallery images
    cy.get('.container img').first().trigger('mouseover', { force: true })
    cy.get('.container img').first().should('have.css', 'transform')
    
    // Click feedback
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Modal close feedback
    cy.get('[aria-label="Close"]').should('be.visible').click()
    cy.get('.fixed.inset-0.z-50').should('not.exist')
  })
})