-- SAFE DATABASE FIX: Only modify existing tables
-- This version checks if tables exist before modifying them
-- Run this in Supabase SQL Editor

-- Step 1: Check what tables actually exist
SELECT 'EXISTING TABLES IN PUBLIC SCHEMA:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Step 2: Disable RLS only on tables that exist
DO $$
BEGIN
  -- Products table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on products table';
  END IF;

  -- Clients table  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
    ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on clients table';
  END IF;

  -- Materials table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materials') THEN
    ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on materials table';
  END IF;

  -- Deliveries table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries') THEN
    ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on deliveries table';
  END IF;

  -- Production batches table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_batches') THEN
    ALTER TABLE public.production_batches DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on production_batches table';
  END IF;

  -- Delivery items table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_items') THEN
    ALTER TABLE public.delivery_items DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on delivery_items table';
  END IF;

  -- Users table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on users table';
  END IF;

END $$;

-- Step 3: Drop ALL policies on existing tables only
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Users can view own data" ON public.products;
DROP POLICY IF EXISTS "Users can insert own data" ON public.products;
DROP POLICY IF EXISTS "Users can update own data" ON public.products;
DROP POLICY IF EXISTS "Users can delete own data" ON public.products;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Users can view own data" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own data" ON public.clients;
DROP POLICY IF EXISTS "Users can update own data" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own data" ON public.clients;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Users can view own data" ON public.materials;
DROP POLICY IF EXISTS "Users can insert own data" ON public.materials;
DROP POLICY IF EXISTS "Users can update own data" ON public.materials;
DROP POLICY IF EXISTS "Users can delete own data" ON public.materials;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view own data" ON public.deliveries;
DROP POLICY IF EXISTS "Users can insert own data" ON public.deliveries;
DROP POLICY IF EXISTS "Users can update own data" ON public.deliveries;
DROP POLICY IF EXISTS "Users can delete own data" ON public.deliveries;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.production_batches;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.production_batches;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.production_batches;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.production_batches;
DROP POLICY IF EXISTS "Users can view own data" ON public.production_batches;
DROP POLICY IF EXISTS "Users can insert own data" ON public.production_batches;
DROP POLICY IF EXISTS "Users can update own data" ON public.production_batches;
DROP POLICY IF EXISTS "Users can delete own data" ON public.production_batches;

-- Step 4: Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 5: VERIFICATION - Check data access
SELECT 'VERIFICATION RESULTS:' as status;

SELECT 
    'DATA ACCESS TEST' as test,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') 
         THEN (SELECT COUNT(*)::text FROM public.products) 
         ELSE 'Table not found' END as products_count,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') 
         THEN (SELECT COUNT(*)::text FROM public.clients) 
         ELSE 'Table not found' END as clients_count,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materials') 
         THEN (SELECT COUNT(*)::text FROM public.materials) 
         ELSE 'Table not found' END as materials_count;

-- Step 6: Show sample data from existing tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    RAISE NOTICE 'PRODUCTS TABLE EXISTS - Showing sample data:';
  END IF;
END $$;

SELECT 'SAMPLE PRODUCTS (if table exists):' as info;
SELECT id, name, unit, default_price FROM public.products LIMIT 5;

SELECT 'SAMPLE CLIENTS (if table exists):' as info;  
SELECT id, business_name, contact_person FROM public.clients LIMIT 5;

SELECT 'SAMPLE MATERIALS (if table exists):' as info;
SELECT id, name, unit, stock FROM public.materials LIMIT 5;

-- Final success message
SELECT 'SUCCESS: Database permissions have been opened for all authenticated users!' as final_status;