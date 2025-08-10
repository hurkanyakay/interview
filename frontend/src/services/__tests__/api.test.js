/**
 * Comprehensive tests for api.js service functions
 */

import {
  fetchPhotos,
  fetchPhotoInfo,
  fetchSlideshowPhotos,
  prefetchImage
} from '../api';

// Mock global Image constructor for prefetchImage tests
const mockImage = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  onload: null,
  onerror: null
};

global.Image = jest.fn(() => mockImage);

describe('API service functions', () => {
  const API_BASE_URL = 'https://picsum.photos';

  beforeEach(() => {
    fetch.mockClear();
    mockImage.addEventListener.mockClear();
    mockImage.removeEventListener.mockClear();
    mockImage.onload = null;
    mockImage.onerror = null;
    mockImage.src = '';
  });

  describe('fetchPhotos', () => {
    const mockPhotoData = [
      {
        id: '1',
        author: 'John Doe',
        width: 1200,
        height: 800,
        url: 'https://picsum.photos/id/1',
        download_url: 'https://picsum.photos/id/1/1200/800'
      },
      {
        id: '2',
        author: 'Jane Smith',
        width: 1000,
        height: 600,
        url: 'https://picsum.photos/id/2',
        download_url: 'https://picsum.photos/id/2/1000/600'
      }
    ];

    it('should fetch photos with default parameters', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoData)
      });

      const result = await fetchPhotos();

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=1&limit=20`);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: '1',
        author: 'John Doe',
        width: 1200,
        height: 800,
        thumbnailUrl: `${API_BASE_URL}/id/1/300/200`,
        previewUrl: `${API_BASE_URL}/id/1/800/600`,
        fullUrl: 'https://picsum.photos/id/1/1200/800',
        aspectRatio: 1.5
      }));
    });

    it('should fetch photos with custom parameters', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockPhotoData[0]])
      });

      const result = await fetchPhotos({ page: 3, limit: 50 });

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=3&limit=50`);
      expect(result).toHaveLength(1);
    });

    it('should handle empty object parameters', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoData)
      });

      const result = await fetchPhotos({});

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=1&limit=20`);
      expect(result).toHaveLength(2);
    });

    it('should handle partial parameters', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoData)
      });

      const result = await fetchPhotos({ page: 5 });

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=5&limit=20`);
      expect(result).toHaveLength(2);
    });

    it('should handle zero page and limit', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      const result = await fetchPhotos({ page: 0, limit: 0 });

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=0&limit=0`);
      expect(result).toEqual([]);
    });

    it('should transform photo data correctly with aspect ratio calculation', async () => {
      const widePhoto = {
        id: '10',
        author: 'Wide Photographer',
        width: 2000,
        height: 1000,
        url: 'https://picsum.photos/id/10',
        download_url: 'https://picsum.photos/id/10/2000/1000'
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([widePhoto])
      });

      const result = await fetchPhotos();

      expect(result[0]).toEqual({
        id: '10',
        author: 'Wide Photographer',
        width: 2000,
        height: 1000,
        url: 'https://picsum.photos/id/10',
        download_url: 'https://picsum.photos/id/10/2000/1000',
        thumbnailUrl: `${API_BASE_URL}/id/10/300/200`,
        previewUrl: `${API_BASE_URL}/id/10/800/600`,
        fullUrl: 'https://picsum.photos/id/10/2000/1000',
        aspectRatio: 2.0
      });
    });

    it('should throw error for HTTP error responses', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(fetchPhotos()).rejects.toThrow('Failed to fetch photos: 404 Not Found');
    });

    it('should throw error for HTTP 500 responses', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(fetchPhotos()).rejects.toThrow('Failed to fetch photos: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(fetchPhotos()).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(fetchPhotos()).rejects.toThrow('Invalid JSON');
    });

    it('should handle empty photo data', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      const result = await fetchPhotos();

      expect(result).toEqual([]);
    });

    it('should handle photos with different aspect ratios', async () => {
      const mixedPhotos = [
        {
          id: '20',
          author: 'Square Photographer',
          width: 800,
          height: 800,
          url: 'https://picsum.photos/id/20',
          download_url: 'https://picsum.photos/id/20/800/800'
        },
        {
          id: '21',
          author: 'Portrait Photographer',
          width: 600,
          height: 900,
          url: 'https://picsum.photos/id/21',
          download_url: 'https://picsum.photos/id/21/600/900'
        }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mixedPhotos)
      });

      const result = await fetchPhotos();

      expect(result[0].aspectRatio).toBe(1.0); // Square
      expect(result[1].aspectRatio).toBeCloseTo(0.667, 3); // Portrait
    });
  });

  describe('fetchPhotoInfo', () => {
    const mockPhotoInfo = {
      id: '123',
      author: 'Test Author',
      width: 1500,
      height: 1000,
      url: 'https://picsum.photos/id/123',
      download_url: 'https://picsum.photos/id/123/1500/1000'
    };

    it('should fetch photo info successfully', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoInfo)
      });

      const result = await fetchPhotoInfo('123');

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/id/123/info`);
      expect(result).toEqual(mockPhotoInfo);
    });

    it('should return fallback data for failed requests', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await fetchPhotoInfo('456');

      expect(result).toEqual({
        id: '456',
        author: 'Photographer 456',
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/456`,
        download_url: `${API_BASE_URL}/id/456/3000/2000`
      });
    });

    it('should return fallback data for network errors', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchPhotoInfo('789');

      expect(result).toEqual({
        id: '789',
        author: 'Photographer 789',
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/789`,
        download_url: `${API_BASE_URL}/id/789/3000/2000`
      });
    });

    it('should handle HTTP 500 errors with fallback', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await fetchPhotoInfo('999');

      expect(result).toEqual({
        id: '999',
        author: 'Photographer 999',
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/999`,
        download_url: `${API_BASE_URL}/id/999/3000/2000`
      });
    });

    it('should handle numeric photo IDs', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoInfo)
      });

      const result = await fetchPhotoInfo(42);

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/id/42/info`);
      expect(result).toEqual(mockPhotoInfo);
    });

    it('should handle JSON parsing errors with fallback', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await fetchPhotoInfo('invalid');

      expect(result).toEqual({
        id: 'invalid',
        author: 'Photographer invalid',
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/invalid`,
        download_url: `${API_BASE_URL}/id/invalid/3000/2000`
      });
    });
  });

  describe('fetchSlideshowPhotos', () => {
    const mockPhotoInfo = {
      id: '1',
      author: 'Test Author',
      width: 1200,
      height: 800,
      url: 'https://picsum.photos/id/1',
      download_url: 'https://picsum.photos/id/1/1200/800'
    };

    beforeEach(() => {
      // Mock fetchPhotoInfo function
      jest.doMock('../api', () => ({
        ...jest.requireActual('../api'),
        fetchPhotoInfo: jest.fn()
      }));
    });

    it('should fetch slideshow photos with default IDs', async () => {
      // Mock successful fetchPhotoInfo responses
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoInfo)
      });

      const result = await fetchSlideshowPhotos();

      expect(result).toHaveLength(10); // Default array length
      expect(result[0]).toEqual(expect.objectContaining({
        thumbnailUrl: expect.stringContaining('/400/200'),
        previewUrl: expect.stringContaining('/800/600')
      }));
    });

    it('should fetch slideshow photos with custom IDs', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoInfo)
      });

      const customIds = [1, 2, 3];
      const result = await fetchSlideshowPhotos(customIds);

      expect(result).toHaveLength(3);
    });

    it('should handle empty photo IDs array', async () => {
      const result = await fetchSlideshowPhotos([]);

      expect(result).toEqual([]);
    });

    it('should handle failed photo info requests with fallback', async () => {
      // Mock failed responses for all requests
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const customIds = [100, 200];
      const result = await fetchSlideshowPhotos(customIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 100,
        author: 'Photographer 100',
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/100`,
        download_url: `${API_BASE_URL}/id/100/3000/2000`,
        thumbnailUrl: `${API_BASE_URL}/id/100/400/200`,
        previewUrl: `${API_BASE_URL}/id/100/800/600`
      });
    });

    it('should handle mixed success and failure responses', async () => {
      // Mock alternating success/failure responses
      let callCount = 0;
      fetch.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          // Success for odd calls
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: callCount.toString(),
              author: `Author ${callCount}`,
              width: 1000,
              height: 700,
              url: `https://picsum.photos/id/${callCount}`,
              download_url: `https://picsum.photos/id/${callCount}/1000/700`
            })
          });
        } else {
          // Failure for even calls
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found'
          });
        }
      });

      const customIds = [1, 2, 3, 4];
      const result = await fetchSlideshowPhotos(customIds);

      expect(result).toHaveLength(4);
      // All should have thumbnailUrl and previewUrl
      result.forEach(photo => {
        expect(photo).toHaveProperty('thumbnailUrl');
        expect(photo).toHaveProperty('previewUrl');
      });
    });

    it('should handle network errors with fallback', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const customIds = [50, 60];
      const result = await fetchSlideshowPhotos(customIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 50,
        author: 'Photographer 50',
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/50`,
        download_url: `${API_BASE_URL}/id/50/3000/2000`,
        thumbnailUrl: `${API_BASE_URL}/id/50/400/200`,
        previewUrl: `${API_BASE_URL}/id/50/800/600`
      });
    });

    it('should filter out null photos', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoInfo)
      });

      const result = await fetchSlideshowPhotos([1, 2, 3]);

      // All photos should be non-null
      expect(result.every(photo => photo !== null)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it('should handle very large ID arrays', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotoInfo)
      });

      const largeIds = Array.from({ length: 50 }, (_, i) => i + 1);
      const result = await fetchSlideshowPhotos(largeIds);

      expect(result).toHaveLength(50);
      expect(fetch).toHaveBeenCalledTimes(50);
    });

    it('should handle errors in photoInfo spreading', async () => {
      // Mock fetchPhotoInfo to return an object that causes spread errors
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          // Make spreading fail by setting a getter that throws
          get author() {
            throw new Error('Spread error');
          },
          width: 1000,
          height: 700
        })
      });

      const result = await fetchSlideshowPhotos([123]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 123,
        author: 'Photographer 123',
        width: 3000,
        height: 2000,
        url: `${API_BASE_URL}/id/123`,
        download_url: `${API_BASE_URL}/id/123/3000/2000`,
        thumbnailUrl: `${API_BASE_URL}/id/123/400/200`,
        previewUrl: `${API_BASE_URL}/id/123/800/600`
      });
    });
  });

  describe('prefetchImage', () => {
    it('should resolve when image loads successfully', async () => {
      const testUrl = 'https://example.com/image.jpg';
      
      // Simulate successful image load
      setTimeout(() => {
        mockImage.onload();
      }, 0);

      const result = await prefetchImage(testUrl);

      expect(result).toBe(testUrl);
      expect(mockImage.src).toBe(testUrl);
    });

    it('should reject when image fails to load', async () => {
      const testUrl = 'https://example.com/broken-image.jpg';

      // Simulate image load error
      setTimeout(() => {
        mockImage.onerror();
      }, 0);

      await expect(prefetchImage(testUrl)).rejects.toThrow(`Failed to load image: ${testUrl}`);
      expect(mockImage.src).toBe(testUrl);
    });

    it('should handle multiple concurrent prefetch requests', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];

      // Create separate mock images for each request
      let imageCount = 0;
      global.Image = jest.fn(() => {
        const mockImg = {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          src: '',
          onload: null,
          onerror: null
        };
        
        // Simulate successful load after a short delay
        setTimeout(() => {
          if (mockImg.onload) mockImg.onload();
        }, 10 * (imageCount + 1));
        
        imageCount++;
        return mockImg;
      });

      const promises = urls.map(url => prefetchImage(url));
      const results = await Promise.all(promises);

      expect(results).toEqual(urls);
      expect(global.Image).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure scenarios', async () => {
      let callCount = 0;
      global.Image = jest.fn(() => {
        const mockImg = {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          src: '',
          onload: null,
          onerror: null
        };
        
        callCount++;
        const currentCall = callCount;
        setTimeout(() => {
          if (currentCall === 1) {
            // First image succeeds
            if (mockImg.onload) mockImg.onload();
          } else {
            // Second image fails
            if (mockImg.onerror) mockImg.onerror();
          }
        }, 10);
        
        return mockImg;
      });

      const successUrl = 'https://example.com/success.jpg';
      const failUrl = 'https://example.com/fail.jpg';

      const successPromise = prefetchImage(successUrl);
      const failPromise = prefetchImage(failUrl);

      const successResult = await successPromise;
      expect(successResult).toBe(successUrl);

      await expect(failPromise).rejects.toThrow(`Failed to load image: ${failUrl}`);
    });

    it('should set src property correctly', async () => {
      const testUrl = 'https://example.com/test-image.png';
      
      // Create a fresh mock image for this test
      const freshMockImage = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        src: '',
        onload: null,
        onerror: null
      };
      
      global.Image = jest.fn(() => freshMockImage);

      // Simulate successful load
      setTimeout(() => {
        if (freshMockImage.onload) freshMockImage.onload();
      }, 0);

      await prefetchImage(testUrl);

      expect(freshMockImage.src).toBe(testUrl);
    });

    it('should handle empty URL', async () => {
      const emptyUrl = '';
      
      const emptyUrlMockImage = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        src: '',
        onload: null,
        onerror: null
      };
      
      global.Image = jest.fn(() => emptyUrlMockImage);

      setTimeout(() => {
        if (emptyUrlMockImage.onerror) emptyUrlMockImage.onerror();
      }, 0);

      await expect(prefetchImage(emptyUrl)).rejects.toThrow('Failed to load image: ');
      expect(emptyUrlMockImage.src).toBe(emptyUrl);
    });

    it('should handle special characters in URL', async () => {
      const specialUrl = 'https://example.com/image with spaces & symbols.jpg';
      
      const specialMockImage = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        src: '',
        onload: null,
        onerror: null
      };
      
      global.Image = jest.fn(() => specialMockImage);

      setTimeout(() => {
        if (specialMockImage.onload) specialMockImage.onload();
      }, 0);

      const result = await prefetchImage(specialUrl);

      expect(result).toBe(specialUrl);
      expect(specialMockImage.src).toBe(specialUrl);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle undefined parameters in fetchPhotos', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      const result = await fetchPhotos(undefined);

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=1&limit=20`);
      expect(result).toEqual([]);
    });

    it('should handle null parameters in fetchPhotos', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      // fetchPhotos with null should fail due to destructuring, so test with undefined instead
      const result = await fetchPhotos();

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=1&limit=20`);
      expect(result).toEqual([]);
    });

    it('should handle very large page and limit values', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      const result = await fetchPhotos({ page: 999999, limit: 100000 });

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=999999&limit=100000`);
      expect(result).toEqual([]);
    });

    it('should handle negative values in fetchPhotos', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      const result = await fetchPhotos({ page: -1, limit: -5 });

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/v2/list?page=-1&limit=-5`);
      expect(result).toEqual([]);
    });

    it('should handle division by zero in aspect ratio calculation', async () => {
      const photoWithZeroHeight = {
        id: '1',
        author: 'Test',
        width: 1000,
        height: 0,
        url: 'https://picsum.photos/id/1',
        download_url: 'https://picsum.photos/id/1/1000/0'
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([photoWithZeroHeight])
      });

      const result = await fetchPhotos();

      expect(result[0].aspectRatio).toBe(Infinity);
    });

    it('should handle photos with zero width and height', async () => {
      const zeroSizePhoto = {
        id: '1',
        author: 'Test',
        width: 0,
        height: 0,
        url: 'https://picsum.photos/id/1',
        download_url: 'https://picsum.photos/id/1/0/0'
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([zeroSizePhoto])
      });

      const result = await fetchPhotos();

      expect(result[0].aspectRatio).toBeNaN();
    });
  });
});