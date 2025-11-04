import React, { useState, useEffect } from 'react';
import { paymentService, type OrderPaymentRecord } from '../../services/paymentService';
import { supabaseApi } from '../../services/supabase-api';
import { supabase } from '../../config/supabase';
import { unifiedWorkflow } from '../../services/unifiedWorkflow';
import { showToast } from '../../utils/toast';

interface SettlementModalProps {
  clientId: string;
  clientName: string;
  currentOrderId?: string;
  onClose: () => void;
  onComplete: () => void;
}

type SlideType = 'returns' | 'orders' | 'review' | 'payment' | 'success';

export const SettlementModal: React.FC<SettlementModalProps> = ({
  clientId,
  clientName,
  currentOrderId,
  onClose,
  onComplete
}) => {
  const [currentSlide, setCurrentSlide] = useState<SlideType>('returns');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Data
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [unpaidOrders, setUnpaidOrders] = useState<OrderPaymentRecord[]>([]);
  const [selectedReturns, setSelectedReturns] = useState<Array<{ productId: string; productName: string; quantity: number; maxQuantity: number }>>([]);
  const [paymentDecision, setPaymentDecision] = useState<'now' | 'later' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');

  const computeOrderDue = (order: OrderPaymentRecord | null | undefined): number => {
    if (!order) return 0;
    const deliveryMeta = order.delivery || {};
    if (typeof deliveryMeta.amount_due === 'number') {
      return Number(deliveryMeta.amount_due);
    }
    if (typeof deliveryMeta.amount_paid === 'number' && typeof order.order_total === 'number') {
      const total = Number(order.order_total);
      const paid = Number(deliveryMeta.amount_paid);
      return Math.max(0, total - paid);
    }
    if (typeof order.amount_remaining === 'number') {
      return Number(order.amount_remaining);
    }
    if (typeof order.amount_due === 'number') {
      return Number(order.amount_due);
    }
    if (typeof order.order_total === 'number') {
      const paid = typeof order.amount_paid === 'number' ? Number(order.amount_paid) : 0;
      return Math.max(0, Number(order.order_total) - paid);
    }
    return 0;
  };

  const resolveInvoiceNumber = (order: OrderPaymentRecord | null | undefined): string => {
    if (!order) return '';
    return (
      order.invoice_number ||
      (order as any).invoiceNumber ||
      order.delivery?.invoice_number ||
      ''
    );
  };

  const resolveOrderDate = (order: OrderPaymentRecord | null | undefined): string => {
    if (!order) return '';
    return order.order_date || order.delivery?.date || '';
  };

  const formatDisplayDate = (value?: string | null): string => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString();
  };

  const formatCurrency = (value: number): string => `$${value.toFixed(2)}`;

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get the current order being delivered
      if (currentOrderId) {
        console.log('🔍 Loading current order:', currentOrderId);
        const allDeliveries = await supabaseApi.getDeliveries(100);
        const current = allDeliveries.find(d => d.id === currentOrderId);
        
        if (current) {
          console.log('✅ Current order loaded:', current);
          console.log('📦 Items in current order:', current.items);
          setCurrentOrder(current);
        } else {
          console.warn('⚠️ Current order not found:', currentOrderId);
        }
      }
      
      // Get the last completed delivery for this client (excluding current)
      const allDeliveries = await supabaseApi.getDeliveries(100);
      const clientDeliveries = allDeliveries
        .filter(d => d.clientId === clientId && d.id !== currentOrderId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (clientDeliveries.length > 0) {
        console.log('📋 Last order loaded:', clientDeliveries[0]);
        setLastOrder(clientDeliveries[0]);
      }

      // Get unpaid orders
      const unpaid = await paymentService.getClientUnpaidOrders(clientId);
      console.log('💰 Unpaid orders:', unpaid);
      setUnpaidOrders(unpaid);
      
    } catch (error) {
      console.error('Error loading settlement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnQuantityChange = (productId: string, productName: string, maxQuantity: number, delta: number) => {
    const existing = selectedReturns.find(r => r.productId === productId);
    
    if (!existing && delta > 0) {
      // Add new return
      setSelectedReturns([...selectedReturns, { productId, productName, quantity: 1, maxQuantity }]);
    } else if (existing) {
      const newQuantity = existing.quantity + delta;
      
      if (newQuantity <= 0) {
        // Remove return
        setSelectedReturns(selectedReturns.filter(r => r.productId !== productId));
      } else if (newQuantity <= maxQuantity) {
        // Update quantity
        setSelectedReturns(selectedReturns.map(r =>
          r.productId === productId ? { ...r, quantity: newQuantity } : r
        ));
      }
    }
  };

  const handleOrderItemQuantityChange = (productId: string, delta: number) => {
    if (!currentOrder) return;
    
    setCurrentOrder({
      ...currentOrder,
      items: currentOrder.items.map((item: any) => {
        if (item.productId === productId) {
          const newQuantity = item.quantity + delta;
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      }).filter((item: any) => item.quantity > 0) // Remove items with 0 quantity
    });
  };

  const handleNextFromReturns = async () => {
    // Save returns if any selected
    if (selectedReturns.length > 0 && lastOrder) {
      try {
        setProcessing(true);
        
        console.log('🔄 Recording returns for order:', lastOrder.id);
        console.log('📦 Returns to record:', selectedReturns);
        
        // First create the order_returns record
        const { data: orderReturn, error: returnError } = await supabase
          .from('order_returns')
          .insert({
            delivery_id: lastOrder.id,
            client_id: clientId,
            return_type: 'customer_request',
            return_date: new Date().toISOString().split('T')[0],
            notes: 'Returned during settlement'
          })
          .select()
          .single();
        
        if (returnError) {
          console.error('❌ Error creating order_returns:', returnError);
          throw returnError;
        }
        
        console.log('✅ Order return created:', orderReturn);
        
        // Then create return_line_items for each returned item
        const returnLineItems = selectedReturns.map(returnItem => {
          const product = lastOrder.items.find((i: any) => i.productId === returnItem.productId);
          const unitPrice = product?.price || 0;
          
          return {
            return_id: orderReturn.id,
            product_name: returnItem.productName,
            quantity_returned: returnItem.quantity,
            unit_price: unitPrice,
            restockable: true,
            notes: 'Customer return during settlement'
          };
        });
        
        console.log('📦 Inserting return line items:', returnLineItems);
        
        const { error: lineItemsError } = await supabase
          .from('return_line_items')
          .insert(returnLineItems);
        
        if (lineItemsError) {
          console.error('❌ Error creating return_line_items:', lineItemsError);
          throw lineItemsError;
        }
        
        console.log('✅ Returns recorded successfully');
        
      } catch (error) {
        console.error('❌ Error recording returns:', error);
        showToast('Error recording returns. Continuing with settlement...', 'error');
      } finally {
        setProcessing(false);
      }
    }
    
    // Move to review slide (show current order)
    setCurrentSlide('review');
  };

  const handlePaymentChoice = async (choice: 'now' | 'later') => {
    setPaymentDecision(choice);
    
    if (choice === 'later') {
      // Mark current order as completed but unpaid
      if (currentOrderId) {
        try {
          setProcessing(true);
          
          // Update order status to completed with unpaid flag
          await supabase
            .from('deliveries')
            .update({
              workflow_stage: 'completed',
              status: 'Pending', // Keep as Pending (unpaid)
              updated_at: new Date().toISOString()
            })
            .eq('id', currentOrderId);
          
          await unifiedWorkflow.loadOrders();
          setCurrentSlide('success');
        } catch (error) {
          console.error('Error completing order:', error);
        } finally {
          setProcessing(false);
        }
      }
    } else {
      const isSrazoMode = unpaidOrders.length === 0 && !!currentOrderId;
      if (isSrazoMode) {
        setPaymentMethod('SRAZU');
      }
      // Move to payment slide
      setCurrentSlide('payment');
    }
  };

  const handlePayNow = async () => {
    try {
      setProcessing(true);
      
      // Determine if this is Srazo mode (paying current order only) or regular settlement
      const isSrazoMode = unpaidOrders.length === 0 && !!currentOrderId;
      const settlementMethod = paymentMethod || 'cash';
      const transactionMethod = settlementMethod === 'SRAZU' ? 'cash' : settlementMethod;

      let totalDue = 0;
      let ordersToPay: string[] = [];

      if (isSrazoMode) {
        if (currentOrder?.items) {
          const currentOrderTotal = currentOrder.items.reduce((sum: number, item: any) =>
            sum + (item.quantity * (item.price || 0)), 0
          );
          totalDue = Math.max(0, currentOrderTotal - getTotalReturnsCredit());
          ordersToPay = [currentOrderId!];
        }
      } else {
        const baseTotal = unpaidOrders.reduce((sum, order) => sum + computeOrderDue(order), 0);
        const returnsCredit = getTotalReturnsCredit();
        totalDue = Math.max(0, baseTotal - returnsCredit);
        ordersToPay = unpaidOrders.map(o => o.delivery_id);
      }

      console.log('💰 Payment mode:', isSrazoMode ? 'Srazo (Current Order Only)' : 'Regular (All Unpaid)');
      console.log('💵 Total to pay:', totalDue);
      console.log('📦 Orders being paid:', ordersToPay);

      // Create settlement session
      const session = await paymentService.createSettlementSession({
        delivery_id: currentOrderId || unpaidOrders[0]?.delivery_id,
        client_id: clientId,
        payment_type: 'full_payment',
        amount_collected: totalDue,
        payment_method: settlementMethod,
        payment_reference: paymentReference || undefined,
        orders_being_paid: ordersToPay,
        notes: isSrazoMode 
          ? `Srazo payment for current order${selectedReturns.length > 0 ? '. Returns processed: ' + selectedReturns.length + ' items' : ''}`
          : `Settlement for ${unpaidOrders.length} order(s)${selectedReturns.length > 0 ? '. Returns processed: ' + selectedReturns.length + ' items' : ''}`
      });

      // Record payment transaction
      await paymentService.recordPaymentTransaction({
        client_id: clientId,
        transaction_type: 'payment_received',
        amount: totalDue,
        related_delivery_id: currentOrderId || unpaidOrders[0]?.delivery_id,
        payment_method: transactionMethod,
        reference_number: paymentReference || undefined,
        description: isSrazoMode 
          ? `Srazo payment for order ${currentOrder?.invoiceNumber || currentOrderId}. Session: ${session.id}`
          : `Settlement for ${unpaidOrders.length} order(s). Session: ${session.id}`
      });

      // Update orders to Paid based on mode
      if (isSrazoMode && currentOrderId) {
        // Srazo: Mark only current order as paid
        console.log('🔄 Updating current order to completed/paid:', currentOrderId);
        const { error: updateError } = await supabase
          .from('deliveries')
          .update({
            workflow_stage: 'completed',
            status: 'Paid',
            payment_status: 'paid',
            payment_method: settlementMethod,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentOrderId);
        
        if (updateError) {
          console.error('❌ Error updating delivery:', updateError);
          throw updateError;
        }
        console.log('✅ Delivery updated successfully');
      } else {
        // Regular: Update all unpaid orders to Paid
        for (const order of unpaidOrders) {
          console.log('🔄 Updating unpaid order to Paid:', order.delivery_id);
          const { error: updateError } = await supabase
            .from('deliveries')
            .update({
              status: 'Paid',
              payment_status: 'paid',
              payment_method: settlementMethod,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.delivery_id);
          
          if (updateError) {
            console.error('❌ Error updating delivery:', updateError);
            throw updateError;
          }
        }
        
        // Also mark current order as completed and paid
        if (currentOrderId) {
          console.log('🔄 Updating current order to completed/paid:', currentOrderId);
          const { error: updateError } = await supabase
            .from('deliveries')
            .update({
              workflow_stage: 'completed',
              status: 'Paid',
              payment_status: 'paid',
              payment_method: settlementMethod,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentOrderId);
          
          if (updateError) {
            console.error('❌ Error updating delivery:', updateError);
            throw updateError;
          }
        }
      }

      // Show success first, then reload orders in background
      setCurrentSlide('success');
      
      // Reload orders after a short delay to ensure updates are persisted
      setTimeout(async () => {
        try {
          await unifiedWorkflow.loadOrders();
        } catch (error) {
          console.warn('Warning: Could not reload orders after payment:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Full payment error:', error);
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error details:', errorMsg);
      showToast(`Payment error: ${errorMsg}`, 'error');
      alert(`Error processing payment: ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  const getTotalReturnsCredit = () => {
    if (!lastOrder) return 0;
    return selectedReturns.reduce((sum, r) => {
      const product = lastOrder.items.find((i: any) => i.productId === r.productId);
      const price = product?.price || 0;
      return sum + (price * r.quantity);
    }, 0);
  };

  const getTotalDue = () => {
    // Check if Srazo mode (no unpaid orders, paying current order only)
    const isSrazoMode = unpaidOrders.length === 0 && currentOrder?.items;

    if (isSrazoMode && currentOrder?.items) {
      const currentOrderTotal = currentOrder.items.reduce((sum: number, item: any) =>
        sum + (item.quantity * (item.price || 0)), 0
      );
      return Math.max(0, currentOrderTotal - getTotalReturnsCredit());
    }

    const baseTotal = unpaidOrders.reduce((sum, order) => sum + computeOrderDue(order), 0);
    return Math.max(0, baseTotal - getTotalReturnsCredit());
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">💰 Settlement</h2>
              <p className="text-blue-100 text-sm mt-1">{clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content - Slides - SCROLLABLE */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Slide 1: Returns Check */}
          {currentSlide === 'returns' && (
            <div className="space-y-4 animate-slideInRight">
              <h3 className="text-lg font-bold text-gray-900">
                Any returned items from the previous order?
              </h3>
              
              {lastOrder && lastOrder.items.length > 0 ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">Last Order #{lastOrder.invoiceNumber}</div>
                    <div className="text-xs text-blue-500">{lastOrder.date}</div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {lastOrder.items.map((item: any) => {
                      const returnItem = selectedReturns.find(r => r.productId === item.productId);
                      const returnQuantity = returnItem?.quantity || 0;
                      const itemPrice = item.price || 0;
                      
                      return (
                        <div
                          key={item.productId}
                          className={`p-3 border-2 rounded-lg transition-all ${
                            returnQuantity > 0 
                              ? 'border-red-400 bg-red-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.productName}</div>
                              <div className="text-sm text-gray-600">
                                Delivered: {item.quantity} pcs × ${itemPrice.toFixed(2)}
                              </div>
                              {returnQuantity > 0 && (
                                <div className="text-sm font-bold text-red-600 mt-1">
                                  Returning: {returnQuantity} pcs = -${(returnQuantity * itemPrice).toFixed(2)}
                                </div>
                              )}
                            </div>
                            
                            {/* Quantity Controls */}
                            {item.quantity > 1 ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReturnQuantityChange(item.productId, item.productName, item.quantity, -1)}
                                  disabled={returnQuantity === 0}
                                  className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-30 font-bold text-lg flex items-center justify-center"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center font-bold text-lg">{returnQuantity}</span>
                                <button
                                  onClick={() => handleReturnQuantityChange(item.productId, item.productName, item.quantity, 1)}
                                  disabled={returnQuantity >= item.quantity}
                                  className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-30 font-bold text-lg flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleReturnQuantityChange(item.productId, item.productName, item.quantity, returnQuantity > 0 ? -1 : 1)}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                                  returnQuantity > 0
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {returnQuantity > 0 ? '✓ Returned' : 'Return?'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedReturns.length > 0 && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="text-sm font-bold text-red-700">
                        Returns Credit: -${getTotalReturnsCredit().toFixed(2)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No previous order found
                </div>
              )}

              <button
                onClick={handleNextFromReturns}
                disabled={processing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Next →'}
              </button>
            </div>
          )}

          {/* Slide 2: Review Current Order */}
          {currentSlide === 'review' && currentOrder && (
            <div className="space-y-4 animate-slideInRight">
              <h3 className="text-lg font-bold text-gray-900">Review & Confirm Order</h3>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600 font-medium">Current Order #{currentOrder.invoiceNumber}</div>
                <div className="text-xs text-blue-500">{currentOrder.date}</div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentOrder.items && currentOrder.items.length > 0 ? (
                  currentOrder.items.map((item: any) => {
                    const itemPrice = item.price || 0;
                    const itemTotal = item.quantity * itemPrice;
                    
                    return (
                      <div
                        key={item.productId}
                        className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            <div className="text-sm text-gray-600">
                              ${itemPrice.toFixed(2)} each
                            </div>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOrderItemQuantityChange(item.productId, -1)}
                              className="w-8 h-8 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors font-bold text-lg flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                            <button
                              onClick={() => handleOrderItemQuantityChange(item.productId, 1)}
                              className="w-8 h-8 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors font-bold text-lg flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-gray-900">${itemTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No items in order
                  </div>
                )}
              </div>

              {/* Order Total */}
              {currentOrder.items && currentOrder.items.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Order Total:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${currentOrder.items.reduce((sum: number, item: any) => sum + (item.quantity * (item.price || 0)), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={async () => {
                  // Update order items in database before proceeding
                  if (currentOrder && currentOrderId) {
                    try {
                      setProcessing(true);
                      
                      // Delete existing items
                      await supabase
                        .from('delivery_items')
                        .delete()
                        .eq('delivery_id', currentOrderId);
                      
                      // Insert updated items
                      const itemsToInsert = currentOrder.items.map((item: any) => ({
                        delivery_id: currentOrderId,
                        product_id: item.productId,
                        quantity: item.quantity,
                        price: item.price || 0,
                        unit: item.unit || 'pcs'
                      }));
                      
                      await supabase
                        .from('delivery_items')
                        .insert(itemsToInsert);
                      
                      // Update total amount in delivery
                      const newTotal = currentOrder.items.reduce((sum: number, item: any) => 
                        sum + (item.quantity * (item.price || 0)), 0
                      );
                      
                      await supabase
                        .from('deliveries')
                        .update({ 
                          amount_due: newTotal,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', currentOrderId);
                      
                      showToast('Order updated successfully!', 'success');
                    } catch (error) {
                      console.error('Error updating order:', error);
                      showToast('Error updating order', 'error');
                    } finally {
                      setProcessing(false);
                    }
                  }
                  
                  setCurrentSlide('orders');
                }}
                disabled={processing || !currentOrder?.items || currentOrder.items.length === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
              >
                {processing ? 'Updating...' : 'Confirm → Continue to Payment'}
              </button>
            </div>
          )}

          {/* Slide 3: Unpaid Orders */}
          {currentSlide === 'orders' && (
            <div className="space-y-4 animate-slideInRight">
              <h3 className="text-lg font-bold text-gray-900">Previous Orders</h3>
              
              {/* Quick Payment Option for Srazo Clients */}
              {unpaidOrders.length === 0 && currentOrderId && (
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <div className="font-bold text-green-900">Quick Payment (Srazo)</div>
                      <div className="text-sm text-green-700">Pay for this order only, right now</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Skip to payment immediately for current order only
                      setPaymentDecision('now');
                      setCurrentSlide('payment');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg transition-all shadow-lg"
                  >
                    💵 Pay Current Order Now
                  </button>
                  <button
                    onClick={() => handlePaymentChoice('later')}
                    className="w-full py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-all"
                  >
                    Complete Without Payment
                  </button>
                </div>
              )}
              
              {unpaidOrders.length > 0 ? (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {unpaidOrders.map((order) => {
                      const amountDue = computeOrderDue(order);
                      const invoiceNumber = resolveInvoiceNumber(order);
                      const orderDate = resolveOrderDate(order);
                      
                      return (
                        <div
                          key={order.delivery_id}
                          className="p-4 border-2 border-red-300 bg-red-50 rounded-lg"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold text-gray-900">
                                {invoiceNumber ? `Order #${invoiceNumber}` : 'Order'}
                              </div>
                              {orderDate && (
                                <div className="text-sm text-gray-600">{formatDisplayDate(orderDate)}</div>
                              )}
                            </div>
                            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                              UNPAID
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(amountDue)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculation Breakdown */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-300 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">Orders Subtotal:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(unpaidOrders.reduce((sum, o) => sum + computeOrderDue(o), 0))}</span>
                    </div>
                    
                    {getTotalReturnsCredit() > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-red-600">Returns Credit:</span>
                        <span className="font-bold text-red-600">
                          -${getTotalReturnsCredit().toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="border-t-2 border-blue-300 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">Total Due:</span>
                        <span className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalDue())}</span>
                      </div>
                    </div>
                    
                    {selectedReturns.length > 0 && (
                      <div className="text-xs text-gray-600 mt-2">
                        📦 {selectedReturns.reduce((sum, r) => sum + r.quantity, 0)} items returned from last order
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePaymentChoice('later')}
                      disabled={processing}
                      className="py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                      Pay Later
                    </button>
                    <button
                      onClick={() => handlePaymentChoice('now')}
                      disabled={processing}
                      className="py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                      Pay Now →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">✓</div>
                    <div className="text-gray-600">No unpaid orders</div>
                  </div>
                  <button
                    onClick={() => handlePaymentChoice('later')}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                  >
                    Complete Order
                  </button>
                </>
              )}
            </div>
          )}

          {/* Slide 3: Payment Method */}
          {currentSlide === 'payment' && (
            <div className="space-y-4 animate-slideInRight">
              <h3 className="text-lg font-bold text-gray-900">Payment Details</h3>
              
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Amount to Pay:</span>
                  <span className="text-3xl font-bold text-blue-600">{formatCurrency(getTotalDue())}</span>
                </div>

                {currentOrder && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Invoice</div>
                      <div className="font-semibold text-gray-900">
                        #{currentOrder.invoiceNumber || currentOrder.invoice_number || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Order Date</div>
                      <div className="font-semibold text-gray-900">
                        {formatDisplayDate(currentOrder.date) || '—'}
                      </div>
                    </div>
                  </div>
                )}

                {unpaidOrders.length > 0 && (
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Included Orders</div>
                    {unpaidOrders.map((order) => {
                      const invoiceNumber = resolveInvoiceNumber(order);
                      const orderDate = resolveOrderDate(order);
                      return (
                        <div key={order.delivery_id} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-gray-900">
                              {invoiceNumber ? `#${invoiceNumber}` : '#—'}
                            </span>
                            {orderDate && (
                              <span className="ml-2 text-xs text-gray-500">
                                {formatDisplayDate(orderDate)}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900">{formatCurrency(computeOrderDue(order))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                >
                  <option value="SRAZU">⚡ SRAZO (Instant)</option>
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="check">📝 Check</option>
                </select>
              </div>

              {(paymentMethod === 'bank_transfer' || paymentMethod === 'check') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter reference number"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrentSlide('orders')}
                  disabled={processing}
                  className="py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handlePayNow}
                  disabled={processing}
                  className="py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Complete ✓'}
                </button>
              </div>
            </div>
          )}

          {/* Slide 4: Success */}
          {currentSlide === 'success' && (
            <div className="text-center py-8 animate-scaleIn">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {paymentDecision === 'now' ? 'Payment Completed!' : 'Order Completed!'}
              </h3>
              <p className="text-gray-600 mb-6">
                {paymentDecision === 'now' 
                  ? 'Settlement has been recorded successfully.'
                  : 'Order marked as complete. Payment pending.'}
              </p>
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
