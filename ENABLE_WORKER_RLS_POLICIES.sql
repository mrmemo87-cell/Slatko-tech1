-- ============================================================================
-- WORKER ACCESS CONTROL - DATABASE RLS POLICIES
-- ============================================================================
-- This SQL implements Row-Level Security to prevent workers from accessing
-- restricted data at the database level (not just UI level)
--
-- Workers should ONLY be able to:
-- - View/Update production-related tables
-- - View orders (for production context)
--
-- Workers should NOT be able to:
-- - Access products, clients, materials, inventory
-- - Create/edit/delete data in non-production tables
-- ============================================================================

-- Step 1: Enable RLS on all tables (if not already enabled)
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

-- ============================================================================
-- PRODUCTS TABLE - Workers cannot access
-- ============================================================================
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
CREATE POLICY "products_worker_deny" ON public.products
  AS RESTRICTIVE FOR ALL
  USING (
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- CLIENTS TABLE - Workers cannot access
-- ============================================================================
DROP POLICY IF EXISTS "clients_worker_deny" ON public.clients;
CREATE POLICY "clients_worker_deny" ON public.clients
  AS RESTRICTIVE FOR ALL
  USING (
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- MATERIALS TABLE - Workers cannot access
-- ============================================================================
DROP POLICY IF EXISTS "materials_worker_deny" ON public.materials;
CREATE POLICY "materials_worker_deny" ON public.materials
  AS RESTRICTIVE FOR ALL
  USING (
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- DELIVERIES TABLE - Workers cannot access
-- ============================================================================
DROP POLICY IF EXISTS "deliveries_worker_deny" ON public.deliveries;
CREATE POLICY "deliveries_worker_deny" ON public.deliveries
  AS RESTRICTIVE FOR ALL
  USING (
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- PAYMENTS TABLE - Workers cannot access
-- ============================================================================
DROP POLICY IF EXISTS "payments_worker_deny" ON public.payments;
CREATE POLICY "payments_worker_deny" ON public.payments
  AS RESTRICTIVE FOR ALL
  USING (
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- RETURN_ITEMS TABLE - Workers cannot access
-- ============================================================================
DROP POLICY IF EXISTS "return_items_worker_deny" ON public.return_items;
CREATE POLICY "return_items_worker_deny" ON public.return_items
  AS RESTRICTIVE FOR ALL
  USING (
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- PRODUCTION_BATCHES TABLE - Workers CAN access
-- ============================================================================
DROP POLICY IF EXISTS "production_batches_allow" ON public.production_batches;
CREATE POLICY "production_batches_allow" ON public.production_batches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "production_batches_update_allow" ON public.production_batches;
CREATE POLICY "production_batches_update_allow" ON public.production_batches
  FOR UPDATE USING (true);

-- ============================================================================
-- ORDERS TABLE - Workers can ONLY view (not edit/delete)
-- ============================================================================
DROP POLICY IF EXISTS "orders_select_allow" ON public.orders;
CREATE POLICY "orders_select_allow" ON public.orders
  FOR SELECT USING (true);

-- Deny workers from modifying orders
DROP POLICY IF EXISTS "orders_worker_modify_deny" ON public.orders;
CREATE POLICY "orders_worker_modify_deny" ON public.orders
  AS RESTRICTIVE FOR UPDATE, DELETE
  USING (
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- DELIVERY_ITEMS TABLE - Workers can READ only
-- ============================================================================
DROP POLICY IF EXISTS "delivery_items_select_allow" ON public.delivery_items;
CREATE POLICY "delivery_items_select_allow" ON public.delivery_items
  FOR SELECT USING (true);

-- Deny workers from modifying delivery items
DROP POLICY IF EXISTS "delivery_items_worker_modify_deny" ON public.delivery_items;
CREATE POLICY "delivery_items_worker_modify_deny" ON public.delivery_items
  AS RESTRICTIVE FOR UPDATE, INSERT, DELETE
  USING (
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- USERS TABLE - Workers cannot view other users
-- ============================================================================
DROP POLICY IF EXISTS "users_own_profile_only" ON public.users;
CREATE POLICY "users_own_profile_only" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR 
    auth.jwt() ->> 'role' NOT IN ('production', 'worker', 'production_worker', 'production_staff', 'production-role')
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all RLS policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Verify worker restrictions are in place
-- SELECT 
--   table_name,
--   policy_name,
--   roles,
--   qual AS using_expression
-- FROM information_schema.role_privilege_grants rpg
-- JOIN pg_policies pp ON pp.tablename = rpg.table_name
-- WHERE rpg.grantee IN ('authenticated', 'anon')
-- ORDER BY table_name;
