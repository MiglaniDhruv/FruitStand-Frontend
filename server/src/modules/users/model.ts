import bcrypt from "bcrypt";
import { eq, asc } from "drizzle-orm";
import { db } from "../../../db";
import { users, type User, type InsertUser, type PaginationOptions, type PaginatedResult } from "@shared/schema";
import { 
  applySorting,
  applySearchFilter,
  normalizePaginationOptions,
  getCountWithSearch,
  buildPaginationMetadata
} from "../../utils/pagination";

export class UserModel {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: string, insertUser: Partial<InsertUser>): Promise<User | undefined> {
    const updateData = { ...insertUser };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserPermissions(id: string, permissions: string[]): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ permissions })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUsersPaginated(options: PaginationOptions): Promise<PaginatedResult<User>> {
    const { page, limit, offset } = normalizePaginationOptions(options);
    
    // Define table columns for sorting and searching
    const tableColumns = {
      username: users.username,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt
    };
    
    const searchableColumns = [users.username, users.name];
    
    // Build base query
    let query = db.select().from(users);
    
    // Apply search filter using helper
    if (options.search) {
      query = applySearchFilter(query, options.search, searchableColumns);
    }
    
    // Apply sorting using helper
    query = applySorting(query, options.sortBy || 'createdAt', options.sortOrder || 'asc', tableColumns);
    
    // Apply pagination and execute
    const data = await query.limit(limit).offset(offset);
    
    // Get total count
    const total = await getCountWithSearch(
      users, 
      options.search ? searchableColumns : undefined, 
      options.search
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }
}