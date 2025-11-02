
import React, { useState, useMemo } from 'react';
import { api } from '../../services/api';
import { Delivery, Product } from '../../types';
import { formatCurrency, exportToCsv, todayISO } from '../../utils';

interface ReportsViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ t }) => {
  const [deliveries] = useState<Delivery[]>(api.getDeliveries());
  const [products] = useState<Product[]>(api.getProducts());
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: todayISO()
  });

  const reportData = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999);

    const filteredDeliveries = deliveries.filter(d => {
      const deliveryDate = new Date(d.date);
      return deliveryDate >= fromDate && deliveryDate <= toDate && d.status !== 'Pending';
    });

    const salesByProduct = filteredDeliveries.flatMap(d => {
      return d.items.map(item => {
        const returnedQty = d.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
        const soldQty = item.quantity - returnedQty;
        return {
          productId: item.productId,
          quantitySold: soldQty,
          totalSales: soldQty * item.price,
        };
      });
    // FIX: Provide a generic type argument to .reduce() to explicitly set the accumulator's type.
    // This ensures `salesByProduct` is correctly typed, resolving errors in the subsequent .map() call.
    }).reduce<Record<string, { quantitySold: number; totalSales: number }>>((acc, sale) => {
      if (!acc[sale.productId]) {
        acc[sale.productId] = { quantitySold: 0, totalSales: 0 };
      }
      acc[sale.productId].quantitySold += sale.quantitySold;
      acc[sale.productId].totalSales += sale.totalSales;
      return acc;
    }, {});
    
  return (Object.entries(salesByProduct) as [string, { quantitySold: number; totalSales: number }][]).map(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      return {
        productName: product?.name || 'Unknown',
        quantitySold: data.quantitySold,
        totalSales: data.totalSales
      };
    }).sort((a,b) => b.totalSales - a.totalSales);

  }, [dateRange, deliveries, products]);

  const handleExport = () => {
    const headers = [t.reports.product, t.reports.quantitySold, t.reports.totalSales];
    const rows = reportData.map(item => [item.productName, item.quantitySold, item.totalSales]);
    exportToCsv(`sales_report_${dateRange.from}_to_${dateRange.to}`, [headers].concat(rows));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.reports.title}</h1>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md flex items-center space-x-4">
        <div className="flex items-center space-x-2">
            <label htmlFor="from-date">{t.reports.from}:</label>
            <input 
                type="date" 
                id="from-date"
                value={dateRange.from}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                className="input-style"
            />
        </div>
        <div className="flex items-center space-x-2">
            <label htmlFor="to-date">{t.reports.to}:</label>
            <input 
                type="date" 
                id="to-date"
                value={dateRange.to}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                className="input-style"
            />
        </div>
         <button onClick={handleExport} className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors">
            {t.reports.exportCSV}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
        <h2 className="text-xl font-semibold p-4">{t.reports.salesSummary}</h2>
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">{t.reports.product}</th>
              <th scope="col" className="px-6 py-3">{t.reports.quantitySold}</th>
              <th scope="col" className="px-6 py-3 text-right">{t.reports.totalSales}</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, index) => (
              <tr key={index} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.productName}</td>
                <td className="px-6 py-4">{item.quantitySold}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(item.totalSales)}</td>
              </tr>
            ))}
             {reportData.length === 0 && (
                <tr><td colSpan={3} className="text-center py-4">{t.common.noResults}</td></tr>
            )}
          </tbody>
          <tfoot>
              <tr className="font-bold bg-slate-50 dark:bg-slate-700">
                  <td className="px-6 py-3 text-right" colSpan={2}>{t.deliveries.total}:</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(reportData.reduce((sum, item) => sum + item.totalSales, 0))}</td>
              </tr>
          </tfoot>
        </table>
      </div>
      <style>{`
        .input-style {
          padding: 0.5rem 0.75rem;
          background-color: white;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .dark .input-style {
            background-color: #334155;
            border-color: #475569;
            color: white;
        }
      `}</style>
    </div>
  );
};
