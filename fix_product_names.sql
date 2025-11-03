-- Fix Product Names and Update Categories
-- Execute this SQL in your Supabase SQL Editor

-- Update product names
UPDATE products 
SET name = 'Cheesecake Mango' 
WHERE name = 'New York Mango';

UPDATE products 
SET name = 'Cheesecake Pistachio' 
WHERE name = 'New York Pistachio';

UPDATE products 
SET name = 'Cheesecake Raspberry' 
WHERE name = 'New York Raspberry';

UPDATE products 
SET name = 'Cheesecake Strawberry' 
WHERE name = 'New York Strawberry';

UPDATE products 
SET name = 'Classic Cheesecake' 
WHERE name = 'New York Cheesecake';

UPDATE products 
SET name = 'Red Velvet' 
WHERE name = 'Red Velvet (Krasni Barxat)';

UPDATE products 
SET name = 'Honey Cake' 
WHERE name = 'Honey Cake (Medovik)';

-- Verify the changes
SELECT 
    id,
    name,
    unit,
    price,
    created_at
FROM products 
WHERE name IN (
    'Cheesecake Mango',
    'Cheesecake Pistachio', 
    'Cheesecake Raspberry',
    'Cheesecake Strawberry',
    'Classic Cheesecake',
    'Red Velvet',
    'Honey Cake',
    'Dubai Cheesecake',
    'Dubai San Sebastian',
    'Dubai Solly',
    'Snickers',
    'San Sebastian'
)
ORDER BY name;

-- Check if all expected products exist
SELECT 
    CASE 
        WHEN name IN ('Dubai Cheesecake', 'Dubai San Sebastian', 'Dubai Solly', 'Snickers') THEN 'Dubai'
        WHEN name IN ('Cheesecake Raspberry', 'Cheesecake Strawberry', 'Cheesecake Pistachio', 'Cheesecake Mango') THEN 'Fruit Cheesecake'
        WHEN name IN ('Classic Cheesecake', 'San Sebastian') THEN 'Classic'
        WHEN name IN ('Red Velvet', 'Honey Cake') THEN 'Cakes'
        ELSE 'Other'
    END as category,
    name,
    id
FROM products 
WHERE name IN (
    'Dubai Cheesecake', 'Dubai San Sebastian', 'Dubai Solly', 'Snickers',
    'Cheesecake Raspberry', 'Cheesecake Strawberry', 'Cheesecake Pistachio', 'Cheesecake Mango',
    'Classic Cheesecake', 'San Sebastian',
    'Red Velvet', 'Honey Cake'
)
ORDER BY category, name;

-- Show complete table structure for reference
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND table_schema = 'public'
ORDER BY ordinal_position;