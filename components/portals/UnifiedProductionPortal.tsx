import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { unifiedWorkflow, WorkflowOrder } from '../../services/unifiedWorkflow';
import { UnifiedOrderCard } from '../ui/UnifiedOrderCard';
import { showToast } from '../../utils/toast';

export const UnifiedProductionPortal: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<{
    queue: WorkflowOrder[];
    inProduction: WorkflowOrder[];
    readyForPickup: WorkflowOrder[];
  }>({ queue: [], inProduction: [], readyForPickup: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'production' | 'completed'>('queue');

  const currentUser = {
    id: user?.id || 'unknown',
    name: user?.user_metadata?.full_name || user?.email || 'Worker'
  };

  useEffect(() => {
    loadProductionData();
    
    // Subscribe to unified workflow updates
    const unsubscribe = unifiedWorkflow.subscribe(handleWorkflowUpdate);
    return () => unsubscribe();
  }, []);

  const loadProductionData = async () => {
    try {
      setLoading(true);
      await unifiedWorkflow.loadOrders();
      const productionOrders = unifiedWorkflow.getProductionOrders();
      setOrders(productionOrders);
      
      console.log('🏭 Production Portal Data:', {
        queueCount: productionOrders.queue.length,
        inProductionCount: productionOrders.inProduction.length,
        readyCount: productionOrders.readyForPickup.length
      });
      
    } catch (error) {
      console.error('❌ Error loading production data:', error);
      showToast('Error loading production data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowUpdate = (allOrders: WorkflowOrder[]) => {
    const productionOrders = unifiedWorkflow.getProductionOrders();
    setOrders(productionOrders);
  };

  const startProduction = async (orderId: string) => {
    try {
      console.log('🏭 Starting production for order:', orderId);
      
      await unifiedWorkflow.updateOrderStage(
        orderId,
        'in_production',
        currentUser.id,
        'production',
        `Production started by ${currentUser.name}`
      );
      
      showToast('✅ Production started! Order moved to cooking queue', 'success');
      
    } catch (error) {
      console.error('❌ Error starting production:', error);
      showToast(`Error starting production: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const completeProduction = async (orderId: string) => {
    try {
      console.log('🏭 Completing production for order:', orderId);
      
      await unifiedWorkflow.updateOrderStage(
        orderId,
        'ready_for_delivery',
        currentUser.id,
        'production',
        `Production completed by ${currentUser.name}`
      );
      
      showToast('✅ Order ready for delivery! Moved to pickup queue', 'success');
      
    } catch (error) {
      console.error('❌ Error completing production:', error);
      showToast(`Error completing production: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const getTabCounts = () => ({
    queue: orders.queue.length,
    production: orders.inProduction.length,
    completed: orders.readyForPickup.length
  });

  const counts = getTabCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading production data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            👨‍🍳 Production Portal
          </h1>
          <p className="text-gray-600 mt-1">
            Kitchen workflow management - Orders ready for preparation
          </p>
        </div>
        <button
          onClick={loadProductionData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'queue'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⏳ Production Queue ({counts.queue})
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'production'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          👨‍🍳 Cooking Now ({counts.production})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ✅ Ready for Pickup ({counts.completed})
        </button>
      </div>

      {/* Orders Grid */}
      <div className="space-y-6">
        
        {/* Items Summary Table - Only for Queue Tab */}
        {activeTab === 'queue' && orders.queue.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
              📋 Total Items to Prepare
            </h3>
            <div className="bg-white rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-amber-100">
                  <tr>
                    <th className="text-left p-3 font-bold text-amber-900">Product</th>
                    <th className="text-right p-3 font-bold text-amber-900">Total Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Calculate totals
                    const itemTotals: Record<string, number> = {};
                    orders.queue.forEach(order => {
                      order.items?.forEach(item => {
                        itemTotals[item.productName] = (itemTotals[item.productName] || 0) + item.quantity;
                      });
                    });
                    
                    const totalItems = Object.values(itemTotals).reduce((sum, qty) => sum + qty, 0);
                    
                    return (
                      <>
                        {Object.entries(itemTotals)
                          .sort(([, a], [, b]) => b - a) // Sort by quantity descending
                          .map(([productName, quantity], index) => (
                            <tr key={productName} className={index % 2 === 0 ? 'bg-white' : 'bg-amber-50'}>
                              <td className="p-3 text-gray-900 font-medium">{productName}</td>
                              <td className="p-3 text-right font-bold text-amber-700">{quantity} pcs</td>
                            </tr>
                          ))}
                        <tr className="bg-gradient-to-r from-amber-200 to-orange-200 border-t-2 border-amber-300">
                          <td className="p-3 font-bold text-amber-900">TOTAL ITEMS</td>
                          <td className="p-3 text-right text-xl font-bold text-amber-900">{totalItems} pcs</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Production Queue */}
        {activeTab === 'queue' && orders.queue.map((order) => (
          <UnifiedOrderCard
            key={order.id}
            order={order}
            showDetails="standard"
            actions={[
              {
                label: 'Start Cooking',
                onClick: startProduction,
                variant: 'primary',
                icon: '🔥'
              }
            ]}
          />
        ))}

        {/* In Production */}
        {activeTab === 'production' && orders.inProduction.map((order) => (
          <UnifiedOrderCard
            key={order.id}
            order={order}
            showDetails="standard"
            actions={[
              {
                label: 'Mark Ready for Delivery',
                onClick: completeProduction,
                variant: 'success',
                icon: '✅'
              }
            ]}
          />
        ))}

        {/* Ready for Pickup */}
        {activeTab === 'completed' && orders.readyForPickup.map((order) => (
          <UnifiedOrderCard
            key={order.id}
            order={order}
            showDetails="standard"
            className="border-l-green-500"
          />
        ))}
        </div>
      </div>

      {/* Empty States */}
      {activeTab === 'queue' && orders.queue.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders in production queue</h3>
          <p className="text-gray-500">New orders will appear here when they're ready for production.</p>
        </div>
      )}

      {activeTab === 'production' && orders.inProduction.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nothing cooking right now</h3>
          <p className="text-gray-500">Start production on orders from the queue to begin cooking.</p>
        </div>
      )}

      {activeTab === 'completed' && orders.readyForPickup.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders ready for pickup</h3>
          <p className="text-gray-500">Completed orders will appear here for delivery pickup.</p>
        </div>
      )}
    </div>
  );
};