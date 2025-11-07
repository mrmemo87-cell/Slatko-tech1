
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

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center relative">
        <div className="absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-600 animate-gradient-x"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-pink-500/40 via-purple-500/40 to-cyan-500/40 animate-gradient-y"></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent shadow-lg mb-4"></div>
          <p className="text-white font-semibold drop-shadow-lg">Loading inventory...</p>
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
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,208,232,0.4)]">{t.inventory.title}</h1>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
        <input
          type="text"
          placeholder={t.common.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="relative w-full px-5 py-3 border-0 text-gray-900 dark:text-white rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50 shadow-lg placeholder-gray-400"
        />
      </div>

      {/* Inventory Table */}
      <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-2xl overflow-hidden border border-white/20 shadow-[0_8px_32px_0_rgba(0,208,232,0.2)]">
        <table className="w-full text-sm text-left text-white/70">
          <thead className="text-xs font-bold uppercase bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white/90 border-b border-white/10">
            <tr>
              <th scope="col" className="px-6 py-4 drop-shadow-lg">{t.inventory.product}</th>
              <th scope="col" className="px-6 py-4 text-center drop-shadow-lg">{t.inventory.produced}</th>
              <th scope="col" className="px-6 py-4 text-center drop-shadow-lg">{t.inventory.delivered}</th>
              <th scope="col" className="px-6 py-4 text-center drop-shadow-lg">{t.inventory.returned}</th>
              <th scope="col" className="px-6 py-4 text-center drop-shadow-lg">{t.inventory.sold}</th>
              <th scope="col" className="px-6 py-4 text-center font-bold drop-shadow-lg">{t.inventory.inFactory}</th>
            </tr>
          </thead>
          <tbody>
            {filteredDetails.map(item => (
              <tr key={item.productId} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold text-white drop-shadow-lg whitespace-nowrap">{item.productName}</td>
                <td className="px-6 py-4 text-center text-white/80">{item.totalProduced}</td>
                <td className="px-6 py-4 text-center text-white/80">{item.totalDelivered}</td>
                <td className="px-6 py-4 text-center text-purple-300">{item.totalReturned > 0 ? `-${item.totalReturned}` : 0}</td>
                <td className="px-6 py-4 text-center text-green-300">{item.totalSold}</td>
                <td className={`px-6 py-4 text-center font-bold text-lg drop-shadow-lg ${item.inFactory <= 0 ? 'text-red-300' : 'text-cyan-300'}`}>
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
    </div>
  );
};
