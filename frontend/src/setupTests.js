import '@testing-library/jest-dom/extend-expect';

// Mock fetch
global.fetch = jest.fn();

// Mock Image constructor for image preloading tests
global.Image = class {
  constructor() {
    setTimeout(() => {
      this.onload && this.onload();
    }, 0);
  }
  set src(value) {
    this._src = value;
    // Trigger onload or onerror based on src
    setTimeout(() => {
      if (this._src && this._src.includes('error')) {
        this.onerror && this.onerror();
      } else {
        this.onload && this.onload();
      }
    }, 0);
  }
  get src() {
    return this._src;
  }
};

// Mock caches for service worker
global.caches = {
  open: jest.fn().mockResolvedValue({
    match: jest.fn().mockResolvedValue(null),
    put: jest.fn().mockResolvedValue(),
  }),
};

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};