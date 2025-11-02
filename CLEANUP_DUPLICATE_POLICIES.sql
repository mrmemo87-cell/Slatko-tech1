-- CLEAN UP DUPLICATE POLICIES: Fix clients table access issue
-- Run this in Supabase SQL Editor to remove duplicate policies and ensure proper access

-- Step 1: Drop ALL existing policies to start fresh
-- CLIENTS table cleanup
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON public.clients;
DROP POLICY IF EXISTS "clients_all_access" ON public.clients;

-- DELIVERIES table cleanup
DROP POLICY IF EXISTS "Authenticated users can insert deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Authenticated users can update deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Authenticated users can view all deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_all_access" ON public.deliveries;

-- DELIVERY_ITEMS table cleanup
DROP POLICY IF EXISTS "Authenticated users can access delivery_items" ON public.delivery_items;
DROP POLICY IF EXISTS "delivery_items_all_access" ON public.delivery_items;

-- MATERIALS table cleanup
DROP POLICY IF EXISTS "Authenticated users can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can update materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can view all materials" ON public.materials;
DROP POLICY IF EXISTS "materials_all_access" ON public.materials;

-- PRODUCTS table cleanup
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view all products" ON public.products;
DROP POLICY IF EXISTS "products_all_access" ON public.products;

-- PRODUCTION_BATCHES table cleanup
DROP POLICY IF EXISTS "Authenticated users can access production_batches" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_all_access" ON public.production_batches;

-- USERS table cleanup (keep only proper owner access)
DROP POLICY IF EXISTS "Authenticated users can access users" ON public.users;
DROP POLICY IF EXISTS "users_owner_access" ON public.users;

-- Step 2: Create ONE clear policy per table - no conflicts

-- CLIENTS - Full access for all authenticated users
CREATE POLICY "clients_authenticated_access" ON public.clients
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELIVERIES - Full access for all authenticated users
CREATE POLICY "deliveries_authenticated_access" ON public.deliveries
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELIVERY_ITEMS - Full access for all authenticated users
CREATE POLICY "delivery_items_authenticated_access" ON public.delivery_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- MATERIALS - Full access for all authenticated users
CREATE POLICY "materials_authenticated_access" ON public.materials
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- PRODUCTS - Full access for all authenticated users
CREATE POLICY "products_authenticated_access" ON public.products
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- PRODUCTION_BATCHES - Full access for all authenticated users
CREATE POLICY "production_batches_authenticated_access" ON public.production_batches
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- USERS - Owner-only access (proper user isolation)
CREATE POLICY "users_own_profile_access" ON public.users
    FOR ALL TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Step 3: Ensure all tables have RLS enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Grant necessary permissions (critical for data access)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 5: Test clients table access specifically
SELECT 'TESTING CLIENTS ACCESS:' as test;

-- This should work now
SELECT COUNT(*) as clients_count FROM public.clients;

-- Show sample client data (if any exists)
SELECT 'SAMPLE CLIENTS DATA:' as info;
SELECT * FROM public.clients LIMIT 3;

-- Step 6: Verify all policies are clean
SELECT 'FINAL POLICY STATUS:' as status;
SELECT 
    schemaname,
    tablename, 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'deliveries', 'materials', 'products', 'production_batches', 'users')
ORDER BY tablename, policyname;

-- Step 7: Final verification
SELECT 'ACCESS VERIFICATION:' as verification;
SELECT 
    'clients' as table_name,
    COUNT(*) as record_count,
    'accessible' as status
FROM public.clients
UNION ALL
SELECT 
    'products' as table_name,
    COUNT(*) as record_count,
    'accessible' as status
FROM public.products
UNION ALL
SELECT 
    'materials' as table_name,
    COUNT(*) as record_count,
    'accessible' as status
FROM public.materials;

SELECT 'SUCCESS: Duplicate policies removed - clients table should be accessible now!' as final_status;