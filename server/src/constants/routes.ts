/**
 * Shared system routes constants to avoid drift between server and middleware
 * These routes are treated as system routes and bypass tenant processing
 * Only true system routes (health checks, API root) should bypass tenant validation
 */
export const SYSTEM_ROUTES = new Set<string>([
  'api',
  'health',
  'status'
]);