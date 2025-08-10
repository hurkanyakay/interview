/**
 * Comprehensive tests for queryPersistence.js
 */

import {
  serialize,
  deserialize,
  saveToStorage,
  loadFromStorage,
  throttledSave,
  initializePersistence,
  clearPersistedCache
} from '../queryPersistence';
import * as logger from '../logger';

// Mock logger functions
jest.mock('../logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
  keys: jest.fn(() => [])
};

// Ensure Object.keys picks up enumerable props on the mock

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true
});

// Constants from the module
const CACHE_KEY = 'photo-gallery-cache';
const CACHE_VERSION = '1.0.0';
const MAX_CACHE_SIZE = 50 * 1024 * 1024;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

describe('queryPersistence', () => {
  let mockQueryClient;
  let mockQueryCache;
  let mockQueries;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Date.now for consistent timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // Fixed timestamp
    
    // Mock query data
    mockQueries = [
      {
        queryKey: ['photos', { page: 1, limit: 20 }],
        state: {
          status: 'success',
          data: [{ id: 1, title: 'Photo 1' }],
          dataUpdateCount: 1,
          dataUpdatedAt: 1640995200000,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          isInvalidated: false,
          fetchStatus: 'idle'
        }
      },
      {
        queryKey: ['photoInfo', '123'],
        state: {
          status: 'success',
          data: { id: '123', title: 'Photo 123' },
          dataUpdateCount: 1,
          dataUpdatedAt: 1640995199000,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          isInvalidated: false,
          fetchStatus: 'idle'
        }
      },
      {
        queryKey: ['prefetchedImage', 'url1'],
        state: {
          status: 'success',
          data: 'cached-image-data',
          dataUpdateCount: 1,
          dataUpdatedAt: 1640995200000,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          isInvalidated: false,
          fetchStatus: 'idle'
        }
      },
      {
        queryKey: ['photos', { page: 2, limit: 20 }],
        state: {
          status: 'error',
          error: new Error('Network error'),
          dataUpdateCount: 0,
          dataUpdatedAt: 0,
          errorUpdateCount: 1,
          errorUpdatedAt: 1640995200000,
          fetchFailureCount: 1,
          isInvalidated: false,
          fetchStatus: 'idle'
        }
      }
    ];

    mockQueryCache = {
      getAll: jest.fn(() => mockQueries),
      subscribe: jest.fn(() => jest.fn()) // Return unsubscribe function
    };

    mockQueryClient = {
      getQueryCache: jest.fn(() => mockQueryCache),
      setQueryData: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('serialize', () => {
    it('should serialize query client cache correctly', () => {
      const result = serialize(mockQueryClient);

      expect(result).toEqual({
        version: CACHE_VERSION,
        timestamp: 1640995200000,
        queries: {
          '["photos",{"page":1,"limit":20}]': {
            data: [{ id: 1, title: 'Photo 1' }],
            dataUpdateCount: 1,
            dataUpdatedAt: 1640995200000,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            isInvalidated: false,
            status: 'success',
            fetchStatus: 'idle'
          },
          '["photoInfo","123"]': {
            data: { id: '123', title: 'Photo 123' },
            dataUpdateCount: 1,
            dataUpdatedAt: 1640995199000,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            isInvalidated: false,
            status: 'success',
            fetchStatus: 'idle'
          }
        }
      });
    });

    it('should only persist successful queries with data', () => {
      const result = serialize(mockQueryClient);

      // Should not include error queries or queries without data
      expect(result.queries).not.toHaveProperty('["photos",{"page":2,"limit":20}]');
    });

    it('should not persist non-persistable query types', () => {
      const result = serialize(mockQueryClient);

      // Should not include prefetchedImage queries
      expect(result.queries).not.toHaveProperty('["prefetchedImage","url1"]');
    });

    it('should handle query with no persistable queries', () => {
      mockQueries = [
        {
          queryKey: ['prefetchedImage', 'url1'],
          state: {
            status: 'success',
            data: 'cached-image-data'
          }
        },
        {
          queryKey: ['realtime', 'data'],
          state: {
            status: 'success',
            data: 'realtime-data'
          }
        }
      ];

      mockQueryCache.getAll.mockReturnValue(mockQueries);

      const result = serialize(mockQueryClient);

      expect(result.queries).toEqual({});
    });

    it('should handle empty query cache', () => {
      mockQueryCache.getAll.mockReturnValue([]);

      const result = serialize(mockQueryClient);

      expect(result).toEqual({
        version: CACHE_VERSION,
        timestamp: 1640995200000,
        queries: {}
      });
    });

    it('should handle queries with different statuses', () => {
      mockQueries = [
        {
          queryKey: ['photos', { page: 1 }],
          state: {
            status: 'loading',
            data: undefined
          }
        },
        {
          queryKey: ['photos', { page: 2 }],
          state: {
            status: 'success',
            data: null
          }
        },
        {
          queryKey: ['photos', { page: 3 }],
          state: {
            status: 'success',
            data: [{ id: 3 }],
            dataUpdateCount: 1,
            dataUpdatedAt: Date.now(),
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            isInvalidated: false,
            fetchStatus: 'idle'
          }
        }
      ];

      mockQueryCache.getAll.mockReturnValue(mockQueries);

      const result = serialize(mockQueryClient);

      // Only the successful query with data should be persisted
      expect(Object.keys(result.queries)).toHaveLength(1);
      expect(result.queries).toHaveProperty('["photos",{"page":3}]');
    });
  });

  describe('deserialize', () => {
    const validCachedData = {
      version: CACHE_VERSION,
      timestamp: Date.now() - 1000, // Recent timestamp
      queries: {
        '["photos",{"page":1,"limit":20}]': {
          data: [{ id: 1, title: 'Photo 1' }],
          dataUpdateCount: 1,
          dataUpdatedAt: Date.now() - 1000,
          status: 'success'
        },
        '["photoInfo","123"]': {
          data: { id: '123', title: 'Photo 123' },
          dataUpdateCount: 1,
          dataUpdatedAt: Date.now() - 2000,
          status: 'success'
        }
      }
    };

    it('should deserialize valid cached data correctly', () => {
      const result = deserialize(validCachedData);

      expect(result).toEqual({
        queries: [
          {
            queryKey: ['photos', { page: 1, limit: 20 }],
            queryHash: '["photos",{"page":1,"limit":20}]',
            state: validCachedData.queries['["photos",{"page":1,"limit":20}]']
          },
          {
            queryKey: ['photoInfo', '123'],
            queryHash: '["photoInfo","123"]',
            state: validCachedData.queries['["photoInfo","123"]']
          }
        ]
      });
    });

    it('should return undefined for null/undefined cached data', () => {
      expect(deserialize(null)).toBeUndefined();
      expect(deserialize(undefined)).toBeUndefined();
    });

    it('should return undefined for wrong version', () => {
      const wrongVersionData = {
        ...validCachedData,
        version: '0.9.0'
      };

      expect(deserialize(wrongVersionData)).toBeUndefined();
    });

    it('should return undefined for expired cache', () => {
      const expiredData = {
        ...validCachedData,
        timestamp: Date.now() - CACHE_EXPIRY - 1000 // Expired
      };

      expect(deserialize(expiredData)).toBeUndefined();
    });

    it('should handle empty queries object', () => {
      const emptyData = {
        version: CACHE_VERSION,
        timestamp: Date.now() - 1000,
        queries: {}
      };

      const result = deserialize(emptyData);

      expect(result).toEqual({
        queries: []
      });
    });

    it('should handle malformed query keys', () => {
      const malformedData = {
        version: CACHE_VERSION,
        timestamp: Date.now() - 1000,
        queries: {
          'invalid-json': {
            data: 'some-data',
            status: 'success'
          },
          '["valid","key"]': {
            data: 'valid-data',
            status: 'success'
          }
        }
      };

      // This should throw during JSON.parse, but let's handle gracefully
      expect(() => deserialize(malformedData)).toThrow();
    });
  });

  describe('saveToStorage', () => {
    const testData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      queries: {
        '["photos",{"page":1}]': {
          data: [{ id: 1 }],
          status: 'success'
        }
      }
    };

    it('should save data to localStorage successfully', () => {
      saveToStorage(testData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        CACHE_KEY,
        JSON.stringify(testData)
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache saved:')
      );
    });

    it('should handle large cache by performing cleanup', () => {
      const largeData = {
        ...testData,
        queries: {}
      };

      // Create a large data object
      for (let i = 0; i < 1000; i++) {
        largeData.queries[`["photos",{"page":${i}}]`] = {
          data: new Array(1000).fill({ id: i, data: 'x'.repeat(100) }),
          status: 'success',
          dataUpdatedAt: Date.now() - i * 1000
        };
      }

      saveToStorage(largeData);

      expect(logger.warn).toHaveBeenCalledWith('Cache size exceeds limit, performing cleanup');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle localStorage errors with retry', async () => {
      const error = new Error('QuotaExceededError');
      
      // First call throws, second succeeds
      localStorageMock.setItem
        .mockImplementationOnce(() => { throw error; })
        .mockImplementationOnce(() => {});

      // Mock Object.keys to return empty array for cleanup
      Object.defineProperty(localStorage, 'keys', {
        value: jest.fn(() => []),
        configurable: true
      });

      saveToStorage(testData);

      expect(logger.warn).toHaveBeenCalledWith('Failed to save cache to localStorage:', error);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2); // Initial attempt + retry
    });

    it('should handle persistent localStorage errors', () => {
      const storageError = new Error('Persistent storage error');
      
      // Mock localStorage setItem to always throw
      localStorageMock.setItem.mockImplementation(() => { 
        throw storageError; 
      });

      // This test verifies the error handling flow exists
      expect(() => saveToStorage(testData)).not.toThrow();
      
      // Verify warn was called for the first error
      expect(logger.warn).toHaveBeenCalledWith('Failed to save cache to localStorage:', storageError);
    });

    it('should clean up storage during retry', () => {
      const error = new Error('QuotaExceededError');
      
      localStorageMock.setItem
        .mockImplementationOnce(() => { throw error; })
        .mockImplementationOnce(() => {});

      // Simulate old keys existing in localStorage by defining enumerable props
      localStorageMock['photo-gallery-cache-old-1'] = 'x';
      localStorageMock['photo-gallery-cache-old-2'] = 'y';
      localStorageMock['other-key'] = 'z';

      saveToStorage(testData);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('photo-gallery-cache-old-1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('photo-gallery-cache-old-2');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other-key');
      
      // Cleanup simulated keys
      delete localStorageMock['photo-gallery-cache-old-1'];
      delete localStorageMock['photo-gallery-cache-old-2'];
      delete localStorageMock['other-key'];
    });
  });

  describe('loadFromStorage', () => {
    it('should load and parse data from localStorage', () => {
      const testData = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        queries: {}
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(testData));

      const result = loadFromStorage();

      expect(localStorageMock.getItem).toHaveBeenCalledWith(CACHE_KEY);
      expect(result).toEqual(testData);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache loaded:')
      );
    });

    it('should return undefined when no cache exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = loadFromStorage();

      expect(result).toBeUndefined();
      expect(logger.log).not.toHaveBeenCalled();
    });

    it('should handle JSON parsing errors', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const result = loadFromStorage();

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to load cache from localStorage:',
        expect.any(Error)
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(CACHE_KEY);
    });

    it('should clear corrupted cache', () => {
      const error = new SyntaxError('Unexpected token');
      localStorageMock.getItem.mockReturnValue('{invalid json');

      const result = loadFromStorage();

      expect(result).toBeUndefined();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(CACHE_KEY);
    });

    it('should handle localStorage access errors', () => {
      const error = new Error('SecurityError');
      localStorageMock.getItem.mockImplementation(() => {
        throw error;
      });

      const result = loadFromStorage();

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to load cache from localStorage:',
        error
      );
    });
  });

  describe('throttledSave', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce save operations', () => {
      // Mock the internal functions to avoid error issues
      const queryPersistenceModule = require('../queryPersistence');
      const mockSerialize = jest.spyOn(queryPersistenceModule, 'serialize').mockReturnValue({
        version: CACHE_VERSION,
        timestamp: Date.now(),
        queries: {}
      });
      const mockSaveToStorage = jest.spyOn(queryPersistenceModule, 'saveToStorage').mockImplementation(() => {});

      throttledSave(mockQueryClient);
      throttledSave(mockQueryClient);
      throttledSave(mockQueryClient);

      // Should not call serialize/save immediately
      expect(mockSerialize).not.toHaveBeenCalled();
      expect(mockSaveToStorage).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should call serialize/save only once due to debouncing
      expect(mockSerialize).toHaveBeenCalledTimes(1);
      expect(mockSerialize).toHaveBeenCalledWith(mockQueryClient);
      expect(mockSaveToStorage).toHaveBeenCalledTimes(1);

      mockSerialize.mockRestore();
      mockSaveToStorage.mockRestore();
    });

    it('should clear previous timeout when called multiple times', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      throttledSave(mockQueryClient);
      throttledSave(mockQueryClient);

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('initializePersistence', () => {
    let unsubscribeMock;

    beforeEach(() => {
      unsubscribeMock = jest.fn();
      mockQueryCache.subscribe.mockReturnValue(unsubscribeMock);
    });

    it('should initialize persistence with cached data', () => {
      const cachedData = {
        version: CACHE_VERSION,
        timestamp: Date.now() - 1000,
        queries: {
          '["photos",{"page":1}]': {
            data: [{ id: 1 }],
            dataUpdatedAt: Date.now() - 1000,
            status: 'success'
          }
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      // Store reference to original setQueryData to verify it gets called
      const originalSetQueryData = mockQueryClient.setQueryData;

      const cleanup = initializePersistence(mockQueryClient);

      expect(localStorageMock.getItem).toHaveBeenCalledWith(CACHE_KEY);
      expect(originalSetQueryData).toHaveBeenCalledWith(
        ['photos', { page: 1 }],
        [{ id: 1 }],
        { updatedAt: cachedData.queries['["photos",{"page":1}]'].dataUpdatedAt }
      );
      expect(logger.log).toHaveBeenCalledWith('Rehydrated 1 queries from cache');

      // Should set up subscription
      expect(mockQueryCache.subscribe).toHaveBeenCalled();

      // Should set up beforeunload listener
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      // Should return cleanup function
      expect(typeof cleanup).toBe('function');
    });

    it('should handle initialization without cached data', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const cleanup = initializePersistence(mockQueryClient);

      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
      expect(mockQueryCache.subscribe).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });

    it('should handle invalid cached data', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: '0.5.0', // Wrong version
        timestamp: Date.now(),
        queries: {}
      }));

      const cleanup = initializePersistence(mockQueryClient);

      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });

    it('should handle expired cached data', () => {
      const expiredData = {
        version: CACHE_VERSION,
        timestamp: Date.now() - CACHE_EXPIRY - 1000,
        queries: {
          '["photos",{"page":1}]': {
            data: [{ id: 1 }],
            status: 'success'
          }
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));

      const cleanup = initializePersistence(mockQueryClient);

      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });

    it('should properly clean up when cleanup function is called', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const cleanup = initializePersistence(mockQueryClient);
      cleanup();

      expect(unsubscribeMock).toHaveBeenCalled();
      expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should wrap setQueryData to trigger saves', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: CACHE_VERSION,
        timestamp: Date.now() - 1000,
        queries: {
          '["photos",{"page":1}]': {
            data: [{ id: 1 }],
            dataUpdatedAt: Date.now() - 1000,
            status: 'success'
          }
        }
      }));

      const originalSetQueryData = mockQueryClient.setQueryData;
      mockQueryClient.setQueryData.mockReturnValue('result');

      initializePersistence(mockQueryClient);

      // setQueryData should be wrapped
      expect(mockQueryClient.setQueryData).not.toBe(originalSetQueryData);

      // Call wrapped function
      const result = mockQueryClient.setQueryData(['test'], 'data');

      expect(result).toBe('result');
      expect(originalSetQueryData).toHaveBeenCalledWith(['test'], 'data');
    });

    it('should handle beforeunload event', () => {
      const queryPersistenceModule = require('../queryPersistence');
      const mockSerialize = jest.spyOn(queryPersistenceModule, 'serialize').mockReturnValue({
        version: CACHE_VERSION,
        timestamp: Date.now(),
        queries: {}
      });
      const mockSaveToStorage = jest.spyOn(queryPersistenceModule, 'saveToStorage').mockImplementation(() => {});
      
      localStorageMock.getItem.mockReturnValue(null);

      initializePersistence(mockQueryClient);

      // Get the beforeunload handler
      const beforeUnloadHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )[1];

      // Trigger beforeunload
      beforeUnloadHandler();

      expect(mockSerialize).toHaveBeenCalledWith(mockQueryClient);
      expect(mockSaveToStorage).toHaveBeenCalled();

      mockSerialize.mockRestore();
      mockSaveToStorage.mockRestore();
    });
  });

  describe('clearPersistedCache', () => {
    it('should remove cache from localStorage and log', () => {
      clearPersistedCache();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(CACHE_KEY);
      expect(logger.log).toHaveBeenCalledWith('Persisted cache cleared');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle query client with no queries', () => {
      mockQueryCache.getAll.mockReturnValue([]);

      const result = serialize(mockQueryClient);

      expect(result.queries).toEqual({});
    });

    it('should handle queries with missing state properties', () => {
      const incompleteQuery = {
        queryKey: ['photos', { page: 1 }],
        state: {
          status: 'success',
          data: [{ id: 1 }]
          // Missing other state properties
        }
      };

      mockQueryCache.getAll.mockReturnValue([incompleteQuery]);

      const result = serialize(mockQueryClient);

      expect(result.queries['["photos",{"page":1}]']).toEqual({
        data: [{ id: 1 }],
        dataUpdateCount: undefined,
        dataUpdatedAt: undefined,
        errorUpdateCount: undefined,
        errorUpdatedAt: undefined,
        fetchFailureCount: undefined,
        isInvalidated: undefined,
        status: 'success',
        fetchStatus: 'idle'
      });
    });

    it('should handle cleanup with zero queries', () => {
      const emptyData = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        queries: {}
      };

      // Mock localStorage to work properly for this test
      localStorageMock.setItem.mockImplementation(() => {});

      // This should not throw even with empty queries
      expect(() => {
        saveToStorage(emptyData);
      }).not.toThrow();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(CACHE_KEY, JSON.stringify(emptyData));
    });

    it('should handle localStorage being unavailable', () => {
      const originalLocalStorage = window.localStorage;
      
      // Make localStorage unavailable
      delete window.localStorage;

      expect(() => loadFromStorage()).toThrow();

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true
      });
    });

    it('should handle malformed query keys in serialization', () => {
      const circularObj = {};
      circularObj.self = circularObj; // Create circular reference
      
      const queryWithMalformedKey = {
        queryKey: ['photos', { circular: circularObj }],
        state: {
          status: 'success',
          data: 'test',
          dataUpdateCount: 1,
          dataUpdatedAt: Date.now(),
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          isInvalidated: false,
          fetchStatus: 'idle'
        }
      };

      mockQueryCache.getAll.mockReturnValue([queryWithMalformedKey]);

      // This should throw due to circular reference in JSON.stringify
      expect(() => serialize(mockQueryClient)).toThrow();
    });
  });
});