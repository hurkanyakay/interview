import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Toast from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders toast with message', () => {
    const mockOnClose = jest.fn();
    render(<Toast message="Test message" onClose={mockOnClose} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders error toast by default', () => {
    const mockOnClose = jest.fn();
    const { container } = render(<Toast message="Error message" onClose={mockOnClose} />);
    
    const toastElement = container.querySelector('.bg-red-600');
    expect(toastElement).toBeInTheDocument();
  });

  it('renders success toast when type is not error', () => {
    const mockOnClose = jest.fn();
    const { container } = render(<Toast message="Success message" type="success" onClose={mockOnClose} />);
    
    const toastElement = container.querySelector('.bg-green-600');
    expect(toastElement).toBeInTheDocument();
  });

  it('calls onClose after duration', () => {
    const mockOnClose = jest.fn();
    render(<Toast message="Test message" onClose={mockOnClose} duration={2000} />);
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('uses default duration of 3000ms when not specified', () => {
    const mockOnClose = jest.fn();
    render(<Toast message="Test message" onClose={mockOnClose} />);
    
    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(mockOnClose).not.toHaveBeenCalled();
    
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays error icon for error type', () => {
    const mockOnClose = jest.fn();
    const { container } = render(<Toast message="Error" type="error" onClose={mockOnClose} />);
    
    const errorIcon = container.querySelector('svg path[d*="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"]');
    expect(errorIcon).toBeInTheDocument();
  });

  it('displays success icon for non-error type', () => {
    const mockOnClose = jest.fn();
    const { container } = render(<Toast message="Success" type="success" onClose={mockOnClose} />);
    
    const successIcon = container.querySelector('svg path[d*="M5 13l4 4L19 7"]');
    expect(successIcon).toBeInTheDocument();
  });

  it('has proper positioning classes', () => {
    const mockOnClose = jest.fn();
    const { container } = render(<Toast message="Test" onClose={mockOnClose} />);
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('fixed', 'top-4', 'right-4', 'z-50', 'animate-bounce');
  });

  it('cleans up timer on unmount', () => {
    const mockOnClose = jest.fn();
    const { unmount } = render(<Toast message="Test" onClose={mockOnClose} />);
    
    unmount();
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});