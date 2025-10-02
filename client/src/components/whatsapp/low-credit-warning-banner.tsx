import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useWhatsAppCredits } from "@/hooks/use-whatsapp-credits";

export function LowCreditWarningBanner() {
  const { creditStatus } = useWhatsAppCredits();

  if (!creditStatus?.isLowCredit) {
    return null;
  }

  const getAlertVariant = () => {
    if (creditStatus.balance === 0) {
      return 'destructive';
    }
    return 'default';
  };

  const getAlertMessage = () => {
    if (creditStatus.balance === 0) {
      return "WhatsApp credits depleted! Contact your administrator to add more credits.";
    }
    return `WhatsApp credits running low (${creditStatus.balance} remaining). Contact your administrator to add more credits.`;
  };

  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {getAlertMessage()}
      </AlertDescription>
    </Alert>
  );
}