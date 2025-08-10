/**
 * Environment-based logging utility
 * Controls console output based on environment variables
 */

// Check if logging should be enabled
const isLoggingEnabled = () => {
  // Enable logging in development mode
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Check for explicit showErrors environment variable
  if (process.env.REACT_APP_SHOW_ERRORS === 'true') {
    return true;
  }
  
  // Disable logging in production by default
  return false;
};

const LOGGING_ENABLED = isLoggingEnabled();

/**
 * Conditional console.log
 */
export const log = (...args) => {
  if (LOGGING_ENABLED) {
    console.log(...args);
  }
};

/**
 * Conditional console.warn
 */
export const warn = (...args) => {
  if (LOGGING_ENABLED) {
    console.warn(...args);
  }
};

/**
 * Conditional console.error
 */
export const error = (...args) => {
  if (LOGGING_ENABLED) {
    console.error(...args);
  }
};

/**
 * Always log errors (for critical errors that should never be suppressed)
 */
export const criticalError = (...args) => {
  console.error(...args);
};

/**
 * Log only in development mode
 */
export const devLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

export default {
  log,
  warn,
  error,
  criticalError,
  devLog,
};