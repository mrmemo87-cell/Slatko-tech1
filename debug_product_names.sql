-- Debug Script: Check exact product names in database
-- Run this to see the exact product names and identify any character differences

SELECT 
    '"' || name || '"' as quoted_name,
    name,
    LENGTH(name) as name_length,
    CHAR_LENGTH(name) as char_length,
    ASCII(SUBSTRING(name, 1, 1)) as first_char_ascii,
    ASCII(SUBSTRING(name, LENGTH(name), 1)) as last_char_ascii
FROM products 
WHERE name IN (
    'Cheesecake Mango',
    'Cheesecake Pistachio', 
    'Cheesecake Raspberry',
    'Cheesecake Strawberry',
    'Dubai Solly',
    'Red Velvet'
)
ORDER BY name;

-- Check for any invisible characters or differences
SELECT 
    name,
    CASE 
        WHEN name = 'Cheesecake Mango' THEN 'EXACT MATCH'
        WHEN LOWER(name) = LOWER('Cheesecake Mango') THEN 'CASE DIFFERENCE'
        WHEN TRIM(name) = 'Cheesecake Mango' THEN 'WHITESPACE DIFFERENCE'
        ELSE 'CONTENT DIFFERENCE'
    END as mango_match,
    CASE 
        WHEN name = 'Dubai Solly' THEN 'EXACT MATCH'
        WHEN LOWER(name) = LOWER('Dubai Solly') THEN 'CASE DIFFERENCE'  
        WHEN TRIM(name) = 'Dubai Solly' THEN 'WHITESPACE DIFFERENCE'
        ELSE 'CONTENT DIFFERENCE'
    END as solly_match,
    CASE 
        WHEN name = 'Red Velvet' THEN 'EXACT MATCH'
        WHEN LOWER(name) = LOWER('Red Velvet') THEN 'CASE DIFFERENCE'
        WHEN TRIM(name) = 'Red Velvet' THEN 'WHITESPACE DIFFERENCE'
        ELSE 'CONTENT DIFFERENCE'
    END as red_velvet_match
FROM products 
WHERE name ILIKE '%mango%' 
   OR name ILIKE '%solly%' 
   OR name ILIKE '%red%velvet%'
   OR name ILIKE '%velvet%'
ORDER BY name;