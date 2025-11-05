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
  production_time INTEGER DEFAULT 30,
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
  payment_status VARCHAR(20) DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'awaiting_confirmation', 'paid')),
  payment_method VARCHAR(20)
    CHECK (payment_method IS NULL OR payment_method IN ('SRAZU', 'LATER_CASH', 'LATER_BANK', 'cash', 'card', 'bank_transfer', 'check')),
  delivered_summary JSONB DEFAULT '[]',
  adjustment_reason TEXT,
  returns_total DECIMAL(10,2) DEFAULT 0,
  returns_note TEXT,
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

DROP POLICY IF EXISTS "Authenticated users can view all products" ON public.products;
CREATE POLICY "Authenticated users can view all products" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
CREATE POLICY "Authenticated users can insert products" ON public.products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view all materials" ON public.materials;
CREATE POLICY "Authenticated users can view all materials" ON public.materials
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert materials" ON public.materials;
CREATE POLICY "Authenticated users can insert materials" ON public.materials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update materials" ON public.materials;
CREATE POLICY "Authenticated users can update materials" ON public.materials
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view all clients" ON public.clients;
CREATE POLICY "Authenticated users can view all clients" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view all deliveries" ON public.deliveries;
CREATE POLICY "Authenticated users can view all deliveries" ON public.deliveries
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert deliveries" ON public.deliveries;
CREATE POLICY "Authenticated users can insert deliveries" ON public.deliveries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update deliveries" ON public.deliveries;
CREATE POLICY "Authenticated users can update deliveries" ON public.deliveries
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Apply similar policies to all other tables
DROP POLICY IF EXISTS "Authenticated users can access delivery_items" ON public.delivery_items;
CREATE POLICY "Authenticated users can access delivery_items" ON public.delivery_items
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access return_items" ON public.return_items;
CREATE POLICY "Authenticated users can access return_items" ON public.return_items
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access payments" ON public.payments;
CREATE POLICY "Authenticated users can access payments" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access production_batches" ON public.production_batches;
CREATE POLICY "Authenticated users can access production_batches" ON public.production_batches
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access production_material_costs" ON public.production_material_costs;
CREATE POLICY "Authenticated users can access production_material_costs" ON public.production_material_costs
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access purchases" ON public.purchases;
CREATE POLICY "Authenticated users can access purchases" ON public.purchases
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access purchase_items" ON public.purchase_items;
CREATE POLICY "Authenticated users can access purchase_items" ON public.purchase_items
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access users" ON public.users;
CREATE POLICY "Authenticated users can access users" ON public.users
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access sync_log" ON public.sync_log;
CREATE POLICY "Authenticated users can access sync_log" ON public.sync_log
  FOR ALL USING (auth.role() = 'authenticated');

-- Payment proof storage
CREATE TABLE IF NOT EXISTS public.order_payment_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  note TEXT,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_by UUID DEFAULT auth.uid(),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_payment_proofs_order_id ON public.order_payment_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_proofs_status ON public.order_payment_proofs(status);

ALTER TABLE public.order_payment_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can access payment proofs" ON public.order_payment_proofs;
CREATE POLICY "Authenticated users can access payment proofs" ON public.order_payment_proofs
  FOR ALL USING (auth.role() = 'authenticated');

-- RPC helper functions
DROP FUNCTION IF EXISTS public.rpc_production_set_stage(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.rpc_production_set_stage(
  p_order_id UUID,
  p_stage TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  target_stage TEXT;
BEGIN
  IF p_stage NOT IN ('received', 'preparing', 'ready_to_pick') THEN
    RAISE EXCEPTION 'Invalid production stage %', p_stage;
  END IF;

  target_stage := CASE p_stage
    WHEN 'received' THEN 'production_queue'
    WHEN 'preparing' THEN 'in_production'
    WHEN 'ready_to_pick' THEN 'ready_for_delivery'
  END;

  UPDATE public.deliveries
  SET workflow_stage = target_stage,
      production_start_time = CASE
        WHEN target_stage = 'in_production' AND production_start_time IS NULL THEN now()
        ELSE production_start_time
      END,
      production_completed_time = CASE
        WHEN target_stage = 'ready_for_delivery' THEN now()
        ELSE production_completed_time
      END,
      updated_at = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery % not found', p_order_id;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_delivery_set_stage(UUID, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.rpc_delivery_set_stage(
  p_order_id UUID,
  p_stage TEXT,
  p_assign_if_pick BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  target_stage TEXT;
  driver_id TEXT;
BEGIN
  IF p_stage NOT IN ('ready_for_pick', 'on_route', 'settlement') THEN
    RAISE EXCEPTION 'Invalid delivery stage %', p_stage;
  END IF;

  target_stage := CASE p_stage
    WHEN 'ready_for_pick' THEN 'ready_for_delivery'
    WHEN 'on_route' THEN 'out_for_delivery'
    ELSE 'settlement'
  END;

  IF p_assign_if_pick THEN
    driver_id := auth.uid()::TEXT;
  END IF;

  UPDATE public.deliveries
  SET workflow_stage = target_stage,
      delivery_start_time = CASE
        WHEN target_stage = 'out_for_delivery' AND delivery_start_time IS NULL THEN now()
        ELSE delivery_start_time
      END,
      delivery_completed_time = CASE
        WHEN target_stage = 'settlement' THEN now()
        ELSE delivery_completed_time
      END,
      assigned_driver = CASE
        WHEN target_stage = 'out_for_delivery' AND driver_id IS NOT NULL THEN driver_id
        ELSE assigned_driver
      END,
      updated_at = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery % not found', p_order_id;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_delivery_adjust_items(UUID, JSONB, TEXT);
CREATE OR REPLACE FUNCTION public.rpc_delivery_adjust_items(
  p_order_id UUID,
  p_delivered_items JSONB,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
BEGIN
  IF p_delivered_items IS NULL OR jsonb_typeof(p_delivered_items) <> 'array' THEN
    RAISE EXCEPTION 'Delivered items must be an array';
  END IF;

  UPDATE public.deliveries
  SET delivered_summary = p_delivered_items,
      adjustment_reason = COALESCE(p_reason, adjustment_reason),
      updated_at = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery % not found', p_order_id;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_settlement_apply_returns(UUID, NUMERIC, TEXT);
CREATE OR REPLACE FUNCTION public.rpc_settlement_apply_returns(
  p_order_id UUID,
  p_returns NUMERIC,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
BEGIN
  UPDATE public.deliveries
  SET returns_total = p_returns,
      returns_note = p_note,
      updated_at = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery % not found', p_order_id;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_payment_choose(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.rpc_payment_choose(
  p_order_id UUID,
  p_method TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  target_status TEXT;
BEGIN
  IF p_method NOT IN ('SRAZU', 'LATER_CASH', 'LATER_BANK') THEN
    RAISE EXCEPTION 'Invalid payment method %', p_method;
  END IF;

  target_status := CASE p_method
    WHEN 'SRAZU' THEN 'paid'
    ELSE 'awaiting_confirmation'
  END;

  UPDATE public.deliveries
  SET payment_method = p_method,
      payment_status = target_status,
      status = CASE WHEN target_status = 'paid' THEN 'Paid' ELSE status END,
      updated_at = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery % not found', p_order_id;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_payment_upload_proof(UUID, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.rpc_payment_upload_proof(
  p_order_id UUID,
  p_file_path TEXT,
  p_mime TEXT DEFAULT NULL,
  p_size NUMERIC DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_auto_approve BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  new_id UUID;
  reviewer UUID;
  target_status TEXT := 'pending';
BEGIN
  IF p_auto_approve THEN
    target_status := 'approved';
    reviewer := auth.uid();
  END IF;

  INSERT INTO public.order_payment_proofs (
    order_id,
    file_path,
    mime_type,
    size_bytes,
    note,
    status,
    uploaded_by,
    reviewed_by,
    reviewed_at,
    review_note
  )
  VALUES (
    p_order_id,
    p_file_path,
    p_mime,
    CASE WHEN p_size IS NULL THEN NULL ELSE p_size::BIGINT END,
    p_note,
    target_status,
    auth.uid(),
    reviewer,
    CASE WHEN p_auto_approve THEN now() ELSE NULL END,
    CASE WHEN p_auto_approve THEN 'Auto-approved' ELSE NULL END
  )
  RETURNING id INTO new_id;

  IF target_status = 'approved' THEN
    UPDATE public.deliveries
    SET payment_status = 'paid',
        status = 'Paid',
        updated_at = now()
    WHERE id = p_order_id;
  END IF;

  RETURN new_id;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_payment_proof_approve(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.rpc_payment_proof_approve(
  p_proof_id UUID,
  p_review_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  delivery_id UUID;
BEGIN
  UPDATE public.order_payment_proofs
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note
  WHERE id = p_proof_id
  RETURNING order_id INTO delivery_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment proof % not found', p_proof_id;
  END IF;

  UPDATE public.deliveries
  SET payment_status = 'paid',
      status = 'Paid',
      updated_at = now()
  WHERE id = delivery_id;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_payment_proof_reject(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.rpc_payment_proof_reject(
  p_proof_id UUID,
  p_review_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
BEGIN
  UPDATE public.order_payment_proofs
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note
  WHERE id = p_proof_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment proof % not found', p_proof_id;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_order_complete(UUID);
CREATE OR REPLACE FUNCTION public.rpc_order_complete(
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
BEGIN
  UPDATE public.deliveries
  SET workflow_stage = 'completed',
      delivery_completed_time = COALESCE(delivery_completed_time, now()),
      status = CASE
        WHEN payment_status = 'paid' THEN 'Paid'
        ELSE 'Settled'
      END,
      updated_at = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery % not found', p_order_id;
  END IF;
END;
$$;

-- Grant execute permissions for API access
GRANT EXECUTE ON FUNCTION public.rpc_production_set_stage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_delivery_set_stage(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_delivery_adjust_items(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_settlement_apply_returns(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_payment_choose(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_payment_upload_proof(UUID, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_payment_proof_approve(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_payment_proof_reject(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_order_complete(UUID) TO authenticated;

-- Signal PostgREST to reload schema after installing functions
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Slatko Confectionery Management database schema created successfully!';
    RAISE NOTICE '📱 Ready for mobile app integration with Supabase';
    RAISE NOTICE '🔐 Row Level Security enabled - users need to be authenticated';
END $$;