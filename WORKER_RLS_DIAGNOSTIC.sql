-- ============================================================================
-- DIAGNOSTIC SCRIPT - Check what the worker can access
-- ============================================================================

-- Step 1: Check if RLS is enabled
SELECT tablename, 
       (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Step 2: Check all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Step 3: Check deliveries in production stages
SELECT workflow_stage, COUNT(*) as order_count
FROM public.deliveries
GROUP BY workflow_stage
ORDER BY workflow_stage;

-- Step 4: Try to count deliveries as current user
SELECT COUNT(*) as total_deliveries FROM public.deliveries;

-- Step 5: Try to count production-stage deliveries
SELECT COUNT(*) as production_deliveries 
FROM public.deliveries 
WHERE workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery');

-- Step 6: Check if worker function works
SELECT is_worker_role() as is_current_user_worker;

-- Step 7: Check current user role
SELECT role FROM public.users WHERE auth_user_id = auth.uid();
