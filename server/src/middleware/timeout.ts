import { Request, Response, NextFunction } from 'express';
import { TimeoutError } from '../types';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export const requestTimeout = (timeoutMs?: number) => {
  const envMs = Number(process.env.REQUEST_TIMEOUT_MS);
  const timeout = Number.isFinite(envMs) && envMs > 0
    ? envMs
    : (typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT);
  
  return (req: Request, res: Response, next: NextFunction) => {
    const onTimeout = () => {
      if (!res.headersSent) {
        res.setHeader('Connection', 'close');
        req.destroy?.();
        next(new TimeoutError('Request exceeded timeout limit'));
      }
    };
    const timeoutId = setTimeout(onTimeout, timeout);
    
    // Clear the timeout when the response finishes
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    
    // Clear the timeout when the response closes
    res.on('close', () => {
      clearTimeout(timeoutId);
    });
    
    // Continue to next middleware
    next();
  };
};