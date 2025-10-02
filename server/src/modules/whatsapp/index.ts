import { WhatsAppRouter } from './routes.js';

// Create and export router instance
export const whatsappRouter = new WhatsAppRouter();

// Export individual components for flexibility
export { WhatsAppMessageModel } from './model.js';
export { WhatsAppController } from './controller.js';
export { WhatsAppRouter } from './routes.js';