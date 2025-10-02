import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Vendors from "@/pages/vendors";
import Retailers from "@/pages/retailers";
import Items from "@/pages/items";
import PurchaseInvoices from "@/pages/purchase-invoices";
import PurchaseInvoiceDetailPage from "@/pages/purchase-invoice-detail";
import SalesInvoices from "@/pages/sales-invoices";
import SalesInvoiceDetailPage from "@/pages/sales-invoice-detail";
import Expenses from "@/pages/expenses";
import Crates from "@/pages/crates";
import Stock from "@/pages/stock";
import Ledgers from "@/pages/ledgers";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import WhatsAppLogsPage from "@/pages/whatsapp-logs";
import SharedInvoicePage from '@/pages/public/shared-invoice';
import LandingPage from "@/pages/landing";

import { TenantLandingRedirect } from "@/components/tenant/tenant-landing-redirect";
import { TenantLogin } from "@/components/tenant/tenant-login";
import { TenantProtectedRoute } from "@/components/tenant/tenant-protected-route";
import { TenantSlugProvider } from "@/contexts/tenant-slug-context";

function Router() {
  return (
    <Switch>
      {/* Public routes - no authentication required */}
      <Route
        path="/public/purchase-invoices/:token"
        component={(props) => <SharedInvoicePage />}
      />
      <Route
        path="/public/sales-invoices/:token"
        component={(props) => <SharedInvoicePage />}
      />
      <Route
        path="/public/invoices/:token"
        component={(props) => <SharedInvoicePage />}
      />

      <Route path="/" component={LandingPage} />

      {/* Tenant-specific routes */}
      <Route
        path="/:slug/login"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantLogin slug={props.params.slug} />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/dashboard"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={Dashboard}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/vendors"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={Vendors}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/retailers"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={Retailers}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/items"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute component={Items} slug={props.params.slug} />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/purchase-invoices/:invoiceId"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={PurchaseInvoiceDetailPage}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/purchase-invoices"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={PurchaseInvoices}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/sales-invoices/:invoiceId"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={SalesInvoiceDetailPage}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/sales-invoices"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={SalesInvoices}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/expenses"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={Expenses}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/crates"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute component={Crates} slug={props.params.slug} />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/stock"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute component={Stock} slug={props.params.slug} />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/ledgers"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={Ledgers}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/reports"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={Reports}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/users"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute component={Users} slug={props.params.slug} />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/settings"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={Settings}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug/whatsapp-logs"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantProtectedRoute
              component={WhatsAppLogsPage}
              slug={props.params.slug}
            />
          </TenantSlugProvider>
        )}
      />
      <Route
        path="/:slug"
        component={(props) => (
          <TenantSlugProvider slug={props.params.slug}>
            <TenantLandingRedirect slug={props.params.slug} />
          </TenantSlugProvider>
        )}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
