/**
 * Structured error logging utility with context and appropriate severity levels
 */

import { AppError } from '../types';

export interface ErrorContext {
  userId?: string;
  tenantId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  body?: any;
  query?: any;
  params?: any;
  ip?: string;
  userAgent?: string;
}

export function logError(error: Error, context?: ErrorContext): void {
  const logLevel = getLogLevel(error);
  const logData = formatErrorForLogging(error, context);

  switch (logLevel) {
    case 'ERROR':
      console.error(logData);
      break;
    case 'WARN':
      console.warn(logData);
      break;
    case 'INFO':
      console.log(logData);
      break;
    default:
      console.log(logData);
  }
}

export function getLogLevel(error: Error): 'ERROR' | 'WARN' | 'INFO' {
  if (error instanceof AppError) {
    // Programming errors (non-operational) should be ERROR level
    if (!error.isOperational) {
      return 'ERROR';
    }
    
    // 5xx errors are ERROR level
    if (error.statusCode >= 500) {
      return 'ERROR';
    }
    
    // 4xx errors are INFO level (client errors)
    if (error.statusCode >= 400) {
      return 'INFO';
    }
    
    // Operational errors are WARN level
    return 'WARN';
  }
  
  // Unknown errors are ERROR level
  return 'ERROR';
}

export function formatErrorForLogging(error: Error, context?: ErrorContext): any {
  const isProduction = process.env.NODE_ENV === 'production';
  const timestamp = new Date().toISOString();
  
  const baseLog = {
    timestamp,
    name: error.name,
    message: error.message,
  };

  // Add AppError specific fields
  if (error instanceof AppError) {
    Object.assign(baseLog, {
      statusCode: error.statusCode,
      code: error.code,
      isOperational: error.isOperational,
      details: error.details,
    });
  }

  // Add stack trace for ERROR level or development
  if (getLogLevel(error) === 'ERROR' || !isProduction) {
    Object.assign(baseLog, {
      stack: error.stack,
    });
  }

  // Add context information
  if (context) {
    const sanitizedContext = {
      userId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      query: sanitizeRequestBody(context.query),
      params: sanitizeRequestBody(context.params),
      ip: context.ip,
      userAgent: context.userAgent,
      body: sanitizeRequestBody(context.body),
    };

    Object.assign(baseLog, {
      context: sanitizedContext,
    });
  }

  // Format for console output
  if (isProduction) {
    // JSON format for log aggregation in production
    return JSON.stringify(baseLog);
  } else {
    // Pretty format for development
    return baseLog;
  }
}

export function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'auth',
    'credential',
  ];

  const sanitized = { ...body };

  // Recursively sanitize nested objects
  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        result[key] = sanitizeObject(value);
      } else if (typeof value === 'string' && value.length > 1000) {
        // Truncate very long strings
        result[key] = value.substring(0, 1000) + '... [TRUNCATED]';
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return sanitizeObject(sanitized);
}