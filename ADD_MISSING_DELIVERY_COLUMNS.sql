-- ========================================
-- ADD MISSING COLUMNS TO DELIVERIES TABLE
-- ========================================
-- This adds the payment tracking columns that are missing from the deliveries table
-- Run this in Supabase SQL Editor BEFORE testing the app
-- ========================================

-- Add payment_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'awaiting_confirmation', 'paid', 'pending', 'partial'));
    
    RAISE NOTICE 'Added payment_status column';
  ELSE
    RAISE NOTICE 'payment_status column already exists';
  END IF;
END $$;

-- Add payment_method column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN payment_method VARCHAR(20)
    CHECK (payment_method IS NULL OR payment_method IN ('SRAZU', 'LATER_CASH', 'LATER_BANK', 'cash', 'card', 'bank_transfer', 'check'));
    
    RAISE NOTICE 'Added payment_method column';
  ELSE
    RAISE NOTICE 'payment_method column already exists';
  END IF;
END $$;

-- Add delivered_total column if it doesn't exist (for caching calculated totals)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'delivered_total'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN delivered_total DECIMAL(10,2) DEFAULT 0;
    
    RAISE NOTICE 'Added delivered_total column';
  ELSE
    RAISE NOTICE 'delivered_total column already exists';
  END IF;
END $$;

-- Add returned_total column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'returned_total'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN returned_total DECIMAL(10,2) DEFAULT 0;
    
    RAISE NOTICE 'Added returned_total column';
  ELSE
    RAISE NOTICE 'returned_total column already exists';
  END IF;
END $$;

-- Add previous_invoice_balance column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'previous_invoice_balance'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN previous_invoice_balance DECIMAL(10,2) DEFAULT 0;
    
    RAISE NOTICE 'Added previous_invoice_balance column';
  ELSE
    RAISE NOTICE 'previous_invoice_balance column already exists';
  END IF;
END $$;

-- Add state column if it doesn't exist (for workflow tracking)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'state'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN state VARCHAR(50) DEFAULT 'created';
    
    RAISE NOTICE 'Added state column';
  ELSE
    RAISE NOTICE 'state column already exists';
  END IF;
END $$;

-- Add production_stage column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'production_stage'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN production_stage VARCHAR(50);
    
    RAISE NOTICE 'Added production_stage column';
  ELSE
    RAISE NOTICE 'production_stage column already exists';
  END IF;
END $$;

-- Add delivery_stage column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'delivery_stage'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN delivery_stage VARCHAR(50);
    
    RAISE NOTICE 'Added delivery_stage column';
  ELSE
    RAISE NOTICE 'delivery_stage column already exists';
  END IF;
END $$;

-- Add courier_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'courier_name'
  ) THEN
    ALTER TABLE public.deliveries 
    ADD COLUMN courier_name VARCHAR(255);
    
    RAISE NOTICE 'Added courier_name column';
  ELSE
    RAISE NOTICE 'courier_name column already exists';
  END IF;
END $$;

-- Add unit column to delivery_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_items' 
    AND column_name = 'unit'
  ) THEN
    ALTER TABLE public.delivery_items 
    ADD COLUMN unit VARCHAR(50);
    
    RAISE NOTICE 'Added unit column to delivery_items';
  ELSE
    RAISE NOTICE 'unit column already exists in delivery_items';
  END IF;
END $$;

-- Verify all columns were added
SELECT 'Migration complete - checking columns...' as status;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'deliveries'
  AND column_name IN ('payment_status', 'payment_method', 'delivered_total', 'returned_total', 
                      'previous_invoice_balance', 'state', 'production_stage', 'delivery_stage', 'courier_name')
ORDER BY column_name;

SELECT 'delivery_items columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'delivery_items'
ORDER BY column_name;
