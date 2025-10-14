import { ReportRouter } from './routes.js';

// Export configured router instance for easy integration
export const reportRouter = new ReportRouter();

// Export individual components for flexibility
export { ReportModel } from './model.js';
export { ReportController } from './controller.js';
export { ReportRouter } from './routes.js';