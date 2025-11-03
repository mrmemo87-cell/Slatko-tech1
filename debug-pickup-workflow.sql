-- Debug Query: Check pickup workflow data
-- Run this in Supabase SQL Editor to debug pickup issues

-- 1. Check all deliveries with workflow stages
SELECT 
  id,
  invoice_number,
  workflow_stage,
  assigned_driver,
  production_completed_time,
  delivery_start_time,
  created_at
FROM public.deliveries 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if there are any orders ready for pickup
SELECT COUNT(*) as ready_for_pickup_count
FROM public.deliveries 
WHERE workflow_stage = 'ready_for_delivery';

-- 3. Check if there are any orders out for delivery
SELECT COUNT(*) as out_for_delivery_count
FROM public.deliveries 
WHERE workflow_stage = 'out_for_delivery';

-- 4. Check orders with assigned drivers
SELECT 
  invoice_number,
  workflow_stage,
  assigned_driver,
  delivery_start_time
FROM public.deliveries 
WHERE assigned_driver IS NOT NULL
ORDER BY created_at DESC;

-- 5. Check workflow events for recent pickups
SELECT 
  we.stage,
  we.user_id,
  we.notes,
  we.timestamp,
  d.invoice_number
FROM public.workflow_events we
JOIN public.deliveries d ON we.delivery_id = d.id
WHERE we.stage = 'out_for_delivery'
ORDER BY we.timestamp DESC
LIMIT 5;