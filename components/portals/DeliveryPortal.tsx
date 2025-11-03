import React, { useState, useEffect } from 'react';
import { EnhancedDelivery, DeliveryRoute, SettlementDetails } from '../../types/workflow';
import { workflowService } from '../../services/workflowService';
import { supabaseApi } from '../../services/supabase-api';
import { formatDate, formatCurrency } from '../../utils';

interface DeliveryPortalProps {
  currentUser: any;
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const DeliveryPortal: React.FC<DeliveryPortalProps> = ({ 
  currentUser, 
  t, 
  showToast 
}) => {
  const [readyOrders, setReadyOrders] = useState<EnhancedDelivery[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<EnhancedDelivery[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<EnhancedDelivery | null>(null);
  const [settlementModal, setSettlementModal] = useState<EnhancedDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ready' | 'my-route' | 'completed'>('ready');

  useEffect(() => {
    loadDeliveryData();
    
    // Subscribe to real-time updates
    const unsubscribe = workflowService.subscribeToWorkflowUpdates(
      'delivery',
      handleRealTimeUpdate
    );

    return () => unsubscribe();
  }, []);

  const loadDeliveryData = async () => {
    try {
      setLoading(true);
      const deliveries = await supabaseApi.getDeliveries();
      
      // Filter orders ready for delivery
      const ready = deliveries.filter(order => 
        order.workflowStage === 'ready_for_delivery'
      );
      
      // Filter orders assigned to current driver
      const myRoute = deliveries.filter(order => 
        order.assignedDriver === currentUser.id && 
        ['out_for_delivery', 'delivered'].includes(order.workflowStage || '')
      );
      
      setReadyOrders(ready);
      setMyDeliveries(myRoute);
    } catch (error) {
      console.error('Error loading delivery data:', error);
      showToast('Error loading delivery data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRealTimeUpdate = (update: any) => {
    console.log('Delivery portal real-time update:', update);
    loadDeliveryData();
  };

  const pickupOrder = async (orderId: string) => {
    try {
      await workflowService.updateOrderWorkflowStage(
        orderId,
        'out_for_delivery',
        currentUser.id,
        'delivery',
        `Order picked up by ${currentUser.name}`,
        { assignedDriver: currentUser.id, pickupTime: new Date().toISOString() }
      );
      showToast('Order picked up successfully');
    } catch (error) {
      console.error('Error picking up order:', error);
      showToast('Error picking up order', 'error');
    }
  };

  const markDelivered = async (orderId: string) => {
    try {
      await workflowService.updateOrderWorkflowStage(
        orderId,
        'delivered',
        currentUser.id,
        'delivery',
        `Order delivered by ${currentUser.name}`,
        { deliveryTime: new Date().toISOString() }
      );
      
      // Find and open settlement modal
      const order = myDeliveries.find(o => o.id === orderId);
      if (order) {
        setSettlementModal(order);
      }
    } catch (error) {
      console.error('Error marking delivered:', error);
      showToast('Error marking order as delivered', 'error');
    }
  };

  const completeSettlement = async (
    orderId: string, 
    settlementDetails: SettlementDetails
  ) => {
    try {
      await workflowService.updateOrderWorkflowStage(
        orderId,
        'settlement',
        currentUser.id,
        'delivery',
        `Settlement completed by ${currentUser.name}`,
        { settlementDetails }
      );
      
      // Update client balance and payment history
      await updateClientFinancials(orderId, settlementDetails);
      
      setSettlementModal(null);
      showToast('Settlement completed successfully');
    } catch (error) {
      console.error('Error completing settlement:', error);
      showToast('Error completing settlement', 'error');
    }
  };

  const updateClientFinancials = async (
    orderId: string, 
    settlement: SettlementDetails
  ) => {
    // This would update client balance, payment history, etc.
    // Implementation depends on your financial tracking requirements
    console.log('Updating client financials:', { orderId, settlement });
  };

  const getStatusColor = (stage: string) => {
    switch (stage) {
      case 'ready_for_delivery': return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'settlement': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading delivery orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
          🚚 Delivery Portal
        </h1>
        <div className="flex items-center space-x-4 text-sm">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {readyOrders.length} Ready for Pickup
          </span>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
            {myDeliveries.filter(d => d.workflowStage === 'out_for_delivery').length} On Route
          </span>
        </div>
      </div>

      {/* Delivery Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['ready', 'my-route', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'ready' && '📦 Ready for Pickup'}
              {tab === 'my-route' && '🚚 My Route'}
              {tab === 'completed' && '✅ Completed'}
            </button>
          ))}
        </nav>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Ready for Pickup Orders */}
        {activeTab === 'ready' && readyOrders.map((order) => (
          <div 
            key={order.id}
            className="bg-white rounded-lg shadow-md border-l-4 border-blue-500 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{order.invoiceNumber}
                </h3>
                <p className="text-sm text-gray-600">
                  Ready for pickup
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor('ready_for_delivery')}`}>
                READY
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Client:</span>
                <span className="font-medium">{order.clientId.slice(-6)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{order.items?.length || 0} products</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Value:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(order.items?.reduce((sum, item) => 
                    sum + (item.quantity * item.price), 0) || 0)}
                </span>
              </div>

              {order.productionNotes && (
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium text-gray-900">Production Notes:</h4>
                  <p className="text-sm text-gray-600 mt-1">{order.productionNotes}</p>
                </div>
              )}

              <button
                onClick={() => pickupOrder(order.id)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center mt-4"
              >
                <span className="mr-2">📦</span>
                Pick Up Order
              </button>
            </div>
          </div>
        ))}

        {/* My Route Orders */}
        {activeTab === 'my-route' && myDeliveries
          .filter(order => order.workflowStage === 'out_for_delivery')
          .map((order) => (
          <div 
            key={order.id}
            className="bg-white rounded-lg shadow-md border-l-4 border-yellow-500 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{order.invoiceNumber}
                </h3>
                <p className="text-sm text-gray-600">
                  Out for delivery
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor('out_for_delivery')}`}>
                ON ROUTE
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Client:</span>
                <span className="font-medium">{order.clientId.slice(-6)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Value:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(order.items?.reduce((sum, item) => 
                    sum + (item.quantity * item.price), 0) || 0)}
                </span>
              </div>

              {order.estimatedDeliveryTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Est. Delivery:</span>
                  <span className="font-medium">{order.estimatedDeliveryTime}</span>
                </div>
              )}

              <div className="space-y-2 mt-4">
                <button
                  onClick={() => markDelivered(order.id)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">✅</span>
                  Mark as Delivered
                </button>
                
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Add Delivery Notes
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Completed Orders */}
        {activeTab === 'completed' && myDeliveries
          .filter(order => ['delivered', 'settlement', 'completed'].includes(order.workflowStage || ''))
          .map((order) => (
          <div 
            key={order.id}
            className="bg-white rounded-lg shadow-md border-l-4 border-green-500 p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{order.invoiceNumber}
                </h3>
                <p className="text-sm text-gray-600">
                  {order.workflowStage === 'completed' ? 'Completed' : 'Delivered - Pending Settlement'}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.workflowStage || 'delivered')}`}>
                {order.workflowStage?.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Delivered:</span>
                <span className="font-medium">{order.actualDeliveryTime || 'Recently'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total Value:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(order.items?.reduce((sum, item) => 
                    sum + (item.quantity * item.price), 0) || 0)}
                </span>
              </div>

              {order.settlementDetails && (
                <div className="border-t pt-2 mt-3">
                  <h4 className="font-medium text-gray-900">Settlement Details:</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Received:</span>
                      <span className="font-medium">{formatCurrency(order.settlementDetails.paymentReceived)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-medium">{order.settlementDetails.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty States */}
      {activeTab === 'ready' && readyOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders ready for pickup</h3>
          <p className="text-gray-500">Orders will appear here when production is completed.</p>
        </div>
      )}

      {activeTab === 'my-route' && myDeliveries.filter(d => d.workflowStage === 'out_for_delivery').length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🚚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders on your route</h3>
          <p className="text-gray-500">Pick up orders from the "Ready for Pickup" tab to start deliveries.</p>
        </div>
      )}

      {/* Settlement Modal */}
      {settlementModal && (
        <SettlementModal
          order={settlementModal}
          onClose={() => setSettlementModal(null)}
          onComplete={completeSettlement}
        />
      )}
    </div>
  );
};

// Settlement Modal Component
interface SettlementModalProps {
  order: EnhancedDelivery;
  onClose: () => void;
  onComplete: (orderId: string, settlement: SettlementDetails) => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ 
  order, 
  onClose, 
  onComplete 
}) => {
  const [deliveredAmount, setDeliveredAmount] = useState(0);
  const [returnedAmount, setReturnedAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit'>('cash');
  const [paymentReceived, setPaymentReceived] = useState(0);
  const [settlementNotes, setSettlementNotes] = useState('');

  const totalOrderValue = order.items?.reduce((sum, item) => 
    sum + (item.quantity * item.price), 0) || 0;

  useEffect(() => {
    setDeliveredAmount(totalOrderValue);
    setPaymentReceived(totalOrderValue);
  }, [totalOrderValue]);

  const handleComplete = () => {
    const settlement: SettlementDetails = {
      deliveredAmount,
      returnedAmount,
      paymentMethod,
      paymentReceived,
      creditApplied: Math.max(0, deliveredAmount - paymentReceived),
      newDebtAmount: Math.max(0, deliveredAmount - paymentReceived),
      settlementNotes
    };

    onComplete(order.id, settlement);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-6">
          Settlement - Order #{order.invoiceNumber}
        </h3>
        
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.productId.slice(-4)} × {item.quantity}</span>
                  <span>{formatCurrency(item.quantity * item.price)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total Order Value:</span>
                <span>{formatCurrency(totalOrderValue)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount Delivered
              </label>
              <input
                type="number"
                value={deliveredAmount}
                onChange={(e) => setDeliveredAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount Returned
              </label>
              <input
                type="number"
                value={returnedAmount}
                onChange={(e) => setReturnedAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit/Debt</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Received
              </label>
              <input
                type="number"
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Settlement Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Settlement Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Delivered Value:</span>
                <span className="font-medium">{formatCurrency(deliveredAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Received:</span>
                <span className="font-medium text-green-600">{formatCurrency(paymentReceived)}</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding Balance:</span>
                <span className={`font-medium ${deliveredAmount - paymentReceived > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.max(0, deliveredAmount - paymentReceived))}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Settlement Notes (Optional)
            </label>
            <textarea
              value={settlementNotes}
              onChange={(e) => setSettlementNotes(e.target.value)}
              placeholder="Any additional notes about the settlement..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
          >
            Complete Settlement
          </button>
        </div>
      </div>
    </div>
  );
};