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
      const { data, error } = await supabase
        .from('client_account_balance')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      return data || {
        client_id: clientId,
        current_balance: 0,
        total_debt: 0,
        total_credit: 0,
        last_payment_date: null,
        last_order_date: null
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
      await supabase.rpc('update_client_balance_manual', { 
        client_id: clientId 
      });
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
      const { data, error } = await supabase
        .from('order_payment_records')
        .select('*')
        .eq('delivery_id', deliveryId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting order payment record:', error);
      throw error;
    }
  }

  async getClientUnpaidOrders(clientId: string): Promise<OrderPaymentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('order_payment_records')
        .select(`
          *,
          delivery:deliveries (
            invoice_number,
            date,
            workflow_stage,
            status,
            amount_due,
            amount_paid
          )
        `)
        .eq('client_id', clientId)
        .in('payment_status', ['unpaid', 'partial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
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
      // Get current payment record
      const paymentRecord = await this.getOrderPaymentRecord(deliveryId);
      if (!paymentRecord) {
        throw new Error('Payment record not found for order');
      }

      const newAmountPaid = paymentRecord.amount_paid + amountPaid;
      const remaining = paymentRecord.order_total - newAmountPaid;
      
      let status: string = 'unpaid';
      if (newAmountPaid >= paymentRecord.order_total) {
        status = newAmountPaid > paymentRecord.order_total ? 'overpaid' : 'paid';
      } else if (newAmountPaid > 0) {
        status = 'partial';
      }

      // Update payment record
      const { error: updateError } = await supabase
        .from('order_payment_records')
        .update({
          amount_paid: newAmountPaid,
          payment_status: status,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().split('T')[0],
          notes: notes || paymentRecord.notes
        })
        .eq('delivery_id', deliveryId);

      if (updateError) throw updateError;

      // Record the payment transaction
      await this.recordPaymentTransaction({
        client_id: paymentRecord.client_id,
        transaction_type: 'payment_received',
        amount: amountPaid,
        related_delivery_id: deliveryId,
        payment_method: paymentMethod,
        reference_number: reference,
        description: `Payment for order ${deliveryId}${notes ? ` - ${notes}` : ''}`
      });

    } catch (error) {
      console.error('Error updating order payment status:', error);
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
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
          ...transaction,
          payment_method: transaction.payment_method || 'cash',
          transaction_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording payment transaction:', error);
      throw error;
    }
  }

  async getClientPaymentHistory(clientId: string, limit = 20): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
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
      // Get unpaid orders for this client to determine what can be collected
      const unpaidOrders = await this.getClientUnpaidOrders(options.client_id);
      const collectibleOrders = unpaidOrders.map(o => o.delivery_id);
      const totalCollectible = unpaidOrders.reduce((sum, o) => sum + o.amount_remaining, 0);

      const settlementData = {
        delivery_id: options.delivery_id,
        client_id: options.client_id,
        driver_id: options.driver_id,
        settlement_type: 'order_delivery' as const,
        orders_to_collect: collectibleOrders,
        total_collectible: totalCollectible,
        amount_collected: options.amount_collected || 0,
        payment_method: options.payment_method || 'cash',
        payment_reference: options.payment_reference,
        settlement_status: this.determineSettlementStatus(options),
        notes: options.notes,
        settlement_date: new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase
        .from('settlement_sessions')
        .insert(settlementData)
        .select()
        .single();

      if (error) throw error;

      // Process the payment if amount was collected
      if (options.amount_collected && options.amount_collected > 0) {
        await this.processSettlementPayment(data.id, options);
      }

      return data;
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
      const { data, error } = await supabase
        .from('settlement_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting settlement history:', error);
      throw error;
    }
  }

  async getClientReturnPolicy(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('client_return_policy')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || {
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
    original_delivery_id: string;
    return_delivery_id?: string;
    client_id: string;
    return_type: OrderReturn['return_type'];
    items: ReturnLineItem[];
    notes?: string;
    processed_by?: string;
  }): Promise<OrderReturn> {
    try {
      // Create the return record
      const { data: returnRecord, error: returnError } = await supabase
        .from('order_returns')
        .insert({
          original_delivery_id: returnData.original_delivery_id,
          return_delivery_id: returnData.return_delivery_id,
          client_id: returnData.client_id,
          return_type: returnData.return_type,
          processed_by: returnData.processed_by,
          notes: returnData.notes
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return line items
      const returnItems = returnData.items.map(item => ({
        return_id: returnRecord.id,
        product_name: item.product_name,
        quantity_returned: item.quantity_returned,
        unit_price: item.unit_price,
        condition: item.condition,
        restockable: item.restockable,
        notes: item.notes
      }));

      const { data: lineItems, error: itemsError } = await supabase
        .from('return_line_items')
        .insert(returnItems)
        .select();

      if (itemsError) throw itemsError;

      return {
        ...returnRecord,
        items: lineItems || []
      };

    } catch (error) {
      console.error('Error processing return:', error);
      throw error;
    }
  }

  async getOrderReturns(deliveryId: string): Promise<OrderReturn[]> {
    try {
      const { data, error } = await supabase
        .from('order_returns')
        .select(`
          *,
          return_line_items (*)
        `)
        .eq('original_delivery_id', deliveryId);

      if (error) throw error;

      return data?.map(returnRecord => ({
        ...returnRecord,
        items: returnRecord.return_line_items || []
      })) || [];

    } catch (error) {
      console.error('Error getting order returns:', error);
      throw error;
    }
  }

  async getClientReturns(clientId: string, limit = 10): Promise<OrderReturn[]> {
    try {
      const { data, error } = await supabase
        .from('order_returns')
        .select(`
          *,
          return_line_items (*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(returnRecord => ({
        ...returnRecord,
        items: returnRecord.return_line_items || []
      })) || [];

    } catch (error) {
      console.error('Error getting client returns:', error);
      throw error;
    }
  }

  async getNetAmountDue(deliveryId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_net_amount_due', { p_delivery_id: deliveryId });

      if (error) throw error;
      return data || 0;

    } catch (error) {
      console.error('Error getting net amount due:', error);
      return 0;
    }
  }

  async getOrderPaymentStatusWithReturns(deliveryId: string) {
    try {
      const { data, error } = await supabase
        .from('order_payment_status_with_returns')
        .select('*')
        .eq('delivery_id', deliveryId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;

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