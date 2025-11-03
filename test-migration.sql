-- QUICK TEST MIGRATION - Run this first to test if your Supabase connection works
-- This adds only the most critical columns needed immediately

-- Add missing production_time column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS production_time INTEGER DEFAULT 30;

-- Add workflow columns to deliveries table
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'order_placed' 
  CHECK (workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'settlement', 'completed'));

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS production_start_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS production_completed_time TIMESTAMP WITH TIME ZONE;

-- Update existing products to have default production time
UPDATE public.products 
SET production_time = 30 
WHERE production_time IS NULL;

-- Update existing deliveries to have default workflow stage
UPDATE public.deliveries 
SET workflow_stage = 'order_placed' 
WHERE workflow_stage IS NULL;

-- Test query to verify columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'production_time'
UNION ALL
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'deliveries' AND column_name IN ('workflow_stage', 'production_start_time', 'production_completed_time');