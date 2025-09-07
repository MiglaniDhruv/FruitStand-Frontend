import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  CreditCard
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
  const [searchTerm, setSearchTerm] = useState("");
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
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/expenses");
      return response.json();
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleCreateExpense = () => {
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
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    categoryForm.reset();
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
    });
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const onSubmitExpense = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  const onSubmitCategory = (data: ExpenseCategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category?.name || "Unknown Category";
  };

  const getPaymentModeColor = (mode: string) => {
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
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense: any) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategoryName(expense.categoryId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || expense.categoryId === selectedCategory;
    const matchesPaymentMode = selectedPaymentMode === "all" || expense.paymentMode === selectedPaymentMode;
    return matchesSearch && matchesCategory && matchesPaymentMode;
  });

  // Calculate summary stats
  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum: number, expense: any) => 
    sum + parseFloat(expense.amount || "0"), 0
  );
  const todaysExpenses = expenses.filter((expense: any) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const expenseDate = format(new Date(expense.paymentDate), "yyyy-MM-dd");
    return expenseDate === today;
  });
  const todaysAmount = todaysExpenses.reduce((sum: number, expense: any) => 
    sum + parseFloat(expense.amount || "0"), 0
  );
  const totalCategories = categories.length;

  if (expensesLoading || categoriesLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Expense Management</h2>
              <p className="text-sm text-muted-foreground">
                Track business expenses and manage categories
              </p>
            </div>
            <div className="flex space-x-2">
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
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalExpenses}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Total spent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{todaysAmount.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">{todaysExpenses.length} expenses</p>
              </CardContent>
            </Card>

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
                  <div className="flex justify-between items-center">
                    <CardTitle>Expenses</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-40" data-testid="select-category-filter">
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
                      <Select value={selectedPaymentMode} onValueChange={setSelectedPaymentMode}>
                        <SelectTrigger className="w-40" data-testid="select-payment-mode-filter">
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
                      <Input
                        placeholder="Search expenses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                        data-testid="input-search"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense: any) => (
                        <TableRow key={expense.id}>
                          <TableCell>{format(new Date(expense.paymentDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getCategoryName(expense.categoryId)}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-red-600">
                            ₹{parseFloat(expense.amount).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>
                            <Badge className={getPaymentModeColor(expense.paymentMode)}>
                              {expense.paymentMode}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {filteredExpenses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            {searchTerm || selectedCategory !== "all" || selectedPaymentMode !== "all"
                              ? "No expenses found matching your filters."
                              : "No expenses found. Add your first expense!"
                            }
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Expenses Count</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category: any) => {
                        const categoryExpenses = expenses.filter((e: any) => e.categoryId === category.id);
                        const categoryTotal = categoryExpenses.reduce((sum: number, exp: any) => 
                          sum + parseFloat(exp.amount || "0"), 0
                        );
                        
                        return (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{categoryExpenses.length}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              ₹{categoryTotal.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditCategory(category)}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  data-testid={`button-delete-category-${category.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {categories.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No expense categories found. Create your first category!
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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
        </div>
      </main>
    </div>
  );
}