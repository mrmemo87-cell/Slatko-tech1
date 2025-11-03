-- ================================================================
-- SLATKO CONFECTIONERY - COMPLETE DATABASE SETUP
-- Single comprehensive migration for clean setup
-- ================================================================

-- ================================================================
-- PART 1: DROP ALL EXISTING POLICIES (Clean Slate)
-- ================================================================

DROP POLICY IF EXISTS "Authenticated users can access client account balance" ON public.client_account_balance;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.client_account_balance;
DROP POLICY IF EXISTS "Authenticated users can access order payment records" ON public.order_payment_records;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.order_payment_records;
DROP POLICY IF EXISTS "Authenticated users can access payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.payment_transactions;
DROP POLICY IF EXISTS "Authenticated users can access client return policy" ON public.client_return_policy;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.client_return_policy;
DROP POLICY IF EXISTS "Authenticated users can access settlement sessions" ON public.settlement_sessions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.settlement_sessions;
DROP POLICY IF EXISTS "Authenticated users can access order returns" ON public.order_returns;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.order_returns;
DROP POLICY IF EXISTS "Authenticated users can access return line items" ON public.return_line_items;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.return_line_items;

-- ================================================================
-- PART 2: PAYMENT MANAGEMENT TABLES
-- ================================================================

-- Client Account Balance (tracks overall debt/credit)
CREATE TABLE IF NOT EXISTS public.client_account_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  current_balance DECIMAL(12,2) DEFAULT 0,
  total_debt DECIMAL(12,2) DEFAULT 0,
  total_credit DECIMAL(12,2) DEFAULT 0,
  last_payment_date DATE,
  last_order_date DATE,
  payment_history_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order Payment Records (tracks payment status per order)
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
  is_return_policy_order BOOLEAN DEFAULT false,
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
  related_return_id UUID REFERENCES public.order_returns(id),
  payment_method VARCHAR(50) DEFAULT 'cash' 
    CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check', 'mobile_payment', 'credit_note')),
  reference_number VARCHAR(100),
  description TEXT,
  recorded_by UUID,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client Return Policy Settings
CREATE TABLE IF NOT EXISTS public.client_return_policy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  policy_enabled BOOLEAN DEFAULT true,
  payment_delay_orders INTEGER DEFAULT 1,
  auto_debt_management BOOLEAN DEFAULT true,
  max_debt_limit DECIMAL(12,2) DEFAULT 1000,
  payment_reminder_days INTEGER DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Settlement Sessions (tracks settlement records)
CREATE TABLE IF NOT EXISTS public.settlement_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  driver_id UUID,
  settlement_type VARCHAR(50) DEFAULT 'order_delivery' 
    CHECK (settlement_type IN ('order_delivery', 'debt_collection', 'routine_collection')),
  orders_to_collect JSONB DEFAULT '[]',
  total_collectible DECIMAL(12,2) DEFAULT 0,
  amount_collected DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_reference VARCHAR(100),
  settlement_status VARCHAR(50) DEFAULT 'completed' 
    CHECK (settlement_status IN ('pending', 'completed', 'partial', 'no_payment', 'failed')),
  notes TEXT,
  settlement_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- PART 3: RETURNS MANAGEMENT TABLES
-- ================================================================

-- Order Returns (tracks returned items)
CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  return_delivery_id UUID REFERENCES public.deliveries(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  return_type VARCHAR(50) DEFAULT 'unsold_return' 
    CHECK (return_type IN ('unsold_return', 'quality_issue', 'wrong_item', 'customer_request', 'damaged')),
  return_date DATE DEFAULT CURRENT_DATE,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Return Line Items (specific items returned)
CREATE TABLE IF NOT EXISTS public.return_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID REFERENCES public.order_returns(id) ON DELETE CASCADE,
  original_delivery_item_id UUID,
  product_name VARCHAR(255) NOT NULL,
  quantity_returned DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_credit_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity_returned * unit_price) STORED,
  condition VARCHAR(50) DEFAULT 'good' 
    CHECK (condition IN ('good', 'damaged', 'expired', 'unsellable')),
  restockable BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_client_account_balance_client_id ON public.client_account_balance(client_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_records_client_id ON public.order_payment_records(client_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_records_delivery_id ON public.order_payment_records(delivery_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_id ON public.payment_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON public.payment_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_settlement_sessions_client_id ON public.settlement_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_original_delivery ON public.order_returns(original_delivery_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_client_id ON public.order_returns(client_id);
CREATE INDEX IF NOT EXISTS idx_return_line_items_return_id ON public.return_line_items(return_id);

-- ================================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Disable RLS temporarily
ALTER TABLE public.client_account_balance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payment_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_return_policy DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_line_items DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.client_account_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_return_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_line_items ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all authenticated users
CREATE POLICY "Allow all for authenticated users" ON public.client_account_balance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.order_payment_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.payment_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.client_return_policy
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.settlement_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.order_returns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.return_line_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================================
-- PART 6: HELPER VIEWS
-- ================================================================

-- Order Payment Status with Returns
CREATE OR REPLACE VIEW public.order_payment_status_with_returns AS
SELECT 
  opr.*,
  COALESCE(returns.total_returns_credit, 0) as total_returns_credit,
  (opr.order_total - COALESCE(returns.total_returns_credit, 0)) as adjusted_order_total,
  (opr.order_total - COALESCE(returns.total_returns_credit, 0) - opr.amount_paid) as net_amount_due,
  CASE 
    WHEN (opr.order_total - COALESCE(returns.total_returns_credit, 0) - opr.amount_paid) <= 0 THEN 'paid'
    WHEN opr.amount_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END as adjusted_payment_status
FROM public.order_payment_records opr
LEFT JOIN (
  SELECT 
    r.original_delivery_id,
    SUM(rl.total_credit_amount) as total_returns_credit
  FROM public.order_returns r
  JOIN public.return_line_items rl ON r.id = rl.return_id
  GROUP BY r.original_delivery_id
) returns ON opr.delivery_id = returns.original_delivery_id;

-- Grant view permissions
GRANT SELECT ON public.order_payment_status_with_returns TO authenticated;

-- ================================================================
-- SETUP COMPLETE
-- ================================================================
