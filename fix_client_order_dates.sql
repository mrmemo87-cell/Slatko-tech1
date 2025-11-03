-- Check Client Data and Order History
-- Run this to see current client last_order_date values

-- 1. Check current client data
SELECT 
    id,
    name,
    business_name,
    last_order_date,
    CASE 
        WHEN last_order_date IS NULL THEN 'No orders yet'
        ELSE EXTRACT(DAY FROM (CURRENT_DATE - last_order_date::date)) || ' days ago'
    END as days_since_order
FROM clients 
ORDER BY last_order_date DESC NULLS LAST;

-- 2. Check recent deliveries to see if lastOrderDate should be updated
SELECT 
    d.date,
    c.name as client_name,
    c.last_order_date,
    CASE 
        WHEN c.last_order_date::date < d.date::date THEN 'NEEDS UPDATE'
        WHEN c.last_order_date IS NULL THEN 'MISSING DATA'
        ELSE 'UP TO DATE'
    END as status
FROM deliveries d
JOIN clients c ON c.id = d.client_id
ORDER BY d.date DESC
LIMIT 10;

-- 3. Update client last_order_date based on their most recent delivery
UPDATE clients 
SET last_order_date = (
    SELECT MAX(d.date)
    FROM deliveries d 
    WHERE d.client_id = clients.id
)
WHERE EXISTS (
    SELECT 1 FROM deliveries d 
    WHERE d.client_id = clients.id
);

-- 4. For testing: Set some sample dates to see the priority system working
-- Uncomment the lines below if you want to test with sample data

-- UPDATE clients SET last_order_date = CURRENT_DATE - INTERVAL '1 day' WHERE name ILIKE '%test%' OR name ILIKE '%sample%';
-- UPDATE clients SET last_order_date = CURRENT_DATE - INTERVAL '5 days' WHERE name ILIKE '%demo%';  
-- UPDATE clients SET last_order_date = CURRENT_DATE - INTERVAL '10 days' WHERE name ILIKE '%client%';

-- 5. Verify the updates
SELECT 
    name,
    last_order_date,
    CASE 
        WHEN last_order_date IS NULL THEN 'New client (High Priority)'
        WHEN EXTRACT(DAY FROM (CURRENT_DATE - last_order_date::date)) >= 7 THEN 'Expected to order (High Priority)'
        WHEN EXTRACT(DAY FROM (CURRENT_DATE - last_order_date::date)) >= 3 THEN 'Should order soon (Medium Priority)'
        ELSE 'Recently ordered (Low Priority)'
    END as priority_category,
    EXTRACT(DAY FROM (CURRENT_DATE - last_order_date::date)) as days_since
FROM clients 
ORDER BY 
    CASE WHEN last_order_date IS NULL THEN 0 ELSE EXTRACT(DAY FROM (CURRENT_DATE - last_order_date::date)) END DESC;