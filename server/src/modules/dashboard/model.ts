import { eq, sum, gte, lte, inArray, desc, and } from 'drizzle-orm';
import { db } from '../../../db';
import { vendors, retailers, purchaseInvoices, salesInvoices, stock, bankAccounts, tenants, DashboardKPIs, RecentPurchase, RecentSale, TopRetailerByUdhaar } from '@shared/schema';
import { withTenant } from '../../utils/tenant-scope';
import { TenantModel } from '../tenants/model';

export class DashboardModel {
  async getDashboardKPIs(tenantId: string): Promise<DashboardKPIs> {
    // Calculate today's date range
    // Note: Currently uses server timezone. Consider implementing tenant timezone support
    // by retrieving tenant settings and adjusting dates accordingly.
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Run all independent queries in parallel
    const [
      cashBalance,
      bankBalanceResult,
      todaysSalesResult,
      todaysPurchasesResult,
      totalUdhaarResult,
      totalShortfallResult,
      todaysCommissionResult,
      recentPurchases,
      recentSales,
      topRetailersByUdhaar
    ] = await Promise.all([
      // Get cash balance from tenant settings
      TenantModel.getCashBalance(tenantId),
      
      // Get total bank balance
      db.select({ total: sum(bankAccounts.balance) })
        .from(bankAccounts)
        .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.isActive, true))),
      
      // Get today's sales
      db.select({ total: sum(salesInvoices.totalAmount) })
        .from(salesInvoices)
        .where(withTenant(salesInvoices, tenantId, and(
          gte(salesInvoices.createdAt, startOfToday),
          lte(salesInvoices.createdAt, endOfToday)
        ))),
      
      // Get today's purchases
      db.select({ total: sum(purchaseInvoices.totalSelling) })
        .from(purchaseInvoices)
        .where(withTenant(purchaseInvoices, tenantId, and(
          gte(purchaseInvoices.createdAt, startOfToday),
          lte(purchaseInvoices.createdAt, endOfToday)
        ))),
      
      // Get total udhaar
      db.select({ total: sum(retailers.udhaaarBalance) })
        .from(retailers)
        .where(withTenant(retailers, tenantId, eq(retailers.isActive, true))),
      
      // Get total shortfall
      db.select({ total: sum(retailers.shortfallBalance) })
        .from(retailers)
        .where(withTenant(retailers, tenantId, eq(retailers.isActive, true))),
      
      // Get today's commission earned
      db.select({ total: sum(purchaseInvoices.commission) })
        .from(purchaseInvoices)
        .where(withTenant(purchaseInvoices, tenantId, and(
          gte(purchaseInvoices.createdAt, startOfToday),
          lte(purchaseInvoices.createdAt, endOfToday)
        ))),
      
      // Get recent purchases, sales, and top retailers
      this.getRecentPurchases(tenantId, 5),
      this.getRecentSales(tenantId, 5),
      this.getTopRetailersByUdhaar(tenantId, 5)
    ]);

    // Format results
    const cashBalanceNum = Number(cashBalance ?? 0);
    const totalCashBalance = `₹${cashBalanceNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalBankBalance = `₹${(Number(bankBalanceResult[0]?.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const todaysSales = `₹${(Number(todaysSalesResult[0]?.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const todaysPurchases = `₹${(Number(todaysPurchasesResult[0]?.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalUdhaar = `₹${(Number(totalUdhaarResult[0]?.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalShortfall = `₹${(Number(totalShortfallResult[0]?.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const todaysCommission = `₹${(Number(todaysCommissionResult[0]?.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return {
      totalCashBalance,
      totalBankBalance,
      todaysSales,
      todaysPurchases,
      totalUdhaar,
      totalShortfall,
      todaysCommission,
      recentPurchases,
      recentSales,
      topRetailersByUdhaar
    };
  }

  async getRecentPurchases(tenantId: string, limit: number = 5): Promise<RecentPurchase[]> {
    const recentPurchases = await db
      .select({
        id: purchaseInvoices.id,
        invoiceNumber: purchaseInvoices.invoiceNumber,
        invoiceDate: purchaseInvoices.invoiceDate,
        vendorName: vendors.name,
        netAmount: purchaseInvoices.netAmount,
        status: purchaseInvoices.status
      })
      .from(purchaseInvoices)
      .innerJoin(vendors, and(eq(purchaseInvoices.vendorId, vendors.id), eq(vendors.tenantId, tenantId)))
      .where(withTenant(purchaseInvoices, tenantId))
      .orderBy(desc(purchaseInvoices.createdAt))
      .limit(limit);

    return recentPurchases.map(purchase => ({
      ...purchase,
      invoiceDate: purchase.invoiceDate.toISOString(),
      netAmount: `₹${Number(purchase.netAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));
  }

  async getRecentSales(tenantId: string, limit: number = 5): Promise<RecentSale[]> {
    const recentSales = await db
      .select({
        id: salesInvoices.id,
        invoiceNumber: salesInvoices.invoiceNumber,
        invoiceDate: salesInvoices.invoiceDate,
        retailerName: retailers.name,
        totalAmount: salesInvoices.totalAmount,
        status: salesInvoices.status
      })
      .from(salesInvoices)
      .innerJoin(retailers, and(eq(salesInvoices.retailerId, retailers.id), eq(retailers.tenantId, tenantId)))
      .where(withTenant(salesInvoices, tenantId))
      .orderBy(desc(salesInvoices.createdAt))
      .limit(limit);

    return recentSales.map(sale => ({
      ...sale,
      invoiceDate: sale.invoiceDate.toISOString(),
      totalAmount: `₹${Number(sale.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));
  }

  async getTopRetailersByUdhaar(tenantId: string, limit: number = 5): Promise<TopRetailerByUdhaar[]> {
    const topRetailers = await db
      .select({
        id: retailers.id,
        name: retailers.name,
        phone: retailers.phone,
        udhaaarBalance: retailers.udhaaarBalance
      })
      .from(retailers)
      .where(withTenant(retailers, tenantId, eq(retailers.isActive, true)))
      .orderBy(desc(retailers.udhaaarBalance))
      .limit(limit);

    return topRetailers.map(retailer => ({
      ...retailer,
      udhaaarBalance: `₹${Number(retailer.udhaaarBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));
  }
}