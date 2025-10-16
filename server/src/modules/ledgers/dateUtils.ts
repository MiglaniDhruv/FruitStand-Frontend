/**
 * Date utility functions for ledger operations
 * These ensure consistent timezone handling across all ledger methods
 */

/**
 * Converts a date string to the start of day (00:00:00.000) in UTC
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object set to start of day in UTC
 */
export function getStartOfDay(dateStr: string): Date {
  const date = new Date(dateStr);
  // Set to start of day in UTC to avoid timezone ambiguity
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Converts a date string to the end of day (23:59:59.999) in UTC
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object set to end of day in UTC
 */
export function getEndOfDay(dateStr: string): Date {
  const date = new Date(dateStr);
  // Set to end of day in UTC to include all entries throughout the day
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

/**
 * Validates if a date string can be parsed into a valid Date object
 * @param dateStr - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDateString(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
