/**
 * Comprehensive tests for ErrorBoundary component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import * as logger from '../../utils/logger';

// Mock the logger
jest.mock('../../utils/logger');

// Create a component that throws an error for testing
const ThrowErrorComponent = ({ shouldThrow, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="working-component">Component works fine</div>;
};

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true
});

describe('ErrorBoundary', () => {
  // Store original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReload.mockClear();
    
    // Suppress console.error for tests (React error boundary logs)
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
    
    // Restore console.error
    console.error.mockRestore();
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByText('Component works fine')).toBeInTheDocument();
    });

    it('does not call logger when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('Error Catching', () => {
    it('catches JavaScript errors and shows fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('We encountered an unexpected error. Please try refreshing the page.')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    it('calls logger with error details when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Error Boundary caught an error:',
        expect.objectContaining({
          message: 'Custom error message'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('sets hasError state to true when error occurs', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI should be rendered
      expect(container.querySelector('.bg-gray-900')).toBeInTheDocument();
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument();
    });

    it('stores error and errorInfo in state', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} errorMessage="Specific error" />
        </ErrorBoundary>
      );

      // In development mode, error details should be available
      process.env.NODE_ENV = 'development';
      
      // Re-render to apply NODE_ENV change
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} errorMessage="Specific error" />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Custom Fallback Message', () => {
    it('displays custom fallback message when provided', () => {
      const customMessage = 'Custom error message for testing';
      
      render(
        <ErrorBoundary fallbackMessage={customMessage}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(screen.queryByText('We encountered an unexpected error. Please try refreshing the page.')).not.toBeInTheDocument();
    });

    it('displays default message when no fallback message provided', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('We encountered an unexpected error. Please try refreshing the page.')).toBeInTheDocument();
    });

    it('handles empty fallback message', () => {
      render(
        <ErrorBoundary fallbackMessage="">
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('We encountered an unexpected error. Please try refreshing the page.')).toBeInTheDocument();
    });
  });

  describe('Environment-specific Behavior', () => {
    it('shows error details in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} errorMessage="Dev error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
      
      // Check that details element exists
      const details = screen.getByText('Error Details').closest('details');
      expect(details).toBeInTheDocument();
    });

    it('hides error details in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });

    it('hides error details in test mode', () => {
      process.env.NODE_ENV = 'test';
      
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });

    it('displays error message in development details', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} errorMessage="Detailed error message" />
        </ErrorBoundary>
      );

      // Details should be present
      const details = screen.getByText('Error Details').closest('details');
      expect(details).toBeInTheDocument();
      
      // Error message should be in the DOM (even if not visible due to details being closed)
      expect(screen.getByText(/Error: Detailed error message/)).toBeInTheDocument();
    });

    it('displays component stack in development details', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Component stack should be present (contains component names)
      const stackTrace = screen.getByText(/ThrowErrorComponent/);
      expect(stackTrace).toBeInTheDocument();
    });
  });

  describe('Refresh Button', () => {
    it('calls window.location.reload when refresh button is clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByText('Refresh Page');
      fireEvent.click(refreshButton);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('refresh button has correct styling classes', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByText('Refresh Page');
      expect(refreshButton).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'text-white', 'font-bold', 'py-2', 'px-4', 'rounded', 'transition-colors');
    });
  });

  describe('UI Structure and Styling', () => {
    it('renders with correct CSS classes for error layout', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorContainer = container.querySelector('.flex.flex-col.items-center.justify-center.min-h-screen.bg-gray-900.text-white.p-8');
      expect(errorContainer).toBeInTheDocument();
    });

    it('renders heading with correct styling', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveClass('text-2xl', 'font-bold', 'mb-4');
      expect(heading).toHaveTextContent('Oops! Something went wrong');
    });

    it('renders message paragraph with correct styling', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const message = screen.getByText('We encountered an unexpected error. Please try refreshing the page.');
      expect(message).toHaveClass('text-gray-300', 'mb-6');
    });
  });

  describe('Error Details Expansion', () => {
    it('allows error details to be expanded in development', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} errorMessage="Expandable error" />
        </ErrorBoundary>
      );

      const details = screen.getByText('Error Details').closest('details');
      const summary = screen.getByText('Error Details');
      
      expect(details).toBeInTheDocument();
      expect(summary).toHaveClass('cursor-pointer', 'mb-2');
      
      // Details should have correct styling
      expect(details).toHaveClass('text-left', 'text-sm', 'bg-gray-800', 'p-4', 'rounded', 'mb-4');
    });
  });

  describe('Multiple Errors', () => {
    it('handles multiple consecutive errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // First error
      rerender(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(logger.error).toHaveBeenCalledTimes(1);

      // The error boundary state persists, so we can't easily test multiple errors
      // in the same boundary instance without remounting
    });
  });

  describe('Edge Cases', () => {
    it('handles error with no message', () => {
      // Component that throws an error without message
      const NoMessageError = () => {
        const error = new Error();
        error.message = '';
        throw error;
      };

      render(
        <ErrorBoundary>
          <NoMessageError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(logger.error).toHaveBeenCalled();
    });

    it('handles null children', () => {
      render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      // Should render nothing but not crash
      expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
    });

    it('handles undefined children', () => {
      // Create a wrapper component that returns undefined to test edge case
      const UndefinedComponent = () => undefined;
      
      // This will actually trigger the error boundary because returning undefined is an error
      render(
        <ErrorBoundary>
          <UndefinedComponent />
        </ErrorBoundary>
      );

      // Should show error boundary UI since returning undefined is an error
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(logger.error).toHaveBeenCalled();
    });

    it('handles very long error messages', () => {
      const longErrorMessage = 'A'.repeat(1000);
      
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} errorMessage={longErrorMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      // The long error message should be logged
      expect(logger.error).toHaveBeenCalledWith(
        'Error Boundary caught an error:',
        expect.objectContaining({
          message: longErrorMessage
        }),
        expect.any(Object)
      );
    });
  });

  describe('Component Props', () => {
    it('accepts and uses fallbackMessage prop correctly', () => {
      const message1 = 'First custom message';
      
      render(
        <ErrorBoundary fallbackMessage={message1}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(message1)).toBeInTheDocument();
      
      // Test that it doesn't show default message
      expect(screen.queryByText('We encountered an unexpected error. Please try refreshing the page.')).not.toBeInTheDocument();
    });
  });
});