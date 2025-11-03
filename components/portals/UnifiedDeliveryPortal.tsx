import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { unifiedWorkflow, WorkflowOrder } from '../../services/unifiedWorkflow';
import { UnifiedOrderCard } from '../ui/UnifiedOrderCard';
import { showToast } from '../ui/Toast';

export const UnifiedDeliveryPortal: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<{
    readyForPickup: WorkflowOrder[];
    myRoute: WorkflowOrder[];
    completed: WorkflowOrder[];
  }>({ readyForPickup: [], myRoute: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ready' | 'my-route' | 'completed'>('ready');

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
      setOrders(deliveryOrders);
      
      console.log('🚚 Delivery Portal Data:', {
        readyForPickupCount: deliveryOrders.readyForPickup.length,
        myRouteCount: deliveryOrders.myRoute.length,
        completedCount: deliveryOrders.completed.length,
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
    const deliveryOrders = unifiedWorkflow.getDeliveryOrders(currentUser.id);
    setOrders(deliveryOrders);
  };

  const pickupOrder = async (orderId: string) => {
    try {
      console.log('🚚 Picking up order:', orderId);
      
      await unifiedWorkflow.updateOrderStage(
        orderId,
        'out_for_delivery',
        currentUser.id,
        'delivery',
        `Order picked up by ${currentUser.name}`,
        { assignedDriver: currentUser.id, pickupTime: new Date().toISOString() }
      );
      
      showToast('✅ Order picked up! Added to your route', 'success');
      
    } catch (error) {
      console.error('❌ Error picking up order:', error);
      showToast(`Error picking up order: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const markDelivered = async (orderId: string) => {
    try {
      console.log('📦 Marking order as delivered:', orderId);
      
      await unifiedWorkflow.updateOrderStage(
        orderId,
        'delivered',
        currentUser.id,
        'delivery',
        `Order delivered by ${currentUser.name}`
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
      
      await unifiedWorkflow.updateOrderStage(
        orderId,
        'settlement',
        currentUser.id,
        'delivery',
        `Settlement started by ${currentUser.name}`
      );
      
      showToast('💰 Settlement process started', 'success');
      
    } catch (error) {
      console.error('❌ Error starting settlement:', error);
      showToast(`Error starting settlement: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const getTabCounts = () => ({
    ready: orders.readyForPickup.length,
    myRoute: orders.myRoute.length,
    completed: orders.completed.length
  });

  const counts = getTabCounts();

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
        {activeTab === 'ready' && orders.readyForPickup.map((order) => (
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
        {activeTab === 'my-route' && orders.myRoute.map((order) => (
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

        {/* Completed */}
        {activeTab === 'completed' && orders.completed.map((order) => (
          <UnifiedOrderCard
            key={order.id}
            order={order}
            showDetails="full"
            className="border-l-gray-500"
          />
        ))}
      </div>

      {/* Empty States */}
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