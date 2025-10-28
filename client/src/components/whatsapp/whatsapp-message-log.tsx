import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MessageSquare, CheckCircle, XCircle, Clock, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { authenticatedApiRequest } from "@/lib/auth";
import { buildPaginationParams } from "@/lib/pagination";
import { PaginationOptions, PaginatedResult } from "../../../shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { useTenant } from "@/hooks/use-tenant";

function CreditBalanceBadge() {
  const { tenant } = useTenant();
  const creditBalance = tenant?.settings?.whatsapp?.creditBalance ?? 0;
  const threshold = tenant?.settings?.whatsapp?.lowCreditThreshold ?? 50;
  const isLow = creditBalance <= threshold;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Available Credits:</span>
      <Badge 
        className={isLow ? "bg-warning/10 text-warning border-warning/20" : ""}
      >
        {creditBalance} credits
      </Badge>
    </div>
  );
}

interface WhatsAppMessageLogProps {
  referenceType?: string; // Optional: filter by reference type (e.g., 'SalesInvoice')
  referenceId?: string; // Optional: filter by reference ID (e.g., specific invoice ID)
  compact?: boolean; // Optional: compact view for embedding in other pages
}

interface WhatsAppMessage {
  id: string;
  recipientPhone: string;
  messageType: string;
  referenceNumber: string;
  status: string;
  sentAt: string | null;
  cost: string | null;
  costCurrency: string | null;
  errorMessage: string | null;
  createdAt: string;
  creditsUsed?: number; // Credits consumed for this message (typically 1)
}

export default function WhatsAppMessageLog({ referenceType, referenceId, compact = false }: WhatsAppMessageLogProps) {
  const { tenant } = useTenant();
  
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: compact ? 5 : 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [messageTypeFilter, setMessageTypeFilter] = useState<string>('all');

  // Data fetching with React Query
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['/api/whatsapp/messages', paginationOptions, statusFilter, messageTypeFilter, referenceType, referenceId],
    queryFn: async () => {
      const params = new URLSearchParams(buildPaginationParams(paginationOptions));
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (messageTypeFilter !== 'all') {
        params.append('messageType', messageTypeFilter);
      }
      if (referenceType) {
        params.append('referenceType', referenceType);
      }
      if (referenceId) {
        params.append('referenceId', referenceId);
      }
      
      const response = await authenticatedApiRequest('GET', `/api/whatsapp/messages?${params}`);
      return response.json() as Promise<PaginatedResult<WhatsAppMessage>>;
    },
    placeholderData: (previousData) => previousData,
  });

  const totalCreditsUsed = useMemo(() => {
    if (!data?.data) return 0;
    // Assume 1 credit per message
    return data.data.length;
  }, [data]);

  // Table columns definition
  const columns = useMemo(() => [
    {
      accessorKey: 'recipientPhone',
      header: 'Recipient',
      cell: (value: string, item: WhatsAppMessage) => (
        <span className="font-mono text-sm">
          {item.recipientPhone}
        </span>
      ),
    },
    {
      accessorKey: 'messageType',
      header: 'Message Type',
      cell: (value: string, item: WhatsAppMessage) => {
        const type = item.messageType;
        const colorMap = {
          sales_invoice: 'bg-info/10 text-info border-info/20',
          purchase_invoice: 'bg-success/10 text-success border-success/20',
          payment_reminder: 'bg-warning/10 text-warning border-warning/20',
          payment_notification: 'bg-info/10 text-info border-info/20',
        };
        return (
          <Badge className={colorMap[type as keyof typeof colorMap] || 'bg-muted text-muted-foreground'}>
            {type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'referenceNumber',
      header: 'Reference',
      cell: (value: string, item: WhatsAppMessage) => (
        <span className="font-medium">
          {item.referenceNumber}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (value: string, item: WhatsAppMessage) => {
        const status = item.status;
        const statusConfig = {
          pending: { icon: Clock, className: 'bg-gray-100 text-gray-800' },
          sent: { icon: CheckCircle, className: 'bg-blue-100 text-blue-800' },
          delivered: { icon: CheckCircle, className: 'bg-green-100 text-green-800' },
          read: { icon: CheckCircle, className: 'bg-green-100 text-green-800' },
          failed: { icon: XCircle, className: 'bg-red-100 text-red-800' },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;
        
        return (
          <Badge className={config.className}>
            <Icon className="h-3 w-3 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'sentAt',
      header: 'Sent At',
      cell: (value: string | null, item: WhatsAppMessage) => {
        const sentAt = item.sentAt;
        return sentAt ? format(new Date(sentAt), 'MMM dd, yyyy HH:mm') : '-';
      },
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: (value: string | null, item: WhatsAppMessage) => {
        const cost = item.cost;
        const currency = item.costCurrency;
        return cost ? `${currency || '$'}${parseFloat(cost).toFixed(4)}` : '-';
      },
    },
    {
      accessorKey: 'creditsUsed',
      header: 'Credits',
      cell: (value: number | undefined, item: WhatsAppMessage) => {
        // Assume 1 credit per message if not explicitly provided
        const credits = value ?? 1;
        return (
          <Badge variant="outline" className="font-mono">
            {credits} credit{credits !== 1 ? 's' : ''}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'errorMessage',
      header: 'Error',
      cell: (value: string | null, item: WhatsAppMessage) => {
        const error = item.errorMessage;
        return error ? (
          <span className="text-red-600 text-sm truncate max-w-32" title={error}>
            {error.length > 30 ? `${error.substring(0, 30)}...` : error}
          </span>
        ) : '-';
      },
    },
  ], []);

  const handlePageChange = (page: number) => {
    setPaginationOptions(prev => ({ ...prev, page }));
  };

  const handleSearch = (search: string) => {
    setPaginationOptions(prev => ({ ...prev, search, page: 1 }));
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setMessageTypeFilter('all');
    setPaginationOptions(prev => ({ ...prev, search: '', page: 1 }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <XCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load messages</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Don't return early for empty data - let the DataTable handle it

  const content = (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by phone number or reference..."
              value={paginationOptions.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={messageTypeFilter} onValueChange={setMessageTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Message Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sales_invoice">Sales Invoice</SelectItem>
              <SelectItem value="purchase_invoice">Purchase Invoice</SelectItem>
              <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
              <SelectItem value="payment_notification">Payment Notification</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {!compact && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Credits Used</p>
                <p className="text-2xl font-bold">{totalCreditsUsed}</p>
                <p className="text-xs text-muted-foreground">
                  {(data?.data?.length || 0)} message{(data?.data?.length || 0) !== 1 ? 's' : ''} sent
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <DataTable
        columns={columns}
        data={data?.data || []}
        paginationMetadata={data?.pagination}
        onPageChange={handlePageChange}
        isLoading={isFetching}
        emptyMessage={
          paginationOptions.search || statusFilter !== 'all' || messageTypeFilter !== 'all'
            ? 'No messages match your filters'
            : 'No WhatsApp messages sent yet'
        }
      />
      
      {(!data?.data || data.data.length === 0) && (paginationOptions.search || statusFilter !== 'all' || messageTypeFilter !== 'all') && (
        <div className="text-center py-2">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}
      
      {compact && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = `/${tenant?.slug}/whatsapp-logs`}
          >
            View All Messages
          </Button>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <PermissionGuard permission={PERMISSIONS.VIEW_WHATSAPP_LOGS}>
        {content}
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission={PERMISSIONS.VIEW_WHATSAPP_LOGS}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp Message Log
            </CardTitle>
            <CreditBalanceBadge />
          </div>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}