import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import twilio from 'twilio';
const { validateRequest } = twilio;
import { BaseController } from '../../utils/base.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { WhatsAppMessageModel } from './model.js';
import { whatsAppService } from '../../services/whatsapp/index.js';

export class WhatsAppController extends BaseController {
  private whatsAppMessageModel: WhatsAppMessageModel;

  constructor() {
    super();
    this.whatsAppMessageModel = new WhatsAppMessageModel();
  }

  /**
   * Send sales invoice via WhatsApp
   */
  sendSalesInvoice = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      
      // Validate request body
      const bodySchema = z.object({
        invoiceId: z.string().uuid('Invalid invoice ID format')
      });
      
      const { invoiceId } = bodySchema.parse(req.body);
      
      // Consumes 1 WhatsApp credit. Returns 403 if insufficient credits.
      const result = await whatsAppService.sendSalesInvoice(tenantId, invoiceId);
      
      res.status(200).json({
        success: true,
        message: 'Sales invoice sent via WhatsApp successfully',
        data: result,
        creditWarning: result.creditMetadata?.lowCreditWarning ? 'Credit balance is low' : undefined,
        remainingCredits: result.creditMetadata?.remainingCredits
      });
      
    } catch (error: any) {
      if (error.message.includes('Insufficient') || error.message.includes('credits')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      
      if (error.message.includes('Invalid phone number') || error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      this.handleError(res, error);
    }
  };

  /**
   * Send purchase invoice via WhatsApp
   */
  sendPurchaseInvoice = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      
      // Validate request body
      const bodySchema = z.object({
        invoiceId: z.string().uuid('Invalid invoice ID format')
      });
      
      const { invoiceId } = bodySchema.parse(req.body);
      
      // Consumes 1 WhatsApp credit. Returns 403 if insufficient credits.
      const result = await whatsAppService.sendPurchaseInvoice(tenantId, invoiceId);
      
      res.status(200).json({
        success: true,
        message: 'Purchase invoice sent via WhatsApp successfully',
        data: result,
        creditWarning: result.creditMetadata?.lowCreditWarning ? 'Credit balance is low' : undefined,
        remainingCredits: result.creditMetadata?.remainingCredits
      });
      
    } catch (error: any) {
      if (error.message.includes('Insufficient') || error.message.includes('credits')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      
      if (error.message.includes('Invalid phone number') || error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      this.handleError(res, error);
    }
  };

  /**
   * Send payment reminder via WhatsApp
   */
  sendPaymentReminder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      
      // Validate request body
      const bodySchema = z.object({
        invoiceId: z.string().uuid('Invalid invoice ID format'),
        invoiceType: z.enum(['sales', 'purchase'], { 
          errorMap: () => ({ message: 'Invoice type must be either "sales" or "purchase"' })
        })
      });
      
      const { invoiceId, invoiceType } = bodySchema.parse(req.body);
      
      // Consumes 1 WhatsApp credit. Returns 403 if insufficient credits.
      const result = await whatsAppService.sendPaymentReminder(tenantId, invoiceId, invoiceType);
      
      res.status(200).json({
        success: true,
        message: 'Payment reminder sent via WhatsApp successfully',
        data: result,
        creditWarning: result.creditMetadata?.lowCreditWarning ? 'Credit balance is low' : undefined,
        remainingCredits: result.creditMetadata?.remainingCredits
      });
      
    } catch (error: any) {
      if (error.message.includes('Insufficient') || error.message.includes('credits')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      
      if (error.message.includes('Invalid phone number') || error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      this.handleError(res, error);
    }
  };

  /**
   * Send payment notification via WhatsApp
   */
  sendPaymentNotification = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      
      // Validate request body
      const bodySchema = z.object({
        paymentId: z.string().uuid('Invalid payment ID format'),
        paymentType: z.enum(['sales', 'purchase'], {
          errorMap: () => ({ message: 'Payment type must be either "sales" or "purchase"' })
        })
      });
      
      const { paymentId, paymentType } = bodySchema.parse(req.body);
      
      // Consumes 1 WhatsApp credit. Returns 403 if insufficient credits.
      const result = await whatsAppService.sendPaymentNotification(tenantId, paymentId, paymentType);
      
      res.status(200).json({
        success: true,
        message: 'Payment notification sent via WhatsApp successfully',
        data: result,
        creditWarning: result.creditMetadata?.lowCreditWarning ? 'Credit balance is low' : undefined,
        remainingCredits: result.creditMetadata?.remainingCredits
      });
      
    } catch (error: any) {
      if (error.message.includes('Insufficient') || error.message.includes('credits')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      
      if (error.message.includes('Invalid phone number') || error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      this.handleError(res, error);
    }
  };

  /**
   * Get paginated message history
   */
  getMessageHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      
      // Get pagination options from base controller
      const paginationOptions = this.getPaginationOptions(req.query);
      
      // Extract optional filters from query
      const { status, messageType, recipientType, search } = req.query;
      
      const filters = {
        ...(status && { status: status as string }),
        ...(messageType && { messageType: messageType as string }),
        ...(recipientType && { recipientType: recipientType as string }),
        ...(search && { search: search as string })
      };
      
      // Get paginated messages
      const result = await WhatsAppMessageModel.getMessagesPaginated(tenantId, {
        ...paginationOptions,
        ...filters
      });
      
      this.sendPaginatedResponse(res, result.data, result.pagination);
      
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Get messages by reference (invoice/payment)
   */
  getMessagesByReference = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      
      // Validate query params
      const querySchema = z.object({
        referenceType: z.string().min(1, 'Reference type is required'),
        referenceId: z.string().uuid('Invalid reference ID format')
      });
      
      const { referenceType, referenceId } = querySchema.parse(req.query);
      
      // Get messages by reference
      const messages = await WhatsAppMessageModel.getMessagesByReference(
        tenantId, 
        referenceType, 
        referenceId
      );
      
      res.status(200).json({
        success: true,
        data: messages
      });
      
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Preview message content without sending
   */
  previewMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      
      // Validate request body
      const bodySchema = z.object({
        messageType: z.enum(['sales_invoice', 'purchase_invoice', 'payment_reminder', 'payment_notification']),
        referenceId: z.string().uuid('Invalid reference ID format'),
        // For payment reminders, we need to specify invoice type
        invoiceType: z.enum(['sales', 'purchase']).optional(),
        // For payment notifications, we need to specify payment type
        paymentType: z.enum(['sales', 'purchase']).optional()
      });
      
      const { messageType, referenceId, invoiceType, paymentType } = bodySchema.parse(req.body);
      
      let templateVariables: any;
      let recipientInfo: any;
      let referenceData: any;
      
      if (messageType === 'sales_invoice') {
        // Mirror logic from sendSalesInvoice method
        const salesInvoiceModel = new (await import('../../modules/sales-invoices/model.js')).SalesInvoiceModel();
        const invoice = await salesInvoiceModel.getSalesInvoice(tenantId, referenceId);
        
        if (!invoice) {
          throw new Error('Sales invoice not found');
        }
        
        if (!invoice.retailer) {
          throw new Error('Retailer information not found for invoice');
        }
        
        const { buildSalesInvoiceVariables } = await import('../../services/whatsapp/template-builder.js');
        templateVariables = buildSalesInvoiceVariables(invoice, invoice.retailer);
        
        recipientInfo = {
          name: invoice.retailer.name,
          phone: invoice.retailer.phone,
          type: 'retailer'
        };
        
        referenceData = {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          totalAmount: invoice.totalAmount
        };
        
      } else if (messageType === 'purchase_invoice') {
        // Mirror logic from sendPurchaseInvoice method
        const purchaseInvoiceModel = new (await import('../../modules/purchase-invoices/model.js')).PurchaseInvoiceModel();
        const invoice = await purchaseInvoiceModel.getPurchaseInvoice(tenantId, referenceId);
        
        if (!invoice) {
          throw new Error('Purchase invoice not found');
        }
        
        if (!invoice.vendor) {
          throw new Error('Vendor information not found for invoice');
        }
        
        const { buildPurchaseInvoiceVariables } = await import('../../services/whatsapp/template-builder.js');
        templateVariables = buildPurchaseInvoiceVariables(invoice, invoice.vendor);
        
        recipientInfo = {
          name: invoice.vendor.name,
          phone: invoice.vendor.phone,
          type: 'vendor'
        };
        
        referenceData = {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          netAmount: invoice.netAmount
        };
        
      } else if (messageType === 'payment_reminder') {
        // Mirror logic from sendPaymentReminder method
        if (!invoiceType) {
          throw new Error('Invoice type is required for payment reminders');
        }
        
        let invoice: any;
        let recipient: any;
        let recipientType: 'vendor' | 'retailer';
        
        if (invoiceType === 'sales') {
          const salesInvoiceModel = new (await import('../../modules/sales-invoices/model.js')).SalesInvoiceModel();
          invoice = await salesInvoiceModel.getSalesInvoice(tenantId, referenceId);
          recipient = invoice?.retailer;
          recipientType = 'retailer';
        } else {
          const purchaseInvoiceModel = new (await import('../../modules/purchase-invoices/model.js')).PurchaseInvoiceModel();
          invoice = await purchaseInvoiceModel.getPurchaseInvoice(tenantId, referenceId);
          recipient = invoice?.vendor;
          recipientType = 'vendor';
        }
        
        if (!invoice) {
          throw new Error(`${invoiceType} invoice not found`);
        }
        
        if (!recipient) {
          throw new Error(`${recipientType} information not found for invoice`);
        }
        
        const { buildPaymentReminderVariables } = await import('../../services/whatsapp/template-builder.js');
        templateVariables = buildPaymentReminderVariables(invoice, recipient, recipientType);
        
        recipientInfo = {
          name: recipient.name,
          phone: recipient.phone,
          type: recipientType
        };
        
        referenceData = {
          invoiceNumber: invoice.invoiceNumber,
          balanceAmount: invoice.balanceAmount
        };
        
      } else if (messageType === 'payment_notification') {
        // Mirror logic from sendPaymentNotification method
        if (!paymentType) {
          throw new Error('Payment type is required for payment notifications');
        }
        
        let payments: any[];
        let recipientType: 'vendor' | 'retailer';
        
        if (paymentType === 'sales') {
          const salesPaymentModel = new (await import('../../modules/sales-payments/model.js')).SalesPaymentModel();
          payments = await salesPaymentModel.getSalesPayments(tenantId, true) as any[];
          recipientType = 'retailer';
        } else {
          const paymentModel = new (await import('../../modules/payments/model.js')).PaymentModel();
          payments = await paymentModel.getPayments(tenantId);
          recipientType = 'vendor';
        }
        
        const payment = payments.find(p => p.id === referenceId);
        if (!payment) {
          throw new Error(`${paymentType} payment not found`);
        }
        
        const invoice = payment.invoice;
        const recipient = paymentType === 'sales' ? payment.retailer : payment.vendor;
        
        if (!invoice) {
          throw new Error('Invoice information not found for payment');
        }
        
        if (!recipient) {
          throw new Error(`${recipientType} information not found for payment`);
        }
        
        const { buildPaymentNotificationVariables } = await import('../../services/whatsapp/template-builder.js');
        templateVariables = buildPaymentNotificationVariables(payment, invoice, recipient);
        
        recipientInfo = {
          name: recipient.name,
          phone: recipient.phone,
          type: recipientType
        };
        
        referenceData = {
          paymentAmount: payment.amount,
          paymentDate: payment.paymentDate,
          invoiceNumber: invoice.invoiceNumber
        };
      }
      
      res.status(200).json({
        success: true,
        message: 'Message preview generated successfully',
        data: {
          messageType,
          templateVariables,
          recipientInfo,
          referenceData,
          preview: {
            note: 'This shows the template variables that would be sent to WhatsApp. The actual message format depends on your Twilio WhatsApp template configuration.'
          }
        }
      });
      
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Handle Twilio WhatsApp status webhooks
   */
  handleWebhook = async (req: Request, res: Response) => {
    try {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!authToken) {
        console.error('TWILIO_AUTH_TOKEN not configured for webhook verification');
        return res.status(500).json({
          success: false,
          message: 'Webhook verification not configured'
        });
      }

      // Get Twilio signature from headers
      const twilioSignature = req.headers['x-twilio-signature'] as string;
      if (!twilioSignature) {
        console.error('Missing Twilio signature in webhook');
        // Still return 200 to prevent Twilio retries
        return res.status(200).json({
          success: false,
          message: 'Missing webhook signature'
        });
      }

      // Verify signature using Twilio SDK
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const isValidSignature = validateRequest(authToken, twilioSignature, url, req.body);

      if (!isValidSignature) {
        console.error('Invalid Twilio webhook signature');
        // Still return 200 to prevent Twilio retries
        return res.status(200).json({
          success: false,
          message: 'Invalid webhook signature'
        });
      }

      // Extract webhook data
      const {
        MessageSid,
        MessageStatus,
        ErrorCode,
        ErrorMessage,
        From,
        To,
        Body,
        Price,
        PriceUnit
      } = req.body;

      if (!MessageSid) {
        console.error('Missing MessageSid in webhook payload');
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook payload'
        });
      }

      console.log('Processing Twilio webhook:', {
        MessageSid,
        MessageStatus,
        ErrorCode,
        From,
        To
      });

      try {
        // Find message by Twilio SID
        const message = await WhatsAppMessageModel.getMessageByTwilioSid(MessageSid);
        
        if (!message) {
          console.warn(`Message not found for Twilio SID: ${MessageSid}`);
          // Still return success - webhook was processed
          return res.status(200).json({
            success: true,
            message: 'Webhook processed (message not found in database)'
          });
        }

        // Map Twilio status to our message status enum
        const mapTwilioStatus = (twilioStatus: string): string => {
          switch (twilioStatus?.toLowerCase()) {
            case 'queued':
            case 'accepted':
              return 'pending';
            case 'sent':
              return 'sent';
            case 'delivered':
              return 'delivered';
            case 'read':
              return 'read';
            case 'failed':
            case 'undelivered':
              return 'failed';
            default:
              return 'unknown';
          }
        };

        // Update message status
        const updateData: any = {
          status: mapTwilioStatus(MessageStatus) || 'unknown',
          updatedAt: new Date()
        };

        // Add error information if present
        if (ErrorCode || ErrorMessage) {
          updateData.errorCode = ErrorCode || null;
          updateData.errorMessage = ErrorMessage || null;
        }

        // Add cost information if present
        if (Price) {
          updateData.cost = Price;
          updateData.costCurrency = PriceUnit ?? null;
        }

        // Set delivery timestamp for delivered/read messages
        if (MessageStatus?.toLowerCase() === 'delivered' || MessageStatus?.toLowerCase() === 'read') {
          updateData.deliveredAt = new Date();
        }

        // Set sent timestamp for sent messages
        if (MessageStatus?.toLowerCase() === 'sent' && !message.sentAt) {
          updateData.sentAt = new Date();
        }

        await WhatsAppMessageModel.updateMessage(message.tenantId, message.id, updateData);

        console.log(`Updated message ${message.id} with status: ${MessageStatus}`);

        res.status(200).json({
          success: true,
          message: 'Webhook processed successfully'
        });

      } catch (dbError: any) {
        console.error('Database error processing webhook:', dbError);
        // Still return success to Twilio - we don't want retries for DB issues
        res.status(200).json({
          success: true,
          message: 'Webhook received (database update failed)'
        });
      }

    } catch (error: any) {
      console.error('Error processing Twilio webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}