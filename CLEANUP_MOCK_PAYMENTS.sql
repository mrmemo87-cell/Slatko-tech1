-- =====================================================
-- CLEANUP MOCK/TEST PAYMENT DATA
-- =====================================================
-- This script removes test payment records that don't correspond to actual deliveries
-- Run this to clean up the payments table and show only real transactions

-- First, let's see what payments exist without valid deliveries
SELECT p.*, d.id as delivery_exists
FROM payments p
LEFT JOIN deliveries d ON p.delivery_id = d.id
WHERE d.id IS NULL;

-- OPTION 1: Delete payments that don't have a matching delivery
-- Uncomment to execute:
-- DELETE FROM payments 
-- WHERE delivery_id NOT IN (SELECT id FROM deliveries);

-- OPTION 2: Delete ALL payments (fresh start)
-- WARNING: This will delete ALL payment records!
-- Uncomment to execute:
-- DELETE FROM payments;

-- After cleanup, verify:
-- SELECT COUNT(*) as payment_count FROM payments;
-- SELECT COUNT(*) as delivery_count FROM deliveries;
