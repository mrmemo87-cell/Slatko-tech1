// Unified Workflow Management Service
// Single source of truth for all workflow operations across all portals

import { supabaseApi } from './supabase-api';

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
      // Update workflow stage directly via Supabase
      const { error } = await supabaseApi.supabase
        .from('deliveries')
        .update({
          workflow_stage: newStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Reload orders to get fresh data
      await this.loadOrders();
      
    } catch (error) {
      console.error('❌ Error updating order stage:', error);
      throw error;
    }
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