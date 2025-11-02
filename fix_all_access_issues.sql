-- URGENT: Fix all user access issues
-- This script completely opens up data access for all authenticated users
-- Run this immediately in Supabase SQL Editor

-- 1. DISABLE RLS on all business tables to allow shared access
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing restrictive policies
DROP POLICY IF EXISTS "Users can view own data" ON public.products;
DROP POLICY IF EXISTS "Users can insert own data" ON public.products;
DROP POLICY IF EXISTS "Users can update own data" ON public.products;
DROP POLICY IF EXISTS "Users can delete own data" ON public.products;

DROP POLICY IF EXISTS "Users can view own data" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own data" ON public.clients;
DROP POLICY IF EXISTS "Users can update own data" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own data" ON public.clients;

DROP POLICY IF EXISTS "Users can view own data" ON public.materials;
DROP POLICY IF EXISTS "Users can insert own data" ON public.materials;
DROP POLICY IF EXISTS "Users can update own data" ON public.materials;
DROP POLICY IF EXISTS "Users can delete own data" ON public.materials;

DROP POLICY IF EXISTS "Users can view own data" ON public.deliveries;
DROP POLICY IF EXISTS "Users can insert own data" ON public.deliveries;
DROP POLICY IF EXISTS "Users can update own data" ON public.deliveries;
DROP POLICY IF EXISTS "Users can delete own data" ON public.deliveries;

DROP POLICY IF EXISTS "Users can view own data" ON public.production_batches;
DROP POLICY IF EXISTS "Users can insert own data" ON public.production_batches;
DROP POLICY IF EXISTS "Users can update own data" ON public.production_batches;
DROP POLICY IF EXISTS "Users can delete own data" ON public.production_batches;

-- 3. Grant full access to authenticated users
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.clients TO authenticated;  
GRANT ALL ON public.materials TO authenticated;
GRANT ALL ON public.deliveries TO authenticated;
GRANT ALL ON public.production_batches TO authenticated;

-- 4. Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Verify data is accessible
SELECT 'PRODUCTS COUNT: ' || COUNT(*)::text FROM public.products;
SELECT 'CLIENTS COUNT: ' || COUNT(*)::text FROM public.clients;
SELECT 'MATERIALS COUNT: ' || COUNT(*)::text FROM public.materials;

-- 6. Test query as authenticated user would see it
SELECT 
    'DATA ACCESS TEST' as test,
    (SELECT COUNT(*) FROM public.products) as products_count,
    (SELECT COUNT(*) FROM public.clients) as clients_count,
    (SELECT COUNT(*) FROM public.materials) as materials_count;