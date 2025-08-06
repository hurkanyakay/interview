import React, { useState, useEffect } from 'react';

const AutoSlideshow = ({ onImageClick }) => {
  // Array of 10 random image IDs
  const slideImageIds = [42, 156, 237, 89, 314, 67, 428, 195, 73, 291];
  
  const [isReady, setIsReady] = useState(false);
  const [slideImagesInfo, setSlideImagesInfo] = useState([]);
  const [loadedImagesCount, setLoadedImagesCount] = useState(0);
  const [hoveredSlide, setHoveredSlide] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());

  useEffect(() => {
    // Fetch info for each slide image
    const fetchSlideImagesInfo = async () => {
      const imageInfoPromises = slideImageIds.map(async (id) => {
        try {
          const response = await fetch(`https://picsum.photos/id/${id}/info`);
          if (!response.ok) throw new Error(`Failed to fetch info for image ${id}`);
          const info = await response.json();
          return info;
        } catch (error) {
          // Return fallback info
          return {
            id: id,
            author: `Photographer ${id}`,
            width: 3000,
            height: 2000,
            url: `https://picsum.photos/id/${id}`,
            download_url: `https://picsum.photos/id/${id}/3000/2000`
          };
        }
      });

      const imageInfos = await Promise.all(imageInfoPromises);
      setSlideImagesInfo(imageInfos);
      
      // Check if images are already cached by service worker
      if ('caches' in window) {
        try {
          const cache = await caches.open('unsplash-images-v1');
          let cachedCount = 0;
          
          for (const imageInfo of imageInfos) {
            const imageUrl = `https://picsum.photos/id/${imageInfo.id}/400/200`;
            const cachedResponse = await cache.match(imageUrl);
            if (cachedResponse) {
              cachedCount++;
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
          
          setIsReady(true);
        } catch (error) {
          // Fallback to regular preloading if cache check fails
          const imagePreloadPromises = imageInfos.map((imageInfo) => {
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
          setIsReady(true);
        }
      } else {
        // No cache API support, use regular preloading
        const imagePreloadPromises = imageInfos.map((imageInfo) => {
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
        setIsReady(true);
      }
    };

    fetchSlideImagesInfo();
  }, []);


  if (!isReady || slideImagesInfo.length === 0) {
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