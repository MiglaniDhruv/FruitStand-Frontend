// Export the main WhatsApp service
export { WhatsAppService, whatsAppService } from './whatsapp-service.js';

// Export utilities for potential use elsewhere
export { formatPhoneForWhatsApp, isValidPhone, extractPhoneNumber } from './phone-formatter.js';
export { 
  buildSalesInvoiceVariables,
  buildPurchaseInvoiceVariables,
  buildPaymentReminderVariables,
  buildPaymentNotificationVariables,
  formatCurrency,
  formatDate,
  type SalesInvoiceVariables,
  type PurchaseInvoiceVariables,
  type PaymentReminderVariables,
  type PaymentNotificationVariables
} from './template-builder.js';

// Export configuration types
export { whatsappConfig, templateMapping, type MessageType } from './config.js';

// Export client getter
export { getTwilioClient } from './client.js';

// Export scheduler functions
export { initializePaymentReminderScheduler, sendPaymentReminders } from './scheduler.js';

// Default export is the service instance
export { whatsAppService as default } from './whatsapp-service.js';