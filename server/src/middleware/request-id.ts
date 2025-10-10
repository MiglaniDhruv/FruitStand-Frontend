import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { AuthenticatedRequest } from '../types';

export const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
  let requestId = String(req.headers['x-request-id'] ?? '')
    .trim();
  const safeRe = /^[A-Za-z0-9_-]{1,64}$/;
  if (!safeRe.test(requestId)) {
    requestId = nanoid(12);
  }
  (req as AuthenticatedRequest).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};