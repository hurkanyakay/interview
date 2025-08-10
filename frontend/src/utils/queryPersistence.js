/**
 * Custom React Query persistence implementation
 * Provides localStorage-based persistence with intelligent caching strategies
 */

// eslint-disable-next-line no-unused-vars
import { log, warn, error as logError } from './logger';

// Helper to access latest exported functions in test/runtime environments
// Falls back to local implementation when exports are not available
// eslint-disable-next-line no-unused-vars
const getExportedFunction = (name, fallback) => {
  try {
    // eslint-disable-next-line no-undef
    if (typeof exports !== 'undefined' && exports && typeof exports[name] === 'function') {
      // eslint-disable-next-line no-undef
      return exports[name];
    }
  } catch (_) {
    // ignore
  }
  return fallback;
};

const CACHE_KEY = 'photo-gallery-cache';
const CACHE_VERSION = '1.0.0';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Serialize query client cache for storage
 */
export const serialize = (client) => {
  const cache = client.getQueryCache();
  const queries = cache.getAll();
  
  const serializedQueries = queries.reduce((acc, query) => {
    const { queryKey, state } = query;
    
    // Only persist successful queries with data
    if (state.status === 'success' && state.data) {
      // Skip certain query types that shouldn't be persisted
      if (shouldPersistQuery(queryKey)) {
        acc[JSON.stringify(queryKey)] = {
          data: state.data,
          dataUpdateCount: state.dataUpdateCount,
          dataUpdatedAt: state.dataUpdatedAt,
          errorUpdateCount: state.errorUpdateCount,
          errorUpdatedAt: state.errorUpdatedAt,
          fetchFailureCount: state.fetchFailureCount,
          isInvalidated: state.isInvalidated,
          status: state.status,
          fetchStatus: 'idle', // Reset fetch status on persistence
        };
      }
    }
    
    return acc;
  }, {});
  
  return {
    version: CACHE_VERSION,
    timestamp: Date.now(),
    queries: serializedQueries,
  };
};

/**
 * Deserialize stored cache back to query client
 */
export const deserialize = (cached) => {
  if (!cached || cached.version !== CACHE_VERSION) {
    return undefined;
  }
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
    return undefined;
  }
  
  const queries = Object.entries(cached.queries).map(([key, value]) => ({
    queryKey: JSON.parse(key),
    queryHash: key,
    state: value,
  }));
  
  return { queries };
};

/**
 * Determine which queries should be persisted
 */
const shouldPersistQuery = (queryKey) => {
  const [type] = queryKey;
  
  // Persist these query types
  const persistableQueries = [
    'photos',           // Photo gallery data
    'photoInfo',        // Individual photo details
    'slideshowPhotos',  // Slideshow data
  ];
  
  // Don't persist these query types
  const nonPersistableQueries = [
    'prefetchedImage',  // Temporary image prefetch data
    'realtime',         // Real-time data
    'user',             // User-specific data
  ];
  
  if (nonPersistableQueries.includes(type)) {
    return false;
  }
  
  return persistableQueries.includes(type);
};

/**
 * Save cache to localStorage with size management
 */
export const saveToStorage = (data) => {
  try {
    const serialized = JSON.stringify(data);
    
    // Check size limits
    if (serialized.length > MAX_CACHE_SIZE) {
      warn('Cache size exceeds limit, performing cleanup');
      const cleaned = cleanupLargeCache(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(cleaned));
    } else {
      localStorage.setItem(CACHE_KEY, serialized);
    }
    
    log(`Cache saved: ${(serialized.length / 1024).toFixed(2)}KB`);
  } catch (error) {
    warn('Failed to save cache to localStorage:', error);
    // Try to free up space and retry once
    try {
      cleanupStorage();
      const serialized = JSON.stringify(data);
      localStorage.setItem(CACHE_KEY, serialized);
    } catch (retryError) {
      logError('Failed to save cache after cleanup:', retryError);
    }
  }
};

/**
 * Load cache from localStorage
 */
export const loadFromStorage = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return undefined;
    
    const parsed = JSON.parse(cached);
    log(`Cache loaded: ${(cached.length / 1024).toFixed(2)}KB`);
    return parsed;
  } catch (error) {
    warn('Failed to load cache from localStorage:', error);
    // Clear corrupted cache
    localStorage.removeItem(CACHE_KEY);
    return undefined;
  }
};

/**
 * Clean up large cache by removing older entries
 */
const cleanupLargeCache = (data) => {
  const queries = Object.entries(data.queries);
  
  // Sort by update time, keep most recent
  queries.sort(([, a], [, b]) => b.dataUpdatedAt - a.dataUpdatedAt);
  
  // Keep only the most recent 50% of queries
  const keepCount = Math.floor(queries.length * 0.5);
  const cleanedQueries = queries.slice(0, keepCount).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
  
  return {
    ...data,
    queries: cleanedQueries,
  };
};

/**
 * Clean up localStorage when space is needed
 */
const cleanupStorage = () => {
  // Remove old photo gallery caches
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('photo-gallery-cache-old-')) {
      localStorage.removeItem(key);
    }
  });
};

/**
 * Throttled persistence to avoid excessive writes
 */
let saveTimeout;
export const throttledSave = (client) => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const serializeFn = getExportedFunction('serialize', serialize);
    const saveToStorageFn = getExportedFunction('saveToStorage', saveToStorage);
    const serialized = serializeFn(client);
    saveToStorageFn(serialized);
  }, 1000); // Debounce saves by 1 second
};

/**
 * Initialize persistence for a query client
 */
export const initializePersistence = (queryClient) => {
  // Load initial cache
  const cached = loadFromStorage();
  if (cached) {
    const deserialized = deserialize(cached);
    if (deserialized) {
      queryClient.setQueryData = ((originalSetQueryData) => {
        return (...args) => {
          const result = originalSetQueryData.apply(queryClient, args);
          throttledSave(queryClient);
          return result;
        };
      })(queryClient.setQueryData);
      
      // Hydrate cache
      deserialized.queries.forEach(({ queryKey, state }) => {
        queryClient.setQueryData(queryKey, state.data, {
          updatedAt: state.dataUpdatedAt,
        });
      });
      
      log(`Rehydrated ${deserialized.queries.length} queries from cache`);
    }
  }
  
  // Set up automatic persistence
  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    throttledSave(queryClient);
  });
  
  // Save cache when page is about to unload
  const handleBeforeUnload = () => {
    clearTimeout(saveTimeout);
    const serializeFn = getExportedFunction('serialize', serialize);
    const saveToStorageFn = getExportedFunction('saveToStorage', saveToStorage);
    const serialized = serializeFn(queryClient);
    saveToStorageFn(serialized);
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Return cleanup function
  return () => {
    unsubscribe();
    window.removeEventListener('beforeunload', handleBeforeUnload);
    clearTimeout(saveTimeout);
  };
};

/**
 * Clear all persisted cache
 */
export const clearPersistedCache = () => {
  localStorage.removeItem(CACHE_KEY);
  log('Persisted cache cleared');
};

