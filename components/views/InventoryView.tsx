
import React, { useState, useMemo, useEffect } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { InventoryDetail } from '../../types';

interface InventoryViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ t }) => {
  const [inventoryDetails, setInventoryDetails] = useState<InventoryDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get inventory from production batches and deliveries
      const [products, production, deliveries] = await Promise.all([
        supabaseApi.getProducts(),
        supabaseApi.getProductionBatches(),
        supabaseApi.getDeliveries()
      ]);

      // Calculate inventory similar to how api.ts does it
      const inventory = products.map(product => {
        const produced = production
          .filter(batch => batch.productId === product.id)
          .reduce((sum, batch) => sum + batch.quantity, 0);

        const delivered = deliveries
          .flatMap(delivery => delivery.items)
          .filter(item => item.productId === product.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        return {
          productId: product.id,
          productName: product.name,
          produced,
          delivered,
          remaining: produced - delivered,
          unit: product.unit
        };
      });

      setInventoryDetails(inventory);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDetails = useMemo(() => {
    return inventoryDetails.filter(detail =>
      detail.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryDetails, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.inventory.title}</h1>
      </div>

      <input
        type="text"
        placeholder={t.common.search}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      />

      <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">{t.inventory.product}</th>
              <th scope="col" className="px-6 py-3 text-center">{t.inventory.produced}</th>
              <th scope="col" className="px-6 py-3 text-center">{t.inventory.delivered}</th>
              <th scope="col" className="px-6 py-3 text-center">{t.inventory.returned}</th>
              <th scope="col" className="px-6 py-3 text-center">{t.inventory.sold}</th>
              <th scope="col" className="px-6 py-3 text-center font-bold">{t.inventory.inFactory}</th>
            </tr>
          </thead>
          <tbody>
            {filteredDetails.map(item => (
              <tr key={item.productId} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{item.productName}</td>
                <td className="px-6 py-4 text-center">{item.totalProduced}</td>
                <td className="px-6 py-4 text-center">{item.totalDelivered}</td>
                <td className="px-6 py-4 text-center text-orange-600">{item.totalReturned > 0 ? `-${item.totalReturned}` : 0}</td>
                <td className="px-6 py-4 text-center text-green-600">{item.totalSold}</td>
                <td className={`px-6 py-4 text-center font-bold text-lg ${item.inFactory <= 0 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                    {item.inFactory}
                </td>
              </tr>
            ))}
            {filteredDetails.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4">{t.common.noResults}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
