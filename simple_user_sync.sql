-- Simple User Sync Fix
-- Run this if you just want to sync existing users quickly

-- 1. Check current users
SELECT 'Auth Users Count: ' || COUNT(*) FROM auth.users;
SELECT 'Public Users Count: ' || COUNT(*) FROM public.users;

-- 2. Temporarily disable RLS for easier profile creation
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Create profiles for all auth users who don't have them
INSERT INTO public.users (auth_user_id, username, role, is_active)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
    'user' as role,
    true as is_active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
WHERE pu.auth_user_id IS NULL
ON CONFLICT (auth_user_id) DO NOTHING;

-- 4. Show synced users
SELECT 
    au.email as auth_email,
    pu.username as profile_username,
    pu.role,
    'SYNCED' as status
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.auth_user_id;

-- 5. Keep RLS disabled for now (we already disabled it for other tables)
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;