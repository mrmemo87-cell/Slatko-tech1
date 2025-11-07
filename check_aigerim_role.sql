-- Check aigerim@slatko.asia role in database
SELECT 
  au.id,
  au.email,
  u.id as user_id,
  u.username,
  u.role,
  au.raw_user_metadata
FROM auth.users au
LEFT JOIN public.users u ON u.auth_user_id = au.id
WHERE au.email = 'aigerim@slatko.asia';
