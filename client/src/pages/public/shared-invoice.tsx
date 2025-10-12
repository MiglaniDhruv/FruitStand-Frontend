import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Building2, Download } from "lucide-react";
import { publicApiRequest } from "@/lib/auth";
import InvoiceDetailsView from "@/components/invoice/invoice-details-view";
import { type PublicInvoiceData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function SharedInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [downloadingPDF, setDownloadingPDF] = useState<boolean>(false);

  // Fetch public invoice data
  const { data: publicData, isLoading, error } = useQuery<PublicInvoiceData>({
    queryKey: ['/api/public/invoices', token],
    queryFn: async () => {
      const response = await publicApiRequest('GET', `/api/public/invoices/${token}`);
      const result = await response.json();
      return result.data; // Extract the data from the success wrapper
    },
    enabled: !!token,
    retry: false, // Don't retry on 404 (invalid token)
  });

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await publicApiRequest('GET', `/api/public/invoices/${token}/pdf`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to download PDF');
      }
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Sanitize filename and provide fallback
      const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '-');
      const invoiceNum = publicData?.invoice?.invoiceNumber ? sanitize(publicData.invoice.invoiceNumber) : token;
      const cd = response.headers.get('Content-Disposition');
      
      // Parse filename from Content-Disposition with RFC 5987 support
      let serverName: string | undefined;
      if (cd) {
        // Try RFC 5987 filename* first (for non-ASCII filenames)
        const rfc5987Match = /filename\*=UTF-8''([^;]+)/.exec(cd);
        if (rfc5987Match) {
          try {
            serverName = decodeURIComponent(rfc5987Match[1]);
          } catch {
            // Fall back to regular filename if decoding fails
          }
        }
        
        // Fallback to regular filename= if filename* not found or failed
        if (!serverName) {
          const regularMatch = /filename="?([^";]+)"?/.exec(cd);
          serverName = regularMatch?.[1];
        }
        
        // Sanitize server-provided filename for safety
        if (serverName) {
          serverName = sanitize(serverName);
        }
      }
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = serverName || `invoice-${invoiceNum}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'PDF Downloaded',
        description: 'Invoice PDF has been downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Loading invoice...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error State
  if (error) {
    const errorMessage = error instanceof Error && error.message.includes('404')
      ? "Invoice not found or link is invalid"
      : "Failed to load invoice. Please try again.";

    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-muted-foreground text-center">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success State
  if (!publicData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header section with tenant branding */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">{publicData.tenant?.name || 'Unknown Tenant'}</CardTitle>
                  <p className="text-sm text-muted-foreground">Shared Invoice</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {publicData.invoiceType === 'purchase' ? 'Purchase' : 'Sales'} Invoice
                </Badge>
                <Badge variant="secondary">
                  {publicData.invoice?.invoiceNumber || 'N/A'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="flex items-center space-x-2"
                >
                  {downloadingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Download PDF</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main content */}
        <Card>
          <CardContent className="p-6">
            <InvoiceDetailsView
              invoice={{
                ...publicData.invoice,
                items: publicData.items, // Add items to the invoice object
                vendor: publicData.vendor, // Add vendor data if it's a purchase invoice
                retailer: publicData.retailer, // Add retailer data if it's a sales invoice
              }}
              payments={publicData.payments} // Use payment data from publicData
              onAddPayment={undefined} // No payment actions for public users
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            This is a shared invoice view. Contact the sender for more information.
          </p>
        </div>
      </div>
    </div>
  );
}