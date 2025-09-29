import { eq, desc, asc, and, or, gte, lte, ilike, inArray, count } from 'drizzle-orm';
import { db } from '../../../db';
import { crateTransactions, retailers, CRATE_TRANSACTION_TYPES, type CrateTransaction, type InsertCrateTransaction, type CrateTransactionWithRetailer, type PaginationOptions, type PaginatedResult } from '@shared/schema';
import { normalizePaginationOptions, buildPaginationMetadata } from '../../utils/pagination';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';

export class CrateModel {
  async getCrateTransactions(tenantId: string): Promise<CrateTransactionWithRetailer[]> {
    const transactions = await db.select().from(crateTransactions)
      .where(withTenant(crateTransactions, tenantId))
      .orderBy(desc(crateTransactions.createdAt));

    if (transactions.length === 0) {
      return [];
    }

    // Batch fetch retailers for all transactions with tenant filtering
    const retailerIds = transactions.map(tx => tx.retailerId);
    const retailersData = await db.select().from(retailers)
      .where(withTenant(retailers, tenantId, inArray(retailers.id, retailerIds)));
    
    // Create retailer lookup map
    const retailerMap = new Map(retailersData.map(r => [r.id, r]));
    
    // Assemble final data with retailer relationships
    const result = transactions.map(transaction => {
      const retailer = retailerMap.get(transaction.retailerId);
      return {
        ...transaction,
        retailer: retailer || null
      };
    }) as CrateTransactionWithRetailer[];

    return result;
  }

  async getCrateTransactionsPaginated(tenantId: string, options?: PaginationOptions & {
    search?: string;
    type?: 'given' | 'returned';
    retailerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResult<CrateTransactionWithRetailer>> {
    const { page, limit, offset } = normalizePaginationOptions(options || {});
    
    // Build WHERE conditions array with tenant filtering
    const whereConditions = [withTenant(crateTransactions, tenantId)];
    
    // Apply type filter
    if (options?.type) {
      const transactionType = options.type === 'given' ? CRATE_TRANSACTION_TYPES.GIVEN : CRATE_TRANSACTION_TYPES.RETURNED;
      whereConditions.push(eq(crateTransactions.transactionType, transactionType));
    }
    
    // Apply retailer filter
    if (options?.retailerId) {
      whereConditions.push(eq(crateTransactions.retailerId, options.retailerId));
    }
    
    // Apply date range filter
    if (options?.dateFrom) {
      whereConditions.push(gte(crateTransactions.transactionDate, new Date(options.dateFrom)));
    }
    if (options?.dateTo) {
      whereConditions.push(lte(crateTransactions.transactionDate, new Date(options.dateTo)));
    }
    
    // Handle search by getting matching retailer IDs or transaction fields
    if (options?.search) {
      // Get retailer IDs that match search with tenant filtering
      const matchingRetailers = await db.select({ id: retailers.id })
        .from(retailers)
        .where(withTenant(retailers, tenantId, ilike(retailers.name, `%${options.search}%`)));
      const retailerIds = matchingRetailers.map(r => r.id);
      
      // Build search conditions
      const searchConditions = [];
      
      // Search in transaction type
      searchConditions.push(ilike(crateTransactions.transactionType, `%${options.search}%`));
      
      // Search in notes
      searchConditions.push(ilike(crateTransactions.notes, `%${options.search}%`));
      
      // Search in matching retailer IDs
      if (retailerIds.length > 0) {
        searchConditions.push(inArray(crateTransactions.retailerId, retailerIds));
      }
      
      if (searchConditions.length > 0) {
        whereConditions.push(or(...searchConditions)!);
      }
    }
    
    // Combine all conditions
    const finalWhereCondition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Apply sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Build sorting order
    let orderByClause;
    if (sortBy === 'transactionDate') {
      orderByClause = sortOrder === 'asc' ? asc(crateTransactions.transactionDate) : desc(crateTransactions.transactionDate);
    } else if (sortBy === 'transactionType') {
      orderByClause = sortOrder === 'asc' ? asc(crateTransactions.transactionType) : desc(crateTransactions.transactionType);
    } else if (sortBy === 'quantity') {
      orderByClause = sortOrder === 'asc' ? asc(crateTransactions.quantity) : desc(crateTransactions.quantity);
    } else if (sortBy === 'retailerName') {
      orderByClause = sortOrder === 'asc' ? asc(retailers.name) : desc(retailers.name);
    } else { // default to createdAt
      orderByClause = sortOrder === 'asc' ? asc(crateTransactions.createdAt) : desc(crateTransactions.createdAt);
    }
    
    // Build and execute paginated query with JOIN for retailer data and tenant filtering
    const finalWhereWithRetailerTenant = finalWhereCondition 
      ? and(finalWhereCondition, withTenant(retailers, tenantId))
      : and(withTenant(crateTransactions, tenantId), withTenant(retailers, tenantId));
    
    const transactionsData = await db.select({
        transaction: crateTransactions,
        retailer: retailers
      })
      .from(crateTransactions)
      .leftJoin(retailers, eq(crateTransactions.retailerId, retailers.id))
      .where(finalWhereWithRetailerTenant)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    // Assemble final data with retailer relationships
    const data = transactionsData
      .map(({ transaction, retailer }) => {
        if (!retailer) return null;
        return {
          ...transaction,
          retailer
        };
      })
      .filter(transaction => transaction !== null) as CrateTransactionWithRetailer[];
    
    // Get total count with same conditions including tenant filtering
    const [{ count: total }] = await db.select({ count: count() })
      .from(crateTransactions)
      .leftJoin(retailers, eq(crateTransactions.retailerId, retailers.id))
      .where(finalWhereWithRetailerTenant);
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  async getCrateTransactionsByRetailer(tenantId: string, retailerId: string): Promise<CrateTransactionWithRetailer[]> {
    const transactions = await db.select().from(crateTransactions)
      .where(withTenant(crateTransactions, tenantId, eq(crateTransactions.retailerId, retailerId)))
      .orderBy(desc(crateTransactions.createdAt));

    if (transactions.length === 0) {
      return [];
    }

    // Get the retailer with tenant filtering
    const [retailer] = await db.select().from(retailers)
      .where(withTenant(retailers, tenantId, eq(retailers.id, retailerId)));
    
    if (!retailer) {
      return [];
    }
    
    // Assemble final data with retailer relationship
    const result = transactions.map(transaction => ({
      ...transaction,
      retailer
    }));

    return result;
  }

  async createCrateTransaction(tenantId: string, transactionData: InsertCrateTransaction): Promise<CrateTransactionWithRetailer> {
    const transactionWithTenant = ensureTenantInsert(transactionData, tenantId);
    const [transaction] = await db.insert(crateTransactions).values(transactionWithTenant).returning();
    
    // Get the retailer with tenant filtering
    const [retailer] = await db.select().from(retailers)
      .where(withTenant(retailers, tenantId, eq(retailers.id, transaction.retailerId)));
    
    if (!retailer) {
      throw new Error('Retailer not found');
    }
    
    return {
      ...transaction,
      retailer
    };
  }
}