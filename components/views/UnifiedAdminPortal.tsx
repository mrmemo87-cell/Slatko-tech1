import React, { useState, useEffect } from 'react';
import { unifiedWorkflow, WorkflowOrder } from '../../services/unifiedWorkflow';
import { UnifiedOrderCard } from '../ui/UnifiedOrderCard';
import { formatCurrency } from '../../utils';

export const UnifiedAdminPortal: React.FC = () => {
  const [orders, setOrders] = useState<WorkflowOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'orders' | 'analytics' | 'workflow'>('overview');

  useEffect(() => {
    loadAdminData();
    
    // Subscribe to unified workflow updates
    const unsubscribe = unifiedWorkflow.subscribe(handleWorkflowUpdate);
    return () => unsubscribe();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const allOrders = await unifiedWorkflow.loadOrders();
      setOrders(allOrders);
      
      console.log('👑 Admin Portal Data:', {
        totalOrders: allOrders.length,
        todayOrders: allOrders.filter(o => o.date === new Date().toISOString().split('T')[0]).length,
        stageBreakdown: allOrders.reduce((acc, order) => {
          acc[order.workflowStage] = (acc[order.workflowStage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowUpdate = (allOrders: WorkflowOrder[]) => {
    setOrders(allOrders);
  };

  const getOverviewStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => order.date === today);
    
    return {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.totalValue, 0),
      todayRevenue: todayOrders.reduce((sum, order) => sum + order.totalValue, 0),
      avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalValue, 0) / orders.length : 0,
      productionEfficiency: calculateProductionEfficiency()
    };
  };

  const calculateProductionEfficiency = () => {
    const completedOrders = orders.filter(order => 
      ['ready_for_delivery', 'out_for_delivery', 'delivered', 'completed'].includes(order.workflowStage)
    );
    return orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;
  };

  const getWorkflowBreakdown = () => {
    const breakdown = orders.reduce((acc, order) => {
      const stage = order.workflowStage;
      if (!acc[stage]) {
        acc[stage] = { count: 0, orders: [] as WorkflowOrder[] };
      }
      acc[stage].count++;
      acc[stage].orders.push(order);
      return acc;
    }, {} as Record<string, { count: number; orders: WorkflowOrder[] }>);

    return Object.entries(breakdown).map(([stage, data]) => ({
      stage,
      count: data.count,
      orders: data.orders,
      stageInfo: unifiedWorkflow.getStageInfo(stage)
    }));
  };

  const stats = getOverviewStats();
  const workflowData = getWorkflowBreakdown();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading admin data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            👑 Admin Portal
          </h1>
          <p className="text-gray-600 mt-1">
            Full authority to edit, control, and manage all orders
          </p>
        </div>
        <button
          onClick={loadAdminData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'overview'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setSelectedTab('orders')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'orders'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Orders
        </button>
        <button
          onClick={() => setSelectedTab('analytics')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'analytics'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📈 Analytics
        </button>
        <button
          onClick={() => setSelectedTab('workflow')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'workflow'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚡ Workflow
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-blue-100 p-6 rounded-lg border border-blue-200">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-3xl font-bold text-blue-800">{stats.todayOrders}</div>
              <div className="text-sm text-blue-600 font-medium">Today's Orders</div>
              <div className="text-xs text-blue-500">Active orders</div>
            </div>
            
            <div className="bg-green-100 p-6 rounded-lg border border-green-200">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-3xl font-bold text-green-800">{formatCurrency(stats.todayRevenue)}</div>
              <div className="text-sm text-green-600 font-medium">Total Revenue</div>
              <div className="text-xs text-green-500">Today's earnings</div>
            </div>
            
            <div className="bg-purple-100 p-6 rounded-lg border border-purple-200">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-3xl font-bold text-purple-800">{formatCurrency(stats.avgOrderValue)}</div>
              <div className="text-sm text-purple-600 font-medium">Avg Order Value</div>
              <div className="text-xs text-purple-500">Per order average</div>
            </div>
            
            <div className="bg-orange-100 p-6 rounded-lg border border-orange-200">
              <div className="text-3xl mb-2">⚙️</div>
              <div className="text-3xl font-bold text-orange-800">{stats.productionEfficiency.toFixed(1)}%</div>
              <div className="text-sm text-orange-600 font-medium">Production Efficiency</div>
              <div className="text-xs text-orange-500">Performance ratio</div>
            </div>
          </div>

          {/* Workflow Status Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Workflow Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {workflowData.map(({ stage, count, stageInfo }) => (
                <div key={stage} className={`p-4 rounded-lg ${stageInfo.color}`}>
                  <div className="text-2xl mb-1">{stageInfo.icon}</div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs font-medium">{stageInfo.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {selectedTab === 'orders' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <UnifiedOrderCard
              key={order.id}
              order={order}
              showDetails="full"
            />
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {selectedTab === 'analytics' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Production Efficiency</h3>
              <div className="bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${stats.productionEfficiency}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {stats.productionEfficiency.toFixed(1)}% of orders completed successfully
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Delivery Success Rate</h3>
              <div className="bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: '95%' }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">95% successful delivery rate</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Customer Satisfaction</h3>
              <div className="bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-purple-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: '90%' }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">90% customer satisfaction score</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Tab */}
      {selectedTab === 'workflow' && (
        <div className="space-y-6">
          {workflowData.map(({ stage, count, orders: stageOrders, stageInfo }) => (
            <div key={stage} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <span className="mr-2">{stageInfo.icon}</span>
                  {stageInfo.label} ({count})
                </h3>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${stageInfo.color}`}>
                  {stageInfo.description}
                </span>
              </div>
              
              {stageOrders.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {stageOrders.slice(0, 6).map((order) => (
                    <UnifiedOrderCard
                      key={order.id}
                      order={order}
                      showDetails="minimal"
                      className="shadow-sm"
                    />
                  ))}
                </div>
              )}
              
              {stageOrders.length > 6 && (
                <p className="text-sm text-gray-500 mt-3">
                  And {stageOrders.length - 6} more orders...
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-500">Orders will appear here in real-time.</p>
        </div>
      )}
    </div>
  );
};