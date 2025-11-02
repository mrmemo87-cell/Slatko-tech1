-- Comprehensive RLS Fix for All Tables
-- This ensures all authenticated users can access all data
-- Run this in Supabase SQL Editor

-- OPTION 1: Disable RLS on all main tables (RECOMMENDED FOR NOW)
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items DISABLE ROW LEVEL SECURITY;

-- Keep RLS on users table for security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users table policies (keep these secure)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Allow user creation during signup" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Verify RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('products', 'clients', 'materials', 'deliveries', 'users')
ORDER BY tablename;