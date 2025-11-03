-- Enhanced Payment Management System for Return Policy and Flexible Payments
-- This migration extends the existing payment system to handle:
-- 1. Return policy (client pays for previous orders, not current)
-- 2. Flexible payment options (full/partial/later/skip/debt)
-- 3. Complete client payment records and debt tracking
-- 4. Payment history and balance management

-- First, let's enhance the existing payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'order_payment' 
  CHECK (payment_type IN ('order_payment', 'debt_payment', 'advance_payment', 'partial_payment'));

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed' 
  CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled'));

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.users(id);

-- Client Account Balance tracking (separate from orders)
CREATE TABLE IF NOT EXISTS public.client_account_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  current_balance DECIMAL(12,2) DEFAULT 0, -- Negative = debt, Positive = credit
  total_debt DECIMAL(12,2) DEFAULT 0,
  total_credit DECIMAL(12,2) DEFAULT 0,
  last_payment_date DATE,
  last_order_date DATE,
  payment_history_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order Payment Records (tracks which orders are paid/unpaid)
CREATE TABLE IF NOT EXISTS public.order_payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  order_total DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_remaining DECIMAL(10,2) GENERATED ALWAYS AS (order_total - amount_paid) STORED,
  payment_status VARCHAR(50) DEFAULT 'unpaid' 
    CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overpaid', 'waived')),
  payment_method VARCHAR(50),
  payment_date DATE,
  due_date DATE,
  is_return_policy_order BOOLEAN DEFAULT false, -- This order follows return policy
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment Transactions (detailed payment history)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL 
    CHECK (transaction_type IN ('payment_received', 'debt_created', 'debt_forgiven', 'credit_applied', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  related_delivery_id UUID REFERENCES public.deliveries(id),
  related_payment_id UUID REFERENCES public.payments(id),
  payment_method VARCHAR(50) DEFAULT 'cash' 
    CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check', 'mobile_payment', 'credit_note')),
  reference_number VARCHAR(100),
  description TEXT,
  recorded_by UUID REFERENCES public.users(id),
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Return Policy Settings (configurable per client)
CREATE TABLE IF NOT EXISTS public.client_return_policy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  policy_enabled BOOLEAN DEFAULT true,
  payment_delay_orders INTEGER DEFAULT 1, -- Client pays after X orders
  auto_debt_management BOOLEAN DEFAULT true,
  max_debt_limit DECIMAL(12,2) DEFAULT 1000,
  payment_reminder_days INTEGER DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Settlement Records (tracks settlement sessions and what was collected)
CREATE TABLE IF NOT EXISTS public.settlement_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.users(id),
  settlement_type VARCHAR(50) DEFAULT 'order_delivery' 
    CHECK (settlement_type IN ('order_delivery', 'debt_collection', 'routine_collection')),
  
  -- What was available to collect
  orders_to_collect JSONB DEFAULT '[]', -- Array of order IDs that could be paid
  total_collectible DECIMAL(12,2) DEFAULT 0,
  
  -- What was actually collected
  amount_collected DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_reference VARCHAR(100),
  
  -- Settlement outcome
  settlement_status VARCHAR(50) DEFAULT 'completed' 
    CHECK (settlement_status IN ('pending', 'completed', 'partial', 'no_payment', 'failed')),
  
  notes TEXT,
  settlement_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_account_balance_client_id ON public.client_account_balance(client_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_records_client_id ON public.order_payment_records(client_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_records_delivery_id ON public.order_payment_records(delivery_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_id ON public.payment_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON public.payment_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_settlement_sessions_client_id ON public.settlement_sessions(client_id);

-- Enable RLS
ALTER TABLE public.client_account_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_return_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can access client account balance" ON public.client_account_balance
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access order payment records" ON public.order_payment_records
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access payment transactions" ON public.payment_transactions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access client return policy" ON public.client_return_policy
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access settlement sessions" ON public.settlement_sessions
  FOR ALL USING (auth.role() = 'authenticated');

-- Functions for automatic balance updates
CREATE OR REPLACE FUNCTION update_client_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update client account balance when payment transactions change
  UPDATE public.client_account_balance 
  SET 
    current_balance = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('payment_received', 'credit_applied') THEN amount
          WHEN transaction_type IN ('debt_created') THEN -amount
          ELSE 0
        END
      ), 0)
      FROM public.payment_transactions 
      WHERE client_id = NEW.client_id
    ),
    total_debt = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.payment_transactions 
      WHERE client_id = NEW.client_id AND transaction_type = 'debt_created'
    ),
    total_credit = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.payment_transactions 
      WHERE client_id = NEW.client_id AND transaction_type IN ('payment_received', 'credit_applied')
    ),
    last_payment_date = (
      SELECT MAX(transaction_date)
      FROM public.payment_transactions 
      WHERE client_id = NEW.client_id AND transaction_type = 'payment_received'
    ),
    updated_at = now()
  WHERE client_id = NEW.client_id;
  
  -- Create balance record if it doesn't exist
  INSERT INTO public.client_account_balance (client_id)
  VALUES (NEW.client_id)
  ON CONFLICT (client_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update balances
DROP TRIGGER IF EXISTS trigger_update_client_balance ON public.payment_transactions;
CREATE TRIGGER trigger_update_client_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_client_balance();

-- Function to create order payment record automatically
CREATE OR REPLACE FUNCTION create_order_payment_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Create payment record when new delivery is created
  INSERT INTO public.order_payment_records (
    delivery_id, 
    client_id, 
    order_total,
    is_return_policy_order
  )
  SELECT 
    NEW.id,
    NEW.client_id,
    COALESCE(SUM(di.quantity * di.price), 0),
    true -- Default to return policy
  FROM public.delivery_items di
  WHERE di.delivery_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create payment records for new orders
DROP TRIGGER IF EXISTS trigger_create_order_payment_record ON public.deliveries;
CREATE TRIGGER trigger_create_order_payment_record
  AFTER INSERT ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION create_order_payment_record();