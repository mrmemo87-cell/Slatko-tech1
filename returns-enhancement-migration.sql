-- Returns and Exchanges Enhancement for Payment Management System
-- This extends the payment system to handle:
-- 1. Item returns during delivery (unsold pieces from previous orders)
-- 2. Automatic adjustment of payment amounts for returned items
-- 3. Return tracking and inventory management
-- 4. Credit adjustments for returned items

-- Order Return Records (tracks returned items)
CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  return_delivery_id UUID REFERENCES public.deliveries(id), -- The delivery when items were returned
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  return_type VARCHAR(50) DEFAULT 'unsold_return' 
    CHECK (return_type IN ('unsold_return', 'quality_issue', 'wrong_item', 'customer_request', 'damaged')),
  return_date DATE DEFAULT CURRENT_DATE,
  processed_by UUID REFERENCES public.users(id), -- Driver who processed the return
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Return Line Items (specific items and quantities returned)
CREATE TABLE IF NOT EXISTS public.return_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID REFERENCES public.order_returns(id) ON DELETE CASCADE,
  original_delivery_item_id UUID, -- Reference to original delivery_items
  product_name VARCHAR(255) NOT NULL,
  quantity_returned DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_credit_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity_returned * unit_price) STORED,
  condition VARCHAR(50) DEFAULT 'good' 
    CHECK (condition IN ('good', 'damaged', 'expired', 'unsellable')),
  restockable BOOLEAN DEFAULT true, -- Can this be put back in inventory?
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhance payment transactions to include return-related transactions
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS related_return_id UUID REFERENCES public.order_returns(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_returns_original_delivery ON public.order_returns(original_delivery_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_client_id ON public.order_returns(client_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_return_date ON public.order_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_return_line_items_return_id ON public.return_line_items(return_id);

-- Enable RLS
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can access order returns" ON public.order_returns
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access return line items" ON public.return_line_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Function to process returns and adjust payments
CREATE OR REPLACE FUNCTION process_return_and_adjust_payment()
RETURNS TRIGGER AS $$
DECLARE
  return_record RECORD;
  total_return_credit DECIMAL(10,2);
  original_payment_record RECORD;
BEGIN
  -- Get the return details
  SELECT * INTO return_record FROM public.order_returns WHERE id = NEW.return_id;
  
  -- Calculate total credit for this return item
  total_return_credit := NEW.total_credit_amount;
  
  -- Get the original order payment record
  SELECT * INTO original_payment_record 
  FROM public.order_payment_records 
  WHERE delivery_id = return_record.original_delivery_id;
  
  IF original_payment_record.id IS NOT NULL THEN
    -- Reduce the order total by the return amount
    UPDATE public.order_payment_records 
    SET 
      order_total = order_total - total_return_credit,
      notes = COALESCE(notes, '') || 
        CASE 
          WHEN COALESCE(notes, '') = '' THEN 'Return: ' || NEW.product_name || ' (' || NEW.quantity_returned || ' units)'
          ELSE '; Return: ' || NEW.product_name || ' (' || NEW.quantity_returned || ' units)'
        END,
      updated_at = now()
    WHERE id = original_payment_record.id;
    
    -- If the client already paid more than the adjusted total, create a credit
    IF original_payment_record.amount_paid > (original_payment_record.order_total - total_return_credit) THEN
      INSERT INTO public.payment_transactions (
        client_id,
        transaction_type,
        amount,
        related_delivery_id,
        related_return_id,
        description,
        transaction_date
      ) VALUES (
        return_record.client_id,
        'credit_applied',
        LEAST(original_payment_record.amount_paid - (original_payment_record.order_total - total_return_credit), total_return_credit),
        return_record.original_delivery_id,
        return_record.id,
        'Credit for returned items: ' || NEW.product_name || ' (' || NEW.quantity_returned || ' units)',
        return_record.return_date
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically adjust payments when return items are added
DROP TRIGGER IF EXISTS trigger_process_return_payment_adjustment ON public.return_line_items;
CREATE TRIGGER trigger_process_return_payment_adjustment
  AFTER INSERT ON public.return_line_items
  FOR EACH ROW EXECUTE FUNCTION process_return_and_adjust_payment();

-- Function to calculate net amount due considering returns
CREATE OR REPLACE FUNCTION get_net_amount_due(p_delivery_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  original_total DECIMAL(10,2);
  returns_credit DECIMAL(10,2);
  amount_paid DECIMAL(10,2);
  net_due DECIMAL(10,2);
BEGIN
  -- Get original order total and amount paid
  SELECT order_total, amount_paid INTO original_total, amount_paid
  FROM public.order_payment_records 
  WHERE delivery_id = p_delivery_id;
  
  -- Get total returns credit
  SELECT COALESCE(SUM(rl.total_credit_amount), 0) INTO returns_credit
  FROM public.order_returns r
  JOIN public.return_line_items rl ON r.id = rl.return_id
  WHERE r.original_delivery_id = p_delivery_id;
  
  -- Calculate net amount due
  net_due := COALESCE(original_total, 0) - COALESCE(returns_credit, 0) - COALESCE(amount_paid, 0);
  
  RETURN GREATEST(net_due, 0); -- Never return negative
END;
$$ LANGUAGE plpgsql;

-- View for easy return tracking
CREATE OR REPLACE VIEW public.return_summary AS
SELECT 
  r.id as return_id,
  r.original_delivery_id,
  r.return_delivery_id,
  r.client_id,
  c.name as client_name,
  r.return_type,
  r.return_date,
  COUNT(rl.id) as items_returned,
  SUM(rl.total_credit_amount) as total_credit,
  r.notes,
  u.username as processed_by_user
FROM public.order_returns r
LEFT JOIN public.clients c ON r.client_id = c.id
LEFT JOIN public.return_line_items rl ON r.id = rl.return_id
LEFT JOIN public.users u ON r.processed_by = u.id
GROUP BY r.id, r.original_delivery_id, r.return_delivery_id, r.client_id, c.name, 
         r.return_type, r.return_date, r.notes, u.username;

-- Enhanced view for order payment status including returns
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

-- Grant necessary permissions
GRANT SELECT ON public.return_summary TO authenticated;
GRANT SELECT ON public.order_payment_status_with_returns TO authenticated;