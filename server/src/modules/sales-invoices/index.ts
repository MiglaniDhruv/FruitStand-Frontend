import { SalesInvoiceRouter } from "./routes";

// Export configured router instance for easy integration
export const salesInvoiceRouter = new SalesInvoiceRouter();

// Export individual components for flexibility
export { SalesInvoiceModel } from "./model";
export { SalesInvoiceController } from "./controller";
export { SalesInvoiceRouter } from "./routes";