-- Workflow Enhancement Migration for Slatko Confectionery Management
-- Add workflow tracking columns to support complete production and delivery workflow

-- Add workflow columns to deliveries table
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'order_placed' 
  CHECK (workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'settlement', 'completed'));

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS assigned_driver VARCHAR(255);

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS production_notes TEXT;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS production_start_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS production_completed_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS delivery_start_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS delivery_completed_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS actual_delivery_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5);

-- Create workflow events table for audit trail
CREATE TABLE IF NOT EXISTS public.workflow_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  notes TEXT,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create production tasks table
CREATE TABLE IF NOT EXISTS public.production_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  task_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10,3) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'quality_check')),
  assigned_worker VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  quality_notes TEXT,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery routes table
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_name VARCHAR(255) NOT NULL,
  driver_id VARCHAR(255),
  driver_name VARCHAR(255),
  route_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  estimated_start_time TIMESTAMP WITH TIME ZONE,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  estimated_end_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  total_deliveries INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create route deliveries junction table
CREATE TABLE IF NOT EXISTS public.route_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.delivery_routes(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  estimated_arrival_time TIMESTAMP WITH TIME ZONE,
  actual_arrival_time TIMESTAMP WITH TIME ZONE,
  delivery_status VARCHAR(20) DEFAULT 'scheduled' CHECK (delivery_status IN ('scheduled', 'en_route', 'delivered', 'failed', 'rescheduled')),
  delivery_notes TEXT,
  customer_signature TEXT,
  delivery_photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(route_id, delivery_id)
);

-- Create settlement details table
CREATE TABLE IF NOT EXISTS public.settlement_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE UNIQUE,
  delivered_amount DECIMAL(10,2) DEFAULT 0,
  returned_amount DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'credit')),
  payment_received DECIMAL(10,2) DEFAULT 0,
  credit_applied DECIMAL(10,2) DEFAULT 0,
  new_debt_amount DECIMAL(10,2) DEFAULT 0,
  settlement_notes TEXT,
  customer_signature TEXT,
  delivery_photos TEXT[],
  settled_by VARCHAR(255),
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deliveries_workflow_stage ON public.deliveries(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_driver ON public.deliveries(assigned_driver);
CREATE INDEX IF NOT EXISTS idx_deliveries_production_start ON public.deliveries(production_start_time);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date ON public.deliveries(delivery_completed_time);

CREATE INDEX IF NOT EXISTS idx_workflow_events_delivery ON public.workflow_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_stage ON public.workflow_events(stage);
CREATE INDEX IF NOT EXISTS idx_workflow_events_timestamp ON public.workflow_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_production_tasks_delivery ON public.production_tasks(delivery_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON public.production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_production_tasks_worker ON public.production_tasks(assigned_worker);

CREATE INDEX IF NOT EXISTS idx_delivery_routes_date ON public.delivery_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver ON public.delivery_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON public.delivery_routes(status);

CREATE INDEX IF NOT EXISTS idx_route_deliveries_route ON public.route_deliveries(route_id);
CREATE INDEX IF NOT EXISTS idx_route_deliveries_delivery ON public.route_deliveries(delivery_id);
CREATE INDEX IF NOT EXISTS idx_route_deliveries_status ON public.route_deliveries(delivery_status);

-- Add updated_at triggers for new tables
CREATE OR REPLACE TRIGGER set_timestamp_workflow_events
  BEFORE UPDATE ON public.workflow_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_production_tasks
  BEFORE UPDATE ON public.production_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_delivery_routes
  BEFORE UPDATE ON public.delivery_routes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_route_deliveries
  BEFORE UPDATE ON public.route_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_settlement_details
  BEFORE UPDATE ON public.settlement_details
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS on new tables
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow tables
CREATE POLICY "Authenticated users can view workflow events" ON public.workflow_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert workflow events" ON public.workflow_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view production tasks" ON public.production_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage production tasks" ON public.production_tasks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view delivery routes" ON public.delivery_routes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage delivery routes" ON public.delivery_routes
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view route deliveries" ON public.route_deliveries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage route deliveries" ON public.route_deliveries
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view settlement details" ON public.settlement_details
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage settlement details" ON public.settlement_details
  FOR ALL USING (auth.role() = 'authenticated');

-- Update existing deliveries to have default workflow stage
UPDATE public.deliveries 
SET workflow_stage = 'order_placed' 
WHERE workflow_stage IS NULL;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';