import React, { useState, useEffect } from 'react';
import { translations } from '../../i18n/translations';
import { useAuth } from '../../components/auth/AuthProvider';
import { unifiedWorkflow, WorkflowOrder } from '../../services/unifiedWorkflow';

interface ProductionPortalProps {
  lang?: 'en' | 'ru' | 'ar';
}

const ProductionPortal: React.FC<ProductionPortalProps> = ({ lang = 'en' }) => {
  const { user } = useAuth();
  const t = translations[lang].productionPortal;

  const [orders, setOrders] = useState<WorkflowOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'preparing' | 'ready'>('received');
  const [showBatchModal, setShowBatchModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadInitialOrders = async () => {
      if (!isMounted) return;
      try {
        const allOrders = await unifiedWorkflow.loadOrders();
        if (isMounted) {
          setOrders(allOrders);
        }
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialOrders();

    // Subscribe to order updates with debouncing to prevent infinite loops
    let updateTimeout: NodeJS.Timeout;
    const unsubscribe = unifiedWorkflow.subscribe(() => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (isMounted) {
          loadInitialOrders();
        }
      }, 300); // Debounce updates by 300ms
    });

    return () => {
      isMounted = false;
      clearTimeout(updateTimeout);
      unsubscribe();
    };
  }, []);

  // Filter orders by production stage
  const getOrdersByStage = (stage: string) => {
    return orders.filter(order => {
      if (stage === 'received') return order.workflowStage === 'order_placed' || order.workflowStage === 'production_queue';
      if (stage === 'preparing') return order.workflowStage === 'in_production';
      if (stage === 'ready') return order.workflowStage === 'ready_for_delivery';
      return false;
    });
  };

  const receivedOrders = getOrdersByStage('received');
  const preparingOrders = getOrdersByStage('preparing');
  const readyOrders = getOrdersByStage('ready');

  // Calculate totals for each stage
  const getTotalItems = (orderList: WorkflowOrder[]) => {
    return orderList.reduce((total, order) => {
      return total + order.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  };

  const handleStartProduction = async (orderId: string) => {
    try {
      await unifiedWorkflow.updateOrderStage(orderId, 'in_production');
      // Reload orders after update
      const allOrders = await unifiedWorkflow.loadOrders();
      setOrders(allOrders);
    } catch (error) {
      console.error('Failed to start production:', error);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await unifiedWorkflow.updateOrderStage(orderId, 'ready_for_delivery');
      // Reload orders after update
      const allOrders = await unifiedWorkflow.loadOrders();
      setOrders(allOrders);
    } catch (error) {
      console.error('Failed to mark ready:', error);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* DRAMATIC Gradient Background */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-600 animate-gradient-x"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-pink-500/40 via-purple-500/40 to-cyan-500/40 animate-gradient-y"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-purple-900/20 to-black/40"></div>
      </div>

      {/* Animated Mesh Gradient Orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-cyan-400/20 via-transparent to-transparent rounded-full blur-3xl animate-spin-slow"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-pink-400/20 via-transparent to-transparent rounded-full blur-3xl animate-spin-reverse"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 backdrop-blur-3xl bg-white/10 dark:bg-black/20 border-b border-white/20 p-5 shadow-[0_8px_32px_0_rgba(0,208,232,0.2)]">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            {/* Logo with Glow */}
            <div className="relative group">
              <div className="absolute -inset-3 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-all duration-500 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 p-3 rounded-full shadow-[0_0_40px_rgba(0,208,232,0.5)] border-2 border-white/40">
                <span className="text-2xl">🍰</span>
              </div>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,208,232,0.4)]">🏭 {t.title}</h1>
          </div>
          <div className="text-sm font-semibold text-white drop-shadow-lg">
            {t.loggedInAs} <span className="bg-gradient-to-r from-cyan-300 to-pink-300 bg-clip-text text-transparent">{user?.username || user?.email}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="relative z-10 p-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mb-4 shadow-lg"></div>
          <p className="mt-4 text-white font-semibold drop-shadow-lg">{t.loadingOrders}</p>
        </div>
      ) : (
        <div className="relative z-10">
          {/* Summary Cards - Compressed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
            {/* Production Queue (Received) */}
            <div className="backdrop-blur-3xl bg-white/10 border border-white/20 rounded-xl p-4 shadow-[0_8px_32px_0_rgba(0,208,232,0.2)] hover:shadow-[0_8px_32px_0_rgba(0,208,232,0.4)] transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white drop-shadow-lg">📋 {t.productionQueue}</h3>
                  <p className="text-xs text-white/70 mt-1">{getTotalItems(receivedOrders)} items</p>
                </div>
                <span className="text-3xl font-black bg-gradient-to-br from-cyan-300 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,208,232,0.4)]">{receivedOrders.length}</span>
              </div>
            </div>

            {/* Cooking Now (Preparing) */}
            <div className="backdrop-blur-3xl bg-white/10 border border-white/20 rounded-xl p-4 shadow-[0_8px_32px_0_rgba(168,85,247,0.2)] hover:shadow-[0_8px_32px_0_rgba(168,85,247,0.4)] transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white drop-shadow-lg">👨‍🍳 {t.cookingNow}</h3>
                  <p className="text-xs text-white/70 mt-1">{getTotalItems(preparingOrders)} items</p>
                </div>
                <span className="text-3xl font-black bg-gradient-to-br from-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">{preparingOrders.length}</span>
              </div>
            </div>

            {/* Ready for Pickup */}
            <div className="backdrop-blur-3xl bg-white/10 border border-white/20 rounded-xl p-4 shadow-[0_8px_32px_0_rgba(0,208,232,0.2)] hover:shadow-[0_8px_32px_0_rgba(0,208,232,0.4)] transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white drop-shadow-lg">✅ {t.readyForPickup}</h3>
                  <p className="text-xs text-white/70 mt-1">{getTotalItems(readyOrders)} items</p>
                </div>
                <span className="text-3xl font-black bg-gradient-to-br from-green-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]">{readyOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-white/20 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 backdrop-blur-xl">
            <nav className="flex px-6 -mb-px">
              <button
                onClick={() => setActiveTab('received')}
                className={`py-3 px-5 font-bold border-b-2 transition-all text-sm ${
                  activeTab === 'received'
                    ? 'border-cyan-400 text-white drop-shadow-lg'
                    : 'border-transparent text-white/60 hover:text-white/80'
                }`}
              >
                📋 {t.productionQueue} ({receivedOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('preparing')}
                className={`py-3 px-5 font-bold border-b-2 transition-all text-sm ${
                  activeTab === 'preparing'
                    ? 'border-purple-400 text-white drop-shadow-lg'
                    : 'border-transparent text-white/60 hover:text-white/80'
                }`}
              >
                👨‍🍳 {t.cookingNow} ({preparingOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('ready')}
                className={`py-3 px-5 font-bold border-b-2 transition-all text-sm ${
                  activeTab === 'ready'
                    ? 'border-green-400 text-white drop-shadow-lg'
                    : 'border-transparent text-white/60 hover:text-white/80'
                }`}
              >
                ✅ {t.readyForPickup} ({readyOrders.length})
              </button>
            </nav>
          </div>

          {/* Orders List - Compressed */}
          <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            {activeTab === 'received' && (
              <OrdersList 
                orders={receivedOrders} 
                emptyMessage={t.noOrdersQueue}
                actionLabel={t.startProduction}
                onAction={handleStartProduction}
                color="blue"
                t={t}
              />
            )}
            
            {activeTab === 'preparing' && (
              <OrdersList 
                orders={preparingOrders} 
                emptyMessage={t.noOrdersProduction}
                actionLabel={t.markAsReady}
                onAction={handleMarkReady}
                color="purple"
                t={t}
              />
            )}
            
            {activeTab === 'ready' && (
              <OrdersList 
                orders={readyOrders} 
                emptyMessage={t.noOrdersReady}
                color="green"
                t={t}
              />
            )}
          </div>
        </div>
      )}

      {/* Production Batch Modal */}
      {showBatchModal && (
        <ProductionBatchModal
          t={t}
          onClose={() => setShowBatchModal(false)}
          onSave={async () => {
            setShowBatchModal(false);
            const allOrders = await unifiedWorkflow.loadOrders();
            setOrders(allOrders);
          }}
        />
      )}
    </div>
  );
};

// Orders List Component
interface OrdersListProps {
  orders: WorkflowOrder[];
  emptyMessage: string;
  actionLabel?: string;
  onAction?: (orderId: string) => void;
  color: 'blue' | 'purple' | 'green';
  t: any;
}

const OrdersList: React.FC<OrdersListProps> = ({ orders, emptyMessage, actionLabel, onAction, color, t }) => {
  if (orders.length === 0) {
    return (
      <div className="backdrop-blur-3xl bg-white/10 rounded-xl p-6 text-center border border-white/20">
        <p className="text-white/60 drop-shadow-lg">{emptyMessage}</p>
      </div>
    );
  }

  const colorClasses = {
    blue: 'border-l-cyan-400 bg-gradient-to-r from-cyan-500/10 to-transparent',
    purple: 'border-l-purple-400 bg-gradient-to-r from-purple-500/10 to-transparent',
    green: 'border-l-green-400 bg-gradient-to-r from-green-500/10 to-transparent'
  };

  const buttonClasses = {
    blue: 'bg-cyan-600 hover:bg-cyan-700 shadow-[0_4px_15px_rgba(0,208,232,0.3)]',
    purple: 'bg-purple-600 hover:bg-purple-700 shadow-[0_4px_15px_rgba(168,85,247,0.3)]',
    green: 'bg-green-600 hover:bg-green-700 shadow-[0_4px_15px_rgba(34,197,94,0.3)]'
  };

  return (
    <>
      {orders.map(order => (
        <div 
          key={order.id}
          className={`backdrop-blur-3xl bg-white/10 border-l-4 ${colorClasses[color]} rounded-lg p-3 border border-white/20 hover:shadow-[0_8px_32px_0_rgba(0,208,232,0.2)] transition-all`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-base font-bold text-white drop-shadow-lg">
                #{order.invoiceNumber}
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                {order.clientName}
              </p>
              <p className="text-xs text-white/50">
                {new Date(order.date).toLocaleDateString()}
              </p>
            </div>
            {actionLabel && onAction && (
              <button
                onClick={() => onAction(order.id)}
                className={`px-3 py-1.5 ${buttonClasses[color]} text-white rounded-lg font-bold transition-all text-xs whitespace-nowrap ml-2 hover:scale-105`}
              >
                {actionLabel}
              </button>
            )}
          </div>

          {/* Items Summary - Compact */}
          <div className="bg-white/5 rounded p-2 border border-white/10">
            <div className="space-y-0.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-white/70">
                  <span className="truncate pr-2">{item.productName}</span>
                  <span className="font-bold text-white whitespace-nowrap">×{item.quantity}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-1 mt-1 flex justify-between text-xs font-bold text-white/90">
                <span>Total:</span>
                <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
              </div>
            </div>
          </div>

          {order.productionNotes && (
            <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-400/30 rounded">
              <p className="text-xs text-yellow-200 drop-shadow-lg">
                <span className="font-bold">📝 Note:</span> {order.productionNotes}
              </p>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

// Production Batch Modal Component
interface ProductionBatchModalProps {
  t: any;
  onClose: () => void;
  onSave: () => void;
}

const ProductionBatchModal: React.FC<ProductionBatchModalProps> = ({ t, onClose, onSave }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { supabase } = await import('../../config/supabase');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity > 0) {
      setSelectedProducts(prev => ({ ...prev, [productId]: quantity }));
    } else {
      const newSelected = { ...selectedProducts };
      delete newSelected[productId];
      setSelectedProducts(newSelected);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { supabase } = await import('../../config/supabase');
      
      // Create production batch entries for each selected product
      const batches = Object.entries(selectedProducts).map(([productId, quantity]) => ({
        product_id: productId,
        quantity: quantity,
        start_date: new Date().toISOString(),
        notes: notes || null
      }));

      if (batches.length === 0) {
        alert('Please select at least one product');
        return;
      }

      const { error } = await supabase
        .from('production_batches')
        .insert(batches);

      if (error) throw error;

      onSave();
    } catch (error) {
      console.error('Error saving production batch:', error);
      alert('Error saving production batch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              🍰 {t.addProductionBatch}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {t.selectProducts}
              </p>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      selectedProducts[product.id]
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {product.name}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={selectedProducts[product.id] || 0}
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {product.unit}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t.batchNotes}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(selectedProducts).length === 0}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : t.saveBatch}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionPortal;
