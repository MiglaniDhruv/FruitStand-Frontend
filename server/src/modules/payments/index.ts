import { PaymentRouter } from './routes';

// Export configured router instance for easy integration
export const paymentRouter = new PaymentRouter();

// Export individual components for flexibility
export { PaymentModel } from './model';
export { PaymentController } from './controller';
export { PaymentRouter } from './routes';