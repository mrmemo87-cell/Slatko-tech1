-- Temporary fix to disable RLS for testing authentication
-- Run this in Supabase SQL Editor if the policies don't work

-- TEMPORARY: Disable RLS on users table to test authentication
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- This will allow user creation during signup
-- Re-enable RLS later after confirming signup works:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'clients', 'materials');