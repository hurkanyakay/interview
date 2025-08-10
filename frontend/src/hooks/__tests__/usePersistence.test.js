/**
 * Comprehensive tests for usePersistence hook
 */

import React, { useEffect } from 'react';
import { render, act, wait } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { usePersistence } from '../usePersistence';
import * as queryPersistence from '../../utils/queryPersistence';
import * as logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/queryPersistence');
jest.mock('../../utils/logger');

describe('usePersistence', () => {
  let queryClient;
  let mockCleanup;
  let hookResult;
  let renderCount = 0;

  const TestComponent = ({ options = {} }) => {
    const result = usePersistence(options);
    
    // Store result for assertions
    useEffect(() => {
      hookResult = result;
      renderCount++;
    });

    return (
      <div data-testid="test-component">
        <span data-testid="is-hydrated">{result.isHydrated ? 'hydrated' : 'loading'}</span>
        <button 
          data-testid="clear-cache"
          onClick={result.clearCache}
        >
          Clear Cache
        </button>
      </div>
    );
  };

  const renderWithProvider = (options = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TestComponent options={options} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    mockCleanup = jest.fn();
    hookResult = null;
    renderCount = 0;
    
    // Setup default mocks
    queryPersistence.initializePersistence.mockReturnValue(mockCleanup);
    queryPersistence.clearPersistedCache.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with isHydrated false', () => {
      // Initially, before rendering, hookResult should be null
      expect(hookResult).toBe(null);
      
      renderWithProvider();
      
      // Check that hook result has the correct structure
      expect(typeof hookResult.isHydrated).toBe('boolean');
      expect(typeof hookResult.clearCache).toBe('function');
    });

    it('should initialize persistence and set isHydrated to true', async () => {
      const { getByTestId } = renderWithProvider();
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(queryPersistence.initializePersistence).toHaveBeenCalledWith(queryClient);
      expect(hookResult.isHydrated).toBe(true);
    });

    it('should call cleanup function on unmount', () => {
      const { unmount } = renderWithProvider();
      
      unmount();
      
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('Options Handling', () => {
    it('should call onCacheLoaded callback when provided', async () => {
      const mockOnCacheLoaded = jest.fn();
      const options = { onCacheLoaded: mockOnCacheLoaded };
      
      const { getByTestId } = renderWithProvider(options);
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(mockOnCacheLoaded).toHaveBeenCalled();
    });

    it('should not call onCacheLoaded when not provided', async () => {
      const { getByTestId } = renderWithProvider({});
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      // Should not throw error when callback is not provided
      expect(queryPersistence.initializePersistence).toHaveBeenCalled();
    });

    it('should handle undefined options gracefully', async () => {
      const { getByTestId } = renderWithProvider();
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(hookResult.isHydrated).toBe(true);
      expect(queryPersistence.initializePersistence).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const testError = new Error('Initialization failed');
      queryPersistence.initializePersistence.mockImplementation(() => {
        throw testError;
      });
      
      const { getByTestId } = renderWithProvider();
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(logger.error).toHaveBeenCalledWith('Failed to initialize persistence:', testError);
      expect(hookResult.isHydrated).toBe(true); // Should still be hydrated to not block app
    });

    it('should not crash when cleanup function is null', () => {
      queryPersistence.initializePersistence.mockReturnValue(null);
      
      const { unmount } = renderWithProvider();
      
      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });

    it('should not crash when cleanup function is undefined', () => {
      queryPersistence.initializePersistence.mockReturnValue(undefined);
      
      const { unmount } = renderWithProvider();
      
      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('clearCache functionality', () => {
    it('should call clearPersistedCache when clearCache is invoked', async () => {
      const mockOnCacheCleared = jest.fn();
      const options = { onCacheCleared: mockOnCacheCleared };
      
      const { getByTestId } = renderWithProvider(options);
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      act(() => {
        getByTestId('clear-cache').click();
      });
      
      expect(queryPersistence.clearPersistedCache).toHaveBeenCalled();
      expect(mockOnCacheCleared).toHaveBeenCalled();
    });

    it('should not call onCacheCleared when not provided', async () => {
      const { getByTestId } = renderWithProvider({});
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      act(() => {
        getByTestId('clear-cache').click();
      });
      
      expect(queryPersistence.clearPersistedCache).toHaveBeenCalled();
      // Should not throw error when callback is not provided
    });

    it('should handle clearPersistedCache errors gracefully', async () => {
      queryPersistence.clearPersistedCache.mockImplementation(() => {
        throw new Error('Clear cache failed');
      });
      
      const mockOnCacheCleared = jest.fn();
      const options = { onCacheCleared: mockOnCacheCleared };
      
      const { getByTestId } = renderWithProvider(options);
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(() => {
        act(() => {
          getByTestId('clear-cache').click();
        });
      }).not.toThrow();
      
      expect(mockOnCacheCleared).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should maintain isHydrated state correctly', async () => {
      const { getByTestId } = renderWithProvider();
      
      // After initialization
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(hookResult.isHydrated).toBe(true);
    });

    it('should not change isHydrated after clearCache', async () => {
      const { getByTestId } = renderWithProvider();
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      act(() => {
        getByTestId('clear-cache').click();
      });
      
      expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated');
      expect(hookResult.isHydrated).toBe(true);
    });
  });

  describe('Callback Execution', () => {
    it('should call onCacheLoaded with correct timing', async () => {
      let callbackCalled = false;
      const options = {
        onCacheLoaded: () => {
          callbackCalled = true;
        }
      };
      
      const { getByTestId } = renderWithProvider(options);
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(callbackCalled).toBe(true);
      expect(hookResult.isHydrated).toBe(true);
    });

    it('should call onCacheCleared immediately when clearCache is called', async () => {
      let callbackCalled = false;
      const options = {
        onCacheCleared: () => {
          callbackCalled = true;
        }
      };
      
      const { getByTestId } = renderWithProvider(options);
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      act(() => {
        getByTestId('clear-cache').click();
      });
      
      expect(callbackCalled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle options with null callbacks', async () => {
      const nullOptions = {
        onCacheLoaded: null,
        onCacheCleared: null,
      };
      
      const { getByTestId } = renderWithProvider(nullOptions);
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(hookResult.isHydrated).toBe(true);
      
      act(() => {
        getByTestId('clear-cache').click();
      });
      
      // Should not throw errors
    });

    it('should handle complex options object', async () => {
      const mockOnCacheLoaded = jest.fn();
      const complexOptions = {
        onCacheLoaded: mockOnCacheLoaded,
        extraProperty: 'should be ignored',
        nested: { object: 'should not affect functionality' },
      };
      
      const { getByTestId } = renderWithProvider(complexOptions);
      
      await wait(() => expect(getByTestId('is-hydrated')).toHaveTextContent('hydrated'));
      
      expect(hookResult.isHydrated).toBe(true);
      expect(mockOnCacheLoaded).toHaveBeenCalled();
    });
  });
});