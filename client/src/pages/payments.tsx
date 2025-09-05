import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, Plus } from "lucide-react";
import PaymentForm from "@/components/forms/payment-form";
import { format } from "date-fns";

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const { data: payments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });

  const filteredPayments = payments?.filter((payment: any) => {
    const matchesSearch = 
      payment.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = paymentModeFilter === "all" || payment.paymentMode === paymentModeFilter;
    return matchesSearch && matchesMode;
  }) || [];

  const getPaymentModeColor = (mode: string) => {
    switch (mode) {
      case "Cash":
        return "bg-chart-2/10 text-chart-2";
      case "Bank":
        return "bg-chart-3/10 text-chart-3";
      case "UPI":
        return "bg-chart-4/10 text-chart-4";
      case "Cheque":
        return "bg-chart-1/10 text-chart-1";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Payments</h2>
              <p className="text-sm text-muted-foreground">
                Record and track vendor payments
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} data-testid="button-record-payment">
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Payments</CardTitle>
                <div className="flex items-center space-x-4">
                  <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                    <SelectTrigger className="w-48" data-testid="select-payment-mode-filter">
                      <SelectValue placeholder="Filter by mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search payments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-payments"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading payments...
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment: any) => (
                      <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                        <TableCell>{format(new Date(payment.paymentDate), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="font-medium">{payment.invoice.invoiceNumber}</TableCell>
                        <TableCell>{payment.vendor.name}</TableCell>
                        <TableCell>₹{parseFloat(payment.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge className={getPaymentModeColor(payment.paymentMode)} variant="secondary">
                            {payment.paymentMode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.chequeNumber || payment.upiReference || 
                           (payment.bankAccount?.accountNumber ? `****${payment.bankAccount.accountNumber.slice(-4)}` : "-")}
                        </TableCell>
                        <TableCell>{payment.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      <PaymentForm
        open={showForm}
        onOpenChange={setShowForm}
      />
    </div>
  );
}
