/**
 * React hook for managing React Query persistence
 */

import { useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { 
  initializePersistence, 
  clearPersistedCache
} from '../utils/queryPersistence';
import { error } from '../utils/logger';

/**
 * Hook to manage React Query persistence
 */
export const usePersistence = (options = {}) => {
  const queryClient = useQueryClient();
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize persistence on mount
  useEffect(() => {
    let cleanup;

    const initialize = async () => {
      try {
        // Initialize persistence
        cleanup = initializePersistence(queryClient);
        
        // Mark as hydrated
        setIsHydrated(true);
        
        if (options.onCacheLoaded) {
          options.onCacheLoaded();
        }
      } catch (err) {
        error('Failed to initialize persistence:', err);
        setIsHydrated(true); // Still mark as hydrated to not block the app
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [queryClient, options]);

  // Methods to manage cache
  const clearCache = () => {
    try {
      clearPersistedCache();
    } catch (err) {
      error('Failed to clear persisted cache:', err);
    }
    
    if (options.onCacheCleared) {
      options.onCacheCleared();
    }
  };

  return {
    isHydrated,
    clearCache,
  };
};


