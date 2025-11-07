-- ============================================================================
-- COMPLETE RLS CLEANUP AND RESET
-- ============================================================================
-- This script:
-- 1. Drops ALL existing policies on all tables
-- 2. Disables RLS everywhere first
-- 3. Re-enables RLS ONLY on management tables
-- 4. Creates clean, simple policies
-- ============================================================================

-- Step 1: DROP ALL POLICIES on all tables (clean slate)
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
DROP POLICY IF EXISTS "products_admin_allow" ON public.products;
DROP POLICY IF EXISTS "products_deny_worker" ON public.products;

DROP POLICY IF EXISTS "clients_worker_deny" ON public.clients;
DROP POLICY IF EXISTS "clients_admin_allow" ON public.clients;
DROP POLICY IF EXISTS "clients_deny_worker" ON public.clients;

DROP POLICY IF EXISTS "materials_worker_deny" ON public.materials;
DROP POLICY IF EXISTS "materials_admin_allow" ON public.materials;
DROP POLICY IF EXISTS "materials_deny_worker" ON public.materials;

DROP POLICY IF EXISTS "return_items_worker_deny" ON public.return_items;
DROP POLICY IF EXISTS "return_items_admin_allow" ON public.return_items;
DROP POLICY IF EXISTS "return_items_deny_worker" ON public.return_items;

DROP POLICY IF EXISTS "deliveries_worker_read" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_worker_update" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_worker_insert_block" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_worker_delete_block" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_worker_select" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_worker_production_read" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_worker_production_update" ON public.deliveries;

DROP POLICY IF EXISTS "production_batches_worker_allow" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_worker_full_access" ON public.production_batches;

DROP POLICY IF EXISTS "delivery_items_worker_read" ON public.delivery_items;
DROP POLICY IF EXISTS "delivery_items_worker_update_block" ON public.delivery_items;
DROP POLICY IF EXISTS "delivery_items_worker_insert_block" ON public.delivery_items;
DROP POLICY IF EXISTS "delivery_items_worker_delete_block" ON public.delivery_items;
DROP POLICY IF EXISTS "delivery_items_worker_modify_deny" ON public.delivery_items;

DROP POLICY IF EXISTS "payments_worker_read" ON public.payments;
DROP POLICY IF EXISTS "payments_worker_update_block" ON public.payments;
DROP POLICY IF EXISTS "payments_worker_insert_block" ON public.payments;
DROP POLICY IF EXISTS "payments_worker_delete_block" ON public.payments;
DROP POLICY IF EXISTS "payments_worker_read_only" ON public.payments;
DROP POLICY IF EXISTS "payments_worker_modify_deny" ON public.payments;

DROP POLICY IF EXISTS "users_worker_read" ON public.users;
DROP POLICY IF EXISTS "users_worker_own_only" ON public.users;

-- Step 2: DISABLE RLS on ALL tables (clean slate)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items DISABLE ROW LEVEL SECURITY;

-- Step 3: Create helper function
CREATE OR REPLACE FUNCTION is_worker_role()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid())::text 
    ILIKE ANY(ARRAY['%worker%', '%production%']),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 4: NOW enable RLS ONLY on management tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- Step 5: Create SIMPLE, CLEAN policies - WORKERS CANNOT ACCESS AT ALL
-- Using RESTRICTIVE policies to make them very strict

-- PRODUCTS - Workers completely blocked
DROP POLICY IF EXISTS "products_only_non_workers" ON public.products;
CREATE POLICY "products_only_non_workers" ON public.products
  AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT is_worker_role());

-- CLIENTS - Workers completely blocked  
DROP POLICY IF EXISTS "clients_only_non_workers" ON public.clients;
CREATE POLICY "clients_only_non_workers" ON public.clients
  AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT is_worker_role());

-- MATERIALS - Workers completely blocked
DROP POLICY IF EXISTS "materials_only_non_workers" ON public.materials;
CREATE POLICY "materials_only_non_workers" ON public.materials
  AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT is_worker_role());

-- RETURN_ITEMS - Workers completely blocked
DROP POLICY IF EXISTS "return_items_only_non_workers" ON public.return_items;
CREATE POLICY "return_items_only_non_workers" ON public.return_items
  AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT is_worker_role());

-- ============================================================================
-- VERIFICATION QUERIES (run these to test)
-- ============================================================================

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check policies:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Test WORKER access:
-- SELECT * FROM public.products;           ❌ Should show: permission denied
-- SELECT * FROM public.clients;            ❌ Should show: permission denied
-- SELECT * FROM public.materials;          ❌ Should show: permission denied
-- SELECT COUNT(*) FROM public.deliveries;  ✅ Should show count (RLS disabled)

-- Test ADMIN access:
-- SELECT COUNT(*) FROM public.products;    ✅ Should show count
-- SELECT COUNT(*) FROM public.clients;     ✅ Should show count
