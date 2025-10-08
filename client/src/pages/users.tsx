import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Plus, Edit, Trash2, Shield, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { PERMISSIONS, ROLE_PERMISSIONS, permissionService } from "@/lib/permissions";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PaginationOptions, PaginatedResult, User } from "@shared/schema";

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["Admin", "Operator", "Accountant"], {
    required_error: "Role is required",
  }),
});

const editUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().transform((val) => val === "" ? undefined : val).pipe(z.string().min(6, "Password must be at least 6 characters").optional()),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["Admin", "Operator", "Accountant"], {
    required_error: "Role is required",
  }),
});

type UserFormData = z.infer<typeof userSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

export default function UserManagement() {
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [managingPermissions, setManagingPermissions] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "username",
    sortOrder: "asc"
  });
  const [searchInput, setSearchInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "Operator",
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "Operator",
    },
  });

  const { data: usersResult, isLoading, isError, error } = useQuery<PaginatedResult<User>>({
    queryKey: ["/api/users", paginationOptions],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paginationOptions.page) params.append('page', paginationOptions.page.toString());
      if (paginationOptions.limit) params.append('limit', paginationOptions.limit.toString());
      if (paginationOptions.search) params.append('search', paginationOptions.search);
      if (paginationOptions.sortBy) params.append('sortBy', paginationOptions.sortBy);
      if (paginationOptions.sortOrder) params.append('sortOrder', paginationOptions.sortOrder);
      
      const response = await authenticatedApiRequest("GET", `/api/users?${params.toString()}`);
      return response.json();
    },
    placeholderData: keepPreviousData,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await authenticatedApiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "User has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditUserFormData }) => {
      const response = await authenticatedApiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
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
  
  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setPaginationOptions(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "destructive";
      case "Operator":
        return "default";
      case "Accountant":
        return "secondary";
      default:
        return "default";
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    editForm.reset({
      username: user.username,
      name: user.name,
      role: user.role,
      password: "", // Don't prefill password
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "username",
      header: "Username",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: (value: string) => value,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: (value: string) => (
        <Badge variant={getRoleBadgeVariant(value)}>
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: "active",
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
      cell: (value: string, row: any) => (
        <div className="flex space-x-2">
          <PermissionGuard permission={PERMISSIONS.MANAGE_USERS}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row)}
              data-testid={`button-edit-${value}`}
              title="Edit User"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.MANAGE_USERS}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleManagePermissions(row)}
              data-testid={`button-permissions-${value}`}
              title="Manage Permissions"
            >
              <Shield className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.MANAGE_USERS}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(value)}
              data-testid={`button-delete-${value}`}
              title="Delete User"
              disabled={deleteUserMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: string[] }) => {
      const response = await authenticatedApiRequest("PUT", `/api/users/${id}/permissions`, { permissions });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permissions updated",
        description: "User permissions have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  const handleManagePermissions = (user: any) => {
    setManagingPermissions(user);
    setUserPermissions(user.permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || []);
  };

  const togglePermission = (permission: string) => {
    setUserPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const savePermissions = () => {
    if (managingPermissions) {
      updatePermissionsMutation.mutate({
        id: managingPermissions.id,
        permissions: userPermissions
      });
      setManagingPermissions(null);
    }
  };

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: EditUserFormData) => {
    if (!editingUser) return;
    
    // Only include password if it's provided
    const updateData = data.password 
      ? data 
      : { username: data.username, name: data.name, role: data.role };
    
    updateUserMutation.mutate({ id: editingUser.id, data: updateData });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-red-600">Error Loading Users</h2>
            <p className="text-gray-600 max-w-md">
              {error instanceof Error ? error.message : "Failed to load users. Please try again."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
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
              <h2 className="text-2xl font-semibold text-foreground">Organization Users</h2>
              <p className="text-sm text-muted-foreground">
                Manage users in your organization
              </p>
            </div>
            <PermissionGuard permission={PERMISSIONS.MANAGE_USERS}>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" data-testid="button-add-user">
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" {...field} data-testid="input-username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} data-testid="input-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Operator">Operator</SelectItem>
                              <SelectItem value="Accountant">Accountant</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-create-user">
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </PermissionGuard>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Organization Users
                </CardTitle>
                <div className="relative flex-1 max-w-sm ml-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by username or name..."
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    className="pl-8"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={usersResult?.data || []}
                columns={columns}
                paginationMetadata={usersResult?.pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSearchChange={handleSearchChange}
                onSortChange={handleSortChange}
                isLoading={isLoading}
                enableRowSelection={true}
                rowKey="id"
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} data-testid="input-edit-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (leave empty to keep current)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} data-testid="input-edit-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Operator">Operator</SelectItem>
                        <SelectItem value="Accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending} data-testid="button-update-user">
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Permissions Management Modal */}
      <Dialog open={!!managingPermissions} onOpenChange={() => setManagingPermissions(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions - {managingPermissions?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Role: <Badge variant={getRoleBadgeVariant(managingPermissions?.role)}>
                {managingPermissions?.role}
              </Badge>
            </p>
          </DialogHeader>
          
          {managingPermissions && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Default Role Permissions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_PERMISSIONS[managingPermissions.role as keyof typeof ROLE_PERMISSIONS]?.map((permission: string) => (
                      <div key={permission} className="flex items-center space-x-2 p-2 bg-secondary rounded-md">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </div>
                    )) || []}
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-lg font-medium">Customize User Permissions</h4>
                  <p className="text-sm text-muted-foreground">
                    Toggle individual permissions on or off. Changes override the default role permissions.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries({
                      "User Management": [PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS],
                      "Vendor Management": [PERMISSIONS.MANAGE_VENDORS, PERMISSIONS.VIEW_VENDORS, PERMISSIONS.DELETE_VENDORS],
                      "Item Management": [PERMISSIONS.MANAGE_ITEMS, PERMISSIONS.VIEW_ITEMS, PERMISSIONS.DELETE_ITEMS],
                      "Purchase Invoices": [PERMISSIONS.CREATE_PURCHASE_INVOICES, PERMISSIONS.VIEW_PURCHASE_INVOICES, PERMISSIONS.EDIT_PURCHASE_INVOICES, PERMISSIONS.DELETE_PURCHASE_INVOICES],
                      "Payments": [PERMISSIONS.CREATE_PAYMENTS, PERMISSIONS.VIEW_PAYMENTS, PERMISSIONS.EDIT_PAYMENTS, PERMISSIONS.DELETE_PAYMENTS],
                      "Stock Management": [PERMISSIONS.MANAGE_STOCK, PERMISSIONS.VIEW_STOCK],
                      "Financial Reports": [PERMISSIONS.VIEW_LEDGERS, PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_CASHBOOK, PERMISSIONS.VIEW_BANKBOOK],
                      "Bank Accounts": [PERMISSIONS.MANAGE_BANK_ACCOUNTS, PERMISSIONS.VIEW_BANK_ACCOUNTS],
                      "Organization Settings": [PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.VIEW_SETTINGS, PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_ANALYTICS],
                    }).map(([category, permissions]) => (
                      <div key={category} className="border rounded-lg p-3">
                        <h5 className="font-medium mb-3">{category}</h5>
                        <div className="space-y-3">
                          {permissions.map((permission: string) => {
                            const hasPermission = userPermissions.includes(permission);
                            return (
                              <div key={permission} className="flex items-center justify-between p-2 rounded-md border bg-card">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">
                                    {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                </div>
                                <Switch
                                  checked={hasPermission}
                                  onCheckedChange={() => togglePermission(permission)}
                                  data-testid={`switch-${permission}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {userPermissions.length} permissions selected
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setManagingPermissions(null)} data-testid="button-close-permissions">
                    Cancel
                  </Button>
                  <Button 
                    onClick={savePermissions} 
                    disabled={updatePermissionsMutation.isPending}
                    data-testid="button-save-permissions"
                  >
                    {updatePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}