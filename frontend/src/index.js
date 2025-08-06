import React from 'react';
import ReactDOM from 'react-dom';
import './tailwind.css';
import App from './App'; 

ReactDOM.render(<App />, document.getElementById('root'));

// Register service worker for image caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

 