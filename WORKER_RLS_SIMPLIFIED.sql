-- ============================================================================
-- WORKER ACCESS CONTROL - DATABASE RLS POLICIES (SIMPLIFIED)
-- ============================================================================
-- This SQL implements Row-Level Security that:
-- 1. Blocks workers from accessing management tables (products, clients, etc.)
-- 2. Allows workers to ONLY see production-stage orders
--
-- Workers CAN:
-- - View/Update deliveries in production stages (order_placed, production_queue, in_production, ready_for_delivery)
-- - Create/Update production_batches
-- - View delivery_items and payments
--
-- Workers CANNOT:
-- - View products, clients, materials, return_items
-- - Access deliveries in non-production stages
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
-- PRODUCTS TABLE - DENY all access to workers
-- ============================================================================
DROP POLICY IF EXISTS "products_deny_worker" ON public.products;
CREATE POLICY "products_deny_worker" ON public.products
  FOR ALL
  TO authenticated
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

-- ============================================================================
-- CLIENTS TABLE - DENY all access to workers
-- ============================================================================
DROP POLICY IF EXISTS "clients_deny_worker" ON public.clients;
CREATE POLICY "clients_deny_worker" ON public.clients
  FOR ALL
  TO authenticated
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

-- ============================================================================
-- MATERIALS TABLE - DENY all access to workers
-- ============================================================================
DROP POLICY IF EXISTS "materials_deny_worker" ON public.materials;
CREATE POLICY "materials_deny_worker" ON public.materials
  FOR ALL
  TO authenticated
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

-- ============================================================================
-- RETURN_ITEMS TABLE - DENY all access to workers
-- ============================================================================
DROP POLICY IF EXISTS "return_items_deny_worker" ON public.return_items;
CREATE POLICY "return_items_deny_worker" ON public.return_items
  FOR ALL
  TO authenticated
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

-- ============================================================================
-- DELIVERIES TABLE - Allow workers ONLY production-stage orders
-- ============================================================================

-- READ: Workers can see production-stage deliveries
DROP POLICY IF EXISTS "deliveries_worker_read" ON public.deliveries;
CREATE POLICY "deliveries_worker_read" ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    NOT is_worker_role()
    OR
    workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery')
  );

-- UPDATE: Workers can update only production-stage deliveries
DROP POLICY IF EXISTS "deliveries_worker_update" ON public.deliveries;
CREATE POLICY "deliveries_worker_update" ON public.deliveries
  FOR UPDATE
  TO authenticated
  USING (
    NOT is_worker_role()
    OR
    workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery')
  )
  WITH CHECK (
    NOT is_worker_role()
    OR
    workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery')
  );

-- INSERT: Block workers
DROP POLICY IF EXISTS "deliveries_worker_insert_block" ON public.deliveries;
CREATE POLICY "deliveries_worker_insert_block" ON public.deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_worker_role());

-- DELETE: Block workers
DROP POLICY IF EXISTS "deliveries_worker_delete_block" ON public.deliveries;
CREATE POLICY "deliveries_worker_delete_block" ON public.deliveries
  FOR DELETE
  TO authenticated
  USING (NOT is_worker_role());

-- ============================================================================
-- PAYMENTS TABLE - Workers can READ only
-- ============================================================================
DROP POLICY IF EXISTS "payments_worker_read" ON public.payments;
CREATE POLICY "payments_worker_read" ON public.payments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "payments_worker_update_block" ON public.payments;
CREATE POLICY "payments_worker_update_block" ON public.payments
  FOR UPDATE
  TO authenticated
  WITH CHECK (NOT is_worker_role());

DROP POLICY IF EXISTS "payments_worker_insert_block" ON public.payments;
CREATE POLICY "payments_worker_insert_block" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_worker_role());

DROP POLICY IF EXISTS "payments_worker_delete_block" ON public.payments;
CREATE POLICY "payments_worker_delete_block" ON public.payments
  FOR DELETE
  TO authenticated
  USING (NOT is_worker_role());

-- ============================================================================
-- DELIVERY_ITEMS TABLE - Workers can READ only
-- ============================================================================
DROP POLICY IF EXISTS "delivery_items_worker_read" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_read" ON public.delivery_items
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "delivery_items_worker_update_block" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_update_block" ON public.delivery_items
  FOR UPDATE
  TO authenticated
  WITH CHECK (NOT is_worker_role());

DROP POLICY IF EXISTS "delivery_items_worker_insert_block" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_insert_block" ON public.delivery_items
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_worker_role());

DROP POLICY IF EXISTS "delivery_items_worker_delete_block" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_delete_block" ON public.delivery_items
  FOR DELETE
  TO authenticated
  USING (NOT is_worker_role());

-- ============================================================================
-- PRODUCTION_BATCHES TABLE - Workers have FULL ACCESS
-- ============================================================================
DROP POLICY IF EXISTS "production_batches_worker_allow" ON public.production_batches;
CREATE POLICY "production_batches_worker_allow" ON public.production_batches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USERS TABLE - Workers can see only their own profile
-- ============================================================================
DROP POLICY IF EXISTS "users_worker_read" ON public.users;
CREATE POLICY "users_worker_read" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    NOT is_worker_role()
    OR
    auth_user_id = auth.uid()
  );

-- ============================================================================
-- QUICK TEST AFTER RUNNING THIS SQL
-- ============================================================================
-- As worker, run: SELECT COUNT(*) FROM deliveries WHERE workflow_stage IN ('order_placed', 'production_queue', 'in_production', 'ready_for_delivery');
-- Expected: Should show count of production orders
--
-- As worker, run: SELECT * FROM products;
-- Expected: permission denied error
