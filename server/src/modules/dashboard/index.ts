import { DashboardRouter } from './routes';

// Export configured router instance for easy integration
export const dashboardRouter = new DashboardRouter();

// Export individual components for flexibility
export { DashboardModel } from './model';
export { DashboardController } from './controller';
export { DashboardRouter } from './routes';