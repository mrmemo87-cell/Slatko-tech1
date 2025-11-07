-- Check if the user exists and is confirmed
-- Run this to see the status of your auth account

SELECT 
    'Auth user details' as check_type,
    email,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN '❌ EMAIL NOT CONFIRMED'
        ELSE '✅ EMAIL CONFIRMED'
    END as status,
    created_at,
    last_sign_in_at,
    raw_user_meta_data
FROM auth.users
WHERE email = 'mr.memo87@gmail.com';

-- Check if there's a matching public.users row
SELECT 
    'Public user mapping' as check_type,
    pu.username,
    pu.role,
    pu.is_active,
    CASE 
        WHEN pu.id IS NULL THEN '❌ NO PUBLIC USER ROW'
        ELSE '✅ PUBLIC USER EXISTS'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
WHERE au.email = 'mr.memo87@gmail.com';

-- Check RLS policies on users table
SELECT 
    'RLS Policy Check' as check_type,
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'users';
