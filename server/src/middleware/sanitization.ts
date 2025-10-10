import { Request, Response, NextFunction } from 'express';

function sanitizeString(value: any): any {
  if (value == null) return value; // preserve null/undefined
  if (typeof value !== 'string') return value;
  let s = value.trim().replace(/\0|\x00/g, '');
  // minimal escaping (avoid escaping '/')
  s = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  return s;
}

function sanitizeObject(obj: any): any {
  // Returns the value as-is if it's null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // If it's a string, apply sanitizeString
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  // If it's an array, recursively sanitize each element
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  // If it's an object, recursively sanitize each property value
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      // Prevent prototype pollution by checking hasOwnProperty
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  // Return primitive values as-is (numbers, booleans, etc.)
  return obj;
}

// Export sanitizeParam for individual parameter sanitization
export const sanitizeParam = (value: any): any => {
  return sanitizeString(value);
};

// Basic sanitization - note that Drizzle ORM provides SQL injection protection
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize req.body if it exists
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize req.query if it exists
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize req.params if it exists
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  // Call next() to continue the middleware chain
  next();
};