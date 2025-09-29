import { CrateRouter } from './routes';

// Export configured router instance for easy integration
export const crateRouter = new CrateRouter();

// Export individual components for flexibility
export { CrateModel } from './model';
export { CrateController } from './controller';
export { CrateRouter } from './routes';