
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils';
import { Product, Client, Delivery } from '../../types';

interface DashboardViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
}

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ t }) => {
  const products = api.getProducts();
  const clients = api.getClients();
  const production = api.getProduction();
  const deliveries = api.getDeliveries();

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

    const recentDeliveries = deliveries.filter(d => new Date(d.date) >= thirtyDaysAgo && d.status !== 'Pending');

    const salesByProduct = recentDeliveries.flatMap(d => {
        return d.items.map(item => {
            const returnedQty = d.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
            const soldQty = item.quantity - returnedQty;
            return {
                productId: item.productId,
                sold: soldQty,
                revenue: soldQty * item.price,
            };
        });
    }).reduce((acc, sale) => {
        if (!acc[sale.productId]) {
            acc[sale.productId] = { revenue: 0 };
        }
        acc[sale.productId].revenue += sale.revenue;
        return acc;
    }, {} as Record<string, { revenue: number }>);
    
    const productChart = Object.entries(salesByProduct).map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return { name: product?.name || 'Unknown', Sales: data.revenue };
    }).filter(p => p.Sales > 0);

    const salesByClient = recentDeliveries.reduce((acc, d) => {
      const client = clients.find(c => c.id === d.clientId);
      if (!client) return acc;

      const deliveryTotal = d.items.reduce((sum, item) => {
        const returnedQty = d.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
        const soldQty = item.quantity - returnedQty;
        return sum + soldQty * item.price;
      }, 0);

      if(!acc[client.businessName]) {
        acc[client.businessName] = { Sales: 0 };
      }
      acc[client.businessName].Sales += deliveryTotal;
      return acc;
    }, {} as Record<string, { Sales: number }>);

    const clientChart = Object.entries(salesByClient).map(([clientName, data]) => ({
      name: clientName,
      Sales: data.Sales,
    })).filter(c => c.Sales > 0);

    return { productChart, clientChart };
  }, [deliveries, products, clients]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.dashboard.title}</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t.dashboard.currentInventory} value={metrics.totalInventory} />
        <StatCard title={t.dashboard.outstandingDeliveries} value={metrics.outstandingDeliveries} />
        <StatCard title={t.dashboard.pendingPayments} value={metrics.pendingPayments} />
        <StatCard title={t.dashboard.totalReceivables} value={formatCurrency(metrics.totalReceivables)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t.dashboard.salesByProduct}</h2>
          {chartData.productChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.productChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700"/>
                <XAxis dataKey="name" className="text-xs fill-slate-500 dark:fill-slate-400"/>
                <YAxis className="text-xs fill-slate-500 dark:fill-slate-400" tickFormatter={(value) => formatCurrency(Number(value))}/>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid #ddd',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Bar dataKey="Sales" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">{t.dashboard.noData}</div>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t.dashboard.salesByClient}</h2>
           {chartData.clientChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.clientChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
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
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid #ddd',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
           ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">{t.dashboard.noData}</div>
          )}
        </div>
      </div>
    </div>
  );
};
