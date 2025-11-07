
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../utils';
import { Product, Client, Delivery } from '../../types';
import { useProducts, useClients, useDeliveries, useProductionBatches } from '../../hooks/useDataQueries';
import { DailyOrderPlanning } from '../ui/DailyOrderPlanning';
import { ProductionMatrix } from '../ui/ProductionMatrix';
import { PageHeader } from '../ui/PageHeader';

interface DashboardViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 p-4 rounded-lg shadow-sm border border-cyan-200 dark:border-slate-700 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-cyan-400">
    <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
    <p className="mt-1.5 text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">{value}</p>
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ t, showToast }) => {
  // Use React Query hooks for data fetching
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useProducts();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: production = [], isLoading: productionLoading, refetch: refetchProduction } = useProductionBatches();
  const { data: deliveries = [], isLoading: deliveriesLoading, refetch: refetchDeliveries } = useDeliveries();
  
  const loading = productsLoading || clientsLoading || productionLoading || deliveriesLoading;

  const metrics = useMemo(() => {
    // Current Inventory
    const produced = production.reduce((acc, batch) => {
      acc[batch.productId] = (acc[batch.productId] || 0) + batch.quantity;
      return acc;
    }, {} as Record<string, number>);

    const delivered = deliveries.flatMap(d => d.items).reduce((acc, item) => {
      acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);

    const inventory = Object.keys(produced).reduce((acc, productId) => {
      acc[productId] = produced[productId] - (delivered[productId] || 0);
      return acc;
    }, {} as Record<string, number>);
    const totalInventory = Object.values(inventory).reduce((sum, q) => sum + q, 0);

    // Outstanding Deliveries
    const outstandingDeliveries = deliveries.filter(d => d.status === 'Pending').length;
    
    // Pending Payments & Total Receivables
    let pendingPayments = 0;
    let totalReceivables = 0;

    deliveries.forEach(delivery => {
      if (delivery.status === 'Paid') return;
      
      const totalSold = (delivery.items || []).reduce((sum, item) => {
          const returnedQty = delivery.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
          const soldQty = item.quantity - returnedQty;
          return sum + (soldQty * item.price);
      }, 0);

      const totalPaid = (delivery.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const amountDue = totalSold - totalPaid;

      if (amountDue > 0) {
        totalReceivables += amountDue;
        if(delivery.status === 'Settled') {
          pendingPayments++;
        }
      }
    });

    return { totalInventory, outstandingDeliveries, pendingPayments, totalReceivables };
  }, [production, deliveries]);
  
  const chartData = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Include both Settled and Paid deliveries for sales data
    const recentDeliveries = deliveries.filter(d => {
      const deliveryDate = new Date(d.date);
      return deliveryDate >= thirtyDaysAgo && (d.status === 'Settled' || d.status === 'Paid');
    });

    console.log('Chart data calculation:', {
      totalDeliveries: deliveries.length,
      recentDeliveries: recentDeliveries.length,
      thirtyDaysAgo: thirtyDaysAgo.toISOString().split('T')[0]
    });

    const salesByProduct = recentDeliveries.reduce((acc, d) => {
      if (!d.items || d.items.length === 0) return acc;
      
      d.items.forEach(item => {
        const returnedQty = d.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
        const soldQty = Math.max(0, item.quantity - returnedQty);
        const revenue = soldQty * item.price;
        
        if (!acc[item.productId]) {
          acc[item.productId] = { revenue: 0 };
        }
        acc[item.productId].revenue += revenue;
      });
      return acc;
    }, {} as Record<string, { revenue: number }>);
    
    const productChart = Object.entries(salesByProduct).map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return { 
          name: product?.name || `Product ${productId.slice(-4)}`, 
          Sales: data.revenue 
        };
    }).filter(p => p.Sales > 0)
     .sort((a, b) => b.Sales - a.Sales)
     .slice(0, 10); // Top 10 products

    const salesByClient = recentDeliveries.reduce((acc, d) => {
      const client = clients.find(c => c.id === d.clientId);
      const clientName = client?.businessName || client?.name || `Client ${d.clientId.slice(-4)}`;

      const deliveryTotal = (d.items || []).reduce((sum, item) => {
        const returnedQty = d.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
        const soldQty = Math.max(0, item.quantity - returnedQty);
        return sum + (soldQty * item.price);
      }, 0);

      if (!acc[clientName]) {
        acc[clientName] = { Sales: 0 };
      }
      acc[clientName].Sales += deliveryTotal;
      return acc;
    }, {} as Record<string, { Sales: number }>);

    const clientChart = Object.entries(salesByClient).map(([clientName, data]) => ({
      name: clientName,
      Sales: data.Sales,
    })).filter(c => c.Sales > 0)
     .sort((a, b) => b.Sales - a.Sales)
     .slice(0, 8); // Top 8 clients

    console.log('Chart results:', {
      productChart: productChart.length,
      clientChart: clientChart.length
    });

    return { productChart, clientChart };
  }, [deliveries, products, clients]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-600 animate-gradient-x"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-pink-500/40 via-purple-500/40 to-cyan-500/40 animate-gradient-y"></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-cyan-400 shadow-lg mb-4"></div>
          <p className="text-white text-lg font-bold drop-shadow-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
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

      <div className="relative z-10 space-y-6">
        <PageHeader 
          title={t.dashboard.title}
          description="Monitor inventory, payments, and sales in real-time"
          icon="📊"
          theme="dashboard"
        />
        
        {/* Stats Grid - Glassmorphism Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-2xl shadow-[0_8px_32px_0_rgba(0,208,232,0.3)] border border-white/20 p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl pointer-events-none"></div>
            <h3 className="relative text-sm font-bold text-white/80 drop-shadow-lg mb-2">{t.dashboard.currentInventory}</h3>
            <p className="relative text-3xl font-black bg-gradient-to-r from-cyan-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,208,232,0.5)]">{metrics.totalInventory}</p>
          </div>
          <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-2xl shadow-[0_8px_32px_0_rgba(0,208,232,0.3)] border border-white/20 p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl pointer-events-none"></div>
            <h3 className="relative text-sm font-bold text-white/80 drop-shadow-lg mb-2">{t.dashboard.outstandingDeliveries}</h3>
            <p className="relative text-3xl font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">{metrics.outstandingDeliveries}</p>
          </div>
          <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-2xl shadow-[0_8px_32px_0_rgba(0,208,232,0.3)] border border-white/20 p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl pointer-events-none"></div>
            <h3 className="relative text-sm font-bold text-white/80 drop-shadow-lg mb-2">{t.dashboard.pendingPayments}</h3>
            <p className="relative text-3xl font-black bg-gradient-to-r from-pink-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,45,145,0.5)]">{metrics.pendingPayments}</p>
          </div>
          <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-2xl shadow-[0_8px_32px_0_rgba(255,45,145,0.3)] border border-white/20 p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl pointer-events-none"></div>
            <h3 className="relative text-sm font-bold text-white/80 drop-shadow-lg mb-2">{t.dashboard.totalReceivables}</h3>
            <p className="relative text-3xl font-black bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,208,232,0.5)]">{formatCurrency(metrics.totalReceivables)}</p>
          </div>
        </div>

      {/* Production Matrix - NEW: Visual production planning grid */}
      <ProductionMatrix 
        deliveries={deliveries}
        products={products}
        clients={clients}
        t={t}
        showToast={showToast}
        onProductionStarted={() => {
          refetchProduction();
          refetchDeliveries();
        }}
      />

      {/* Daily Order Planning - Primary Feature for Workers */}
      <DailyOrderPlanning 
        deliveries={deliveries}
        products={products}
        clients={clients}
        t={t}
      />

      {/* Sales Analytics Charts - Secondary Information */}
      <div>
        <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-6 drop-shadow-[0_0_20px_rgba(0,208,232,0.4)]">📊 Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Sales Chart */}
          <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,208,232,0.3)] border border-white/20 p-8 hover:shadow-[0_8px_32px_0_rgba(0,208,232,0.5)] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl pointer-events-none"></div>
            <h3 className="relative text-lg font-bold text-white drop-shadow-lg mb-4">{t.dashboard.salesByProduct}</h3>
            {chartData.productChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData.productChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-white/10"/>
                  <XAxis dataKey="name" className="text-xs fill-white/60"/>
                  <YAxis className="text-xs fill-white/60" tickFormatter={(value) => formatCurrency(Number(value))}/>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0, 208, 232, 0.5)',
                      borderRadius: '0.75rem',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="Sales" fill="#00d0e8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-white/50">{t.dashboard.noData}</div>
            )}
          </div>

          {/* Client Sales Chart */}
          <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-3xl shadow-[0_8px_32px_0_rgba(255,45,145,0.3)] border border-white/20 p-8 hover:shadow-[0_8px_32px_0_rgba(255,45,145,0.5)] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl pointer-events-none"></div>
            <h3 className="relative text-lg font-bold text-white drop-shadow-lg mb-4">{t.dashboard.salesByClient}</h3>
            {chartData.clientChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData.clientChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="Sales"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.clientChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 45, 145, 0.5)',
                      borderRadius: '0.75rem',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-white/50">{t.dashboard.noData}</div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
