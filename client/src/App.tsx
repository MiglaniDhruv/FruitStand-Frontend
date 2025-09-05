import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Vendors from "@/pages/vendors";
import Commodities from "@/pages/commodities";
import PurchaseInvoices from "@/pages/purchase-invoices";
import Payments from "@/pages/payments";
import Stock from "@/pages/stock";
import Ledgers from "@/pages/ledgers";
import { authService } from "@/lib/auth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Login />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/vendors" component={() => <ProtectedRoute component={Vendors} />} />
      <Route path="/commodities" component={() => <ProtectedRoute component={Commodities} />} />
      <Route path="/purchase-invoices" component={() => <ProtectedRoute component={PurchaseInvoices} />} />
      <Route path="/payments" component={() => <ProtectedRoute component={Payments} />} />
      <Route path="/stock" component={() => <ProtectedRoute component={Stock} />} />
      <Route path="/ledgers" component={() => <ProtectedRoute component={Ledgers} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
