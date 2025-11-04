import React, { useState, useMemo } from 'react';
import { Delivery, Product, Client } from '../../types';
import { formatDate, formatCurrency } from '../../utils';

interface DailyOrderPlanningProps {
  deliveries: Delivery[];
  products: Product[];
  clients: Client[];
  t: any;
}

type ProductSummaryEntry = { quantity: number; product: Product };

interface DayGroup {
  date: string;
  deliveries: Delivery[];
  totalOrders: number;
  totalAmount: number;
  productSummary: Record<string, ProductSummaryEntry>;
}

export const DailyOrderPlanning: React.FC<DailyOrderPlanningProps> = ({ 
  deliveries, 
  products, 
  clients, 
  t 
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Get upcoming deliveries (today + next 7-30 days)
  const upcomingDeliveries = useMemo(() => {
    const today = new Date();
    const days = viewMode === 'week' ? 7 : 30;
    const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    return deliveries
      .filter(d => {
        const deliveryDate = new Date(d.date);
        return deliveryDate >= today && deliveryDate <= endDate && d.status === 'Pending';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [deliveries, viewMode]);

  // Group deliveries by date
  const dailyGroups = useMemo<DayGroup[]>(() => {
    const groups = upcomingDeliveries.reduce<Record<string, DayGroup>>((acc, delivery) => {
      const dateKey = delivery.date;
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          deliveries: [],
          totalOrders: 0,
          totalAmount: 0,
          productSummary: {}
        };
      }
      
      acc[dateKey].deliveries.push(delivery);
      acc[dateKey].totalOrders++;
      
      // Calculate amounts and product summary
      delivery.items?.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const returnedQty = delivery.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
          const soldQty = item.quantity - returnedQty;
          const itemTotal = soldQty * item.price;
          
          acc[dateKey].totalAmount += itemTotal;
          
          if (!acc[dateKey].productSummary[item.productId]) {
            acc[dateKey].productSummary[item.productId] = { quantity: 0, product };
          }
          acc[dateKey].productSummary[item.productId].quantity += soldQty;
        }
      });
      
      return acc;
      }, {});

      const orderedGroups = Object.values(groups) as DayGroup[];
      return orderedGroups.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [upcomingDeliveries, products]);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.businessName || client?.name || 'Unknown Client';
  };

  const isToday = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  const isTomorrow = (date: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date === tomorrow.toISOString().split('T')[0];
  };

  const getDateLabel = (date: string) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = formatDate(date);
    return `${dayOfWeek}, ${formattedDate}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Daily Order Planning
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Production planning and delivery schedule
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'week'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'month'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Next 30 Days
          </button>
        </div>
      </div>

      {dailyGroups.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
          <div className="text-slate-400 dark:text-slate-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
            No upcoming orders
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            No pending deliveries scheduled for the {viewMode === 'week' ? 'next 7 days' : 'next 30 days'}.
          </p>
        </div>
      ) : (
        /* Daily Order Cards */
        <div className="space-y-4">
          {dailyGroups.map((dayGroup) => {
            const productSummaries: ProductSummaryEntry[] = Object.values(dayGroup.productSummary);
            const topProducts = [...productSummaries].sort((a, b) => b.quantity - a.quantity);

            return (
            <div
              key={dayGroup.date}
              className={`bg-white dark:bg-slate-800 rounded-lg shadow-md border transition-all ${
                isToday(dayGroup.date) 
                  ? 'border-blue-300 dark:border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900' 
                  : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
              }`}
            >
              {/* Day Header */}
              <div 
                className={`p-4 cursor-pointer ${
                  isToday(dayGroup.date) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                onClick={() => setSelectedDate(selectedDate === dayGroup.date ? null : dayGroup.date)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isToday(dayGroup.date) 
                        ? 'bg-blue-500' 
                        : isTomorrow(dayGroup.date) 
                          ? 'bg-orange-500' 
                          : 'bg-slate-300'
                    }`} />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                      {getDateLabel(dayGroup.date)}
                    </h3>
                    {isToday(dayGroup.date) && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                        Today
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      {dayGroup.totalOrders} {dayGroup.totalOrders === 1 ? 'order' : 'orders'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(dayGroup.totalAmount)}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        selectedDate === dayGroup.date ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Production Summary */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {topProducts
                    .slice(0, 5)
                    .map(({ product, quantity }) => (
                      <span 
                        key={product.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {product.name}: {quantity} {product.unit}
                      </span>
                    ))}
                  {Object.keys(dayGroup.productSummary).length > 5 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400">
                      +{Object.keys(dayGroup.productSummary).length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {selectedDate === dayGroup.date && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  {/* Production Requirements */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                      🍰 Production Requirements
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {topProducts.map(({ product, quantity }) => (
                          <div key={product.id} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-md">
                            <span className="text-sm font-medium text-slate-800 dark:text-white">
                              {product.name}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {quantity} {product.unit}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Individual Orders */}
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                      📋 Individual Orders
                    </h4>
                    <div className="space-y-3">
                      {dayGroup.deliveries.map((delivery) => (
                        <div key={delivery.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                          <div>
                            <div className="font-medium text-slate-800 dark:text-white">
                              {getClientName(delivery.clientId)}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              Invoice #{delivery.invoiceNumber}
                              {delivery.items && (
                                <span className="ml-2">
                                  • {delivery.items.length} {delivery.items.length === 1 ? 'item' : 'items'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-slate-800 dark:text-white">
                              {formatCurrency(delivery.items?.reduce((sum, item) => {
                                const returnedQty = delivery.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
                                return sum + (item.quantity - returnedQty) * item.price;
                              }, 0) || 0)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {delivery.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};