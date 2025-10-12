/**
 * Utility for mapping error types to user-friendly messages
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

export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }
  
  if (error instanceof TimeoutError) {
    return "Request timed out. The server is taking too long to respond. Please try again.";
  }
  
  if (error instanceof ServerError) {
    return "Server error occurred. Our team has been notified. Please try again later.";
  }
  
  if (error instanceof ValidationError) {
    // Extract validation message from error or use default
    if (error.validationErrors) {
      const firstError = Object.values(error.validationErrors)[0];
      if (typeof firstError === 'string') {
        return firstError;
      }
    }
    return error.message || "Invalid data provided. Please check your input.";
  }
  
  if (error instanceof AuthError) {
    if (error.statusCode === 401) {
      if (error.code === 'AUTH_TOKEN_EXPIRED') {
        return "Your session has expired. Please log in again.";
      }
      if (error.code === 'AUTH_TOKEN_INVALID') {
        return "Invalid authentication token. Please log in again.";
      }
      return "Your session has expired. Please log in again.";
    }
    if (error.statusCode === 403) {
      return "You don't have permission to perform this action.";
    }
  }
  
  if (error instanceof NotFoundError) {
    return "The requested resource was not found.";
  }
  
  // Fallback for other errors
  if (error instanceof Error) {
    return error.message;
  }
  
  return "An unexpected error occurred. Please try again.";
}

export function getToastConfig(error: unknown): { title: string; description: string; variant: 'destructive' | 'default' } {
  let title = "Error";
  const description = getUserFriendlyMessage(error);
  
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    title = "Connection Error";
  } else if (error instanceof ServerError) {
    title = "Server Error";
  } else if (error instanceof ValidationError) {
    title = "Validation Error";
  } else if (error instanceof AuthError) {
    title = error.statusCode === 401 ? "Authentication Error" : "Access Denied";
  }
  
  return {
    title,
    description,
    variant: 'destructive'
  };
}

export function shouldShowToast(error: unknown, context?: string): boolean {
  // Don't show toast for token expiration errors (handled by redirect to login)
  if (error instanceof AuthError && error.statusCode === 401 && error.code === 'AUTH_TOKEN_EXPIRED') {
    return false;
  }
  
  // Show toast for all other errors by default
  return true;
}