-- Check RLS policies on products table
SELECT
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;

-- Check if worker can read products
SELECT id, name FROM products LIMIT 1;
