import { fetchPhotos } from '../photoService';

// Mock setTimeout to speed up tests
const originalSetTimeout = global.setTimeout;

describe('photoService', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Speed up delays for testing
    global.setTimeout = (fn, delay) => originalSetTimeout(fn, 1);
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
  });

  describe('fetchPhotos', () => {
    it('should fetch photos successfully', async () => {
      const mockPhotos = [
        { id: 1, author: 'Test Author', width: 800, height: 600 }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhotos),
      });

      const result = await fetchPhotos(1);

      expect(fetch).toHaveBeenCalledWith(
        'https://picsum.photos/v2/list?page=1&limit=40',
        expect.objectContaining({
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
      );
      expect(result).toEqual(mockPhotos);
    });

    it('should use default page 0 when no page specified', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await fetchPhotos();

      expect(fetch).toHaveBeenCalledWith(
        'https://picsum.photos/v2/list?page=0&limit=40',
        expect.any(Object)
      );
      expect(result).toEqual([]);
    });

    it('should handle HTTP errors without retry', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchPhotos(1)).rejects.toThrow('HTTP 500: Internal Server Error');
      expect(fetch).toHaveBeenCalledTimes(1); // No retry on HTTP errors
    });

    it('should handle timeout errors', async () => {
      const mockAbortController = {
        abort: jest.fn(),
        signal: { aborted: false }
      };
      global.AbortController = jest.fn(() => mockAbortController);

      fetch.mockRejectedValue({ name: 'AbortError' });

      await expect(fetchPhotos(1)).rejects.toThrow('Request timeout - please check your connection');
    });

    it('should retry network errors', async () => {
      const mockPhotos = [{ id: 1, author: 'Test', width: 800, height: 600 }];
      
      // Fail once then succeed
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockPhotos),
        });

      const result = await fetchPhotos(1);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockPhotos);
    });

    it('should fail after max retries', async () => {
      fetch.mockRejectedValue(new Error('Persistent error'));

      await expect(fetchPhotos(1)).rejects.toThrow('Persistent error');
      expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should handle errors without messages', async () => {
      fetch.mockRejectedValue(new Error()); // No message

      await expect(fetchPhotos(1)).rejects.toThrow('Network error - please check your connection');
    });

    it('should handle network errors with exponential backoff', async () => {
      const mockPhotos = [{ id: 1, author: 'Test', width: 800, height: 600 }];
      
      // Fail twice then succeed
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockPhotos),
        });

      const result = await fetchPhotos(1);
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockPhotos);
    });

    it('should handle json parsing errors', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('JSON parse error'))
      });

      await expect(fetchPhotos(1)).rejects.toThrow('JSON parse error');
    });

    it('should include signal in fetch call for timeout handling', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      await fetchPhotos(1);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(Object)
        })
      );
    });

    it('should handle clearTimeout correctly on successful response', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      await fetchPhotos(1);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });
  });
});