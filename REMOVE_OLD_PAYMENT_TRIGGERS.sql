-- ============================================
-- FIND AND REMOVE OLD PAYMENT TABLE TRIGGERS
-- ============================================
-- This finds triggers that reference deleted payment tables
-- and removes them
-- ============================================

BEGIN;

SELECT '🔍 Finding triggers that reference old payment tables...' as status;

-- List all triggers on deliveries table
SELECT 
  '📋 Triggers on deliveries table:' as info,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'deliveries'
  AND trigger_schema = 'public';

-- List all triggers on delivery_items table  
SELECT 
  '📋 Triggers on delivery_items table:' as info,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'delivery_items'
  AND trigger_schema = 'public';

-- List all triggers on payments table
SELECT 
  '📋 Triggers on payments table:' as info,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payments'
  AND trigger_schema = 'public';

-- Drop triggers that might reference order_payment_records
SELECT '🗑️ Dropping triggers that reference old payment tables...' as step;

-- Common trigger names that might exist
DROP TRIGGER IF EXISTS update_order_payment_record_trigger ON public.deliveries CASCADE;
DROP TRIGGER IF EXISTS create_payment_record_trigger ON public.deliveries CASCADE;
DROP TRIGGER IF EXISTS update_payment_status_trigger ON public.deliveries CASCADE;
DROP TRIGGER IF EXISTS sync_payment_record_trigger ON public.deliveries CASCADE;
DROP TRIGGER IF EXISTS update_order_payment_on_delivery ON public.deliveries CASCADE;
DROP TRIGGER IF EXISTS trg_update_payment_on_delivery ON public.deliveries CASCADE;
DROP TRIGGER IF EXISTS trg_create_payment_record ON public.deliveries CASCADE;

-- Drop triggers on delivery_items
DROP TRIGGER IF EXISTS update_payment_total_trigger ON public.delivery_items CASCADE;
DROP TRIGGER IF EXISTS sync_order_total_trigger ON public.delivery_items CASCADE;
DROP TRIGGER IF EXISTS trg_update_order_total ON public.delivery_items CASCADE;

-- Drop triggers on payments
DROP TRIGGER IF EXISTS update_balance_trigger ON public.payments CASCADE;
DROP TRIGGER IF EXISTS trg_update_balance_on_payment ON public.payments CASCADE;

-- Drop functions that might reference order_payment_records
SELECT '🗑️ Dropping functions that reference old payment tables...' as step;

DROP FUNCTION IF EXISTS public.create_order_payment_record() CASCADE;
DROP FUNCTION IF EXISTS public.update_order_payment_record() CASCADE;
DROP FUNCTION IF EXISTS public.sync_payment_record() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_order_payment() CASCADE;
DROP FUNCTION IF EXISTS public.update_payment_status_on_delivery() CASCADE;

-- Verify cleanup
SELECT '✅ Verifying trigger cleanup...' as step;

SELECT 
  '📊 Remaining triggers on core tables:' as info,
  event_object_table as table_name,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE event_object_table IN ('deliveries', 'delivery_items', 'return_items', 'payments')
  AND trigger_schema = 'public'
GROUP BY event_object_table;

COMMIT;

SELECT '🎉 ✅ TRIGGER CLEANUP COMPLETED! ✅ 🎉' as status;
SELECT 'Try creating an order now - it should work!' as next_step;
