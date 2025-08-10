/**
 * API service functions for photo data fetching
 * Centralized API calls with proper error handling
 */

const API_BASE_URL = 'https://picsum.photos';

/**
 * Fetch paginated list of photos
 */
export const fetchPhotos = async ({ page = 1, limit = 20 } = {}) => {
  const response = await fetch(`${API_BASE_URL}/v2/list?page=${page}&limit=${limit}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch photos: ${response.status} ${response.statusText}`);
  }
  
  const photos = await response.json();
  
  // Transform data to ensure consistent structure
  return photos.map(photo => ({
    ...photo,
    // Add computed properties for better UX
    thumbnailUrl: `${API_BASE_URL}/id/${photo.id}/300/200`,
    previewUrl: `${API_BASE_URL}/id/${photo.id}/800/600`,
    fullUrl: photo.download_url,
    aspectRatio: photo.width / photo.height
  }));
};

/**
 * Fetch detailed information about a specific photo
 */
export const fetchPhotoInfo = async (photoId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/id/${photoId}/info`);
    
    if (!response.ok) {
      // Return fallback data for failed requests
      return {
        id: photoId,
        author: `Photographer ${photoId}`,
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/${photoId}`,
        download_url: `${API_BASE_URL}/id/${photoId}/3000/2000`
      };
    }
    
    return await response.json();
  } catch (error) {
    // Return fallback data for network errors or JSON parsing errors
    return {
      id: photoId,
      author: `Photographer ${photoId}`,
      width: 3000,
      height: 2000,
      url: `${API_BASE_URL}/id/${photoId}`,
      download_url: `${API_BASE_URL}/id/${photoId}/3000/2000`
    };
  }
};

/**
 * Fetch photos for slideshow with specific IDs
 */
export const fetchSlideshowPhotos = async (photoIds = [42, 156, 237, 89, 314, 67, 428, 195, 73, 291]) => {
  // Fetch info for all slideshow images in parallel
  const photoPromises = photoIds.map(async (id) => {
    try {
      const info = await fetchPhotoInfo(id);
      return {
        ...info,
        thumbnailUrl: `${API_BASE_URL}/id/${id}/400/200`,
        previewUrl: `${API_BASE_URL}/id/${id}/800/600`
      };
    } catch (error) {
      // Return fallback data for failed requests
      return {
        id: id,
        author: `Photographer ${id}`,
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/${id}`,
        download_url: `${API_BASE_URL}/id/${id}/3000/2000`,
        thumbnailUrl: `${API_BASE_URL}/id/${id}/400/200`,
        previewUrl: `${API_BASE_URL}/id/${id}/800/600`
      };
    }
  });
  
  const photos = await Promise.all(photoPromises);
  return photos.filter(photo => photo !== null);
};

/**
 * Prefetch image for better UX
 */
export const prefetchImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};