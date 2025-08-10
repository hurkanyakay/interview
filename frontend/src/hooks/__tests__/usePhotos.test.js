/**
 * Comprehensive tests for usePhotos hooks
 */

import React, { useEffect } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery, useInfiniteQuery, useQueryClient } from 'react-query';
import {
  useInfinitePhotos,
  usePhotos,
  usePhotoInfo,
  useSlideshowPhotos,
  usePrefetchImages,
  usePhotoMutations
} from '../usePhotos';
import * as api from '../../services/api';

// Mock dependencies
jest.mock('react-query', () => ({
  ...jest.requireActual('react-query'),
  useQuery: jest.fn(),
  useInfiniteQuery: jest.fn(),
  useQueryClient: jest.fn(),
  QueryClient: jest.requireActual('react-query').QueryClient,
  QueryClientProvider: jest.requireActual('react-query').QueryClientProvider,
}));
jest.mock('../../services/api');

describe('usePhotos hooks', () => {
  let queryClient;
  let hookResult;
  let renderCount = 0;

  // Mock implementations
  const mockQueryClient = {
    prefetchQuery: jest.fn(),
    invalidateQueries: jest.fn(),
  };

  const mockQueryResult = {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };

  const mockInfiniteQueryResult = {
    data: { pages: [[]] },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };

  // Test component wrapper for hooks
  const TestComponent = ({ hookType, hookArgs = [] }) => {
    let result;
    
    switch (hookType) {
      case 'useInfinitePhotos':
        result = useInfinitePhotos(...hookArgs);
        break;
      case 'usePhotos':
        result = usePhotos(...hookArgs);
        break;
      case 'usePhotoInfo':
        result = usePhotoInfo(...hookArgs);
        break;
      case 'useSlideshowPhotos':
        result = useSlideshowPhotos(...hookArgs);
        break;
      case 'usePrefetchImages':
        result = usePrefetchImages(...hookArgs);
        break;
      case 'usePhotoMutations':
        result = usePhotoMutations(...hookArgs);
        break;
      default:
        result = null;
    }
    
    useEffect(() => {
      hookResult = result;
      renderCount++;
    });

    return (
      <div data-testid="test-component">
        {JSON.stringify({ hookType, renderCount })}
      </div>
    );
  };

  const renderWithProvider = (hookType, hookArgs = []) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TestComponent hookType={hookType} hookArgs={hookArgs} />
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
    
    hookResult = null;
    renderCount = 0;
    
    // Setup default mocks
    useQuery.mockReturnValue(mockQueryResult);
    useInfiniteQuery.mockReturnValue(mockInfiniteQueryResult);
    useQueryClient.mockReturnValue(mockQueryClient);
    
    // Mock API functions
    api.fetchPhotos.mockResolvedValue([]);
    api.fetchPhotoInfo.mockResolvedValue({});
    api.fetchSlideshowPhotos.mockResolvedValue([]);
    api.prefetchImage.mockResolvedValue('mocked-image');
  });

  describe('useInfinitePhotos', () => {
    it('should call useInfiniteQuery with correct parameters', () => {
      renderWithProvider('useInfinitePhotos');
      
      expect(useInfiniteQuery).toHaveBeenCalledWith(
        ['photos', { limit: 20 }],
        expect.any(Function),
        expect.objectContaining({
          getNextPageParam: expect.any(Function),
          staleTime: 5 * 60 * 1000,
          cacheTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 3,
          retryDelay: expect.any(Function),
        })
      );
    });

    it('should use custom limit parameter', () => {
      renderWithProvider('useInfinitePhotos', [50]);
      
      expect(useInfiniteQuery).toHaveBeenCalledWith(
        ['photos', { limit: 50 }],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should call fetchPhotos with correct page parameter', () => {
      renderWithProvider('useInfinitePhotos');
      
      // Get the query function from the call
      const queryFunction = useInfiniteQuery.mock.calls[0][1];
      
      // Call it with pageParam
      queryFunction({ pageParam: 3 });
      
      expect(api.fetchPhotos).toHaveBeenCalledWith({ page: 3, limit: 20 });
    });

    it('should use default pageParam of 1 when not provided', () => {
      renderWithProvider('useInfinitePhotos');
      
      const queryFunction = useInfiniteQuery.mock.calls[0][1];
      queryFunction({});
      
      expect(api.fetchPhotos).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should calculate next page param correctly when full page received', () => {
      renderWithProvider('useInfinitePhotos', [20]);
      
      const { getNextPageParam } = useInfiniteQuery.mock.calls[0][2];
      
      // Full page - should return next page number
      const fullPage = new Array(20).fill({});
      const allPages = [fullPage, fullPage];
      
      const nextParam = getNextPageParam(fullPage, allPages);
      expect(nextParam).toBe(3); // allPages.length + 1
    });

    it('should return undefined for next page when partial page received', () => {
      renderWithProvider('useInfinitePhotos', [20]);
      
      const { getNextPageParam } = useInfiniteQuery.mock.calls[0][2];
      
      // Partial page - should return undefined (no more pages)
      const partialPage = new Array(15).fill({});
      const allPages = [partialPage];
      
      const nextParam = getNextPageParam(partialPage, allPages);
      expect(nextParam).toBeUndefined();
    });

    it('should handle retryDelay calculation', () => {
      renderWithProvider('useInfinitePhotos');
      
      const { retryDelay } = useInfiniteQuery.mock.calls[0][2];
      
      expect(retryDelay(0)).toBe(1000); // 1000 * 2^0
      expect(retryDelay(1)).toBe(2000); // 1000 * 2^1
      expect(retryDelay(2)).toBe(4000); // 1000 * 2^2
      expect(retryDelay(10)).toBe(30000); // Capped at 30000
    });
  });

  describe('usePhotos', () => {
    it('should call useQuery with correct parameters', () => {
      renderWithProvider('usePhotos');
      
      expect(useQuery).toHaveBeenCalledWith(
        ['photos', { page: 1, limit: 20 }],
        expect.any(Function),
        expect.objectContaining({
          staleTime: 5 * 60 * 1000,
          cacheTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          keepPreviousData: true,
          retry: 3,
        })
      );
    });

    it('should use custom page and limit parameters', () => {
      renderWithProvider('usePhotos', [3, 50]);
      
      expect(useQuery).toHaveBeenCalledWith(
        ['photos', { page: 3, limit: 50 }],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should call fetchPhotos with correct parameters', () => {
      renderWithProvider('usePhotos', [2, 30]);
      
      const queryFunction = useQuery.mock.calls[0][1];
      queryFunction();
      
      expect(api.fetchPhotos).toHaveBeenCalledWith({ page: 2, limit: 30 });
    });
  });

  describe('usePhotoInfo', () => {
    it('should call useQuery with correct parameters', () => {
      const photoId = 'photo-123';
      renderWithProvider('usePhotoInfo', [photoId]);
      
      expect(useQuery).toHaveBeenCalledWith(
        ['photoInfo', photoId],
        expect.any(Function),
        expect.objectContaining({
          enabled: true,
          staleTime: 15 * 60 * 1000,
          cacheTime: 30 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 2,
        })
      );
    });

    it('should be disabled when photoId is not provided', () => {
      renderWithProvider('usePhotoInfo', [null]);
      
      const options = useQuery.mock.calls[0][2];
      expect(options.enabled).toBe(false);
    });

    it('should be disabled when photoId is empty string', () => {
      renderWithProvider('usePhotoInfo', ['']);
      
      const options = useQuery.mock.calls[0][2];
      expect(options.enabled).toBe(false);
    });

    it('should be enabled when photoId is provided', () => {
      renderWithProvider('usePhotoInfo', ['photo-456']);
      
      const options = useQuery.mock.calls[0][2];
      expect(options.enabled).toBe(true);
    });

    it('should call fetchPhotoInfo with correct photoId', () => {
      const photoId = 'photo-789';
      renderWithProvider('usePhotoInfo', [photoId]);
      
      const queryFunction = useQuery.mock.calls[0][1];
      queryFunction();
      
      expect(api.fetchPhotoInfo).toHaveBeenCalledWith(photoId);
    });

    it('should merge custom options with default options', () => {
      const customOptions = {
        retry: 5,
        customProperty: 'test',
      };
      
      renderWithProvider('usePhotoInfo', ['photo-123', customOptions]);
      
      const options = useQuery.mock.calls[0][2];
      expect(options.retry).toBe(5);
      expect(options.customProperty).toBe('test');
      expect(options.staleTime).toBe(15 * 60 * 1000); // Default should still be there
    });

    it('should allow custom options to override defaults', () => {
      const customOptions = {
        staleTime: 1000,
        enabled: false,
      };
      
      renderWithProvider('usePhotoInfo', ['photo-123', customOptions]);
      
      const options = useQuery.mock.calls[0][2];
      expect(options.staleTime).toBe(1000);
      expect(options.enabled).toBe(false);
    });
  });

  describe('useSlideshowPhotos', () => {
    it('should call useQuery with correct parameters', () => {
      const photoIds = ['photo1', 'photo2', 'photo3'];
      renderWithProvider('useSlideshowPhotos', [photoIds]);
      
      expect(useQuery).toHaveBeenCalledWith(
        ['slideshowPhotos', photoIds],
        expect.any(Function),
        expect.objectContaining({
          staleTime: 30 * 60 * 1000,
          cacheTime: 60 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 2,
          refetchOnMount: false,
        })
      );
    });

    it('should call fetchSlideshowPhotos with correct photoIds', () => {
      const photoIds = ['photo1', 'photo2'];
      renderWithProvider('useSlideshowPhotos', [photoIds]);
      
      const queryFunction = useQuery.mock.calls[0][1];
      queryFunction();
      
      expect(api.fetchSlideshowPhotos).toHaveBeenCalledWith(photoIds);
    });

    it('should handle empty photoIds array', () => {
      renderWithProvider('useSlideshowPhotos', [[]]);
      
      const queryFunction = useQuery.mock.calls[0][1];
      queryFunction();
      
      expect(api.fetchSlideshowPhotos).toHaveBeenCalledWith([]);
    });
  });

  describe('usePrefetchImages', () => {
    it('should return prefetch functions', () => {
      renderWithProvider('usePrefetchImages');
      
      expect(typeof hookResult.prefetchPhoto).toBe('function');
      expect(typeof hookResult.prefetchImageUrl).toBe('function');
    });

    it('should prefetch photo info correctly', async () => {
      renderWithProvider('usePrefetchImages');
      
      await hookResult.prefetchPhoto('photo-123');
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
        ['photoInfo', 'photo-123'],
        expect.any(Function),
        expect.objectContaining({
          staleTime: 15 * 60 * 1000,
        })
      );
    });

    it('should call fetchPhotoInfo when prefetching photo', async () => {
      renderWithProvider('usePrefetchImages');
      
      // Get the query function and call it
      await hookResult.prefetchPhoto('photo-456');
      
      const queryFunction = mockQueryClient.prefetchQuery.mock.calls[0][1];
      await queryFunction();
      
      expect(api.fetchPhotoInfo).toHaveBeenCalledWith('photo-456');
    });

    it('should prefetch image URL correctly', async () => {
      renderWithProvider('usePrefetchImages');
      
      const imageUrl = 'https://example.com/image.jpg';
      await hookResult.prefetchImageUrl(imageUrl);
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
        ['prefetchedImage', imageUrl],
        expect.any(Function),
        expect.objectContaining({
          staleTime: 60 * 60 * 1000,
        })
      );
    });

    it('should prefetch image URL with custom cache key', async () => {
      renderWithProvider('usePrefetchImages');
      
      const imageUrl = 'https://example.com/image.jpg';
      const cacheKey = 'custom-key';
      await hookResult.prefetchImageUrl(imageUrl, cacheKey);
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
        ['prefetchedImage', cacheKey],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should call prefetchImage when prefetching image URL', async () => {
      renderWithProvider('usePrefetchImages');
      
      const imageUrl = 'https://example.com/image.jpg';
      await hookResult.prefetchImageUrl(imageUrl);
      
      const queryFunction = mockQueryClient.prefetchQuery.mock.calls[0][1];
      await queryFunction();
      
      expect(api.prefetchImage).toHaveBeenCalledWith(imageUrl);
    });
  });

  describe('usePhotoMutations', () => {
    it('should return mutation functions', () => {
      renderWithProvider('usePhotoMutations');
      
      expect(typeof hookResult.invalidatePhotos).toBe('function');
      expect(typeof hookResult.invalidatePhotoInfo).toBe('function');
      expect(typeof hookResult.prefetchNextPage).toBe('function');
    });

    it('should invalidate photos correctly', () => {
      renderWithProvider('usePhotoMutations');
      
      hookResult.invalidatePhotos();
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(['photos']);
    });

    it('should invalidate specific photo info correctly', () => {
      renderWithProvider('usePhotoMutations');
      
      hookResult.invalidatePhotoInfo('photo-123');
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(['photoInfo', 'photo-123']);
    });

    it('should prefetch next page with default limit', () => {
      renderWithProvider('usePhotoMutations');
      
      hookResult.prefetchNextPage(2);
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
        ['photos', { page: 3, limit: 20 }],
        expect.any(Function),
        expect.objectContaining({
          staleTime: 5 * 60 * 1000,
        })
      );
    });

    it('should prefetch next page with custom limit', () => {
      renderWithProvider('usePhotoMutations');
      
      hookResult.prefetchNextPage(5, 50);
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
        ['photos', { page: 6, limit: 50 }],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should call fetchPhotos when prefetching next page', () => {
      renderWithProvider('usePhotoMutations');
      
      hookResult.prefetchNextPage(3, 30);
      
      const queryFunction = mockQueryClient.prefetchQuery.mock.calls[0][1];
      queryFunction();
      
      expect(api.fetchPhotos).toHaveBeenCalledWith({ page: 4, limit: 30 });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero limit in useInfinitePhotos', () => {
      renderWithProvider('useInfinitePhotos', [0]);
      
      const { getNextPageParam } = useInfiniteQuery.mock.calls[0][2];
      const result = getNextPageParam([], []);
      
      // When limit is 0, any page length (including 0) equals limit
      expect(result).toBe(1); // allPages.length + 1
    });

    it('should handle negative page numbers in usePhotos', () => {
      renderWithProvider('usePhotos', [-1, 20]);
      
      expect(useQuery).toHaveBeenCalledWith(
        ['photos', { page: -1, limit: 20 }],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should handle null photoIds in useSlideshowPhotos', () => {
      renderWithProvider('useSlideshowPhotos', [null]);
      
      expect(useQuery).toHaveBeenCalledWith(
        ['slideshowPhotos', null],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should handle undefined photoIds in useSlideshowPhotos', () => {
      renderWithProvider('useSlideshowPhotos', [undefined]);
      
      expect(useQuery).toHaveBeenCalledWith(
        ['slideshowPhotos', undefined],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should handle zero as photoId in usePhotoInfo', () => {
      renderWithProvider('usePhotoInfo', [0]);
      
      const options = useQuery.mock.calls[0][2];
      expect(options.enabled).toBe(false); // 0 is falsy
    });

    it('should handle boolean true as photoId in usePhotoInfo', () => {
      renderWithProvider('usePhotoInfo', [true]);
      
      const options = useQuery.mock.calls[0][2];
      expect(options.enabled).toBe(true); // true is truthy
    });

    it('should handle async errors in prefetch functions', async () => {
      api.fetchPhotoInfo.mockRejectedValue(new Error('API Error'));
      
      renderWithProvider('usePrefetchImages');
      
      // Should not throw - prefetch errors are typically silent
      await expect(hookResult.prefetchPhoto('photo-123')).resolves.toBeUndefined();
    });
  });

  describe('Default Parameter Handling', () => {
    it('should use default parameters when none provided', () => {
      renderWithProvider('useInfinitePhotos');
      renderWithProvider('usePhotos');
      
      // Check that defaults were used
      expect(useInfiniteQuery).toHaveBeenCalledWith(
        ['photos', { limit: 20 }],
        expect.any(Function),
        expect.any(Object)
      );
      
      expect(useQuery).toHaveBeenCalledWith(
        ['photos', { page: 1, limit: 20 }],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should handle undefined parameters gracefully', () => {
      renderWithProvider('useInfinitePhotos', [undefined]);
      renderWithProvider('usePhotos', [undefined, undefined]);
      
      expect(useInfiniteQuery).toHaveBeenCalledWith(
        ['photos', { limit: 20 }], // undefined becomes default
        expect.any(Function),
        expect.any(Object)
      );
      
      expect(useQuery).toHaveBeenCalledWith(
        ['photos', { page: 1, limit: 20 }], // undefined becomes defaults
        expect.any(Function),
        expect.any(Object)
      );
    });
  });

  describe('Multiple Hook Instances', () => {
    it('should handle multiple useInfinitePhotos instances', () => {
      renderWithProvider('useInfinitePhotos', [10]);
      renderWithProvider('useInfinitePhotos', [30]);
      
      expect(useInfiniteQuery).toHaveBeenCalledTimes(2);
      expect(useInfiniteQuery).toHaveBeenNthCalledWith(
        1,
        ['photos', { limit: 10 }],
        expect.any(Function),
        expect.any(Object)
      );
      expect(useInfiniteQuery).toHaveBeenNthCalledWith(
        2,
        ['photos', { limit: 30 }],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should handle multiple usePrefetchImages instances', () => {
      renderWithProvider('usePrefetchImages');
      const result1 = hookResult;
      
      renderWithProvider('usePrefetchImages');
      const result2 = hookResult;
      
      // Both should have independent functions
      expect(result1.prefetchPhoto).not.toBe(result2.prefetchPhoto);
      expect(result1.prefetchImageUrl).not.toBe(result2.prefetchImageUrl);
    });
  });
});