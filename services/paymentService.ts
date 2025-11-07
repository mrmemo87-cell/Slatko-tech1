import { supabase } from '../config/supabase';

export interface ClientBalance {
  client_id: string;
  current_balance: number;
  total_debt: number;
  total_credit: number;
  last_payment_date: string | null;
  last_order_date: string | null;
}

export interface OrderPaymentRecord {
  id: string;
  delivery_id: string;
  client_id: string;
  order_total: number;
  amount_paid: number;
  amount_remaining: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overpaid' | 'waived';
  payment_method?: string;
  payment_date?: string;
  due_date?: string;
  is_return_policy_order: boolean;
  notes?: string;
  created_at: string;
  invoice_number?: string;
  order_date?: string;
  amount_due?: number;
  delivery?: {
    invoice_number?: string;
    date?: string;
    workflow_stage?: string;
    status?: string;
    amount_due?: number;
    amount_paid?: number;
  };
}

export interface PaymentTransaction {
  id: string;
  client_id: string;
  transaction_type: 'payment_received' | 'debt_created' | 'debt_forgiven' | 'credit_applied' | 'adjustment';
  amount: number;
  related_delivery_id?: string;
  payment_method: string;
  reference_number?: string;
  description: string;
  recorded_by?: string;
  transaction_date: string;
  created_at: string;
}

export interface SettlementSession {
  id: string;
  delivery_id: string;
  client_id: string;
  driver_id?: string;
  settlement_type: 'order_delivery' | 'debt_collection' | 'routine_collection';
  orders_to_collect: string[];
  total_collectible: number;
  amount_collected: number;
  payment_method: string;
  payment_reference?: string;
  settlement_status: 'pending' | 'completed' | 'partial' | 'no_payment' | 'failed';
  notes?: string;
  settlement_date: string;
}

export interface ClientPaymentSheet {
  client: {
    id: string;
    name: string;
    business_name?: string;
  };
  balance: ClientBalance;
  unpaid_orders: OrderPaymentRecord[];
  recent_transactions: PaymentTransaction[];
  recent_settlements: SettlementSession[];
  return_policy: {
    policy_enabled: boolean;
    payment_delay_orders: number;
    max_debt_limit: number;
  };
}

export interface OrderReturn {
  id: string;
  original_delivery_id: string;
  return_delivery_id?: string;
  client_id: string;
  return_type: 'unsold_return' | 'quality_issue' | 'wrong_item' | 'customer_request' | 'damaged';
  return_date: string;
  processed_by?: string;
  notes?: string;
  items: ReturnLineItem[];
}

export interface ReturnLineItem {
  id?: string;
  product_name: string;
  quantity_returned: number;
  unit_price: number;
  total_credit_amount: number;
  condition: 'good' | 'damaged' | 'expired' | 'unsellable';
  restockable: boolean;
  notes?: string;
}

export interface SettlementOptions {
  delivery_id: string;
  client_id: string;
  driver_id?: string;
  payment_type: 'full_payment' | 'partial_payment' | 'no_payment' | 'debt_only';
  amount_collected?: number;
  payment_method?: string;
  payment_reference?: string;
  orders_being_paid?: string[];
  returns?: OrderReturn[];
  notes?: string;
}

class PaymentService {
  
  // =============================================================================
  // CLIENT BALANCE MANAGEMENT
  // =============================================================================

  async getClientBalance(clientId: string): Promise<ClientBalance | null> {
    try {
      // Calculate balance from core tables: deliveries, payments, return_items
      const unpaidOrders = await this.getClientUnpaidOrders(clientId);
      
      // Get total debt (unpaid amount)
      const total_debt = unpaidOrders.reduce((sum, order) => sum + order.amount_remaining, 0);
      
      // Get last payment date (need to join through deliveries since payments doesn't have client_id)
      const { data: lastPayment } = await supabase
        .from('payments')
        .select('date, deliveries!payments_delivery_id_fkey(client_id)')
        .eq('deliveries.client_id', clientId)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      // Get last order date
      const { data: lastOrder } = await supabase
        .from('deliveries')
        .select('date')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      return {
        client_id: clientId,
        current_balance: -total_debt, // Negative = client owes money
        total_debt: total_debt,
        total_credit: 0, // Would need to calculate from credits if implemented
        last_payment_date: (lastPayment as any)?.date || null,
        last_order_date: (lastOrder as any)?.date || null
      };
    } catch (error) {
      console.error('Error getting client balance:', error);
      throw error;
    }
  }

  async updateClientBalance(clientId: string): Promise<void> {
    // This is handled automatically by database triggers
    // But we can manually refresh if needed
    try {
      await (supabase.rpc('update_client_balance_manual', { 
        client_id: clientId 
      }) as any);
    } catch (error) {
      console.error('Error updating client balance:', error);
      // Don't throw - this is handled by triggers anyway
    }
  }

  // =============================================================================
  // ORDER PAYMENT TRACKING
  // =============================================================================

  async getOrderPaymentRecord(deliveryId: string): Promise<OrderPaymentRecord | null> {
    try {
      // Fetch the delivery
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single();

      if (deliveryError) {
        if (deliveryError.code === 'PGRST116') return null;
        throw deliveryError;
      }

      // Get delivery items
      const { data: items, error: itemsError } = await (supabase
        .from('delivery_items')
        .select('quantity, price')
        .eq('delivery_id', deliveryId) as any);

      if (itemsError) throw itemsError;

      // Get payments made
      const { data: payments, error: paymentsError } = await (supabase
        .from('payments')
        .select('amount')
        .eq('delivery_id', deliveryId) as any);

      if (paymentsError) throw paymentsError;

      // Calculate totals
      const orderTotal = ((items as any) || []).reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
      const amountPaid = ((payments as any) || []).reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const amountRemaining = orderTotal - amountPaid;

      let paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overpaid' | 'waived' = 'unpaid';
      if (amountPaid >= orderTotal) {
        paymentStatus = amountPaid > orderTotal ? 'overpaid' : 'paid';
      } else if (amountPaid > 0) {
        paymentStatus = 'partial';
      }

      return {
        id: (delivery as any).id,
        delivery_id: (delivery as any).id,
        client_id: (delivery as any).client_id,
        order_total: orderTotal,
        amount_paid: amountPaid,
        amount_remaining: amountRemaining,
        payment_status: paymentStatus,
        payment_method: (delivery as any).payment_method,
        payment_date: undefined,
        due_date: undefined,
        is_return_policy_order: false,
        created_at: (delivery as any).created_at
      };
    } catch (error) {
      console.error('Error getting order payment record:', error);
      throw error;
    }
  }

  async getClientUnpaidOrders(clientId: string): Promise<OrderPaymentRecord[]> {
    try {
      // Fetch deliveries for this client that are not fully paid
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select(`
          id,
          invoice_number,
          client_id,
          date,
          payment_status,
          payment_method,
          workflow_stage,
          status,
          created_at
        `)
        .eq('client_id', clientId)
        .or('payment_status.eq.unpaid,payment_status.eq.pending,payment_status.is.null')
        .order('created_at', { ascending: false });

      if (deliveriesError) throw deliveriesError;

      if (!deliveries || deliveries.length === 0) {
        return [];
      }

      // Get all delivery items for these orders
      const deliveryIds = (deliveries as any[]).map(d => (d as any).id);
      const { data: items, error: itemsError } = await (supabase
        .from('delivery_items')
        .select('delivery_id, quantity, price')
        .in('delivery_id', deliveryIds) as any);

      if (itemsError) throw itemsError;

      // Get all return items for these orders
      const { data: returns, error: returnsError } = await (supabase
        .from('return_items')
        .select('delivery_id, quantity')
        .in('delivery_id', deliveryIds) as any);

      if (returnsError) throw returnsError;

      // Get payments made for these orders
      const { data: payments, error: paymentsError } = await (supabase
        .from('payments')
        .select('delivery_id, amount')
        .in('delivery_id', deliveryIds) as any);

      if (paymentsError) throw paymentsError;

      // Group items, returns, and payments by delivery
      const itemsByDelivery = ((items || []) as any[]).reduce((acc, item) => {
        if (!acc[(item as any).delivery_id]) acc[(item as any).delivery_id] = [];
        acc[(item as any).delivery_id].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      const returnsByDelivery = ((returns || []) as any[]).reduce((acc, ret) => {
        if (!acc[(ret as any).delivery_id]) acc[(ret as any).delivery_id] = 0;
        acc[(ret as any).delivery_id] += (ret as any).quantity;
        return acc;
      }, {} as Record<string, number>);

      const paymentsByDelivery = ((payments || []) as any[]).reduce((acc, payment) => {
        if (!acc[(payment as any).delivery_id]) acc[(payment as any).delivery_id] = 0;
        acc[(payment as any).delivery_id] += (payment as any).amount;
        return acc;
      }, {} as Record<string, number>);

      // Calculate order totals and payment records
      return (deliveries as any[]).map(delivery => {
        const deliveryItems = itemsByDelivery[(delivery as any).id] || [];
        const orderTotal = (deliveryItems as any[]).reduce((sum, item) => sum + ((item as any).quantity * (item as any).price), 0);
        const amountPaid = paymentsByDelivery[(delivery as any).id] || 0;
        const amountRemaining = orderTotal - amountPaid;

        let paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overpaid' | 'waived' = 'unpaid';
        let dbPaymentStatus: 'unpaid' | 'awaiting_confirmation' | 'paid' = 'unpaid'; // For DB updates
        
        if (amountPaid >= orderTotal) {
          paymentStatus = amountPaid > orderTotal ? 'overpaid' : 'paid';
          dbPaymentStatus = 'paid';
        } else if (amountPaid > 0) {
          paymentStatus = 'partial';
          dbPaymentStatus = 'awaiting_confirmation'; // Map 'partial' to 'awaiting_confirmation'
        }

        return {
          id: (delivery as any).id,
          delivery_id: (delivery as any).id,
          client_id: (delivery as any).client_id,
          order_total: orderTotal,
          amount_paid: amountPaid,
          amount_remaining: amountRemaining,
          payment_status: paymentStatus,
          db_payment_status: dbPaymentStatus, // Store mapped value
          payment_method: (delivery as any).payment_method,
          payment_date: undefined,
          due_date: undefined,
          is_return_policy_order: false,
          notes: undefined,
          created_at: (delivery as any).created_at,
          invoice_number: (delivery as any).invoice_number?.toString(),
          order_date: (delivery as any).date,
          amount_due: amountRemaining,
          delivery: {
            invoice_number: (delivery as any).invoice_number?.toString(),
            date: (delivery as any).date,
            workflow_stage: (delivery as any).workflow_stage,
            status: (delivery as any).status,
            amount_due: amountRemaining,
            amount_paid: amountPaid
          }
        };
      });
    } catch (error) {
      console.error('Error getting unpaid orders:', error);
      throw error;
    }
  }

  async updateOrderPaymentStatus(
    deliveryId: string, 
    amountPaid: number, 
    paymentMethod: string,
    reference?: string,
    notes?: string
  ): Promise<void> {
    try {
      // Insert payment record
      const { error: paymentError } = await (supabase
        .from('payments')
        .insert({
          delivery_id: deliveryId,
          amount: amountPaid,
          method: paymentMethod,
          reference: reference,
          date: new Date().toISOString().split('T')[0]
        }) as any);

      if (paymentError) throw paymentError;

      // Get current order totals to update delivery payment_status
      const paymentRecord = await this.getOrderPaymentRecord(deliveryId);
      if (!paymentRecord) {
        throw new Error('Could not calculate payment status for order');
      }

      // Map payment_status to db-compatible value
      let dbStatus: 'unpaid' | 'awaiting_confirmation' | 'paid' = 'unpaid';
      if (paymentRecord.payment_status === 'paid' || paymentRecord.payment_status === 'overpaid') {
        dbStatus = 'paid';
      } else if (paymentRecord.payment_status === 'partial') {
        dbStatus = 'awaiting_confirmation';
      }

      // Update delivery payment status
      const { error: deliveryError } = await (supabase
        .from('deliveries')
        .update({
          payment_status: dbStatus,
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId) as any);

      if (deliveryError) throw deliveryError;

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // =============================================================================
  // PAYMENT TRANSACTIONS
  // =============================================================================

  async recordPaymentTransaction(transaction: {
    client_id: string;
    transaction_type: PaymentTransaction['transaction_type'];
    amount: number;
    related_delivery_id?: string;
    payment_method?: string;
    reference_number?: string;
    description: string;
    recorded_by?: string;
  }): Promise<PaymentTransaction> {
    try {
      // Use core payments table instead of payment_transactions
      const { data, error } = await (supabase
        .from('payments')
        .insert({
          delivery_id: transaction.related_delivery_id,
          date: new Date().toISOString().split('T')[0],
          amount: transaction.amount,
          method: transaction.payment_method || 'cash',
          reference: transaction.reference_number
        })
        .select()
        .single() as any);

      if (error) throw error;
      
      // Return in PaymentTransaction format for compatibility
      return {
        id: data!.id,
        client_id: transaction.client_id,
        transaction_type: transaction.transaction_type,
        amount: data!.amount,
        transaction_date: data!.date,
        payment_method: data!.method || 'cash',
        reference_number: data!.reference || undefined,
        description: transaction.description,
        related_delivery_id: data!.delivery_id || undefined,
        recorded_by: transaction.recorded_by,
        created_at: data!.created_at
      };
    } catch (error) {
      console.error('Error recording payment transaction:', error);
      throw error;
    }
  }

  async getClientPaymentHistory(clientId: string, limit = 20): Promise<PaymentTransaction[]> {
    try {
      // Query payments joined with deliveries to filter by client_id
      const { data, error } = await (supabase
        .from('payments')
        .select('*, deliveries!payments_delivery_id_fkey(client_id)')
        .eq('deliveries.client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit) as any);

      if (error) throw error;
      
      // Convert to PaymentTransaction format
      return (data || []).map((payment: any) => ({
        id: payment.id,
        client_id: clientId,
        transaction_type: 'payment_received' as const,
        amount: payment.amount,
        transaction_date: payment.date,
        payment_method: payment.method || 'cash',
        reference_number: payment.reference || undefined,
        description: '',
        related_delivery_id: payment.delivery_id || undefined,
        recorded_by: undefined,
        created_at: payment.created_at
      }));
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  // =============================================================================
  // SETTLEMENT MANAGEMENT
  // =============================================================================

  async createSettlementSession(options: SettlementOptions): Promise<SettlementSession> {
    try {
      // Simplified: Just record a payment if amount was collected
      // Settlement tracking removed to avoid confusion with old tables
      
      if (options.amount_collected && options.amount_collected > 0) {
        // Record payment
        await (supabase
          .from('payments')
          .insert({
            delivery_id: options.delivery_id,
            date: new Date().toISOString().split('T')[0],
            amount: options.amount_collected,
            method: options.payment_method || 'cash',
            reference: options.payment_reference
          }) as any);
        
        // Update delivery payment status
        const unpaidOrders = await this.getClientUnpaidOrders(options.client_id);
        const delivery = unpaidOrders.find(o => o.delivery_id === options.delivery_id);
        
        if (delivery) {
          // Map to db-compatible status
          const newStatus = options.amount_collected >= delivery.amount_remaining ? 'paid' : 'awaiting_confirmation';
          await (supabase
            .from('deliveries')
            .update({ payment_status: newStatus })
            .eq('id', options.delivery_id) as any);
        }
      }
      
      // Return a mock settlement session for compatibility
      return {
        id: crypto.randomUUID(),
        delivery_id: options.delivery_id,
        client_id: options.client_id,
        driver_id: options.driver_id,
        settlement_type: 'order_delivery',
        orders_to_collect: [options.delivery_id],
        total_collectible: options.amount_collected || 0,
        amount_collected: options.amount_collected || 0,
        payment_method: options.payment_method || 'cash',
        payment_reference: options.payment_reference,
        settlement_status: options.payment_type === 'no_payment' ? 'no_payment' : 'completed',
        settlement_date: new Date().toISOString().split('T')[0],
        notes: options.notes
      };
    } catch (error) {
      console.error('Error creating settlement session:', error);
      throw error;
    }
  }

  private determineSettlementStatus(options: SettlementOptions): SettlementSession['settlement_status'] {
    if (options.payment_type === 'no_payment') return 'no_payment';
    if (!options.amount_collected || options.amount_collected === 0) return 'no_payment';
    
    // We'll determine if it's partial vs complete in processSettlementPayment
    return 'completed';
  }

  async processSettlementPayment(settlementId: string, options: SettlementOptions): Promise<void> {
    if (!options.amount_collected || options.amount_collected <= 0) return;

    try {
      // Get unpaid orders sorted by oldest first (FIFO payment application)
      const unpaidOrders = await this.getClientUnpaidOrders(options.client_id);
      let remainingPayment = options.amount_collected;

      // Apply payment to orders (return policy: pay oldest orders first)
      for (const order of unpaidOrders) {
        if (remainingPayment <= 0) break;

        const amountToApply = Math.min(remainingPayment, order.amount_remaining);
        
        await this.updateOrderPaymentStatus(
          order.delivery_id,
          amountToApply,
          options.payment_method || 'cash',
          options.payment_reference,
          `Settlement payment via ${settlementId}`
        );

        remainingPayment -= amountToApply;
      }

      // If there's still remaining payment, it becomes client credit
      if (remainingPayment > 0) {
        await this.recordPaymentTransaction({
          client_id: options.client_id,
          transaction_type: 'credit_applied',
          amount: remainingPayment,
          payment_method: options.payment_method || 'cash',
          reference_number: options.payment_reference,
          description: `Excess payment from settlement ${settlementId} - client credit`
        });
      }

    } catch (error) {
      console.error('Error processing settlement payment:', error);
      throw error;
    }
  }

  // =============================================================================
  // CLIENT PAYMENT SHEET
  // =============================================================================

  async getClientPaymentSheet(clientId: string): Promise<ClientPaymentSheet | null> {
    try {
      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, business_name')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Get all the payment data in parallel
      const [balance, unpaidOrders, transactions, settlements, returnPolicy] = await Promise.all([
        this.getClientBalance(clientId),
        this.getClientUnpaidOrders(clientId),
        this.getClientPaymentHistory(clientId, 10),
        this.getClientSettlementHistory(clientId, 5),
        this.getClientReturnPolicy(clientId)
      ]);

      return {
        client: clientData,
        balance: balance!,
        unpaid_orders: unpaidOrders,
        recent_transactions: transactions,
        recent_settlements: settlements,
        return_policy: returnPolicy
      };

    } catch (error) {
      console.error('Error getting client payment sheet:', error);
      throw error;
    }
  }

  async getClientSettlementHistory(clientId: string, limit = 5): Promise<SettlementSession[]> {
    try {
      // Simplified: Return empty array since settlement tracking removed
      // Use payment history instead for financial records
      return [];
    } catch (error) {
      console.error('Error getting settlement history:', error);
      throw error;
    }
  }

  async getClientReturnPolicy(clientId: string) {
    try {
      // Simplified: Return default policy since client_return_policy table removed
      return {
        policy_enabled: true,
        payment_delay_orders: 1,
        max_debt_limit: 1000
      };
    } catch (error) {
      console.error('Error getting return policy:', error);
      return {
        policy_enabled: true,
        payment_delay_orders: 1,
        max_debt_limit: 1000
      };
    }
  }

  // =============================================================================
  // RETURN POLICY LOGIC
  // =============================================================================

  async shouldCollectPaymentForDelivery(deliveryId: string, clientId: string): Promise<{
    shouldCollect: boolean;
    ordersToCollect: OrderPaymentRecord[];
    totalAmount: number;
    reason: string;
  }> {
    try {
      const returnPolicy = await this.getClientReturnPolicy(clientId);
      
      if (!returnPolicy.policy_enabled) {
        // No return policy - collect for current order
        const currentOrder = await this.getOrderPaymentRecord(deliveryId);
        return {
          shouldCollect: true,
          ordersToCollect: currentOrder ? [currentOrder] : [],
          totalAmount: currentOrder?.amount_remaining || 0,
          reason: 'Standard payment - no return policy'
        };
      }

      // Return policy enabled - collect for previous orders
      const unpaidOrders = await this.getClientUnpaidOrders(clientId);
      
      // Exclude the current delivery from collection
      const ordersToCollect = unpaidOrders.filter(o => o.delivery_id !== deliveryId);
      const totalAmount = ordersToCollect.reduce((sum, o) => sum + o.amount_remaining, 0);

      return {
        shouldCollect: ordersToCollect.length > 0,
        ordersToCollect,
        totalAmount,
        reason: ordersToCollect.length > 0 
          ? `Return policy: collecting for ${ordersToCollect.length} previous orders`
          : 'Return policy: no previous orders to collect'
      };

    } catch (error) {
      console.error('Error checking return policy:', error);
      return {
        shouldCollect: false,
        ordersToCollect: [],
        totalAmount: 0,
        reason: 'Error checking payment requirements'
      };
    }
  }

  // =============================================================================
  // RETURNS AND EXCHANGES MANAGEMENT
  // =============================================================================

  async processReturn(returnData: {
    original_delivery_id?: string;
    delivery_id?: string; // Alternative name
    return_delivery_id?: string;
    client_id: string;
    return_type: OrderReturn['return_type'];
    items: Array<{
      product_id: string;
      product_name?: string;
      quantity: number;
      quantity_returned?: number; // Alternative name
      unit_price?: number;
      condition?: 'good' | 'damaged' | 'expired' | 'unsellable';
      reason?: string;
      notes?: string;
    }>;
    notes?: string;
    processed_by?: string;
  }): Promise<OrderReturn> {
    try {
      const deliveryId = returnData.original_delivery_id || returnData.delivery_id;
      if (!deliveryId) throw new Error('delivery_id or original_delivery_id required');
      
      // Use the core return_items table instead of order_returns
      const returnItems = returnData.items.map(item => ({
        delivery_id: deliveryId,
        product_id: item.product_id,
        quantity: item.quantity || item.quantity_returned || 0,
        reason: item.reason || item.notes || returnData.return_type
      }));

      const { data: insertedItems, error: itemsError } = await (supabase
        .from('return_items')
        .insert(returnItems)
        .select() as any);

      if (itemsError) throw itemsError;

      // Return a formatted response (no order_returns table needed)
      return {
        id: deliveryId,
        original_delivery_id: deliveryId,
        return_delivery_id: returnData.return_delivery_id,
        client_id: returnData.client_id,
        return_type: returnData.return_type,
        return_date: new Date().toISOString(),
        processed_by: returnData.processed_by,
        notes: returnData.notes,
        items: returnData.items.map(item => ({
          product_name: item.product_name || '',
          quantity_returned: item.quantity || item.quantity_returned || 0,
          unit_price: item.unit_price || 0,
          total_credit_amount: (item.unit_price || 0) * (item.quantity || item.quantity_returned || 0),
          condition: item.condition || 'good',
          restockable: item.condition !== 'damaged' && item.condition !== 'expired',
          notes: item.notes || item.reason
        }))
      };

    } catch (error) {
      console.error('Error processing return:', error);
      throw error;
    }
  }

  async getOrderReturns(deliveryId: string): Promise<OrderReturn[]> {
    try {
      // Use core return_items table
      const { data, error } = await (supabase
        .from('return_items')
        .select(`
          *,
          products!return_items_product_id_fkey (name, price)
        `)
        .eq('delivery_id', deliveryId) as any);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Group returns by delivery (though in core tables, returns are just items)
      return [{
        id: deliveryId,
        original_delivery_id: deliveryId,
        client_id: '', // Will be populated from delivery if needed
        return_type: 'unsold_return',
        return_date: new Date().toISOString(),
        items: (data || []).map((item: any) => ({
          id: item.id,
          product_name: item.products?.name || 'Unknown',
          quantity_returned: item.quantity,
          unit_price: item.products?.price || 0,
          total_credit_amount: (item.quantity * (item.products?.price || 0)),
          condition: item.restockable ? 'good' : 'damaged' as const,
          restockable: item.restockable || false,
          notes: item.reason || ''
        }))
      }];

    } catch (error) {
      console.error('Error getting order returns:', error);
      throw error;
    }
  }

  async getClientReturns(clientId: string, limit = 10): Promise<OrderReturn[]> {
    try {
      // Use core tables: get returns from deliveries for this client
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('id, date, invoice_number')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(limit);

      if (deliveriesError) throw deliveriesError;
      if (!deliveries || deliveries.length === 0) return [];

      const deliveryIds = deliveries.map(d => d.id);

      // Get all return items for these deliveries
      const { data: returnItems, error: returnsError } = await supabase
        .from('return_items')
        .select(`
          *,
          products!return_items_product_id_fkey (name, price)
        `)
        .in('delivery_id', deliveryIds);

      if (returnsError) throw returnsError;
      if (!returnItems || returnItems.length === 0) return [];

      // Group by delivery
      const returnsByDelivery: Record<string, any[]> = {};
      returnItems.forEach(item => {
        if (!returnsByDelivery[item.delivery_id]) {
          returnsByDelivery[item.delivery_id] = [];
        }
        returnsByDelivery[item.delivery_id].push(item);
      });

      // Convert to OrderReturn format
      return Object.entries(returnsByDelivery).map(([deliveryId, items]) => {
        const delivery = deliveries.find(d => d.id === deliveryId);
        return {
          id: deliveryId,
          original_delivery_id: deliveryId,
          client_id: clientId,
          return_type: 'unsold_return' as const,
          return_date: delivery?.date || new Date().toISOString(),
          items: items.map(item => ({
            id: item.id,
            product_name: item.products?.name || 'Unknown',
            quantity_returned: item.quantity,
            unit_price: item.products?.price || 0,
            total_credit_amount: (item.quantity * (item.products?.price || 0)),
            condition: (item.restockable ? 'good' : 'damaged') as 'good' | 'damaged',
            restockable: item.restockable || false,
            notes: item.reason || ''
          }))
        };
      });

    } catch (error) {
      console.error('Error getting client returns:', error);
      return []; // Return empty array instead of throwing to prevent UI errors
    }
  }

  async getNetAmountDue(deliveryId: string): Promise<number> {
    try {
      const { data, error } = await (supabase
        .rpc('get_net_amount_due', { p_delivery_id: deliveryId }) as any);

      if (error) throw error;
      return data || 0;

    } catch (error) {
      console.error('Error getting net amount due:', error);
      return 0;
    }
  }

  async getOrderPaymentStatusWithReturns(deliveryId: string) {
    try {
      // Calculate from core tables instead of using a view
      const delivery = await this.getOrderPaymentRecord(deliveryId);
      return delivery;

    } catch (error) {
      console.error('Error getting payment status with returns:', error);
      return null;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  async createDebtForUnpaidOrder(deliveryId: string, reason: string = 'Order delivered - payment deferred'): Promise<void> {
    try {
      const paymentRecord = await this.getOrderPaymentRecord(deliveryId);
      if (!paymentRecord) return;

      // Only create debt if there's an unpaid amount
      if (paymentRecord.amount_remaining > 0) {
        await this.recordPaymentTransaction({
          client_id: paymentRecord.client_id,
          transaction_type: 'debt_created',
          amount: paymentRecord.amount_remaining,
          related_delivery_id: deliveryId,
          description: reason
        });
      }
    } catch (error) {
      console.error('Error creating debt for unpaid order:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();