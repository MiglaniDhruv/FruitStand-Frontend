import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Comment 1: Server-side fallback for tenant consistency validation
 * 
 * Validates that all referenced records belong to the same tenant.
 * This provides a fallback guard before database-level composite FKs are deployed.
 * 
 * @param db - Database connection instance
 * @param tenantId - The tenant ID that all references should match
 * @param refs - Array of table/id pairs to validate
 * @throws Error if any reference has a different tenant_id or doesn't exist
 */
export async function assertSameTenant(
  db: NodePgDatabase<any>, 
  tenantId: string, 
  refs: Array<{ table: string; id: string | null; allowNull?: boolean }>
) {
  for (const ref of refs) {
    // Skip null references if allowed
    if (!ref.id) {
      if (ref.allowNull !== false) {
        continue;
      } else {
        throw new Error(`Required reference ${ref.table} cannot be null`);
      }
    }

    try {
      // Query the referenced table to get its tenant_id
      const result = await db.execute(
        sql`SELECT tenant_id FROM ${sql.identifier(ref.table)} WHERE id = ${ref.id}`
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error(`Referenced record not found in ${ref.table} with id: ${ref.id}`);
      }

      const row = result.rows[0] as { tenant_id: string };
      if (row.tenant_id !== tenantId) {
        throw new Error(
          `Tenant mismatch for ${ref.table}: expected ${tenantId}, got ${row.tenant_id}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Tenant validation failed for ${ref.table}: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Convenience wrapper for payment-related tenant validation
 */
export async function validatePaymentTenancy(
  db: NodePgDatabase<any>,
  tenantId: string,
  data: {
    invoiceId: string;
    vendorId: string;
    bankAccountId?: string | null;
  }
) {
  await assertSameTenant(db, tenantId, [
    { table: 'purchase_invoices', id: data.invoiceId },
    { table: 'vendors', id: data.vendorId },
    { table: 'bank_accounts', id: data.bankAccountId || null, allowNull: true }
  ]);
}

/**
 * Convenience wrapper for sales payment-related tenant validation
 */
export async function validateSalesPaymentTenancy(
  db: NodePgDatabase<any>,
  tenantId: string,
  data: {
    invoiceId: string;
    retailerId: string;
    bankAccountId?: string | null;
  }
) {
  await assertSameTenant(db, tenantId, [
    { table: 'sales_invoices', id: data.invoiceId },
    { table: 'retailers', id: data.retailerId },
    { table: 'bank_accounts', id: data.bankAccountId || null, allowNull: true }
  ]);
}

/**
 * Convenience wrapper for expense-related tenant validation
 */
export async function validateExpenseTenancy(
  db: NodePgDatabase<any>,
  tenantId: string,
  data: {
    categoryId: string;
    bankAccountId?: string | null;
  }
) {
  await assertSameTenant(db, tenantId, [
    { table: 'expense_categories', id: data.categoryId },
    { table: 'bank_accounts', id: data.bankAccountId || null, allowNull: true }
  ]);
}

/**
 * Convenience wrapper for stock movement-related tenant validation
 */
export async function validateStockMovementTenancy(
  db: NodePgDatabase<any>,
  tenantId: string,
  data: {
    itemId: string;
    vendorId?: string | null;
    retailerId?: string | null;
    purchaseInvoiceId?: string | null;
  }
) {
  await assertSameTenant(db, tenantId, [
    { table: 'items', id: data.itemId },
    { table: 'vendors', id: data.vendorId || null, allowNull: true },
    { table: 'retailers', id: data.retailerId || null, allowNull: true },
    { table: 'purchase_invoices', id: data.purchaseInvoiceId || null, allowNull: true }
  ]);
}