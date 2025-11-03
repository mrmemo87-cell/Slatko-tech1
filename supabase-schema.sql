-- Slatko Confectionery Management Database Schema for Supabase
-- Run this in the Supabase SQL Editor to create all necessary tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  stock DECIMAL(10,3) DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  category VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  shelf_life_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Materials table
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  stock DECIMAL(10,3) DEFAULT 0,
  cost_per_unit DECIMAL(10,2) DEFAULT 0,
  supplier VARCHAR(255),
  expiration_date DATE,
  min_stock_level DECIMAL(10,3) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  payment_term_days INTEGER DEFAULT 30,
  current_balance DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  risk_level VARCHAR(10) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  last_order_date DATE,
  total_order_value DECIMAL(12,2) DEFAULT 0,
  reliability_score INTEGER DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Production batches table
CREATE TABLE IF NOT EXISTS public.production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number VARCHAR(100) UNIQUE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  batch_status VARCHAR(20) DEFAULT 'PLANNED' CHECK (batch_status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'QUALITY_HOLD', 'REJECTED')),
  labor_hours DECIMAL(8,2) DEFAULT 0,
  overhead_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  cost_per_unit DECIMAL(10,4) DEFAULT 0,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Material costs for production batches
CREATE TABLE IF NOT EXISTS public.production_material_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_batch_id UUID REFERENCES public.production_batches(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Deliveries table with workflow support
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Settled', 'Paid')),
  notes TEXT,
  -- Workflow tracking columns
  workflow_stage VARCHAR(50) DEFAULT 'order_placed' 
    CHECK (workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'settlement', 'completed')),
  assigned_driver VARCHAR(255),
  production_notes TEXT,
  delivery_notes TEXT,
  production_start_time TIMESTAMP WITH TIME ZONE,
  production_completed_time TIMESTAMP WITH TIME ZONE,
  delivery_start_time TIMESTAMP WITH TIME ZONE,
  delivery_completed_time TIMESTAMP WITH TIME ZONE,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Delivery items
CREATE TABLE IF NOT EXISTS public.delivery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Return items
CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) DEFAULT 'cash' CHECK (method IN ('cash', 'card', 'bank_transfer', 'check')),
  reference VARCHAR(100),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Purchase items
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sync log for offline support
CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

CREATE INDEX IF NOT EXISTS idx_materials_name ON public.materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_stock ON public.materials(stock);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_risk ON public.clients(risk_level);

CREATE INDEX IF NOT EXISTS idx_deliveries_client_id ON public.deliveries(client_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON public.deliveries(date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_invoice ON public.deliveries(invoice_number);
-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_workflow_stage ON public.deliveries(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_driver ON public.deliveries(assigned_driver);
CREATE INDEX IF NOT EXISTS idx_deliveries_production_start ON public.deliveries(production_start_time);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date ON public.deliveries(delivery_completed_time);

CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON public.delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_product_id ON public.delivery_items(product_id);

CREATE INDEX IF NOT EXISTS idx_production_batches_product_id ON public.production_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON public.production_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_production_batches_date ON public.production_batches(start_date);

CREATE INDEX IF NOT EXISTS idx_payments_delivery_id ON public.payments(delivery_id);
CREATE INDEX IF NOT EXISTS idx_return_items_delivery_id ON public.return_items(delivery_id);

CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON public.sync_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_log_table_record ON public.sync_log(table_name, record_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables that need updated_at
CREATE OR REPLACE TRIGGER set_timestamp_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_materials
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_deliveries
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_production_batches
  BEFORE UPDATE ON public.production_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_purchases
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (authenticated users can access all data)
-- In production, you'd want more granular policies based on user roles

CREATE POLICY "Authenticated users can view all products" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert products" ON public.products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all materials" ON public.materials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert materials" ON public.materials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update materials" ON public.materials
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all clients" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all deliveries" ON public.deliveries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert deliveries" ON public.deliveries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update deliveries" ON public.deliveries
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Apply similar policies to all other tables
CREATE POLICY "Authenticated users can access delivery_items" ON public.delivery_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access return_items" ON public.return_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access payments" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access production_batches" ON public.production_batches
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access production_material_costs" ON public.production_material_costs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access purchases" ON public.purchases
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access purchase_items" ON public.purchase_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access users" ON public.users
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access sync_log" ON public.sync_log
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert some sample data for testing

-- Sample products
INSERT INTO public.products (name, unit, stock, price, cost, category, description) VALUES
('Chocolate Cake', 'piece', 10, 25.00, 15.00, 'Cakes', 'Rich chocolate layer cake'),
('Vanilla Cupcakes', 'dozen', 5, 18.00, 12.00, 'Cupcakes', 'Classic vanilla cupcakes with buttercream'),
('Croissant', 'piece', 20, 3.50, 2.00, 'Pastries', 'Buttery French croissant'),
('Apple Pie', 'piece', 3, 22.00, 14.00, 'Pies', 'Traditional apple pie with cinnamon'),
('Bread Loaf', 'loaf', 15, 4.50, 2.50, 'Bread', 'Fresh white bread loaf')
ON CONFLICT DO NOTHING;

-- Sample materials
INSERT INTO public.materials (name, unit, stock, cost_per_unit, min_stock_level) VALUES
('Flour', 'kg', 50, 1.20, 10),
('Sugar', 'kg', 30, 0.80, 5),
('Butter', 'kg', 20, 4.50, 5),
('Eggs', 'dozen', 15, 3.00, 5),
('Cocoa Powder', 'kg', 8, 8.00, 2)
ON CONFLICT DO NOTHING;

-- Sample clients
INSERT INTO public.clients (name, business_name, email, phone, credit_limit, risk_level) VALUES
('John Smith', 'Smith Catering', 'john@smithcatering.com', '+1-555-0101', 500.00, 'LOW'),
('Maria Garcia', 'Garcia Events', 'maria@garciaevents.com', '+1-555-0102', 1000.00, 'LOW'),
('Restaurant ABC', 'ABC Restaurant', 'orders@restaurant-abc.com', '+1-555-0103', 2000.00, 'MEDIUM')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Slatko Confectionery Management database schema created successfully!';
    RAISE NOTICE '📱 Ready for mobile app integration with Supabase';
    RAISE NOTICE '🔐 Row Level Security enabled - users need to be authenticated';
    RAISE NOTICE '📊 Sample data inserted for testing';
END $$;