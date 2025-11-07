import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { unifiedWorkflow, WorkflowOrder } from '../../services/unifiedWorkflow';
import { UnifiedOrderCard } from '../ui/UnifiedOrderCard';
import { showToast } from '../../utils/toast';

export const UnifiedProductionPortal: React.FC = () => {
  console.log('🏭🏭🏭 UnifiedProductionPortal component RENDERING');
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

  // Calculate summary for current tab
  const getTabSummary = () => {
    const tabOrders = activeTab === 'queue' ? orders.queue : activeTab === 'production' ? orders.inProduction : orders.readyForPickup;
    const itemTotals: Record<string, number> = {};
    
    tabOrders.forEach(order => {
      order.items?.forEach(item => {
        itemTotals[item.productName] = (itemTotals[item.productName] || 0) + item.quantity;
      });
    });
    
    return {
      tabOrders,
      itemTotals,
      totalItems: Object.values(itemTotals).reduce((sum, qty) => sum + qty, 0)
    };
  };

  const tabSummary = useMemo(() => getTabSummary(), [orders, activeTab]);
  
  // Log only when tab summary changes
  useMemo(() => {
    if (tabSummary.tabOrders.length > 0) {
      console.log('📊 First order item sample:', {
        invoiceNumber: tabSummary.tabOrders[0].invoiceNumber,
        itemCount: tabSummary.tabOrders[0].items?.length,
        firstItem: tabSummary.tabOrders[0].items?.[0]
      });
    }
    
    console.log('📊 Tab Summary Updated:', { 
      activeTab, 
      tabOrdersCount: tabSummary.tabOrders.length, 
      productsCount: Object.keys(tabSummary.itemTotals).length,
      itemTotals: tabSummary.itemTotals,
      shouldShowTable: tabSummary.tabOrders.length > 0
    });
  }, [tabSummary]);

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
        readyCount: productionOrders.readyForPickup.length,
        queueDetails: productionOrders.queue.slice(0, 2).map(o => ({
          id: o.id,
          invoiceNumber: o.invoiceNumber,
          itemCount: o.items?.length || 0,
          items: o.items?.slice(0, 2)
        }))
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
      <div className="flex items-center justify-center h-screen">
        <div className="glass-card p-8 flex flex-col items-center gap-4 animate-scale-in">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
          <span className="text-gray-700 font-medium">Loading production data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Enhanced Header with Glassmorphism */}
      <div className="glass-header sticky top-0 z-40 py-6 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                � Production Portal
              </h1>
              <p className="text-gray-600 mt-1 font-medium">Kitchen workflow management - Orders ready for preparation</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="badge badge-worker animate-float">
                👨‍🍳 {currentUser.name}
              </div>
              <button
                onClick={loadProductionData}
                className="btn-primary flex items-center gap-2"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Tab Navigation */}
        <div className="glass-card p-2 flex gap-2 mb-8 animate-slide-in">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-200 will-change-transform ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:bg-white/50 hover:scale-102'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>⏳</span>
              <span>Production Queue</span>
              <span className="badge bg-white/30 text-inherit px-2 py-1 text-xs">{counts.queue}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('production')}
            className={`flex-1 py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-200 will-change-transform ${
              activeTab === 'production'
                ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:bg-white/50 hover:scale-102'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>👨‍🍳</span>
              <span>Cooking Now</span>
              <span className="badge bg-white/30 text-inherit px-2 py-1 text-xs">{counts.production}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-200 will-change-transform ${
              activeTab === 'completed'
                ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:bg-white/50 hover:scale-102'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>✅</span>
              <span>Ready for Pickup</span>
              <span className="badge bg-white/30 text-inherit px-2 py-1 text-xs">{counts.completed}</span>
            </div>
          </button>
        </div> {/* Close glass-card tabs */}

      {/* Orders Grid */}
      <div className="space-y-6">
        
        {/* Enhanced Items Summary Table */}
        {tabSummary.tabOrders.length > 0 && (
          <div className="summary-table animate-scale-in">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                📋 Total Items to Prepare
              </h3>
              <p className="text-white/80 text-sm">
                {activeTab === 'queue' ? 'Queue' : activeTab === 'production' ? 'Cooking' : 'Ready'} - All orders combined
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Product</th>
                  <th className="text-right">Total Quantity</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(tabSummary.itemTotals)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([productName, quantity]) => (
                    <tr key={productName}>
                      <td className="font-semibold text-gray-900">{productName}</td>
                      <td className="text-right font-bold gradient-text text-lg">{quantity} pcs</td>
                    </tr>
                  ))}
                <tr className="border-t-2 border-cyan-300 bg-gradient-to-r from-cyan-100 to-purple-100">
                  <td className="font-bold text-cyan-900 text-lg">TOTAL ITEMS</td>
                  <td className="text-right text-2xl font-bold gradient-text">{tabSummary.totalItems} pcs</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Orders Grid with Enhanced Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
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

      {/* Empty States with Glassmorphism */}
      {activeTab === 'queue' && orders.queue.length === 0 && (
        <div className="glass-card p-12 text-center animate-scale-in">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-xl font-bold gradient-text mb-2">No orders in production queue</h3>
          <p className="text-gray-600">New orders will appear here when they're ready for production.</p>
        </div>
      )}

      {activeTab === 'production' && orders.inProduction.length === 0 && (
        <div className="glass-card p-12 text-center animate-scale-in">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <h3 className="text-xl font-bold gradient-text mb-2">Nothing cooking right now</h3>
          <p className="text-gray-600">Start production on orders from the queue to begin cooking.</p>
        </div>
      )}

      {activeTab === 'completed' && orders.readyForPickup.length === 0 && (
        <div className="glass-card p-12 text-center animate-scale-in">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold gradient-text mb-2">No orders ready for pickup</h3>
          <p className="text-gray-600">Completed orders will appear here for delivery pickup.</p>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};