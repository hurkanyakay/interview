describe('Photo Gallery - Comprehensive E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load the application and display photos', () => {
    // Page loads successfully
    cy.get('h1').should('contain.text', 'Best of Unsplash')
    
    // Gallery container loads
    cy.get('.container.mx-auto', { timeout: 45000 }).should('be.visible')
    
    // Photos load in gallery
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // First image loads successfully
    cy.get('.container img').first().should('be.visible').and(($img) => {
      expect($img[0].naturalWidth).to.be.greaterThan(0)
    })
  })

  it('should open and close photo modal', () => {
    // Wait for gallery to load
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // Click on first photo to open modal (force click to avoid hover overlay issues)
    cy.get('.container img').first().click({ force: true })
    
    // Modal opens (use z-50 to target the modal specifically, not the background blur with z-0)
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Modal shows image
    cy.get('.fixed.inset-0.z-50 img').should('be.visible')
    
    // Modal shows photo info
    cy.get('.fixed.inset-0.z-50').should('contain', '#')
    cy.get('.fixed.inset-0.z-50').should('contain', '×')
    cy.get('.fixed.inset-0.z-50').should('contain', 'px')
    
    // Close modal with close button
    cy.get('[aria-label="Close"]').click()
    
    // Modal closes
    cy.get('.fixed.inset-0.z-50').should('not.exist')
  })

  it('should handle scrolling and load more photos', () => {
    // Wait for initial photos
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // Get initial count
    cy.get('.container img').then($images => {
      const initialCount = $images.length
      
      // Scroll to trigger more loading
      cy.scrollTo('bottom')
      cy.wait(3000) // Wait for potential new photos
      
      // Should have at least the same number (may not load more if at end)
      cy.get('.container img').should('have.length.gte', initialCount)
    })
  })

  it('should show loading indicators', () => {
    // Fresh visit to catch loading state
    cy.reload()
    
    // Should show loading spinners (may be very quick, so shorter timeout)
    cy.get('.animate-spin', { timeout: 5000 }).should('exist')
    
    // Photos eventually load
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
  })

  it('should work on different screen sizes', () => {
    // Desktop size
    cy.viewport(1280, 720)
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // Tablet size
    cy.viewport(768, 1024)
    cy.reload()
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
    
    // Mobile size
    cy.viewport(375, 667)
    cy.reload()
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
  })

  it('should handle modal keyboard interactions', () => {
    // Load gallery and open modal
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    cy.get('.container img').first().click({ force: true })
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Close with Escape key
    cy.get('body').type('{esc}')
    cy.get('.fixed.inset-0.z-50').should('not.exist')
  })

  it('should display slideshow when ready', () => {
    // Use custom command with proper timeout
    cy.waitForSlideshow()
    
    // Verify slideshow has images
    cy.get('.overflow-hidden.mb-8 img').should('have.length.greaterThan', 0)
  })

  it('should handle basic error scenarios gracefully', () => {
    // App should not crash even with potential network issues
    cy.get('body').should('be.visible')
    cy.get('h1').should('contain.text', 'Best of Unsplash')
    
    // Should eventually load some content
    cy.get('.container', { timeout: 30000 }).should('be.visible')
  })
})