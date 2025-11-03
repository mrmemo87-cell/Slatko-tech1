import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { unifiedWorkflow, WorkflowOrder } from '../../services/unifiedWorkflow';
import { UnifiedOrderCard } from '../ui/UnifiedOrderCard';
import { showToast } from '../../utils/toast';

export const UnifiedDeliveryPortal: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<{
    readyForPickup: WorkflowOrder[];
    myRoute: WorkflowOrder[];
    completed: WorkflowOrder[];
    allOrders: WorkflowOrder[];
  }>({ readyForPickup: [], myRoute: [], completed: [], allOrders: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'ready' | 'my-route' | 'completed'>('all');

  const currentUser = {
    id: user?.id || 'unknown',
    name: user?.user_metadata?.full_name || user?.email || 'Driver'
  };

  useEffect(() => {
    loadDeliveryData();
    
    // Subscribe to unified workflow updates
    const unsubscribe = unifiedWorkflow.subscribe(handleWorkflowUpdate);
    return () => unsubscribe();
  }, []);

  const loadDeliveryData = async () => {
    try {
      setLoading(true);
      await unifiedWorkflow.loadOrders();
      const deliveryOrders = unifiedWorkflow.getDeliveryOrders(currentUser.id);
      const allOrders = unifiedWorkflow.getAllOrders() || []; // Get all orders for overview
      
      setOrders({
        readyForPickup: deliveryOrders?.readyForPickup || [],
        myRoute: deliveryOrders?.myRoute || [],
        completed: deliveryOrders?.completed || [],
        allOrders: allOrders.filter(order => 
          order && ['ready_for_delivery', 'out_for_delivery', 'delivered', 'completed'].includes(order.workflowStage)
        )
      });
      
      console.log('🚚 Delivery Portal Data:', {
        readyForPickupCount: deliveryOrders.readyForPickup.length,
        myRouteCount: deliveryOrders.myRoute.length,
        completedCount: deliveryOrders.completed.length,
        allOrdersCount: allOrders.length,
        currentUserId: currentUser.id
      });
      
    } catch (error) {
      console.error('❌ Error loading delivery data:', error);
      showToast('Error loading delivery data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowUpdate = (allOrders: WorkflowOrder[]) => {
    try {
      const deliveryOrders = unifiedWorkflow.getDeliveryOrders(currentUser.id);
      const allOrdersFiltered = (allOrders || []).filter(order => 
        order && ['ready_for_delivery', 'out_for_delivery', 'delivered', 'completed'].includes(order.workflowStage)
      );
      
      setOrders({
        readyForPickup: deliveryOrders?.readyForPickup || [],
        myRoute: deliveryOrders?.myRoute || [],
        completed: deliveryOrders?.completed || [],
        allOrders: allOrdersFiltered
      });
    } catch (error) {
      console.error('❌ Error updating workflow:', error);
    }
  };

  const pickupOrder = async (orderId: string) => {
    try {
      console.log('🚚 Picking up order:', orderId);
      console.log('👤 Current user:', currentUser);
      console.log('📦 Update parameters:', {
        orderId,
        newStage: 'out_for_delivery',
        userId: currentUser?.id,
        userRole: 'delivery',
        notes: `Order picked up by ${currentUser?.name || 'Unknown'}`,
        metadata: { assignedDriver: currentUser?.id, pickupTime: new Date().toISOString() }
      });
      
      if (!currentUser?.id) {
        throw new Error('Current user ID is missing');
      }
      
      await unifiedWorkflow.updateOrderStage(
        orderId,
        'out_for_delivery',
        currentUser.id,
        'delivery',
        `Order picked up by ${currentUser.name || 'Driver'}`,
        { assignedDriver: currentUser.id, pickupTime: new Date().toISOString() }
      );
      
      showToast('✅ Order picked up! Added to your route', 'success');
      
    } catch (error) {
      console.error('❌ Error picking up order:', error);
      console.error('❌ Full error details:', JSON.stringify(error, null, 2));
      showToast(`Error picking up order: ${error.message || error.error?.message || 'Unknown error'}`, 'error');
    }
  };

  const markDelivered = async (orderId: string) => {
    try {
      console.log('📦 Marking order as delivered:', orderId);
      
      if (!currentUser?.id) {
        throw new Error('Current user ID is missing');
      }
      
      await unifiedWorkflow.updateOrderStage(
        orderId,
        'delivered',
        currentUser.id,
        'delivery',
        `Order delivered by ${currentUser.name || 'Driver'}`
      );
      
      showToast('✅ Order marked as delivered!', 'success');
      
    } catch (error) {
      console.error('❌ Error marking delivered:', error);
      showToast(`Error marking delivered: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const startSettlement = async (orderId: string) => {
    try {
      console.log('💰 Starting settlement for order:', orderId);
      
      if (!currentUser?.id) {
        throw new Error('Current user ID is missing');
      }
      
      await unifiedWorkflow.updateOrderStage(
        orderId,
        'settlement',
        currentUser.id,
        'delivery',
        `Settlement started by ${currentUser.name || 'Driver'}`
      );
      
      showToast('💰 Settlement process started', 'success');
      
    } catch (error) {
      console.error('❌ Error starting settlement:', error);
      showToast(`Error starting settlement: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const getTabCounts = () => ({
    all: (orders.allOrders || []).length,
    ready: (orders.readyForPickup || []).length,
    myRoute: (orders.myRoute || []).length,
    completed: (orders.completed || []).length
  });

  const counts = getTabCounts();

  // Helper functions for All Orders view
  const getStageColor = (stage: string): string => {
    const colors = {
      'placed': 'bg-blue-100 text-blue-800',
      'production': 'bg-yellow-100 text-yellow-800',
      'ready_for_delivery': 'bg-green-100 text-green-800',
      'out_for_delivery': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-indigo-100 text-indigo-800',
      'completed': 'bg-gray-100 text-gray-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getStageLabel = (stage: string): string => {
    const labels = {
      'placed': 'Order Placed',
      'production': 'In Production',
      'ready_for_delivery': 'Ready for Pickup',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'completed': 'Completed'
    };
    return labels[stage] || stage.replace('_', ' ').toUpperCase();
  };

  const canPickup = (order: WorkflowOrder): boolean => {
    return order.workflowStage === 'ready_for_delivery' && !order.assignedDriver;
  };

  const canDeliver = (order: WorkflowOrder): boolean => {
    return order.workflowStage === 'out_for_delivery' && order.assignedDriver === currentUser.id;
  };

  const canSettle = (order: WorkflowOrder): boolean => {
    return order.workflowStage === 'delivered' && order.assignedDriver === currentUser.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading delivery data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            🚚 Delivery Portal
          </h1>
          <p className="text-gray-600 mt-1">
            Pickup and delivery management for driver: {currentUser.name}
          </p>
        </div>
        <button
          onClick={loadDeliveryData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🌍 All Orders ({counts.all})
        </button>
        <button
          onClick={() => setActiveTab('ready')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ready'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📦 Ready for Pickup ({counts.ready})
        </button>
        <button
          onClick={() => setActiveTab('my-route')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'my-route'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🚚 My Route ({counts.myRoute})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ✅ Completed ({counts.completed})
        </button>
      </div>

      {/* Orders Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Ready for Pickup */}
        {activeTab === 'ready' && (orders.readyForPickup || []).map((order) => (
          <UnifiedOrderCard
            key={order.id}
            order={order}
            showDetails="standard"
            actions={[
              {
                label: 'Pick Up Order',
                onClick: pickupOrder,
                variant: 'primary',
                icon: '📦'
              }
            ]}
          />
        ))}

        {/* My Route */}
        {activeTab === 'my-route' && (orders.myRoute || []).map((order) => (
          <UnifiedOrderCard
            key={order.id}
            order={order}
            showDetails="full"
            actions={order.workflowStage === 'out_for_delivery' ? [
              {
                label: 'Mark as Delivered',
                onClick: markDelivered,
                variant: 'success',
                icon: '✅'
              }
            ] : [
              {
                label: 'Start Settlement',
                onClick: startSettlement,
                variant: 'primary',
                icon: '💰'
              }
            ]}
          />
        ))}

        {/* All Orders */}
        {activeTab === 'all' && (orders.allOrders || []).map((order) => (
          <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            {/* Order Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-gray-900">#{order.invoiceNumber}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(order.workflowStage)}`}>
                    {getStageLabel(order.workflowStage)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{order.clientName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">${(order.totalValue || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Driver Assignment */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Driver Assignment:</span>
                <div className="text-right">
                  {order.assignedDriver ? (
                    <div>
                      <p className="text-sm font-medium text-green-600">
                        📱 {order.assignedDriver}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.assignedDriver === currentUser.id ? '(You)' : '(Other driver)'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">🚚 Unassigned</p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-3">
              <div className="text-sm text-gray-600">
                {(order.items || []).map((item, idx) => (
                  <span key={idx}>
                    {item.quantity}x {item.productName}
                    {idx < (order.items || []).length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              {canPickup(order) && (
                <button
                  onClick={() => pickupOrder(order.id)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  📦 Pick Up Order
                </button>
              )}
              {canDeliver(order) && (
                <button
                  onClick={() => markDelivered(order.id)}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  ✅ Mark Delivered
                </button>
              )}
              {canSettle(order) && (
                <button
                  onClick={() => startSettlement(order.id)}
                  className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  💰 Start Settlement
                </button>
              )}
              {!canPickup(order) && !canDeliver(order) && !canSettle(order) && (
                <div className="flex-1 text-center py-2 text-sm text-gray-500">
                  {order.assignedDriver && order.assignedDriver !== currentUser.id 
                    ? '🔒 Assigned to another driver' 
                    : '⏳ No actions available'}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Completed */}
        {activeTab === 'completed' && (orders.completed || []).map((order) => (
          <UnifiedOrderCard
            key={order.id}
            order={order}
            showDetails="full"
            className="border-l-gray-500"
          />
        ))}
      </div>

      {/* Empty States */}
      {activeTab === 'all' && orders.allOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-500">
            All delivery orders across all stages will appear here with driver assignment details.
          </p>
        </div>
      )}

      {activeTab === 'ready' && orders.readyForPickup.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders ready for pickup</h3>
          <p className="text-gray-500">
            Orders completed by production will appear here for pickup.
          </p>
        </div>
      )}

      {activeTab === 'my-route' && orders.myRoute.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders in your route</h3>
          <p className="text-gray-500">
            Pick up orders from the "Ready for Pickup" tab to start deliveries.
          </p>
        </div>
      )}

      {activeTab === 'completed' && orders.completed.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No completed deliveries</h3>
          <p className="text-gray-500">
            Delivered orders will appear here after settlement is complete.
          </p>
        </div>
      )}
    </div>
  );
};