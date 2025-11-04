export type OrderState = 'created' | 'completed';
export type ProductionStage = 'received' | 'preparing' | 'ready_to_pick';
export type DeliveryStage = 'ready_for_pick' | 'on_route' | 'settlement';
export type PaymentStatus = 'unpaid' | 'awaiting_confirmation' | 'paid';
export type PaymentMethod = 'SRAZU' | 'LATER_CASH' | 'LATER_BANK';

export type OrderItem = {
  sku: string;
  name: string;
  qty: number;
  unit_price: number;
};

export interface Order {
  id: string;
  client_id: string;
  source: 'sales';
  state: OrderState;
  production_stage: ProductionStage | null;
  delivery_stage: DeliveryStage | null;
  created_by: string | null;
  delivery_person_id: string | null;
  planned_items: OrderItem[];
  delivered_items: OrderItem[];
  planned_total: number;
  delivered_total: number;
  previous_invoice_id?: string | null;
  previous_invoice_balance: number;
  returns_deducted: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentProof {
  id: string;
  order_id: string;
  file_path: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  note?: string | null;
  uploaded_by_user_id: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_user_id?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
}
