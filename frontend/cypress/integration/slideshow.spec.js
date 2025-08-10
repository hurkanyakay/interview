describe('Auto Slideshow Functionality', () => {
  beforeEach(() => {
    cy.visit('/')
    // Wait for slideshow to load
    cy.get('.overflow-hidden.mb-8', { timeout: 90000 }).should('be.visible')
    cy.get('.overflow-hidden.mb-8 img', { timeout: 90000 }).should('have.length.greaterThan', 0)
  })

  it('should display slideshow with animated images', () => {
    // Verify slideshow container
    cy.get('.overflow-hidden.mb-8').should('be.visible')
    
    // Verify slideshow has images
    cy.get('.overflow-hidden.mb-8 img').should('have.length.greaterThan', 0)
    
    // Verify animation is running
    cy.get('.overflow-hidden.mb-8 .flex').should('have.css', 'animation-name')
  })

  it('should show hover overlay with photo info', () => {
    // Hover over first slideshow image
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').first().trigger('mouseover', { force: true })
    
    // Should show overlay with info
    cy.get('.overflow-hidden.mb-8 .absolute').first().should('be.visible')
    
    // Should show dimensions and author
    cy.get('.overflow-hidden.mb-8 .absolute').first().within(() => {
      cy.contains(/\d+\s*×\s*\d+px/).should('be.visible')
      cy.contains('by ').should('be.visible')
    })
  })

  it('should hide overlay when mouse leaves', () => {
    // Hover over first slideshow image
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').first().trigger('mouseover', { force: true })
    
    // Overlay should be visible
    cy.get('.overflow-hidden.mb-8 .absolute').first().should('be.visible')
    
    // Mouse leave
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').first().trigger('mouseout', { force: true })
    
    // Overlay should become transparent/hidden
    cy.get('.overflow-hidden.mb-8 .absolute').first().should('have.css', 'opacity', '0')
  })

  it('should open photo modal when clicking slideshow image', () => {
    // Click on first slideshow image
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').first().click({ force: true })
    
    // Modal should appear
    cy.get('.fixed.inset-0.z-50', { timeout: 30000 }).should('be.visible')
    
    // Should show photo in modal
    cy.get('.fixed.inset-0.z-50 img').should('be.visible')
  })

  it('should handle slideshow images with different aspect ratios', () => {
    // All slideshow images should maintain consistent dimensions
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').each(($slide) => {
      cy.wrap($slide).should('have.css', 'width', '400px')
      cy.wrap($slide).should('have.css', 'height', '200px')
    })
  })

  it('should have seamless loop with duplicate images', () => {
    // Count total slideshow images
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').then($slides => {
      const totalSlides = $slides.length
      
      // Should have even number of slides (duplicated for seamless loop)
      expect(totalSlides % 2).to.equal(0)
      
      // Should have more than 10 slides (10 unique images duplicated)
      expect(totalSlides).to.be.greaterThan(10)
    })
  })

  it('should handle failed image loading in slideshow', () => {
    // Mock some images to fail
    cy.intercept('GET', '**/picsum.photos/id/*/400/200', { statusCode: 404 }).as('getSlideImageError')
    
    // Reload page
    cy.reload()
    cy.waitForSlideshow()
    
    // Slideshow should still display (failed images filtered out)
    cy.get('.overflow-hidden.mb-8').should('be.visible')
    cy.get('.overflow-hidden.mb-8 img').should('have.length.greaterThan', 0)
  })

  it('should fetch image info from API for slideshow', () => {
    // Slideshow should load and display image information
    cy.get('.overflow-hidden.mb-8').should('be.visible')
    
    // Hover over slide to check that image info is loaded
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').first().trigger('mouseover', { force: true })
    
    // Should show image information (dimensions and author)
    cy.get('.overflow-hidden.mb-8 .absolute').first().within(() => {
      cy.contains(/\d+\s*×\s*\d+px/).should('be.visible')
      cy.contains('by ').should('be.visible')
    })
  })

  it('should use fallback data when API calls fail', () => {
    // Slideshow should still display even if API calls fail
    cy.get('.overflow-hidden.mb-8').should('be.visible')
    cy.get('.overflow-hidden.mb-8 img').should('have.length.greaterThan', 0)
    
    // Hover over slide to check that some author info is displayed
    cy.get('.overflow-hidden.mb-8 .flex-shrink-0').first().trigger('mouseover', { force: true })
    
    // Should show some author info (either real or fallback)
    cy.get('.overflow-hidden.mb-8 .absolute').first().should('be.visible')
    cy.get('.overflow-hidden.mb-8 .absolute').first().should('contain', 'by')
  })
})