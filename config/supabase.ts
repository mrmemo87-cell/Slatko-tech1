import { createClient } from '@supabase/supabase-js';

// Supabase configuration - use hardcoded for now (environment variables causing TypeScript issues)
const supabaseUrl = 'https://wfbvvbqzvolkbktvpnaq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYnZ2YnF6dm9sa2JrdHZwbmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTcyNjYsImV4cCI6MjA3NzY3MzI2Nn0.Q27Y-EJy0g2-XvQDXcbgo9K8UxwbBzCrTAkRaSi1NKE';

// Validate configuration
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

console.log('🔧 Supabase Config:', { 
  url: supabaseUrl, 
  keyLength: supabaseAnonKey.length,
  status: 'configured'
});

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection function
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('clients').select('count').limit(1);
    console.log('Connection test result:', { data, error });
    return { success: !error, error };
  } catch (error) {
    console.error('Connection test failed:', error);
    return { success: false, error };
  }
};

// Database table names
export const TABLES = {
  USERS: 'users',
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
  SYNC_LOG: 'sync_log'
} as const;

// Type definitions for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: 'admin' | 'manager' | 'user';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          username: string;
          email: string;
          password?: string;
          role?: 'admin' | 'manager' | 'user';
          is_active?: boolean;
        };
        Update: {
          username?: string;
          email?: string;
          role?: 'admin' | 'manager' | 'user';
          is_active?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          unit: string;
          stock: number;
          price: number;
          cost: number;
          category: string | null;
          description: string | null;
          is_active: boolean;
          shelf_life_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          unit: string;
          stock?: number;
          price: number;
          cost?: number;
          category?: string;
          description?: string;
          is_active?: boolean;
          shelf_life_days?: number;
        };
        Update: {
          name?: string;
          unit?: string;
          stock?: number;
          price?: number;
          cost?: number;
          category?: string;
          description?: string;
          is_active?: boolean;
          shelf_life_days?: number;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          business_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          credit_limit: number;
          payment_term_days: number;
          current_balance: number;
          is_active: boolean;
          risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
          last_order_date: string | null;
          total_order_value: number;
          reliability_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          business_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          credit_limit?: number;
          payment_term_days?: number;
          current_balance?: number;
          is_active?: boolean;
          risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
          last_order_date?: string;
          total_order_value?: number;
          reliability_score?: number;
        };
        Update: {
          name?: string;
          business_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          credit_limit?: number;
          payment_term_days?: number;
          current_balance?: number;
          is_active?: boolean;
          risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
          last_order_date?: string;
          total_order_value?: number;
          reliability_score?: number;
        };
      };
      materials: {
        Row: {
          id: string;
          name: string;
          unit: string;
          stock: number;
          cost_per_unit: number;
          supplier: string | null;
          expiration_date: string | null;
          min_stock_level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          unit: string;
          stock?: number;
          cost_per_unit?: number;
          supplier?: string;
          expiration_date?: string;
          min_stock_level?: number;
        };
        Update: {
          name?: string;
          unit?: string;
          stock?: number;
          cost_per_unit?: number;
          supplier?: string;
          expiration_date?: string;
          min_stock_level?: number;
        };
      };
      deliveries: {
        Row: {
          id: string;
          invoice_number: string;
          client_id: string;
          date: string;
          status: 'Pending' | 'Settled' | 'Paid';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          invoice_number: string;
          client_id: string;
          date: string;
          status?: 'Pending' | 'Settled' | 'Paid';
          notes?: string;
        };
        Update: {
          invoice_number?: string;
          client_id?: string;
          date?: string;
          status?: 'Pending' | 'Settled' | 'Paid';
          notes?: string;
        };
      };
      delivery_items: {
        Row: {
          id: string;
          delivery_id: string;
          product_id: string;
          quantity: number;
          price: number;
          created_at: string;
        };
        Insert: {
          delivery_id: string;
          product_id: string;
          quantity: number;
          price: number;
        };
        Update: {
          delivery_id?: string;
          product_id?: string;
          quantity?: number;
          price?: number;
        };
      };
      production_batches: {
        Row: {
          id: string;
          batch_number: string;
          product_id: string;
          quantity: number;
          start_date: string;
          end_date: string | null;
          batch_status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_HOLD' | 'REJECTED';
          labor_hours: number;
          overhead_cost: number;
          total_cost: number;
          cost_per_unit: number;
          quality_score: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          batch_number: string;
          product_id: string;
          quantity: number;
          start_date: string;
          end_date?: string;
          batch_status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_HOLD' | 'REJECTED';
          labor_hours?: number;
          overhead_cost?: number;
          total_cost?: number;
          cost_per_unit?: number;
          quality_score?: number;
          notes?: string;
        };
        Update: {
          batch_number?: string;
          product_id?: string;
          quantity?: number;
          start_date?: string;
          end_date?: string;
          batch_status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_HOLD' | 'REJECTED';
          labor_hours?: number;
          overhead_cost?: number;
          total_cost?: number;
          cost_per_unit?: number;
          quality_score?: number;
          notes?: string;
        };
      };
    };
  };
}

// Helper functions for common operations
export class SupabaseService {
  static async withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error('Supabase operation failed:', error);
      throw error;
    }
  }

  static async handleResponse<T>(response: { data: T | null; error: any }): Promise<T> {
    if (response.error) {
      console.error('Supabase error:', response.error);
      throw new Error(response.error.message || 'Database operation failed');
    }
    
    if (response.data === null) {
      throw new Error('No data returned');
    }
    
    return response.data;
  }
}

console.log('🚀 Supabase client initialized for Slatko Confectionery Management');