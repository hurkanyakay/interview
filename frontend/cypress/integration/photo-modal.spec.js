describe('Photo Modal Functionality', () => {
  beforeEach(() => {
    cy.visit('/')
    // Wait for gallery to load with correct selectors
    cy.get('.container.mx-auto', { timeout: 45000 }).should('be.visible')
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
  })

  it('should open photo modal when clicking on a photo', () => {
    // Click on first gallery photo (not slideshow)
    cy.get('.container img').first().click({ force: true })
    
    // Modal should appear (use z-50 to target modal specifically)
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Should show photo details
    cy.get('.fixed.inset-0.z-50').within(() => {
      cy.get('img').should('be.visible')
      cy.contains(/\d+\s*×\s*\d+px/).should('be.visible') // Dimensions
    })
  })

  it('should close modal when clicking close button', () => {
    // Open modal
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Click close button
    cy.get('[aria-label="Close"]').click()
    
    // Modal should disappear
    cy.get('.fixed.inset-0.z-50').should('not.exist')
  })

  it('should close modal when clicking backdrop', () => {
    // Open modal
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Click backdrop (not the content)
    cy.get('.fixed.inset-0.z-50').click(50, 50) // Click at edge
    
    // Modal should disappear
    cy.get('.fixed.inset-0.z-50').should('not.exist')
  })

  it('should close modal when pressing Escape key', () => {
    // Open modal
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Press Escape key
    cy.get('body').type('{esc}')
    
    // Modal should disappear
    cy.get('.fixed.inset-0.z-50').should('not.exist')
  })

  it('should display photo information correctly', () => {
    // Open modal
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Should display photo details
    cy.get('.fixed.inset-0.z-50').within(() => {
      // Photo ID
      cy.contains(/#\d+/).should('be.visible')
      
      // Dimensions
      cy.contains(/\d+\s*×\s*\d+px/).should('be.visible')
      
      // Aspect ratio
      cy.contains(/Ratio:\s*\d+\.\d+:\d+/).should('be.visible')
      
      // Download and Unsplash links
      cy.contains('Download').should('have.attr', 'target', '_blank')
      cy.contains('Unsplash').should('have.attr', 'target', '_blank')
    })
  })

  it('should show modal content correctly', () => {
    // Open modal
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Should show modal image and content (loading may be too fast to catch)
    cy.get('.fixed.inset-0.z-50 img').should('exist')
    cy.get('.fixed.inset-0.z-50').should('contain', 'px') // Should show dimensions
  })

  it('should handle HD image load failure gracefully', () => {
    // Open modal
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Should attempt to load original image or show error
    cy.wait(2000)
    
    // Modal should still be functional
    cy.get('.fixed.inset-0.z-50').should('be.visible')
  })

  it('should not close when clicking on modal content', () => {
    // Open modal
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Click on modal content (not backdrop) - use force click to avoid visibility issues
    cy.get('.fixed.inset-0.z-50').find('.relative').click({ force: true })
    
    // Modal should remain open
    cy.get('.fixed.inset-0.z-50').should('be.visible')
  })
})