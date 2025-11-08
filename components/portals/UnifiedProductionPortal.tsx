import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ProductionMatrix } from '../ui/ProductionMatrix';
import { unifiedWorkflow, WorkflowOrder } from '../../services/unifiedWorkflow';
import { showToast } from '../../utils/toast';

const countOrderItems = (orders: WorkflowOrder[]) =>
  orders.reduce((orderTotal, order) => {
    const itemsTotal = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    return orderTotal + itemsTotal;
  }, 0);

interface UnifiedProductionPortalProps { t?: any; lang?: 'en' | 'ru' | 'ar'; }

export const UnifiedProductionPortal: React.FC<UnifiedProductionPortalProps> = ({ t, lang = 'en' }) => {
  console.log('🏭🏭🏭 UnifiedProductionPortal component RENDERING');

  const { user } = useAuth();
  const [orders, setOrders] = useState<{
    queue: WorkflowOrder[];
    inProduction: WorkflowOrder[];
    readyForPickup: WorkflowOrder[];
  }>({ queue: [], inProduction: [], readyForPickup: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = {
    id: user?.id || 'unknown',
    name: user?.user_metadata?.full_name || user?.email || 'Worker'
  };

  useEffect(() => {
    loadProductionData(false);

    const unsubscribe = unifiedWorkflow.subscribe(() => {
      setOrders(unifiedWorkflow.getProductionOrders());
    });

    return () => unsubscribe();
  }, []);

  const loadProductionData = async (silent: boolean) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setRefreshing(true);
      await unifiedWorkflow.loadOrders();
      setOrders(unifiedWorkflow.getProductionOrders());
    } catch (error) {
      console.error('❌ Error loading production data:', error);
      showToast('Error loading production data', 'error');
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const transitionOrders = async (
    targetOrders: WorkflowOrder[],
    stage: string,
    successMessage: string,
    errorPrefix: string,
    noteBuilder?: (order: WorkflowOrder) => string
  ) => {
    if (targetOrders.length === 0) {
      return;
    }

    try {
      await Promise.all(
        targetOrders.map(order =>
          unifiedWorkflow.updateOrderStage(
            order.id,
            stage,
            currentUser.id,
            'production',
            noteBuilder ? noteBuilder(order) : `${stage.replace(/_/g, ' ')} by ${currentUser.name}`
          )
        )
      );

      setOrders(unifiedWorkflow.getProductionOrders());
      showToast(successMessage, 'success');
    } catch (error) {
      console.error(`❌ ${errorPrefix}:`, error);
      throw error;
    }
  };

  const handleStartClient = async (_clientId: string, clientOrders: WorkflowOrder[]) => {
    const clientName = clientOrders[0]?.clientName || 'Client';
    const itemsCount = countOrderItems(clientOrders);

    await transitionOrders(
      clientOrders,
      'in_production',
      `🔥 Started cooking ${itemsCount} items for ${clientName}`,
      `Error starting production for ${clientName}`,
      order => `Production started for ${order.invoiceNumber} by ${currentUser.name}`
    );
  };

  const handleReadyClient = async (_clientId: string, clientOrders: WorkflowOrder[]) => {
    const clientName = clientOrders[0]?.clientName || 'Client';
    const itemsCount = countOrderItems(clientOrders);

    await transitionOrders(
      clientOrders,
      'ready_for_delivery',
      `✅ Marked ${itemsCount} items ready for ${clientName}`,
      `Error marking orders ready for ${clientName}`,
      order => `Production completed for ${order.invoiceNumber} by ${currentUser.name}`
    );
  };

  const handleStartAll = async (allOrders: WorkflowOrder[]) => {
    const itemsCount = countOrderItems(allOrders);
    await transitionOrders(
      allOrders,
      'in_production',
      `🔥 Started cooking ${itemsCount} items across all clients`,
      'Error starting all queued orders',
      order => `Production started for ${order.invoiceNumber} by ${currentUser.name}`
    );
  };

  const handleReadyAll = async (allOrders: WorkflowOrder[]) => {
    const itemsCount = countOrderItems(allOrders);
    await transitionOrders(
      allOrders,
      'ready_for_delivery',
      `✅ Marked ${itemsCount} items ready across all clients`,
      'Error marking all cooking orders ready',
      order => `Production completed for ${order.invoiceNumber} by ${currentUser.name}`
    );
  };

  const orderCounts = {
    queue: orders.queue.length,
    inProduction: orders.inProduction.length,
    ready: orders.readyForPickup.length
  };

  const itemCounts = {
    queue: countOrderItems(orders.queue),
    inProduction: countOrderItems(orders.inProduction),
    ready: countOrderItems(orders.readyForPickup)
  };

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

  const summaryCards = [
    {
      label: t?.productionPortal?.queueLabel ?? 'Queue',
      icon: '⏳',
      orders: orderCounts.queue,
      items: itemCounts.queue,
      accent: 'from-sky-500/40 to-cyan-500/40'
    },
    {
      label: t?.productionPortal?.cookingLabel ?? 'Cooking',
      icon: '🔥',
      orders: orderCounts.inProduction,
      items: itemCounts.inProduction,
      accent: 'from-amber-500/40 to-orange-500/40'
    },
    {
      label: t?.productionPortal?.readyLabel ?? 'Ready',
      icon: '✅',
      orders: orderCounts.ready,
      items: itemCounts.ready,
      accent: 'from-emerald-500/40 to-green-500/40'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="glass-header sticky top-0 z-40 py-6 px-6 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <img src="/logo/logo.png" alt="Slatko Logo" className="h-10 w-10 object-contain" />
                <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                  🏭 {t?.productionPortal?.title ?? 'Production Portal'}
                </h1>
              </div>
              <p className="text-gray-600 dark:text-slate-300 mt-1 font-medium">
                {t?.productionPortal?.subtitle ?? 'Kitchen workflow management • every order, every stage'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="badge badge-worker animate-float bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100">
                👨‍🍳 {t?.productionPortal?.loggedInAs ?? 'Logged in as'}: {currentUser.name}
              </div>
              <button
                onClick={() => loadProductionData(true)}
                disabled={refreshing}
                className="btn-primary flex items-center gap-2 disabled:opacity-60 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600"
              >
                {refreshing ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    {t?.productionPortal?.refreshing ?? 'Refreshing'}
                  </>
                ) : (
                  <>
                    🔄 {t?.productionPortal?.refresh ?? 'Refresh'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 h-full">
          <div className="grid gap-4 md:grid-cols-3 shrink-0">
            {summaryCards.map(card => (
              <div
                key={card.label}
                className={`glass-card p-6 border border-white/40 bg-gradient-to-br ${card.accent} dark:border-slate-700`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{card.icon}</span>
                  <span className="text-xs uppercase tracking-wide text-white/70 font-semibold">
                    {card.label}
                  </span>
                </div>
                <div className="text-white">
                  <div className="text-4xl font-black leading-none drop-shadow-sm">{card.items}</div>
                  <div className="text-sm font-semibold text-white/80 mt-2">
                    {(t?.productionPortal?.ordersLabel ?? 'Orders') + ': '}{card.orders}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-0">
            <ProductionMatrix
              queue={orders.queue}
              inProduction={orders.inProduction}
              readyForPickup={orders.readyForPickup}
              t={t}
              locale={lang}
              showToast={showToast}
              onStartClient={handleStartClient}
              onMarkReadyClient={handleReadyClient}
              onStartAll={handleStartAll}
              onMarkAllReady={handleReadyAll}
            />
          </div>
        </div>
      </div>
    </div>
  );
};