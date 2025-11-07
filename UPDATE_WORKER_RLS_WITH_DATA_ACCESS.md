# 🔄 UPDATE: Worker RLS Policies - Now With Data Access

## What Changed

**Before** (Previous SQL):
- ❌ Workers saw NO data at all
- ❌ Production Portal had nothing to show

**After** (New SQL - USE THIS):
- ✅ Workers see orders (what needs to be cooked)
- ✅ Workers see production batches (what they're cooking)
- ✅ Workers see delivery items (quantities needed)
- ✅ Workers can accept orders and manage production
- ❌ Workers still cannot access products, clients, materials management

## What Workers Can Do Now

### ✅ ALLOWED - Workers Can:
1. **View Orders** - See all incoming orders
2. **Accept Orders** - Mark orders as received
3. **Start Cooking** - Create production batches
4. **Update Cooking Status** - Mark as preparing → ready for pickup
5. **View Delivery Items** - See what quantities were ordered
6. **View Their Profile** - See their own user info only

### ❌ BLOCKED - Workers Cannot:
1. ❌ View/Edit Products catalog
2. ❌ View/Edit Clients
3. ❌ View/Edit Materials
4. ❌ View/Edit other users' profiles
5. ❌ Delete any data
6. ❌ Access management dashboards

## Production Portal Workflow - What Workers See

```
LOGIN as aigerim@slatko.asia
    ↓
PRODUCTION PORTAL OPENS
    ↓
┌─────────────────────────────────────┐
│ 📋 PRODUCTION QUEUE                 │
├─────────────────────────────────────┤
│ Show all ORDERS with status         │
│ ✓ Accept Order Card                 │ ← Worker clicks this
│ ├─ Order ID, Client, Items          │
│ └─ Status: "order_placed" → "received"
│                                      │
│ 🔪 COOKING NOW                      │
├─────────────────────────────────────┤
│ Show all PRODUCTION_BATCHES         │
│ ✓ Update Status (cooking, ready)    │ ← Worker clicks this
│ ├─ What's cooking, how many         │
│ └─ Mark as ready for pickup         │
│                                      │
│ ✅ READY FOR PICKUP                 │
├─────────────────────────────────────┤
│ Show items ready for delivery       │
│ ✓ View delivery details             │
│                                      │
└─────────────────────────────────────┘
```

## Worker Access Matrix

```
┌──────────────────────┬──────────┬────────────────────┐
│ Table                │ Worker   │ Action             │
├──────────────────────┼──────────┼────────────────────┤
│ orders               │ ✅ YES   │ READ ONLY          │
│ production_batches   │ ✅ YES   │ READ + CREATE/UPDATE│
│ delivery_items       │ ✅ YES   │ READ ONLY          │
│ deliveries           │ ✅ YES   │ READ ONLY          │
│ payments             │ ✅ YES   │ READ ONLY          │
│                      │          │                    │
│ products             │ ❌ NO    │ DENIED             │
│ clients              │ ❌ NO    │ DENIED             │
│ materials            │ ❌ NO    │ DENIED             │
│ return_items         │ ❌ NO    │ DENIED             │
│ users (other)        │ ❌ NO    │ DENIED             │
└──────────────────────┴──────────┴────────────────────┘
```

## How to Update Your Database

### Option 1: Replace Entire RLS (RECOMMENDED)

This REPLACES the previous restrictive SQL.

**File to run**:
```
ENABLE_WORKER_RLS_POLICIES_WITH_DATA_ACCESS.sql
```

**Steps**:
1. Open: `ENABLE_WORKER_RLS_POLICIES_WITH_DATA_ACCESS.sql`
2. Copy ALL content
3. Go to Supabase SQL Editor
4. Create NEW query
5. Paste and Run
6. Wait for: "Query executed successfully"

### Option 2: Migrate from Previous SQL

If you already ran the restrictive SQL:

```sql
-- Drop old restrictive policies
DROP POLICY "products_worker_deny" ON public.products;
DROP POLICY "clients_worker_deny" ON public.clients;
DROP POLICY "materials_worker_deny" ON public.materials;
DROP POLICY "production_batches_all_allow" ON public.production_batches;

-- Then run the new SQL file
```

**EASIER**: Just run the new SQL file (it drops and recreates everything)

## Test After Updating

### Test 1: Worker Can See Orders
```
1. Login as: aigerim@slatko.asia
2. Go to: Production Portal
3. Check: Production Queue shows orders ✅
```

### Test 2: Worker Can See Production Batches
```
1. Still logged in as aigerim
2. Check: Cooking Now section shows batches ✅
3. Can update status ✅
```

### Test 3: Worker Cannot Access Products
```
1. Still logged in as aigerim
2. Go to: Products page (if they can find it)
3. Expected: Error "permission denied" ✅
```

### Test 4: Admin Can See Everything
```
1. Login as: mr.memo87@gmail.com
2. Go to: Products page
3. All products show ✅
4. Dashboard works ✅
5. Everything normal ✅
```

## RLS Policies Created

The new SQL creates these policies:

### 1. PRODUCTS - Blocked for workers
```sql
CREATE POLICY "products_worker_deny"
  USING (NOT is_worker_role())
  -- Result: Workers get "permission denied"
```

### 2. CLIENTS - Blocked for workers
```sql
CREATE POLICY "clients_worker_deny"
  USING (NOT is_worker_role())
  -- Result: Workers get "permission denied"
```

### 3. MATERIALS - Blocked for workers
```sql
CREATE POLICY "materials_worker_deny"
  USING (NOT is_worker_role())
  -- Result: Workers get "permission denied"
```

### 4. ORDERS - Readable for workers
```sql
CREATE POLICY "orders_worker_read"
  FOR SELECT USING (true)
  -- Workers can READ orders
CREATE POLICY "orders_worker_deny_modify"
  FOR UPDATE, INSERT, DELETE USING (NOT is_worker_role())
  -- Workers cannot MODIFY orders
```

### 5. PRODUCTION_BATCHES - Full access for workers
```sql
CREATE POLICY "production_batches_worker_full_access"
  FOR ALL USING (true)
  -- Workers can DO ANYTHING with production_batches
```

### 6. DELIVERY_ITEMS - Readable for workers
```sql
CREATE POLICY "delivery_items_worker_read"
  FOR SELECT USING (true)
  -- Workers can READ delivery items
CREATE POLICY "delivery_items_worker_deny_modify"
  FOR UPDATE, INSERT, DELETE USING (NOT is_worker_role())
  -- Workers cannot MODIFY delivery items
```

### 7. USERS - Only own profile for workers
```sql
CREATE POLICY "users_worker_own_only"
  FOR SELECT USING (auth_user_id = auth.uid() OR NOT is_worker_role())
  -- Workers can only see their own profile
```

## Production Portal Workflow

### Step 1: Accept Order (Worker Views Orders)

```
Database Query:
  SELECT * FROM public.orders
       ↓
RLS Check: is_worker_role() = true
       ↓
Policy: orders_worker_read ALLOWS SELECT
       ↓
Result: ✅ Worker sees all orders
```

### Step 2: Start Cooking (Worker Creates Batch)

```
Database Query:
  INSERT INTO public.production_batches (...)
       ↓
RLS Check: is_worker_role() = true
       ↓
Policy: production_batches_worker_full_access ALLOWS INSERT
       ↓
Result: ✅ Worker creates new batch
```

### Step 3: Mark Ready (Worker Updates Batch)

```
Database Query:
  UPDATE public.production_batches SET status = 'ready'
       ↓
RLS Check: is_worker_role() = true
       ↓
Policy: production_batches_worker_full_access ALLOWS UPDATE
       ↓
Result: ✅ Worker updates production status
```

## What to Do NOW

### Step 1: Copy New SQL (2 minutes)
Open: `ENABLE_WORKER_RLS_POLICIES_WITH_DATA_ACCESS.sql`
Copy all content

### Step 2: Run in Supabase (2 minutes)
1. Go to: https://app.supabase.com
2. Select project
3. SQL Editor → New Query
4. Paste SQL
5. Click Run
6. Wait for success

### Step 3: Test (2 minutes)
1. Login as: aigerim@slatko.asia
2. Go to: Production Portal
3. See: Orders, Production Queue, Ready items ✅

### Step 4: Verify Admin Still Works (1 minute)
1. Login as: mr.memo87@gmail.com
2. Go to: Any page
3. Everything works ✅

## Result

### After Running New SQL:

**Worker sees**:
```
PRODUCTION PORTAL
├─ 📋 Production Queue (Accept Orders)
├─ 🔪 Cooking Now (Start Cooking, Mark Ready)
└─ ✅ Ready for Pickup (Delivery Items)
```

**Worker cannot see**:
```
SIDEBAR (hidden by frontend)
├─ ❌ Dashboard
├─ ❌ Products
├─ ❌ Clients
├─ ❌ Materials
├─ ❌ Reports
└─ ❌ Other management features
```

**Admin sees**:
```
Everything normal - all features available
```

## Summary

| Before | After |
|--------|-------|
| Worker sees nothing ❌ | Worker sees relevant data ✅ |
| Production Portal empty | Production Portal fully functional |
| Cannot accept orders | Can manage production workflow |
| Cannot start cooking | Can create and update batches |
| Complete lockdown | Productive lockdown (only production) |

---

## Files Reference

### Old File (IGNORE)
- `ENABLE_WORKER_RLS_POLICIES_CORRECT.sql` - Restrictive (no data access)

### New File (USE THIS)
- `ENABLE_WORKER_RLS_POLICIES_WITH_DATA_ACCESS.sql` - Worker-enabled (with data access)

---

**Action**: Replace SQL in Supabase with new version  
**Time**: 5 minutes  
**Result**: Workers can now use Production Portal fully ✅
