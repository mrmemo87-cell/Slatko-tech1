/**
 * RLS Error Handler
 * Provides user-friendly error messages when RLS policies block access
 */

export const RLS_ERROR_MESSAGES: Record<string, string> = {
  // Management tables - workers cannot access
  'permission denied for relation "products"': 
    '🔒 Access Denied: Worker accounts cannot access product management',
  
  'permission denied for relation "clients"': 
    '🔒 Access Denied: Worker accounts cannot access client management',
  
  'permission denied for relation "materials"': 
    '🔒 Access Denied: Worker accounts cannot access materials management',
  
  'permission denied for relation "return_items"': 
    '🔒 Access Denied: Worker accounts cannot access returns',
  
  // Operations denied for workers
  'UPDATE permission denied': 
    '🔒 Access Denied: Workers cannot modify this data',
  
  'INSERT permission denied': 
    '🔒 Access Denied: Workers cannot create this data',
  
  'DELETE permission denied': 
    '🔒 Access Denied: Workers cannot delete data',
  
  // Fallback
  'permission denied': 
    '🔒 Access Denied: You do not have permission to access this resource',
};

export function getErrorMessage(error: any): string {
  const errorMessage = error?.message || error?.toString() || '';
  
  // Check for specific RLS errors
  for (const [key, message] of Object.entries(RLS_ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  // Default message
  return '⚠️ Error loading data. Please check your permissions or try again.';
}

export function isRLSError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  return errorMessage.toLowerCase().includes('permission denied') ||
         errorMessage.toLowerCase().includes('rls');
}

export function isWorkerAccessDenied(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  return isRLSError(error) && 
         (errorMessage.toLowerCase().includes('products') ||
          errorMessage.toLowerCase().includes('clients') ||
          errorMessage.toLowerCase().includes('materials') ||
          errorMessage.toLowerCase().includes('return_items'));
}
