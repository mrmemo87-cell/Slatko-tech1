-- ============================================================================
-- WORKER ACCESS CONTROL - COMPLETE RESET AND SIMPLIFICATION
-- ============================================================================
-- This approach:
-- 1. Disables RLS on data tables (deliveries, production_batches, delivery_items, payments)
-- 2. Keeps RLS ENABLED on management tables (products, clients, materials, return_items)
-- 3. Uses simple DENY policies for blocked management tables only
-- 4. Relies on frontend role checking for production stage filtering
-- ============================================================================

-- Step 1: DISABLE RLS on data tables (workers need full read access to filter themselves)
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: ENABLE RLS on management tables only
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

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
-- MANAGEMENT TABLES - DENY all access to workers using simple policies
-- ============================================================================

-- PRODUCTS: Only non-workers can access
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
CREATE POLICY "products_worker_deny" ON public.products
  FOR SELECT
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "products_admin_allow" ON public.products;
CREATE POLICY "products_admin_allow" ON public.products
  FOR ALL
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

-- CLIENTS: Only non-workers can access
DROP POLICY IF EXISTS "clients_worker_deny" ON public.clients;
CREATE POLICY "clients_worker_deny" ON public.clients
  FOR SELECT
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "clients_admin_allow" ON public.clients;
CREATE POLICY "clients_admin_allow" ON public.clients
  FOR ALL
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

-- MATERIALS: Only non-workers can access
DROP POLICY IF EXISTS "materials_worker_deny" ON public.materials;
CREATE POLICY "materials_worker_deny" ON public.materials
  FOR SELECT
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "materials_admin_allow" ON public.materials;
CREATE POLICY "materials_admin_allow" ON public.materials
  FOR ALL
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

-- RETURN_ITEMS: Only non-workers can access
DROP POLICY IF EXISTS "return_items_worker_deny" ON public.return_items;
CREATE POLICY "return_items_worker_deny" ON public.return_items
  FOR SELECT
  USING (NOT is_worker_role());

DROP POLICY IF EXISTS "return_items_admin_allow" ON public.return_items;
CREATE POLICY "return_items_admin_allow" ON public.return_items
  FOR ALL
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check current RLS status:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Test as WORKER:
-- SELECT COUNT(*) FROM public.deliveries;                    ✅ Should show count
-- SELECT COUNT(*) FROM public.production_batches;            ✅ Should show count
-- SELECT COUNT(*) FROM public.delivery_items;                ✅ Should show count
-- SELECT * FROM public.products LIMIT 1;                     ❌ Should fail (permission denied)

-- Test as ADMIN:
-- SELECT COUNT(*) FROM public.deliveries;                    ✅ Should show count
-- SELECT COUNT(*) FROM public.products;                      ✅ Should show count
-- SELECT COUNT(*) FROM public.clients;                       ✅ Should show count
