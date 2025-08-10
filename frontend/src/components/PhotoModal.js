import React, { useEffect, useState } from 'react';
import Toast from './Toast';

const PhotoModal = ({ photo, onClose, cachedImageUrl }) => {
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(cachedImageUrl);
  const [isLoadingFullSize, setIsLoadingFullSize] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleHDImageError = () => {
    // Try loading original full-size image as fallback
    setIsLoadingFullSize(true);
    const fullSizeImg = new Image();
    fullSizeImg.onload = () => {
      setCurrentImageUrl(photo.download_url);
      setIsHighResLoaded(true);
      setIsLoadingFullSize(false);
    };
    fullSizeImg.onerror = () => {
      setIsLoadingFullSize(false);
      setShowToast(true);
      setTimeout(() => {
        onClose();
      }, 2000); // Close modal 2 seconds after showing toast
    };
    fullSizeImg.src = photo.download_url;
  };

  const handleToastClose = () => {
    setShowToast(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors p-2 z-10"
        aria-label="Close"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main image container */}
      <div className="relative max-w-[95vw] max-h-[95vh] m-4">
        {/* Show cached image initially, then upgrade to better quality */}
        <img
          src={isHighResLoaded ? currentImageUrl : cachedImageUrl}
          alt={`By ${photo.author}`}
          className="w-full h-full object-contain rounded-lg shadow-2xl"
          style={{ maxHeight: '95vh', maxWidth: '95vw' }}
        />
        
        {/* Hidden high-res image for preloading */}
        <img
          src={`https://picsum.photos/id/${photo.id}/1400/1000`}
          alt=""
          className="hidden"
          onLoad={() => {
            setCurrentImageUrl(`https://picsum.photos/id/${photo.id}/1400/1000`);
            setIsHighResLoaded(true);
          }}
          onError={handleHDImageError}
        />

        {/* Loading indicator */}
        {!isHighResLoaded && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">
              {isLoadingFullSize ? 'Loading Original...' : 'Loading HD...'}
            </span>
          </div>
        )}

        {/* Info panel - bottom right */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white rounded-lg p-4 max-w-xs">
          <div className="space-y-2 text-sm">
            <div className="font-semibold text-lg">#{photo.id}</div>
            <div>By <span className="font-medium">{photo.author}</span></div>
            <div className="text-gray-300">{photo.width} × {photo.height}px</div>
            <div className="text-gray-300">
              Ratio: {(photo.width / photo.height).toFixed(2)}:1
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <a
              href={photo.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Download
            </a>
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Unsplash
            </a>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <Toast 
          message="Failed to load HD image" 
          type="error" 
          onClose={handleToastClose}
          duration={2000}
        />
      )}
    </div>
  );
};

export default PhotoModal;