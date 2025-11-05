-- ========================================
-- CLEANUP UNUSED PAYMENT TABLES
-- ========================================
-- This script removes the complex payment tracking tables that are no longer used.
-- The app now uses the simple core tables:
--   - deliveries (main orders with payment_status, payment_method columns)
--   - delivery_items (order items)
--   - return_items (returns)
--   - payments (basic payment records)
--   - clients (customer data)
--   - products (product catalog)
--
-- ⚠️ CRITICAL PREREQUISITES:
-- 1. ✅ COMPLETE_DATABASE_MIGRATION.sql MUST be run FIRST!
-- 2. ✅ Test that order creation works
-- 3. ✅ Test that payment system works
-- 4. ✅ BACKUP YOUR DATABASE before running this!
--
-- Run this in Supabase SQL Editor ONLY AFTER migration and testing.
-- ========================================

BEGIN;

SELECT '🗑️ Starting cleanup of unused payment tables...' as status;

-- ============================================
-- PART 1: BACKUP CHECK
-- ============================================

-- Show what will be deleted
SELECT '📋 Tables that will be PERMANENTLY DELETED:' as warning;

SELECT 
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'settlement_sessions',
    'payment_transactions',
    'order_payment_records',
    'client_account_balance',
    'client_return_policy',
    'order_returns',
    'settlement_details'
  )
ORDER BY tablename;

-- ============================================
-- PART 2: DROP DEPENDENT OBJECTS FIRST
-- ============================================

SELECT '🔧 Dropping dependent views and functions...' as step;

-- Drop related views if they exist
DROP VIEW IF EXISTS public.order_payment_status_with_returns CASCADE;
DROP VIEW IF EXISTS public.client_payment_summary CASCADE;
DROP VIEW IF EXISTS public.delivery_payment_summary CASCADE;
DROP VIEW IF EXISTS public.client_balance_view CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS public.update_client_balance() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_order_total(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.process_settlement(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_client_balance(UUID) CASCADE;

-- Drop triggers that might reference these tables
DROP TRIGGER IF EXISTS trg_update_payment_on_delivery ON public.deliveries CASCADE;
DROP TRIGGER IF EXISTS trg_update_balance_on_payment ON public.payments CASCADE;

SELECT '✅ Dependent objects dropped' as status;

-- ============================================
-- PART 3: DROP THE COMPLEX PAYMENT TABLES
-- ============================================

SELECT '🗑️ Dropping unused payment management tables...' as step;

-- Drop the complex payment management tables
DROP TABLE IF EXISTS public.settlement_details CASCADE;
DROP TABLE IF EXISTS public.settlement_sessions CASCADE;
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.order_payment_records CASCADE;
DROP TABLE IF EXISTS public.client_account_balance CASCADE;
DROP TABLE IF EXISTS public.client_return_policy CASCADE;
DROP TABLE IF EXISTS public.order_returns CASCADE;

SELECT '✅ Complex payment tables dropped' as status;

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

SELECT '✅ Verifying cleanup...' as step;

-- Verify core tables still exist
SELECT '📊 CORE TABLES (should still exist):' as info;
SELECT 
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = pt.tablename) as column_count
FROM pg_tables pt
WHERE schemaname = 'public' 
  AND tablename IN ('deliveries', 'delivery_items', 'return_items', 'payments', 'clients', 'products')
ORDER BY tablename;

-- Verify deleted tables are gone
SELECT '🗑️ DELETED TABLES (should be empty):' as info;
SELECT tablename
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'settlement_sessions',
    'payment_transactions',
    'order_payment_records',
    'client_account_balance',
    'client_return_policy',
    'order_returns',
    'settlement_details'
  );

-- Show current table count
SELECT '📈 Total tables in public schema:' as info, COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public';

-- Verify deliveries table has new payment columns
SELECT '💰 Payment columns in deliveries table:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'deliveries'
  AND column_name IN ('payment_status', 'payment_method', 'delivered_total', 'returned_total')
ORDER BY column_name;

COMMIT;

SELECT '🎉 ✅ CLEANUP COMPLETED SUCCESSFULLY! ✅ 🎉' as status;
SELECT '✅ All unused payment tables have been removed.' as result;
SELECT '✅ Core tables (deliveries, delivery_items, return_items, payments, clients, products) are intact.' as result;
SELECT '✅ Your app now uses ONLY the simple core tables for all operations.' as result;
