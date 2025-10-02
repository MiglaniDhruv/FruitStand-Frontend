import { BaseRouter } from '../../utils/base.js';
import { WhatsAppController } from './controller.js';
import { 
  authenticateToken, 
  validateTenant, 
  attachTenantContext, 
  requirePermission 
} from '../../middleware/auth.js';
import { PERMISSIONS } from '@shared/permissions';

export class WhatsAppRouter extends BaseRouter {
  private whatsAppController: WhatsAppController;

  constructor() {
    super();
    this.whatsAppController = new WhatsAppController();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // POST /whatsapp/send/sales-invoice - Send sales invoice to retailer
    this.router.post(
      '/whatsapp/send/sales-invoice',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requirePermission([PERMISSIONS.SEND_WHATSAPP_MESSAGES]),
      this.whatsAppController.sendSalesInvoice
    );

    // POST /whatsapp/send/purchase-invoice - Send purchase invoice to vendor
    this.router.post(
      '/whatsapp/send/purchase-invoice',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requirePermission([PERMISSIONS.SEND_WHATSAPP_MESSAGES]),
      this.whatsAppController.sendPurchaseInvoice
    );

    // POST /whatsapp/send/payment-reminder - Send payment reminder
    this.router.post(
      '/whatsapp/send/payment-reminder',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requirePermission([PERMISSIONS.SEND_WHATSAPP_MESSAGES]),
      this.whatsAppController.sendPaymentReminder
    );

    // POST /whatsapp/send/payment-notification - Send payment notification
    this.router.post(
      '/whatsapp/send/payment-notification',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requirePermission([PERMISSIONS.SEND_WHATSAPP_MESSAGES]),
      this.whatsAppController.sendPaymentNotification
    );

    // GET /whatsapp/messages - Get paginated message history
    this.router.get(
      '/whatsapp/messages',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requirePermission([PERMISSIONS.VIEW_WHATSAPP_LOGS]),
      this.whatsAppController.getMessageHistory
    );

    // GET /whatsapp/messages/by-reference - Get messages for a specific reference
    this.router.get(
      '/whatsapp/messages/by-reference',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requirePermission([PERMISSIONS.VIEW_WHATSAPP_LOGS]),
      this.whatsAppController.getMessagesByReference
    );

    // POST /whatsapp/preview - Preview message without sending
    this.router.post(
      '/whatsapp/preview',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requirePermission([PERMISSIONS.SEND_WHATSAPP_MESSAGES]),
      this.whatsAppController.previewMessage
    );

    // POST /whatsapp/webhook - Handle Twilio status webhooks (no auth required)
    this.router.post(
      '/whatsapp/webhook',
      this.whatsAppController.handleWebhook
    );
  }
}