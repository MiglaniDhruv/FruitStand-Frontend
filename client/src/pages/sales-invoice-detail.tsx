import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import InvoiceDetailsView from "@/components/invoice/invoice-details-view";
import SalesPaymentForm from "@/components/forms/sales-payment-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Share, Copy, Check, MessageSquare, CheckCircle, Bell } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTenantSlug } from "@/contexts/tenant-slug-context";
import { PERMISSIONS } from "@/lib/permissions";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useQueryClient } from "@tanstack/react-query";

export default function SalesInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [, setLocation] = useLocation();
  const { slug } = useTenantSlug();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [markingAsPaid, setMarkingAsPaid] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch invoice data
  const { data: invoice, isLoading: invoiceLoading, error: invoiceError, refetch: refetchInvoice } = useQuery({
    queryKey: ['/api/sales-invoices', invoiceId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/sales-invoices/${invoiceId}`);
      return response.json();
    },
    enabled: !!invoiceId,
  });

  // Fetch all sales payments and filter by invoiceId
  const { data: allSalesPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/sales-payments'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/sales-payments');
      return response.json();
    },
  });

  // Filter payments for this specific invoice
  const payments = allSalesPayments?.filter((payment: any) => payment.invoiceId === invoiceId) || [];

  // Create share link mutation
  const createShareLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest('POST', `/api/sales-invoices/${invoiceId}/share-link`);
      return response.json();
    },
    onSuccess: (data) => {
      const frontendUrl = `${window.location.origin}/public/sales-invoices/${data.data.shareLink.token}`;
      setShareUrl(frontendUrl);
      setShareDialogOpen(true);
      toast({
        title: 'Share link created',
        description: 'Public share link has been generated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create share link',
        variant: 'destructive',
      });
    },
  });

  // Send WhatsApp mutation
  const sendWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest('POST', '/api/whatsapp/send/sales-invoice', {
        invoiceId: invoiceId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'WhatsApp sent',
        description: 'Invoice has been sent via WhatsApp successfully',
      });
      setSendingWhatsApp(false);
      // Invalidate WhatsApp messages query to refresh logs
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages'] });
      
      // Show credit warning if applicable
      if (data.creditWarning) {
        toast({
          title: 'Low Credit Warning',
          description: `${data.creditWarning}. Remaining credits: ${data.remainingCredits}`,
          variant: 'default',
        });
      }
    },
    onError: (error: any) => {
      setSendingWhatsApp(false);
      
      // Handle insufficient credits error
      if (error.message?.includes('Insufficient') || error.message?.includes('credits')) {
        toast({
          title: 'Insufficient Credits',
          description: 'You do not have enough WhatsApp credits. Please contact your administrator.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
          variant: 'destructive',
        });
      }
    },
  });

  // Send Payment Reminder mutation
  const sendPaymentReminderMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest('POST', '/api/whatsapp/send/payment-reminder', {
        invoiceId: invoiceId,
        invoiceType: 'sales',
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Payment reminder sent',
        description: 'Payment reminder has been sent via WhatsApp successfully',
      });
      // Invalidate WhatsApp messages query to refresh logs
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages'] });
      
      // Show credit warning if applicable
      if (data.creditWarning) {
        toast({
          title: 'Low Credit Warning',
          description: `${data.creditWarning}. Remaining credits: ${data.remainingCredits}`,
          variant: 'default',
        });
      }
    },
    onError: (error: any) => {
      // Handle insufficient credits error
      if (error.message?.includes('Insufficient') || error.message?.includes('credits')) {
        toast({
          title: 'Insufficient Credits',
          description: 'You do not have enough WhatsApp credits. Please contact your administrator.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to send payment reminder',
          variant: 'destructive',
        });
      }
    },
  });

  // Mark as Paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest('PUT', `/api/sales-invoices/${invoiceId}/mark-paid`);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: 'Invoice marked as paid',
        description: 'The sales invoice has been marked as paid successfully',
      });
      // Refresh invoice data and wait for it to complete
      await refetchInvoice();
      setMarkingAsPaid(false);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-payments'] });
    },
    onError: (error: any) => {
      setMarkingAsPaid(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark invoice as paid',
        variant: 'destructive',
      });
    },
  });

  const handleBack = () => {
    setLocation(`/${slug}/sales-invoices`);
  };

  const handleRetry = () => {
    refetchInvoice();
  };

  const handleShare = () => {
    createShareLinkMutation.mutate();
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Share link copied to clipboard',
      });
    }
  };

  const handleSendWhatsApp = () => {
    if (!invoice?.retailer?.phone) {
      toast({
        title: 'No phone number',
        description: 'Retailer does not have a phone number configured',
        variant: 'destructive',
      });
      return;
    }
    
    setSendingWhatsApp(true);
    sendWhatsAppMutation.mutate();
  };

  const handleSendPaymentReminder = () => {
    if (!invoice?.retailer?.phone) {
      toast({
        title: 'No phone number',
        description: 'Retailer does not have a phone number configured',
        variant: 'destructive',
      });
      return;
    }
    
    sendPaymentReminderMutation.mutate();
  };

  const handleMarkAsPaid = () => {
    setMarkingAsPaid(true);
    markAsPaidMutation.mutate();
  };

  const handleAddPayment = () => {
    setShowPaymentForm(true);
  };

  // Loading state
  if (invoiceLoading) {
    return (
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <header className="bg-card shadow-sm border-b">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sales Invoices</span>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <Card className="p-8">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading invoice details...</span>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (invoiceError) {
    return (
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <header className="bg-card shadow-sm border-b">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sales Invoices</span>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <Card className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-destructive">Error Loading Invoice</h2>
                  <p className="text-muted-foreground">
                    There was an error loading the invoice details. Please try again.
                  </p>
                  <div className="flex items-center justify-center space-x-4">
                    <Button onClick={handleRetry} variant="default">
                      Try Again
                    </Button>
                    <Button onClick={handleBack} variant="outline">
                      Back to List
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Not found state
  if (!invoice && !invoiceLoading) {
    return (
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <header className="bg-card shadow-sm border-b">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sales Invoices</span>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <Card className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold">Invoice Not Found</h2>
                  <p className="text-muted-foreground">
                    The requested sales invoice could not be found.
                  </p>
                  <Button onClick={handleBack} variant="default">
                    Back to Sales Invoices
                  </Button>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <header className="bg-card shadow-sm border-b">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Sales Invoices</span>
                  </Button>
                  <h1 className="text-xl font-semibold">
                    Sales Invoice - {invoice?.invoiceNumber}
                  </h1>
                </div>
                <div className="flex items-center space-x-2">
                  <PermissionGuard permission={PERMISSIONS.SEND_WHATSAPP_MESSAGES}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendWhatsApp}
                      disabled={sendingWhatsApp || !invoice?.retailer?.phone}
                      className="flex items-center space-x-2"
                      title={!invoice?.retailer?.phone ? 'Retailer has no phone number' : 'Send via WhatsApp'}
                      data-testid="button-send-whatsapp"
                    >
                      {sendingWhatsApp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                      <span>WhatsApp</span>
                    </Button>
                  </PermissionGuard>
                  {invoice?.status !== "Paid" && invoice?.retailer?.phone && (
                    <PermissionGuard permission={PERMISSIONS.SEND_WHATSAPP_MESSAGES}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendPaymentReminder}
                        disabled={sendPaymentReminderMutation.isPending}
                        className="flex items-center space-x-2"
                        title="Send payment reminder via WhatsApp"
                        data-testid="button-send-payment-reminder"
                      >
                        {sendPaymentReminderMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                        <span>Reminder</span>
                      </Button>
                    </PermissionGuard>
                  )}
                  {invoice?.status !== "Paid" && (
                    <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAsPaid}
                        disabled={markAsPaidMutation.isPending}
                        className="flex items-center space-x-2"
                        title="Mark invoice as paid"
                        data-testid="button-mark-as-paid"
                      >
                        {markAsPaidMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span>Mark as Paid</span>
                      </Button>
                    </PermissionGuard>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    disabled={createShareLinkMutation.isPending}
                    className="flex items-center space-x-2"
                    data-testid="button-share"
                  >
                    {createShareLinkMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share className="h-4 w-4" />
                    )}
                    <span>Share</span>
                  </Button>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <InvoiceDetailsView
                invoice={invoice}
                payments={payments}
                onAddPayment={handleAddPayment}
                isPurchaseInvoice={false}
              />
            </div>
          </main>
        </div>
      </div>

      <SalesPaymentForm
        open={showPaymentForm}
        onOpenChange={setShowPaymentForm}
        preSelectedInvoiceId={invoiceId}
      />

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
            <DialogDescription>
              Anyone with this link can view the invoice details without logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                value={shareUrl || ''}
                readOnly
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This link will remain active and can be shared with retailers or other parties.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}