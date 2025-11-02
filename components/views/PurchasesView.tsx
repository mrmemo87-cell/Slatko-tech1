
import React, { useState, useMemo } from 'react';
import { api } from '../../services/api';
import { Purchase, Material, PurchaseItem } from '../../types';
import { formatDate, formatCurrency, todayISO } from '../../utils';
import { Modal } from '../ui/Modal';
import { PlusIcon, DeleteIcon } from '../ui/Icons';

interface PurchasesViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const calculatePurchaseTotal = (items: PurchaseItem[], materials: Material[]): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
};

export const PurchasesView: React.FC<PurchasesViewProps> = ({ t, showToast }) => {
  const [purchases, setPurchases] = useState<Purchase[]>(api.getPurchases().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  const [materials] = useState<Material[]>(api.getMaterials());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = (purchaseData: Omit<Purchase, 'id'>) => {
    api.addPurchase(purchaseData);
    setPurchases(api.getPurchases().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    handleCloseModal();
    showToast(t.purchases.saved);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t.purchases.deleteConfirm)) {
      api.deletePurchase(id);
      setPurchases(api.getPurchases().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      showToast(t.purchases.deleted);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.purchases.title}</h1>
        <button
          onClick={handleOpenModal}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="mr-2" />
          {t.purchases.newPurchase}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">{t.purchases.date}</th>
              <th scope="col" className="px-6 py-3">{t.purchases.supplier}</th>
              <th scope="col" className="px-6 py-3">{t.purchases.items}</th>
              <th scope="col" className="px-6 py-3 text-right">{t.purchases.total}</th>
              <th scope="col" className="px-6 py-3 text-right">{t.purchases.actions}</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map(purchase => (
              <tr key={purchase.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                <td className="px-6 py-4">{formatDate(purchase.date)}</td>
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{purchase.supplier || '-'}</td>
                <td className="px-6 py-4">{purchase.items.length}</td>
                <td className="px-6 py-4 text-right font-semibold">{formatCurrency(calculatePurchaseTotal(purchase.items, materials))}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(purchase.id)} className="text-red-600 hover:text-red-800"><DeleteIcon /></button>
                </td>
              </tr>
            ))}
             {purchases.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4">{t.common.noResults}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PurchaseFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        materials={materials}
        t={t}
      />
    </div>
  );
};

// --- Purchase Form Modal ---
interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Purchase, 'id'>) => void;
  materials: Material[];
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
}

const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({ isOpen, onClose, onSave, materials, t }) => {
    const [formData, setFormData] = useState({ date: todayISO(), supplier: '', notes: '' });
    const [items, setItems] = useState<PurchaseItem[]>([]);

    React.useEffect(() => {
        if(isOpen) {
            setFormData({ date: todayISO(), supplier: '', notes: '' });
            setItems([]);
        }
    }, [isOpen]);

    const handleItemChange = (index: number, field: keyof PurchaseItem, value: string | number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };
    
    const addItem = () => {
        if (materials.length > 0) {
            setItems([...items, { materialId: materials[0].id, quantity: 1, price: 0 }]);
        }
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalItems = items.filter(i => i.quantity > 0 && i.price >= 0);
        if (finalItems.length === 0) return;
        onSave({ ...formData, items: finalItems });
    };

    return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.purchases.newPurchase}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="label">{t.purchases.date}</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input-style" required/>
            </div>
            <div>
                <label className="label">{t.purchases.supplier}</label>
                <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="input-style"/>
            </div>
        </div>
        
        <h3 className="text-md font-semibold pt-2">{t.purchases.items}</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <select value={item.materialId} onChange={e => handleItemChange(index, 'materialId', e.target.value)} className="input-style col-span-5">
                        {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="input-style col-span-3" min="1"/>
                    <input type="number" placeholder="Price" value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} className="input-style col-span-3" min="0"/>
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 col-span-1 justify-self-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
            ))}
        </div>
        <button type="button" onClick={addItem} className="text-blue-600 font-medium text-sm">{t.common.add} {t.purchases.items.toLowerCase()}</button>

         <div>
          <label className="label">{t.purchases.notes}</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="input-style w-full" />
        </div>

        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t.common.cancel}</button>
            <button type="submit" className="btn-primary">{t.common.save}</button>
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
