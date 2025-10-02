import { useQuery } from '@tanstack/react-query';
import { authenticatedApiRequest } from '@/lib/auth';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface CreditStatus {
  balance: number;
  threshold: number;
  isLowCredit: boolean;
  percentageUsed: number;
}

export interface CreditTransaction {
  id: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  referenceType: string;
  notes?: string;
  createdAt: string;
}

// Global flag to track if low credit toast has been shown for current session
let globalLowCreditToastShown = false;

export function useWhatsAppCredits() {
  const { tenant, refreshTenantData } = useTenant();
  const { toast } = useToast();

  // Extract credit status from tenant settings
  const creditStatus: CreditStatus | null = tenant?.settings?.whatsapp ? {
    balance: tenant.settings.whatsapp.creditBalance ?? 0,
    threshold: tenant.settings.whatsapp.lowCreditThreshold ?? 50,
    isLowCredit: (tenant.settings.whatsapp.creditBalance ?? 0) <= (tenant.settings.whatsapp.lowCreditThreshold ?? 50),
    percentageUsed: Math.max(0, Math.min(100, ((tenant.settings.whatsapp.creditBalance ?? 0) / Math.max((tenant.settings.whatsapp.lowCreditThreshold ?? 50) * 2, 100)) * 100))
  } : null;

  // TODO: Implement credit transactions endpoint when available
  // const { data: transactions = [], isLoading: transactionsLoading, error: transactionsError } = useQuery({
  //   queryKey: ['whatsapp-credit-transactions', tenant?.id],
  //   queryFn: async () => {
  //     const response = await authenticatedApiRequest('/api/whatsapp/credit-transactions?limit=10');
  //     return response.data as CreditTransaction[];
  //   },
  //   enabled: !!tenant?.id && tenant?.settings?.whatsapp?.enabled,
  // });

  // Low credit warning effect - only fires once per tenant session
  useEffect(() => {
    if (!tenant?.id || !tenant?.settings?.whatsapp?.enabled) return;

    const storageKey = `low-credit-toast-shown-${tenant.id}`;
    const sessionToastShown = localStorage.getItem(storageKey) === 'true';

    if (creditStatus?.isLowCredit && !globalLowCreditToastShown && !sessionToastShown) {
      toast({
        title: "⚠️ Low WhatsApp Credits",
        description: `Current balance: ${creditStatus.balance}, threshold: ${creditStatus.threshold}`,
        variant: "destructive",
      });
      
      // Mark as shown for both global and session tracking
      globalLowCreditToastShown = true;
      localStorage.setItem(storageKey, 'true');
    }
    
    // Reset warning when credits are no longer low
    if (!creditStatus?.isLowCredit) {
      globalLowCreditToastShown = false;
      localStorage.removeItem(storageKey);
    }
  }, [creditStatus?.isLowCredit, creditStatus?.balance, creditStatus?.threshold, tenant?.id, tenant?.settings?.whatsapp?.enabled, toast]);

  return {
    creditStatus,
    transactions: [] as CreditTransaction[], // Empty array until backend endpoint is available
    isLoading: false,
    error: null,
    refetch: () => {
      // Re-fetch tenant data to update credit information
      // This will automatically update creditStatus since it's derived from tenant settings
      refreshTenantData();
      // TODO: When transactions endpoint is available, also refetch transactions here
    }
  };
}