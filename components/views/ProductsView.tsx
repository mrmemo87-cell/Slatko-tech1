
import React, { useState } from 'react';
import { api } from '../../services/api';
import { Product, Unit, Material, RecipeItem } from '../../types';
import { generateId, formatCurrency } from '../../utils';
import { PRODUCT_UNITS } from '../../constants';
import { Modal } from '../ui/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../ui/Icons';

interface ProductsViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ t, showToast }) => {
  const [products, setProducts] = useState<Product[]>(api.getProducts());
  const [materials] = useState<Material[]>(api.getMaterials());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const handleSave = (productData: Omit<Product, 'id'>) => {
    let updatedProducts;
    if (editingProduct) {
      updatedProducts = products.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p);
    } else {
      updatedProducts = [...products, { ...productData, id: generateId() }];
    }
    setProducts(updatedProducts);
    api.saveProducts(updatedProducts);
    handleCloseModal();
    showToast(t.products.saved);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t.products.deleteConfirm)) {
      const updatedProducts = products.filter(p => p.id !== id);
      setProducts(updatedProducts);
      api.saveProducts(updatedProducts);
      showToast(t.products.deleted);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.products.title}</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="mr-2" />
          {t.products.newProduct}
        </button>
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
              <th scope="col" className="px-6 py-3">{t.products.name}</th>
              <th scope="col" className="px-6 py-3">{t.products.unit}</th>
              <th scope="col" className="px-6 py-3">{t.products.defaultPrice}</th>
              <th scope="col" className="px-6 py-3 text-right">{t.products.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{product.name}</td>
                <td className="px-6 py-4">{product.unit}</td>
                <td className="px-6 py-4">{formatCurrency(product.defaultPrice)}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleOpenModal(product)} className="text-blue-600 hover:text-blue-800"><EditIcon /></button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800"><DeleteIcon /></button>
                </td>
              </tr>
            ))}
             {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4">{t.common.noResults}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        product={editingProduct}
        materials={materials}
        t={t}
      />
    </div>
  );
};

// --- Product Form Modal ---
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id'>) => void;
  product: Product | null;
  materials: Material[];
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSave, product, materials, t }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('slice');
  const [defaultPrice, setDefaultPrice] = useState(0);
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);

  React.useEffect(() => {
    if (isOpen) {
        if (product) {
            setName(product.name);
            setUnit(product.unit);
            setDefaultPrice(product.defaultPrice);
            setRecipe(product.recipe || []);
        } else {
            setName('');
            setUnit('slice');
            setDefaultPrice(0);
            setRecipe([]);
        }
    }
  }, [isOpen, product]);
  
  const handleRecipeChange = (index: number, field: keyof RecipeItem, value: string) => {
      const newRecipe = [...recipe];
      (newRecipe[index] as any)[field] = field === 'quantity' ? Number(value) : value;
      setRecipe(newRecipe);
  };
  
  const addRecipeItem = () => {
    if (materials.length > 0) {
        setRecipe([...recipe, { materialId: materials[0].id, quantity: 0 }]);
    }
  };

  const removeRecipeItem = (index: number) => {
      setRecipe(recipe.filter((_, i) => i !== index));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, unit, defaultPrice, recipe: recipe.filter(r => r.quantity > 0) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? t.products.editProduct : t.products.newProduct}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{t.products.name}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-style" required />
        </div>
        <div>
          <label className="label">{t.products.unit}</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="input-style">
            {PRODUCT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t.products.defaultPrice}</label>
          <input type="number" value={defaultPrice} onChange={(e) => setDefaultPrice(Number(e.target.value))} className="input-style" required min="0"/>
        </div>
        
        <div className="pt-2">
            <h4 className="text-md font-semibold text-slate-800 dark:text-white">{t.products.recipe}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t.products.recipeDescription}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {recipe.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <select 
                            value={item.materialId} 
                            onChange={e => handleRecipeChange(index, 'materialId', e.target.value)} 
                            className="input-style col-span-7"
                        >
                            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <input 
                            type="number"
                            placeholder={t.purchases.quantity}
                            value={item.quantity}
                            onChange={e => handleRecipeChange(index, 'quantity', e.target.value)}
                            className="input-style col-span-3"
                            min="0"
                            step="any"
                        />
                        <button type="button" onClick={() => removeRecipeItem(index)} className="text-red-500 col-span-2 justify-self-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>
                ))}
            </div>
             <button type="button" onClick={addRecipeItem} className="text-blue-600 font-medium text-sm mt-2">{t.products.addMaterial}</button>
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
