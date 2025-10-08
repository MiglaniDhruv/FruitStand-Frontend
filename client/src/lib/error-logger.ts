/**
 * Centralized error logging utility for consistent error handling across the application
 */

import { 
  ApiError, 
  NetworkError, 
  TimeoutError, 
  ServerError, 
  ValidationError, 
  AuthError, 
  NotFoundError 
} from './api-errors';

interface ErrorMetadata {
  [key: string]: any;
}

/**
 * Serialize error object for better debugging
 */
function serializeError(error: unknown): Record<string, any> {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    const result: any = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      isRetryable: error.isRetryable,
    };
    
    if (error.originalError) {
      result.originalError = serializeError(error.originalError);
    }
    
    // Include validationErrors for ValidationError
    if (error instanceof ValidationError && error.validationErrors) {
      result.validationErrors = error.validationErrors;
    }
    
    return result;
  }
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    return { ...error };
  }
  
  return { error: String(error) };
}

/**
 * Detect error type for better categorization
 */
function getErrorType(error: unknown): string {
  // Check for custom error classes first
  if (error instanceof NetworkError) return 'NETWORK_ERROR';
  if (error instanceof TimeoutError) return 'TIMEOUT_ERROR';
  if (error instanceof ServerError) return 'SERVER_ERROR';
  if (error instanceof ValidationError) return 'VALIDATION_ERROR';
  if (error instanceof AuthError) return 'AUTH_ERROR';
  if (error instanceof NotFoundError) return 'NOT_FOUND_ERROR';
  if (error instanceof ApiError) return 'API_ERROR';
  
  // Check for standard error types
  if (error instanceof TypeError) return 'TYPE_ERROR';
  if (error instanceof ReferenceError) return 'REFERENCE_ERROR';
  if (error instanceof SyntaxError) return 'SYNTAX_ERROR';
  if (error instanceof Error) {
    if (error.message.includes('fetch')) return 'NETWORK_ERROR';
    if (error.message.includes('validation')) return 'VALIDATION_ERROR';
    if (error.message.includes('API')) return 'API_ERROR';
    return 'RUNTIME_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Main error logging function
 */
export function logError(error: unknown, context: string, metadata?: ErrorMetadata): void {
  const isDevelopment = (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) || process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) return; // Only log in development
  
  const timestamp = new Date().toISOString();
  const errorType = getErrorType(error);
  const serializedError = serializeError(error);
  
  const logEntry = {
    timestamp,
    context,
    errorType,
    error: serializedError,
    metadata,
  };
  
  console.group(`🚨 Error in ${context} [${errorType}]`);
  console.error('Time:', timestamp);
  console.error('Context:', context);
  console.error('Type:', errorType);
  console.error('Error:', error);
  
  if (metadata) {
    console.error('Metadata:', metadata);
  }
  
  if (serializedError.stack) {
    console.error('Stack trace:', serializedError.stack);
  }
  
  console.groupEnd();
}

/**
 * Log API-related errors
 */
export function logApiError(error: unknown, endpoint: string, method: string): void {
  const metadata: any = {
    endpoint,
    method,
    type: 'api_error',
  };
  
  // Add additional metadata for custom error types
  if (error instanceof ApiError) {
    metadata.statusCode = error.statusCode;
    metadata.isRetryable = error.isRetryable;
    metadata.errorCode = error.code;
  }
  
  logError(error, `API_${method}`, metadata);
}

/**
 * Log mutation-related errors
 */
export function logMutationError(error: unknown, mutationName: string): void {
  logError(error, `MUTATION_${mutationName}`, {
    mutationName,
    type: 'mutation_error',
  });
}

/**
 * Log event handler errors
 */
export function logEventHandlerError(error: unknown, handlerName: string, additionalInfo?: any): void {
  logError(error, `EVENT_HANDLER_${handlerName}`, {
    handlerName,
    additionalInfo,
    type: 'event_handler_error',
  });
}

/**
 * Log form submission errors
 */
export function logFormError(error: unknown, formName: string, formData?: any): void {
  logError(error, `FORM_${formName}`, {
    formName,
    formData,
    type: 'form_error',
  });
}

/**
 * Log calculation errors
 */
export function logCalculationError(error: unknown, calculationName: string, inputData?: any): void {
  logError(error, `CALCULATION_${calculationName}`, {
    calculationName,
    inputData,
    type: 'calculation_error',
  });
}

/**
 * Log navigation errors
 */
export function logNavigationError(error: unknown, destination: string): void {
  logError(error, `NAVIGATION_${destination}`, {
    destination,
    type: 'navigation_error',
  });
}