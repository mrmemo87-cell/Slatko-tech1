import React, { useState, useEffect } from 'react';
import { ProductionTask, EnhancedDelivery, WorkflowStage } from '../../types/workflow';
import { workflowService } from '../../services/workflowService';
import { supabaseApi } from '../../services/supabase-api';
import { formatDate, formatCurrency } from '../../utils';

interface ProductionPortalProps {
  currentUser: any;
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const ProductionPortal: React.FC<ProductionPortalProps> = ({ 
  currentUser, 
  t, 
  showToast 
}) => {
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [orders, setOrders] = useState<EnhancedDelivery[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<EnhancedDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'in-progress' | 'completed'>('queue');

  useEffect(() => {
    loadProductionData();
    
    // Subscribe to real-time updates
    const unsubscribe = workflowService.subscribeToWorkflowUpdates(
      'production',
      handleRealTimeUpdate
    );

    return () => unsubscribe();
  }, []);

  const loadProductionData = async () => {
    try {
      setLoading(true);
      const [deliveries, tasks] = await Promise.all([
        supabaseApi.getDeliveries(),
        loadProductionTasks()
      ]);
      
      // Filter orders relevant to production - include 'order_placed' as these need production
      const productionOrders = deliveries.filter(order => 
        ['order_placed', 'production_queue', 'in_production', 'quality_check', 'ready_for_delivery'].includes(order.workflowStage || 'order_placed')
      );
      
      console.log('🏭 Production Portal: Loaded', productionOrders.length, 'orders for production');
      
      setOrders(productionOrders);
      setProductionTasks(tasks);
    } catch (error) {
      console.error('Error loading production data:', error);
      showToast('Error loading production data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProductionTasks = async () => {
    // This would be implemented with actual Supabase query
    return [];
  };

  const handleRealTimeUpdate = (update: any) => {
    console.log('Production portal real-time update:', update);
    loadProductionData();
  };

  const startProduction = async (orderId: string) => {
    try {
      await workflowService.updateOrderWorkflowStage(
        orderId,
        'in_production',
        currentUser.id,
        'production',
        `Production started by ${currentUser.name}`
      );
      showToast('Production started successfully');
    } catch (error) {
      console.error('Error starting production:', error);
      showToast('Error starting production', 'error');
    }
  };

  const completeProduction = async (orderId: string, qualityNotes?: string) => {
    try {
      await workflowService.updateOrderWorkflowStage(
        orderId,
        'ready_for_delivery',
        currentUser.id,
        'production',
        `Production completed by ${currentUser.name}. Quality notes: ${qualityNotes || 'None'}`
      );
      showToast('Order marked as ready for delivery');
    } catch (error) {
      console.error('Error completing production:', error);
      showToast('Error completing production', 'error');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusColor = (stage: string) => {
    switch (stage) {
      case 'production_queue': return 'bg-gray-100 text-gray-800';
      case 'in_production': return 'bg-blue-100 text-blue-800';
      case 'quality_check': return 'bg-yellow-100 text-yellow-800';
      case 'ready_for_delivery': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading production orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
          🏭 Production Portal
        </h1>
        <div className="flex items-center space-x-4 text-sm">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {orders.filter(o => o.workflowStage === 'in_production').length} In Production
          </span>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
            {orders.filter(o => ['order_placed', 'production_queue'].includes(o.workflowStage || 'order_placed')).length} In Queue
          </span>
        </div>
      </div>

      {/* Production Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['queue', 'in-progress', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'queue' && '📋 Production Queue'}
              {tab === 'in-progress' && '⚙️ In Progress'}
              {tab === 'completed' && '✅ Completed'}
            </button>
          ))}
        </nav>
      </div>

      {/* Production Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders
          .filter(order => {
            if (activeTab === 'queue') return ['order_placed', 'production_queue'].includes(order.workflowStage || 'order_placed');
            if (activeTab === 'in-progress') return order.workflowStage === 'in_production';
            if (activeTab === 'completed') return order.workflowStage === 'ready_for_delivery';
            return true;
          })
          .map((order) => (
            <div 
              key={order.id}
              className="bg-white rounded-lg shadow-md border-l-4 border-blue-500 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.invoiceNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {/* Client name would be resolved here */}
                    Client: {order.clientId.slice(-6)}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.workflowStage || 'pending')}`}>
                  {order.workflowStage?.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Order Details */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order Date:</span>
                  <span className="font-medium">{formatDate(order.date)}</span>
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

                {/* Production Items */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Production Items:</h4>
                  <div className="space-y-2">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">{item.productId.slice(-4)}</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {item.quantity} units
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Production Notes */}
                {order.productionNotes && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-900">Notes:</h4>
                    <p className="text-sm text-gray-600 mt-1">{order.productionNotes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t pt-4 space-y-2">
                  {(['order_placed', 'production_queue'].includes(order.workflowStage || 'order_placed')) && (
                    <button
                      onClick={() => startProduction(order.id)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <span className="mr-2">▶️</span>
                      Start Production
                    </button>
                  )}
                  
                  {order.workflowStage === 'in_production' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <span className="mr-2">✅</span>
                        Mark Ready for Delivery
                      </button>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      >
                        Add Production Notes
                      </button>
                    </div>
                  )}

                  {order.workflowStage === 'ready_for_delivery' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <span className="text-green-800 font-medium">✅ Ready for Pickup</span>
                      <p className="text-green-600 text-sm mt-1">Waiting for delivery team</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {orders.filter(order => {
        if (activeTab === 'queue') return ['order_placed', 'production_queue'].includes(order.workflowStage || 'order_placed');
        if (activeTab === 'in-progress') return order.workflowStage === 'in_production';
        if (activeTab === 'completed') return order.workflowStage === 'ready_for_delivery';
        return true;
      }).length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No orders in {activeTab.replace('-', ' ')}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'queue' && 'New orders will appear here when they are confirmed by sales.'}
            {activeTab === 'in-progress' && 'Orders you start working on will appear here.'}
            {activeTab === 'completed' && 'Orders you complete will appear here before delivery.'}
          </p>
        </div>
      )}

      {/* Production Notes Modal */}
      {selectedOrder && (
        <ProductionNotesModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onComplete={completeProduction}
        />
      )}
    </div>
  );
};

// Production Notes Modal Component
interface ProductionNotesModalProps {
  order: EnhancedDelivery;
  onClose: () => void;
  onComplete: (orderId: string, notes?: string) => void;
}

const ProductionNotesModal: React.FC<ProductionNotesModalProps> = ({ 
  order, 
  onClose, 
  onComplete 
}) => {
  const [notes, setNotes] = useState('');
  const [qualityScore, setQualityScore] = useState(5);

  const handleComplete = () => {
    onComplete(order.id, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md m-4">
        <h3 className="text-lg font-semibold mb-4">
          Complete Production - Order #{order.invoiceNumber}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Production Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special notes about the production process..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality Score (1-5)
            </label>
            <select
              value={qualityScore}
              onChange={(e) => setQualityScore(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5].map(score => (
                <option key={score} value={score}>
                  {score} - {score === 5 ? 'Excellent' : score === 4 ? 'Good' : score === 3 ? 'Average' : score === 2 ? 'Poor' : 'Unacceptable'}
                </option>
              ))}
            </select>
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
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700"
          >
            Mark Ready for Delivery
          </button>
        </div>
      </div>
    </div>
  );
};