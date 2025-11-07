-- Quick diagnostic script to check authentication setup
-- Run this in Supabase SQL Editor to diagnose sign-in issues

-- 1. Check if users table exists and has RLS enabled
SELECT 
    'users table' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') as rls_enabled;

-- 2. Check if user_roles table exists and has RLS enabled
SELECT 
    'user_roles table' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') as rls_enabled;

-- 3. List all RLS policies on users table
SELECT 
    'users policies' as check_name,
    policyname,
    cmd as command,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- 4. List all RLS policies on user_roles table
SELECT 
    'user_roles policies' as check_name,
    policyname,
    cmd as command,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'user_roles';

-- 5. Count users in auth.users (Supabase Auth)
SELECT 
    'auth.users' as check_name,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
    COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as unconfirmed_users
FROM auth.users;

-- 6. Count users in public.users
SELECT 
    'public.users' as check_name,
    COUNT(*) as count,
    COUNT(DISTINCT role) as distinct_roles,
    string_agg(DISTINCT role::text, ', ') as roles_present
FROM public.users;

-- 7. Check for orphaned auth users (in auth.users but not in public.users)
SELECT 
    'orphaned auth users' as check_name,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
WHERE pu.id IS NULL;

-- 8. Sample of recent auth users
SELECT 
    'recent auth users' as check_name,
    au.email,
    au.email_confirmed_at IS NOT NULL as confirmed,
    pu.username,
    pu.role,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
ORDER BY au.created_at DESC
LIMIT 5;

-- 9. Check if there are any test/demo accounts
SELECT 
    'test accounts' as check_name,
    au.email,
    pu.role,
    pu.username
FROM auth.users au
JOIN public.users pu ON au.id = pu.auth_user_id
WHERE au.email ILIKE '%test%' 
   OR au.email ILIKE '%demo%'
   OR pu.username ILIKE '%test%'
   OR pu.username ILIKE '%demo%';
