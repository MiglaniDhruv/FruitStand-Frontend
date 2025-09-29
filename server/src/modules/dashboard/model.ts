import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { vendors, retailers, purchaseInvoices, salesInvoices, stock } from '@shared/schema';
import { withTenant } from '../../utils/tenant-scope';

export class DashboardModel {
  async getDashboardKPIs(tenantId: string): Promise<any> {
    const vendorsList = await db.select().from(vendors).where(withTenant(vendors, tenantId, eq(vendors.isActive, true)));
    const retailersList = await db.select().from(retailers).where(withTenant(retailers, tenantId, eq(retailers.isActive, true)));
    const purchaseInvoicesList = await db.select().from(purchaseInvoices).where(withTenant(purchaseInvoices, tenantId));
    const salesInvoicesList = await db.select().from(salesInvoices).where(withTenant(salesInvoices, tenantId));
    const pendingInvoicesList = await db.select().from(purchaseInvoices).where(withTenant(purchaseInvoices, tenantId, eq(purchaseInvoices.status, "Partially Paid")));
    
    // Calculate total stock value (simplified) with tenant filtering
    const stockItems = await db.select().from(stock).where(withTenant(stock, tenantId));
    let totalStockValue = 0;
    let totalStockKgs = 0;
    
    stockItems.forEach(item => {
      const kgs = parseFloat(item.quantityInKgs || "0");
      totalStockKgs += kgs;
      // Estimate stock value at average rate of 40 per kg
      totalStockValue += kgs * 40;
    });
    
    return {
      todaySales: "₹45,250.00", // Mock data for today's sales
      pendingPayments: "₹18,500.00", // Mock data for pending payments
      pendingInvoicesCount: pendingInvoicesList.length,
      activeVendors: vendorsList.length,
      stockValue: `₹${totalStockValue.toLocaleString('en-IN')}.00`,
      totalStockKgs: `${totalStockKgs.toFixed(0)} kg`
    };
  }
}