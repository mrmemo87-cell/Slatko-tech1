-- =====================================================
-- FRESH START - RESET ALL ORDER DATA
-- =====================================================
-- This script removes ALL order/delivery/payment data but keeps:
-- ✅ Clients
-- ✅ Products
-- ✅ Materials
-- ✅ System configuration
-- ✅ Users/Authentication

-- WARNING: This will delete ALL order history!
-- Only run this if you want a completely fresh start for testing.

-- Step 1: Delete all payment records
DELETE FROM payments;

-- Step 2: Delete all return items
DELETE FROM return_items;

-- Step 3: Delete all delivery items (order line items)
DELETE FROM delivery_items;

-- Step 4: Delete all deliveries (orders)
DELETE FROM deliveries;

-- Step 5: Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM payments) as payments_count,
  (SELECT COUNT(*) FROM return_items) as returns_count,
  (SELECT COUNT(*) FROM delivery_items) as order_items_count,
  (SELECT COUNT(*) FROM deliveries) as orders_count,
  '---' as separator,
  (SELECT COUNT(*) FROM clients) as clients_count,
  (SELECT COUNT(*) FROM products) as products_count,
  (SELECT COUNT(*) FROM materials) as materials_count;

-- OPTIONAL: Reset invoice counter (if you want invoices to start from 1 again)
-- Uncomment the lines below to reset the invoice sequence:

-- First, find the sequence name:
-- SELECT * FROM information_schema.sequences WHERE sequence_name LIKE '%invoice%';

-- Then reset it (replace with actual sequence name if different):
-- ALTER SEQUENCE deliveries_invoice_number_seq RESTART WITH 1;

-- Final message
SELECT 
  '✅ Fresh start complete!' as status,
  'All orders, payments, and returns have been deleted' as message,
  'Clients, products, and materials are preserved' as note;
