-- Comprehensive Database Verification Script
-- Run this after executing the product name fixes

-- 1. Verify all expected products exist with correct names
SELECT 
    'Product Verification' as check_type,
    COUNT(*) as total_products,
    COUNT(CASE WHEN name IN (
        'Dubai Cheesecake', 'Dubai San Sebastian', 'Dubai Solly', 'Snickers',
        'Cheesecake Raspberry', 'Cheesecake Strawberry', 'Cheesecake Pistachio', 'Cheesecake Mango',
        'Classic Cheesecake', 'San Sebastian',
        'Red Velvet', 'Honey Cake'
    ) THEN 1 END) as categorized_products
FROM products;

-- 2. Check for any old product names that should be updated
SELECT 
    'Old Names Check' as check_type,
    name,
    'Should be updated' as status
FROM products 
WHERE name ILIKE '%New York%' 
   OR name ILIKE '%(Krasni Barxat)%' 
   OR name ILIKE '%(Medovik)%'
   OR name = 'Raspberries Cheesecake'
   OR name = 'Mango Cheesecake'
   OR name = 'Strawberry Cheesecake'
   OR name = 'Pistachio Cheesecake'
   OR name = 'Redvelvet'
   OR name = 'Solly';

-- 3. Verify category distribution
SELECT 
    CASE 
        WHEN name IN ('Dubai Cheesecake', 'Dubai San Sebastian', 'Dubai Solly', 'Snickers') THEN 'Dubai'
        WHEN name IN ('Cheesecake Raspberry', 'Cheesecake Strawberry', 'Cheesecake Pistachio', 'Cheesecake Mango') THEN 'Fruit Cheesecake'
        WHEN name IN ('Classic Cheesecake', 'San Sebastian') THEN 'Classic'
        WHEN name IN ('Red Velvet', 'Honey Cake') THEN 'Cakes'
        ELSE 'Other'
    END as category,
    COUNT(*) as product_count,
    STRING_AGG(name, ', ' ORDER BY name) as products
FROM products 
GROUP BY 
    CASE 
        WHEN name IN ('Dubai Cheesecake', 'Dubai San Sebastian', 'Dubai Solly', 'Snickers') THEN 'Dubai'
        WHEN name IN ('Cheesecake Raspberry', 'Cheesecake Strawberry', 'Cheesecake Pistachio', 'Cheesecake Mango') THEN 'Fruit Cheesecake'
        WHEN name IN ('Classic Cheesecake', 'San Sebastian') THEN 'Classic'
        WHEN name IN ('Red Velvet', 'Honey Cake') THEN 'Cakes'
        ELSE 'Other'
    END
ORDER BY category;

-- 4. Check for any orphaned deliveries or production batches with old product references
SELECT 
    'Orphaned Records Check' as check_type,
    'deliveries' as table_name,
    COUNT(*) as count
FROM deliveries d
LEFT JOIN products p ON p.id::text = ANY(
    SELECT jsonb_array_elements_text(
        jsonb_path_query_array(d.items, '$[*].productId')
    )
)
WHERE p.id IS NULL AND jsonb_array_length(d.items) > 0

UNION ALL

SELECT 
    'Orphaned Records Check' as check_type,
    'production_batches' as table_name,
    COUNT(*) as count
FROM production_batches pb
LEFT JOIN products p ON p.id = pb.product_id
WHERE p.id IS NULL;

-- 5. Verify RLS policies are working
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('products', 'clients', 'materials', 'deliveries', 'production_batches', 'purchases')
ORDER BY tablename, policyname;