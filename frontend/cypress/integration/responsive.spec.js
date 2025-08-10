describe('Responsive Design', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Large Desktop', width: 1920, height: 1080 }
  ]

  viewports.forEach(viewport => {
    context(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height)
        cy.visit('/')
        cy.waitForPhotoGallery()
      })

      it('should display photo gallery correctly', () => {
        // Gallery should be visible
        cy.get('.container.mx-auto', { timeout: 60000 }).should('be.visible')
        
        // Images should be displayed
        cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 0)
        
        // Images should load successfully
        cy.waitForImagesLoad()
      })

      it('should display slideshow correctly', () => {
        cy.waitForSlideshow()
        
        // Slideshow should be visible
        cy.get('.overflow-hidden.mb-8').should('be.visible')
        
        // Slideshow images should be present
        cy.get('.overflow-hidden.mb-8 img').should('have.length.greaterThan', 0)
      })

      it('should open and display photo modal correctly', () => {
        // Click on first photo (target gallery images specifically)
        cy.get('.container img').first().click({ force: true })
        
        // Modal should appear
        cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
        
        // Image in modal should be visible
        cy.get('.fixed.inset-0.z-50 img').should('exist')
        
        // Close button should be accessible
        cy.get('[aria-label="Close"]').should('be.visible')
      })

      if (viewport.width <= 768) {
        it('should handle mobile interactions correctly', () => {
          // Test touch interactions on mobile
          cy.get('.container img').first().click({ force: true })
          cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
          
          // Modal should close on backdrop tap
          cy.get('.fixed.inset-0.z-50').click(50, 50)
          cy.get('.fixed.inset-0.z-50').should('not.exist')
        })

        it('should have appropriate grid layout for mobile', () => {
          // On mobile, gallery should be visible and responsive
          cy.get('.container.mx-auto').should('be.visible')
          cy.get('.flex.gap-4.items-start').should('be.visible')
        })
      } else {
        it('should have appropriate grid layout for desktop', () => {
          // On desktop, gallery should be visible and responsive
          cy.get('.container.mx-auto').should('be.visible')
          cy.get('.flex.gap-4.items-start').should('be.visible')
          cy.get('.container img').should('have.length.greaterThan', 5)
        })
      }

      it('should handle scrolling correctly', () => {
        // Should be able to scroll
        cy.scrollTo('bottom')
        cy.wait(2000)
        
        // Should load more images or maintain current ones
        cy.get('.container img').should('have.length.greaterThan', 5)
      })
    })
  })

  it('should adapt layout when window is resized', () => {
    cy.visit('/')
    cy.waitForPhotoGallery()
    
    // Start with desktop size
    cy.viewport(1280, 720)
    cy.get('.container.mx-auto').should('be.visible')
    
    // Resize to tablet
    cy.viewport(768, 1024)
    cy.wait(1000) // Allow layout to settle
    cy.get('.container.mx-auto').should('be.visible')
    
    // Resize to mobile
    cy.viewport(375, 667)
    cy.wait(1000) // Allow layout to settle
    cy.get('.container.mx-auto').should('be.visible')
    
    // Layout should still work correctly
    cy.get('.container img').should('have.length.greaterThan', 0)
  })
})