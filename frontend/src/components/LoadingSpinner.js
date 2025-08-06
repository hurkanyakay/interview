import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      <span className="text-white font-medium">Loading more photos...</span>
    </div>
  );
};

export default LoadingSpinner;