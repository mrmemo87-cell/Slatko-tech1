
export type Unit = 'slice' | 'whole' | 'piece';

// NEW: For raw materials
export type MaterialUnit = 'kg' | 'g' | 'L' | 'ml' | 'piece';

export interface Material {
  id: string;
  name: string;
  unit: MaterialUnit;
  stock: number;
  lowStockThreshold: number;
  // Enhanced inventory management
  expirationDate?: string; // ISO 8601 format
  supplier?: string;
  costPerUnit?: number;
  reorderPoint?: number;
  leadTimeDays?: number;
  qualityGrade?: 'A' | 'B' | 'C'; // Quality rating
}

export interface PurchaseItem {
  materialId: string;
  quantity: number;
  price: number; // Price per unit
}

export interface Purchase {
  id: string;
  date: string; // ISO 8601 format
  supplier?: string;
  items: PurchaseItem[];
  notes?: string;
}

export interface RecipeItem {
  materialId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  unit: Unit;
  defaultPrice: number;
  recipe?: RecipeItem[]; // Recipe / Bill of Materials
}

export interface Client {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  address: string;
  customPrices: { productId: string; price: number; }[];
  // Enhanced client management
  creditLimit?: number;
  paymentTermDays?: number; // e.g., 30 days
  currentBalance?: number;
  isActive?: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  lastOrderDate?: string;
  totalOrderValue?: number;
  reliabilityScore?: number; // 0-100
}

export interface ProductionBatch {
  id: string;
  date: string; // ISO 8601 format
  productId: string;
  quantity: number;
  notes?: string;
  // Enhanced production tracking
  materialCosts?: { materialId: string; quantity: number; cost: number; }[];
  laborHours?: number;
  overheadCost?: number;
  totalCost?: number;
  costPerUnit?: number;
  qualityScore?: number; // 0-100
  batchStatus?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_HOLD' | 'REJECTED';
}

export interface DeliveryItem {
  productId: string;
  quantity: number;
  price: number; // Price per unit for this specific delivery
}

export interface ReturnItem {
  productId:string;
  quantity: number;
}

export interface Payment {
    id: string;
    date: string;
    amount: number;
}

export type DeliveryStatus = 'Pending' | 'Settled' | 'Paid';

export interface Delivery {
  id:string;
  invoiceNumber: string;
  date: string; // ISO 8601 format
  clientId: string;
  items: DeliveryItem[];
  status: DeliveryStatus;
  returnDate?: string; // ISO 8601 format
  returnedItems?: ReturnItem[];
  payments?: Payment[];
  notes?: string;
}

export interface InventoryDetail {
  productId: string;
  productName: string;
  totalProduced: number;
  totalDelivered: number;
  totalReturned: number;
  totalSold: number;
  inFactory: number;
}

// Enhanced business monitoring types
export type AlertType = 'LOW_STOCK' | 'EXPIRING_MATERIAL' | 'OVERDUE_PAYMENT' | 'PRODUCTION_CAPACITY' | 'QUALITY_ISSUE';
export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BusinessAlert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  data: any; // Context-specific data
  createdAt: string;
  isRead: boolean;
  isResolved: boolean;
}

export interface BusinessMetrics {
  totalInventoryValue: number;
  lowStockItems: number;
  expiringMaterials: number;
  productionEfficiency: number; // percentage
  cashFlowStatus: number; // positive/negative amount
  qualityScore: number; // 0-100
  clientSatisfactionScore: number; // 0-100
}

export interface MaterialPrediction {
  materialId: string;
  predictedStockoutDate: string;
  recommendedOrderQuantity: number;
  confidenceLevel: number; // 0-100
}

export interface Translations {
  [key: string]: any;
}

export interface TranslationFunction {
  (key: string, options?: { [key: string]: string | number }): string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}
