# ⚠️ CRITICAL: Worker Access Control - Database RLS Required

## The Problem

The worker user `aigerim@slatko.asia` **can currently access everything** because:

1. ✅ **Frontend UI layer** restricts access (sidebar/navigation hidden)
2. ❌ **Database layer** does NOT restrict access (RLS not enabled)
3. ❌ **API queries** still execute and return data to workers

**Current State**: Frontend restriction only = INSUFFICIENT for production

## The Solution

You must implement **Row-Level Security (RLS) policies** at the database level to:
- Block workers from querying restricted tables
- Return "permission denied" errors at the database
- Ensure NO DATA leaks to workers regardless of how they query

## What Needs To Happen

### Step 1: Execute RLS Policies in Supabase

Go to your Supabase dashboard and run this SQL:

**File**: `ENABLE_WORKER_RLS_POLICIES_CORRECT.sql`

This will:
- Enable RLS on all critical tables
- Create a helper function `is_worker_role()`
- Add RESTRICTIVE policies that block worker access
- Allow workers to only access production_batches table

### Step 2: Verify RLS is Working

After running the SQL, test by logging in as `aigerim@slatko.asia`:

**Expected Behavior**:
- ❌ Products page shows error "permission denied"
- ❌ Clients page shows error "permission denied"
- ❌ Materials page shows error "permission denied"
- ✅ Production Portal works fine

**Current Behavior**:
- ✅ All pages work (= SECURITY HOLE)

## RLS Policy Details

### Worker-Restricted Tables (DENY all access)
```
- products         ← Workers cannot view/edit
- clients          ← Workers cannot view/edit
- materials        ← Workers cannot view/edit
- deliveries       ← Workers cannot view/edit
- payments         ← Workers cannot view/edit
- return_items     ← Workers cannot view/edit
```

### Worker-Allowed Tables (ALLOW access)
```
- production_batches ← Workers CAN view/edit
- orders             ← Workers CAN view (read-only)
```

## How RLS Works

```
Worker tries to query: SELECT * FROM products
            ↓
Database checks RLS policy: is_worker_role() = true
            ↓
Condition: NOT is_worker_role() = NOT true = false
            ↓
RESTRICTIVE policy blocks = false
            ↓
❌ Error: permission denied (access restricted)
            ↓
❌ No data returned to user
```

## Implementation Steps (DO THIS NOW)

### 1. Open Supabase Console
1. Go to: https://app.supabase.com
2. Select your project
3. Go to: SQL Editor

### 2. Copy the SQL
```sql
-- Copy ALL content from: ENABLE_WORKER_RLS_POLICIES_CORRECT.sql
```

### 3. Create New Query
- Click "New Query"
- Paste the SQL
- Click "Run"
- Wait for success message

### 4. Verify RLS is Enabled
Run this check query:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN 
('products', 'clients', 'materials', 'deliveries', 'payments');
```

### 5. List All Policies
```sql
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### 6. Test as Worker
- Log out
- Log in as: `aigerim@slatko.asia`
- Try to view Products
- Should see error: ❌ "permission denied"
- Production Portal should still work: ✅

## Frontend Error Handling

The frontend will show better error messages once RLS blocks access:

```tsx
// In console you'll see:
❌ Products query failed: Error: permission denied for relation products

// User will see:
"Error loading data: You don't have permission to access this resource"
```

## Verification Checklist

After implementing RLS:

- [ ] SQL executed successfully in Supabase
- [ ] RLS policies appear in pg_policies
- [ ] Log in as worker (aigerim@slatko.asia)
- [ ] Try Products page → See error ❌
- [ ] Try Clients page → See error ❌
- [ ] Try Production Portal → Works ✅
- [ ] Log in as non-worker (mr.memo87@gmail.com)
- [ ] All pages work normally ✅

## Files Provided

1. **ENABLE_WORKER_RLS_POLICIES_CORRECT.sql** ← USE THIS ONE
   - Correct version with role checking
   - Checks public.users.role field
   - Complete policy setup

2. **ENABLE_WORKER_RLS_POLICIES.sql** (old version, ignore)

## Security Layer Summary

### Frontend (Already Done ✅)
- [x] Sidebar navigation hidden
- [x] Menu items blocked
- [x] View rendering guarded
- [x] Auto-redirect active

### Database (NEEDS TO BE DONE ❌)
- [ ] RLS enabled on tables
- [ ] Worker policies created
- [ ] Access restricted at DB level

### Current Status
```
┌─ Frontend Protection: ✅ ACTIVE
│
├─ Database Protection: ❌ MISSING
│
└─ Result: 🔓 SECURITY HOLE - Workers can access everything via database
```

## What Happens After RLS

### Worker tries to view Products:

1. **Frontend**: UI hides "Products" menu ✅
2. **Frontend**: User can't navigate there ✅
3. **Frontend**: If they somehow bypass it...
4. **Database**: Query rejected ✅
5. **Frontend**: Error message shown ✅
6. **User**: Cannot access, gets error ✅

## Timeline

- **Now - This session**: Frontend protection + awareness ✅
- **Next - URGENT**: Run RLS SQL in Supabase ❌ DO THIS FIRST
- **After RLS**: Full 3-layer protection active ✅

## Questions?

Check: `WORKER_ACCESS_QUICK_REFERENCE.md` for more details

Or run this query to verify your setup:
```sql
SELECT 
  u.id,
  u.email,
  u.role,
  'Ready for RLS' as status
FROM auth.users u
LEFT JOIN public.users pu ON pu.auth_user_id = u.id
WHERE u.email IN ('aigerim@slatko.asia', 'mr.memo87@gmail.com');
```

---

## 🔴 URGENT ACTION REQUIRED

The worker can currently access EVERYTHING. You MUST:

1. Open Supabase dashboard NOW
2. Go to SQL Editor
3. Copy content from `ENABLE_WORKER_RLS_POLICIES_CORRECT.sql`
4. Run the SQL
5. Test that worker cannot access products/clients
6. Verify Production Portal still works

**Do not deploy to production without this RLS protection.**

---

**Status**: ⚠️ FRONTEND ONLY (Database protection needed)  
**Severity**: 🔴 HIGH - Security hole exists  
**Action**: Execute SQL file in Supabase SQL Editor  
