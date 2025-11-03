// Enhanced types for comprehensive order workflow system
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'sales' | 'production' | 'delivery' | 'finance';

export type Permission = 
  | 'orders.create' 
  | 'orders.view' 
  | 'orders.edit'
  | 'production.view'
  | 'production.update'
  | 'delivery.view'
  | 'delivery.update'
  | 'finance.view'
  | 'finance.settlement'
  | 'admin.dashboard'
  | 'clients.manage'
  | 'products.manage';

export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'settled';

export type WorkflowStage = 
  | 'order_placed'         // Sales creates order
  | 'production_queue'     // Order appears in production portal
  | 'in_production'        // Workers start making items
  | 'quality_check'        // Items ready for quality verification
  | 'ready_for_delivery'   // Ready for delivery team
  | 'out_for_delivery'     // Driver picked up order
  | 'delivered'            // Delivered to customer
  | 'settlement'           // Financial settlement process
  | 'completed';           // Fully completed

export interface EnhancedDelivery extends Delivery {
  workflowStage: WorkflowStage;
  statusHistory: WorkflowEvent[];
  productionNotes?: string;
  qualityScore?: number;
  deliveryNotes?: string;
  assignedDriver?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  settlementDetails?: SettlementDetails;
  realTimeUpdates?: boolean;
}

export interface WorkflowEvent {
  id: string;
  deliveryId: string;
  stage: WorkflowStage;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  notes?: string;
  metadata?: any;
}

export interface SettlementDetails {
  deliveredAmount: number;
  returnedAmount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit';
  paymentReceived: number;
  creditApplied: number;
  newDebtAmount: number;
  settlementNotes?: string;
  customerSignature?: string;
  deliveryPhotos?: string[];
}

export interface ProductionTask {
  id: string;
  deliveryId: string;
  productId: string;
  productName: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTime: number; // minutes
  assignedWorker?: string;
  startTime?: string;
  completedTime?: string;
  qualityNotes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'quality_check';
}

export interface DeliveryRoute {
  id: string;
  driverId: string;
  driverName: string;
  date: string;
  deliveries: string[]; // delivery IDs
  status: 'planned' | 'in_progress' | 'completed';
  totalValue: number;
  estimatedDuration: number;
  actualDuration?: number;
  route: RouteStop[];
}

export interface RouteStop {
  deliveryId: string;
  clientId: string;
  clientName: string;
  address: string;
  estimatedArrival: string;
  actualArrival?: string;
  status: 'pending' | 'delivered' | 'failed';
  notes?: string;
}

export interface RealTimeMetrics {
  ordersToday: number;
  ordersInProduction: number;
  ordersReadyForDelivery: number;
  ordersOutForDelivery: number;
  totalRevenueToday: number;
  averageOrderValue: number;
  productionEfficiency: number;
  deliverySuccessRate: number;
  customerSatisfactionScore: number;
  lastUpdated: string;
}