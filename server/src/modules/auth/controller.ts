import { Request, Response } from 'express';
import { BaseController } from '../../utils/base';
import { AuthModel } from './model';
import { TenantModel } from '../tenants/model';
import { signToken, signRefreshToken, verifyRefreshToken, type AuthTokenPayload, type RefreshTokenPayload } from '../../middleware/auth';
import { type AuthenticatedRequest, UserRole } from '../../types';
import { loginSchema, refreshTokenSchema } from '@shared/schema';

export class AuthController extends BaseController {
  private authModel: AuthModel;

  constructor() {
    super();
    this.authModel = new AuthModel();
  }

  async login(req: Request, res: Response) {
    try {
      // Validate request body
      const validation = loginSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Invalid request data',
          errors: validation.error.errors
        });
      }

      const { username, password } = validation.data;
      const authReq = req as AuthenticatedRequest;

      // Check if a slug was provided but tenant context is missing
      if ((authReq as any).slugProvided && (!authReq.tenant || !authReq.tenantId)) {
        return res.status(404).json({
          message: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        });
      }

      // Handle case where tenant object exists but tenantId is missing
      if (authReq.tenant && !authReq.tenantId) {
        return res.status(400).json({
          message: 'Invalid tenant context',
          code: 'INVALID_TENANT_CONTEXT'
        });
      }

      // Check for tenant context from slug middleware
      if (authReq.tenant && authReq.tenantId) {
        // Tenant-specific login (/{slug}/login)
        console.log(`Tenant-specific login attempt for user ${username} in tenant ${authReq.tenant.slug}`);

        const authResult = await this.authModel.authenticateUserWithTenant(username, password, authReq.tenantId);
        
        if (!authResult.success) {
          if (authResult.error === 'USER_NOT_IN_TENANT') {
            return res.status(403).json({
              message: 'User not authorized for this tenant',
              error: 'You are not authorized to access this organization'
            });
          }
          if (authResult.error === 'TENANT_INACTIVE') {
            return res.status(403).json({
              message: 'Account access is temporarily suspended. Please contact your administrator.'
            });
          }
          return res.status(401).json({
            message: 'Invalid username or password'
          });
        }

        const user = authResult.user!;

        // Validate user role conforms to UserRole enum
        const validRoles = Object.values(UserRole);
        if (!validRoles.includes(user.role as UserRole)) {
          console.error(`Invalid role for user ${user.id}: ${user.role}`);
          return res.status(500).json({
            message: 'User has invalid role configuration'
          });
        }

        // Generate JWT access token with tenant context
        const tokenPayload: AuthTokenPayload = {
          id: user.id,
          username: user.username,
          role: user.role as UserRole,
          tenantId: authReq.tenantId
        };
        
        const token = signToken(tokenPayload);

        // Generate refresh token
        const refreshTokenPayload: RefreshTokenPayload = {
          id: user.id,
          username: user.username,
          tenantId: authReq.tenantId,
          tokenVersion: 1
        };
        
        const refreshToken = signRefreshToken(refreshTokenPayload);

        // Set refresh token as HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        console.log(`Successful tenant login for user ${username} in tenant ${authReq.tenant.slug}`);

        return res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            tenantId: authReq.tenantId,
            permissions: user.permissions
          }
        });
      } else {
        // No tenant context - require tenant for all logins in tenant-only system
        return res.status(400).json({
          message: 'Tenant context required',
          error: 'Please access this page through your organization URL'
        });
      }
    } catch (error) {
      this.handleError(res, error, 'Authentication failed');
    }
  }

  async logout(req: Request, res: Response) {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // Log the logout action for audit purposes
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        console.log(`User ${authReq.user.username} logged out at ${new Date().toISOString()}`);
      }

      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Logout failed');
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user) {
        return res.status(401).json({
          message: 'No authenticated user found'
        });
      }

      // Get fresh user data from database
      const user = await this.authModel.getUserForToken(authReq.user.id);
      
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          permissions: user.permissions
        }
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to get current user');
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      // Get refresh token from HttpOnly cookie
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          message: 'Refresh token not found'
        });
      }

      // Verify refresh token
      let refreshPayload: RefreshTokenPayload;
      try {
        refreshPayload = verifyRefreshToken(refreshToken);
      } catch (error) {
        // Clear invalid refresh token cookie
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        return res.status(401).json({
          message: 'Invalid refresh token'
        });
      }

      // Validate user still exists
      const userExists = await this.authModel.validateUserExists(refreshPayload.id);
      
      if (!userExists) {
        // Clear refresh token cookie for non-existent user
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        return res.status(401).json({
          message: 'User no longer exists'
        });
      }

      // Get fresh user data
      const user = await this.authModel.getUserForToken(refreshPayload.id);
      
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      // Validate tenant status before issuing new access token
      const tenant = await TenantModel.getTenant(user.tenantId);
      if (!tenant || !tenant.isActive) {
        return res.status(403).json({
          message: 'Account access is temporarily suspended. Please contact your administrator.'
        });
      }

      // Validate user role conforms to UserRole enum
      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(user.role as UserRole)) {
        console.error(`Invalid role for user ${user.id}: ${user.role}`);
        return res.status(500).json({
          message: 'User has invalid role configuration'
        });
      }

      // Generate new access token
      const tokenPayload: AuthTokenPayload = {
        id: user.id,
        username: user.username,
        role: user.role as UserRole,
        tenantId: user.tenantId
      };
      
      const token = signToken(tokenPayload);

      // Return new access token and user data
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          permissions: user.permissions
        }
      });
    } catch (error) {
      this.handleError(res, error, 'Token refresh failed');
    }
  }

  async switchTenant(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          message: 'Tenant ID is required',
          code: 'MISSING_TENANT_ID'
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Verify the tenant exists and is active
      const tenant = await TenantModel.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({
          message: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        });
      }

      if (!tenant.isActive) {
        return res.status(403).json({
          message: 'Tenant is not active',
          code: 'TENANT_INACTIVE'
        });
      }

      // In tenant-only system, users can only access their own tenant
      // Remove tenant switching capability as each user belongs to one tenant
      return res.status(403).json({
        message: 'Tenant switching not available in tenant-only system',
        code: 'FEATURE_NOT_AVAILABLE'
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to switch tenant');
    }
  }
}