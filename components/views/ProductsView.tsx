
import React, { useState } from 'react';
import { Product, Unit, Material, RecipeItem } from '../../types';
import { generateId, formatCurrency } from '../../utils';
import { PRODUCT_UNITS } from '../../constants';
import { Modal } from '../ui/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../ui/Icons';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useMaterials } from '../../hooks/useDataQueries';
import { PRODUCT_CATEGORIES, groupProductsByCategory } from '../../constants/productCategories';

interface ProductsViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ t, showToast }) => {
  // Use React Query hooks
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(PRODUCT_CATEGORIES))); // Start with all expanded
  
  const loading = productsLoading || materialsLoading;

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const saveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: productData });
      } else {
        await createProduct.mutateAsync(productData);
      }
      handleCloseModal();
      showToast(t.products.saved);
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t.products.deleteConfirm)) {
      try {
        await deleteProduct.mutateAsync(id);
        showToast(t.products.deleted);
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
      }
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

      <div className="space-y-4">
        {Object.entries(groupProductsByCategory(filteredProducts)).map(([categoryName, categoryProducts]) => {
          const isExpanded = expandedCategories.has(categoryName);
          
          return (
            <div key={categoryName} className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedCategories);
                  if (isExpanded) {
                    newExpanded.delete(categoryName);
                  } else {
                    newExpanded.add(categoryName);
                  }
                  setExpandedCategories(newExpanded);
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{categoryName}</h3>
                  <span className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                    {categoryProducts.length} products
                  </span>
                </div>
              </button>
              
              {/* Category Products */}
              {isExpanded && (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {categoryProducts.map(product => (
                    <div key={product.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 dark:text-white">{product.name}</h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span>{product.unit}</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(product.defaultPrice)}
                            </span>
                            {product.recipe && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {product.recipe.length} ingredients
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {categoryProducts.length === 0 && searchTerm && (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      No products in this category match your search
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {filteredProducts.length === 0 && !searchTerm && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No products found. Click "Add Product" to create your first product.
          </div>
        )}
        
        {filteredProducts.length === 0 && searchTerm && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {t.common.noResults}
          </div>
        )}
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={saveProduct}
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
