# Payment Management System Setup Guide

## Overview

The payment management system handles your **return policy** business model where clients don't pay for the current order being delivered, but for previous orders. It supports flexible payment options including full payment, partial payment, later payment, and debt tracking.

## Key Features

### 🔄 **Return Policy Support**
- Clients pay for previous orders, not the current delivery
- Configurable payment delay (default: 1 order behind)
- Automatic debt tracking for unpaid orders

### 💰 **Flexible Payment Options**
- **Full Payment**: Collect full amount due
- **Partial Payment**: Collect partial amount, rest becomes debt
- **No Payment**: Add all due amounts to client debt
- **Skip Payment**: Keep existing debt, no new transactions

### 📊 **Comprehensive Tracking**
- Client account balances (debt/credit)
- Order payment status (unpaid/partial/paid)
- Payment transaction history
- Settlement session records

### 📋 **Client Payment Sheets**
- Complete payment overview per client
- All unpaid orders with due amounts
- Recent payment transactions
- Settlement history
- Return policy settings

## Database Setup

### 1. Run Payment Migration

Execute the payment management migration in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content of payment-management-migration.sql
-- This creates all necessary tables and functions
```

### 2. Core Tables Created

- `client_account_balance`: Current balance per client
- `order_payment_records`: Payment status per order
- `payment_transactions`: Detailed payment history
- `client_return_policy`: Return policy settings per client
- `settlement_sessions`: Settlement records

## How It Works

### 🚀 **Order Creation**
1. New order placed → Automatic payment record created
2. Order marked as unpaid initially
3. Return policy applies (payment deferred)

### 🚚 **Delivery & Settlement**
1. Driver completes delivery
2. Clicks "Start Settlement" → Opens Payment Manager
3. System shows which orders to collect payment for (previous orders)
4. Driver selects payment option:
   - **Full Payment**: Pays all outstanding orders
   - **Partial Payment**: Pays portion, rest becomes debt
   - **No Payment**: All amounts become debt
   - **Skip Payment**: Keep as debt for later

### 💳 **Payment Processing**
1. Payment applied to oldest orders first (FIFO)
2. Excess payment becomes client credit
3. Unpaid amounts become client debt
4. All transactions recorded with details

### 📊 **Payment Tracking**
1. **Client Balance**: Shows total debt/credit
2. **Order Status**: Tracks payment per order
3. **Transaction History**: Complete payment log
4. **Settlement Records**: Each settlement session logged

## User Interface

### 🚛 **Delivery Portal Features**
- **Payment Sheet Button**: View complete client payment history
- **Settlement Manager**: Handle payment collection with return policy
- **Smart Actions**: Context-aware buttons based on order status

### 📋 **Payment Manager Modal**
- Shows client balance overview
- Lists orders available for collection (return policy)
- Payment options (full/partial/no payment/skip)
- Payment method selection
- Reference tracking
- Notes support

### 📊 **Client Payment Sheet**
- **Overview Tab**: Balance summary, policy settings, quick stats
- **Orders Tab**: All unpaid orders with details
- **Transactions Tab**: Complete payment history
- **Settlements Tab**: Settlement session history

## Return Policy Configuration

### Per-Client Settings
```sql
-- Enable return policy for a client
INSERT INTO client_return_policy (client_id, policy_enabled, payment_delay_orders, max_debt_limit)
VALUES ('client-uuid', true, 1, 1000);
```

### Default Behavior
- **Policy Enabled**: true (return policy active)
- **Payment Delay**: 1 order (pay for previous order)
- **Debt Limit**: $1000 (configurable per client)

## Payment Workflow Examples

### 📝 **Scenario 1: Full Payment**
1. Client owes $150 from 2 previous orders
2. Driver delivers new order worth $75
3. Settlement: Collect $150 for previous orders
4. New order ($75) becomes unpaid (return policy)
5. Client balance: $0, Previous orders: paid, New order: unpaid

### 📝 **Scenario 2: Partial Payment**
1. Client owes $150 from 2 previous orders
2. Driver delivers new order worth $75
3. Settlement: Client pays $100 (partial)
4. $100 applied to oldest order first
5. Client balance: -$50 debt, New order: unpaid

### 📝 **Scenario 3: No Payment (Add to Debt)**
1. Client owes $150 from 2 previous orders
2. Driver delivers new order worth $75
3. Settlement: No payment collected
4. All amounts become debt
5. Client balance: -$150 debt, New order: unpaid

## Error Handling

### ⚠️ **Safe Operations**
- All database operations use transactions
- Automatic balance updates via triggers
- Defensive programming prevents crashes
- Comprehensive error logging

### 🔒 **Data Integrity**
- Foreign key constraints ensure data consistency
- Check constraints validate payment amounts
- RLS (Row Level Security) enabled
- Automatic audit trails

## Testing the System

### ✅ **End-to-End Test**
1. Create new order via Quick Order
2. Process through Production Portal
3. Assign driver in Delivery Portal
4. Complete delivery
5. Start settlement → Payment Manager opens
6. Test different payment scenarios
7. Verify client payment sheet accuracy

### 🔍 **What to Verify**
- [ ] Return policy logic works (pay previous orders)
- [ ] Payment options all function correctly
- [ ] Client balances update automatically
- [ ] Transaction history records properly
- [ ] Settlement sessions save correctly
- [ ] Client payment sheets show accurate data

## Troubleshooting

### 🐛 **Common Issues**
- **Migration Errors**: Ensure Supabase connection is active
- **Payment Not Recorded**: Check transaction logs in database
- **Balance Not Updating**: Verify triggers are enabled
- **UI Not Loading**: Check browser console for errors

### 📞 **Support**
- All payment operations are logged
- Check `payment_transactions` table for audit trail
- Settlement sessions in `settlement_sessions` table
- Client balances in `client_account_balance` table

---

## 🎯 **Quick Start Checklist**

1. ✅ Run `payment-management-migration.sql` in Supabase
2. ✅ Test order creation → payment record automatically created
3. ✅ Test delivery → settlement workflow opens Payment Manager
4. ✅ Test payment collection → transactions recorded correctly
5. ✅ Test client payment sheet → shows complete payment history
6. ✅ Verify return policy → pays previous orders, not current

**Your payment management system is now ready for production! 🚀**