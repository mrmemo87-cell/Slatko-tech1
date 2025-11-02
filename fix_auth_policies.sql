-- Authentication and RLS Policies Fix
-- Run this in Supabase SQL Editor to fix authentication issues

-- First, let's check if RLS is enabled on the users table and fix policies

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Policy: Allow users to update their own profile  
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Policy: Allow user creation during signup (this is crucial for registration)
CREATE POLICY "Allow user creation during signup" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Alternatively, if the above doesn't work, you can temporarily disable RLS for testing
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Make sure the auth schema is properly set up
-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- Grant permissions to anon users for sign up
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON public.users TO anon;

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- Check if email confirmation is required
SELECT * FROM auth.users LIMIT 5;