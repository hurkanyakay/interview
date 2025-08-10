/**
 * Custom hooks for photo data fetching using React Query
 */

import { useQuery, useInfiniteQuery, useQueryClient } from 'react-query';
import { fetchPhotos, fetchPhotoInfo, fetchSlideshowPhotos, prefetchImage } from '../services/api';

/**
 * Hook for fetching paginated photos with infinite scroll
 */
export const useInfinitePhotos = (limit = 20) => {
  return useInfiniteQuery(
    ['photos', { limit }],
    ({ pageParam = 1 }) => fetchPhotos({ page: pageParam, limit }),
    {
      getNextPageParam: (lastPage, allPages) => {
        // Continue fetching if we got a full page of results
        return lastPage.length === limit ? allPages.length + 1 : undefined;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );
};

/**
 * Hook for fetching a single page of photos
 */
export const usePhotos = (page = 1, limit = 20) => {
  return useQuery(
    ['photos', { page, limit }],
    () => fetchPhotos({ page, limit }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      keepPreviousData: true, // Keep previous data while fetching new
      retry: 3,
    }
  );
};

/**
 * Hook for fetching specific photo information
 */
export const usePhotoInfo = (photoId, options = {}) => {
  return useQuery(
    ['photoInfo', photoId],
    () => fetchPhotoInfo(photoId),
    {
      enabled: !!photoId, // Only fetch if photoId is provided
      staleTime: 15 * 60 * 1000, // 15 minutes (photo info rarely changes)
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      ...options,
    }
  );
};

/**
 * Hook for fetching slideshow photos
 */
export const useSlideshowPhotos = (photoIds) => {
  return useQuery(
    ['slideshowPhotos', photoIds],
    () => fetchSlideshowPhotos(photoIds),
    {
      staleTime: 30 * 60 * 1000, // 30 minutes
      cacheTime: 60 * 60 * 1000, // 1 hour
      refetchOnWindowFocus: false,
      retry: 2,
      refetchOnMount: false, // Don't refetch on component mount
    }
  );
};

/**
 * Hook for prefetching images
 */
export const usePrefetchImages = () => {
  const queryClient = useQueryClient();
  
  const prefetchPhoto = async (photoId) => {
    // Prefetch photo info
    await queryClient.prefetchQuery(
      ['photoInfo', photoId],
      () => fetchPhotoInfo(photoId),
      {
        staleTime: 15 * 60 * 1000,
      }
    );
  };
  
  const prefetchImageUrl = async (url, cacheKey) => {
    await queryClient.prefetchQuery(
      ['prefetchedImage', cacheKey || url],
      () => prefetchImage(url),
      {
        staleTime: 60 * 60 * 1000, // 1 hour
      }
    );
  };
  
  return { prefetchPhoto, prefetchImageUrl };
};

/**
 * Hook for managing photo data mutations (future: favorites, collections)
 */
export const usePhotoMutations = () => {
  const queryClient = useQueryClient();
  
  const invalidatePhotos = () => {
    queryClient.invalidateQueries(['photos']);
  };
  
  const invalidatePhotoInfo = (photoId) => {
    queryClient.invalidateQueries(['photoInfo', photoId]);
  };
  
  const prefetchNextPage = (currentPage, limit = 20) => {
    queryClient.prefetchQuery(
      ['photos', { page: currentPage + 1, limit }],
      () => fetchPhotos({ page: currentPage + 1, limit }),
      {
        staleTime: 5 * 60 * 1000,
      }
    );
  };
  
  return {
    invalidatePhotos,
    invalidatePhotoInfo,
    prefetchNextPage,
  };
};