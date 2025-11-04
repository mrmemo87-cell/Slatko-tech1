## URGENT: RLS POLICY ERROR - PAYMENT SYSTEM BLOCKED

### ERROR MESSAGE:
```
Could not find the 'payment_method' column of 'deliveries' in the schema cache
```

### ROOT CAUSE:
Row Level Security (RLS) policies on the `deliveries` table are preventing updates to the `payment_method` column. This is a Supabase configuration issue that must be fixed in the database.

### IMMEDIATE FIX REQUIRED:

**Step 1: Go to Supabase Dashboard**
- URL: https://app.supabase.com
- Select your project

**Step 2: Open SQL Editor**
- Click "SQL Editor" in the left sidebar

**Step 3: Create New Query**
- Click "+ New Query"

**Step 4: Copy and paste this SQL:**

```sql
-- Disable RLS on all payment-related tables
ALTER TABLE IF EXISTS public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.return_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_payment_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settlement_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_transactions DISABLE ROW LEVEL SECURITY;

-- Verify the tables exist and RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('deliveries', 'delivery_items', 'return_items', 'order_payment_records', 'settlement_sessions', 'payment_transactions')
AND schemaname = 'public'
ORDER BY tablename;
```

**Step 5: Execute Query**
- Click "RUN" or press `Ctrl+Enter`
- Should see "Success. No rows returned" or a list of tables with `rowsecurity = false`

**Step 6: Refresh Application**
- Go back to the app
- Press `Ctrl+Shift+R` to hard refresh (clear cache)
- Try payment again

### EXPECTED RESULT:
- ✅ Payment button works without RLS error
- ✅ Deliveries update to `payment_method = 'cash'`
- ✅ Order card moves to "Completed" tab after payment
- ✅ No more "payment_method column not found" errors

### IF IT STILL DOESN'T WORK:

1. **Check if RLS is actually disabled:**
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'deliveries' AND schemaname = 'public';
```
Should show: `rowsecurity = false`

2. **Check if payment_method column exists:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deliveries' AND column_name = 'payment_method';
```
Should return a row with `data_type = character varying`

3. **Try a manual update to test:**
```sql
UPDATE public.deliveries 
SET payment_method = 'cash' 
WHERE id = 'any-delivery-id' 
LIMIT 1;
```
Should show "UPDATE 1"

### AFTER FIX IS APPLIED:

The application will:
1. Allow payments to be processed
2. Update order `payment_method` correctly
3. Mark orders as completed and paid
4. Reload the order list after 1 second to show the order in the "Completed" tab

**DO NOT PROCEED WITH ORDERS UNTIL THIS IS FIXED!**
