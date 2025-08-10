import React, { useState, useEffect, useCallback } from 'react';
import { useInfinitePhotos, usePhotoMutations } from '../hooks/usePhotos';
import PhotoModal from './PhotoModal';
import LoadingSpinner from './LoadingSpinner';
import AutoSlideshow from './AutoSlideshow';

const PhotoGallery = () => {
  // React Query for data fetching
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfinitePhotos(20);

  // Photo mutations for cache management
  const { prefetchNextPage } = usePhotoMutations();

  // Local component state
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [invalidPhotos, setInvalidPhotos] = useState(new Set());
  const [loadedPhotos, setLoadedPhotos] = useState(new Set());
  const [hoveredPhoto, setHoveredPhoto] = useState(null);

  // Flatten all pages of photos
  const allPhotos = data && data.pages ? data.pages.flat() : [];

  // Scroll handler for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Prefetch next page when user is near the end
  useEffect(() => {
    if (allPhotos.length > 0 && hasNextPage && !isFetchingNextPage) {
      const handlePrefetch = () => {
        if (
          window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 2000
        ) {
          // Prefetch next page when user is 2000px from bottom
          const currentPage = data && data.pages ? data.pages.length : 1;
          prefetchNextPage(currentPage);
        }
      };

      window.addEventListener('scroll', handlePrefetch);
      return () => window.removeEventListener('scroll', handlePrefetch);
    }
  }, [allPhotos.length, hasNextPage, isFetchingNextPage, data && data.pages ? data.pages.length : 0, prefetchNextPage]);

  const openModal = (photo, cachedUrl = null) => {
    setSelectedPhoto({ ...photo, cachedUrl });
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  const getColumnCount = () => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    if (width < 1280) return 4;
    return 5;
  };

  const [columnCount, setColumnCount] = useState(getColumnCount);

  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create ordered masonry columns
  const createOrderedMasonryColumns = () => {
    const validPhotos = allPhotos.filter(photo => !invalidPhotos.has(photo.id));
    const columns = Array.from({ length: columnCount }, () => []);
    
    validPhotos.forEach((photo, index) => {
      const columnIndex = index % columnCount;
      columns[columnIndex].push(photo);
    });

    return columns;
  };

  const calculateImageDimensions = (photo) => {
    let width = Math.round(photo.width / 6);
    let height = Math.round(photo.height / 6);
    
    // Ensure minimum dimensions of 600x400 for HD screens
    if (width < 600 || height < 400) {
      const scaleFactorWidth = 600 / width;
      const scaleFactorHeight = 400 / height;
      const scaleFactor = Math.max(scaleFactorWidth, scaleFactorHeight);
      
      width = Math.round(width * scaleFactor);
      height = Math.round(height * scaleFactor);
    }
    
    return { width, height };
  };

  // Handle image load error
  const handleImageError = (photoId) => {
    setInvalidPhotos(prev => new Set([...prev, photoId]));
  };

  // Handle image load success
  const handleImageLoad = (photoId) => {
    setLoadedPhotos(prev => new Set([...prev, photoId]));
  };


  // Show error state if initial loading failed
  if (isError && allPhotos.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-center">
          <p className="text-xl mb-4">
            {(error && error.message) || 'Failed to load photos. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state for initial load
  if (isLoading && allPhotos.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      {/* Auto Slideshow - Full Width Outside Container */}
      <AutoSlideshow 
        onImageClick={(photo) => openModal(photo, `https://picsum.photos/id/${photo.id}/400/200`)} 
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-4 items-start">
        {createOrderedMasonryColumns().map((column, columnIndex) => (
          <div key={columnIndex} className="flex-1 space-y-4">
            {column.map((photo) => (
              <div
                key={photo.id}
                className="bg-gray-800 shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer relative w-full"
                onClick={() => openModal(photo)}
                onMouseEnter={() => setHoveredPhoto(photo.id)}
                onMouseLeave={() => setHoveredPhoto(null)}
                style={{
                  aspectRatio: `${calculateImageDimensions(photo).width} / ${calculateImageDimensions(photo).height}`
                }}
              >
                {!loadedPhotos.has(photo.id) && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-200" style={{ margin: 0 }}></div>
                  </div>
                )}
                <img
                  src={`https://picsum.photos/id/${photo.id}/${calculateImageDimensions(photo).width}/${calculateImageDimensions(photo).height}`}
                  alt={`Photo by ${photo.author}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => handleImageError(photo.id)}
                  style={{
                    opacity: loadedPhotos.has(photo.id) ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                  onLoad={() => {
                    setTimeout(() => handleImageLoad(photo.id), 10);
                  }}
                />
                
                {/* Hover overlay */}
                <div 
                  className="absolute inset-0 flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: hoveredPhoto === photo.id ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
                    opacity: hoveredPhoto === photo.id ? 1 : 0
                  }}
                >
                  <div className="text-white text-center p-4">
                    <div className="text-sm font-semibold mb-1">{photo.width} × {photo.height}px</div>
                    <div className="text-xs">by {photo.author}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        </div>

        {isFetchingNextPage && (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {isError && allPhotos.length > 0 && (
          <div className="text-center py-4">
            <p className="text-red-500 mb-2">
              {(error && error.message) || 'Failed to load more photos'}
            </p>
            <button
              onClick={() => fetchNextPage()}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Retry
            </button>
          </div>
        )}

        {!hasNextPage && allPhotos.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>You've reached the end of the gallery!</p>
          </div>
        )}
      </div>

      {selectedPhoto && (
        <PhotoModal 
          photo={selectedPhoto} 
          onClose={closeModal}
          cachedImageUrl={selectedPhoto.cachedUrl || `https://picsum.photos/id/${selectedPhoto.id}/${calculateImageDimensions(selectedPhoto).width}/${calculateImageDimensions(selectedPhoto).height}`}
        />
      )}
    </>
  );
};

export default PhotoGallery;