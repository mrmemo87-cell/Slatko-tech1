-- Fix order_payment_records with $0.00 totals by recalculating from delivery_items
-- This script updates order_total for all records where it's currently 0 or NULL

UPDATE public.order_payment_records opr
SET order_total = COALESCE((
  SELECT SUM(di.quantity * di.price)
  FROM public.delivery_items di
  WHERE di.delivery_id = opr.delivery_id
), 0)
WHERE opr.order_total = 0 OR opr.order_total IS NULL;

-- Verify the fix
SELECT 'Order Payment Records Fixed' as status;
SELECT COUNT(*) as total_records, 
       COUNT(CASE WHEN order_total > 0 THEN 1 END) as records_with_amounts
FROM public.order_payment_records;
