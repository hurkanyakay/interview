import React, { useState, useEffect, useCallback } from 'react';
import { fetchPhotos } from '../services/photoService';
import PhotoModal from './PhotoModal';
import LoadingSpinner from './LoadingSpinner';
import AutoSlideshow from './AutoSlideshow';

const PhotoGallery = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [invalidPhotos, setInvalidPhotos] = useState(new Set());
  const [loadedPhotos, setLoadedPhotos] = useState(new Set());
  const [hoveredPhoto, setHoveredPhoto] = useState(null);

  const loadPhotos = useCallback(async (pageNum, isInitial = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newPhotos = await fetchPhotos(pageNum);
      
      if (newPhotos.length === 0) {
        setHasMore(false);
      } else {
        // Filter out duplicate photos by ID
        const uniqueNewPhotos = newPhotos.filter(newPhoto => 
          !photos.some(existingPhoto => existingPhoto.id === newPhoto.id)
        );
        
        setPhotos(prev => isInitial ? newPhotos : [...prev, ...uniqueNewPhotos]);
      }
    } catch (err) {
      const errorMessage = err.message.includes('timeout') 
        ? 'Connection timeout. Please check your internet and try again.'
        : err.message.includes('Network') 
        ? 'Network error. Please check your connection and try again.'
        : `Failed to load photos: ${err.message}`;
      
      setError(errorMessage);
      console.error('Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, photos]);

  useEffect(() => {
    loadPhotos(2, true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 &&
        hasMore &&
        !loading
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadPhotos(nextPage);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, page, loadPhotos]);

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
    const validPhotos = photos.filter(photo => !invalidPhotos.has(photo.id));
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


  if (error && photos.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-center">
          <p className="text-xl mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadPhotos(0, true);
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
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

        {loading && (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {error && photos.length > 0 && (
          <div className="text-center py-4">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
                loadPhotos(page);
              }}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Retry
            </button>
          </div>
        )}

        {!hasMore && photos.length > 0 && (
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