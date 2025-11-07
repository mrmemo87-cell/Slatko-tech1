import React, { useMemo, useState } from 'react';
import { Delivery, Product, Client } from '../../types';
import { supabaseApi } from '../../services/supabase-api';

interface ProductionMatrixProps {
  deliveries: Delivery[];
  products: Product[];
  clients: Client[];
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onProductionStarted?: () => void;
}

interface MatrixData {
  productId: string;
  productName: string;
  clientQuantities: Record<string, number>; // clientId -> quantity
  totalQuantity: number;
}

export const ProductionMatrix: React.FC<ProductionMatrixProps> = ({
  deliveries,
  products,
  clients,
  t,
  showToast,
  onProductionStarted
}) => {
  const [startingProduction, setStartingProduction] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });

  // Get pending deliveries for selected date
  const dailyDeliveries = useMemo(() => {
    return deliveries.filter(d => 
      d.date === selectedDate && 
      d.status === 'Pending'
    );
  }, [deliveries, selectedDate]);

  // Get unique clients with orders for this date
  const activeClients = useMemo(() => {
    const clientIds = new Set(dailyDeliveries.map(d => d.clientId));
    return clients
      .filter(c => clientIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dailyDeliveries, clients]);

  // Build the matrix data
  const matrixData = useMemo<MatrixData[]>(() => {
    const productMap = new Map<string, MatrixData>();

    // Initialize with all products that appear in orders
    dailyDeliveries.forEach(delivery => {
      delivery.items?.forEach(item => {
        if (!productMap.has(item.productId)) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            productMap.set(item.productId, {
              productId: item.productId,
              productName: product.name,
              clientQuantities: {},
              totalQuantity: 0
            });
          }
        }

        const matrixEntry = productMap.get(item.productId);
        if (matrixEntry) {
          if (!matrixEntry.clientQuantities[delivery.clientId]) {
            matrixEntry.clientQuantities[delivery.clientId] = 0;
          }
          matrixEntry.clientQuantities[delivery.clientId] += item.quantity;
          matrixEntry.totalQuantity += item.quantity;
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) => 
      a.productName.localeCompare(b.productName)
    );
  }, [dailyDeliveries, products]);

  // Handle "Start Cooking" for a specific client
  const handleStartCooking = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    try {
      setStartingProduction(prev => ({ ...prev, [clientId]: true }));

      // Get all products this client needs
      const clientProducts = matrixData
        .filter(row => row.clientQuantities[clientId] > 0)
        .map(row => ({
          productId: row.productId,
          productName: row.productName,
          quantity: row.clientQuantities[clientId]
        }));

      if (clientProducts.length === 0) {
        showToast('No products to cook for this client', 'error');
        return;
      }

      // Create production batches for each product
      const batchPromises = clientProducts.map(async (item) => {
        return await supabaseApi.createProductionBatch({
          productId: item.productId,
          quantity: item.quantity,
          date: selectedDate,
          status: 'In Progress',
          notes: `For ${client.name} - ${selectedDate}`
        });
      });

      await Promise.all(batchPromises);

      showToast(
        `✅ Started cooking ${clientProducts.length} products for ${client.name}!`,
        'success'
      );

      // Notify parent to refresh data
      if (onProductionStarted) {
        onProductionStarted();
      }
    } catch (error) {
      console.error('Error starting production:', error);
      showToast('Error starting production', 'error');
    } finally {
      setStartingProduction(prev => ({ ...prev, [clientId]: false }));
    }
  };

  // Handle "Start All" - cook everything for all clients
  const handleStartAllCooking = async () => {
    try {
      setStartingProduction({ all: true });

      const allBatches = matrixData.map(async (row) => {
        return await supabaseApi.createProductionBatch({
          productId: row.productId,
          quantity: row.totalQuantity,
          date: selectedDate,
          status: 'In Progress',
          notes: `All clients - ${selectedDate}`
        });
      });

      await Promise.all(allBatches);

      showToast(
        `✅ Started cooking ${matrixData.length} products for all clients!`,
        'success'
      );

      if (onProductionStarted) {
        onProductionStarted();
      }
    } catch (error) {
      console.error('Error starting production:', error);
      showToast('Error starting production', 'error');
    } finally {
      setStartingProduction({ all: false });
    }
  };

  // Get available dates with pending orders
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    deliveries
      .filter(d => d.status === 'Pending')
      .forEach(d => dates.add(d.date));
    
    return Array.from(dates).sort();
  }, [deliveries]);

  const getDateLabel = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (date === today) return `Today (${date})`;
    if (date === tomorrowStr) return `Tomorrow (${date})`;
    
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    return `${dayOfWeek} ${date}`;
  };

  if (availableDates.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl shadow-xl border border-white/30 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🍰</div>
          <h3 className="text-xl font-bold text-white mb-2">No Pending Orders</h3>
          <p className="text-white/70">There are no pending deliveries to prepare.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Date Selector */}
      <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl shadow-xl border border-white/30 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white drop-shadow-lg">
              🍳 Production Matrix
            </h2>
            <p className="text-white/80 text-sm mt-1">
              What to cook for each client
            </p>
          </div>

          {/* Date Selector */}
          <div className="flex gap-2 items-center">
            <label className="text-white font-semibold text-sm">Date:</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border-2 border-white/30 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
            >
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {getDateLabel(date)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      {activeClients.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl shadow-xl border border-white/30 p-8 text-center">
          <div className="text-4xl mb-2">📅</div>
          <p className="text-white font-semibold">No orders for {selectedDate}</p>
        </div>
      ) : (
        <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          {/* Scrollable Container for Mobile */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-600/50 to-purple-600/50 backdrop-blur-sm border-b-2 border-white/30">
                  <th className="px-4 py-4 text-left font-bold text-white sticky left-0 bg-gradient-to-r from-cyan-600/70 to-purple-600/70 backdrop-blur-md z-10 min-w-[180px]">
                    Products
                  </th>
                  {activeClients.map(client => (
                    <th
                      key={client.id}
                      className="px-4 py-4 text-center font-bold text-white min-w-[140px] border-l border-white/20"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm">👤</span>
                        <span className="text-xs leading-tight">{client.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center font-bold text-white min-w-[120px] border-l-2 border-white/40 bg-pink-600/50">
                    <div className="flex flex-col items-center">
                      <span className="text-sm">📊</span>
                      <span className="text-xs">TOTAL</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrixData.map((row, rowIndex) => (
                  <tr
                    key={row.productId}
                    className={`border-b border-white/10 hover:bg-white/10 transition-colors ${
                      rowIndex % 2 === 0 ? 'bg-white/5' : ''
                    }`}
                  >
                    {/* Product Name - Sticky */}
                    <td className="px-4 py-3 font-semibold text-white sticky left-0 bg-slate-800/80 backdrop-blur-md z-10 border-r border-white/10">
                      {row.productName}
                    </td>

                    {/* Client Quantities */}
                    {activeClients.map(client => {
                      const quantity = row.clientQuantities[client.id] || 0;
                      return (
                        <td
                          key={client.id}
                          className="px-4 py-3 text-center border-l border-white/10"
                        >
                          {quantity > 0 ? (
                            <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/30 text-white font-bold text-lg border border-cyan-400/50">
                              {quantity}
                            </span>
                          ) : (
                            <span className="text-white/30 text-sm">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Column */}
                    <td className="px-4 py-3 text-center border-l-2 border-white/20 bg-pink-500/20">
                      <span className="inline-block px-3 py-1 rounded-full bg-pink-600/50 text-white font-black text-lg border-2 border-pink-400">
                        {row.totalQuantity}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Action Row - Start Cooking Buttons */}
                <tr className="bg-gradient-to-r from-green-600/30 to-green-500/30 backdrop-blur-sm border-t-2 border-white/30">
                  <td className="px-4 py-4 font-bold text-white sticky left-0 bg-green-700/50 backdrop-blur-md z-10">
                    Actions
                  </td>
                  {activeClients.map(client => (
                    <td key={client.id} className="px-2 py-4 text-center border-l border-white/10">
                      <button
                        onClick={() => handleStartCooking(client.id)}
                        disabled={startingProduction[client.id]}
                        className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed text-sm"
                      >
                        {startingProduction[client.id] ? (
                          <span className="flex items-center justify-center gap-1">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span className="hidden sm:inline">...</span>
                          </span>
                        ) : (
                          <span className="flex flex-col items-center gap-1">
                            <span>🍳</span>
                            <span className="text-xs leading-tight">Start<br/>Cooking</span>
                          </span>
                        )}
                      </button>
                    </td>
                  ))}
                  <td className="px-2 py-4 text-center border-l-2 border-white/20 bg-green-600/30">
                    <button
                      onClick={handleStartAllCooking}
                      disabled={startingProduction.all}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-black rounded-lg shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
                    >
                      {startingProduction.all ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          Starting...
                        </span>
                      ) : (
                        <span className="flex flex-col items-center gap-1">
                          <span className="text-xl">🔥</span>
                          <span className="text-xs">START ALL</span>
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm px-6 py-4 border-t border-white/20">
            <div className="flex flex-wrap gap-4 justify-between items-center text-white text-sm">
              <div>
                <span className="font-semibold">Total Products:</span>{' '}
                <span className="font-bold text-cyan-300">{matrixData.length}</span>
              </div>
              <div>
                <span className="font-semibold">Total Clients:</span>{' '}
                <span className="font-bold text-purple-300">{activeClients.length}</span>
              </div>
              <div>
                <span className="font-semibold">Total Items:</span>{' '}
                <span className="font-bold text-pink-300">
                  {matrixData.reduce((sum, row) => sum + row.totalQuantity, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
