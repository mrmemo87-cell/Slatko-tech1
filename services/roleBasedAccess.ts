/**
 * Role-based data access control layer
 * Ensures workers can only access production-related data
 */

import { supabase } from '../config/supabase';

export class RoleBasedDataAccess {
  /**
   * Check if user has permission to access a resource
   */
  static async checkAccess(userRole: string, resourceType: string): Promise<boolean> {
    const role = userRole?.toLowerCase() || '';
    const resource = resourceType?.toLowerCase() || '';

    // Worker permissions
    if (['worker', 'production', 'production_worker', 'production_staff'].includes(role)) {
      // Workers can ONLY access production-related resources
      const allowedResources = [
        'production_batches',
        'orders', // Only for viewing production stage
        'workflow', // Production workflow
        'production_portal'
      ];
      return allowedResources.some(r => resource.includes(r));
    }

    // Non-workers (managers, admins) can access all resources
    return true;
  }

  /**
   * Wrap a query to add role-based filtering
   */
  static async executeWithRoleCheck(
    userRole: string,
    resourceType: string,
    queryFn: () => Promise<any>
  ): Promise<any> {
    const hasAccess = await this.checkAccess(userRole, resourceType);

    if (!hasAccess) {
      console.error(`🔒 ACCESS DENIED: User role "${userRole}" cannot access "${resourceType}"`);
      throw new Error(`Access denied: You do not have permission to access ${resourceType}`);
    }

    return queryFn();
  }

  /**
   * Log access attempts for security audit
   */
  static logAccessAttempt(
    userId: string,
    userRole: string,
    resourceType: string,
    allowed: boolean
  ): void {
    const timestamp = new Date().toISOString();
    const status = allowed ? '✅ ALLOWED' : '🔒 DENIED';
    console.log(
      `[${timestamp}] ${status} | User: ${userId} (${userRole}) | Resource: ${resourceType}`
    );

    // In production, you'd send this to a logging service
    // Example: logToSentry({ userId, userRole, resourceType, allowed, timestamp })
  }
}
