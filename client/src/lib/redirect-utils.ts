/**
 * Shared utility to prevent multiple redirects to login
 */

// Module-level guard to prevent multiple redirects
let redirectingToLogin = false;

/**
 * Safely redirect to login page, preventing multiple simultaneous redirects
 */
export function redirectToLoginOnce(loginPath: string): void {
  if (redirectingToLogin) {
    return; // Already redirecting, prevent duplicate
  }
  
  redirectingToLogin = true;
  
  // Small delay to allow other code to complete
  setTimeout(() => {
    window.location.href = loginPath;
  }, 0);
}

/**
 * Reset the redirect guard (mainly for testing)
 */
export function resetRedirectGuard(): void {
  redirectingToLogin = false;
}