import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest, UserRole } from "../types";

// Enforce JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";

export interface AuthTokenPayload { 
  id: string; 
  username: string; 
  role: UserRole;
  tenantId: string;
}

export interface RefreshTokenPayload {
  id: string;
  username: string;
  tenantId: string;
  tokenVersion: number; // For invalidating tokens
}

export const signToken = (payload: AuthTokenPayload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

export const signRefreshToken = (payload: RefreshTokenPayload) => jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

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

// Permission-based access control
export const requirePermission = (permissions: string[]) => async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Authentication required' });
  }

  try {
    // Import UserModel dynamically to avoid circular dependencies
    const { UserModel } = await import('../modules/users/model');
    const { ROLE_PERMISSIONS } = await import('../../../shared/permissions');
    
    // Get full user data including permissions
    const userModel = new UserModel();
    const user = await userModel.getUserForAuth(req.user.id);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    // Get user permissions (individual permissions override role permissions)
    const userPermissions = user.permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
    
    // Check if user has any of the required permissions
    const hasPermission = permissions.some(permission => userPermissions.includes(permission));
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  } catch (error) {
    console.error('Permission check error:', error);
    return res.status(500).json({ message: 'Server error during permission check' });
  }
};

// Tenant validation middleware - ensures user's tenant is active
export const validateTenant = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // First check if tenant context is already available from slug middleware
  if (req.tenant) {
    // Tenant already validated by slug middleware, skip database query
    if (!req.tenant.isActive) {
      return res.status(403).json({ 
        message: 'Account access is temporarily suspended. Please contact your administrator.' 
      });
    }
    return next();
  }

  // Fall back to JWT-based tenant validation for backward compatibility
  if (!req.user?.tenantId) {
    return res.status(403).json({ message: 'No tenant context found' });
  }

  try {
    // Import TenantModel dynamically to avoid circular dependencies
    const { TenantModel } = await import('../modules/tenants/model');
    
    const tenant = await TenantModel.getTenant(req.user.tenantId);
    if (!tenant || !tenant.isActive) {
      return res.status(403).json({ 
        message: 'Account access is temporarily suspended. Please contact your administrator.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    return res.status(500).json({ message: 'Server error during tenant validation' });
  }
};

// Middleware to attach tenant context for easier access in controllers
export const attachTenantContext = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // First check if tenant context is already available from slug middleware
  if (req.tenant) {
    // Tenant context already set by slug middleware, ensure tenantId is set
    req.tenantId = req.tenant.id;
    return next();
  }

  // Fall back to JWT-based tenant context for backward compatibility
  if (!req.user?.tenantId) {
    return res.status(403).json({ message: 'No tenant context found' });
  }

  try {
    req.tenantId = req.user.tenantId;
    next();
  } catch (error) {
    console.error('Tenant context attachment error:', error);
    return res.status(500).json({ message: 'Server error during tenant context setup' });
  }
};