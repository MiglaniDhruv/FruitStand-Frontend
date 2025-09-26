import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest, UserRole } from "../types";

export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthTokenPayload { 
  id: string; 
  username: string; 
  role: UserRole 
}

export const signToken = (payload: AuthTokenPayload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

// Middleware to verify JWT token
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = decoded as AuthTokenPayload;
    next();
  });
};

// Role-based access control
export const requireRole = (roles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role as UserRole)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};