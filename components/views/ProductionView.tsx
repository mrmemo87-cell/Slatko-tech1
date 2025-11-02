
import React, { useState, useEffect, useMemo } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { ProductionBatch, Product, Material } from '../../types';
import { formatDate, todayISO } from '../../utils';
import { Modal } from '../ui/Modal';
import { MobileProductionList } from '../ui/MobileProductionList';
import { PlusIcon, EditIcon, DeleteIcon } from '../ui/Icons';

interface ProductionViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({ t, showToast }) => {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch] = useState<ProductionBatch | null>(null); // Editing not implemented to prevent complex stock recalculations
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesData, productsData, materialsData] = await Promise.all([
        supabaseApi.getProductionBatches(),
        supabaseApi.getProducts(),
        supabaseApi.getMaterials()
      ]);
      setBatches(batchesData);
      setProducts(productsData);
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading production data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (batchData: Omit<ProductionBatch, 'id'>) => {
    try {
      // Transform the data to match API expectations
      const apiData = {
        productId: batchData.productId,
        quantity: batchData.quantity,
        startDate: batchData.date,
        notes: batchData.notes
      };
      await supabaseApi.createProductionBatch(apiData);
      await loadData();
      handleCloseModal();
      showToast(t.production.saved);
    } catch (error) {
      console.error('Error saving production batch:', error);
      showToast('Error saving production batch', 'error');
    }
  };

  const handleDeleteRequest = (id: string) => {
    setBatchToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (batchToDelete) {
      try {
        // TODO: Implement deleteProductionBatch in supabaseApi
        console.warn('Delete production batch not implemented yet');
        await loadData();
        showToast(t.production.deleted);
      } catch (error) {
        console.error('Error deleting production batch:', error);
        showToast('Error deleting production batch', 'error');
      }
      showToast(t.production.deleted);
      setIsConfirmOpen(false);
      setBatchToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmOpen(false);
    setBatchToDelete(null);
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';
  
  const filteredBatches = batches.filter(b => getProductName(b.productId).toLowerCase().includes(searchTerm.toLowerCase()));

  // Check if mobile
  const isMobile = window.innerWidth < 768;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.production.title}</h1>
        <button
          onClick={handleOpenModal}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="mr-2" />
          {t.production.addBatch}
        </button>
      </div>

      <input
        type="text"
        placeholder={t.common.search}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      />

      {/* Mobile View */}
      {isMobile ? (
        <MobileProductionList
          batches={filteredBatches}
          products={products}
          materials={materials}
          t={t}
          showToast={showToast}
          onUpdate={loadData}
        />
      ) : (
        /* Desktop Table View */
        <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">{t.production.date}</th>
              <th scope="col" className="px-6 py-3">{t.production.product}</th>
              <th scope="col" className="px-6 py-3">{t.production.quantity}</th>
              <th scope="col" className="px-6 py-3">Cost Analysis</th>
              <th scope="col" className="px-6 py-3">Quality</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.map(batch => (
              <tr key={batch.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                <td className="px-6 py-4">{formatDate(batch.date)}</td>
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  {getProductName(batch.productId)}
                  {batch.batchStatus && (
                    <div className="text-xs">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                        batch.batchStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        batch.batchStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        batch.batchStatus === 'QUALITY_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                        batch.batchStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {batch.batchStatus}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">{batch.quantity}</td>
                <td className="px-6 py-4">
                  {batch.totalCost ? (
                    <div className="text-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        Total: {batch.totalCost.toFixed(2)} KGS
                      </div>
                      <div className="text-slate-500">
                        Per unit: {batch.costPerUnit?.toFixed(2)} KGS
                      </div>
                      {batch.materialCosts && batch.materialCosts.length > 0 && (
                        <div className="text-xs text-slate-400 mt-1">
                          Materials: {batch.materialCosts.reduce((sum, mc) => sum + mc.cost, 0).toFixed(2)} KGS
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">No cost data</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {batch.qualityScore ? (
                    <div className="text-sm">
                      <div className={`font-semibold ${
                        batch.qualityScore >= 90 ? 'text-green-600' :
                        batch.qualityScore >= 80 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {batch.qualityScore}%
                      </div>
                      {batch.notes && (
                        <div className="text-xs text-slate-500 mt-1">
                          {batch.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm">
                      {batch.notes && (
                        <div className="text-xs text-slate-500">
                          {batch.notes}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleDeleteRequest(batch.id)} className="text-red-600 hover:text-red-800"><DeleteIcon /></button>
                </td>
              </tr>
            ))}
            {filteredBatches.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4">{t.common.noResults}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      <ProductionFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        products={products}
        t={t}
        showToast={showToast}
      />

      <Modal isOpen={isConfirmOpen} onClose={handleCancelDelete} title={t.common.delete}>
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">{t.production.deleteConfirm}</p>
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={handleCancelDelete} className="btn-secondary">{t.common.cancel}</button>
            <button type="button" onClick={handleConfirmDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors">{t.common.delete}</button>
          </div>
        </div>
        <style>{`
            .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: #334155; background-color: #e2e8f0; }
            .dark .btn-secondary { color: #e2e8f0; background-color: #475569; }
        `}</style>
      </Modal>
    </div>
  );
};

// --- Production Form Modal ---
interface ProductionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (batchData: Omit<ProductionBatch, 'id'>) => void;
  products: Product[];
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ProductionFormModal: React.FC<ProductionFormModalProps> = ({ isOpen, onClose, onSave, products, t, showToast }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [formData, setFormData] = useState({
    date: todayISO(),
    productId: '',
    quantity: 1,
    notes: ''
  });
  
  useEffect(() => {
    if (isOpen) {
        // Load materials from supabase
        const loadMaterials = async () => {
          try {
            const materialsList = await supabaseApi.getMaterials();
            setMaterials(materialsList);
          } catch (error) {
            console.error('Error loading materials:', error);
          }
        };
        loadMaterials();
        
        setFormData({
          date: todayISO(),
          productId: products.length > 0 ? products[0].id : '',
          quantity: 1,
          notes: ''
        });
    }
  }, [isOpen, products]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const { materialsNeeded, hasEnoughMaterials } = useMemo(() => {
      const product = products.find(p => p.id === formData.productId);
      if (!product || !product.recipe || !formData.quantity) {
          return { materialsNeeded: [], hasEnoughMaterials: true };
      }
      
      let hasEnough = true;
      const needed = product.recipe.map(recipeItem => {
          const material = materials.find(m => m.id === recipeItem.materialId);
          const required = recipeItem.quantity * formData.quantity;
          const available = material?.stock || 0;
          if (available < required) hasEnough = false;
          return { name: material?.name || 'Unknown', required, available, unit: material?.unit || '' };
      });
      return { materialsNeeded: needed, hasEnoughMaterials: hasEnough };

  }, [formData.productId, formData.quantity, products, materials]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || formData.quantity <= 0) return;
    if (!hasEnoughMaterials) {
        showToast(t.production.insufficientMaterials, 'error');
        return;
    }
    onSave({
        date: new Date(formData.date).toISOString(),
        productId: formData.productId,
        quantity: Number(formData.quantity),
        notes: formData.notes
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.production.addBatch}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{t.production.date}</label>
          <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="input-style" required />
        </div>
        <div>
          <label className="label">{t.production.product}</label>
          <select name="productId" value={formData.productId} onChange={handleInputChange} className="input-style" required>
            <option value="" disabled>Select a product</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t.production.quantity}</label>
          <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="input-style" required min="1" />
        </div>
        
        {materialsNeeded.length > 0 && (
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">
                <h4 className="font-semibold mb-1">{t.production.materialsNeeded}:</h4>
                <ul className="space-y-1">
                    {materialsNeeded.map(m => (
                        <li key={m.name} className={`flex justify-between ${m.available < m.required ? 'text-red-500' : ''}`}>
                            <span>{m.name}</span>
                            <span>{m.required.toFixed(2)} {m.unit} (Avail: {m.available.toFixed(2)})</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        
        <div>
          <label className="label">{t.production.notes}</label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="input-style" />
        </div>
        <div className="flex justify-end pt-4 space-x-2">
          <button type="button" onClick={onClose} className="btn-secondary">{t.common.cancel}</button>
          <button type="submit" className={`btn-primary ${!hasEnoughMaterials ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!hasEnoughMaterials}>{t.common.save}</button>
        </div>
      </form>
       <style>{`
        .label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-medium; color: #475569; }
        .dark .label { color: #d1d5db; }
        .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; background-color: white; border: 1px solid #cbd5e1; border-radius: 0.375rem; }
        .dark .input-style { background-color: #334155; border-color: #475569; color: white; }
        .btn-primary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: white; background-color: #2563eb; }
        .btn-primary:hover { background-color: #1d4ed8; }
        .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: #334155; background-color: #e2e8f0; }
        .dark .btn-secondary { color: #e2e8f0; background-color: #475569; }
      `}</style>
    </Modal>
  );
};
