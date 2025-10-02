import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables definition
const requiredVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM'
] as const;

const optionalVars = [
  'TWILIO_TEMPLATE_SALES_INVOICE',
  'TWILIO_TEMPLATE_PURCHASE_INVOICE',
  'TWILIO_TEMPLATE_PAYMENT_REMINDER',
  'TWILIO_TEMPLATE_PAYMENT_NOTIFICATION'
] as const;

// Validation logic
function validateEnvironment() {
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required WhatsApp environment variables: ${missing.join(', ')}. ` +
      'Please check your environment configuration and ensure all Twilio WhatsApp settings are provided.'
    );
  }
  
  if (missing.length > 0) {
    console.warn(
      `⚠️  WhatsApp service running in development mode without required variables: ${missing.join(', ')}`
    );
  }
}

// Validate environment on import
validateEnvironment();

// Configuration interface
interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  whatsappFrom: string;
  templates: {
    salesInvoice: string;
    purchaseInvoice: string;
    paymentReminder: string;
    paymentNotification: string;
  };
  isConfigured: () => boolean;
  hasTemplate: (templateType: string) => boolean;
}

// Export configuration object
export const whatsappConfig: WhatsAppConfig = {
  // Twilio credentials
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
  
  // Template ContentSids
  templates: {
    salesInvoice: process.env.TWILIO_TEMPLATE_SALES_INVOICE || '',
    purchaseInvoice: process.env.TWILIO_TEMPLATE_PURCHASE_INVOICE || '',
    paymentReminder: process.env.TWILIO_TEMPLATE_PAYMENT_REMINDER || '',
    paymentNotification: process.env.TWILIO_TEMPLATE_PAYMENT_NOTIFICATION || ''
  },
  
  // Validation helpers
  isConfigured() {
    return !!(this.accountSid && this.authToken && this.whatsappFrom);
  },
  
  hasTemplate(templateType: string) {
    return !!(this.templates as any)[templateType];
  }
};

// Template mapping for easy lookup
export const templateMapping = {
  'sales_invoice': whatsappConfig.templates.salesInvoice,
  'purchase_invoice': whatsappConfig.templates.purchaseInvoice,
  'payment_reminder': whatsappConfig.templates.paymentReminder,
  'payment_notification': whatsappConfig.templates.paymentNotification
} as const;

export type MessageType = keyof typeof templateMapping;