-- Convert an existing user to a worker for testing
-- This will make them redirect to Production Portal only

-- Step 1: Check if user exists in public.users
SELECT 
    'Current user status' as info,
    u.username,
    u.role,
    u.is_active,
    au.email
FROM public.users u
JOIN auth.users au ON u.auth_user_id = au.id
WHERE au.email = 'mr.memo87@gmail.com';

-- Step 2: If no row exists, create one (uncomment if needed)
-- INSERT INTO public.users (auth_user_id, username, role, is_active)
-- SELECT 
--     id,
--     COALESCE((raw_user_meta_data->>'username')::text, 'worker_user'),
--     'worker',
--     true
-- FROM auth.users
-- WHERE email = 'mr.memo87@gmail.com'
-- ON CONFLICT (auth_user_id) DO NOTHING;

-- Step 3: Update existing user to worker role
UPDATE public.users
SET role = 'worker'
WHERE auth_user_id = (
    SELECT id FROM auth.users WHERE email = 'mr.memo87@gmail.com'
);

-- Step 4: Verify the change
SELECT 
    'Updated user status' as info,
    u.username,
    u.role,
    u.is_active,
    au.email
FROM public.users u
JOIN auth.users au ON u.auth_user_id = au.id
WHERE au.email = 'mr.memo87@gmail.com';

-- To revert back to admin later, run:
-- UPDATE public.users SET role = 'admin' WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'mr.memo87@gmail.com');
