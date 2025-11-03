-- Critical Fix: Update production_tasks table to match workflowService expectations
-- This fixes the "estimated_time" column error and NULL constraint issues

-- Add the expected columns to production_tasks table
ALTER TABLE public.production_tasks 
ADD COLUMN IF NOT EXISTS estimated_time INTEGER;

ALTER TABLE public.production_tasks 
ADD COLUMN IF NOT EXISTS actual_time INTEGER;

ALTER TABLE public.production_tasks 
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

-- Fix the task_name NOT NULL constraint issue
-- The workflowService doesn't provide task_name, so make it nullable or add default
ALTER TABLE public.production_tasks 
ALTER COLUMN task_name DROP NOT NULL;

-- Set a default task_name for existing records  
UPDATE public.production_tasks 
SET task_name = COALESCE(product_name, 'Production Task') 
WHERE task_name IS NULL;

-- Fix priority column to accept string values that workflowService uses
ALTER TABLE public.production_tasks 
DROP CONSTRAINT IF EXISTS production_tasks_priority_check;

-- Change priority column to accept string values
ALTER TABLE public.production_tasks 
ALTER COLUMN priority TYPE VARCHAR(20);

ALTER TABLE public.production_tasks 
ADD CONSTRAINT production_tasks_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'urgent') OR priority IS NULL);

-- Copy data from existing columns to new ones (if any data exists)
UPDATE public.production_tasks 
SET estimated_time = estimated_duration_minutes 
WHERE estimated_time IS NULL AND estimated_duration_minutes IS NOT NULL;

UPDATE public.production_tasks 
SET actual_time = actual_duration_minutes 
WHERE actual_time IS NULL AND actual_duration_minutes IS NOT NULL;

-- Update product names from products table
UPDATE public.production_tasks pt
SET product_name = p.name
FROM public.products p
WHERE pt.product_id = p.id AND pt.product_name IS NULL;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_production_tasks_estimated_time ON public.production_tasks(estimated_time);
CREATE INDEX IF NOT EXISTS idx_production_tasks_product_name ON public.production_tasks(product_name);

-- Test query to verify all expected columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'production_tasks' 
AND column_name IN ('estimated_time', 'actual_time', 'product_name', 'priority', 'status', 'quantity')
ORDER BY column_name;

-- Test that we can insert the data format workflowService expects
-- This simulates what workflowService.createProductionTasks() tries to insert
/*
Expected insert format:
{
  delivery_id: UUID,
  product_id: UUID,  
  product_name: string,
  quantity: number,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  estimated_time: number,
  status: 'pending'
}
*/