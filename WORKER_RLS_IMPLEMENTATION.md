# Database RLS Implementation - Step by Step

## Current Situation

The worker `aigerim@slatko.asia` has this in the database:

```sql
SELECT 
  u.id,
  u.email,
  u.role,
  u.username
FROM public.users u
JOIN auth.users au ON u.auth_user_id = au.id
WHERE au.email = 'aigerim@slatko.asia';

-- Result:
-- id        | email              | role       | username
-- ---------|-------------------|------------|----------
-- abc123   | aigerim@slatko.asia| worker    | Aigerim
```

## The Problem

Even though `role = 'worker'`, they can query ANY table:

```sql
-- This should be BLOCKED but currently works:
SELECT * FROM products;           ❌ Returns all products (SHOULD FAIL)
SELECT * FROM clients;            ❌ Returns all clients (SHOULD FAIL)
SELECT * FROM materials;          ❌ Returns all materials (SHOULD FAIL)
SELECT * FROM deliveries;         ❌ Returns all deliveries (SHOULD FAIL)
SELECT * FROM payments;           ❌ Returns all payments (SHOULD FAIL)

-- This should work and does:
SELECT * FROM production_batches;  ✅ Works (CORRECT)
```

## The Solution: RLS Policies

### What RLS Does

Row-Level Security evaluates policies BEFORE returning any data:

```
Query from worker:
  SELECT * FROM products
         ↓
  Check RLS policy on products table:
    is_worker_role() = true?  → YES
    Condition: NOT is_worker_role() = NOT true = false
    Result: Policy blocks access = false (deny)
         ↓
  ❌ PERMISSION DENIED - No data returned
```

### Helper Function

The SQL creates this helper:

```sql
CREATE OR REPLACE FUNCTION is_worker_role()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid())::text 
    ILIKE ANY(ARRAY['%worker%', '%production%']),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

This function:
1. Gets the current authenticated user's ID: `auth.uid()`
2. Looks up their role in `public.users` table
3. Checks if role contains "worker" or "production" (case-insensitive)
4. Returns true if worker, false otherwise

### The Policies

For each restricted table, SQL creates:

```sql
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
CREATE POLICY "products_worker_deny" ON public.products
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());
```

This policy:
- Name: `products_worker_deny`
- Type: `RESTRICTIVE` (blocks access if condition is false)
- Applies to: ALL operations (SELECT, INSERT, UPDATE, DELETE)
- Condition: `NOT is_worker_role()` = "NOT a worker"
- Result: Only non-workers can access

## What Gets Restricted

### Table: products
```sql
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
CREATE POLICY "products_worker_deny" ON public.products
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());
```
**Effect**: Workers cannot SELECT/INSERT/UPDATE/DELETE products

### Table: clients
```sql
DROP POLICY IF EXISTS "clients_worker_deny" ON public.clients;
CREATE POLICY "clients_worker_deny" ON public.clients
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());
```
**Effect**: Workers cannot access client data

### Table: materials
```sql
DROP POLICY IF EXISTS "materials_worker_deny" ON public.materials;
CREATE POLICY "materials_worker_deny" ON public.materials
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());
```
**Effect**: Workers cannot access materials

### Table: deliveries
```sql
DROP POLICY IF EXISTS "deliveries_worker_deny" ON public.deliveries;
CREATE POLICY "deliveries_worker_deny" ON public.deliveries
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());
```
**Effect**: Workers cannot access delivery data

### Table: payments
```sql
DROP POLICY IF EXISTS "payments_worker_deny" ON public.payments;
CREATE POLICY "payments_worker_deny" ON public.payments
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());
```
**Effect**: Workers cannot access payment data

### Table: return_items
```sql
DROP POLICY IF EXISTS "return_items_worker_deny" ON public.return_items;
CREATE POLICY "return_items_worker_deny" ON public.return_items
  AS RESTRICTIVE FOR ALL
  USING (NOT is_worker_role());
```
**Effect**: Workers cannot access return items

## What Gets Allowed

### Table: production_batches
```sql
DROP POLICY IF EXISTS "production_batches_all_allow" ON public.production_batches;
CREATE POLICY "production_batches_all_allow" ON public.production_batches
  FOR ALL USING (true);
```
**Effect**: Everyone (workers and non-workers) can access ✅

## Step-by-Step Execution

### Step 1: Copy the SQL File

Open: `ENABLE_WORKER_RLS_POLICIES_CORRECT.sql`

Copy the entire content (lines 1-85)

### Step 2: Open Supabase SQL Editor

1. Go to: https://app.supabase.com
2. Login with your account
3. Select your project
4. Click: SQL Editor (left sidebar)
5. Click: New Query

### Step 3: Paste and Run

```
┌─────────────────────────────────────┐
│ SQL Editor                          │
├─────────────────────────────────────┤
│ [paste SQL here]                    │
├─────────────────────────────────────┤
│ [Run] [Format] [Save]               │
└─────────────────────────────────────┘
```

- Paste the SQL
- Click "Run"
- Wait for result: "Query executed successfully"

### Step 4: Verify Policies Created

Run this verification query:

```sql
SELECT schemaname, tablename, policyname, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN 
('products', 'clients', 'materials', 'deliveries', 'payments', 'production_batches')
ORDER BY tablename, policyname;
```

Expected output:
```
schemaname | tablename        | policyname               | qual
-----------|------------------|--------------------------|-----
public     | clients          | clients_worker_deny      | NOT is_worker_role()
public     | deliveries       | deliveries_worker_deny   | NOT is_worker_role()
public     | materials        | materials_worker_deny    | NOT is_worker_role()
public     | payments         | payments_worker_deny     | NOT is_worker_role()
public     | products         | products_worker_deny     | NOT is_worker_role()
public     | production_batches | production_batches_all_allow | true
public     | return_items     | return_items_worker_deny | NOT is_worker_role()
```

## Testing the RLS

### Test 1: Login as Worker, Try Products

1. Log out
2. Log in as: `aigerim@slatko.asia` with password
3. Go to: Products page
4. Expected: ❌ Error message "Permission denied"

**In Console you'll see**:
```
❌ Products query failed: Error: permission denied for relation "products"
```

### Test 2: Login as Worker, Try Production Portal

1. Still logged in as: `aigerim@slatko.asia`
2. Go to: Production Portal
3. Expected: ✅ Works normally

### Test 3: Login as Admin, Try Products

1. Log out
2. Log in as: `mr.memo87@gmail.com` with password
3. Go to: Products page
4. Expected: ✅ All products displayed

## Common Issues & Fixes

### Issue: "permission denied for relation products" appears for ALL users

**Cause**: Policy is too strict or function has issues

**Fix**: Drop all policies and re-run:
```sql
DROP POLICY IF EXISTS "products_worker_deny" ON public.products;
-- Then re-run the full SQL
```

### Issue: Worker can still access restricted tables

**Cause**: RLS not enabled on the table or policy name conflict

**Fix**: Verify RLS is enabled:
```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- Re-run all policies
```

### Issue: Function not found error

**Cause**: Function not created in same query

**Fix**: Make sure you ran the complete SQL file, not just the policies

## After RLS is Working

### Security Layers Active:

1. ✅ Frontend - UI blocks worker
2. ✅ Database - RLS blocks worker
3. ✅ API - Permission denied errors

### What Worker Sees:

**Production Portal** → ✅ Works perfectly
```
- Production Queue
- Cooking Now
- Ready for Pickup
```

**Other Pages** → ❌ Error message
```
"Error loading data: You don't have permission to access this resource"
```

### What Admin Sees:

**All Pages** → ✅ All work normally
```
- Dashboard
- Products
- Clients
- Materials
- Reports
- Everything else
```

## Documentation Generated

For your reference:

1. `ENABLE_WORKER_RLS_POLICIES_CORRECT.sql` ← The SQL to run
2. `CRITICAL_DATABASE_RLS_SETUP.md` ← Setup guide
3. `WORKER_RLS_IMPLEMENTATION.md` ← This file
4. `WORKER_ACCESS_CONTROL.md` ← Full documentation

---

**Next Step**: Execute the SQL in Supabase SQL Editor

**Time to implement**: ~5 minutes

**Result**: Complete 3-layer security for worker access control
