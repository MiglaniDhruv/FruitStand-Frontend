/**
 * Database error handler utility that transforms database-specific errors into user-friendly custom errors
 */

import { ValidationError, BadRequestError, ConflictError, DatabaseError } from '../types';
import { ERROR_CODES } from '../constants/error-codes';

export function handleDatabaseError(error: any): never {
  // Handle Postgres error codes
  if (error && error.code) {
    switch (error.code) {
      case '23505': // unique_violation
        const conflictInfo = extractConstraintInfo(error);
        const resourceName = getResourceNameFromTable(conflictInfo.table);
        const message = `A ${resourceName} with this ${conflictInfo.field} already exists`;
        throw new ConflictError(message);

      case '23503': // foreign_key_violation
        const fkInfo = extractConstraintInfo(error);
        const fkResourceName = getResourceNameFromTable(fkInfo.table);
        throw new BadRequestError(`Cannot delete ${fkResourceName} because it is referenced by other records`);

      case '23502': // not_null_violation
        const column = error.column || 'field';
        throw new ValidationError('Required field missing', { [column]: `${column} is required` });

      case '22P02': // invalid_text_representation
        throw new BadRequestError('Invalid data type provided');

      case '42P01': // undefined_table
        throw new DatabaseError('Database schema error - table not found', error);

      default:
        break;
    }
  }

  // Handle Drizzle ORM errors
  if (isDrizzleError(error)) {
    if (error.message.includes('connection')) {
      throw new DatabaseError('Database connection failed', error);
    }
    if (error.message.includes('timeout')) {
      throw new DatabaseError('Database operation timed out', error);
    }
  }

  // Handle generic database errors
  if (isDatabaseError(error)) {
    if (error.message.includes('connection refused')) {
      throw new DatabaseError('Cannot connect to database', error);
    }
    if (error.message.includes('timeout')) {
      throw new DatabaseError('Database operation timed out', error);
    }
  }

  // Unknown database error
  throw new DatabaseError('Database operation failed', error);
}

export function extractConstraintInfo(error: any): { table: string; field: string; constraint: string } {
  const constraint = error.constraint || '';
  const detail = error.detail || '';
  
  // Try to extract table and field from constraint name
  // Common patterns: table_field_key, table_field_unique, etc.
  const constraintParts = constraint.split('_');
  let table = constraintParts[0] || 'unknown';
  let field = constraintParts[1] || 'field';

  // Try to extract from detail message
  // Example: Key (email)=(test@example.com) already exists
  const detailMatch = detail.match(/Key \(([^)]+)\)/);
  if (detailMatch) {
    field = detailMatch[1];
  }

  // Try to extract table from error message
  const tableMatch = error.table || extractTableFromMessage(error.message);
  if (tableMatch) {
    table = tableMatch;
  }

  return { table, field, constraint };
}

export function getResourceNameFromTable(tableName: string): string {
  const tableToResource: Record<string, string> = {
    users: 'user',
    vendors: 'vendor',
    retailers: 'retailer',
    items: 'item',
    tenants: 'tenant',
    sales_invoices: 'sales invoice',
    purchase_invoices: 'purchase invoice',
    payments: 'payment',
    crate_transactions: 'crate transaction',
    expenses: 'expense',
    stock_entries: 'stock entry',
  };

  return tableToResource[tableName] || tableName.replace(/_/g, ' ');
}

export function isDatabaseError(error: any): boolean {
  if (!error) return false;
  
  // Check for Postgres error patterns
  if (error.code && typeof error.code === 'string') return true;
  
  // Check for common database error messages
  const message = error.message || '';
  const databaseKeywords = [
    'connection',
    'database',
    'query',
    'constraint',
    'violation',
    'timeout',
    'postgres',
    'pg_',
  ];
  
  return databaseKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
}

function isDrizzleError(error: any): boolean {
  return error && (
    error.name?.includes('Drizzle') ||
    error.constructor?.name?.includes('Drizzle') ||
    error.message?.includes('drizzle')
  );
}

function extractTableFromMessage(message: string): string | null {
  // Try to extract table name from error message
  const tableMatch = message.match(/table "([^"]+)"/i);
  return tableMatch ? tableMatch[1] : null;
}