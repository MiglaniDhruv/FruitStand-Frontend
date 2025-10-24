/**
 * Custom error classes for better error categorization and handling
 */

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public isRetryable: boolean;
  public originalError?: Error;

  constructor(
    message: string,
    statusCode: number = 0,
    code: string = 'UNKNOWN_ERROR',
    originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.isRetryable = false;
    this.originalError = originalError;
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network error occurred', originalError?: Error) {
    super(message, 0, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkError';
    this.isRetryable = true;
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timeout', originalError?: Error) {
    super(message, 408, 'TIMEOUT_ERROR', originalError);
    this.name = 'TimeoutError';
    this.isRetryable = true;
  }
}

export class ServerError extends ApiError {
  constructor(message: string, statusCode: number, originalError?: Error) {
    super(message, statusCode, 'SERVER_ERROR', originalError);
    this.name = 'ServerError';
    // 500, 502, 503, 504 are retryable
    this.isRetryable = [500, 502, 503, 504].includes(statusCode);
  }
}

export class ValidationError extends ApiError {
  public validationErrors?: Record<string, any>;

  constructor(
    message: string = 'Invalid data provided',
    validationErrors?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 400, 'VALIDATION_ERROR', originalError);
    this.name = 'ValidationError';
    this.isRetryable = false;
    this.validationErrors = validationErrors;
  }
}

export class AuthError extends ApiError {
  constructor(message: string, statusCode: 401 | 403, originalError?: Error, code?: string) {
    super(message, statusCode, code || 'AUTH_ERROR', originalError);
    this.name = 'AuthError';
    this.isRetryable = false;
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', originalError?: Error) {
    super(message, 404, 'NOT_FOUND_ERROR', originalError);
    this.name = 'NotFoundError';
    this.isRetryable = false;
  }
}

/**
 * Helper Functions
 */

export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TypeError) {
    const msg = (error.message || '').toLowerCase();
    return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed') || msg.includes('network request');
  }
  return false;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isRetryable;
  }
  // Check for rate limiting errors that are manually marked as retryable
  if (error && typeof error === 'object' && 'isRetryable' in error) {
    return !!(error as any).isRetryable;
  }
  // Check for network errors that aren't wrapped in ApiError yet
  return isNetworkError(error);
}

export function getErrorType(error: unknown): string {
  if (error instanceof NetworkError) return 'network';
  if (error instanceof TimeoutError) return 'timeout';
  if (error instanceof ServerError) return 'server';
  if (error instanceof ValidationError) return 'validation';
  if (error instanceof AuthError) return 'auth';
  if (error instanceof NotFoundError) return 'not_found';
  if (error instanceof ApiError) return 'api';
  return 'unknown';
}