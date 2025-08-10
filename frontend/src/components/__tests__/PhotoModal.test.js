// eslint-disable-next-line no-unused-vars
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PhotoModal from '../PhotoModal';

const mockPhoto = {
  id: 123,
  author: 'Test Author',
  width: 800,
  height: 600,
  url: 'https://example.com/photo',
  download_url: 'https://example.com/download'
};

describe('PhotoModal', () => {
  let mockOnClose;

  beforeEach(() => {
    mockOnClose = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.style.overflow = 'unset';
  });

  it('renders photo modal with image and info', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    expect(screen.getByAltText('By Test Author')).toBeInTheDocument();
    expect(screen.getByText('#123')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('800 × 600px')).toBeInTheDocument();
  });

  it('closes modal when clicking backdrop', () => {
    const { container } = render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    const backdrop = container.firstChild;
    fireEvent.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when clicking close button', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when pressing Escape key', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close modal when pressing other keys', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Space' });
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('does not close modal when clicking on image container', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    const imageContainer = screen.getByAltText('By Test Author').closest('.relative');
    fireEvent.click(imageContainer);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('sets body overflow to hidden on mount and resets on unmount', () => {
    const { unmount } = render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    expect(document.body.style.overflow).toBe('hidden');
    
    unmount();
    
    expect(document.body.style.overflow).toBe('unset');
  });

  it('displays loading indicator initially', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    expect(screen.getByText('Loading HD...')).toBeInTheDocument();
  });

  it('displays download and Unsplash links', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    const downloadLink = screen.getByText('Download');
    const unsplashLink = screen.getByText('Unsplash');
    
    expect(downloadLink).toHaveAttribute('href', mockPhoto.download_url);
    expect(unsplashLink).toHaveAttribute('href', mockPhoto.url);
    expect(downloadLink).toHaveAttribute('target', '_blank');
    expect(unsplashLink).toHaveAttribute('target', '_blank');
  });

  it('calculates aspect ratio correctly', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    expect(screen.getByText('Ratio: 1.33:1')).toBeInTheDocument();
  });

  it('calculates different aspect ratios correctly', () => {
    const squarePhoto = { ...mockPhoto, width: 500, height: 500 };
    const { rerender } = render(<PhotoModal photo={squarePhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    expect(screen.getByText('Ratio: 1.00:1')).toBeInTheDocument();

    const tallPhoto = { ...mockPhoto, width: 600, height: 800 };
    rerender(<PhotoModal photo={tallPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    expect(screen.getByText('Ratio: 0.75:1')).toBeInTheDocument();
  });

  it('loads HD image on mount and updates state', async () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    // Find the hidden HD image and simulate successful load
    const images = document.querySelectorAll('img');
    const hiddenImage = Array.from(images).find(img => img.className === 'hidden');
    
    act(() => {
      fireEvent.load(hiddenImage);
    });

    // Loading indicator should disappear
    expect(screen.queryByText('Loading HD...')).not.toBeInTheDocument();
  });

  it('handles HD image load error and tries original image', async () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    // Find the hidden HD image and simulate error
    const images = document.querySelectorAll('img');
    const hiddenImage = Array.from(images).find(img => img.className === 'hidden');
    
    act(() => {
      fireEvent.error(hiddenImage);
    });

    // Loading text should change to "Loading Original..."
    expect(screen.getByText('Loading Original...')).toBeInTheDocument();
  });

  it('shows toast and closes modal when original image also fails', async () => {
    // Mock Image to always fail
    const originalImage = global.Image;
    global.Image = class MockImage {
      set src(value) {
        setTimeout(() => this.onerror && this.onerror(), 0);
      }
    };

    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    // Simulate HD image failure to trigger fallback
    const images = document.querySelectorAll('img');
    const hiddenImage = Array.from(images).find(img => img.className === 'hidden');
    
    act(() => {
      fireEvent.error(hiddenImage);
    });

    // Wait for the fallback Image to fail
    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    // Should show toast
    expect(screen.getByText('Failed to load HD image')).toBeInTheDocument();
    
    // Should close modal after 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Restore original Image
    global.Image = originalImage;
  });

  it('successfully loads original image on HD failure', async () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    // Find the hidden HD image and simulate error
    const images = document.querySelectorAll('img');
    const hiddenImage = Array.from(images).find(img => img.className === 'hidden');
    
    act(() => {
      fireEvent.error(hiddenImage);
    });

    // The default Image mock should trigger onload, simulating successful original image load
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    // Loading should complete
    expect(screen.queryByText('Loading Original...')).not.toBeInTheDocument();
  });

  it('prevents event propagation on download link', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    const downloadLink = screen.getByText('Download');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');
    
    fireEvent(downloadLink, clickEvent);
    
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('prevents event propagation on unsplash link', () => {
    render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    const unsplashLink = screen.getByText('Unsplash');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');
    
    fireEvent(unsplashLink, clickEvent);
    
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });


  it('renders with correct CSS classes and styling', () => {
    const { container } = render(<PhotoModal photo={mockPhoto} onClose={mockOnClose} cachedImageUrl="cached-url" />);
    
    // Check main container classes
    const backdrop = container.firstChild;
    expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-90', 'flex', 'items-center', 'justify-center', 'z-50');
    
    // Check image container classes
    const imageContainer = container.querySelector('.relative.max-w-\\[95vw\\].max-h-\\[95vh\\]');
    expect(imageContainer).toBeInTheDocument();
  });
});