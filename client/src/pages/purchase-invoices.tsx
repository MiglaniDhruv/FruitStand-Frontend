import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Eye, CreditCard, History } from "lucide-react";
import PurchaseInvoiceModal from "@/components/forms/purchase-invoice-modal";
import InvoiceDetailsModal from "@/components/modals/invoice-details-modal";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";

export default function PurchaseInvoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { data: invoices, isLoading } = useQuery<any[]>({
    queryKey: ["/api/purchase-invoices"],
  });

  const filteredInvoices = invoices?.filter((invoice: any) => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-chart-2/10 text-chart-2";
      case "Pending":
      case "Unpaid":
        return "bg-chart-1/10 text-chart-1";
      case "Partially Paid":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Purchase Invoices</h2>
              <p className="text-sm text-muted-foreground">
                Manage purchase invoices and track payments
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-invoice">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Invoices</CardTitle>
                <div className="flex items-center space-x-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-invoices"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading invoices...
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.vendor.name}</TableCell>
                        <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{invoice.items?.length || 0} items</TableCell>
                        <TableCell>₹{parseFloat(invoice.netAmount).toLocaleString('en-IN')}</TableCell>
                        <TableCell>₹{parseFloat(invoice.paidAmount).toLocaleString('en-IN')}</TableCell>
                        <TableCell>₹{parseFloat(invoice.balanceAmount).toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)} variant="secondary">
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewInvoice(invoice)}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      <PurchaseInvoiceModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />

      <InvoiceDetailsModal
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onOpenChange={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
