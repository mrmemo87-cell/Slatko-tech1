-- DATABASE FORCE LOAD: Execute this IMMEDIATELY in Supabase SQL Editor
-- This will ensure ALL USERS see the database data, not localStorage

-- Step 1: Show what's currently in the database
SELECT 'CURRENT DATABASE STATE:' as info;
SELECT 'Products in database:' as table_name, COUNT(*) as count FROM public.products;
SELECT 'Clients in database:' as table_name, COUNT(*) as count FROM public.clients;
SELECT 'Materials in database:' as table_name, COUNT(*) as count FROM public.materials;

-- Step 2: NUCLEAR DATABASE ACCESS - Remove ALL restrictions
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.production_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL policies that might be blocking access
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

-- Step 4: Grant MAXIMUM permissions
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 5: VERIFICATION - Show the data users will see
SELECT 'VERIFICATION: Data that ALL users will now see:' as status;

SELECT 'ALL PRODUCTS:' as table_info;
SELECT * FROM public.products ORDER BY id LIMIT 10;

SELECT 'ALL CLIENTS:' as table_info;
SELECT * FROM public.clients ORDER BY id LIMIT 10;

SELECT 'ALL MATERIALS:' as table_info;
SELECT * FROM public.materials ORDER BY id LIMIT 10;

-- Final confirmation
SELECT 
    'DATABASE ACCESS STATUS' as status,
    'FULLY OPEN - All users can see all data' as access_level,
    'No localStorage confusion anymore' as localStorage_status,
    'Execute this script NOW!' as action_required;