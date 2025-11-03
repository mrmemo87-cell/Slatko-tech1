import { supabase } from '../config/supabase';
import { EnhancedDelivery, WorkflowEvent, ProductionTask, DeliveryRoute, RealTimeMetrics, WorkflowStage, UserRole } from '../types/workflow';

class WorkflowService {
  private subscriptions: Map<string, any> = new Map();

  // Real-time workflow management
  async updateOrderWorkflowStage(
    deliveryId: string, 
    newStage: WorkflowStage, 
    userId: string, 
    userRole: UserRole,
    notes?: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Update delivery workflow stage
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({ 
          workflow_stage: newStage,
          updated_at: new Date().toISOString(),
          ...(newStage === 'in_production' && { production_start_time: new Date().toISOString() }),
          ...(newStage === 'ready_for_delivery' && { production_completed_time: new Date().toISOString() }),
          ...(newStage === 'delivered' && { delivery_completed_time: new Date().toISOString() }),
        })
        .eq('id', deliveryId);

      if (deliveryError) throw deliveryError;

      // Run background operations in parallel (don't block UI)
      const backgroundTasks = [];
      
      // Log workflow event (async, non-blocking)
      backgroundTasks.push(
        this.logWorkflowEvent(deliveryId, newStage, userId, userRole, notes, metadata)
          .catch(err => console.warn('Workflow logging failed:', err))
      );

      // Update production tasks if needed (async, non-blocking)
      if (newStage === 'in_production') {
        backgroundTasks.push(
          this.createProductionTasks(deliveryId)
            .catch(err => console.warn('Production tasks creation failed:', err))
        );
      }

      // Update delivery routes if ready for delivery (async, non-blocking)
      if (newStage === 'ready_for_delivery') {
        backgroundTasks.push(
          this.addToDeliveryRoute(deliveryId)
            .catch(err => console.warn('Delivery route update failed:', err))
        );
      }

      // Run all background tasks in parallel, don't await them
      Promise.all(backgroundTasks);

    } catch (error) {
      console.error('Error updating workflow stage:', error);
      throw error;
    }
  }

  // Log all workflow events for audit trail
  async logWorkflowEvent(
    deliveryId: string,
    stage: WorkflowStage,
    userId: string,
    userRole: UserRole,
    notes?: string,
    metadata?: any
  ): Promise<void> {
    const { error } = await supabase
      .from('workflow_events')
      .insert([{
        delivery_id: deliveryId,
        stage: stage,
        user_id: userId,
        user_role: userRole,
        notes: notes,
        metadata: metadata,
        timestamp: new Date().toISOString()
      }]);

    if (error) throw error;
  }

  // Create production tasks when order moves to production
  async createProductionTasks(deliveryId: string): Promise<void> {
    // Get delivery items
    const { data: deliveryItems, error: itemsError } = await supabase
      .from('delivery_items')
      .select(`
        *,
        products:product_id (name, category, production_time)
      `)
      .eq('delivery_id', deliveryId);

    if (itemsError) throw itemsError;

    // Create production tasks for each item
    const productionTasks = deliveryItems.map(item => ({
      delivery_id: deliveryId,
      product_id: item.product_id,
      task_name: `Produce ${item.quantity}x ${item.products.name}`,
      product_name: item.products.name,
      quantity: item.quantity,
      priority: this.calculatePriority(deliveryId, item.quantity),
      estimated_time: (item.products.production_time || 30) * item.quantity,
      status: 'pending'
    }));

    const { error: taskError } = await supabase
      .from('production_tasks')
      .insert(productionTasks);

    if (taskError) throw taskError;
  }

  // Calculate task priority based on order urgency and quantity
  private calculatePriority(deliveryId: string, quantity: number): 'low' | 'medium' | 'high' | 'urgent' {
    // Logic for priority calculation
    if (quantity >= 20) return 'urgent';
    if (quantity >= 10) return 'high';
    if (quantity >= 5) return 'medium';
    return 'low';
  }

  // Add completed orders to delivery routes
  async addToDeliveryRoute(deliveryId: string): Promise<void> {
    // Find or create today's delivery route
    const today = new Date().toISOString().split('T')[0];
    
    let { data: route, error: routeError } = await supabase
      .from('delivery_routes')
      .select('*')
      .eq('date', today)
      .eq('status', 'planned')
      .single();

    if (routeError && routeError.code !== 'PGRST116') throw routeError;

    if (!route) {
      // Create new route for today
      const { data: newRoute, error: createError } = await supabase
        .from('delivery_routes')
        .insert([{
          date: today,
          status: 'planned',
          deliveries: [deliveryId],
          driver_id: null, // Will be assigned later
          estimated_duration: 60 // Base time
        }])
        .select()
        .single();

      if (createError) throw createError;
    } else {
      // Add to existing route
      const updatedDeliveries = [...(route.deliveries || []), deliveryId];
      const { error: updateError } = await supabase
        .from('delivery_routes')
        .update({ 
          deliveries: updatedDeliveries,
          estimated_duration: updatedDeliveries.length * 30 // 30 min per stop
        })
        .eq('id', route.id);

      if (updateError) throw updateError;
    }
  }

  // Real-time broadcasting
  async broadcastWorkflowUpdate(deliveryId: string, stage: WorkflowStage): Promise<void> {
    // Skip real-time broadcasting for better performance
    // The UI will refresh on next load or manual refresh
    console.log(`📡 Workflow update: ${deliveryId} → ${stage}`);
    return Promise.resolve();
  }

  // Subscribe to real-time workflow updates
  subscribeToWorkflowUpdates(
    userRole: UserRole,
    onUpdate: (update: any) => void
  ): () => void {
    const channel = supabase.channel(`workflow-${userRole}`);

    // Subscribe to workflow events relevant to user role
    const subscription = channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deliveries',
        filter: this.getWorkflowFilter(userRole)
      }, onUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'production_tasks'
      }, onUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_routes'
      }, onUpdate)
      .subscribe();

    this.subscriptions.set(`workflow-${userRole}`, subscription);

    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(`workflow-${userRole}`);
    };
  }

  private getWorkflowFilter(role: UserRole): string {
    switch (role) {
      case 'sales':
        return 'workflow_stage.in.(pending,confirmed,delivered,settled)';
      case 'production':
        return 'workflow_stage.in.(confirmed,in_production,ready_for_delivery)';
      case 'delivery':
        return 'workflow_stage.in.(ready_for_delivery,out_for_delivery,delivered)';
      case 'finance':
        return 'workflow_stage.in.(delivered,settlement,completed)';
      case 'admin':
        return ''; // Admin sees all
      default:
        return '';
    }
  }

  // Get real-time metrics
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const today = new Date().toISOString().split('T')[0];

    const [
      { data: todayOrders },
      { data: productionOrders },
      { data: readyOrders },
      { data: deliveryOrders }
    ] = await Promise.all([
      supabase.from('deliveries').select('*').gte('date', today),
      supabase.from('deliveries').select('*').eq('workflow_stage', 'in_production'),
      supabase.from('deliveries').select('*').eq('workflow_stage', 'ready_for_delivery'),
      supabase.from('deliveries').select('*').eq('workflow_stage', 'out_for_delivery')
    ]);

    const totalRevenue = todayOrders?.reduce((sum, order) => {
      return sum + (order.items?.reduce((itemSum: number, item: any) => 
        itemSum + (item.quantity * item.price), 0) || 0);
    }, 0) || 0;

    return {
      ordersToday: todayOrders?.length || 0,
      ordersInProduction: productionOrders?.length || 0,
      ordersReadyForDelivery: readyOrders?.length || 0,
      ordersOutForDelivery: deliveryOrders?.length || 0,
      totalRevenueToday: totalRevenue,
      averageOrderValue: todayOrders?.length ? totalRevenue / todayOrders.length : 0,
      productionEfficiency: await this.calculateProductionEfficiency(),
      deliverySuccessRate: await this.calculateDeliverySuccessRate(),
      customerSatisfactionScore: 4.5, // Mock data - implement customer feedback
      lastUpdated: new Date().toISOString()
    };
  }

  private async calculateProductionEfficiency(): Promise<number> {
    // Calculate based on actual vs estimated production times
    const { data: completedTasks } = await supabase
      .from('production_tasks')
      .select('estimated_time, actual_time')
      .eq('status', 'completed')
      .gte('completed_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!completedTasks?.length) return 0;

    const efficiency = completedTasks.reduce((sum, task) => {
      const actualTime = task.actual_time || task.estimated_time;
      return sum + (task.estimated_time / actualTime);
    }, 0) / completedTasks.length;

    return Math.min(efficiency * 100, 100);
  }

  private async calculateDeliverySuccessRate(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('workflow_stage')
      .gte('date', today);

    if (!deliveries?.length) return 0;

    const successful = deliveries.filter(d => 
      ['delivered', 'settled', 'completed'].includes(d.workflow_stage)
    ).length;

    return (successful / deliveries.length) * 100;
  }

  // Cleanup subscriptions
  cleanup(): void {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }
}

export const workflowService = new WorkflowService();