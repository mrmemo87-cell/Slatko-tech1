-- ============================================
-- VERIFY DATABASE MIGRATION SUCCESS
-- ============================================
-- Run this to check if COMPLETE_DATABASE_MIGRATION.sql ran successfully
-- ============================================

SELECT '🔍 VERIFYING DATABASE COLUMNS...' as status;

-- Check deliveries table columns
SELECT 
  '📋 Deliveries table columns:' as info,
  column_name,
  data_type,
  column_default,
  CASE WHEN is_nullable = 'YES' THEN '✅ Nullable' ELSE '❌ NOT NULL' END as nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'deliveries'
  AND column_name IN (
    'workflow_stage',
    'payment_status', 
    'payment_method',
    'delivered_total',
    'returned_total',
    'state'
  )
ORDER BY column_name;

-- Check if workflow_stage column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'deliveries' 
        AND column_name = 'workflow_stage'
    ) 
    THEN '✅ workflow_stage column EXISTS'
    ELSE '❌ workflow_stage column MISSING - Run COMPLETE_DATABASE_MIGRATION.sql!'
  END as workflow_stage_status;

-- Check if payment_status column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'deliveries' 
        AND column_name = 'payment_status'
    ) 
    THEN '✅ payment_status column EXISTS'
    ELSE '❌ payment_status column MISSING - Run COMPLETE_DATABASE_MIGRATION.sql!'
  END as payment_status_status;

-- Check deliveries table workflow_stage values
SELECT 
  '📊 Workflow stages in deliveries:' as info,
  workflow_stage,
  COUNT(*) as count
FROM deliveries
GROUP BY workflow_stage
ORDER BY count DESC;

-- Check if old payment tables still exist
SELECT '🗑️ OLD PAYMENT TABLES STATUS:' as info;

SELECT 
  tablename,
  CASE 
    WHEN tablename IN ('settlement_sessions', 'payment_transactions', 'order_payment_records', 
                       'client_account_balance', 'client_return_policy', 'order_returns') 
    THEN '❌ SHOULD BE DELETED'
    ELSE '✅ Core table'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'deliveries', 'delivery_items', 'return_items', 'payments', 'clients', 'products',
    'settlement_sessions', 'payment_transactions', 'order_payment_records', 
    'client_account_balance', 'client_return_policy', 'order_returns', 'settlement_details'
  )
ORDER BY tablename;

SELECT '✅ VERIFICATION COMPLETE' as status;
