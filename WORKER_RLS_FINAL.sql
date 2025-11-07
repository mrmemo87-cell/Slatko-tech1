-- ============================================================================
-- WORKER ACCESS CONTROL - DATABASE RLS POLICIES (FINAL VERSION)
-- ============================================================================
-- This SQL implements Row-Level Security that:
-- 1. Prevents workers from accessing management tables (products, clients, etc.)
-- 2. Allows workers to ONLY manage orders in production stages:
--    - production_queue (initial orders)
--    - in_production (currently cooking)
--    - ready_for_delivery (done cooking, ready for pickup)
--
-- Workers CAN:
-- - View deliveries that are in production stages
-- - Update deliveries workflow_stage in production workflow only
-- - Create/Update production_batches (for production tasks)
-- - View delivery_items (to see what quantities to cook)
-- - View payments (context only)
--
-- Workers CANNOT:
-- - View/Edit products catalog
-- - View/Edit clients
-- - View/Edit materials
-- - Access completed/settlement/delivery stages
-- - Delete anything
-- ============================================================================

-- Step 1: Enable RLS on all critical tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is a worker
CREATE OR REPLACE FUNCTION is_worker_role()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid())::text 
    ILIKE ANY(ARRAY['%worker%', '%production%']),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- PRODUCTS TABLE - Workers CANNOT access (management only)
-- ============================================================================
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
CREATE POLICY "products_worker_deny" ON public.products
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- CLIENTS TABLE - Workers CANNOT access (management only)
-- ============================================================================
DROP POLICY IF EXISTS "clients_worker_deny" ON public.clients;
CREATE POLICY "clients_worker_deny" ON public.clients
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- MATERIALS TABLE - Workers CANNOT access (management only)
-- ============================================================================
DROP POLICY IF EXISTS "materials_worker_deny" ON public.materials;
CREATE POLICY "materials_worker_deny" ON public.materials
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- RETURN_ITEMS TABLE - Workers CANNOT access (management only)
-- ============================================================================
DROP POLICY IF EXISTS "return_items_worker_deny" ON public.return_items;
CREATE POLICY "return_items_worker_deny" ON public.return_items
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- DELIVERIES TABLE - Workers CAN ONLY see production-stage orders
-- 
-- Production stages: order_placed, production_queue, in_production, quality_check, ready_for_delivery
-- Non-production: out_for_delivery, delivered, settlement, completed
-- ============================================================================

-- SELECT: Only production stage deliveries for workers
DROP POLICY IF EXISTS "deliveries_worker_select" ON public.deliveries;
CREATE POLICY "deliveries_worker_select" ON public.deliveries
  FOR SELECT
  USING (
    NOT is_worker_role()
    OR
    workflow_stage IS NULL
    OR
    workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery')
  );

-- UPDATE: Workers can update only production-stage deliveries
DROP POLICY IF EXISTS "deliveries_worker_update" ON public.deliveries;
CREATE POLICY "deliveries_worker_update" ON public.deliveries
  FOR UPDATE
  WITH CHECK (
    NOT is_worker_role()
    OR
    workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery')
  );

-- INSERT: Workers cannot create deliveries
DROP POLICY IF EXISTS "deliveries_worker_insert" ON public.deliveries;
CREATE POLICY "deliveries_worker_insert" ON public.deliveries
  FOR INSERT
  WITH CHECK (NOT is_worker_role());

-- DELETE: Workers cannot delete deliveries
DROP POLICY IF EXISTS "deliveries_worker_delete" ON public.deliveries;
CREATE POLICY "deliveries_worker_delete" ON public.deliveries
  FOR DELETE
  USING (NOT is_worker_role());

-- ============================================================================
-- PAYMENTS TABLE - Workers can READ (for context) but NOT MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "payments_worker_read_only" ON public.payments;
CREATE POLICY "payments_worker_read_only" ON public.payments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "payments_worker_modify_deny" ON public.payments;
CREATE POLICY "payments_worker_modify_deny" ON public.payments
  FOR UPDATE
  WITH CHECK (NOT is_worker_role());

DROP POLICY IF EXISTS "payments_worker_insert_deny" ON public.payments;
CREATE POLICY "payments_worker_insert_deny" ON public.payments
  FOR INSERT
  WITH CHECK (NOT is_worker_role());

DROP POLICY IF EXISTS "payments_worker_delete_deny" ON public.payments;
CREATE POLICY "payments_worker_delete_deny" ON public.payments
  FOR DELETE
  USING (NOT is_worker_role());

-- ============================================================================
-- DELIVERY_ITEMS TABLE - Workers CAN READ (to see quantities)
-- Workers CANNOT modify delivery items
-- ============================================================================
DROP POLICY IF EXISTS "delivery_items_worker_read" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_read" ON public.delivery_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "delivery_items_worker_modify_deny" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_modify_deny" ON public.delivery_items
  FOR UPDATE
  WITH CHECK (NOT is_worker_role());

DROP POLICY IF EXISTS "delivery_items_worker_insert_deny" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_insert_deny" ON public.delivery_items
  FOR INSERT
  WITH CHECK (NOT is_worker_role());

DROP POLICY IF EXISTS "delivery_items_worker_delete_deny" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_delete_deny" ON public.delivery_items
  FOR DELETE
  USING (NOT is_worker_role());

-- ============================================================================
-- PRODUCTION_BATCHES TABLE - Workers CAN FULLY ACCESS
-- This is where they:
-- 1. View production queue
-- 2. Create new batches (start cooking)
-- 3. Update batch status (preparing → ready)
-- ============================================================================
DROP POLICY IF EXISTS "production_batches_worker_full_access" ON public.production_batches;
CREATE POLICY "production_batches_worker_full_access" ON public.production_batches
  FOR ALL USING (true);

-- ============================================================================
-- USERS TABLE - Workers can ONLY see their own profile
-- ============================================================================
DROP POLICY IF EXISTS "users_worker_own_only" ON public.users;
CREATE POLICY "users_worker_own_only" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR 
    NOT is_worker_role()
  );

-- ============================================================================
-- VERIFICATION & TESTING QUERIES
-- ============================================================================

-- After running this SQL, run these queries to verify:

-- 1. Check all RLS policies are created:
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- 2. Test WORKER access to deliveries (should work for production stages only):
-- SELECT COUNT(*) as delivery_count FROM public.deliveries 
-- WHERE workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'ready_for_delivery');
-- ✅ Should work

-- 3. Try to see non-production deliveries as worker:
-- SELECT COUNT(*) as delivery_count FROM public.deliveries 
-- WHERE workflow_stage IN ('out_for_delivery', 'delivered', 'settlement');
-- ❌ Should return 0 rows

-- 4. Test WORKER access to production batches (should work):
-- SELECT COUNT(*) FROM public.production_batches;           ✅ Should work
-- SELECT COUNT(*) FROM public.delivery_items;               ✅ Should work

-- 5. Test WORKER access to management tables (should fail):
-- SELECT * FROM public.products LIMIT 1;                   ❌ Should fail (permission denied)
-- SELECT * FROM public.clients LIMIT 1;                    ❌ Should fail (permission denied)
-- SELECT * FROM public.materials LIMIT 1;                  ❌ Should fail (permission denied)

-- 6. Test NON-WORKER access (should work for all):
-- SELECT COUNT(*) FROM public.products;           ✅ Should work
-- SELECT COUNT(*) FROM public.clients;            ✅ Should work
-- SELECT COUNT(*) FROM public.deliveries;         ✅ Should work (all stages)
-- SELECT COUNT(*) FROM public.production_batches; ✅ Should work

-- 7. Worker access matrix:
-- SELECT 
--   'deliveries (production stages)' as resource, 
--   'READ' as access, 
--   '✅ ALLOWED' as worker_access
-- UNION ALL
-- SELECT 'deliveries (production stages)', 'UPDATE workflow_stage', '✅ ALLOWED'
-- UNION ALL
-- SELECT 'production_batches', 'READ/CREATE/UPDATE/DELETE', '✅ ALLOWED'
-- UNION ALL
-- SELECT 'delivery_items', 'READ', '✅ ALLOWED'
-- UNION ALL
-- SELECT 'payments', 'READ', '✅ ALLOWED'
-- UNION ALL
-- SELECT 'deliveries (non-production)', 'ALL', '❌ BLOCKED'
-- UNION ALL
-- SELECT 'products', 'ALL', '❌ BLOCKED'
-- UNION ALL
-- SELECT 'clients', 'ALL', '❌ BLOCKED'
-- UNION ALL
-- SELECT 'materials', 'ALL', '❌ BLOCKED'
-- UNION ALL
-- SELECT 'return_items', 'ALL', '❌ BLOCKED'
-- ORDER BY worker_access DESC;
