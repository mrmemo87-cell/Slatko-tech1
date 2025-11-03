-- COMPREHENSIVE Product Name Fixes
-- Execute this SQL in your Supabase SQL Editor

-- First, let's see what products we currently have
SELECT name, id FROM products ORDER BY name;

-- Update product names with flexible matching
UPDATE products 
SET name = 'Cheesecake Mango' 
WHERE LOWER(TRIM(name)) LIKE '%mango%' AND LOWER(TRIM(name)) LIKE '%cheesecake%';

UPDATE products 
SET name = 'Cheesecake Pistachio' 
WHERE LOWER(TRIM(name)) LIKE '%pistachio%' AND (LOWER(TRIM(name)) LIKE '%cheesecake%' OR LOWER(TRIM(name)) LIKE '%new york%');

UPDATE products 
SET name = 'Cheesecake Raspberry' 
WHERE (LOWER(TRIM(name)) LIKE '%raspberry%' OR LOWER(TRIM(name)) LIKE '%raspberries%') 
  AND (LOWER(TRIM(name)) LIKE '%cheesecake%' OR LOWER(TRIM(name)) LIKE '%new york%');

UPDATE products 
SET name = 'Cheesecake Strawberry' 
WHERE LOWER(TRIM(name)) LIKE '%strawberry%' AND (LOWER(TRIM(name)) LIKE '%cheesecake%' OR LOWER(TRIM(name)) LIKE '%new york%');

UPDATE products 
SET name = 'Classic Cheesecake' 
WHERE LOWER(TRIM(name)) IN ('new york cheesecake', 'classic cheesecake') 
   OR (LOWER(TRIM(name)) LIKE '%classic%' AND LOWER(TRIM(name)) LIKE '%cheesecake%')
   OR LOWER(TRIM(name)) = 'new york cheesecake';

UPDATE products 
SET name = 'Dubai Solly' 
WHERE LOWER(TRIM(name)) LIKE '%solly%' AND LOWER(TRIM(name)) NOT LIKE 'dubai solly';

UPDATE products 
SET name = 'Red Velvet' 
WHERE LOWER(TRIM(name)) LIKE '%red%velvet%' OR LOWER(TRIM(name)) LIKE '%krasni%barxat%';

UPDATE products 
SET name = 'Honey Cake' 
WHERE LOWER(TRIM(name)) LIKE '%honey%cake%' OR LOWER(TRIM(name)) LIKE '%medovik%';

-- Ensure Dubai Solly has the Dubai prefix
UPDATE products 
SET name = 'Dubai Solly' 
WHERE LOWER(TRIM(name)) = 'solly';

-- Verify the changes with exact names we expect
SELECT 
    id,
    name,
    unit,
    price,
    CASE 
        WHEN name = 'Dubai Cheesecake' OR name = 'Dubai San Sebastian' OR name = 'Dubai Solly' OR name = 'Snickers' THEN 'Dubai'
        WHEN name = 'Cheesecake Raspberry' OR name = 'Cheesecake Strawberry' OR name = 'Cheesecake Pistachio' OR name = 'Cheesecake Mango' THEN 'Fruit Cheesecake'
        WHEN name = 'Classic Cheesecake' OR name = 'San Sebastian' THEN 'Classic'
        WHEN name = 'Red Velvet' OR name = 'Honey Cake' THEN 'Cakes'
        ELSE 'Other'
    END as expected_category,
    created_at
FROM products 
WHERE name IN (
    'Cheesecake Mango', 'Cheesecake Pistachio', 'Cheesecake Raspberry', 'Cheesecake Strawberry',
    'Classic Cheesecake', 'Red Velvet', 'Honey Cake', 'Dubai Cheesecake', 'Dubai San Sebastian', 
    'Dubai Solly', 'Snickers', 'San Sebastian'
) OR LOWER(name) LIKE '%cheesecake%' OR LOWER(name) LIKE '%solly%' OR LOWER(name) LIKE '%velvet%'
ORDER BY expected_category, name;

-- Show any products that might still need categorization
SELECT 
    'Uncategorized Products' as status,
    name,
    id
FROM products 
WHERE name NOT IN (
    'Dubai Cheesecake', 'Dubai San Sebastian', 'Dubai Solly', 'Snickers',
    'Cheesecake Raspberry', 'Cheesecake Strawberry', 'Cheesecake Pistachio', 'Cheesecake Mango',
    'Classic Cheesecake', 'San Sebastian',
    'Red Velvet', 'Honey Cake'
)
ORDER BY name;