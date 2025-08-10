/**
 * Test utilities for React Query components
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { render } from '@testing-library/react';

/**
 * Create a query client for testing
 */
export const createTestQueryClient = (options = {}) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: 0, // Don't cache in tests
        staleTime: 0, // Always consider data stale in tests
        ...options.queries,
      },
      mutations: {
        retry: false, // Disable retries in tests
        ...options.mutations,
      },
    },
    logger: {
      // Silence query errors in tests
      log: () => {},
      warn: () => {},
      error: () => {},
    },
    ...options,
  });
};

/**
 * Wrapper component that provides QueryClient
 */
export const QueryWrapper = ({ children, queryClient }) => {
  const client = queryClient || createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

/**
 * Custom render function with React Query provider
 */
export const renderWithQuery = (ui, options = {}) => {
  const { queryClient, ...renderOptions } = options;
  const client = queryClient || createTestQueryClient();

  const Wrapper = ({ children }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: client,
  };
};

/**
 * Mock implementations for React Query hooks
 */
export const createMockQueryResult = (data, options = {}) => {
  return {
    data,
    error: null,
    isError: false,
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    refetch: jest.fn(),
    ...options,
  };
};

export const createMockInfiniteQueryResult = (pages, options = {}) => {
  return {
    data: { pages },
    error: null,
    isError: false,
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...options,
  };
};

export const createMockQueryError = (message = 'Test error', options = {}) => {
  return {
    data: undefined,
    error: new Error(message),
    isError: true,
    isLoading: false,
    isSuccess: false,
    isFetching: false,
    refetch: jest.fn(),
    ...options,
  };
};