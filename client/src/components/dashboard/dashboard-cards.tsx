import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  ShoppingCart, 
  AlertCircle, 
  Receipt
} from "lucide-react";
import { DashboardKPIs } from "@/types";

interface DashboardCardsProps {
  kpis: DashboardKPIs | undefined;
  loading: boolean;
}

export default function DashboardCards({ kpis, loading }: DashboardCardsProps) {
  // Helper to check if value looks already formatted
  const looksFormatted = (value: string): boolean => {
    return value.includes('₹') || value.includes(',');
  };

  // Helper to format currency consistently
  const formatINRCurrency = (value: string | number): string => {
    if (typeof value === 'string' && looksFormatted(value)) {
      return value; // Already formatted
    }
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numValue)) return '₹0.00';
    return `₹${numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis) {
    return null;
  }

  const cards = [
    {
      title: "Today's Sales",
      value: formatINRCurrency(kpis.todaysSales),
      icon: TrendingUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    {
      title: "Today's Purchases",
      value: formatINRCurrency(kpis.todaysPurchases),
      icon: ShoppingCart,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600"
    },
    {
      title: "Total Udhaar",
      value: formatINRCurrency(kpis.totalUdhaar),
      icon: AlertCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600"
    },
    {
      title: "Today's Expenses",
      value: formatINRCurrency(kpis.todaysExpenses),
      icon: Receipt,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.iconBg}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}