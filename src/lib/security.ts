'use client';

import type { User, UserRole } from './types';

// Permission checking utilities
export const hasPermission = (
  user: User | null,
  requiredRole: UserRole | UserRole[],
  requiredPermission?: string
): boolean => {
  if (!user) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Check if user has required role
  if (!roles.includes(user.role)) return false;

  // Check specific permission for assistants
  if (requiredPermission && user.role === 'مساعد مدير المكتب') {
    return user.permissions?.[requiredPermission as keyof typeof user.permissions] || false;
  }

  return true;
};

// Data access control
export const canAccessData = (
  user: User | null,
  dataOfficeId?: string,
  dataUserId?: string
): boolean => {
  if (!user) return false;

  // System admin can access everything
  if (user.role === 'مدير النظام') return true;

  // Users can access their own data
  if (dataUserId && user.id === dataUserId) return true;

  // Office-level access
  if (dataOfficeId && user.office_id === dataOfficeId) return true;

  return false;
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

// Phone number validation and formatting
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(05|5)[0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('5')) {
    return '0' + cleaned;
  }
  return cleaned;
};

// National ID validation
export const validateNationalId = (nationalId: string): boolean => {
  const cleaned = nationalId.replace(/\s+/g, '');
  return /^[12][0-9]{9}$/.test(cleaned);
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Rate limiting (client-side)
const rateLimitMap = new Map<string, number>();

export const isRateLimited = (key: string, limitMs: number = 60000): boolean => {
  const now = Date.now();
  const lastCall = rateLimitMap.get(key);
  
  if (lastCall && now - lastCall < limitMs) {
    return true;
  }
  
  rateLimitMap.set(key, now);
  return false;
};

// Session management
export const isSessionValid = (user: User | null): boolean => {
  if (!user) return false;
  
  // Check if user is active
  if (user.status !== 'نشط') return false;
  
  // Check trial period for office managers
  if (user.role === 'مدير المكتب' && user.trialEndsAt) {
    const trialEnd = new Date(user.trialEndsAt);
    if (new Date() > trialEnd) return false;
  }
  
  return true;
};

// Data encryption utilities (for sensitive data)
export const encryptSensitiveData = (data: string): string => {
  // In a real application, use proper encryption
  // This is a simple base64 encoding for demo purposes
  return btoa(data);
};

export const decryptSensitiveData = (encryptedData: string): string => {
  try {
    return atob(encryptedData);
  } catch {
    return '';
  }
};

// Audit logging
export const logUserAction = (
  user: User,
  action: string,
  details?: Record<string, any>
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('User Action:', {
      userId: user.id,
      userName: user.name,
      role: user.role,
      action,
      timestamp: new Date().toISOString(),
      details,
    });
  }
  
  // In production, send to logging service
};