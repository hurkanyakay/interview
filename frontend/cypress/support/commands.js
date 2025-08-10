// Custom commands for the photo gallery app

// Command to wait for images to load
Cypress.Commands.add('waitForImagesLoad', (timeout = 30000) => {
  cy.get('img', { timeout }).should('be.visible').and(($img) => {
    // Natural width greater than 0 means image loaded successfully
    expect($img[0].naturalWidth).to.be.greaterThan(0)
  })
})

// Command to wait for photo gallery to load
Cypress.Commands.add('waitForPhotoGallery', () => {
  cy.get('.container.mx-auto', { timeout: 45000 }).should('be.visible')
  cy.get('.flex.gap-4.items-start', { timeout: 45000 }).should('be.visible')
  cy.get('.container img', { timeout: 60000 }).should('have.length.greaterThan', 5)
})

// Command to wait for slideshow to load
Cypress.Commands.add('waitForSlideshow', () => {
  cy.get('.overflow-hidden.mb-8', { timeout: 60000 }).should('be.visible')
  cy.get('.overflow-hidden.mb-8 img', { timeout: 60000 }).should('have.length.greaterThan', 0)
})

// Command to intercept photo API calls
Cypress.Commands.add('interceptPhotoAPI', () => {
  // Intercept the photo list API
  cy.intercept('GET', '**/picsum.photos/v2/list**', { fixture: 'photos.json' }).as('getPhotos')
  
  // Intercept individual photo info API
  cy.intercept('GET', '**/picsum.photos/id/*/info', { fixture: 'photo-info.json' }).as('getPhotoInfo')
})

// Command to mock photo API with error response
Cypress.Commands.add('interceptPhotoAPIWithError', () => {
  cy.intercept('GET', '**/picsum.photos/v2/list**', { statusCode: 500 }).as('getPhotosError')
})

// Command to test responsive behavior
Cypress.Commands.add('testResponsive', (sizes) => {
  sizes.forEach(size => {
    if (Array.isArray(size)) {
      cy.viewport(size[0], size[1])
    } else {
      cy.viewport(size)
    }
    cy.wait(500) // Allow layout to settle
  })
})