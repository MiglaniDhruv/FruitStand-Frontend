import { PurchaseInvoiceRouter } from './routes';

// Export configured router instance for easy integration
export const purchaseInvoiceRouter = new PurchaseInvoiceRouter();

// Export individual components for flexibility
export { PurchaseInvoiceModel } from './model';
export { PurchaseInvoiceController } from './controller';
export { PurchaseInvoiceRouter } from './routes';