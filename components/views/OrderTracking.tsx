import React, { useState, useEffect } from 'react';
import { EnhancedDelivery, WorkflowStage } from '../../types/workflow';
import { workflowService } from '../../services/workflowService';
import { formatCurrency, formatDate } from '../../utils';
import { supabaseApi } from '../../services/supabase-api';

interface OrderTrackingProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ t, showToast }) => {
  const [orders, setOrders] = useState<EnhancedDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<EnhancedDelivery | null>(null);
  const [filterStage, setFilterStage] = useState<WorkflowStage | 'all'>('all');

  useEffect(() => {
    loadAllOrders();
    
    // Subscribe to real-time updates
    const unsubscribe = workflowService.subscribeToWorkflowUpdates(
      'admin',
      handleOrderUpdate
    );

    return () => unsubscribe();
  }, []);

  const loadAllOrders = async () => {
    try {
      // In a real implementation, this would fetch from your API/Supabase
      // For now, we'll use the workflow service to get orders
      const allOrders = await fetchOrdersFromAPI();
      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast('Error loading orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersFromAPI = async (): Promise<EnhancedDelivery[]> => {
    try {
      // Fetch all deliveries using supabaseApi
      const deliveries = await supabaseApi.getDeliveries();

      // Convert deliveries to EnhancedDelivery format
      const enhancedDeliveries: EnhancedDelivery[] = deliveries.map(delivery => ({
        ...delivery,
        workflowStage: (delivery.workflowStage as WorkflowStage) || 'order_placed',
        statusHistory: [],
        realTimeUpdates: true
      }));

      console.log('📋 Order Tracking: Loaded', enhancedDeliveries.length, 'orders');
      return enhancedDeliveries;
    } catch (error) {
      console.error('❌ Error fetching orders for tracking:', error);
      showToast('Error loading orders', 'error');
      return [];
    }
  };

  const handleOrderUpdate = (update: any) => {
    console.log('Order tracking update:', update);
    loadAllOrders();
  };

  const getStageColor = (stage: WorkflowStage) => {
    switch (stage) {
      case 'order_placed': return 'bg-blue-100 text-blue-800';
      case 'in_production': return 'bg-yellow-100 text-yellow-800';
      case 'ready_for_delivery': return 'bg-green-100 text-green-800';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'settlement': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageName = (stage: WorkflowStage) => {
    switch (stage) {
      case 'order_placed': return '📋 Order Placed';
      case 'in_production': return '🏭 In Production';
      case 'ready_for_delivery': return '✅ Ready for Delivery';
      case 'out_for_delivery': return '🚚 Out for Delivery';
      case 'delivered': return '📦 Delivered';
      case 'settlement': return '💰 Settlement Complete';
      default: return '❓ Unknown';
    }
  };

  const getProgressPercentage = (stage: WorkflowStage) => {
    switch (stage) {
      case 'order_placed': return 16;
      case 'in_production': return 33;
      case 'ready_for_delivery': return 50;
      case 'out_for_delivery': return 83;
      case 'delivered': return 100;
      case 'settlement': return 100;
      default: return 0;
    }
  };

  const filteredOrders = filterStage === 'all' 
    ? orders 
    : orders.filter(order => order.workflowStage === filterStage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading your orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            📋 Order Tracking
          </h1>
          <p className="text-gray-600 mt-1">Track all your orders from placement to delivery</p>
        </div>
        <button
          onClick={loadAllOrders}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stage Filter */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-semibold mb-3">Filter by Stage:</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStage('all')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filterStage === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Orders ({orders.length})
          </button>
          {(['order_placed', 'in_production', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'settlement'] as WorkflowStage[]).map((stage) => {
            const count = orders.filter(o => o.workflowStage === stage).length;
            return (
              <button
                key={stage}
                onClick={() => setFilterStage(stage)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filterStage === stage 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getStageName(stage)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {filterStage === 'all' ? 'No Orders Found' : `No Orders in ${getStageName(filterStage)}`}
            </h3>
            <p className="text-gray-500 mb-4">
              {filterStage === 'all' 
                ? 'Orders placed through Quick Order will appear here automatically.' 
                : 'Try selecting a different stage or create a new order.'}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <h4 className="font-semibold text-blue-800 mb-2">🔍 Debug Info:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Total orders loaded: {orders.length}</div>
                <div>Filter stage: {filterStage}</div>
                <div>Filtered orders: {filteredOrders.length}</div>
                {orders.length > 0 && (
                  <div className="mt-2 text-xs">
                    <strong>Sample order stages:</strong>
                    {orders.slice(0, 3).map((order, i) => (
                      <div key={i}>#{order.invoiceNumber}: {order.workflowStage || 'none'}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">Order #{order.invoiceNumber}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStageColor(order.workflowStage || 'order_placed')}`}>
                        {getStageName(order.workflowStage || 'order_placed')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Client: {order.clientId} • Created: {formatDate(order.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0))}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Order Progress</span>
                    <span>{getProgressPercentage(order.workflowStage || 'order_placed')}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(order.workflowStage || 'order_placed')}%` }}
                    />
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Order Items:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                        <div className="font-medium">{item.productId}</div>
                        <div className="text-gray-600">
                          Qty: {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    👁️ View Details
                  </button>
                  
                  {order.workflowStage === 'delivered' && (
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      💰 Process Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Order #{selectedOrder.invoiceNumber}</h2>
                  <p className="text-gray-600">Complete order details and timeline</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Order Timeline */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Order Timeline:</h3>
                <div className="space-y-3">
                  {(['order_placed', 'in_production', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'settlement'] as WorkflowStage[]).map((stage, index) => {
                    const isCompleted = getProgressPercentage(stage) <= getProgressPercentage(selectedOrder.workflowStage || 'order_placed');
                    const isCurrent = stage === selectedOrder.workflowStage;
                    
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted ? 'bg-green-500 text-white' :
                          isCurrent ? 'bg-blue-500 text-white' :
                          'bg-gray-200 text-gray-500'
                        }`}>
                          {isCompleted ? '✓' : index + 1}
                        </div>
                        <span className={`${isCurrent ? 'font-semibold text-blue-600' : ''}`}>
                          {getStageName(stage)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Order Information:</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Order ID:</strong> {selectedOrder.id}</div>
                    <div><strong>Client:</strong> {selectedOrder.clientId}</div>
                    <div><strong>Date:</strong> {formatDate(selectedOrder.date)}</div>
                    <div><strong>Status:</strong> {selectedOrder.status}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Financial Details:</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Total Value:</strong> {formatCurrency(selectedOrder.items.reduce((sum, item) => sum + (item.quantity * item.price), 0))}</div>
                    <div><strong>Payment Status:</strong> {selectedOrder.status}</div>
                    {selectedOrder.deliveryNotes && (
                      <div><strong>Notes:</strong> {selectedOrder.deliveryNotes}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="bg-gray-600 text-white px-6 py-2 rounded font-medium hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};