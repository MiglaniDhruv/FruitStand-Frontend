import { RetailerRouter } from './routes';

// Export configured router instance for easy integration
export const retailerRouter = new RetailerRouter();

// Export individual components for flexibility
export { RetailerModel } from './model';
export { RetailerController } from './controller';
export { RetailerRouter } from './routes';