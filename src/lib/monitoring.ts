'use client';

// Performance monitoring
export const trackPageView = (page: string) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // In production, integrate with analytics service
    console.log('Page view:', page);
  }
};

export const trackUserAction = (action: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // In production, integrate with analytics service
    console.log('User action:', action, properties);
  }
};

// Error tracking
export const trackError = (error: Error, context?: string) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // In production, send to error tracking service
    console.error('Tracked error:', error, context);
  }
};

// Performance metrics
export const measureWebVitals = (metric: any) => {
  if (process.env.NODE_ENV === 'production') {
    // In production, send to analytics service
    console.log('Web Vital:', metric);
  }
};

// User session tracking
export const trackUserSession = (userId: string, action: 'login' | 'logout') => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // In production, track user sessions
    console.log('User session:', userId, action);
  }
};