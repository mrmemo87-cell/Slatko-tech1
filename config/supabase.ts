import { createClient } from '@supabase/supabase-js';
import type {
	PostgrestError,
	PostgrestResponse,
	PostgrestSingleResponse
} from '@supabase/supabase-js';

const supabaseUrl = 'https://wfbvvbqzvolkbktvpnaq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYnZ2YnF6dm9sa2JrdHZwbmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTcyNjYsImV4cCI6MjA3NzY3MzI2Nn0.Q27Y-EJy0g2-XvQDXcbgo9K8UxwbBzCrTAkRaSi1NKE';

if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL environment variable');
if (!supabaseAnonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');

// ✅ Explicit auth config so sessions persist & refresh properly in the browser
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
		storage: typeof window !== 'undefined' ? window.localStorage : undefined,
		flowType: 'pkce', // Use PKCE flow for better security
	},
	global: {
		fetch: (...args) => {
			console.log('🌐 Fetch request:', args[0]);
			return fetch(...args);
		},
	},
});

if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
	(window as any).supabase = supabase; // handy for console testing
}

console.log('🧪 Supabase Config:', {
	url: supabaseUrl,
	keyLength: supabaseAnonKey.length,
	status: 'configured',
});

export const testConnection = async () => {
	try {
		console.log('Testing Supabase connection...');
		const { error, count } = await supabase
			.from('clients')
			.select('*', { count: 'exact', head: true }); // head=true avoids fetching rows
		console.log('Connection test result:', { count, error });
		return { success: !error, error };
	} catch (error) {
		console.error('Connection test failed:', error);
		return { success: false, error };
	}
};

export const TABLES = {
	USERS: 'users',
	USER_ROLES: 'user_roles',
	PRODUCTS: 'products',
	CLIENTS: 'clients',
	MATERIALS: 'materials',
	DELIVERIES: 'deliveries',
	DELIVERY_ITEMS: 'delivery_items',
	RETURN_ITEMS: 'return_items',
	PAYMENTS: 'payments',
	PRODUCTION_BATCHES: 'production_batches',
	PRODUCTION_MATERIAL_COSTS: 'production_material_costs',
	PURCHASES: 'purchases',
	PURCHASE_ITEMS: 'purchase_items',
	SYNC_LOG: 'sync_log',
	CLIENT_ACCOUNT_BALANCE: 'client_account_balance',
	ORDER_PAYMENT_RECORDS: 'order_payment_records',
	PAYMENT_TRANSACTIONS: 'payment_transactions',
	CLIENT_RETURN_POLICY: 'client_return_policy',
	SETTLEMENT_SESSIONS: 'settlement_sessions',
	ORDER_RETURNS: 'order_returns',
	RETURN_LINE_ITEMS: 'return_line_items',
	WORKFLOW_EVENTS: 'workflow_events',
	PRODUCTION_TASKS: 'production_tasks',
	DELIVERY_ROUTES: 'delivery_routes',
	ROUTE_DELIVERIES: 'route_deliveries',
	SETTLEMENT_DETAILS: 'settlement_details',
	ORDERS: 'orders',
	ORDER_PAYMENT_PROOFS: 'order_payment_proofs',
	AUDIT_LOG: 'audit_log'
} as const;

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					auth_user_id: string | null;
					created_at: string;
					id: string;
					is_active: boolean;
					role: 'admin' | 'manager' | 'user';
					updated_at: string;
					username: string;
				};
				Insert: {
					auth_user_id?: string | null;
					created_at?: string;
					id?: string;
					is_active?: boolean;
					role?: 'admin' | 'manager' | 'user';
					updated_at?: string;
					username: string;
				};
				Update: {
					auth_user_id?: string | null;
					created_at?: string;
					id?: string;
					is_active?: boolean;
					role?: 'admin' | 'manager' | 'user';
					updated_at?: string;
					username?: string;
				};
			};
			user_roles: {
				Row: {
					created_at: string | null;
					role: 'admin' | 'finance_lead' | 'sales' | 'production' | 'delivery';
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					role: 'admin' | 'finance_lead' | 'sales' | 'production' | 'delivery';
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					role?: 'admin' | 'finance_lead' | 'sales' | 'production' | 'delivery';
					user_id?: string;
				};
			};
			products: {
				Row: {
					category: string | null;
					cost: number;
					created_at: string;
					description: string | null;
					id: string;
					is_active: boolean;
					name: string;
					price: number;
					production_time: number;
					shelf_life_days: number;
					stock: number;
					unit: string;
					updated_at: string;
				};
				Insert: {
					category?: string | null;
					cost?: number;
					created_at?: string;
					description?: string | null;
					id?: string;
					is_active?: boolean;
					name: string;
					price: number;
					production_time?: number;
					shelf_life_days?: number;
					stock?: number;
					unit: string;
					updated_at?: string;
				};
				Update: {
					category?: string | null;
					cost?: number;
					created_at?: string;
					description?: string | null;
					id?: string;
					is_active?: boolean;
					name?: string;
					price?: number;
					production_time?: number;
					shelf_life_days?: number;
					stock?: number;
					unit?: string;
					updated_at?: string;
				};
			};
			materials: {
				Row: {
					cost_per_unit: number;
					created_at: string;
					expiration_date: string | null;
					id: string;
					min_stock_level: number;
					name: string;
					stock: number;
					supplier: string | null;
					unit: string;
					updated_at: string;
				};
				Insert: {
					cost_per_unit?: number;
					created_at?: string;
					expiration_date?: string | null;
					id?: string;
					min_stock_level?: number;
					name: string;
					stock?: number;
					supplier?: string | null;
					unit: string;
					updated_at?: string;
				};
				Update: {
					cost_per_unit?: number;
					created_at?: string;
					expiration_date?: string | null;
					id?: string;
					min_stock_level?: number;
					name?: string;
					stock?: number;
					supplier?: string | null;
					unit?: string;
					updated_at?: string;
				};
			};
			clients: {
				Row: {
					address: string | null;
					business_name: string | null;
					created_at: string;
					credit_limit: number;
					current_balance: number;
					email: string | null;
					id: string;
					is_active: boolean;
					last_order_date: string | null;
					name: string;
					payment_term_days: number;
					phone: string | null;
					reliability_score: number;
					risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
					total_order_value: number;
					updated_at: string;
				};
				Insert: {
					address?: string | null;
					business_name?: string | null;
					created_at?: string;
					credit_limit?: number;
					current_balance?: number;
					email?: string | null;
					id?: string;
					is_active?: boolean;
					last_order_date?: string | null;
					name: string;
					payment_term_days?: number;
					phone?: string | null;
					reliability_score?: number;
					risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
					total_order_value?: number;
					updated_at?: string;
				};
				Update: {
					address?: string | null;
					business_name?: string | null;
					created_at?: string;
					credit_limit?: number;
					current_balance?: number;
					email?: string | null;
					id?: string;
					is_active?: boolean;
					last_order_date?: string | null;
					name?: string;
					payment_term_days?: number;
					phone?: string | null;
					reliability_score?: number;
					risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
					total_order_value?: number;
					updated_at?: string;
				};
			};
			production_batches: {
				Row: {
					batch_number: string;
					batch_status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_HOLD' | 'REJECTED';
					cost_per_unit: number;
					created_at: string;
					end_date: string | null;
					id: string;
					labor_hours: number;
					notes: string | null;
					overhead_cost: number;
					product_id: string;
					quality_score: number | null;
					quantity: number;
					start_date: string;
					total_cost: number;
					updated_at: string;
				};
				Insert: {
					batch_number: string;
					batch_status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_HOLD' | 'REJECTED';
					cost_per_unit?: number;
					created_at?: string;
					end_date?: string | null;
					id?: string;
					labor_hours?: number;
					notes?: string | null;
					overhead_cost?: number;
					product_id: string;
					quality_score?: number | null;
					quantity: number;
					start_date: string;
					total_cost?: number;
					updated_at?: string;
				};
				Update: {
					batch_number?: string;
					batch_status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_HOLD' | 'REJECTED';
					cost_per_unit?: number;
					created_at?: string;
					end_date?: string | null;
					id?: string;
					labor_hours?: number;
					notes?: string | null;
					overhead_cost?: number;
					product_id?: string;
					quality_score?: number | null;
					quantity?: number;
					start_date?: string;
					total_cost?: number;
					updated_at?: string;
				};
			};
			production_material_costs: {
				Row: {
					cost: number;
					created_at: string;
					id: string;
					material_id: string;
					production_batch_id: string;
					quantity: number;
				};
				Insert: {
					cost: number;
					created_at?: string;
					id?: string;
					material_id: string;
					production_batch_id: string;
					quantity: number;
				};
				Update: {
					cost?: number;
					created_at?: string;
					id?: string;
					material_id?: string;
					production_batch_id?: string;
					quantity?: number;
				};
			};
			deliveries: {
				Row: {
					actual_delivery_time: string | null;
					assigned_driver: string | null;
					client_id: string;
					created_at: string;
					date: string;
					delivery_completed_time: string | null;
					delivery_notes: string | null;
					delivery_start_time: string | null;
					estimated_delivery_time: string | null;
					id: string;
					invoice_number: string;
					notes: string | null;
					production_completed_time: string | null;
					production_notes: string | null;
					production_start_time: string | null;
					quality_score: number | null;
					status: 'Pending' | 'Settled' | 'Paid';
					updated_at: string;
					workflow_stage: string;
				};
				Insert: {
					actual_delivery_time?: string | null;
					assigned_driver?: string | null;
					client_id: string;
					created_at?: string;
					date: string;
					delivery_completed_time?: string | null;
					delivery_notes?: string | null;
					delivery_start_time?: string | null;
					estimated_delivery_time?: string | null;
					id?: string;
					invoice_number: string;
					notes?: string | null;
					production_completed_time?: string | null;
					production_notes?: string | null;
					production_start_time?: string | null;
					quality_score?: number | null;
					status?: 'Pending' | 'Settled' | 'Paid';
					updated_at?: string;
					workflow_stage?: string;
				};
				Update: {
					actual_delivery_time?: string | null;
					assigned_driver?: string | null;
					client_id?: string;
					created_at?: string;
					date?: string;
					delivery_completed_time?: string | null;
					delivery_notes?: string | null;
					delivery_start_time?: string | null;
					estimated_delivery_time?: string | null;
					id?: string;
					invoice_number?: string;
					notes?: string | null;
					production_completed_time?: string | null;
					production_notes?: string | null;
					production_start_time?: string | null;
					quality_score?: number | null;
					status?: 'Pending' | 'Settled' | 'Paid';
					updated_at?: string;
					workflow_stage?: string;
				};
			};
			delivery_items: {
				Row: {
					created_at: string;
					delivery_id: string;
					id: string;
					price: number;
					product_id: string;
					quantity: number;
				};
				Insert: {
					created_at?: string;
					delivery_id: string;
					id?: string;
					price: number;
					product_id: string;
					quantity: number;
				};
				Update: {
					created_at?: string;
					delivery_id?: string;
					id?: string;
					price?: number;
					product_id?: string;
					quantity?: number;
				};
			};
			return_items: {
				Row: {
					created_at: string;
					delivery_id: string;
					id: string;
					product_id: string;
					quantity: number;
					reason: string | null;
				};
				Insert: {
					created_at?: string;
					delivery_id: string;
					id?: string;
					product_id: string;
					quantity: number;
					reason?: string | null;
				};
				Update: {
					created_at?: string;
					delivery_id?: string;
					id?: string;
					product_id?: string;
					quantity?: number;
					reason?: string | null;
				};
			};
			payments: {
				Row: {
					amount: number;
					client_id: string | null;
					created_at: string;
					date: string;
					delivery_id: string;
					id: string;
					method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_payment';
					notes: string | null;
					payment_status: 'pending' | 'completed' | 'failed' | 'cancelled';
					payment_type: 'order_payment' | 'debt_payment' | 'advance_payment' | 'partial_payment';
					recorded_by: string | null;
					reference: string | null;
				};
				Insert: {
					amount: number;
					client_id?: string | null;
					created_at?: string;
					date: string;
					delivery_id: string;
					id?: string;
					method?: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_payment';
					notes?: string | null;
					payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled';
					payment_type?: 'order_payment' | 'debt_payment' | 'advance_payment' | 'partial_payment';
					recorded_by?: string | null;
					reference?: string | null;
				};
				Update: {
					amount?: number;
					client_id?: string | null;
					created_at?: string;
					date?: string;
					delivery_id?: string;
					id?: string;
					method?: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_payment';
					notes?: string | null;
					payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled';
					payment_type?: 'order_payment' | 'debt_payment' | 'advance_payment' | 'partial_payment';
					recorded_by?: string | null;
					reference?: string | null;
				};
			};
			purchases: {
				Row: {
					created_at: string;
					date: string;
					id: string;
					notes: string | null;
					status: 'pending' | 'received' | 'cancelled';
					supplier: string;
					total_amount: number;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					date: string;
					id?: string;
					notes?: string | null;
					status?: 'pending' | 'received' | 'cancelled';
					supplier: string;
					total_amount?: number;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					date?: string;
					id?: string;
					notes?: string | null;
					status?: 'pending' | 'received' | 'cancelled';
					supplier?: string;
					total_amount?: number;
					updated_at?: string;
				};
			};
			purchase_items: {
				Row: {
					created_at: string;
					id: string;
					material_id: string;
					purchase_id: string;
					quantity: number;
					total_cost: number;
					unit_cost: number;
				};
				Insert: {
					created_at?: string;
					id?: string;
					material_id: string;
					purchase_id: string;
					quantity: number;
					total_cost: number;
					unit_cost: number;
				};
				Update: {
					created_at?: string;
					id?: string;
					material_id?: string;
					purchase_id?: string;
					quantity?: number;
					total_cost?: number;
					unit_cost?: number;
				};
			};
			sync_log: {
				Row: {
					data: Json | null;
					id: string;
					operation: 'CREATE' | 'UPDATE' | 'DELETE';
					record_id: string;
					table_name: string;
					timestamp: string;
					user_id: string | null;
				};
				Insert: {
					data?: Json | null;
					id?: string;
					operation: 'CREATE' | 'UPDATE' | 'DELETE';
					record_id: string;
					table_name: string;
					timestamp?: string;
					user_id?: string | null;
				};
				Update: {
					data?: Json | null;
					id?: string;
					operation?: 'CREATE' | 'UPDATE' | 'DELETE';
					record_id?: string;
					table_name?: string;
					timestamp?: string;
					user_id?: string | null;
				};
			};
			client_account_balance: {
				Row: {
					client_id: string;
					created_at: string;
					current_balance: number;
					id: string;
					last_order_date: string | null;
					last_payment_date: string | null;
					payment_history_summary: Json;
					total_credit: number;
					total_debt: number;
					updated_at: string;
				};
				Insert: {
					client_id: string;
					created_at?: string;
					current_balance?: number;
					id?: string;
					last_order_date?: string | null;
					last_payment_date?: string | null;
					payment_history_summary?: Json;
					total_credit?: number;
					total_debt?: number;
					updated_at?: string;
				};
				Update: {
					client_id?: string;
					created_at?: string;
					current_balance?: number;
					id?: string;
					last_order_date?: string | null;
					last_payment_date?: string | null;
					payment_history_summary?: Json;
					total_credit?: number;
					total_debt?: number;
					updated_at?: string;
				};
			};
			order_payment_records: {
				Row: {
					amount_paid: number;
					amount_remaining: number;
					client_id: string;
					created_at: string;
					delivery_id: string;
					due_date: string | null;
					id: string;
					is_return_policy_order: boolean;
					notes: string | null;
					order_total: number;
					payment_date: string | null;
					payment_method: string | null;
					payment_status: 'unpaid' | 'partial' | 'paid' | 'overpaid' | 'waived';
					updated_at: string;
				};
				Insert: {
					amount_paid?: number;
					client_id: string;
					created_at?: string;
					delivery_id: string;
					due_date?: string | null;
					id?: string;
					is_return_policy_order?: boolean;
					notes?: string | null;
					order_total: number;
					payment_date?: string | null;
					payment_method?: string | null;
					payment_status?: 'unpaid' | 'partial' | 'paid' | 'overpaid' | 'waived';
					updated_at?: string;
				};
				Update: {
					amount_paid?: number;
					client_id?: string;
					created_at?: string;
					delivery_id?: string;
					due_date?: string | null;
					id?: string;
					is_return_policy_order?: boolean;
					notes?: string | null;
					order_total?: number;
					payment_date?: string | null;
					payment_method?: string | null;
					payment_status?: 'unpaid' | 'partial' | 'paid' | 'overpaid' | 'waived';
					updated_at?: string;
				};
			};
			payment_transactions: {
				Row: {
					amount: number;
					client_id: string;
					created_at: string;
					description: string;
					id: string;
					payment_method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_payment' | 'credit_note';
					recorded_by: string | null;
					reference_number: string | null;
					related_delivery_id: string | null;
					related_payment_id: string | null;
					related_return_id: string | null;
					transaction_date: string;
					transaction_type: 'payment_received' | 'debt_created' | 'debt_forgiven' | 'credit_applied' | 'adjustment';
				};
				Insert: {
					amount: number;
					client_id: string;
					created_at?: string;
					description: string;
					id?: string;
					payment_method?: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_payment' | 'credit_note';
					recorded_by?: string | null;
					reference_number?: string | null;
					related_delivery_id?: string | null;
					related_payment_id?: string | null;
					related_return_id?: string | null;
					transaction_date?: string;
					transaction_type: 'payment_received' | 'debt_created' | 'debt_forgiven' | 'credit_applied' | 'adjustment';
				};
				Update: {
					amount?: number;
					client_id?: string;
					created_at?: string;
					description?: string;
					id?: string;
					payment_method?: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_payment' | 'credit_note';
					recorded_by?: string | null;
					reference_number?: string | null;
					related_delivery_id?: string | null;
					related_payment_id?: string | null;
					related_return_id?: string | null;
					transaction_date?: string;
					transaction_type?: 'payment_received' | 'debt_created' | 'debt_forgiven' | 'credit_applied' | 'adjustment';
				};
			};
			client_return_policy: {
				Row: {
					auto_debt_management: boolean;
					client_id: string;
					created_at: string;
					id: string;
					max_debt_limit: number;
					notes: string | null;
					payment_delay_orders: number;
					payment_reminder_days: number;
					policy_enabled: boolean;
					updated_at: string;
				};
				Insert: {
					auto_debt_management?: boolean;
					client_id: string;
					created_at?: string;
					id?: string;
					max_debt_limit?: number;
					notes?: string | null;
					payment_delay_orders?: number;
					payment_reminder_days?: number;
					policy_enabled?: boolean;
					updated_at?: string;
				};
				Update: {
					auto_debt_management?: boolean;
					client_id?: string;
					created_at?: string;
					id?: string;
					max_debt_limit?: number;
					notes?: string | null;
					payment_delay_orders?: number;
					payment_reminder_days?: number;
					policy_enabled?: boolean;
					updated_at?: string;
				};
			};
			settlement_sessions: {
				Row: {
					amount_collected: number;
					client_id: string;
					created_at: string;
					delivery_id: string;
					driver_id: string | null;
					id: string;
					notes: string | null;
					orders_to_collect: Json;
					payment_method: string;
					payment_reference: string | null;
					settlement_date: string;
					settlement_status: 'pending' | 'completed' | 'partial' | 'no_payment' | 'failed';
					settlement_type: 'order_delivery' | 'debt_collection' | 'routine_collection';
					total_collectible: number;
				};
				Insert: {
					amount_collected?: number;
					client_id: string;
					created_at?: string;
					delivery_id: string;
					driver_id?: string | null;
					id?: string;
					notes?: string | null;
					orders_to_collect?: Json;
					payment_method?: string;
					payment_reference?: string | null;
					settlement_date?: string;
					settlement_status?: 'pending' | 'completed' | 'partial' | 'no_payment' | 'failed';
					settlement_type?: 'order_delivery' | 'debt_collection' | 'routine_collection';
					total_collectible?: number;
				};
				Update: {
					amount_collected?: number;
					client_id?: string;
					created_at?: string;
					delivery_id?: string;
					driver_id?: string | null;
					id?: string;
					notes?: string | null;
					orders_to_collect?: Json;
					payment_method?: string;
					payment_reference?: string | null;
					settlement_date?: string;
					settlement_status?: 'pending' | 'completed' | 'partial' | 'no_payment' | 'failed';
					settlement_type?: 'order_delivery' | 'debt_collection' | 'routine_collection';
					total_collectible?: number;
				};
			};
			order_returns: {
				Row: {
					client_id: string;
					created_at: string;
					id: string;
					notes: string | null;
					original_delivery_id: string | null;
					processed_by: string | null;
					return_date: string;
					return_delivery_id: string | null;
					return_type: 'unsold_return' | 'quality_issue' | 'wrong_item' | 'customer_request' | 'damaged';
				};
				Insert: {
					client_id: string;
					created_at?: string;
					id?: string;
					notes?: string | null;
					original_delivery_id?: string | null;
					processed_by?: string | null;
					return_date?: string;
					return_delivery_id?: string | null;
					return_type?: 'unsold_return' | 'quality_issue' | 'wrong_item' | 'customer_request' | 'damaged';
				};
				Update: {
					client_id?: string;
					created_at?: string;
					id?: string;
					notes?: string | null;
					original_delivery_id?: string | null;
					processed_by?: string | null;
					return_date?: string;
					return_delivery_id?: string | null;
					return_type?: 'unsold_return' | 'quality_issue' | 'wrong_item' | 'customer_request' | 'damaged';
				};
			};
			return_line_items: {
				Row: {
					condition: 'good' | 'damaged' | 'expired' | 'unsellable';
					created_at: string;
					id: string;
					notes: string | null;
					original_delivery_item_id: string | null;
					product_name: string;
					quantity_returned: number;
					restockable: boolean;
					return_id: string;
					total_credit_amount: number;
					unit_price: number;
				};
				Insert: {
					condition?: 'good' | 'damaged' | 'expired' | 'unsellable';
					created_at?: string;
					id?: string;
					notes?: string | null;
					original_delivery_item_id?: string | null;
					product_name: string;
					quantity_returned: number;
					restockable?: boolean;
					return_id: string;
					unit_price: number;
				};
				Update: {
					condition?: 'good' | 'damaged' | 'expired' | 'unsellable';
					created_at?: string;
					id?: string;
					notes?: string | null;
					original_delivery_item_id?: string | null;
					product_name?: string;
					quantity_returned?: number;
					restockable?: boolean;
					return_id?: string;
					unit_price?: number;
				};
			};
			workflow_events: {
				Row: {
					created_at: string;
					delivery_id: string | null;
					id: string;
					metadata: Json | null;
					notes: string | null;
					stage: string;
					timestamp: string;
					user_id: string;
					user_name: string | null;
					user_role: string | null;
				};
				Insert: {
					created_at?: string;
					delivery_id?: string | null;
					id?: string;
					metadata?: Json | null;
					notes?: string | null;
					stage: string;
					timestamp?: string;
					user_id: string;
					user_name?: string | null;
					user_role?: string | null;
				};
				Update: {
					created_at?: string;
					delivery_id?: string | null;
					id?: string;
					metadata?: Json | null;
					notes?: string | null;
					stage?: string;
					timestamp?: string;
					user_id?: string;
					user_name?: string | null;
					user_role?: string | null;
				};
			};
			production_tasks: {
				Row: {
					actual_duration_minutes: number | null;
					assigned_worker: string | null;
					completed_at: string | null;
					created_at: string;
					delivery_id: string | null;
					description: string | null;
					estimated_duration_minutes: number | null;
					id: string;
					priority: number;
					product_id: string | null;
					quantity: number;
					quality_notes: string | null;
					started_at: string | null;
					status: 'pending' | 'in_progress' | 'completed' | 'quality_check';
					task_name: string;
					updated_at: string;
				};
				Insert: {
					actual_duration_minutes?: number | null;
					assigned_worker?: string | null;
					completed_at?: string | null;
					created_at?: string;
					delivery_id?: string | null;
					description?: string | null;
					estimated_duration_minutes?: number | null;
					id?: string;
					priority?: number;
					product_id?: string | null;
					quantity: number;
					quality_notes?: string | null;
					started_at?: string | null;
					status?: 'pending' | 'in_progress' | 'completed' | 'quality_check';
					task_name: string;
					updated_at?: string;
				};
				Update: {
					actual_duration_minutes?: number | null;
					assigned_worker?: string | null;
					completed_at?: string | null;
					created_at?: string;
					delivery_id?: string | null;
					description?: string | null;
					estimated_duration_minutes?: number | null;
					id?: string;
					priority?: number;
					product_id?: string | null;
					quantity?: number;
					quality_notes?: string | null;
					started_at?: string | null;
					status?: 'pending' | 'in_progress' | 'completed' | 'quality_check';
					task_name?: string;
					updated_at?: string;
				};
			};
			delivery_routes: {
				Row: {
					actual_end_time: string | null;
					actual_start_time: string | null;
					completed_deliveries: number;
					created_at: string;
					driver_id: string | null;
					driver_name: string | null;
					estimated_end_time: string | null;
					estimated_start_time: string | null;
					id: string;
					notes: string | null;
					route_date: string;
					route_name: string;
					status: 'planned' | 'in_progress' | 'completed';
					total_deliveries: number;
					updated_at: string;
				};
				Insert: {
					actual_end_time?: string | null;
					actual_start_time?: string | null;
					completed_deliveries?: number;
					created_at?: string;
					driver_id?: string | null;
					driver_name?: string | null;
					estimated_end_time?: string | null;
					estimated_start_time?: string | null;
					id?: string;
					notes?: string | null;
					route_date: string;
					route_name: string;
					status?: 'planned' | 'in_progress' | 'completed';
					total_deliveries?: number;
					updated_at?: string;
				};
				Update: {
					actual_end_time?: string | null;
					actual_start_time?: string | null;
					completed_deliveries?: number;
					created_at?: string;
					driver_id?: string | null;
					driver_name?: string | null;
					estimated_end_time?: string | null;
					estimated_start_time?: string | null;
					id?: string;
					notes?: string | null;
					route_date?: string;
					route_name?: string;
					status?: 'planned' | 'in_progress' | 'completed';
					total_deliveries?: number;
					updated_at?: string;
				};
			};
			route_deliveries: {
				Row: {
					actual_arrival_time: string | null;
					created_at: string;
					customer_signature: string | null;
					delivery_id: string;
					delivery_notes: string | null;
					delivery_photos: string[] | null;
					delivery_status: 'scheduled' | 'en_route' | 'delivered' | 'failed' | 'rescheduled';
					estimated_arrival_time: string | null;
					id: string;
					route_id: string;
					sequence_order: number;
					updated_at: string;
				};
				Insert: {
					actual_arrival_time?: string | null;
					created_at?: string;
					customer_signature?: string | null;
					delivery_id: string;
					delivery_notes?: string | null;
					delivery_photos?: string[] | null;
					delivery_status?: 'scheduled' | 'en_route' | 'delivered' | 'failed' | 'rescheduled';
					estimated_arrival_time?: string | null;
					id?: string;
					route_id: string;
					sequence_order: number;
					updated_at?: string;
				};
				Update: {
					actual_arrival_time?: string | null;
					created_at?: string;
					customer_signature?: string | null;
					delivery_id?: string;
					delivery_notes?: string | null;
					delivery_photos?: string[] | null;
					delivery_status?: 'scheduled' | 'en_route' | 'delivered' | 'failed' | 'rescheduled';
					estimated_arrival_time?: string | null;
					id?: string;
					route_id?: string;
					sequence_order?: number;
					updated_at?: string;
				};
			};
			settlement_details: {
				Row: {
					created_at: string;
					credit_applied: number;
					customer_signature: string | null;
					delivered_amount: number;
					delivery_id: string;
					delivery_photos: string[] | null;
					id: string;
					new_debt_amount: number;
					payment_method: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'mobile_payment' | null;
					payment_received: number;
					returned_amount: number;
					settlement_notes: string | null;
					settled_at: string | null;
					settled_by: string | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					credit_applied?: number;
					customer_signature?: string | null;
					delivered_amount?: number;
					delivery_id: string;
					delivery_photos?: string[] | null;
					id?: string;
					new_debt_amount?: number;
					payment_method?: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'mobile_payment' | null;
					payment_received?: number;
					returned_amount?: number;
					settlement_notes?: string | null;
					settled_at?: string | null;
					settled_by?: string | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					credit_applied?: number;
					customer_signature?: string | null;
					delivered_amount?: number;
					delivery_id?: string;
					delivery_photos?: string[] | null;
					id?: string;
					new_debt_amount?: number;
					payment_method?: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'mobile_payment' | null;
					payment_received?: number;
					returned_amount?: number;
					settlement_notes?: string | null;
					settled_at?: string | null;
					settled_by?: string | null;
					updated_at?: string;
				};
			};
			orders: {
				Row: {
					client_id: string;
					created_at: string;
					created_by: string | null;
					delivered_items: Json;
					delivered_total: number;
					delivery_person_id: string | null;
					delivery_stage: Database['public']['Enums']['delivery_stage'] | null;
					id: string;
					paid_at: string | null;
					payment_method: Database['public']['Enums']['payment_method'] | null;
					payment_status: Database['public']['Enums']['payment_status'];
					planned_items: Json;
					planned_total: number;
					previous_invoice_balance: number;
					previous_invoice_id: string | null;
					production_stage: Database['public']['Enums']['production_stage'] | null;
					returns_deducted: number;
					source: string;
					state: Database['public']['Enums']['order_state'];
					updated_at: string;
				};
				Insert: {
					client_id: string;
					created_at?: string;
					created_by?: string | null;
					delivered_items?: Json;
					delivered_total?: number;
					delivery_person_id?: string | null;
					delivery_stage?: Database['public']['Enums']['delivery_stage'] | null;
					id?: string;
					paid_at?: string | null;
					payment_method?: Database['public']['Enums']['payment_method'] | null;
					payment_status?: Database['public']['Enums']['payment_status'];
					planned_items?: Json;
					planned_total?: number;
					previous_invoice_balance?: number;
					previous_invoice_id?: string | null;
					production_stage?: Database['public']['Enums']['production_stage'] | null;
					returns_deducted?: number;
					source?: string;
					state?: Database['public']['Enums']['order_state'];
					updated_at?: string;
				};
				Update: {
					client_id?: string;
					created_at?: string;
					created_by?: string | null;
					delivered_items?: Json;
					delivered_total?: number;
					delivery_person_id?: string | null;
					delivery_stage?: Database['public']['Enums']['delivery_stage'] | null;
					id?: string;
					paid_at?: string | null;
					payment_method?: Database['public']['Enums']['payment_method'] | null;
					payment_status?: Database['public']['Enums']['payment_status'];
					planned_items?: Json;
					planned_total?: number;
					previous_invoice_balance?: number;
					previous_invoice_id?: string | null;
					production_stage?: Database['public']['Enums']['production_stage'] | null;
					returns_deducted?: number;
					source?: string;
					state?: Database['public']['Enums']['order_state'];
					updated_at?: string;
				};
			};
			order_payment_proofs: {
				Row: {
					file_path: string;
					id: string;
					mime_type: string | null;
					note: string | null;
					order_id: string;
					review_note: string | null;
					reviewed_at: string | null;
					reviewed_by_user_id: string | null;
					size_bytes: number | null;
					status: Database['public']['Enums']['proof_status'];
					uploaded_at: string;
					uploaded_by_user_id: string;
				};
				Insert: {
					file_path: string;
					id?: string;
					mime_type?: string | null;
					note?: string | null;
					order_id: string;
					review_note?: string | null;
					reviewed_at?: string | null;
					reviewed_by_user_id?: string | null;
					size_bytes?: number | null;
					status?: Database['public']['Enums']['proof_status'];
					uploaded_at?: string;
					uploaded_by_user_id: string;
				};
				Update: {
					file_path?: string;
					id?: string;
					mime_type?: string | null;
					note?: string | null;
					order_id?: string;
					review_note?: string | null;
					reviewed_at?: string | null;
					reviewed_by_user_id?: string | null;
					size_bytes?: number | null;
					status?: Database['public']['Enums']['proof_status'];
					uploaded_at?: string;
					uploaded_by_user_id?: string;
				};
			};
			audit_log: {
				Row: {
					action: string;
					actor: string | null;
					created_at: string;
					entity: string;
					entity_id: string;
					id: number;
					meta: Json;
				};
				Insert: {
					action: string;
					actor?: string | null;
					created_at?: string;
					entity: string;
					entity_id: string;
					id?: number;
					meta?: Json;
				};
				Update: {
					action?: string;
					actor?: string | null;
					created_at?: string;
					entity?: string;
					entity_id?: string;
					id?: number;
					meta?: Json;
				};
			};
		};
		Views: {
			order_payment_status_with_returns: {
				Row: {
					adjusted_order_total: number | null;
					adjusted_payment_status: string | null;
					amount_paid: number | null;
					amount_remaining: number | null;
					client_id: string | null;
					created_at: string | null;
					delivery_id: string | null;
					due_date: string | null;
					id: string | null;
					is_return_policy_order: boolean | null;
					notes: string | null;
					order_total: number | null;
					payment_date: string | null;
					payment_method: string | null;
					payment_status: string | null;
					total_returns_credit: number | null;
					updated_at: string | null;
				};
			};
			return_summary: {
				Row: {
					client_id: string | null;
					client_name: string | null;
					items_returned: number | null;
					notes: string | null;
					original_delivery_id: string | null;
					processed_by_user: string | null;
					return_date: string | null;
					return_delivery_id: string | null;
					return_id: string | null;
					return_type: string | null;
					total_credit: number | null;
				};
			};
		};
		Functions: {
			fn_items_total: {
				Args: {
					p_items: Json | null;
				};
				Returns: number;
			};
			get_net_amount_due: {
				Args: {
					p_delivery_id: string;
				};
				Returns: number;
			};
			rpc_delivery_adjust_items: {
				Args: {
					p_delivered_items: Json | null;
					p_order_id: string;
					p_reason?: string | null;
				};
				Returns: void;
			};
			rpc_delivery_set_stage: {
				Args: {
					p_assign_if_pick?: boolean | null;
					p_order_id: string;
					p_stage: Database['public']['Enums']['delivery_stage'];
				};
				Returns: void;
			};
			rpc_order_complete: {
				Args: {
					p_order_id: string;
				};
				Returns: void;
			};
			rpc_payment_choose: {
				Args: {
					p_method: Database['public']['Enums']['payment_method'];
					p_order_id: string;
				};
				Returns: void;
			};
			rpc_payment_proof_approve: {
				Args: {
					p_proof_id: string;
					p_review_note?: string | null;
				};
				Returns: void;
			};
			rpc_payment_proof_reject: {
				Args: {
					p_proof_id: string;
					p_review_note: string;
				};
				Returns: void;
			};
			rpc_payment_upload_proof: {
				Args: {
					p_auto_approve?: boolean | null;
					p_file_path: string;
					p_mime?: string | null;
					p_note?: string | null;
					p_order_id: string;
					p_size?: number | null;
				};
				Returns: string;
			};
			rpc_production_set_stage: {
				Args: {
					p_order_id: string;
					p_stage: Database['public']['Enums']['production_stage'];
				};
				Returns: void;
			};
			rpc_settlement_apply_returns: {
				Args: {
					p_note?: string | null;
					p_order_id: string;
					p_returns: number;
				};
				Returns: void;
			};
			update_client_balance_manual: {
				Args: {
					p_client_id: string;
				};
				Returns: void;
			};
		};
		Enums: {
			order_state: 'created' | 'completed';
			production_stage: 'received' | 'preparing' | 'ready_to_pick';
			delivery_stage: 'ready_for_pick' | 'on_route' | 'settlement';
			payment_status: 'unpaid' | 'awaiting_confirmation' | 'paid';
			payment_method: 'SRAZU' | 'LATER_CASH' | 'LATER_BANK';
			proof_status: 'pending' | 'approved' | 'rejected';
		};
		CompositeTypes: Record<string, never>;
	};
}

type PostgrestResponseLike<T> = PostgrestResponse<T> | PostgrestSingleResponse<T>;

export class SupabaseService {
	static handleResponse<T>(response: PostgrestResponseLike<T>) {
		if (response.error) {
			throw response.error;
		}

		return response.data as NonNullable<typeof response.data>;
	}

	static async withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			const postgrestError = error as PostgrestError;
			console.error('Supabase operation failed:', postgrestError);
			throw postgrestError;
		}
	}
}
