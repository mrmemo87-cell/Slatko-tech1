-- Fix Row Level Security (RLS) for Products Table
-- Run this in Supabase SQL Editor to allow all authenticated users to access products

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'products';

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON public.products;
DROP POLICY IF EXISTS "Products are editable by authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.products;

-- Option 1: Disable RLS temporarily for products (QUICK FIX)
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, use these policies instead:
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- 
-- -- Allow all authenticated users to read products
-- CREATE POLICY "Enable read access for all authenticated users" ON public.products
--   FOR SELECT USING (auth.role() = 'authenticated');
-- 
-- -- Allow all authenticated users to modify products
-- CREATE POLICY "Enable write access for authenticated users" ON public.products
--   FOR ALL USING (auth.role() = 'authenticated');

-- Verify products are accessible
SELECT COUNT(*) as total_products FROM public.products;
SELECT name, price FROM public.products LIMIT 5;