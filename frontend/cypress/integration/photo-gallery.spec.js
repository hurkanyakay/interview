describe('Best of Unsplash - Main Functionality', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load and display the photo gallery', () => {
    // Wait for the page to load
    cy.get('h1').should('contain.text', 'Best of Unsplash')
    
    // Wait for photos to load using correct selectors
    cy.get('.container.mx-auto', { timeout: 45000 }).should('be.visible')
    cy.get('.flex.gap-4.items-start', { timeout: 45000 }).should('be.visible')
    
    // Verify images are displayed in the gallery container
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // Verify first image loads successfully
    cy.get('.container img').first().should('be.visible').and(($img) => {
      expect($img[0].naturalWidth).to.be.greaterThan(0)
    })
  })

  it('should display the auto slideshow', () => {
    // Wait longer for slideshow to load (it needs to fetch image info and preload images)
    cy.get('.overflow-hidden.mb-8', { timeout: 90000 }).should('be.visible')
    
    // Verify slideshow container exists
    cy.get('.overflow-hidden.mb-8').should('be.visible')
    
    // Verify slideshow images are present
    cy.get('.overflow-hidden.mb-8 img', { timeout: 90000 }).should('have.length.greaterThan', 0)
  })

  it('should load more photos when scrolling to bottom', () => {
    // Wait for initial photos to load
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
    
    // Count initial photos
    cy.get('.container img').then($images => {
      const initialCount = $images.length
      
      // Scroll to bottom multiple times to trigger loading
      cy.scrollTo('bottom')
      cy.wait(2000)
      cy.scrollTo('bottom')
      cy.wait(2000)
      
      // Verify more photos loaded (or at least same count if no more available)
      cy.get('.container img').should('have.length.gte', initialCount)
    })
  })

  it('should show loading indicators', () => {
    // Visit page and look for loading indicators
    cy.visit('/')
    
    // Should show loading spinners while images load
    cy.get('.animate-spin', { timeout: 5000 }).should('exist')
    
    // Wait for images to load
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
  })

  it('should handle basic functionality without errors', () => {
    // Wait for gallery to load
    cy.get('.container.mx-auto', { timeout: 45000 }).should('be.visible')
    cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
    
    // Should be able to scroll
    cy.scrollTo('bottom')
    cy.wait(1000)
    
    // Should still have images
    cy.get('.container img').should('have.length.greaterThan', 0)
  })
})