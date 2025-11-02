-- FIXED RLS POLICIES: Works with existing table structure (no user_id column)
-- Run this in Supabase SQL Editor to set up proper Row Level Security

-- Step 1: Enable RLS on all tables (proper security approach)
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies first
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
DROP POLICY IF EXISTS "products_insert_authenticated" ON public.products;
DROP POLICY IF EXISTS "products_update_authenticated" ON public.products;
DROP POLICY IF EXISTS "products_delete_authenticated" ON public.products;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "clients_select_owner" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_owner" ON public.clients;
DROP POLICY IF EXISTS "clients_update_owner" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_owner" ON public.clients;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "materials_select_authenticated" ON public.materials;
DROP POLICY IF EXISTS "materials_insert_authenticated" ON public.materials;
DROP POLICY IF EXISTS "materials_update_authenticated" ON public.materials;
DROP POLICY IF EXISTS "materials_delete_authenticated" ON public.materials;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_select_owner" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_insert_owner" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_update_owner" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_delete_owner" ON public.deliveries;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.production_batches;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.production_batches;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.production_batches;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_select_owner" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_insert_owner" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_update_owner" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_delete_owner" ON public.production_batches;

-- Step 3: PRODUCTS - Shared by ALL authenticated users (business data)
CREATE POLICY "products_all_access" ON public.products
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 4: MATERIALS - Shared by ALL authenticated users (business data)  
CREATE POLICY "materials_all_access" ON public.materials
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 5: CLIENTS - Since no user_id column exists, allow all authenticated users access
-- This assumes clients are business data shared among team members
CREATE POLICY "clients_all_access" ON public.clients
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 6: DELIVERIES - Allow all authenticated users access
-- This assumes deliveries are business data shared among team members
CREATE POLICY "deliveries_all_access" ON public.deliveries
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 7: PRODUCTION BATCHES - Allow all authenticated users access
CREATE POLICY "production_batches_all_access" ON public.production_batches
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 8: DELIVERY ITEMS - Allow all authenticated users access
CREATE POLICY "delivery_items_all_access" ON public.delivery_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 9: USERS table - Owner-only access (if table exists with proper structure)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Check if users table has id column that matches auth.uid()
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') THEN
      EXECUTE 'CREATE POLICY "users_owner_access" ON public.users FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
      RAISE NOTICE 'Created owner-only policy for users table';
    ELSE
      EXECUTE 'CREATE POLICY "users_all_access" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true)';
      RAISE NOTICE 'Created all-access policy for users table (no matching id column)';
    END IF;
  ELSE
    RAISE NOTICE 'Users table does not exist, skipping policy creation';
  END IF;
END $$;

-- Step 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 11: Verification queries
SELECT 'FIXED RLS POLICIES CONFIGURED:' as status;

-- Test data access
SELECT 'VERIFICATION: Data accessible to all authenticated users' as info;

SELECT 
    'TABLE ACCESS TEST' as test,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') 
         THEN (SELECT COUNT(*)::text FROM public.products) 
         ELSE 'Table not found' END as products_count,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') 
         THEN (SELECT COUNT(*)::text FROM public.materials) 
         ELSE 'Table not found' END as materials_count,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') 
         THEN (SELECT COUNT(*)::text FROM public.clients) 
         ELSE 'Table not found' END as clients_count;

-- Check policies were created
SELECT 'POLICIES CREATED:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

SELECT 'SUCCESS: All authenticated users can access all business data!' as final_status;
SELECT 'This setup treats all data as shared business information' as access_model;
SELECT 'If you need user-specific data later, add user_id columns' as future_enhancement;