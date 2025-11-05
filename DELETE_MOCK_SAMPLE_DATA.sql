-- ============================================
-- DELETE MOCK/SAMPLE DATA FROM DATABASE
-- ============================================
-- This script removes all mock and sample test data
-- Run this in Supabase SQL Editor

BEGIN;

-- Show what will be deleted
SELECT '📊 MOCK DATA TO BE DELETED:' as info;

-- Sample products
SELECT 'Products to delete:' as category, COUNT(*) as count
FROM products 
WHERE name IN ('Chocolate Cake', 'Vanilla Cupcakes', 'Croissant', 'Apple Pie', 'Bread Loaf');

-- Sample clients
SELECT 'Clients to delete:' as category, COUNT(*) as count
FROM clients 
WHERE name IN ('John Smith', 'Maria Garcia', 'Restaurant ABC')
   OR email IN ('john@smithcatering.com', 'maria@garciaevents.com', 'orders@restaurant-abc.com');

-- Sample materials
SELECT 'Materials to delete:' as category, COUNT(*) as count
FROM materials 
WHERE name IN ('Flour', 'Sugar', 'Butter', 'Eggs', 'Cocoa Powder')
  AND cost_per_unit IN (1.20, 0.80, 4.50, 3.00, 8.00);

-- ============================================
-- DELETE SAMPLE/MOCK DATA
-- ============================================

-- 1. Delete sample products (from supabase-schema.sql)
DELETE FROM products 
WHERE name IN (
  'Chocolate Cake', 
  'Vanilla Cupcakes', 
  'Croissant', 
  'Apple Pie', 
  'Bread Loaf'
);

-- 2. Delete sample clients (from supabase-schema.sql)
DELETE FROM clients 
WHERE name IN ('John Smith', 'Maria Garcia', 'Restaurant ABC')
   OR email IN ('john@smithcatering.com', 'maria@garciaevents.com', 'orders@restaurant-abc.com');

-- 3. Delete sample materials (from supabase-schema.sql)
DELETE FROM materials 
WHERE name IN ('Flour', 'Sugar', 'Butter', 'Eggs', 'Cocoa Powder')
  AND cost_per_unit IN (1.20, 0.80, 4.50, 3.00, 8.00);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ DELETION COMPLETE - Remaining Data:' as info;

SELECT 'Products remaining:' as category, COUNT(*) as count FROM products WHERE is_active = true;
SELECT 'Clients remaining:' as category, COUNT(*) as count FROM clients WHERE is_active = true;
SELECT 'Materials remaining:' as category, COUNT(*) as count FROM materials;
SELECT 'Deliveries:' as category, COUNT(*) as count FROM deliveries;

COMMIT;

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- After running this script:
-- 1. Run ADD_MISSING_DELIVERY_COLUMNS.sql next
-- 2. Then run FIX_DELIVERIES_RLS.sql
-- 3. Test the application with REAL data only
-- ============================================
