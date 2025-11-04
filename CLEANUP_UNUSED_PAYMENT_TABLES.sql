-- ========================================
-- CLEANUP UNUSED PAYMENT TABLES
-- ========================================
-- This script removes the complex payment tracking tables that are no longer used.
-- The app now uses the simple core tables:
--   - deliveries (main orders)
--   - delivery_items (order items)
--   - return_items (returns)
--   - payments (basic payment records)
--
-- BEFORE running this:
-- 1. Make sure the app is working with the updated code
-- 2. Test that orders show correct totals
-- 3. Test that payment processing works
-- 4. BACKUP YOUR DATABASE!
--
-- Run this in Supabase SQL Editor AFTER confirming everything works.
-- ========================================

-- Drop the complex payment management tables
DROP TABLE IF EXISTS public.settlement_sessions CASCADE;
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.order_payment_records CASCADE;
DROP TABLE IF EXISTS public.client_account_balance CASCADE;
DROP TABLE IF EXISTS public.client_return_policy CASCADE;
DROP TABLE IF EXISTS public.order_returns CASCADE;
DROP TABLE IF EXISTS public.settlement_details CASCADE;

-- Drop related views if they exist
DROP VIEW IF EXISTS public.order_payment_status_with_returns CASCADE;
DROP VIEW IF EXISTS public.client_payment_summary CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS public.update_client_balance() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_order_total(UUID) CASCADE;

-- Verify cleanup
SELECT 'Cleanup complete - unused payment tables removed' as status;

-- Verify remaining core tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('deliveries', 'delivery_items', 'return_items', 'payments', 'clients', 'products')
ORDER BY tablename;
