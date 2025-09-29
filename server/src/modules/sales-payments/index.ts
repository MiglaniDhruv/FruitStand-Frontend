import { SalesPaymentRouter } from "./routes";

// Export configured router instance for easy integration
export const salesPaymentRouter = new SalesPaymentRouter();

// Export individual components for flexibility
export { SalesPaymentModel } from "./model";
export { SalesPaymentController } from "./controller";
export { SalesPaymentRouter } from "./routes";