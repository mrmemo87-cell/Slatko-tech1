-- ============================================================================
-- WORKER ACCESS CONTROL - DATABASE RLS POLICIES (CORRECTED VERSION)
-- ============================================================================
-- This SQL implements Row-Level Security to prevent workers from accessing
-- restricted data at the database level.
--
-- Uses public.users.role field which is the authoritative source
-- ============================================================================

-- Step 1: Enable RLS on critical tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
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
-- PRODUCTS TABLE - Workers CANNOT READ or MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
CREATE POLICY "products_worker_deny" ON public.products
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- CLIENTS TABLE - Workers CANNOT READ or MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "clients_worker_deny" ON public.clients;
CREATE POLICY "clients_worker_deny" ON public.clients
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- MATERIALS TABLE - Workers CANNOT READ or MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "materials_worker_deny" ON public.materials;
CREATE POLICY "materials_worker_deny" ON public.materials
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- DELIVERIES TABLE - Workers CANNOT READ or MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "deliveries_worker_deny" ON public.deliveries;
CREATE POLICY "deliveries_worker_deny" ON public.deliveries
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- PAYMENTS TABLE - Workers CANNOT READ or MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "payments_worker_deny" ON public.payments;
CREATE POLICY "payments_worker_deny" ON public.payments
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- RETURN_ITEMS TABLE - Workers CANNOT READ or MODIFY
-- ============================================================================
DROP POLICY IF EXISTS "return_items_worker_deny" ON public.return_items;
CREATE POLICY "return_items_worker_deny" ON public.return_items
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());

-- ============================================================================
-- PRODUCTION_BATCHES - Workers CAN access freely
-- ============================================================================
DROP POLICY IF EXISTS "production_batches_all_allow" ON public.production_batches;
CREATE POLICY "production_batches_all_allow" ON public.production_batches
  FOR ALL USING (true);

-- ============================================================================
-- VERIFICATION COMMANDS
-- ============================================================================

-- Run these to verify the setup:

-- 1. Check RLS is enabled on all tables
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN 
-- ('users', 'products', 'clients', 'materials', 'deliveries', 'payments', 'production_batches')
-- ORDER BY tablename;

-- 2. List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename != 'pg_stat_statements'
-- ORDER BY tablename, policyname;

-- 3. Test worker access (should fail):
-- SELECT * FROM public.products LIMIT 1;  -- When logged in as worker

-- 4. Test non-worker access (should succeed):
-- SELECT * FROM public.products LIMIT 1;  -- When logged in as manager/admin

-- 5. Test production_batches access (should succeed for all):
-- SELECT * FROM public.production_batches LIMIT 1;  -- Works for worker and non-worker
