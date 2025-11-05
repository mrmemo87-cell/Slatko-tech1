# Actual Database Schema Reference

## Core Tables (Single Source of Truth)

### payments
```sql
CREATE TABLE public.payments (
  id UUID PRIMARY KEY,
  delivery_id UUID REFERENCES deliveries(id),
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) DEFAULT 'cash',  -- NOT payment_method!
  reference VARCHAR(100),              -- NOT reference_number!
  date DATE NOT NULL,                  -- NOT payment_date!
  created_at TIMESTAMP
);
```
**Note:** Does NOT have `client_id` or `notes` columns!

### return_items
```sql
CREATE TABLE public.return_items (
  id UUID PRIMARY KEY,
  delivery_id UUID REFERENCES deliveries(id),
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10,3) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP
);
```
**Note:** Does NOT have `restockable`, `condition`, or `unit_price` columns!

### deliveries
```sql
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  delivery_date DATE,
  payment_status VARCHAR(20),    -- 'pending', 'partial', 'paid'
  payment_method VARCHAR(50),
  workflow_stage VARCHAR(50),
  -- ... other columns
);
```

### delivery_items
```sql
CREATE TABLE public.delivery_items (
  id UUID PRIMARY KEY,
  delivery_id UUID REFERENCES deliveries(id),
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10,3),
  unit_price DECIMAL(10,2),
  -- ... other columns
);
```

## Code Mappings

When inserting into `payments` table, use:
- `date` (not `payment_date`)
- `method` (not `payment_method`)
- `reference` (not `reference_number`)
- Only `delivery_id`, no `client_id`

When inserting into `return_items` table, use:
- `delivery_id`
- `product_id`
- `quantity`
- `reason`
- That's it! No other columns exist.

## Deleted Tables (DO NOT USE)
- ❌ `order_payment_records`
- ❌ `payment_transactions`
- ❌ `settlement_sessions`
- ❌ `client_account_balance`
- ❌ `client_return_policy`
- ❌ `order_returns`
- ❌ `settlement_details`
