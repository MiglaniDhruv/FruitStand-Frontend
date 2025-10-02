import twilio from 'twilio';
import { whatsappConfig } from './config.js';

let clientInstance: ReturnType<typeof twilio> | null = null;

// Initialize Twilio client
function initializeTwilioClient(): ReturnType<typeof twilio> {
  try {
    if (!whatsappConfig.isConfigured()) {
      throw new Error(
        'Twilio WhatsApp configuration is incomplete. Please ensure TWILIO_ACCOUNT_SID, ' +
        'TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM are set in your environment variables.'
      );
    }

    const client = twilio(whatsappConfig.accountSid, whatsappConfig.authToken);
    
    // Test the client by validating credentials format
    if (!whatsappConfig.accountSid.startsWith('AC') || whatsappConfig.accountSid.length !== 34) {
      throw new Error('Invalid Twilio Account SID format. Should start with "AC" and be 34 characters long.');
    }
    
    console.log('✅ Twilio WhatsApp client initialized successfully');
    return client;
    
  } catch (error) {
    console.error('❌ Failed to initialize Twilio WhatsApp client:', error);
    throw new Error(`Failed to initialize Twilio client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get or create Twilio client (singleton pattern)
export function getTwilioClient(): ReturnType<typeof twilio> {
  if (!clientInstance) {
    clientInstance = initializeTwilioClient();
  }
  return clientInstance;
}