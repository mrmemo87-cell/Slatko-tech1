-- ============================================
-- FIX CLIENT ID MISMATCHES AND DATA ISSUES
-- ============================================
-- This script helps fix common client ID mismatch problems
-- Run DIAGNOSE_CLIENT_ID_ISSUES.sql FIRST to understand the problem
-- Then run this script to fix it
-- ============================================

BEGIN;

SELECT '🔧 STARTING DATA CLEANUP AND FIXES...' as status;

-- ============================================
-- OPTION 1: MERGE DUPLICATE CLIENTS
-- ============================================
-- If you have duplicate clients (same name, different IDs),
-- this section helps you merge them

SELECT '📋 Step 1: Identify clients to merge...' as step;

-- Create a temporary table to track duplicates
CREATE TEMP TABLE client_duplicates AS
SELECT 
  name,
  business_name,
  MIN(id) as keep_id,  -- Keep the oldest client ID
  ARRAY_AGG(id) as all_ids,
  COUNT(*) as duplicate_count
FROM clients
WHERE name IS NOT NULL AND name != ''
GROUP BY name, business_name
HAVING COUNT(*) > 1;

-- Show what will be merged
SELECT '⚠️ CLIENTS THAT WILL BE MERGED:' as warning;
SELECT * FROM client_duplicates;

-- Update deliveries to point to the kept client ID
SELECT '🔄 Updating deliveries to use consistent client IDs...' as step;

UPDATE deliveries d
SET client_id = cd.keep_id,
    updated_at = NOW()
FROM client_duplicates cd
WHERE d.client_id = ANY(cd.all_ids)
  AND d.client_id != cd.keep_id;

-- Show how many were updated
SELECT 
  '✅ Deliveries updated:' as info,
  COUNT(*) as count
FROM deliveries d
JOIN client_duplicates cd ON d.client_id = cd.keep_id;

-- Deactivate duplicate client records (don't delete to preserve history)
SELECT '🗑️ Deactivating duplicate client records...' as step;

UPDATE clients c
SET is_active = false,
    updated_at = NOW()
FROM client_duplicates cd
WHERE c.id = ANY(cd.all_ids)
  AND c.id != cd.keep_id;

-- ============================================
-- OPTION 2: FIX DELIVERIES WITHOUT ITEMS
-- ============================================

SELECT '📦 Step 2: Checking for deliveries without items...' as step;

-- Show deliveries without items
SELECT 
  '⚠️ Deliveries without items:' as warning,
  COUNT(*) as count
FROM deliveries d
WHERE NOT EXISTS (
  SELECT 1 FROM delivery_items WHERE delivery_id = d.id
);

-- List them
SELECT 
  invoice_number,
  client_id,
  date,
  status,
  notes
FROM deliveries d
WHERE NOT EXISTS (
  SELECT 1 FROM delivery_items WHERE delivery_id = d.id
)
ORDER BY date DESC
LIMIT 10;

-- Note: We can't automatically fix deliveries without items
-- These need manual intervention or can be deleted if they're test data

-- ============================================
-- OPTION 3: CLEAN UP ORPHANED DELIVERY_ITEMS
-- ============================================

SELECT '🧹 Step 3: Cleaning orphaned delivery_items...' as step;

-- Find delivery_items pointing to non-existent deliveries
DELETE FROM delivery_items
WHERE delivery_id NOT IN (SELECT id FROM deliveries);

SELECT '✅ Orphaned delivery_items cleaned' as status;

-- ============================================
-- OPTION 4: UPDATE CLIENT STATISTICS
-- ============================================

SELECT '📊 Step 4: Updating client statistics...' as step;

-- Update last_order_date for all clients
UPDATE clients c
SET last_order_date = (
  SELECT MAX(date)
  FROM deliveries
  WHERE client_id = c.id
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM deliveries WHERE client_id = c.id
);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ VERIFYING FIXES...' as step;

-- Show client duplicate status
SELECT '📊 Duplicate clients remaining:' as info;
SELECT 
  name,
  business_name,
  COUNT(*) as count
FROM clients
WHERE is_active = true
GROUP BY name, business_name
HAVING COUNT(*) > 1;

-- Show deliveries by client
SELECT '📦 Deliveries per client (top 10):' as info;
SELECT 
  c.name,
  c.business_name,
  COUNT(d.id) as delivery_count,
  c.is_active
FROM clients c
LEFT JOIN deliveries d ON d.client_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.business_name, c.is_active
ORDER BY delivery_count DESC
LIMIT 10;

-- Show deliveries without items
SELECT '⚠️ Deliveries still without items:' as info;
SELECT COUNT(*) as count
FROM deliveries d
WHERE NOT EXISTS (
  SELECT 1 FROM delivery_items WHERE delivery_id = d.id
);

COMMIT;

SELECT '🎉 ✅ DATA CLEANUP COMPLETED! ✅ 🎉' as status;
SELECT 'Now test the Repeat Order feature again.' as next_step;
SELECT 'If deliveries still have no items, they need to be recreated or deleted.' as note;
