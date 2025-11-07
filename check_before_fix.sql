-- Quick check: What tables do we have and what's their structure?
-- Run this BEFORE fix_signin_rls.sql to understand the database state

-- 1. Check if key tables exist
SELECT 
    'Table exists check' as check_type,
    tablename,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND pg_tables.tablename = t.tablename)
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES ('users'), ('user_roles'), ('products'), ('clients')) AS t(tablename);

-- 2. Check users table structure
SELECT 
    'users table columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check RLS status on users table
SELECT 
    'users RLS status' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 4. Check existing RLS policies on users table
SELECT 
    'users existing policies' as info,
    policyname,
    cmd as for_command,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 5. Count of auth users
SELECT 
    'auth.users count' as info,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed,
    COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as unconfirmed
FROM auth.users;

-- 6. Count of public.users
SELECT 
    'public.users count' as info,
    COUNT(*) as total_rows,
    COUNT(DISTINCT role) as distinct_roles
FROM public.users;

-- 7. Sample users to see the role values
SELECT 
    'sample users' as info,
    u.username,
    u.role,
    u.auth_user_id IS NOT NULL as has_auth_link,
    au.email
FROM public.users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id
LIMIT 5;
