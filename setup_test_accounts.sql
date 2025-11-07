-- Set up test accounts for worker portal testing

-- 1. Make aigerim@slatko.asia a worker
-- First check if user exists in public.users
SELECT 
    'aigerim status' as info,
    u.id as user_id,
    u.username,
    u.role,
    au.email
FROM auth.users au
LEFT JOIN public.users u ON u.auth_user_id = au.id
WHERE au.email = 'aigerim@slatko.asia';

-- If no row exists, create one
DO $$
BEGIN
    -- Check if user exists in public.users for aigerim
    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        JOIN auth.users au ON u.auth_user_id = au.id
        WHERE au.email = 'aigerim@slatko.asia'
    ) THEN
        -- Create new user row
        INSERT INTO public.users (auth_user_id, username, role, is_active)
        SELECT 
            id,
            COALESCE((raw_user_meta_data->>'username')::text, 'aigerim'),
            'worker',
            true
        FROM auth.users
        WHERE email = 'aigerim@slatko.asia';
        
        RAISE NOTICE 'Created new user row for aigerim@slatko.asia';
    ELSE
        -- Update existing user to worker
        UPDATE public.users
        SET role = 'worker'
        WHERE auth_user_id = (
            SELECT id FROM auth.users WHERE email = 'aigerim@slatko.asia'
        );
        
        RAISE NOTICE 'Updated existing user aigerim@slatko.asia to worker';
    END IF;
END $$;

-- 2. Make sure mr.memo87@gmail.com is NOT a worker (admin or user)
UPDATE public.users
SET role = 'admin'
WHERE auth_user_id = (
    SELECT id FROM auth.users WHERE email = 'mr.memo87@gmail.com'
);

-- 3. Verify both accounts
SELECT 
    'Final Status' as info,
    u.username,
    u.role,
    au.email,
    CASE 
        WHEN u.role = 'worker' THEN '✅ Will see ONLY Production Portal'
        ELSE '✅ Will see full app navigation'
    END as expected_behavior
FROM public.users u
JOIN auth.users au ON u.auth_user_id = au.id
WHERE au.email IN ('mr.memo87@gmail.com', 'aigerim@slatko.asia')
ORDER BY au.email;
