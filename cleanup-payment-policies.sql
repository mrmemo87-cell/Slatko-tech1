-- Cleanup script to remove all existing payment management policies
-- Run this FIRST before running the main migrations

-- Drop all existing policies for payment management tables (both old and new policy names)
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

-- Fix settlement_sessions driver_id foreign key constraint (make it optional/nullable)
ALTER TABLE public.settlement_sessions 
  ALTER COLUMN driver_id DROP NOT NULL;

-- Also drop the foreign key constraint if it's causing issues
ALTER TABLE public.settlement_sessions 
  DROP CONSTRAINT IF EXISTS settlement_sessions_driver_id_fkey;

-- Temporarily disable RLS to verify table access
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

-- Create new permissive policies
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
