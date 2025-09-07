import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Vendors from "@/pages/vendors";
import Retailers from "@/pages/retailers";
import Items from "@/pages/items";
import PurchaseInvoices from "@/pages/purchase-invoices";
import SalesInvoices from "@/pages/sales-invoices";
import Expenses from "@/pages/expenses";
import Crates from "@/pages/crates";
import Stock from "@/pages/stock";
import Ledgers from "@/pages/ledgers";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import { authService } from "@/lib/auth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  
  useEffect(() => {
    // Check authentication status on mount and when localStorage changes
    const checkAuth = () => {
      setIsAuthenticated(authService.isAuthenticated());
    };
    
    // Listen for storage changes (e.g., when login/logout happens)
    window.addEventListener('storage', checkAuth);
    
    // Also check periodically to catch any auth changes
    const interval = setInterval(checkAuth, 1000);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);
  
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
      <Route path="/retailers" component={() => <ProtectedRoute component={Retailers} />} />
      <Route path="/items" component={() => <ProtectedRoute component={Items} />} />
      <Route path="/purchase-invoices" component={() => <ProtectedRoute component={PurchaseInvoices} />} />
      <Route path="/sales-invoices" component={() => <ProtectedRoute component={SalesInvoices} />} />
      <Route path="/expenses" component={() => <ProtectedRoute component={Expenses} />} />
      <Route path="/crates" component={() => <ProtectedRoute component={Crates} />} />
      <Route path="/stock" component={() => <ProtectedRoute component={Stock} />} />
      <Route path="/ledgers" component={() => <ProtectedRoute component={Ledgers} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
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
