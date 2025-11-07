-- ============================================================================
-- WORKER ACCESS CONTROL - FINAL FIX
-- ============================================================================
-- CRITICAL: The users table MUST have RLS disabled so auth can read it
-- Only management tables get RLS enabled
-- ============================================================================

-- Step 1: Clean slate - drop ALL policies everywhere
DROP POLICY IF EXISTS "products_only_non_workers" ON public.products;
DROP POLICY IF EXISTS "clients_only_non_workers" ON public.clients;
DROP POLICY IF EXISTS "materials_only_non_workers" ON public.materials;
DROP POLICY IF EXISTS "return_items_only_non_workers" ON public.return_items;

-- Drop all other lingering policies
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
DROP POLICY IF EXISTS "clients_worker_deny" ON public.clients;
DROP POLICY IF EXISTS "materials_worker_deny" ON public.materials;
DROP POLICY IF EXISTS "return_items_worker_deny" ON public.return_items;

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

-- ============================================================================
-- Step 4: Enable RLS ONLY on management tables
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 5: Create policies - Workers CANNOT access management tables
-- ============================================================================

-- PRODUCTS - Only non-workers can access
CREATE POLICY "products_only_non_workers" ON public.products
  AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT is_worker_role());

-- CLIENTS - Only non-workers can access
CREATE POLICY "clients_only_non_workers" ON public.clients
  AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT is_worker_role());

-- MATERIALS - Only non-workers can access
CREATE POLICY "materials_only_non_workers" ON public.materials
  AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT is_worker_role());

-- RETURN_ITEMS - Only non-workers can access
CREATE POLICY "return_items_only_non_workers" ON public.return_items
  AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT is_worker_role());

-- ============================================================================
-- Verification: Check RLS status
-- ============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- 
-- Expected output:
-- clients          | t (TRUE - RLS enabled)
-- deliveries       | f (FALSE - RLS disabled)
-- materials        | t (TRUE - RLS enabled)
-- payments         | f (FALSE - RLS disabled)
-- products         | t (TRUE - RLS enabled)
-- production_batches | f (FALSE - RLS disabled)
-- return_items     | t (TRUE - RLS enabled)
-- users            | f (FALSE - RLS disabled) *** CRITICAL ***
--
-- If users has rowsecurity = t, the profile query will fail!
