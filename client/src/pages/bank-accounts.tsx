import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Edit, Trash2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import BankAccountForm from "@/components/forms/bank-account-form";
import ManualBankTransactionForm from "@/components/forms/manual-bank-transaction-form";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { PaginationOptions, PaginatedResult, BankAccount } from "@shared/schema";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@shared/permissions";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

export default function BankAccounts() {
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "name",
    sortOrder: "asc"
  });
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bankAccountToDelete, setBankAccountToDelete] = useState<BankAccount | null>(null);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [selectedBankAccountForTransaction, setSelectedBankAccountForTransaction] = useState<BankAccount | null>(null);
  const [selectedTransactionType, setSelectedTransactionType] = useState<'deposit' | 'withdrawal' | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bankAccountsResult, isLoading, isFetching, isError, error } = useQuery<PaginatedResult<BankAccount>>({
    queryKey: ["/api/bank-accounts", paginationOptions, statusFilter],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('paginated', 'true');
      if (paginationOptions.page) params.append('page', paginationOptions.page.toString());
      if (paginationOptions.limit) params.append('limit', paginationOptions.limit.toString());
      if (paginationOptions.search) params.append('search', paginationOptions.search);
      if (paginationOptions.sortBy) params.append('sortBy', paginationOptions.sortBy);
      if (paginationOptions.sortOrder) params.append('sortOrder', paginationOptions.sortOrder);
      
      // Only add status filter if it's not "all"
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      const response = await authenticatedApiRequest("GET", `/api/bank-accounts?${params.toString()}`);
      return response.json();
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/bank-accounts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Bank account deleted",
        description: "Bank account has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      setIsDeleteDialogOpen(false);
      setBankAccountToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bank account",
        variant: "destructive",
      });
    },
  });

  const handlePageChange = (page: number) => {
    setPaginationOptions(prev => ({ ...prev, page }));
  };
  
  const handlePageSizeChange = (limit: number) => {
    setPaginationOptions(prev => ({ ...prev, limit, page: 1 }));
  };
  
  const handleSearchChange = (search: string) => {
    setPaginationOptions(prev => ({ ...prev, search, page: 1 }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };
  
  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setPaginationOptions(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
  };

  const handleCreate = () => {
    setSelectedBankAccount(null);
    setIsFormOpen(true);
  };

  const handleEdit = (bankAccount: BankAccount) => {
    setSelectedBankAccount(bankAccount);
    setIsFormOpen(true);
  };

  const handleDelete = (bankAccount: BankAccount) => {
    setBankAccountToDelete(bankAccount);
    setIsDeleteDialogOpen(true);
  };

  const handleDeposit = (bankAccount: BankAccount) => {
    setSelectedBankAccountForTransaction(bankAccount);
    setSelectedTransactionType('deposit');
    setIsTransactionFormOpen(true);
  };

  const handleWithdraw = (bankAccount: BankAccount) => {
    setSelectedBankAccountForTransaction(bankAccount);
    setSelectedTransactionType('withdrawal');
    setIsTransactionFormOpen(true);
  };

  const handleCloseTransactionForm = (open: boolean) => {
    setIsTransactionFormOpen(open);
    if (!open) {
      setSelectedBankAccountForTransaction(null);
      setSelectedTransactionType(null);
    }
  };

  const confirmDelete = () => {
    if (bankAccountToDelete) {
      deleteAccountMutation.mutate(bankAccountToDelete.id);
    }
  };

  const formatBalance = (balance: string | number | null | undefined) => {
    if (!balance && balance !== 0) return "₹0.00";
    const num = parseFloat(String(balance));
    if (isNaN(num)) return "₹0.00";
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Account Name",
    },
    {
      accessorKey: "accountNumber",
      header: "Account Number",
    },
    {
      accessorKey: "bankName",
      header: "Bank Name",
    },
    {
      accessorKey: "ifscCode",
      header: "IFSC Code",
      cell: (value: string) => value || "-",
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: (value: string) => formatBalance(value),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "id",
      header: "Actions",
      cell: (value: string, item: BankAccount) => (
        <div className="flex items-center gap-2">
          {item.isActive && (
            <>
              <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeposit(item)}
                  title="Deposit"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleWithdraw(item)}
                  title="Withdraw"
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            </>
          )}
          <PermissionGuard permission={PERMISSIONS.EDIT_PAYMENTS}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.DELETE_PAYMENTS}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6">
          <div className="text-center">
            <p className="text-destructive">Error loading bank accounts: {error?.message}</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] })}>
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="flex-1 flex flex-col">
          <header className="bg-card border-b border-border px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Bank Accounts</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Manage your bank accounts and track balances
                </p>
              </div>
              <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank Account
                </Button>
              </PermissionGuard>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <CardTitle>All Bank Accounts</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, account number, or bank..."
                        value={searchInput}
                        onChange={handleSearchInputChange}
                        className="pl-8"
                      />
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={handleStatusFilterChange}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <DataTable
                      data={bankAccountsResult?.data || []}
                      columns={columns}
                      paginationMetadata={bankAccountsResult?.pagination}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      onSortChange={(column: string, direction: string) => handleSortChange(column, direction)}
                      isLoading={isFetching}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </main>
        </div>

        <BankAccountForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          bankAccount={selectedBankAccount}
        />

        <ManualBankTransactionForm
          open={isTransactionFormOpen}
          onOpenChange={handleCloseTransactionForm}
          preSelectedBankAccountId={selectedBankAccountForTransaction?.id}
          preSelectedTransactionType={selectedTransactionType || undefined}
        />

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{bankAccountToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppLayout>
    </ErrorBoundary>
  );
}