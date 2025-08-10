// eslint-disable-next-line no-unused-vars
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock PhotoGallery component
jest.mock('./components/PhotoGallery', () => {
  return function MockPhotoGallery() {
    return <div data-testid="photo-gallery">Photo Gallery</div>;
  };
});

describe('App', () => {
  it('renders header with correct title', () => {
    render(<App />);
    
    expect(screen.getByText('Best of Unsplash')).toBeInTheDocument();
  });

  it('sets document title on mount', () => {
    render(<App />);
    
    expect(document.title).toBe('Best of Unsplash');
  });

  it('renders PhotoGallery component', () => {
    render(<App />);
    
    expect(screen.getByTestId('photo-gallery')).toBeInTheDocument();
  });

  it('renders footer with copyright', () => {
    render(<App />);
    
    expect(screen.getByText('© 2024 Best of Unsplash Gallery.')).toBeInTheDocument();
  });

  it('has proper layout structure', () => {
    const { container } = render(<App />);
    
    // Check for main layout containers
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(container.querySelector('footer')).toBeInTheDocument();
  });

  it('has background blur element', () => {
    const { container } = render(<App />);
    
    const backgroundDiv = container.querySelector('.fixed.inset-0.z-0');
    expect(backgroundDiv).toBeInTheDocument();
    expect(backgroundDiv).toHaveAttribute('style');
  });

  it('applies correct CSS classes for responsive design', () => {
    const { container } = render(<App />);
    
    const headerContainer = container.querySelector('.max-w-7xl');
    expect(headerContainer).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
  });
});