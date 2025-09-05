import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { format } from "date-fns";

export default function Ledgers() {
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");

  const { data: vendors } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: bankAccounts } = useQuery<any[]>({
    queryKey: ["/api/bank-accounts"],
  });

  const { data: vendorLedger } = useQuery<any[]>({
    queryKey: ["/api/ledger/vendor", selectedVendor],
    enabled: !!selectedVendor,
  });

  const { data: cashbook } = useQuery<any[]>({
    queryKey: ["/api/cashbook"],
  });

  const { data: bankbook } = useQuery<any[]>({
    queryKey: ["/api/bankbook"],
  });

  const formatCurrency = (amount: string | number) => {
    return `₹${parseFloat(amount.toString()).toLocaleString('en-IN')}`;
  };

  const getVendorBalance = (vendorId: string) => {
    const vendor = vendors?.find((v: any) => v.id === vendorId);
    return vendor ? parseFloat(vendor.balance) : 0;
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Ledgers & Books</h2>
              <p className="text-sm text-muted-foreground">
                View vendor ledgers, cashbook, and bankbook records
              </p>
            </div>
            <Button variant="outline" data-testid="button-export-ledger">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="vendor-ledger" className="space-y-6">
            <TabsList>
              <TabsTrigger value="vendor-ledger" data-testid="tab-vendor-ledger">Vendor Ledger</TabsTrigger>
              <TabsTrigger value="cashbook" data-testid="tab-cashbook">Cashbook</TabsTrigger>
              <TabsTrigger value="bankbook" data-testid="tab-bankbook">Bankbook</TabsTrigger>
            </TabsList>

            <TabsContent value="vendor-ledger">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Vendor Ledger</CardTitle>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger className="w-64" data-testid="select-vendor-ledger">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors?.map((vendor: any) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedVendor && (
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-muted-foreground">Current Balance:</span>
                      <Badge variant={getVendorBalance(selectedVendor) > 0 ? "destructive" : "default"}>
                        {formatCurrency(getVendorBalance(selectedVendor))}
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedVendor ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Please select a vendor to view ledger
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Debit</TableHead>
                          <TableHead>Credit</TableHead>
                          <TableHead>Running Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorLedger && vendorLedger.length > 0 ? (
                          (() => {
                            let runningBalance = 0;
                            return vendorLedger.map((entry: any, index: number) => {
                              const debitAmount = parseFloat(entry.debit);
                              const creditAmount = parseFloat(entry.credit);
                              runningBalance += debitAmount - creditAmount;
                              
                              return (
                                <TableRow key={index} data-testid={`ledger-entry-${index}`}>
                                  <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
                                  <TableCell>{entry.description}</TableCell>
                                  <TableCell>
                                    {debitAmount > 0 ? formatCurrency(debitAmount) : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {creditAmount > 0 ? formatCurrency(creditAmount) : "-"}
                                  </TableCell>
                                  <TableCell className={runningBalance > 0 ? "text-chart-1" : "text-chart-2"}>
                                    {formatCurrency(runningBalance)}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                          })()
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No ledger entries found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cashbook">
              <Card>
                <CardHeader>
                  <CardTitle>Cashbook</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Inflow</TableHead>
                        <TableHead>Outflow</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashbook && cashbook.length > 0 ? (
                        cashbook.map((entry: any) => (
                          <TableRow key={entry.id} data-testid={`cashbook-entry-${entry.id}`}>
                            <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell>
                              {parseFloat(entry.inflow) > 0 ? formatCurrency(entry.inflow) : "-"}
                            </TableCell>
                            <TableCell>
                              {parseFloat(entry.outflow) > 0 ? formatCurrency(entry.outflow) : "-"}
                            </TableCell>
                            <TableCell>{formatCurrency(entry.balance)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No cashbook entries found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bankbook">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Bankbook</CardTitle>
                    <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                      <SelectTrigger className="w-64" data-testid="select-bank-account">
                        <SelectValue placeholder="All bank accounts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Accounts</SelectItem>
                        {bankAccounts?.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} - {account.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankbook && bankbook.length > 0 ? (
                        bankbook
                          .filter((entry: any) => !selectedBankAccount || entry.bankAccountId === selectedBankAccount)
                          .map((entry: any) => {
                            const account = bankAccounts?.find((acc: any) => acc.id === entry.bankAccountId);
                            return (
                              <TableRow key={entry.id} data-testid={`bankbook-entry-${entry.id}`}>
                                <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
                                <TableCell>{account?.name || "Unknown"}</TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell>
                                  {parseFloat(entry.debit) > 0 ? formatCurrency(entry.debit) : "-"}
                                </TableCell>
                                <TableCell>
                                  {parseFloat(entry.credit) > 0 ? formatCurrency(entry.credit) : "-"}
                                </TableCell>
                                <TableCell>{formatCurrency(entry.balance)}</TableCell>
                              </TableRow>
                            );
                          })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No bankbook entries found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
