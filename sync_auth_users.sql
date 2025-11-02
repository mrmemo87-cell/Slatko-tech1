-- Fix User Sync: Sync auth.users with public.users table
-- Run this in Supabase SQL Editor

-- 1. First, let's see the current state
SELECT 'AUTH USERS:' as table_type, id, email, created_at FROM auth.users
UNION ALL
SELECT 'PUBLIC USERS:', auth_user_id::text, username, created_at::text FROM public.users
ORDER BY created_at;

-- 2. Create missing profiles for existing auth users
INSERT INTO public.users (auth_user_id, username, role, is_active)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
    'user' as role,
    true as is_active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
WHERE pu.auth_user_id IS NULL;

-- 3. Create a function to automatically create profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, username, role, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'user',
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a trigger to automatically sync new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Make sure RLS allows profile creation
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Enable automatic profile creation" ON public.users;

-- Create new policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Allow service role and triggers to create profiles
CREATE POLICY "Enable automatic profile creation" ON public.users
  FOR INSERT WITH CHECK (true);

-- 6. Verify the sync worked
SELECT 
    'SYNCED USERS' as status,
    COUNT(*) as count
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.auth_user_id;

-- 7. Show final user list
SELECT 
    au.email,
    pu.username,
    pu.role,
    pu.is_active,
    pu.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
ORDER BY pu.created_at;