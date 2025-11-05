-- ============================================
-- DIAGNOSE CLIENT ID MISMATCH ISSUES
-- ============================================
-- This script helps identify duplicate clients and client ID problems
-- Run this in Supabase SQL Editor to understand the mismatch
-- ============================================

SELECT '🔍 DIAGNOSING CLIENT ID ISSUES...' as status;

-- ============================================
-- PART 1: Find Duplicate Client Names
-- ============================================

SELECT '📋 DUPLICATE CLIENT NAMES (same name, different IDs):' as info;

SELECT 
  name,
  business_name,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as all_ids
FROM clients
GROUP BY name, business_name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ============================================
-- PART 2: Show All Clients with Their IDs
-- ============================================

SELECT '👥 ALL CLIENTS IN DATABASE:' as info;

SELECT 
  id,
  name,
  business_name,
  email,
  is_active,
  created_at,
  (SELECT COUNT(*) FROM deliveries WHERE client_id = clients.id) as delivery_count
FROM clients
ORDER BY name;

-- ============================================
-- PART 3: Show Deliveries Grouped by Client
-- ============================================

SELECT '📦 DELIVERIES GROUPED BY CLIENT ID:' as info;

SELECT 
  d.client_id,
  c.name as client_name,
  c.business_name,
  COUNT(*) as delivery_count,
  STRING_AGG(d.invoice_number, ', ' ORDER BY d.date DESC) as invoices
FROM deliveries d
LEFT JOIN clients c ON c.id = d.client_id
GROUP BY d.client_id, c.name, c.business_name
ORDER BY delivery_count DESC;

-- ============================================
-- PART 4: Find Orphaned Deliveries
-- ============================================

SELECT '⚠️ DELIVERIES WITH MISSING CLIENTS (orphaned):' as info;

SELECT 
  d.id,
  d.invoice_number,
  d.client_id,
  d.date,
  'Client not found in clients table!' as issue
FROM deliveries d
LEFT JOIN clients c ON c.id = d.client_id
WHERE c.id IS NULL
ORDER BY d.date DESC;

-- ============================================
-- PART 5: Specific Client Investigation
-- ============================================

SELECT '🔎 INVESTIGATING CLIENT ID d5cb1e85-d607-4014-89eb-8ab698981235:' as info;

-- Does this client exist?
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM clients WHERE id = 'd5cb1e85-d607-4014-89eb-8ab698981235') 
    THEN '✅ Client EXISTS in database'
    ELSE '❌ Client DOES NOT EXIST in database'
  END as client_status;

-- If it exists, show details
SELECT 
  id,
  name,
  business_name,
  email,
  is_active,
  created_at
FROM clients
WHERE id = 'd5cb1e85-d607-4014-89eb-8ab698981235';

-- How many deliveries does it have?
SELECT 
  'Deliveries for this client:' as info,
  COUNT(*) as count
FROM deliveries
WHERE client_id = 'd5cb1e85-d607-4014-89eb-8ab698981235';

-- ============================================
-- PART 6: Find Clients with Similar Names
-- ============================================

SELECT '🔍 CLIENTS WITH SIMILAR NAMES TO THE ONE YOU SELECTED:' as info;

-- Get the name of the selected client first
WITH selected_client AS (
  SELECT name, business_name 
  FROM clients 
  WHERE id = 'd5cb1e85-d607-4014-89eb-8ab698981235'
)
SELECT 
  c.id,
  c.name,
  c.business_name,
  c.is_active,
  (SELECT COUNT(*) FROM deliveries WHERE client_id = c.id) as delivery_count,
  CASE 
    WHEN c.id = 'd5cb1e85-d607-4014-89eb-8ab698981235' THEN '⭐ THIS IS THE CLIENT YOU SELECTED'
    ELSE '🔄 DUPLICATE/SIMILAR NAME'
  END as match_type
FROM clients c, selected_client sc
WHERE c.name ILIKE '%' || sc.name || '%' 
   OR sc.name ILIKE '%' || c.name || '%'
   OR c.business_name ILIKE '%' || sc.business_name || '%'
   OR sc.business_name ILIKE '%' || c.business_name || '%'
ORDER BY delivery_count DESC;

-- ============================================
-- PART 7: Check for Deliveries with Items
-- ============================================

SELECT '📦 DELIVERIES WITHOUT ITEMS (possible data issue):' as info;

SELECT 
  d.invoice_number,
  d.client_id,
  c.name as client_name,
  d.date,
  d.status,
  (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = d.id) as item_count
FROM deliveries d
LEFT JOIN clients c ON c.id = d.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM delivery_items WHERE delivery_id = d.id
)
ORDER BY d.date DESC
LIMIT 10;

-- ============================================
-- SUMMARY
-- ============================================

SELECT '📊 SUMMARY:' as info;

SELECT 
  'Total clients:' as metric,
  COUNT(*) as value
FROM clients;

SELECT 
  'Active clients:' as metric,
  COUNT(*) as value
FROM clients
WHERE is_active = true;

SELECT 
  'Total deliveries:' as metric,
  COUNT(*) as value
FROM deliveries;

SELECT 
  'Deliveries without items:' as metric,
  COUNT(*) as value
FROM deliveries d
WHERE NOT EXISTS (SELECT 1 FROM delivery_items WHERE delivery_id = d.id);

SELECT 
  'Clients with duplicate names:' as metric,
  COUNT(*) as value
FROM (
  SELECT name, business_name
  FROM clients
  GROUP BY name, business_name
  HAVING COUNT(*) > 1
) duplicates;

SELECT '✅ DIAGNOSTIC COMPLETE' as status;
