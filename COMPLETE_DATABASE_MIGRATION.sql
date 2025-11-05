-- ============================================
-- COMPLETE DATABASE MIGRATION - RUN THIS FIRST
-- ============================================
-- This adds ALL missing columns needed for the app to work
-- Combines workflow_stage, payment columns, and other required fields
-- Run this in Supabase SQL Editor BEFORE using the app
-- ============================================

BEGIN;

SELECT '🚀 Starting Complete Database Migration...' as status;

-- ============================================
-- PART 1: WORKFLOW COLUMNS (from workflow-migration.sql)
-- ============================================

SELECT '📋 Adding workflow columns to deliveries table...' as step;

-- Add workflow_stage column
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'order_placed' 
  CHECK (workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'settlement', 'completed'));

-- Add workflow tracking columns
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

-- ============================================
-- PART 2: PAYMENT COLUMNS
-- ============================================

SELECT '💰 Adding payment tracking columns...' as step;

-- Add payment_status column
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'
CHECK (payment_status IN ('unpaid', 'awaiting_confirmation', 'paid', 'pending', 'partial'));

-- Add payment_method column
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20)
CHECK (payment_method IS NULL OR payment_method IN ('SRAZU', 'LATER_CASH', 'LATER_BANK', 'cash', 'card', 'bank_transfer', 'check'));

-- Add calculated total columns
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS delivered_total DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS returned_total DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS previous_invoice_balance DECIMAL(10,2) DEFAULT 0;

-- ============================================
-- PART 3: STATE COLUMNS
-- ============================================

SELECT '📊 Adding state tracking columns...' as step;

-- Add state column for overall order state
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'active'
CHECK (state IN ('active', 'completed', 'cancelled', 'draft'));

-- Add stage columns for detailed tracking
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS production_stage VARCHAR(50);

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS delivery_stage VARCHAR(50);

-- Add courier name
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS courier_name VARCHAR(255);

-- ============================================
-- PART 4: DELIVERY_ITEMS COLUMNS
-- ============================================

SELECT '📦 Adding unit column to delivery_items...' as step;

-- Add unit column to delivery_items
ALTER TABLE public.delivery_items 
ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pcs';

-- ============================================
-- PART 5: PRODUCTS TABLE ENHANCEMENTS
-- ============================================

SELECT '🏭 Adding production_time to products...' as step;

-- Add production_time column to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS production_time INTEGER DEFAULT 30;

-- ============================================
-- PART 6: UPDATE EXISTING DATA
-- ============================================

SELECT '🔄 Updating existing deliveries with default values...' as step;

-- Set workflow_stage for existing deliveries without it
UPDATE public.deliveries 
SET workflow_stage = 'order_placed' 
WHERE workflow_stage IS NULL;

-- Set payment_status for existing deliveries
UPDATE public.deliveries 
SET payment_status = 'unpaid' 
WHERE payment_status IS NULL;

-- Set state for existing deliveries
UPDATE public.deliveries 
SET state = 'active' 
WHERE state IS NULL;

-- ============================================
-- PART 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================

SELECT '🔍 Creating indexes for better performance...' as step;

CREATE INDEX IF NOT EXISTS idx_deliveries_workflow_stage ON public.deliveries(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_deliveries_payment_status ON public.deliveries(payment_status);
CREATE INDEX IF NOT EXISTS idx_deliveries_state ON public.deliveries(state);
CREATE INDEX IF NOT EXISTS idx_deliveries_client_date ON public.deliveries(client_id, date DESC);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Verifying migration...' as step;

-- Check that all columns exist
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'deliveries'
  AND column_name IN (
    'workflow_stage', 
    'payment_status', 
    'payment_method',
    'delivered_total',
    'returned_total',
    'state',
    'production_stage',
    'delivery_stage',
    'courier_name',
    'assigned_driver',
    'production_notes',
    'delivery_notes'
  )
ORDER BY column_name;

-- Count deliveries
SELECT 
  '📊 Total deliveries:' as info,
  COUNT(*) as count
FROM public.deliveries;

-- Show workflow stage distribution
SELECT 
  '📈 Deliveries by workflow stage:' as info,
  workflow_stage,
  COUNT(*) as count
FROM public.deliveries
GROUP BY workflow_stage
ORDER BY count DESC;

-- Show payment status distribution
SELECT 
  '💰 Deliveries by payment status:' as info,
  payment_status,
  COUNT(*) as count
FROM public.deliveries
GROUP BY payment_status
ORDER BY count DESC;

COMMIT;

SELECT '🎉 ✅ MIGRATION COMPLETED SUCCESSFULLY! ✅ 🎉' as status;
SELECT 'You can now use the app - all required columns have been added.' as next_step;
