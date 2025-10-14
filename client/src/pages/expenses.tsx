import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PaginationOptions, type PaginatedResult, type ExpenseWithCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { logEventHandlerError, logMutationError, logFormError } from "@/lib/error-logger";
import { z } from "zod";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Receipt, 
  TrendingDown, 
  Calendar, 
  DollarSign,
  Tag,
  FileText,
  CreditCard,
  Search
} from "lucide-react";
import { format } from "date-fns";

const expenseCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

const expenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMode: z.enum(["Cash", "Bank", "UPI", "Card"]),
  bankAccountId: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseCategoryFormData = z.infer<typeof expenseCategorySchema>;
type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function ExpenseManagement() {
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "paymentDate",
    sortOrder: "desc",
  });
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      categoryId: "",
      description: "",
      amount: 0,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMode: "Cash",
      bankAccountId: "",
      notes: "",
    },
  });

  const categoryForm = useForm<ExpenseCategoryFormData>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch data
  const { data: expensesResult, isLoading: expensesLoading, isFetching: expensesFetching, isError, error } = useQuery<PaginatedResult<ExpenseWithCategory>>({
    queryKey: ["/api/expenses", paginationOptions, selectedCategory, selectedPaymentMode],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paginationOptions.page) params.append('page', paginationOptions.page.toString());
      if (paginationOptions.limit) params.append('limit', paginationOptions.limit.toString());
      if (paginationOptions.search) params.append('search', paginationOptions.search);
      if (paginationOptions.sortBy) params.append('sortBy', paginationOptions.sortBy);
      if (paginationOptions.sortOrder) params.append('sortOrder', paginationOptions.sortOrder);
      if (selectedCategory !== "all") params.append('categoryId', selectedCategory);
      if (selectedPaymentMode !== "all") params.append('paymentMode', selectedPaymentMode);
      
      const response = await authenticatedApiRequest("GET", `/api/expenses?${params.toString()}`);
      return response.json();
    },
  });

  const { data: categories = [], isLoading: categoriesLoading, isFetching: categoriesFetching, isError: categoriesError, error: categoriesErrorMessage } = useQuery({
    queryKey: ["/api/expense-categories"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/expense-categories");
      return response.json();
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/bank-accounts");
      return response.json();
    },
  });

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPaginationOptions(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (limit: number) => {
    setPaginationOptions(prev => ({ ...prev, limit, page: 1 }));
  };

  const handleSearchChange = (search: string) => {
    setPaginationOptions(prev => ({ ...prev, search, page: 1 }));
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setPaginationOptions(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
  };

  const handleCategoryFilterChange = (category: string) => {
    setSelectedCategory(category);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };

  const handlePaymentModeFilterChange = (paymentMode: string) => {
    setSelectedPaymentMode(paymentMode);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };

  // Expense mutations
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const expenseData = {
        ...data,
        amount: data.amount.toFixed(2), // Convert number to string
        bankAccountId: data.bankAccountId || null,
      };
      const response = await authenticatedApiRequest("POST", "/api/expenses", expenseData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense added",
        description: "New expense has been recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setExpenseDialogOpen(false);
      expenseForm.reset();
    },
    onError: (error) => {
      logMutationError(error, 'createExpense');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: ExpenseCategoryFormData) => {
      const response = await authenticatedApiRequest("POST", "/api/expense-categories", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "New expense category has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      setCategoryDialogOpen(false);
      categoryForm.reset();
    },
    onError: (error) => {
      logMutationError(error, 'createExpenseCategory');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseCategoryFormData> }) => {
      const response = await authenticatedApiRequest("PUT", `/api/expense-categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Category updated",
        description: "Expense category has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    },
    onError: (error) => {
      logMutationError(error, 'updateExpenseCategory');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/expense-categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "Expense category has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
    },
    onError: (error) => {
      logMutationError(error, 'deleteExpenseCategory');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleCreateExpense = () => {
    try {
      setEditingExpense(null);
      expenseForm.reset({
        categoryId: "",
        description: "",
        amount: 0,
        paymentDate: format(new Date(), "yyyy-MM-dd"),
        paymentMode: "Cash",
        bankAccountId: "",
        notes: "",
      });
      setExpenseDialogOpen(true);
    } catch (error) {
      logEventHandlerError(error, 'handleCreateExpense');
      toast({
        title: "Error",
        description: "Failed to open new expense form",
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = () => {
    try {
      setEditingCategory(null);
      categoryForm.reset();
      setCategoryDialogOpen(true);
    } catch (error) {
      logEventHandlerError(error, 'handleCreateCategory');
      toast({
        title: "Error",
        description: "Failed to open new category form",
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = (category: any) => {
    try {
      if (!category) {
        throw new Error('Invalid category data');
      }
      setEditingCategory(category);
      categoryForm.reset({
        name: category.name,
        description: category.description || "",
      });
      setCategoryDialogOpen(true);
    } catch (error) {
      logEventHandlerError(error, 'handleEditCategory', { categoryId: category?.id });
      toast({
        title: "Error",
        description: "Failed to open category for editing",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      if (!id) {
        throw new Error('Invalid category ID');
      }
      
      if (confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
        await deleteCategoryMutation.mutateAsync(id);
      }
    } catch (error) {
      logEventHandlerError(error, 'handleDeleteCategory', { categoryId: id });
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const onSubmitExpense = async (data: ExpenseFormData) => {
    try {
      if (!data || !data.categoryId || !data.description || data.amount <= 0) {
        throw new Error('Invalid expense data');
      }
      await createExpenseMutation.mutateAsync(data);
    } catch (error) {
      logFormError(error, 'expenseForm', data);
      toast({
        title: "Error",
        description: "Failed to submit expense",
        variant: "destructive",
      });
    }
  };

  const onSubmitCategory = async (data: ExpenseCategoryFormData) => {
    try {
      if (!data || !data.name?.trim()) {
        throw new Error('Invalid category data');
      }
      
      if (editingCategory) {
        if (!editingCategory.id) {
          throw new Error('Invalid category ID for update');
        }
        await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data });
      } else {
        await createCategoryMutation.mutateAsync(data);
      }
    } catch (error) {
      logFormError(error, 'expenseCategoryForm', data);
      toast({
        title: "Error",
        description: "Failed to submit category",
        variant: "destructive",
      });
    }
  };

  const getCategoryName = (categoryId: string) => {
    try {
      if (!categoryId || !categories) {
        return "Unknown Category";
      }
      const category = categories.find((c: any) => c.id === categoryId);
      return category?.name || "Unknown Category";
    } catch (error) {
      logEventHandlerError(error, 'getCategoryName', { categoryId });
      return "Error Loading Category";
    }
  };

  const getPaymentModeColor = (mode: string) => {
    try {
      if (!mode) {
        return "bg-gray-500";
      }
      
      switch (mode) {
        case "Cash":
          return "bg-green-500";
        case "Bank":
          return "bg-blue-500";
        case "UPI":
          return "bg-purple-500";
        case "Card":
          return "bg-orange-500";
        default:
          return "bg-gray-500";
      }
    } catch (error) {
      logEventHandlerError(error, 'getPaymentModeColor', { mode });
      return "bg-gray-500"; // Safe default
    }
  };

  // Extract expenses and metadata from paginated result
  const expenses = expensesResult?.data || [];
  const paginationMetadata = expensesResult?.pagination;

  // Define expense table columns
  const expenseColumns = [
    {
      accessorKey: "paymentDate",
      header: "Date",
      cell: (value: string, row: any) => {
        try {
          const dateField = row.expenseDate || row.paymentDate;
          return format(new Date(dateField), "dd/MM/yyyy");
        } catch {
          return "Invalid Date";
        }
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "categoryId",
      header: "Category",
      cell: (value: string) => (
        <Badge variant="outline">{getCategoryName(value)}</Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: (value: string) => (
        <div className="font-medium text-red-600">
          ₹{parseFloat(value).toLocaleString("en-IN")}
        </div>
      ),
    },
    {
      accessorKey: "paymentMode",
      header: "Payment Mode",
      cell: (value: string) => (
        <Badge className={getPaymentModeColor(value)}>
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: (value: string) => value || "-",
    },
  ];

  // Define category table columns  
  const categoryColumns = [
    {
      accessorKey: "name",
      header: "Name",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (value: string) => value || "-",
    },
    {
      accessorKey: "id",
      header: "Expenses Count",
      cell: (value: string) => {
        const categoryExpenses = expenses.filter((e: any) => e.categoryId === value);
        return <Badge variant="secondary">{categoryExpenses.length}</Badge>;
      },
    },
    {
      accessorKey: "id",
      header: "Total Amount",
      cell: (value: string) => {
        const categoryExpenses = expenses.filter((e: any) => e.categoryId === value);
        const categoryTotal = categoryExpenses.reduce((sum: number, exp: any) => 
          sum + parseFloat(exp.amount || "0"), 0
        );
        return <div className="font-medium">₹{categoryTotal.toLocaleString("en-IN")}</div>;
      },
    },
    {
      accessorKey: "id",
      header: "Actions",
      cell: (value: string, row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditCategory(row)}
            data-testid={`button-edit-category-${value}`}
            title="Edit Category"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteCategory(value)}
            data-testid={`button-delete-category-${value}`}
            title="Delete Category"
            disabled={deleteCategoryMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Calculate summary stats using server totals
  const totalExpenses = paginationMetadata?.total || 0;
  // Note: totalAmount and todaysAmount removed as they would be misleading from current page only
  // Consider adding /api/expenses/stats endpoint for accurate aggregates with same filters
  const totalCategories = categories.length;

  if (expensesLoading || categoriesLoading) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError || categoriesError) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <h2 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">Error Loading Expenses</h2>
            <p className="text-gray-600 mb-6">
              {isError && error instanceof Error ? error.message : 
               categoriesError && categoriesErrorMessage instanceof Error ? categoriesErrorMessage.message :
               "Failed to load expenses. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
    <AppLayout>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Expense Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Track business expenses and manage categories
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleCreateCategory} data-testid="button-add-category">
                <Tag className="h-4 w-4 mr-2" />
                Add Category
              </Button>
              <Button onClick={handleCreateExpense} data-testid="button-add-expense">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 sm:space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{totalExpenses}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            
            {/* Amount aggregates removed - would be misleading from current page only */}
            {/* Consider adding /api/expenses/stats endpoint for accurate totals with same filters */}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Tag className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalCategories}</div>
                <p className="text-xs text-muted-foreground">Expense categories</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="expenses" className="space-y-6">
            <TabsList>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <CardTitle>Expenses</CardTitle>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search expenses by description..."
                          value={searchInput}
                          onChange={handleSearchInputChange}
                          className="pl-8"
                          data-testid="input-search-expenses"
                        />
                      </div>
                      <Select value={selectedCategory} onValueChange={handleCategoryFilterChange}>
                        <SelectTrigger className="w-full sm:w-40" data-testid="select-category-filter">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category: any) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedPaymentMode} onValueChange={handlePaymentModeFilterChange}>
                        <SelectTrigger className="w-full sm:w-40" data-testid="select-payment-mode-filter">
                          <SelectValue placeholder="All Payment Modes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Payment Modes</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={expenses}
                    columns={expenseColumns}
                    paginationMetadata={paginationMetadata}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    onSearchChange={handleSearchChange}
                    onSortChange={handleSortChange}
                    isLoading={expensesFetching}
                    enableRowSelection={true}
                    rowKey="id"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Expense Categories</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={categories}
                    columns={categoryColumns}
                    isLoading={categoriesFetching}
                    enableRowSelection={true}
                    rowKey="id"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
    </div>

    {/* Add Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="space-y-4">
              <FormField
                control={expenseForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={expenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter expense description" {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={expenseForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="₹ 0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={expenseForm.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-expense-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={expenseForm.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Mode *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-mode">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={expenseForm.control}
                  name="bankAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bank-account">
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bankAccounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.bankName} - {account.accountNumber.slice(-4)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={expenseForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createExpenseMutation.isPending}
                  data-testid="button-submit"
                >
                  {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Category description..." {...field} data-testid="input-category-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)} data-testid="button-category-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  data-testid="button-category-submit"
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending
                    ? "Saving..." 
                    : editingCategory 
                    ? "Update Category" 
                    : "Create Category"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
    </>
  );
}