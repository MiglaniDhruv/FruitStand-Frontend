import { WhatsAppRouter } from './routes';

// Create and export router instance
export const whatsappRouter = new WhatsAppRouter();

// Export individual components for flexibility
export { WhatsAppMessageModel } from './model';
export { WhatsAppController } from './controller';
export { WhatsAppRouter } from './routes';