# 🚨 CRITICAL: Database Schema Setup Required

## ⚠️ Issue: Missing Workflow Columns

The system requires workflow-tracking columns in the database that are not present in the current Supabase schema. This causes the error:

```
Error starting production: Could not find the 'production_start_time' column of 'deliveries' in the schema cache
```

## 🔧 **IMMEDIATE FIX REQUIRED:**

### Step 1: Run the Workflow Migration

**In your Supabase Dashboard:**

1. Go to **SQL Editor**
2. Copy and paste the entire contents of `workflow-migration.sql`
3. Click **Run** to execute the migration
4. Wait for "Success" message

### Step 2: Verify Schema Update

Run this query to verify the columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'deliveries' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Expected new columns:**
- `workflow_stage` (VARCHAR, DEFAULT 'order_placed')
- `assigned_driver` (VARCHAR)
- `production_notes` (TEXT)
- `delivery_notes` (TEXT)
- `production_start_time` (TIMESTAMP)
- `production_completed_time` (TIMESTAMP)
- `delivery_completed_time` (TIMESTAMP)
- `estimated_delivery_time` (TIMESTAMP)
- `actual_delivery_time` (TIMESTAMP)
- `quality_score` (INTEGER)

### Step 3: Refresh Schema Cache

Run this to refresh Supabase's schema cache:

```sql
NOTIFY pgrst, 'reload schema';
```

## 🏗️ **What the Migration Adds:**

### Enhanced Deliveries Table
- **Workflow tracking** columns for complete order lifecycle
- **Time tracking** for production and delivery stages  
- **Quality control** with scoring and notes
- **Driver assignment** for delivery management

### New Workflow Tables
- **`workflow_events`** - Complete audit trail of all workflow changes
- **`production_tasks`** - Detailed production task management
- **`delivery_routes`** - Route planning and optimization
- **`route_deliveries`** - Junction table for route assignments
- **`settlement_details`** - Financial settlement tracking

### Performance Indexes
- Optimized queries for workflow stages
- Fast lookups by driver assignments
- Efficient date-based filtering for reports

### Security (RLS Policies)
- Proper row-level security for all new tables
- Authenticated user access controls
- Data protection for sensitive workflow information

## 🎯 **After Migration:**

1. **Production Portal** will show orders with proper workflow tracking
2. **Delivery Portal** will handle assignments and routes
3. **Admin Portal** will display complete workflow analytics
4. **Order Tracking** will show real-time progress
5. **All errors should be resolved** ✅

## 📋 **For New Installations:**

Use the updated `supabase-schema.sql` which now includes all workflow columns by default.

---

**⚡ This migration is SAFE to run - it only adds columns and tables, never removes existing data.**