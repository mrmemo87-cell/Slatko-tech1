import React, { useState, useEffect } from 'react';
import { unifiedWorkflow, WorkflowOrder } from '../../services/unifiedWorkflow';
import { UnifiedOrderCard } from '../ui/UnifiedOrderCard';

export const UnifiedOrderTracking: React.FC = () => {
  const [orders, setOrders] = useState<WorkflowOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WorkflowOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
    
    // Subscribe to unified workflow updates
    const unsubscribe = unifiedWorkflow.subscribe(handleWorkflowUpdate);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await unifiedWorkflow.loadOrders();
      setOrders(allOrders);
      
      console.log('📊 Order Tracking Data:', {
        totalOrders: allOrders.length,
        stageBreakdown: allOrders.reduce((acc, order) => {
          acc[order.workflowStage] = (acc[order.workflowStage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
    } catch (error) {
      console.error('❌ Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowUpdate = (allOrders: WorkflowOrder[]) => {
    setOrders(allOrders);
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by search term (invoice number or client name)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.invoiceNumber.toLowerCase().includes(searchLower) ||
        order.clientName.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.workflowStage === statusFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFilteredOrders(filtered);
  };

  const getStatusOptions = () => {
    const stages = [...new Set(orders.map(order => order.workflowStage))];
    return stages.map(stage => ({
      value: stage,
      label: unifiedWorkflow.getStageInfo(stage as string).label,
      count: orders.filter(order => order.workflowStage === stage).length
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            📊 Order Tracking
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time tracking of all orders through the complete workflow
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          
          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Orders
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number or client name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Orders ({orders.length})</option>
              {getStatusOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        {getStatusOptions().map(option => {
          const stageInfo = unifiedWorkflow.getStageInfo(option.value as string);
          return (
            <div
              key={option.value}
              className={`p-4 rounded-lg ${stageInfo.color} cursor-pointer transition-opacity hover:opacity-80`}
              onClick={() => setStatusFilter(statusFilter === option.value ? 'all' : option.value)}
            >
              <div className="text-2xl mb-1">{stageInfo.icon}</div>
              <div className="text-2xl font-bold">{option.count}</div>
              <div className="text-xs font-medium">{stageInfo.label}</div>
            </div>
          );
        })}
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Orders Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.map((order) => (
          <UnifiedOrderCard
            key={order.id}
            order={order}
            showDetails="full"
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {orders.length === 0 ? 'No orders found' : 'No orders match your filters'}
          </h3>
          <p className="text-gray-500">
            {orders.length === 0 
              ? 'Orders will appear here as they are created through Quick Order.' 
              : 'Try adjusting your search or filters to see more results.'
            }
          </p>
        </div>
      )}
    </div>
  );
};