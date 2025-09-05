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
import { Switch } from "@/components/ui/switch";
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
import { Users, Plus, Edit, Trash2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { PERMISSIONS, ROLE_PERMISSIONS, permissionService } from "@/lib/permissions";

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
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
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
  const [searchTerm, setSearchTerm] = useState("");
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

  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
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

  const filteredUsers = users?.filter((user: any) => {
    const searchString = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchString) ||
      user.name.toLowerCase().includes(searchString) ||
      user.role.toLowerCase().includes(searchString)
    );
  }) || [];

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

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">User Management</h2>
              <p className="text-sm text-muted-foreground">
                Manage system users and their permissions
              </p>
            </div>
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
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  System Users
                </CardTitle>
                <div className="relative">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user: any) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {user.permissions?.length || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS]?.length || 0} permissions
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleManagePermissions(user)}
                              data-testid={`button-manage-permissions-${user.id}`}
                              title="Manage Permissions"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(user)}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDelete(user.id)}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                      "System": [PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.VIEW_SETTINGS, PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_ANALYTICS],
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