import React, { useState, useEffect } from 'react';
import { RealTimeMetrics, EnhancedDelivery, WorkflowEvent, WorkflowStage } from '../../types/workflow';
import { workflowService } from '../../services/workflowService';
import { formatCurrency, formatDate } from '../../utils';
import { Delivery } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface AdminPortalProps {
  currentUser: any;
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

// Admin Stage Controller Component
const AdminStageController: React.FC<{
  order: Delivery;
  onStageChange: (orderId: string, newStage: WorkflowStage) => void;
}> = ({ order, onStageChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleStageChange = (newStage: WorkflowStage) => {
    onStageChange(order.id, newStage);
    setIsOpen(false);
  };

  const stages: WorkflowStage[] = [
    'order_placed',
    'in_production', 
    'ready_for_delivery',
    'out_for_delivery',
    'delivered',
    'settlement'
  ];

  const currentStage = order.workflowStage as WorkflowStage || 'order_placed';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200 transition-colors"
        title="Admin: Change Stage"
      >
        ⚙️ Control
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-48">
            <div className="p-2 border-b text-xs font-medium text-gray-500">
              👑 Admin Stage Control
            </div>
            {stages.map((stage) => (
              <button
                key={stage}
                onClick={() => handleStageChange(stage)}
                className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                  stage === currentStage ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                }`}
              >
                {stage === currentStage && '▶ '}
                {stage.replace('_', ' ').toUpperCase()}
                {stage === currentStage && ' (Current)'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const AdminPortal: React.FC<AdminPortalProps> = ({ 
  currentUser, 
  t, 
  showToast 
}) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Delivery[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'analytics' | 'workflow'>('overview');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAdminData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadAdminData, 30000);
    setRefreshInterval(interval);
    
    // Subscribe to real-time workflow updates
    const unsubscribe = workflowService.subscribeToWorkflowUpdates(
      'admin',
      handleRealTimeUpdate
    );

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      unsubscribe();
    };
  }, []);

  const loadAdminData = async () => {
    try {
      const [metricsData, ordersData, eventsData] = await Promise.all([
        workflowService.getRealTimeMetrics(),
        loadRecentOrders(),
        loadWorkflowEvents()
      ]);
      
      setMetrics(metricsData);
      setRecentOrders(ordersData);
      setWorkflowEvents(eventsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      showToast('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentOrders = async () => {
    // Mock data for demonstration - implement with actual API
    return [];
  };

  const loadWorkflowEvents = async () => {
    // Mock data for demonstration - implement with actual API
    return [];
  };

  const handleRealTimeUpdate = (update: any) => {
    console.log('Admin portal real-time update:', update);
    loadAdminData();
  };

  // Admin Control Functions
  const handleAdminStageChange = async (orderId: string, newStage: WorkflowStage) => {
    try {
      await workflowService.updateOrderWorkflowStage(
        orderId, 
        newStage, 
        currentUser.id,
        'admin',
        `Admin manually changed stage to ${newStage}`
      );
      showToast(`Order stage updated to ${newStage.replace('_', ' ').toUpperCase()}`, 'success');
      loadAdminData();
    } catch (error) {
      console.error('Error updating order stage:', error);
      showToast('Error updating order stage', 'error');
    }
  };

  const handleEditOrder = async (order: Delivery) => {
    // Open edit modal with full order details
    showToast('Edit order functionality - opening editor...', 'success');
    // Implementation would open a comprehensive edit modal
  };

  const handleStopOrder = async (order: Delivery) => {
    if (confirm(`Are you sure you want to STOP order #${order.invoiceNumber}? This will pause all workflow activities.`)) {
      try {
        // Add stopped status to workflow
        await workflowService.updateOrderWorkflowStage(
          order.id, 
          'order_placed', 
          currentUser.id,
          'admin',
          'Order STOPPED by admin - workflow paused'
        );
        showToast(`Order #${order.invoiceNumber} has been stopped`, 'success');
        loadAdminData();
      } catch (error) {
        console.error('Error stopping order:', error);
        showToast('Error stopping order', 'error');
      }
    }
  };

  const handleCancelOrder = async (order: Delivery) => {
    if (confirm(`Are you sure you want to CANCEL order #${order.invoiceNumber}? This action can be reversed.`)) {
      try {
        // Update order status to cancelled
        showToast(`Order #${order.invoiceNumber} has been cancelled`, 'success');
        loadAdminData();
      } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('Error cancelling order', 'error');
      }
    }
  };

  const handleDeleteOrder = async (order: Delivery) => {
    if (confirm(`⚠️ PERMANENTLY DELETE order #${order.invoiceNumber}? This cannot be undone!`)) {
      if (confirm(`This will permanently remove ALL data for order #${order.invoiceNumber}. Are you absolutely sure?`)) {
        try {
          // Permanently delete order from database
          showToast(`Order #${order.invoiceNumber} has been permanently deleted`, 'success');
          loadAdminData();
        } catch (error) {
          console.error('Error deleting order:', error);
          showToast('Error deleting order', 'error');
        }
      }
    }
  };

  // Chart data preparation
  const workflowData = [
    { stage: 'Orders Placed', count: metrics?.ordersToday || 0, color: '#3B82F6' },
    { stage: 'In Production', count: metrics?.ordersInProduction || 0, color: '#F59E0B' },
    { stage: 'Ready for Delivery', count: metrics?.ordersReadyForDelivery || 0, color: '#10B981' },
    { stage: 'Out for Delivery', count: metrics?.ordersOutForDelivery || 0, color: '#8B5CF6' },
  ];

  const performanceData = [
    { metric: 'Production Efficiency', value: metrics?.productionEfficiency || 0, target: 85 },
    { metric: 'Delivery Success Rate', value: metrics?.deliverySuccessRate || 0, target: 95 },
    { metric: 'Customer Satisfaction', value: metrics?.customerSatisfactionScore * 20 || 0, target: 90 },
  ];

  if (loading && !metrics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
          👑 Admin Portal
        </h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {metrics ? new Date(metrics.lastUpdated).toLocaleTimeString() : 'Never'}
          </span>
          <button
            onClick={loadAdminData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'orders', 'analytics', 'workflow'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'orders' && '📋 Orders'}
              {tab === 'analytics' && '📈 Analytics'}
              {tab === 'workflow' && '⚡ Workflow'}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Today's Orders"
              value={metrics?.ordersToday || 0}
              icon="📋"
              color="blue"
              subtitle="Active orders"
            />
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(metrics?.totalRevenueToday || 0)}
              icon="💰"
              color="green"
              subtitle="Today's earnings"
            />
            <MetricCard
              title="Avg Order Value"
              value={formatCurrency(metrics?.averageOrderValue || 0)}
              icon="📊"
              color="purple"
              subtitle="Per order average"
            />
            <MetricCard
              title="Production Efficiency"
              value={`${Math.round(metrics?.productionEfficiency || 0)}%`}
              icon="⚙️"
              color="orange"
              subtitle="Performance ratio"
            />
          </div>

          {/* Workflow Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Workflow Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workflowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                {performanceData.map((metric, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{metric.metric}</span>
                      <span className="text-gray-600">{metric.value.toFixed(1)}% / {metric.target}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          metric.value >= metric.target ? 'bg-green-500' : 
                          metric.value >= metric.target * 0.8 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(metric.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Real-Time Activity Feed</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {workflowEvents.slice(0, 10).map((event, index) => (
                <div key={index} className="flex items-start space-x-3 text-sm">
                  <div className={`w-3 h-3 rounded-full mt-1 ${getEventColor(event.stage)}`} />
                  <div className="flex-1">
                    <span className="font-medium">{event.userName}</span>
                    <span className="text-gray-600"> {getEventDescription(event.stage)} </span>
                    <span className="font-medium">Order #{event.deliveryId.slice(-6)}</span>
                    {event.notes && (
                      <p className="text-gray-500 text-xs mt-1">{event.notes}</p>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {workflowEvents.length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">👑 Admin Order Management</h3>
                <p className="text-sm text-gray-600">Full authority to edit, control, and manage all orders</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadAdminData}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  🔄 Refresh
                </button>
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  ➕ Create Order
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">Order #</th>
                    <th className="px-6 py-3 text-left">Client</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Workflow Stage</th>
                    <th className="px-6 py-3 text-left">Value</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">👑 Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{order.invoiceNumber}</td>
                      <td className="px-6 py-4">{order.clientId.slice(-6)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getWorkflowColor(order.workflowStage || 'order_placed')}`}>
                            {order.workflowStage?.replace('_', ' ').toUpperCase() || 'ORDER PLACED'}
                          </span>
                          <AdminStageController order={order} onStageChange={handleAdminStageChange} />
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-green-600">
                        {formatCurrency(order.items.reduce((sum, item) => 
                          sum + (item.quantity * item.price), 0))}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(order.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleEditOrder(order)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                            title="Edit Order Details"
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            onClick={() => handleStopOrder(order)}
                            className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-orange-600 transition-colors"
                            title="Pause/Stop Order"
                          >
                            ⏸️ Stop
                          </button>
                          <button 
                            onClick={() => handleCancelOrder(order)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-600 transition-colors"
                            title="Cancel Order"
                          >
                            ❌ Cancel
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(order)}
                            className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium hover:bg-gray-800 transition-colors"
                            title="Permanently Delete"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No orders found. Orders will appear here in real-time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Trend (7 Days)</h3>
              {/* Chart implementation would go here */}
              <div className="h-64 flex items-center justify-center text-gray-500">
                Revenue chart will be implemented with real data
              </div>
            </div>

            {/* Order Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
              {/* Pie chart implementation would go here */}
              <div className="h-64 flex items-center justify-center text-gray-500">
                Order distribution pie chart
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Tab */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Workflow Event Log</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {workflowEvents.map((event, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{getEventDescription(event.stage)}</h4>
                      <p className="text-sm text-gray-600">
                        Order #{event.deliveryId.slice(-6)} • {event.userName} ({event.userRole})
                      </p>
                      {event.notes && (
                        <p className="text-sm text-gray-500 mt-1">{event.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {workflowEvents.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No workflow events recorded yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility Components
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    green: 'bg-green-50 text-green-800 border-green-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    orange: 'bg-orange-50 text-orange-800 border-orange-200',
  };

  return (
    <div className={`rounded-lg p-6 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};

// Utility Functions
const getEventColor = (stage: string) => {
  switch (stage) {
    case 'order_placed': return 'bg-blue-500';
    case 'in_production': return 'bg-yellow-500';
    case 'ready_for_delivery': return 'bg-green-500';
    case 'delivered': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

const getEventDescription = (stage: string) => {
  switch (stage) {
    case 'order_placed': return 'created a new order';
    case 'in_production': return 'started production for';
    case 'ready_for_delivery': return 'marked ready for delivery';
    case 'out_for_delivery': return 'picked up for delivery';
    case 'delivered': return 'delivered';
    case 'settlement': return 'completed settlement for';
    default: return 'updated';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'Settled': return 'bg-blue-100 text-blue-800';
    case 'Paid': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getWorkflowColor = (stage: string) => {
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