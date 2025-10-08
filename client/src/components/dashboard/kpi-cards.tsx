import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee, Clock, Truck, Boxes } from "lucide-react";
import type { DashboardKPIs } from "@/types";

interface KPICardsProps {
  kpis?: DashboardKPIs;
  loading: boolean;
}

export default function KPICards({ kpis, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const cards = [
    {
      title: "Total Sales Today",
      value: kpis.todaySales,
      change: "+12.5% from yesterday",
      icon: IndianRupee,
      iconBg: "bg-chart-2/10",
      iconColor: "text-chart-2",
      changeColor: "text-chart-2",
    },
    {
      title: "Pending Payments",
      value: kpis.pendingPayments,
      change: `${kpis.pendingInvoicesCount} invoices due`,
      icon: Clock,
      iconBg: "bg-chart-1/10",
      iconColor: "text-chart-1",
      changeColor: "text-chart-1",
    },
    {
      title: "Active Vendors",
      value: kpis.activeVendors.toString(),
      change: "3 new this week",
      icon: Truck,
      iconBg: "bg-chart-3/10",
      iconColor: "text-chart-3",
      changeColor: "text-chart-3",
    },
    {
      title: "Stock Value",
      value: kpis.stockValue,
      change: kpis.totalStockKgs + " total",
      icon: Boxes,
      iconBg: "bg-chart-4/10",
      iconColor: "text-chart-4",
      changeColor: "text-chart-4",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <Card key={card.title} data-testid={`card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                <p className={`text-sm mt-1 ${card.changeColor}`}>{card.change}</p>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`text-lg ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
