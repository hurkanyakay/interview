const CACHE_NAME = 'unsplash-images-v1';

// Slideshow image IDs to pre-cache
const SLIDESHOW_IMAGE_IDS = [42, 156, 237, 89, 314, 67, 428, 195, 73, 291];

// Install event - pre-cache slideshow images
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Pre-cache slideshow images
      const slideshowUrls = SLIDESHOW_IMAGE_IDS.map(id => 
        `https://picsum.photos/id/${id}/400/200`
      );
      
      return cache.addAll(slideshowUrls).then(() => {
        console.log('Successfully pre-cached all slideshow images');
      }).catch(error => {
        console.warn('Failed to pre-cache some slideshow images:', error);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle image caching
self.addEventListener('fetch', event => {
  if (event.request.url.includes('picsum.photos')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            console.log('Serving from cache:', event.request.url);
            return response;
          }
          
          return fetch(event.request).then(fetchResponse => {
            // Only cache successful responses
            if (fetchResponse.status === 200) {
              console.log('Caching new image:', event.request.url);
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(error => {
            console.error('Failed to fetch image:', event.request.url, error);
            throw error;
          });
        });
      })
    );
  }
});