import React, { useState, useEffect } from 'react';
import { useSlideshowPhotos } from '../hooks/usePhotos';

const AutoSlideshow = ({ onImageClick }) => {
  // Array of 10 random image IDs
  const slideImageIds = [42, 156, 237, 89, 314, 67, 428, 195, 73, 291];
  
  // Use React Query for slideshow data
  const { data: slideImagesInfo, isLoading, isError } = useSlideshowPhotos(slideImageIds);
  
  const [loadedImagesCount, setLoadedImagesCount] = useState(0);
  const [hoveredSlide, setHoveredSlide] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());
  
  // Slideshow is ready when data is loaded and not in error state
  const isReady = !isLoading && !isError && slideImagesInfo && slideImagesInfo.length > 0;

  // Preload images when slideshow data is available
  useEffect(() => {
    if (!slideImagesInfo || slideImagesInfo.length === 0) return;

    const preloadImages = async () => {
      // Check if images are already cached by service worker
      if ('caches' in window) {
        try {
          const cache = await caches.open('unsplash-images-v1');
          
          for (const imageInfo of slideImagesInfo) {
            const imageUrl = `https://picsum.photos/id/${imageInfo.id}/400/200`;
            const cachedResponse = await cache.match(imageUrl);
            if (cachedResponse) {
              setLoadedImagesCount(prev => prev + 1);
            } else {
              // Image not cached, preload it
              const img = new Image();
              await new Promise((resolve) => {
                img.onload = () => {
                  setLoadedImagesCount(prev => prev + 1);
                  resolve();
                };
                img.onerror = () => {
                  setFailedImages(prev => new Set([...prev, imageInfo.id]));
                  setLoadedImagesCount(prev => prev + 1);
                  resolve();
                };
                img.src = imageUrl;
              });
            }
          }
        } catch (error) {
          // Fallback to regular preloading if cache check fails
          const imagePreloadPromises = slideImagesInfo.map((imageInfo) => {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                setLoadedImagesCount(prev => prev + 1);
                resolve();
              };
              img.onerror = () => {
                setFailedImages(prev => new Set([...prev, imageInfo.id]));
                setLoadedImagesCount(prev => prev + 1);
                resolve();
              };
              img.src = `https://picsum.photos/id/${imageInfo.id}/400/200`;
            });
          });
          
          await Promise.all(imagePreloadPromises);
        }
      } else {
        // No cache API support, use regular preloading
        const imagePreloadPromises = slideImagesInfo.map((imageInfo) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              setLoadedImagesCount(prev => prev + 1);
              resolve();
            };
            img.onerror = () => {
              setFailedImages(prev => new Set([...prev, imageInfo.id]));
              setLoadedImagesCount(prev => prev + 1);
              resolve();
            };
            img.src = `https://picsum.photos/id/${imageInfo.id}/400/200`;
          });
        });
        
        await Promise.all(imagePreloadPromises);
      }
    };

    preloadImages();
  }, [slideImagesInfo]);


  if (!isReady || !slideImagesInfo || slideImagesInfo.length === 0) {
    return (<></>);
  }

  const slideWidth = 400;
  const slideHeight = 200;
  const totalWidth = slideImagesInfo.length * slideWidth;

  return (
    <>
      <style>
        {`
          @keyframes slideLeft {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-${totalWidth}px);
            }
          }
        `}
      </style>
      <div className="w-full overflow-hidden mb-8 bg-gray-800 rounded-lg shadow-lg">
        <div 
          className="flex"
          style={{
            animation: isReady ? `slideLeft ${totalWidth / 30}s linear infinite` : 'none',
            width: `${totalWidth * 2}px`
          }}
        >
        {/* Render images twice for seamless loop */}
        {[...slideImagesInfo, ...slideImagesInfo]
          .filter(imageInfo => !failedImages.has(imageInfo.id))
          .map((imageInfo, index) => {
          const slideKey = `${imageInfo.id}-${index}`;
          
          return (
            <div
              key={slideKey}
              className="flex-shrink-0 bg-gray-800 shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer relative"
              onClick={() => onImageClick && onImageClick(imageInfo)}
              onMouseEnter={() => setHoveredSlide(slideKey)}
              onMouseLeave={() => setHoveredSlide(null)}
              style={{
                width: `${slideWidth}px`,
                height: `${slideHeight}px`
              }}
            >
              <img
                src={`https://picsum.photos/id/${imageInfo.id}/400/200`}
                alt={`Photo by ${imageInfo.author}`}
                className="w-full h-full object-cover"
                onError={() => {
                  setFailedImages(prev => new Set([...prev, imageInfo.id]));
                }}
              />
              
              {/* Hover overlay */}
              <div 
                className="absolute inset-0 flex items-center justify-center transition-all duration-300"
                style={{
                  backgroundColor: hoveredSlide === slideKey ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
                  opacity: hoveredSlide === slideKey ? 1 : 0
                }}
              >
                <div className="text-white text-center p-4">
                  <div className="text-sm font-semibold mb-1">{imageInfo.width} × {imageInfo.height}px</div>
                  <div className="text-xs">by {imageInfo.author}</div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </>
  );
};

export default AutoSlideshow;