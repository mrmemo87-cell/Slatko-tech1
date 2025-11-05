import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { PaymentHistoryView } from '../payment/PaymentHistoryView';

interface AllOrderRecordsViewProps {
  t: any;
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  quantity: number;
  reason?: string;
}

interface OrderRecord {
  id: string;
  invoice_number: number;
  client_id: string;
  client_name: string;
  created_at: string;
  state: string;
  production_stage?: string;
  delivery_stage?: string;
  payment_status?: string;
  payment_method?: string;
  delivered_total: number;
  returned_total: number;
  courier_name?: string;
  notes?: string;
  previous_invoice_balance?: number;
  items: OrderItem[];
  returns: ReturnItem[];
}

export const AllOrderRecordsView: React.FC<AllOrderRecordsViewProps> = ({ t, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'orders' | 'payment-history'>('orders');

  useEffect(() => {
    loadAllOrders();
  }, []);

  const loadAllOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch all deliveries with client info
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select(`
          *,
          clients!deliveries_client_id_fkey (name, business_name)
        `)
        .order('created_at', { ascending: false });

      if (deliveriesError) {
        console.error('Deliveries error:', deliveriesError);
        throw deliveriesError;
      }

      console.log('Loaded deliveries:', deliveries?.length);

      // Get all delivery IDs
      const deliveryIds = deliveries?.map(d => d.id) || [];
      
      if (deliveryIds.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch all delivery items with product names
      const { data: items, error: itemsError } = await supabase
        .from('delivery_items')
        .select(`
          *,
          products!delivery_items_product_id_fkey (name)
        `)
        .in('delivery_id', deliveryIds);

      if (itemsError) {
        console.error('Items error:', itemsError);
        throw itemsError;
      }

      console.log('Loaded items:', items?.length);

      // Fetch all return items with product names
      const { data: returns, error: returnsError } = await supabase
        .from('return_items')
        .select(`
          *,
          products!return_items_product_id_fkey (name)
        `)
        .in('delivery_id', deliveryIds);

      if (returnsError) {
        console.error('Returns error:', returnsError);
        throw returnsError;
      }

      console.log('Loaded returns:', returns?.length);

      // Group items by delivery
      const itemsByDelivery: Record<string, any[]> = {};
      items?.forEach(item => {
        if (!itemsByDelivery[item.delivery_id]) {
          itemsByDelivery[item.delivery_id] = [];
        }
        itemsByDelivery[item.delivery_id].push(item);
      });

      // Group returns by delivery
      const returnsByDelivery: Record<string, any[]> = {};
      returns?.forEach(ret => {
        if (!returnsByDelivery[ret.delivery_id]) {
          returnsByDelivery[ret.delivery_id] = [];
        }
        returnsByDelivery[ret.delivery_id].push(ret);
      });

      // Combine data
      const ordersWithDetails: OrderRecord[] = (deliveries || []).map(delivery => {
        const deliveryItems = itemsByDelivery[delivery.id] || [];
        const deliveryReturns = returnsByDelivery[delivery.id] || [];
        
        // Calculate totals
        const deliveredTotal = deliveryItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const returnedTotal = deliveryReturns.reduce((sum, ret) => {
          const originalItem = deliveryItems.find(item => item.product_id === ret.product_id);
          return sum + (ret.quantity * (originalItem?.price || 0));
        }, 0);

        return {
          id: delivery.id,
          invoice_number: delivery.invoice_number,
          client_id: delivery.client_id,
          client_name: delivery.clients?.business_name || delivery.clients?.name || 'Unknown Client',
          created_at: delivery.created_at,
          state: delivery.state,
          production_stage: delivery.production_stage,
          delivery_stage: delivery.delivery_stage,
          payment_status: delivery.payment_status,
          payment_method: delivery.payment_method,
          delivered_total: deliveredTotal,
          returned_total: returnedTotal,
          courier_name: delivery.courier_name,
          notes: delivery.notes,
          previous_invoice_balance: delivery.previous_invoice_balance,
          items: deliveryItems.map(item => ({
            product_id: item.product_id,
            product_name: item.products?.name || 'Unknown Product',
            quantity: item.quantity,
            price: item.price
          })),
          returns: deliveryReturns.map(ret => ({
            product_id: ret.product_id,
            product_name: ret.products?.name || 'Unknown Product',
            quantity: ret.quantity,
            reason: ret.reason
          }))
        };
      });

      setOrders(ordersWithDetails);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      showToast(error.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      'paid': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'unpaid': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'partial': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      'SRAZU': '💵 Paid Immediately',
      'LATER_CASH': '💰 Cash Later',
      'LATER_BANK': '🏦 Bank Transfer Later'
    };
    return labels[method as keyof typeof labels] || method;
  };

  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter !== 'all' && order.payment_status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const clientName = order.client_name?.toLowerCase() || '';
      const orderId = order.id?.toLowerCase() || '';
      const invoiceNum = order.invoice_number?.toString() || '';
      
      return clientName.includes(searchLower) || 
             orderId.includes(searchLower) || 
             invoiceNum.includes(searchLower);
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading all orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            📊 Order & Payment Records
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Complete view of all orders and payment history
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'orders'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📦 All Orders
          </button>
          <button
            onClick={() => setActiveTab('payment-history')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'payment-history'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            � Payment History
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'payment-history' ? (
        <PaymentHistoryView />
      ) : (
        <>
          {/* Orders Tab Content */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              All Order Records
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Complete view of all orders across all clients
            </p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by client name, order ID, or invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">Total Orders</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{orders.length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400">Paid</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {orders.filter(o => o.payment_status === 'paid').length}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">Unpaid</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
              {orders.filter(o => o.payment_status === 'unpaid').length}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {orders.filter(o => o.payment_status === 'pending').length}
            </p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">No orders found</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isExpanded = expandedOrders.has(order.id);
            const netTotal = order.delivered_total - order.returned_total;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {order.client_name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(order.payment_status || 'pending')}`}>
                          {order.payment_status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Invoice #</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {order.invoice_number || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Date</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Total Amount</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            ${netTotal.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Payment Method</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {order.payment_method ? getPaymentMethodLabel(order.payment_method) : 'Not Set'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button className="ml-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <svg
                        className={`w-6 h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                    {/* Order Items */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">📦 Order Items</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                          <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Product</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Delivered</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Returned</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Sold</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Price</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {order.items?.length > 0 ? (
                              order.items.map((item, idx) => {
                                const returned = order.returns?.find(r => r.product_id === item.product_id)?.quantity || 0;
                                const sold = item.quantity - returned;
                                const itemTotal = sold * item.price;
                                
                                return (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-white">{item.product_name}</td>
                                    <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">{item.quantity}</td>
                                    <td className="px-3 py-2 text-sm text-right text-red-600 dark:text-red-400">{returned}</td>
                                    <td className="px-3 py-2 text-sm text-right text-green-600 dark:text-green-400">{sold}</td>
                                    <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">${item.price.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-right font-medium text-slate-900 dark:text-white">${itemTotal.toFixed(2)}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-3 py-4 text-sm text-center text-slate-500 dark:text-slate-400">
                                  No items in this order
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">💰 Payment Details</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Delivered Total:</span>
                            <span className="font-medium text-slate-900 dark:text-white">${order.delivered_total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Returns:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">-${order.returned_total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                            <span className="text-slate-900 dark:text-white font-semibold">Net Total:</span>
                            <span className="font-bold text-slate-900 dark:text-white">${netTotal.toFixed(2)}</span>
                          </div>
                          {order.previous_invoice_balance && order.previous_invoice_balance > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Previous Balance:</span>
                              <span className="font-medium text-orange-600 dark:text-orange-400">${order.previous_invoice_balance.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">📝 Order Info</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Order State:</span>
                            <span className="font-medium text-slate-900 dark:text-white">{order.state || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Production Stage:</span>
                            <span className="font-medium text-slate-900 dark:text-white">{order.production_stage || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Delivery Stage:</span>
                            <span className="font-medium text-slate-900 dark:text-white">{order.delivery_stage || 'N/A'}</span>
                          </div>
                          {order.courier_name && (
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Courier:</span>
                              <span className="font-medium text-slate-900 dark:text-white">{order.courier_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">📋 Notes</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded p-3">
                          {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        </>
      )}
    </div>
  );
};
