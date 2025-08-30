'use client';

// Performance monitoring utilities
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Performance: ${name} took ${end - start} milliseconds`);
  }
};

// Debounce utility for search and input handling
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for API calls
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization utility
export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
};

// Lazy loading utility for components
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  return React.lazy(importFn);
};

// Virtual scrolling helper for large lists
export const calculateVisibleItems = (
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  totalItems: number
) => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    totalItems
  );
  
  return { startIndex, endIndex };
};

// Image optimization
export const optimizeImageUrl = (url: string, width?: number, height?: number): string => {
  if (!url.includes('pexels.com') && !url.includes('placehold.co')) {
    return url;
  }
  
  // Add optimization parameters for supported services
  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  
  return params.toString() ? `${url}?${params.toString()}` : url;
};

// Bundle size optimization
export const loadComponentAsync = async <T>(
  componentLoader: () => Promise<T>
): Promise<T> => {
  try {
    return await componentLoader();
  } catch (error) {
    console.error('Failed to load component:', error);
    throw error;
  }
};

// Memory management
export const cleanupResources = (resources: (() => void)[]): void => {
  resources.forEach(cleanup => {
    try {
      cleanup();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`Component ${componentName} was mounted for ${end - start}ms`);
      }
    };
  }, [componentName]);
};

import React from 'react';