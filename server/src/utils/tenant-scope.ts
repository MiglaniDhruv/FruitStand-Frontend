import { SQL, and, eq } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

/**
 * Helper function to create tenant-scoped WHERE conditions
 * @param table - The Drizzle table schema
 * @param tenantId - The tenant ID to filter by
 * @param existingCondition - Optional existing WHERE condition to combine with
 * @returns SQL condition with tenant filtering
 */
export function withTenant<T extends PgTable>(
  table: T, 
  tenantId: string, 
  existingCondition?: SQL
): SQL {
  const tenantCondition = eq((table as any).tenantId, tenantId);
  
  if (existingCondition) {
    return and(tenantCondition, existingCondition)!;
  }
  
  return tenantCondition;
}



/**
 * Helper function to ensure tenantId is included in insert data
 * @param data - The data object to insert
 * @param tenantId - The tenant ID to add
 * @returns Data object with tenantId included
 */
export function ensureTenantInsert<T extends Record<string, any>>(
  data: T,
  tenantId: string
): T & { tenantId: string } {
  return {
    ...data,
    tenantId
  };
}

/**
 * Helper function to create tenant-scoped conditions for multiple tables
 * @param conditions - Array of [table, tenantId] pairs
 * @returns Combined SQL condition with tenant filtering for all tables
 */
export function withMultiTenant(
  conditions: Array<[PgTable, string]>
): SQL | undefined {
  const tenantConditions = conditions.map(([table, tenantId]) => 
    eq((table as any).tenantId, tenantId)
  );
  
  if (tenantConditions.length === 0) return undefined;
  if (tenantConditions.length === 1) return tenantConditions[0];
  
  return and(...tenantConditions)!;
}

/**
 * Helper function for tenant-aware pagination setup
 * @param table - The primary table for pagination
 * @param tenantId - The tenant ID to filter by
 * @param options - Pagination options
 * @returns Object with pagination info and tenant condition
 */
export function withTenantPagination<T extends PgTable>(
  table: T,
  tenantId: string,
  options: any
): {
  page: number;
  limit: number;
  offset: number;
  tenantCondition: SQL;
} {
  // This would typically integrate with your pagination utilities
  // For now, return basic structure - implementation depends on your pagination helper
  const page = options.page || 1;
  const limit = options.limit || 10;
  const offset = (page - 1) * limit;
  const tenantCondition = withTenant(table, tenantId);
  
  return {
    page,
    limit,
    offset,
    tenantCondition
  };
}