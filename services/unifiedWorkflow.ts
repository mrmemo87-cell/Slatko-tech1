// Unified Workflow Management Service
// Single source of truth for all workflow operations across all portals

import { supabaseApi } from './supabase-api';
import { supabase } from '../config/supabase';

export interface WorkflowOrder {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  date: string;
  status: string;
  workflowStage: string;
  assignedDriver?: string;
  productionNotes?: string;
  deliveryNotes?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalValue: number;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  productionStartTime?: string;
  productionCompletedTime?: string;
  deliveryStartTime?: string;
  deliveryCompletedTime?: string;
}

export class UnifiedWorkflowService {
  private static instance: UnifiedWorkflowService;
  private orders: WorkflowOrder[] = [];
  private listeners: Array<(orders: WorkflowOrder[]) => void> = [];

  static getInstance(): UnifiedWorkflowService {
    if (!UnifiedWorkflowService.instance) {
      UnifiedWorkflowService.instance = new UnifiedWorkflowService();
    }
    return UnifiedWorkflowService.instance;
  }

  // Load all orders and transform to unified format
  async loadOrders(): Promise<WorkflowOrder[]> {
    try {
      const deliveries = await supabaseApi.getDeliveries(200); // Get more orders
      
      this.orders = deliveries.map(delivery => ({
        id: delivery.id,
        invoiceNumber: delivery.invoiceNumber,
        clientId: delivery.clientId,
        clientName: delivery.clientName || 'Unknown Client',
        date: delivery.date,
        status: delivery.status,
        workflowStage: delivery.workflowStage || 'order_placed',
        assignedDriver: delivery.assignedDriver,
        productionNotes: delivery.productionNotes,
        deliveryNotes: delivery.deliveryNotes,
        items: delivery.items?.map(item => ({
          productId: item.productId,
          productName: item.productName || 'Unknown Product',
          quantity: item.quantity,
          price: item.price
        })) || [],
        totalValue: delivery.items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
        actualDeliveryTime: delivery.actualDeliveryTime
      }));

      // Notify all listeners
      this.notifyListeners();
      return this.orders;
      
    } catch (error) {
      console.error('❌ Error loading unified orders:', error);
      throw error;
    }
  }

  // Get orders filtered by workflow stage
  getOrdersByStage(stages: string | string[]): WorkflowOrder[] {
    const stageArray = Array.isArray(stages) ? stages : [stages];
    return this.orders.filter(order => stageArray.includes(order.workflowStage));
  }

  // Get orders assigned to specific driver
  getOrdersByDriver(driverId: string): WorkflowOrder[] {
    return this.orders.filter(order => order.assignedDriver === driverId);
  }

  // Get orders for admin view (all orders with stage info)
  getAdminOrders(): WorkflowOrder[] {
    return [...this.orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Get all orders (for delivery portal overview)
  getAllOrders(): WorkflowOrder[] {
    return [...this.orders];
  }

  // Get orders for production portal
  getProductionOrders(): {
    queue: WorkflowOrder[];
    inProduction: WorkflowOrder[];
    readyForPickup: WorkflowOrder[];
  } {
    return {
      queue: this.getOrdersByStage(['order_placed', 'production_queue']),
      inProduction: this.getOrdersByStage('in_production'),
      readyForPickup: this.getOrdersByStage('ready_for_delivery')
    };
  }

  // Get orders for delivery portal
  getDeliveryOrders(driverId: string): {
    readyForPickup: WorkflowOrder[];
    myRoute: WorkflowOrder[];
    completed: WorkflowOrder[];
  } {
    return {
      readyForPickup: this.getOrdersByStage('ready_for_delivery'),
      myRoute: this.getOrdersByDriver(driverId).filter(order => 
        ['out_for_delivery', 'delivered'].includes(order.workflowStage)
      ),
      completed: this.getOrdersByDriver(driverId).filter(order => 
        ['completed'].includes(order.workflowStage)
      )
    };
  }

  // Update workflow stage with unified logic
  async updateOrderStage(
    orderId: string, 
    newStage: string, 
    userId: string, 
    userRole: string = 'user',
    notes?: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Prepare update data with automatic timestamps
      const updateData: any = {
        workflow_stage: newStage,
        updated_at: new Date().toISOString()
      };

      // Auto-set timestamps based on stage transitions
      const now = new Date().toISOString();
      
      switch (newStage) {
        case 'in_production':
          updateData.production_start_time = now;
          if (notes) updateData.production_notes = notes;
          break;
        case 'quality_check':
        case 'ready_for_delivery':
          updateData.production_completed_time = now;
          break;
        case 'out_for_delivery':
          updateData.delivery_start_time = now;
          if (metadata?.driverId) updateData.assigned_driver = metadata.driverId;
          if (metadata?.estimatedTime) updateData.estimated_delivery_time = metadata.estimatedTime;
          break;
        case 'delivered':
          updateData.actual_delivery_time = now;
          if (notes) updateData.delivery_notes = notes;
          break;
        case 'completed':
          updateData.delivery_completed_time = now;
          break;
      }

      // Apply driver assignment if provided
      if (metadata?.driverId) {
        updateData.assigned_driver = metadata.driverId;
      }

      // Apply notes if provided
      if (notes && !updateData.production_notes && !updateData.delivery_notes) {
        updateData.notes = notes;
      }

      // Update workflow stage via Supabase
      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Reload orders to get fresh data
      await this.loadOrders();
      
    } catch (error) {
      console.error('❌ Error updating order stage:', error);
      throw error;
    }
  }

  // Assign driver to order
  async assignDriver(orderId: string, driverId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          assigned_driver: driverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      await this.loadOrders();
    } catch (error) {
      console.error('❌ Error assigning driver:', error);
      throw error;
    }
  }

  // Update production notes
  async updateProductionNotes(orderId: string, notes: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          production_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      await this.loadOrders();
    } catch (error) {
      console.error('❌ Error updating production notes:', error);
      throw error;
    }
  }

  // Update delivery notes
  async updateDeliveryNotes(orderId: string, notes: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          delivery_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      await this.loadOrders();
    } catch (error) {
      console.error('❌ Error updating delivery notes:', error);
      throw error;
    }
  }

  // Get valid next stages for a given stage (workflow progression rules)
  getValidNextStages(currentStage: string): string[] {
    const progressionMap: Record<string, string[]> = {
      'order_placed': ['production_queue', 'completed'], // Can skip or start production
      'production_queue': ['in_production', 'order_placed'], // Start cooking or revert
      'in_production': ['quality_check', 'production_queue'], // Move to QC or back to queue
      'quality_check': ['ready_for_delivery', 'in_production'], // Pass QC or back to production
      'ready_for_delivery': ['out_for_delivery', 'quality_check'], // Driver picks up or back to QC
      'out_for_delivery': ['delivered', 'ready_for_delivery'], // Delivered or return to ready
      'delivered': ['settlement', 'completed'], // Payment or complete
      'settlement': ['completed'], // Final stage
      'completed': [] // Terminal stage
    };

    return progressionMap[currentStage] || [];
  }

  // Check if a stage transition is valid
  isValidTransition(fromStage: string, toStage: string): boolean {
    const validNextStages = this.getValidNextStages(fromStage);
    return validNextStages.includes(toStage);
  }

  // Get workflow statistics
  getWorkflowStats(): {
    total: number;
    byStage: Record<string, number>;
    averageCompletionTime?: number;
  } {
    const byStage: Record<string, number> = {};
    
    this.orders.forEach(order => {
      byStage[order.workflowStage] = (byStage[order.workflowStage] || 0) + 1;
    });

    return {
      total: this.orders.length,
      byStage
    };
  }

  // Subscribe to order updates
  subscribe(callback: (orders: WorkflowOrder[]) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback([...this.orders]);
      } catch (error) {
        console.error('Error in workflow listener:', error);
      }
    });
  }

  // Get workflow stage display info
  getStageInfo(stage: string): { label: string; color: string; icon: string; description: string } {
    const stageMap: Record<string, any> = {
      'order_placed': {
        label: 'Order Placed',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '📝',
        description: 'New order waiting for production'
      },
      'production_queue': {
        label: 'Production Queue',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⏳',
        description: 'Queued for production'
      },
      'in_production': {
        label: 'Cooking Now',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: '👨‍🍳',
        description: 'Currently being prepared'
      },
      'quality_check': {
        label: 'Quality Check',
        color: 'bg-teal-100 text-teal-800 border-teal-200',
        icon: '🔍',
        description: 'Final quality inspection'
      },
      'ready_for_delivery': {
        label: 'Ready for Pickup',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✅',
        description: 'Completed and ready for delivery'
      },
      'out_for_delivery': {
        label: 'Out for Delivery',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: '🚚',
        description: 'Driver picked up, en route to customer'
      },
      'delivered': {
        label: 'Delivered',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: '📦',
        description: 'Delivered to customer'
      },
      'settlement': {
        label: 'Settlement',
        color: 'bg-pink-100 text-pink-800 border-pink-200',
        icon: '💰',
        description: 'Payment processing'
      },
      'completed': {
        label: 'Completed',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '🎉',
        description: 'Order fully completed'
      }
    };

    return stageMap[stage] || {
      label: 'Unknown',
      color: 'bg-gray-100 text-gray-800',
      icon: '❓',
      description: 'Unknown status'
    };
  }
}

// Export singleton instance
export const unifiedWorkflow = UnifiedWorkflowService.getInstance();