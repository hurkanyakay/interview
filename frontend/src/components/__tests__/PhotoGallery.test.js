// eslint-disable-next-line no-unused-vars
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PhotoGallery from '../PhotoGallery';
import * as photoService from '../../services/photoService';
import * as usePhotos from '../../hooks/usePhotos';
import { renderWithQuery, createMockInfiniteQueryResult, createMockQueryError } from '../../testUtils/queryTestUtils';

// Mock the service and hooks
jest.mock('../../services/photoService');
jest.mock('../../hooks/usePhotos');

// Mock child components
jest.mock('../PhotoModal', () => {
  return function MockPhotoModal({ photo, onClose }) {
    return (
      <div data-testid="photo-modal">
        <button onClick={onClose}>Close Modal</button>
        <span>Photo #{photo.id}</span>
      </div>
    );
  };
});

jest.mock('../LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

jest.mock('../AutoSlideshow', () => {
  return function MockAutoSlideshow({ onImageClick }) {
    return (
      <div data-testid="auto-slideshow">
        <button onClick={() => onImageClick({ id: 999, author: 'Slideshow Author' })}>
          Slideshow Image
        </button>
      </div>
    );
  };
});

const mockPhotos = [
  { id: 1, author: 'Author 1', width: 800, height: 600 },
  { id: 2, author: 'Author 2', width: 1200, height: 800 },
  { id: 3, author: 'Author 3', width: 600, height: 900 }
];

describe('PhotoGallery', () => {
  beforeEach(() => {
    photoService.fetchPhotos.mockClear();
    usePhotos.useInfinitePhotos.mockClear();
    usePhotos.usePrefetchImages.mockClear();
    usePhotos.usePhotoMutations.mockReturnValue({
      prefetchNextPage: jest.fn()
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
  });

  afterEach(() => {
    window.removeEventListener('scroll', jest.fn());
    window.removeEventListener('resize', jest.fn());
  });

  it('loads photos on initial render', () => {
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockInfiniteQueryResult([mockPhotos])
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });
    
    renderWithQuery(<PhotoGallery />);
    expect(usePhotos.useInfinitePhotos).toHaveBeenCalledWith(20);
  });

  it('shows loading spinner initially', () => {
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockInfiniteQueryResult([], { isLoading: true })
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });
    
    renderWithQuery(<PhotoGallery />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockQueryError('Network error')
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });

    renderWithQuery(<PhotoGallery />);

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders AutoSlideshow component', () => {
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockInfiniteQueryResult([mockPhotos])
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });
    
    renderWithQuery(<PhotoGallery />);
    expect(screen.getByTestId('auto-slideshow')).toBeInTheDocument();
  });

  it('opens modal from slideshow image click', () => {
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockInfiniteQueryResult([mockPhotos])
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });
    
    renderWithQuery(<PhotoGallery />);

    const slideshowButton = screen.getByText('Slideshow Image');
    fireEvent.click(slideshowButton);

    expect(screen.getByTestId('photo-modal')).toBeInTheDocument();
    expect(screen.getByText('Photo #999')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockInfiniteQueryResult([mockPhotos])
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });
    
    renderWithQuery(<PhotoGallery />);

    // Open modal
    const slideshowButton = screen.getByText('Slideshow Image');
    fireEvent.click(slideshowButton);

    // Close modal
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('photo-modal')).not.toBeInTheDocument();
  });

  it('handles window resize', () => {
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockInfiniteQueryResult([mockPhotos])
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });
    
    renderWithQuery(<PhotoGallery />);

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', { value: 500 });
    
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // Component should still be functional
    expect(screen.getByTestId('auto-slideshow')).toBeInTheDocument();
  });

  it('loads more photos on scroll near bottom', async () => {
    const mockFetchNextPage = jest.fn();
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockInfiniteQueryResult([mockPhotos], {
        hasNextPage: true,
        fetchNextPage: mockFetchNextPage
      })
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });

    renderWithQuery(<PhotoGallery />);

    // Mock scroll to bottom
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 1000, configurable: true });
    Object.defineProperty(document.documentElement, 'offsetHeight', { value: 1800, configurable: true });

    act(() => {
      fireEvent.scroll(window);
    });

    // Should call fetchNextPage
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('retries loading photos when retry button is clicked', async () => {
    const mockRefetch = jest.fn();
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockQueryError('Network error', { refetch: mockRefetch })
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });

    renderWithQuery(<PhotoGallery />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles timeout errors specifically', async () => {
    usePhotos.useInfinitePhotos.mockReturnValue(
      createMockQueryError('Request timeout')
    );
    usePhotos.usePrefetchImages.mockReturnValue({ prefetch: jest.fn() });

    renderWithQuery(<PhotoGallery />);

    expect(screen.getByText('Request timeout')).toBeInTheDocument();
  });
});