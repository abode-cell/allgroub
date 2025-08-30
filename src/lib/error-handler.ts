'use client';

import { toast } from '@/hooks/use-toast';

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = (error: unknown, context?: string) => {
  console.error(`Error in ${context || 'unknown context'}:`, error);
  
  let message = 'حدث خطأ غير متوقع';
  
  if (error instanceof AppError) {
    message = error.message;
  } else if (error instanceof Error) {
    // Map common error messages to Arabic
    if (error.message.includes('Network')) {
      message = 'خطأ في الاتصال بالشبكة';
    } else if (error.message.includes('Permission')) {
      message = 'ليس لديك صلاحية للقيام بهذا الإجراء';
    } else if (error.message.includes('Not found')) {
      message = 'البيانات المطلوبة غير موجودة';
    } else {
      message = error.message;
    }
  }
  
  toast({
    variant: 'destructive',
    title: 'خطأ',
    description: message,
  });
};

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      return null;
    }
  };
};