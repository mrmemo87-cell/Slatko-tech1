-- Debug: Check the actual database state
-- Run this to see what's really in the database

-- 1. Check auth.users table
SELECT 
    'auth.users' as source,
    email,
    raw_user_meta_data,
    id as auth_id
FROM auth.users
WHERE email IN ('mr.memo87@gmail.com', 'aigerim@slatko.asia')
ORDER BY email;

-- 2. Check public.users table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check what's actually in public.users
SELECT 
    'public.users' as source,
    id,
    username,
    role,
    auth_user_id,
    is_active,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 4. Try to join them
SELECT 
    'joined data' as source,
    au.email,
    au.id as auth_id,
    pu.id as user_id,
    pu.username,
    pu.role,
    pu.auth_user_id,
    CASE 
        WHEN pu.id IS NULL THEN '❌ NO ROW in public.users'
        WHEN pu.auth_user_id IS NULL THEN '❌ auth_user_id is NULL'
        WHEN pu.auth_user_id != au.id THEN '❌ auth_user_id MISMATCH'
        ELSE '✅ Properly linked'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
WHERE au.email IN ('mr.memo87@gmail.com', 'aigerim@slatko.asia')
ORDER BY au.email;
