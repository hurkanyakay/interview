import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import PhotoGallery from './components/PhotoGallery';
import ErrorBoundary from './components/ErrorBoundary';
import { usePersistence } from './hooks/usePersistence';
import { log } from './utils/logger';

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Inner app component to use persistence hooks
function AppContent() {
  const { isHydrated } = usePersistence({
    onCacheLoaded: () => {
      log('Cache loaded successfully');
    },
    onCacheCleared: () => {
      log('Cache cleared by user');
    },
  });

  useEffect(() => {
    document.title = 'Best of Unsplash';
  }, []);

  // Show loading state while cache is rehydrating
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackMessage="Something went wrong with the photo gallery. Please refresh to try again.">
      <div className="min-h-screen relative">
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://picsum.photos/id/154/1920/1080)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px) brightness(0.6)'
        }}
      ></div>
      <div className="relative z-10">
      <header className="shadow-sm border-b border-gray-700" style={{ backgroundColor: 'rgba(31, 41, 55, 0.3)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-6">
            <h1 className="text-xl font-normal text-gray-300" style={{ fontFamily: 'cursive' }}>Best of Unsplash</h1>
          </div>
        </div>
      </header>

      <main>
        <PhotoGallery />
      </main>

      <footer className="border-t border-gray-700 py-8 mt-12" style={{ backgroundColor: 'rgba(31, 41, 55, 0.3)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400 text-sm">
            <p>© 2024 Best of Unsplash Gallery.</p>
          </div>
        </div>
      </footer>
      </div>
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
