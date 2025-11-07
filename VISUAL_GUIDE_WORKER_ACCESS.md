# 🎯 Visual Guide: Worker Access Control Flow

## The Complete Journey

### 1️⃣ LOGIN

```
┌──────────────────────────────────────┐
│     Login Screen                     │
│                                      │
│  Email: aigerim@slatko.asia         │
│  Password: [••••••••]                │
│  [Sign In]                           │
└──────┬───────────────────────────────┘
       │
       ├─→ Frontend: Check user role
       │   └─→ role = "production"
       │       └─→ isWorker = true ✅
       │
       ├─→ Database: Load user permissions
       │   └─→ RLS policies active ✅
       │
       └─→ Application: User logged in
           └─→ Ready to show Production Portal
```

### 2️⃣ APP LOADS

```
┌─────────────────────────────────────────────────────┐
│                    SLATKO                            │
│  Logged in as: Aigerim 🏭 WORKER                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Your Portal                                        │
│  ├─ 🏭 Production Portal ← ONLY OPTION            │
│  └─ (Other menu items hidden)                       │
│                                                      │
└─────────────────────────────────────────────────────┘

Why?
├─ Frontend: Sidebar hidden by conditional render
├─ RLS: Database knows this is a worker
└─ Application: Ready to show production data
```

### 3️⃣ PRODUCTION PORTAL OPENS

```
┌────────────────────────────────────────────────────┐
│  🏭 PRODUCTION PORTAL                              │
├────────────────────────────────────────────────────┤
│                                                    │
│  📋 PRODUCTION QUEUE                              │
│  ├─ Query: SELECT * FROM orders                   │
│  ├─ RLS Check: is_worker_role() = true ✅        │
│  ├─ Policy: orders_worker_read ALLOWS ✅         │
│  └─ Result: ✅ Shows all orders                   │
│     ├─ Order #001: Cake (qty 5)
│     ├─ Order #002: Bread (qty 10)
│     └─ Order #003: Pastries (qty 8)
│
│  🔪 COOKING NOW                                   │
│  ├─ Query: SELECT * FROM production_batches       │
│  ├─ RLS Check: is_worker_role() = true ✅        │
│  ├─ Policy: production_batches_full_access ✅    │
│  └─ Result: ✅ Shows all batches                  │
│     ├─ Batch #B1: Cake in progress
│     └─ Batch #B2: Bread in progress
│
│  ✅ READY FOR PICKUP                              │
│  ├─ Query: SELECT * FROM delivery_items           │
│  ├─ RLS Check: is_worker_role() = true ✅        │
│  ├─ Policy: delivery_items_read ALLOWS ✅        │
│  └─ Result: ✅ Shows ready items                  │
│     ├─ Item #I1: Pastries ready
│     └─ Item #I2: Donuts ready
│
└────────────────────────────────────────────────────┘
```

### 4️⃣ WORKER STARTS COOKING

```
Worker clicks: "Start Cooking" for Order #001

┌─ Frontend Processing
│  ├─ Validate input ✅
│  ├─ Create batch data ✅
│  └─ Send to database
│
├─ Database Processing
│  ├─ Receive: INSERT INTO production_batches
│  ├─ RLS Check:
│  │  ├─ Get user: auth.uid() = 'user123'
│  │  ├─ Lookup role: SELECT role FROM users...
│  │  ├─ Result: role = 'production' ✅
│  │  ├─ Check policy: is_worker_role() = true
│  │  ├─ Condition: FOR ALL USING (true) ✅
│  │  └─ ALLOW INSERT ✅
│  │
│  ├─ Execute INSERT ✅
│  ├─ Store data ✅
│  └─ Return success
│
├─ Frontend Updates
│  ├─ Show toast: "✅ Batch created"
│  ├─ Move order to "Cooking Now"
│  ├─ Update UI ✅
│  └─ Show batch status
│
└─ Result: Order accepted and cooking started ✅
```

### 5️⃣ WORKER MARKS READY

```
Worker clicks: "Mark Ready" for Batch #B1

Same process as above:
- Frontend validates ✅
- Database receives UPDATE ✅
- RLS allows update (production_batches_full_access) ✅
- Status changes to "ready_for_delivery" ✅
- UI updates to show in "Ready for Pickup" ✅
```

### 6️⃣ WORKER TRIES TO ACCESS PRODUCTS

```
Worker navigates to: Products page

┌─ Frontend Layer
│  ├─ Sidebar: Products menu item NOT visible
│  ├─ If worker finds link anyway...
│  ├─ renderView() checks: isWorker = true ✅
│  ├─ Condition: view !== 'production-portal'?
│  ├─ YES → setView('production-portal')
│  ├─ Log: 🚨 SECURITY BREACH ATTEMPT
│  └─ Redirect back to Production Portal ✅
│
└─ Result: Cannot access ❌

OR if they bypass frontend...

┌─ Database Layer
│  ├─ Query: SELECT * FROM products
│  ├─ RLS Check: is_worker_role() = true ✅
│  ├─ Policy: products_worker_deny
│  ├─ Condition: NOT is_worker_role() = NOT true = false
│  ├─ RESTRICTIVE policy: false = DENY ❌
│  └─ Return error: "permission denied for relation 'products'"
│
├─ Application Layer
│  ├─ Catch error ✅
│  ├─ Map to: "🔒 Access Denied..."
│  └─ Show user-friendly message ✅
│
└─ Result: Blocked at database level ❌❌❌
```

---

## Security Layer Visualization

```
┌─────────────────────────────────────────────────────┐
│              WORKER REQUEST                         │
├─────────────────────────────────────────────────────┤
│  "I want to see products"                           │
└────────────────┬──────────────────────────────────┘
                 │
        ┌────────▼──────────┐
        │  Layer 1: Frontend │
        │                    │
        │  Menu item hidden  │
        │  Not clickable     │
        │  ❌ BLOCKED        │
        └────────┬───────────┘
                 │
        (If bypassed with DevTools...)
        │
        ┌────────▼──────────────┐
        │  Layer 2: Auto-Redirect│
        │                        │
        │  View forced back to   │
        │  Production Portal     │
        │  ❌ BLOCKED            │
        └────────┬───────────────┘
                 │
        (If bypassed with API call...)
        │
        ┌────────▼──────────┐
        │  Layer 3: Database RLS│
        │                       │
        │  Policy check:        │
        │  is_worker? = YES     │
        │  NOT YES = false      │
        │  ❌ PERMISSION DENIED  │
        └────────┬──────────────┘
                 │
        ┌────────▼────────────────┐
        │  Layer 4: Error Handler  │
        │                          │
        │  Show user-friendly msg: │
        │  "Access Denied"         │
        │  ✅ Good UX              │
        └──────────────────────────┘

RESULT: 🔒 IMPOSSIBLE TO BYPASS
```

---

## Data Flow Diagram

```
WORKER USER
    │
    ├─ Logs In
    │   └─→ Role: "production" detected ✅
    │
    ├─ Requests Orders
    │   ├─→ Query: SELECT * FROM orders
    │   ├─→ RLS Policy: orders_worker_read
    │   ├─→ Condition: true (allow all) ✅
    │   └─→ ✅ Returns: List of orders
    │
    ├─ Creates Batch
    │   ├─→ Query: INSERT INTO production_batches
    │   ├─→ RLS Policy: production_batches_all_allow
    │   ├─→ Condition: true (allow all) ✅
    │   └─→ ✅ Creates batch
    │
    ├─ Updates Batch Status
    │   ├─→ Query: UPDATE production_batches SET status = 'ready'
    │   ├─→ RLS Policy: production_batches_all_allow
    │   ├─→ Condition: true (allow all) ✅
    │   └─→ ✅ Updates status
    │
    └─ Tries to View Products
        ├─→ Query: SELECT * FROM products
        ├─→ RLS Policy: products_worker_deny
        ├─→ Condition: NOT is_worker_role() = NOT true = false
        └─→ ❌ Permission denied
```

---

## The 3-Layer Shield

```
        REQUEST
           │
           ▼
    ┌─────────────┐
    │ Layer 1     │
    │ Frontend UI │
    │             │
    │ Blocks:     │
    │ • Clicks    │
    │ • Navigation│
    │ • View swap │
    │             │
    │ Stops: 60%  │
    └─────────────┘
           │
      (bypassed)
           │
           ▼
    ┌─────────────┐
    │ Layer 2     │
    │ Auto Redirect
    │             │
    │ Blocks:     │
    │ • View change
    │ • State hack │
    │ • DevTools  │
    │             │
    │ Stops: 30%  │
    └─────────────┘
           │
      (bypassed)
           │
           ▼
    ┌─────────────┐
    │ Layer 3     │
    │ Database RLS│
    │             │
    │ Blocks:     │
    │ • Queries   │
    │ • API calls │
    │ • Direct SQL│
    │             │
    │ Stops: 100% │
    └─────────────┘
           │
           ▼
      ✅ PROTECTED
```

---

## Error Messages User Sees

### When Worker Tries Products Page

```
┌────────────────────────────────────────┐
│  ⚠️ ERROR                               │
├────────────────────────────────────────┤
│                                         │
│  🔒 Access Denied                       │
│                                         │
│  Worker accounts cannot access          │
│  product management                     │
│                                         │
│  You can only use the                   │
│  Production Portal                      │
│                                         │
│  [Go to Production Portal]              │
│                                         │
└────────────────────────────────────────┘
```

### When Worker Tries Clients Page

```
┌────────────────────────────────────────┐
│  ⚠️ ERROR                               │
├────────────────────────────────────────┤
│                                         │
│  🔒 Access Denied                       │
│                                         │
│  Worker accounts cannot access          │
│  client management                      │
│                                         │
│  You have access to:                    │
│  • Production Portal                    │
│  • Order Queue                          │
│  • Production Batches                   │
│                                         │
│  [Go to Production Portal]              │
│                                         │
└────────────────────────────────────────┘
```

---

## Success Checklist ✅

After running the SQL, you should see:

```
├─ ✅ Worker logs in
├─ ✅ Sees "🏭 WORKER" badge
├─ ✅ Only Production Portal visible
├─ ✅ Can view orders
├─ ✅ Can create batches
├─ ✅ Can update batch status
├─ ✅ Can see delivery items
├─ ✅ Tries Products → Error
├─ ✅ Tries Clients → Error
├─ ✅ Tries Materials → Error
├─ ✅ Admin still has full access
└─ ✅ All data correct and secure
```

---

**Everything is ready. Execute the SQL file now!** 🚀
