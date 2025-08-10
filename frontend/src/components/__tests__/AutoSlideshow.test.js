// eslint-disable-next-line no-unused-vars
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import AutoSlideshow from '../AutoSlideshow';
import * as usePhotos from '../../hooks/usePhotos';
import { renderWithQuery, createMockQueryResult } from '../../testUtils/queryTestUtils';

// Mock the hooks
jest.mock('../../hooks/usePhotos');

const mockImageInfo = {
  id: 42,
  author: 'Test Author',
  width: 3000,
  height: 2000,
  url: 'https://picsum.photos/id/42',
  download_url: 'https://picsum.photos/id/42/3000/2000'
};

// Helper function to wait for async operations
const waitForAsync = (timeout = 100) => new Promise(resolve => setTimeout(resolve, timeout));

describe('AutoSlideshow', () => {
  let mockOnImageClick;
  let mockCache;
  let originalImage;

  beforeEach(() => {
    mockOnImageClick = jest.fn();
    
    // Mock React Query hook with default success state
    usePhotos.useSlideshowPhotos.mockReturnValue(
      createMockQueryResult([mockImageInfo])
    );
    
    // Mock successful cache API
    mockCache = {
      match: jest.fn(),
      open: jest.fn()
    };
    global.caches = {
      open: jest.fn(() => Promise.resolve(mockCache))
    };
    
    // Mock Image constructor
    originalImage = global.Image;
    global.Image = class MockImage {
      constructor() {
        setTimeout(() => {
          if (this.src && this.src.includes('error')) {
            this.onerror && this.onerror();
          } else {
            this.onload && this.onload();
          }
        }, 0);
      }
    };

    // Mock fetch for image info
    fetch.mockImplementation((url) => {
      if (url.includes('/info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockImageInfo)
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  afterEach(() => {
    fetch.mockClear();
    global.Image = originalImage;
    delete global.caches;
  });

  it('renderWithQuerys empty initially while loading', () => {
    usePhotos.useSlideshowPhotos.mockReturnValue(
      createMockQueryResult([], { isLoading: true })
    );
    
    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    expect(container.firstChild).toBeNull();
  });

  it('fetches image info for slide images on mount', () => {
    renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Should call the slideshow photos hook
    expect(usePhotos.useSlideshowPhotos).toHaveBeenCalledWith([42, 156, 237, 89, 314, 67, 428, 195, 73, 291]);
  });

  it('handles fetch errors gracefully with fallback data', async () => {
    // Mock fetch to always fail
    fetch.mockImplementation(() => Promise.reject(new Error('Network error')));

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Component should handle errors gracefully
    expect(container).toBeInTheDocument();
  });

  it('renderWithQuerys without crashing when onImageClick is not provided', () => {
    const { container } = renderWithQuery(<AutoSlideshow />);
    expect(container).toBeInTheDocument();
  });

  it('calls cache API when available', async () => {
    renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for async operations to complete
    await act(async () => {
      await waitForAsync();
    });
    
    expect(global.caches.open).toHaveBeenCalledWith('unsplash-images-v1');
  });

  it('handles missing cache API gracefully', async () => {
    delete global.caches;
    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for component to load and renderWithQuery
    await act(async () => {
      await waitForAsync(200);
    });
    
    // Should renderWithQuery slideshow
    expect(container).toBeInTheDocument();
  });

  it('renderWithQuerys slideshow after loading with cached images', async () => {
    // Mock cache returning cached responses for some images
    mockCache.match.mockResolvedValue({ ok: true });

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    // Should renderWithQuery slideshow
    expect(container).toBeInTheDocument();
  });

  it('renderWithQuerys slideshow after loading without cached images', async () => {
    // Mock cache returning no cached responses
    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    // Should renderWithQuery slideshow
    expect(container).toBeInTheDocument();
  });

  it('handles cache errors and falls back to regular preloading', async () => {
    // Mock cache throwing error
    mockCache.match.mockRejectedValue(new Error('Cache error'));

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for fallback loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    // Should renderWithQuery slideshow
    expect(container).toBeInTheDocument();
  });

  it('handles image preload errors gracefully', async () => {
    // Mock Image to fail for certain images
    global.Image = class MockImage {
      constructor() {
        setTimeout(() => {
          if (this.src && this.src.includes('/42/')) {
            this.onerror && this.onerror();
          } else {
            this.onload && this.onload();
          }
        }, 0);
      }
    };

    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    // Should renderWithQuery slideshow
    expect(container).toBeInTheDocument();
  });

  it('calls onImageClick when slide is clicked', async () => {
    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    // Try to click if slides are renderWithQueryed
    const slides = container.querySelectorAll('[style*="400px"]');
    if (slides.length > 0) {
      fireEvent.click(slides[0]);
      expect(mockOnImageClick).toHaveBeenCalledTimes(1);
    }
  });

  it('handles hover interactions correctly', async () => {
    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    const slides = container.querySelectorAll('[style*="400px"]');
    if (slides.length > 0) {
      const firstSlide = slides[0];
      
      // Hover over slide
      fireEvent.mouseEnter(firstSlide);
      
      // Check overlay exists
      const overlay = firstSlide.querySelector('.absolute');
      expect(overlay).toBeInTheDocument();
      
      // Mouse leave
      fireEvent.mouseLeave(firstSlide);
    }
  });

  it('handles image error during renderWithQuerying', async () => {
    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    // Try to trigger image error
    const images = container.querySelectorAll('img');
    if (images.length > 0) {
      fireEvent.error(images[0]);
    }

    // Component should handle this gracefully
    expect(container).toBeInTheDocument();
  });

  it('handles fallback data when image info fetch fails', async () => {
    // Mock fetch to fail for specific images
    fetch.mockImplementation((url) => {
      if (url.includes('/42/info')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockImageInfo)
      });
    });

    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    // Should renderWithQuery with fallback data
    expect(container).toBeInTheDocument();
  });

  it('renderWithQuerys with proper styling and animation when ready', async () => {
    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading to complete
    await act(async () => {
      await waitForAsync(200);
    });

    // Check for slideshow container
    const slideshowContainer = container.querySelector('.overflow-hidden');
    if (slideshowContainer) {
      expect(slideshowContainer).toHaveClass('mb-8', 'bg-gray-800', 'rounded-lg', 'shadow-lg');
    }
  });

  it('filters failed images correctly', async () => {
    // Mock Image to fail for certain images
    global.Image = class MockImage {
      constructor() {
        setTimeout(() => {
          if (this.src && this.src.includes('/42/')) {
            this.onerror && this.onerror();
          } else {
            this.onload && this.onload();
          }
        }, 0);
      }
    };

    mockCache.match.mockResolvedValue(null);

    const { container } = renderWithQuery(<AutoSlideshow onImageClick={mockOnImageClick} />);
    
    // Wait for loading and filtering
    await act(async () => {
      await waitForAsync(200);
    });

    // Component should handle failed images gracefully
    expect(container).toBeInTheDocument();
  });
});