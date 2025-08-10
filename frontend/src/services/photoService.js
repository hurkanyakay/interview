import { error as logError, log } from '../utils/logger';

const BASE_URL = 'https://picsum.photos/v2/list';
const LIMIT = 40;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchPhotos = async (page = 0, retryCount = 0) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${BASE_URL}?page=${page}&limit=${LIMIT}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    logError(`Error fetching photos (attempt ${retryCount + 1}):`, error);
    
    // Don't retry HTTP errors (4xx, 5xx status codes) - they're not transient
    if (error.message && error.message.startsWith('HTTP ')) {
      throw error;
    }
    
    // Retry logic for network errors only
    if (retryCount < MAX_RETRIES) {
      log(`Retrying in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
      return fetchPhotos(page, retryCount + 1);
    }
    
    // Final error after all retries
    const errorMessage = error.name === 'AbortError' 
      ? 'Request timeout - please check your connection'
      : error.message || 'Network error - please check your connection';
    
    throw new Error(errorMessage);
  }
};