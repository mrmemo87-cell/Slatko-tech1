import React, { useMemo, useState, useCallback } from 'react';
import type { WorkflowOrder } from '../../services/unifiedWorkflow';
import { transliterateToCyrillic } from '../../utils';

interface ProductionMatrixProps {
  queue: WorkflowOrder[];
  inProduction: WorkflowOrder[];
  readyForPickup: WorkflowOrder[];
  t?: any;
  locale?: 'en' | 'ru' | 'ar';
  showToast: (message: string, type?: 'success' | 'error') => void;
  onStartClient: (clientId: string, orders: WorkflowOrder[]) => Promise<void>;
  onMarkReadyClient: (clientId: string, orders: WorkflowOrder[]) => Promise<void>;
  onStartAll: (orders: WorkflowOrder[]) => Promise<void>;
  onMarkAllReady: (orders: WorkflowOrder[]) => Promise<void>;
}

type StageKey = 'queue' | 'cooking' | 'ready';

interface StageCounts {
  queue: number;
  cooking: number;
  ready: number;
}

interface ClientBucket {
  clientId: string;
  clientName: string;
  clientDisplayName: string;
  queueOrders: WorkflowOrder[];
  inProductionOrders: WorkflowOrder[];
  readyOrders: WorkflowOrder[];
}

interface MatrixRow {
  productId: string;
  productName: string;
  clientStages: Record<string, StageCounts>;
  totals: StageCounts & { total: number };
}

const EMPTY_COUNTS: StageCounts = { queue: 0, cooking: 0, ready: 0 };

const sumStageCounts = (counts: StageCounts) => counts.queue + counts.cooking + counts.ready;

export const ProductionMatrix: React.FC<ProductionMatrixProps> = ({
  queue,
  inProduction,
  readyForPickup,
  t,
  locale = 'en',
  showToast,
  onStartClient,
  onMarkReadyClient,
  onStartAll,
  onMarkAllReady
}) => {
  const [clientLoading, setClientLoading] = useState<Record<string, { start?: boolean; ready?: boolean }>>({});
  const [globalLoading, setGlobalLoading] = useState<{ startAll: boolean; readyAll: boolean }>({
    startAll: false,
    readyAll: false
  });

  const shouldTransliterateClients = locale === 'ru';

  const productTranslationSource = useMemo(
    () => (t?.products?.names ?? {}) as Record<string, string>,
    [t]
  );

  const productTranslations = useMemo(() => {
    const normalized: Record<string, string> = {};
    Object.entries(productTranslationSource).forEach(([key, value]) => {
      if (!key) return;
      normalized[key.trim().toLowerCase()] = value;
    });
    return normalized;
  }, [productTranslationSource]);

  const clientNameOverridesSource = useMemo(
    () => (t?.productionPortal?.clientNames ?? {}) as Record<string, string>,
    [t]
  );

  const clientNameOverrides = useMemo(() => {
    const normalized: Record<string, string> = {};
    Object.entries(clientNameOverridesSource).forEach(([key, value]) => {
      if (!key) return;
      normalized[key.trim().toLowerCase()] = value;
    });
    return normalized;
  }, [clientNameOverridesSource]);

  const translateClientName = useCallback(
    (name: string) => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) {
        return t?.productionPortal?.unknownClient ?? 'Unknown Client';
      }

      const override = clientNameOverrides[trimmed.toLowerCase()];
      if (override) {
        return override;
      }

      if (locale === 'ru') {
        return transliterateToCyrillic(trimmed);
      }

      return trimmed;
    },
    [clientNameOverrides, locale, t]
  );

  const translateProductName = useCallback(
    (name: string) => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) {
        return t?.productionPortal?.unknownProduct ?? 'Unknown Product';
      }

      const lookup = productTranslations[trimmed.toLowerCase()];
      if (lookup) {
        return lookup;
      }

      if (locale === 'ru') {
        return transliterateToCyrillic(trimmed);
      }

      return trimmed;
    },
    [productTranslations, locale, t]
  );

  const clientBuckets = useMemo(() => {
    const map = new Map<string, ClientBucket>();

    const ensureEntry = (order: WorkflowOrder) => {
      const existing = map.get(order.clientId);
      if (existing) return existing;
      const baseName = order.clientName || 'Unknown Client';
      const entry: ClientBucket = {
        clientId: order.clientId,
        clientName: baseName,
        clientDisplayName: baseName,
        queueOrders: [],
        inProductionOrders: [],
        readyOrders: []
      };
      map.set(order.clientId, entry);
      return entry;
    };

    queue.forEach(order => ensureEntry(order).queueOrders.push(order));
    inProduction.forEach(order => ensureEntry(order).inProductionOrders.push(order));
    readyForPickup.forEach(order => ensureEntry(order).readyOrders.push(order));

    const buckets = Array.from(map.values()).map(bucket => {
      const displayName = translateClientName(bucket.clientName);
      return { ...bucket, clientDisplayName: displayName };
    });

  const localeForSort = locale === 'ru' ? 'ru' : locale === 'ar' ? 'ar' : undefined;

    return buckets.sort((a, b) =>
      a.clientDisplayName.localeCompare(b.clientDisplayName, localeForSort)
    );
  }, [queue, inProduction, readyForPickup, shouldTransliterateClients, translateClientName]);

  const matrixRows = useMemo<MatrixRow[]>(() => {
    const productMap = new Map<string, MatrixRow>();

    const addOrders = (orders: WorkflowOrder[], stage: StageKey) => {
      orders.forEach(order => {
        order.items?.forEach(item => {
          let row = productMap.get(item.productId);
          if (!row) {
            row = {
              productId: item.productId,
              productName: item.productName || 'Unknown Product',
              clientStages: {},
              totals: { queue: 0, cooking: 0, ready: 0, total: 0 }
            };
            productMap.set(item.productId, row);
          }

          const clientCounts = row.clientStages[order.clientId] || { ...EMPTY_COUNTS };
          clientCounts[stage] += item.quantity;
          row.clientStages[order.clientId] = clientCounts;

          row.totals[stage] += item.quantity;
          row.totals.total += item.quantity;
        });
      });
    };

    addOrders(queue, 'queue');
    addOrders(inProduction, 'cooking');
    addOrders(readyForPickup, 'ready');

  const localeForSort = locale === 'ru' ? 'ru' : locale === 'ar' ? 'ar' : undefined;

    return Array.from(productMap.values()).sort((a, b) =>
      translateProductName(a.productName).localeCompare(
        translateProductName(b.productName),
        localeForSort
      )
    );
  }, [queue, inProduction, readyForPickup, translateProductName, locale]);

  const grandTotals = useMemo(() => {
    return matrixRows.reduce(
      (acc, row) => {
        acc.queue += row.totals.queue;
        acc.cooking += row.totals.cooking;
        acc.ready += row.totals.ready;
        acc.total += row.totals.total;
        return acc;
      },
      { queue: 0, cooking: 0, ready: 0, total: 0 }
    );
  }, [matrixRows]);

  const clientTotals = useMemo(() => {
    const totals: Record<string, { queue: number; cooking: number; ready: number; total: number }> = {};
    clientBuckets.forEach(client => {
      totals[client.clientId] = { queue: 0, cooking: 0, ready: 0, total: 0 };
    });

    matrixRows.forEach(row => {
      clientBuckets.forEach(client => {
        const counts = row.clientStages[client.clientId];
        if (!counts) return;
        totals[client.clientId].queue += counts.queue;
        totals[client.clientId].cooking += counts.cooking;
        totals[client.clientId].ready += counts.ready;
        totals[client.clientId].total += sumStageCounts(counts);
      });
    });

    return totals;
  }, [matrixRows, clientBuckets]);

  const queueOrdersAll = useMemo(() => clientBuckets.flatMap(client => client.queueOrders), [clientBuckets]);
  const inProductionOrdersAll = useMemo(() => clientBuckets.flatMap(client => client.inProductionOrders), [clientBuckets]);

  const handleClientStart = async (clientId: string) => {
    const bucket = clientBuckets.find(c => c.clientId === clientId);
    if (!bucket) {
      showToast('Client not found for production start', 'error');
      return;
    }
    if (bucket.queueOrders.length === 0) {
      showToast('No orders waiting for this client', 'error');
      return;
    }

    setClientLoading(prev => ({ ...prev, [clientId]: { ...prev[clientId], start: true } }));
    try {
      await onStartClient(clientId, bucket.queueOrders);
    } catch (error) {
      console.error('Error starting production for client:', error);
      showToast('Error starting production for client', 'error');
    } finally {
      setClientLoading(prev => ({ ...prev, [clientId]: { ...prev[clientId], start: false } }));
    }
  };

  const handleClientReady = async (clientId: string) => {
    const bucket = clientBuckets.find(c => c.clientId === clientId);
    if (!bucket) {
      showToast('Client not found for completion', 'error');
      return;
    }
    if (bucket.inProductionOrders.length === 0) {
      showToast('No orders cooking for this client', 'error');
      return;
    }

    setClientLoading(prev => ({ ...prev, [clientId]: { ...prev[clientId], ready: true } }));
    try {
      await onMarkReadyClient(clientId, bucket.inProductionOrders);
    } catch (error) {
      console.error('Error completing production for client:', error);
      showToast('Error marking client orders ready', 'error');
    } finally {
      setClientLoading(prev => ({ ...prev, [clientId]: { ...prev[clientId], ready: false } }));
    }
  };

  const handleStartAll = async () => {
    if (queueOrdersAll.length === 0) {
      showToast('No orders waiting in the queue', 'error');
      return;
    }
    setGlobalLoading(prev => ({ ...prev, startAll: true }));
    try {
      await onStartAll(queueOrdersAll);
    } catch (error) {
      console.error('Error starting all orders:', error);
      showToast('Error starting all orders', 'error');
    } finally {
      setGlobalLoading(prev => ({ ...prev, startAll: false }));
    }
  };

  const handleReadyAll = async () => {
    if (inProductionOrdersAll.length === 0) {
      showToast('No orders currently cooking', 'error');
      return;
    }
    setGlobalLoading(prev => ({ ...prev, readyAll: true }));
    try {
      await onMarkAllReady(inProductionOrdersAll);
    } catch (error) {
      console.error('Error marking all orders ready:', error);
      showToast('Error marking all orders ready', 'error');
    } finally {
      setGlobalLoading(prev => ({ ...prev, readyAll: false }));
    }
  };

  if (clientBuckets.length === 0 || matrixRows.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl shadow-xl border border-white/30 p-10 text-center">
        <div className="text-5xl mb-3">🧁</div>
        <h3 className="text-2xl font-bold text-white mb-2">{t?.productionPortal?.emptyStateTitle ?? 'No production work yet'}</h3>
        <p className="text-white/80">{t?.productionPortal?.emptyStateDescription ?? 'Orders will appear here as soon as they enter the production workflow.'}</p>
      </div>
    );
  }

  const clientColumnWidth = useMemo(() => {
    if (clientBuckets.length === 0) return 140;
    const base = Math.floor(720 / clientBuckets.length);
    return Math.max(96, Math.min(160, base));
  }, [clientBuckets.length]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/10 dark:bg-black/30 rounded-2xl px-4 py-3 border border-white/20 backdrop-blur">
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-white/80">
          <span className="flex items-center gap-1 text-xs sm:text-sm"><span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>{t?.productionPortal?.queueLabel ?? 'Queue'}</span>
          <span className="flex items-center gap-1 text-xs sm:text-sm"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>{t?.productionPortal?.cookingLabel ?? 'Cooking'}</span>
          <span className="flex items-center gap-1 text-xs sm:text-sm"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>{t?.productionPortal?.readyLabel ?? 'Ready'}</span>
        </div>
        <div className="text-xs sm:text-sm text-white/80 font-semibold">
          {(t?.productionPortal?.totalItemsLabel ?? 'Total Items') + ': '}<span className="text-white font-bold">{grandTotals.total}</span>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl shadow-xl border border-white/30 flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            <table className="w-full table-fixed text-[11px] sm:text-xs md:text-sm">
              <colgroup>
                <col style={{ width: 200 }} />
                {clientBuckets.map(client => (
                  <col key={client.clientId} style={{ width: clientColumnWidth }} />
                ))}
                <col style={{ width: 140 }} />
              </colgroup>
              <thead className="sticky top-0 z-20">
                <tr className="bg-gradient-to-r from-cyan-600/70 to-purple-600/70 text-white">
                  <th className="sticky left-0 bg-gradient-to-r from-cyan-600/80 to-purple-600/80 px-3 py-3 text-left font-bold">
                    {t?.productionPortal?.product ?? 'Products'}
                  </th>
                  {clientBuckets.map(client => (
                    <th key={client.clientId} className="px-2 sm:px-3 py-3 text-center font-semibold border-l border-white/20">
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-[10px] sm:text-xs">👤</span>
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
                          {client.clientDisplayName}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-white/80">
                          {(t?.productionPortal?.totalShort ?? 'Total') + ': '}{clientTotals[client.clientId]?.total ?? 0}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 sm:px-3 py-3 text-center font-semibold border-l-2 border-white/40 bg-pink-600/70">
                    {t?.productionPortal?.totalItems ?? 'Totals'}
                  </th>
                </tr>
              </thead>
              <tbody>
              {matrixRows.map((row, index) => (
                <tr
                  key={row.productId}
                  className={`border-b border-white/10 ${index % 2 === 0 ? 'bg-white/5 dark:bg-white/10' : ''}`}
                >
                  <td className="sticky left-0 bg-slate-900/60 text-white px-3 py-1.5 font-semibold uppercase tracking-wide">
                    {translateProductName(row.productName)}
                  </td>
                  {clientBuckets.map(client => {
                    const counts = row.clientStages[client.clientId] || EMPTY_COUNTS;
                    const total = sumStageCounts(counts);
                    return (
                      <td key={client.clientId} className="px-2 sm:px-3 py-1.5 text-center align-top border-l border-white/10">
                        {total === 0 ? (
                          <span className="text-white/30 text-[10px] sm:text-xs">—</span>
                        ) : (
                          <div className="space-y-1">
                            {counts.queue > 0 && (
                              <span className="block text-[10px] sm:text-xs font-semibold bg-slate-200 text-slate-900 rounded-full px-2 py-1">
                                ⏳ {counts.queue}
                              </span>
                            )}
                            {counts.cooking > 0 && (
                              <span className="block text-[10px] sm:text-xs font-semibold bg-amber-400 text-amber-900 rounded-full px-2 py-1">
                                🔥 {counts.cooking}
                              </span>
                            )}
                            {counts.ready > 0 && (
                              <span className="block text-[10px] sm:text-xs font-semibold bg-emerald-400 text-emerald-900 rounded-full px-2 py-1">
                                ✅ {counts.ready}
                              </span>
                            )}
                            <div className="text-[9px] sm:text-[10px] text-white/70 font-semibold">
                              {(t?.productionPortal?.totalShort ?? 'Total') + ': '}{total}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 sm:px-3 py-1.5 text-center border-l-2 border-white/20 bg-pink-500/20">
                    <div className="space-y-1">
                      {row.totals.queue > 0 && (
                        <span className="block text-[10px] sm:text-xs font-semibold bg-white/80 text-slate-900 rounded-full px-2 py-1">
                          ⏳ {row.totals.queue}
                        </span>
                      )}
                      {row.totals.cooking > 0 && (
                        <span className="block text-[10px] sm:text-xs font-semibold bg-amber-400 text-amber-900 rounded-full px-2 py-1">
                          🔥 {row.totals.cooking}
                        </span>
                      )}
                      {row.totals.ready > 0 && (
                        <span className="block text-[10px] sm:text-xs font-semibold bg-emerald-400 text-emerald-900 rounded-full px-2 py-1">
                          ✅ {row.totals.ready}
                        </span>
                      )}
                      <div className="text-[10px] sm:text-xs text-white font-bold">
                        {(t?.productionPortal?.totalShort ?? 'Total') + ': '}{row.totals.total}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-900/70 text-white border-t border-white/20">
                <td className="sticky left-0 px-3 py-2.5 font-bold uppercase text-xs tracking-wide">
                  {t?.productionPortal?.actions ?? 'Actions'}
                </td>
                {clientBuckets.map(client => {
                  const loadingState = clientLoading[client.clientId] || {};
                  const queueCount = clientTotals[client.clientId]?.queue ?? 0;
                  const cookingCount = clientTotals[client.clientId]?.cooking ?? 0;
                  return (
                    <td key={client.clientId} className="px-2 sm:px-3 py-2.5 text-center border-l border-white/10">
                      <div className="flex flex-col gap-2 text-[10px] sm:text-xs">
                        <button
                          onClick={() => handleClientStart(client.clientId)}
                          disabled={loadingState.start || queueCount === 0}
                          className="px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingState.start ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                              {t?.productionPortal?.starting ?? 'Starting...'}
                            </span>
                          ) : (
                            <span className="flex flex-col items-center gap-1">
                              <span>🍳 {t?.productionPortal?.startProduction ?? 'Start'}</span>
                              <span className="text-[9px] text-white/80">{queueCount} {t?.productionPortal?.itemsShort ?? 'items'}</span>
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleClientReady(client.clientId)}
                          disabled={loadingState.ready || cookingCount === 0}
                          className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingState.ready ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                              {t?.productionPortal?.updating ?? 'Updating...'}
                            </span>
                          ) : (
                            <span className="flex flex-col items-center gap-1">
                              <span>✅ {t?.productionPortal?.markAsReady ?? 'Ready'}</span>
                              <span className="text-[9px] text-white/80">{cookingCount} {t?.productionPortal?.itemsShort ?? 'items'}</span>
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 sm:px-3 py-2.5 text-center border-l-2 border-white/30 bg-slate-800/80 text-[10px] sm:text-xs">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleStartAll}
                      disabled={globalLoading.startAll || queueOrdersAll.length === 0}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-cyan-500 text-white font-black shadow-xl hover:shadow-2xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {globalLoading.startAll ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                          {t?.productionPortal?.starting ?? 'Starting...'}
                        </span>
                      ) : (
                        <span className="flex flex-col items-center gap-1">
                          <span>🔥 {t?.productionPortal?.startAll ?? 'START ALL'}</span>
                          <span className="text-[9px] text-white/80">{grandTotals.queue} {t?.productionPortal?.itemsShort ?? 'items'}</span>
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleReadyAll}
                      disabled={globalLoading.readyAll || inProductionOrdersAll.length === 0}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black shadow-xl hover:shadow-2xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {globalLoading.readyAll ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                          {t?.productionPortal?.updating ?? 'Updating...'}
                        </span>
                      ) : (
                        <span className="flex flex-col items-center gap-1">
                          <span>🚚 {t?.productionPortal?.readyAll ?? 'READY ALL'}</span>
                          <span className="text-[9px] text-white/80">{grandTotals.cooking} {t?.productionPortal?.itemsShort ?? 'items'}</span>
                        </span>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900/80 text-white px-4 sm:px-6 py-3 border-t border-white/20 text-[10px] sm:text-xs flex flex-wrap gap-3 justify-between">
          <div>
            <span className="font-semibold">{t?.productionPortal?.totalProducts ?? 'Total Products'}:</span> {matrixRows.length}
          </div>
          <div>
            <span className="font-semibold">{t?.productionPortal?.clientsInWorkflow ?? 'Clients in workflow'}:</span> {clientBuckets.length}
          </div>
          <div className="flex gap-2 sm:gap-4">
            <span className="font-semibold">{t?.productionPortal?.queueLabel ?? 'Queue'}:</span> {grandTotals.queue}
            <span className="font-semibold">{t?.productionPortal?.cookingLabel ?? 'Cooking'}:</span> {grandTotals.cooking}
            <span className="font-semibold">{t?.productionPortal?.readyLabel ?? 'Ready'}:</span> {grandTotals.ready}
            <span className="font-semibold">{t?.productionPortal?.overallLabel ?? 'Overall'}:</span> {grandTotals.total}
          </div>
        </div>
      </div>
    </div>
  );
};
