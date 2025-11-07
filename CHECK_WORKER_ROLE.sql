-- Check if worker user exists and has correct role
SELECT id, username, role, auth_user_id FROM public.users WHERE username = 'aigerim@slatko.asia';

-- Also check all users to see role values
SELECT id, username, role, auth_user_id FROM public.users LIMIT 20;
