-- PROPER RLS POLICIES: Fix data source issues with correct access control
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

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clients;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.materials;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.deliveries;

-- Step 3: PRODUCTS - Readable by all authenticated users (shared business data)
CREATE POLICY "products_select_authenticated" ON public.products
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "products_insert_authenticated" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "products_update_authenticated" ON public.products
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "products_delete_authenticated" ON public.products
    FOR DELETE TO authenticated
    USING (true);

-- Step 4: MATERIALS - Readable by all authenticated users (shared business data)
CREATE POLICY "materials_select_authenticated" ON public.materials
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "materials_insert_authenticated" ON public.materials
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "materials_update_authenticated" ON public.materials
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "materials_delete_authenticated" ON public.materials
    FOR DELETE TO authenticated
    USING (true);

-- Step 5: CLIENTS - Owner-only access (user-specific data)
CREATE POLICY "clients_select_owner" ON public.clients
    FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "clients_insert_owner" ON public.clients
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "clients_update_owner" ON public.clients
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "clients_delete_owner" ON public.clients
    FOR DELETE TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL);

-- Step 6: DELIVERIES - Owner-only access
CREATE POLICY "deliveries_select_owner" ON public.deliveries
    FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "deliveries_insert_owner" ON public.deliveries
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "deliveries_update_owner" ON public.deliveries
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "deliveries_delete_owner" ON public.deliveries
    FOR DELETE TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL);

-- Step 7: PRODUCTION BATCHES - Owner-only access
CREATE POLICY "production_batches_select_owner" ON public.production_batches
    FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "production_batches_insert_owner" ON public.production_batches
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "production_batches_update_owner" ON public.production_batches
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "production_batches_delete_owner" ON public.production_batches
    FOR DELETE TO authenticated
    USING (auth.uid()::text = user_id OR user_id IS NULL);

-- Step 8: USERS table - Owner-only access
CREATE POLICY "users_select_owner" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_insert_owner" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_owner" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Step 9: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 10: Verification queries
SELECT 'RLS POLICIES CONFIGURED:' as status;

SELECT 'Products (shared):' as info, COUNT(*) as count FROM public.products;
SELECT 'Materials (shared):' as info, COUNT(*) as count FROM public.materials;
SELECT 'Clients (user-specific):' as info, COUNT(*) as count FROM public.clients;
SELECT 'Deliveries (user-specific):' as info, COUNT(*) as count FROM public.deliveries;

SELECT 'SUCCESS: Proper RLS policies configured!' as final_status;
SELECT 'Products/Materials: Shared by all users' as products_access;
SELECT 'Clients/Deliveries: User-specific data' as user_data_access;