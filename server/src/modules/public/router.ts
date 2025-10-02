import { Router } from 'express';
import { PublicController } from './controller.js';

export class PublicRouter {
  private router = Router();
  private controller = new PublicController();

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes() {
    // Public routes - no authentication middleware
    
    // Health check endpoint
    this.router.get('/health', this.controller.healthCheck.bind(this.controller));
    
    // Get shared invoice by token
    this.router.get('/invoices/:token', this.controller.getSharedInvoice.bind(this.controller));
  }

  getRouter(): Router {
    return this.router;
  }
}

export const publicRouter = new PublicRouter().getRouter();