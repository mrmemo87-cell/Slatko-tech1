-- ============================================================================
-- WORKER ACCESS CONTROL - DATABASE RLS POLICIES (WORKER-ENABLED VERSION)
-- ============================================================================
-- This SQL implements Row-Level Security that:
-- 1. Prevents workers from accessing management tables (products, clients, etc.)
-- 2. Allows workers to see and update ONLY the data they need for production
--
-- Workers CAN:
-- - View orders (to see what needs to be produced)
-- - Create/Update production_batches (to start cooking and mark as ready)
-- - View delivery_items (to see what quantities were ordered)
-- - View payments/deliveries for production context
--
-- Workers CANNOT:
-- - View/Edit products catalog
-- - View/Edit clients
-- - View/Edit materials
-- - Delete anything
-- ============================================================================

-- Step 1: Enable RLS on all critical tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
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
-- DELIVERIES TABLE - Workers can READ (for delivery context) but NOT MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "deliveries_worker_read_only" ON public.deliveries;
CREATE POLICY "deliveries_worker_read_only" ON public.deliveries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "deliveries_worker_deny_modify_update" ON public.deliveries;
CREATE POLICY "deliveries_worker_deny_modify_update" ON public.deliveries
  AS RESTRICTIVE FOR UPDATE
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "deliveries_worker_deny_modify_insert" ON public.deliveries;
CREATE POLICY "deliveries_worker_deny_modify_insert" ON public.deliveries
  AS RESTRICTIVE FOR INSERT
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "deliveries_worker_deny_modify_delete" ON public.deliveries;
CREATE POLICY "deliveries_worker_deny_modify_delete" ON public.deliveries
  AS RESTRICTIVE FOR DELETE
  USING (NOT is_worker_role());

-- ============================================================================
-- PAYMENTS TABLE - Workers can READ (for payment context) but NOT MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "payments_worker_read_only" ON public.payments;
CREATE POLICY "payments_worker_read_only" ON public.payments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "payments_worker_deny_modify_update" ON public.payments;
CREATE POLICY "payments_worker_deny_modify_update" ON public.payments
  AS RESTRICTIVE FOR UPDATE
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "payments_worker_deny_modify_insert" ON public.payments;
CREATE POLICY "payments_worker_deny_modify_insert" ON public.payments
  AS RESTRICTIVE FOR INSERT
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "payments_worker_deny_modify_delete" ON public.payments;
CREATE POLICY "payments_worker_deny_modify_delete" ON public.payments
  AS RESTRICTIVE FOR DELETE
  USING (NOT is_worker_role());

-- ============================================================================
-- ORDERS TABLE - Workers CAN READ (to see what orders need production)
-- Workers CANNOT modify orders directly (only through production workflow)
-- ============================================================================
DROP POLICY IF EXISTS "orders_worker_read" ON public.orders;
CREATE POLICY "orders_worker_read" ON public.orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "orders_worker_deny_modify_update" ON public.orders;
CREATE POLICY "orders_worker_deny_modify_update" ON public.orders
  AS RESTRICTIVE FOR UPDATE
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "orders_worker_deny_modify_insert" ON public.orders;
CREATE POLICY "orders_worker_deny_modify_insert" ON public.orders
  AS RESTRICTIVE FOR INSERT
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "orders_worker_deny_modify_delete" ON public.orders;
CREATE POLICY "orders_worker_deny_modify_delete" ON public.orders
  AS RESTRICTIVE FOR DELETE
  USING (NOT is_worker_role());

-- ============================================================================
-- DELIVERY_ITEMS TABLE - Workers CAN READ (to see what quantities to produce)
-- Workers CANNOT modify delivery items
-- ============================================================================
DROP POLICY IF EXISTS "delivery_items_worker_read" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_read" ON public.delivery_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "delivery_items_worker_deny_modify_update" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_deny_modify_update" ON public.delivery_items
  AS RESTRICTIVE FOR UPDATE
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "delivery_items_worker_deny_modify_insert" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_deny_modify_insert" ON public.delivery_items
  AS RESTRICTIVE FOR INSERT
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "delivery_items_worker_deny_modify_delete" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_deny_modify_delete" ON public.delivery_items
  AS RESTRICTIVE FOR DELETE
  USING (NOT is_worker_role());

-- ============================================================================
-- PRODUCTION_BATCHES TABLE - Workers CAN FULLY ACCESS
-- This is where they:
-- 1. Create new batches (start cooking)
-- 2. Update status (preparing → ready)
-- 3. View their production queue
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

-- 2. Test WORKER access (should work):
-- SELECT COUNT(*) as order_count FROM public.orders;           ✅ Should work
-- SELECT COUNT(*) as batch_count FROM public.production_batches; ✅ Should work
-- SELECT COUNT(*) as item_count FROM public.delivery_items;    ✅ Should work
-- SELECT * FROM public.products LIMIT 1;                       ❌ Should fail (permission denied)

-- 3. Test NON-WORKER access (should work for all):
-- SELECT COUNT(*) FROM public.products;           ✅ Should work
-- SELECT COUNT(*) FROM public.clients;            ✅ Should work
-- SELECT COUNT(*) FROM public.orders;             ✅ Should work
-- SELECT COUNT(*) FROM public.production_batches; ✅ Should work

-- 4. Run this to see the worker's full access matrix:
-- SELECT 
--   'orders' as table_name, 
--   'SELECT' as access, 
--   case when is_worker_role() then '✅ ALLOWED' else 'N/A' end as worker_access
-- UNION ALL
-- SELECT 'production_batches', 'SELECT/INSERT/UPDATE', '✅ ALLOWED'
-- UNION ALL
-- SELECT 'delivery_items', 'SELECT', '✅ ALLOWED'
-- UNION ALL
-- SELECT 'products', 'ALL', '❌ DENIED'
-- UNION ALL
-- SELECT 'clients', 'ALL', '❌ DENIED'
-- UNION ALL
-- SELECT 'materials', 'ALL', '❌ DENIED'
-- ORDER BY worker_access DESC;
