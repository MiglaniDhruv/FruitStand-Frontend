import { eq, desc, asc, and, or, ilike, count } from 'drizzle-orm';
import { db } from '../../../db';
import { retailers, type Retailer, type InsertRetailer, type PaginationOptions, type PaginatedResult } from '@shared/schema';
import { normalizePaginationOptions, buildPaginationMetadata, withTenantPagination } from '../../utils/pagination';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';

export class RetailerModel {
  async getRetailers(tenantId: string): Promise<Retailer[]> {
    return await db.select().from(retailers)
      .where(withTenant(retailers, tenantId, eq(retailers.isActive, true)))
      .orderBy(asc(retailers.name));
  }

  async getRetailer(tenantId: string, id: string): Promise<Retailer | undefined> {
    const [retailer] = await db.select().from(retailers)
      .where(withTenant(retailers, tenantId, eq(retailers.id, id)));
    return retailer || undefined;
  }

  async createRetailer(tenantId: string, insertRetailer: InsertRetailer): Promise<Retailer> {
    const retailerWithTenant = ensureTenantInsert(insertRetailer, tenantId);
    const [retailer] = await db.insert(retailers).values(retailerWithTenant).returning();
    return retailer;
  }

  async updateRetailer(tenantId: string, id: string, insertRetailer: Partial<InsertRetailer>): Promise<Retailer | undefined> {
    const [retailer] = await db
      .update(retailers)
      .set(insertRetailer)
      .where(withTenant(retailers, tenantId, eq(retailers.id, id)))
      .returning();
    return retailer || undefined;
  }

  async deleteRetailer(tenantId: string, id: string): Promise<boolean> {
    const [retailer] = await db
      .update(retailers)
      .set({ isActive: false })
      .where(withTenant(retailers, tenantId, eq(retailers.id, id)))
      .returning();
    return !!retailer;
  }

  async getRetailersPaginated(tenantId: string, options?: PaginationOptions & {
    search?: string;
    status?: string;
  }): Promise<PaginatedResult<Retailer>> {
    const { page, limit, offset, tenantCondition } = withTenantPagination(retailers, tenantId, options || {});
    
    // Build WHERE conditions array starting with tenant filtering
    const whereConditions = [tenantCondition];
    
    // Filter by active retailers by default unless status is specified
    if (options?.status !== 'all') {
      whereConditions.push(eq(retailers.isActive, true));
    }
    
    // Handle search across name and phone fields
    if (options?.search) {
      const searchConditions = [
        ilike(retailers.name, `%${options.search}%`),
        ilike(retailers.phone, `%${options.search}%`)
      ];
      whereConditions.push(or(...searchConditions)!);
    }
    
    // Combine all conditions including tenant filtering
    const finalWhereCondition = and(...whereConditions)!;
    
    // Apply sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Build sorting order
    let orderByClause;
    if (sortBy === 'name') {
      orderByClause = sortOrder === 'asc' ? asc(retailers.name) : desc(retailers.name);
    } else if (sortBy === 'phone') {
      orderByClause = sortOrder === 'asc' ? asc(retailers.phone) : desc(retailers.phone);
    } else { // default to createdAt
      orderByClause = sortOrder === 'asc' ? asc(retailers.createdAt) : desc(retailers.createdAt);
    }
    
    // Build and execute paginated query with tenant filtering
    const retailersData = await db.select()
      .from(retailers)
      .where(finalWhereCondition)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    // Get total count with same conditions including tenant filtering
    const [{ count: total }] = await db.select({ count: count() })
      .from(retailers)
      .where(finalWhereCondition);
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data: retailersData, pagination };
  }
}